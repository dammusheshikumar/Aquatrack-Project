package com.aquatrack.service;

import com.aquatrack.dto.tariff.TariffPlanRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.TariffPlan;
import com.aquatrack.repository.ApartmentRepository;
import com.aquatrack.repository.TariffPlanRepository;
import com.aquatrack.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class TariffService {

    private final TariffPlanRepository tariffPlanRepository;
    private final ApartmentRepository apartmentRepository;

    public TariffService(TariffPlanRepository tariffPlanRepository, ApartmentRepository apartmentRepository) {
        this.tariffPlanRepository = tariffPlanRepository;
        this.apartmentRepository = apartmentRepository;
    }

    @Transactional
    public TariffPlan createPlan(TariffPlanRequest req) {
        Apartment apartment = apartmentRepository.findById(req.getApartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found with ID: " + req.getApartmentId()));

        // Fix: Throw 409 Conflict / BadRequest equivalent instead of NotFound
        if (tariffPlanRepository.existsByApartmentIdAndPlanNameIgnoreCase(apartment.getId(), req.getPlanName())) {
            throw new IllegalArgumentException("Tariff plan with name '" + req.getPlanName() + "' already exists for this apartment.");
        }

        // Deactivate old active plan if it exists
        tariffPlanRepository.findByApartmentIdAndActiveTrue(apartment.getId())
                .ifPresent(existing -> existing.setActive(false));

        TariffPlan plan = TariffPlan.builder()
                .apartment(apartment)
                .planName(req.getPlanName())
                .baseRate(req.getBaseRate())
                .baseTierLimitKl(req.getBaseTierLimitKl())
                .excessRate(req.getExcessRate())
                .active(true)
                .build();

        // Save new plan to generate ID
        plan = tariffPlanRepository.save(plan);

        // Update apartment association (dirty checking handles the save automatically at transaction commit)
        apartment.setActiveTariffPlanId(plan.getId());

        return plan;
    }

    @Transactional(readOnly = true)
    public List<TariffPlan> listPlans(Long apartmentId) {
        return tariffPlanRepository.findByApartmentIdOrderByCreatedAtDesc(apartmentId);
    }

    @Transactional
    public TariffPlan activatePlan(Long apartmentId, Long tariffId) {
        // 1. Verify apartment exists
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found with ID: " + apartmentId));

        // 2. Fetch target tariff plan early
        TariffPlan newPlan = tariffPlanRepository.findById(tariffId)
                .orElseThrow(() -> new ResourceNotFoundException("Tariff plan not found with ID: " + tariffId));

        // 3. Security/Data integrity check: Does this plan belong to this apartment?
        if (!newPlan.getApartment().getId().equals(apartmentId)) {
            throw new IllegalArgumentException("Tariff plan does not belong to the specified apartment.");
        }

        // 4. If already active, short-circuit immediately before making mutations
        if (Boolean.TRUE.equals(newPlan.getActive())) {
            return newPlan;
        }

        // 5. Deactivate current active plan safely
        tariffPlanRepository.findByApartmentIdAndActiveTrue(apartmentId)
                .ifPresent(plan -> plan.setActive(false));

        // 6. Activate new plan & update apartment tracking
        newPlan.setActive(true);
        apartment.setActiveTariffPlanId(newPlan.getId());

        // Note: Explicit repository.save() calls omitted because Spring/JPA 
        // dirty checking automatically flushes updates at the end of @Transactional methods.
        return newPlan;
    }

    public BigDecimal calculateCharge(BigDecimal consumptionKl, TariffPlan tariff) {
        if (consumptionKl == null || consumptionKl.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        // Tier 1: Consumption is within or equal to base limit
        if (consumptionKl.compareTo(tariff.getBaseTierLimitKl()) <= 0) {
            return consumptionKl.multiply(tariff.getBaseRate());
        }

        // Tier 2: Consumption exceeds base limit
        BigDecimal baseCharge = tariff.getBaseTierLimitKl().multiply(tariff.getBaseRate());
        BigDecimal excessConsumption = consumptionKl.subtract(tariff.getBaseTierLimitKl());
        BigDecimal excessCharge = excessConsumption.multiply(tariff.getExcessRate());

        return baseCharge.add(excessCharge);
    }

    @Transactional(readOnly = true)
    public TariffPlan getActivePlan(Apartment apartment) {
        if (apartment.getActiveTariffPlanId() == null) {
            throw new ResourceNotFoundException("No active tariff plan configured for the apartment selected");
        }
        return tariffPlanRepository.findById(apartment.getActiveTariffPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("Active tariff plan not found"));
    }
}