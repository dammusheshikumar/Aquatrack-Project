package com.aquatrack.service;

import com.aquatrack.dto.billing.TariffPlanRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.TariffPlan;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.ApartmentRepository;
import com.aquatrack.repository.TariffPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TariffService {

    private final TariffPlanRepository tariffPlanRepository;
    private final ApartmentRepository apartmentRepository;

    public List<TariffPlan> findByApartment(Long apartmentId) {
        return tariffPlanRepository.findByApartmentId(apartmentId);
    }

    public TariffPlan getActivePlan(Long apartmentId) {
        return tariffPlanRepository.findByApartmentIdAndActiveTrue(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("No active tariff plan for apartment " + apartmentId));
    }

    @Transactional
    public TariffPlan createOrReplace(TariffPlanRequest req) {
        Apartment apartment = apartmentRepository.findById(req.getApartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));

        // Deactivate existing active plan (only one active tariff plan per apartment at a time)
        tariffPlanRepository.findByApartmentIdAndActiveTrue(apartment.getId())
                .ifPresent(existing -> {
                    existing.setActive(false);
                    tariffPlanRepository.save(existing);
                });

        TariffPlan plan = TariffPlan.builder()
                .apartment(apartment)
                .planName(req.getPlanName())
                .baseRate(BigDecimal.valueOf(req.getBaseRate()))
                .baseTierLimit(BigDecimal.valueOf(req.getBaseTierLimit()))
                .excessRate(BigDecimal.valueOf(req.getExcessRate()))
                .active(true)
                .build();
        TariffPlan saved = tariffPlanRepository.save(plan);

        apartment.setTariffPlan(saved);
        apartmentRepository.save(apartment);

        return saved;
    }

    /**
     * Tiered tariff calculation:
     * - consumption up to baseTierLimit is charged at baseRate
     * - consumption beyond baseTierLimit is charged at excessRate
     */
    public BigDecimal calculateCharge(TariffPlan plan, BigDecimal consumptionKl) {
        if (consumptionKl.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (consumptionKl.compareTo(plan.getBaseTierLimit()) <= 0) {
            return consumptionKl.multiply(plan.getBaseRate());
        }
        BigDecimal baseAmount = plan.getBaseTierLimit().multiply(plan.getBaseRate());
        BigDecimal excessVolume = consumptionKl.subtract(plan.getBaseTierLimit());
        BigDecimal excessAmount = excessVolume.multiply(plan.getExcessRate());
        return baseAmount.add(excessAmount);
    }
}
