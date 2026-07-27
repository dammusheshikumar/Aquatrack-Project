package com.aquatrack.service;

import com.aquatrack.dto.tariff.TariffPlanRequest;
import com.aquatrack.dto.tariff.TariffTierRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.TariffPlan;
import com.aquatrack.entity.TariffTier;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.repository.ApartmentRepository;
import com.aquatrack.repository.TariffPlanRepository;
import com.aquatrack.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
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
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));

        validateTiers(req.getTiers());

        TariffPlan plan = TariffPlan.builder()
                .apartment(apartment)
                .planName(req.getPlanName())
                .active(true)
                .build();

        List<TariffTier> tiers = new ArrayList<>();
        int order = 1;
        for (TariffTierRequest tierReq : req.getTiers()) {
            tiers.add(TariffTier.builder()
                    .tariffPlan(plan)
                    .tierOrder(order++)
                    .upToKl(tierReq.getUpToKl())
                    .rate(tierReq.getRate())
                    .build());
        }
        plan.setTiers(tiers);

        plan = tariffPlanRepository.save(plan);

        apartment.setActiveTariffPlanId(plan.getId());
        apartmentRepository.save(apartment);

        return plan;
    }

    public List<TariffPlan> listPlans(Long apartmentId) {
        return tariffPlanRepository.findByApartmentIdOrderByCreatedAtDesc(apartmentId);
    }

    public TariffPlan getActivePlan(Apartment apartment) {
        if (apartment.getActiveTariffPlanId() == null) {
            throw new ResourceNotFoundException("No active tariff plan configured for apartment " + apartment.getId());
        }
        return tariffPlanRepository.findById(apartment.getActiveTariffPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("Active tariff plan not found"));
    }

    /**
     * Ensures a tier list unambiguously covers every possible consumption
     * value: boundaries must strictly increase, and only the last tier may
     * be open-ended (upToKl == null). Without this, a plan could either
     * leave a gap in coverage or define an unreachable tier.
     */
    private void validateTiers(List<TariffTierRequest> tiers) {
        BigDecimal previousLimit = BigDecimal.ZERO;
        for (int i = 0; i < tiers.size(); i++) {
            TariffTierRequest tier = tiers.get(i);
            boolean isLast = i == tiers.size() - 1;

            if (tier.getUpToKl() == null) {
                if (!isLast) {
                    throw new BadRequestException(
                            "Only the last tariff tier may be left open-ended (no upper limit). Tier " + (i + 1) + " must specify \"up to\" a consumption value.");
                }
            } else {
                if (tier.getUpToKl().compareTo(previousLimit) <= 0) {
                    throw new BadRequestException(
                            "Tier " + (i + 1) + "'s \"up to\" value (" + tier.getUpToKl() + " kL) must be greater than the previous tier's limit (" + previousLimit + " kL).");
                }
                previousLimit = tier.getUpToKl();
            }
        }
    }
}
