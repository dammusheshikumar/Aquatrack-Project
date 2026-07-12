package com.aquatrack.service;

import com.aquatrack.dto.billing.BillingCycleRequest;
import com.aquatrack.dto.billing.WaterPurchaseRequest;
import com.aquatrack.entity.*;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Owns the full billing pipeline:
 *  1. Tiered tariff charge per household from metered consumption (TariffService)
 *  2. Bulk water purchase tracking per billing cycle
 *  3. Consumption-proportional apportionment of the apartment's total water cost,
 *     falling back to flat-area distribution for households without a working meter
 *  4. Billing cycle lifecycle: OPEN -> FINALIZED -> ARCHIVED, generating itemized invoices
 */
@Service
@RequiredArgsConstructor
public class BillingService {

    private final BillingCycleRepository billingCycleRepository;
    private final WaterPurchaseRepository waterPurchaseRepository;
    private final InvoiceRepository invoiceRepository;
    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final WaterUsageLogRepository usageLogRepository;
    private final TariffService tariffService;
    private final AlertService alertService;

    @Transactional
    public BillingCycle openCycle(BillingCycleRequest req) {
        Apartment apartment = apartmentRepository.findById(req.getApartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));

        billingCycleRepository.findByApartmentIdAndStatus(apartment.getId(), BillingCycle.Status.OPEN)
                .ifPresent(c -> { throw new BadRequestException("An OPEN billing cycle already exists for this apartment"); });

        BillingCycle cycle = BillingCycle.builder()
                .apartment(apartment)
                .status(BillingCycle.Status.OPEN)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .build();
        return billingCycleRepository.save(cycle);
    }

    @Transactional
    public WaterPurchase recordPurchase(WaterPurchaseRequest req) {
        BillingCycle cycle = billingCycleRepository.findById(req.getBillingCycleId())
                .orElseThrow(() -> new ResourceNotFoundException("Billing cycle not found"));

        if (cycle.getStatus() != BillingCycle.Status.OPEN) {
            throw new BadRequestException("Cannot record purchases against a cycle that is not OPEN");
        }

        WaterPurchase.SourceType sourceType;
        try {
            sourceType = WaterPurchase.SourceType.valueOf(req.getSourceType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("sourceType must be TANKER or MUNICIPAL");
        }

        WaterPurchase purchase = waterPurchaseRepository.save(WaterPurchase.builder()
                .billingCycle(cycle)
                .sourceType(sourceType)
                .volumeKl(BigDecimal.valueOf(req.getVolumeKl()))
                .cost(BigDecimal.valueOf(req.getCost()))
                .purchaseDate(req.getPurchaseDate())
                .notes(req.getNotes())
                .build());

        // Roll up totals on the cycle
        cycle.setTotalPurchasedVolumeKl(cycle.getTotalPurchasedVolumeKl().add(purchase.getVolumeKl()));
        cycle.setTotalPurchaseCost(cycle.getTotalPurchaseCost().add(purchase.getCost()));
        if (cycle.getTotalPurchasedVolumeKl().compareTo(BigDecimal.ZERO) > 0) {
            cycle.setUnitCost(cycle.getTotalPurchaseCost()
                    .divide(cycle.getTotalPurchasedVolumeKl(), 4, RoundingMode.HALF_UP));
        }
        billingCycleRepository.save(cycle);

        return purchase;
    }

    /**
     * Finalizes a billing cycle: for every household in the apartment, calculates the
     * tiered tariff base charge from metered consumption, apportions the apartment's total
     * water purchase cost proportionally by consumption (flat-area fallback for households
     * without a working meter), and writes one itemized invoice row per household.
     */
    @Transactional
    public List<Invoice> finalizeCycle(Long billingCycleId) {
        BillingCycle cycle = billingCycleRepository.findById(billingCycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Billing cycle not found"));

        if (cycle.getStatus() != BillingCycle.Status.OPEN) {
            throw new BadRequestException("Only an OPEN billing cycle can be finalized");
        }

        Apartment apartment = cycle.getApartment();
        List<Household> households = householdRepository.findByApartmentId(apartment.getId());
        if (households.isEmpty()) {
            throw new BadRequestException("Apartment has no households to bill");
        }

        TariffPlan tariffPlan = tariffService.getActivePlan(apartment.getId());

        // Step 1: metered consumption per household for the cycle window
        java.util.Map<Long, BigDecimal> consumptionByHousehold = new java.util.HashMap<>();
        BigDecimal totalMeteredConsumption = BigDecimal.ZERO;
        BigDecimal totalFlatArea = BigDecimal.ZERO;

        for (Household h : households) {
            BigDecimal consumption = usageLogRepository
                    .findByHouseholdIdAndReadingDateBetween(h.getId(), cycle.getStartDate(), cycle.getEndDate())
                    .stream().map(WaterUsageLog::getConsumptionKl).reduce(BigDecimal.ZERO, BigDecimal::add);
            consumptionByHousehold.put(h.getId(), consumption);
            if (Boolean.TRUE.equals(h.getHasWorkingMeter())) {
                totalMeteredConsumption = totalMeteredConsumption.add(consumption);
            }
            totalFlatArea = totalFlatArea.add(h.getFlatSizeSqft());
        }

        // Step 2: apportion the apartment's total water purchase cost.
        // Proportional-by-consumption for metered households; flat-area fallback otherwise.
        java.util.Map<Long, BigDecimal> sharedAllocationByHousehold = new java.util.HashMap<>();
        BigDecimal totalPurchaseCost = cycle.getTotalPurchaseCost();

        for (Household h : households) {
            BigDecimal allocation;
            if (Boolean.TRUE.equals(h.getHasWorkingMeter()) && totalMeteredConsumption.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal share = consumptionByHousehold.get(h.getId())
                        .divide(totalMeteredConsumption, 8, RoundingMode.HALF_UP);
                allocation = totalPurchaseCost.multiply(share);
            } else if (totalFlatArea.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal share = h.getFlatSizeSqft().divide(totalFlatArea, 8, RoundingMode.HALF_UP);
                allocation = totalPurchaseCost.multiply(share);
            } else {
                allocation = totalPurchaseCost.divide(BigDecimal.valueOf(households.size()), 2, RoundingMode.HALF_UP);
            }
            sharedAllocationByHousehold.put(h.getId(), allocation.setScale(2, RoundingMode.HALF_UP));
        }

        // Step 3: generate itemized invoices
        List<Invoice> invoices = new java.util.ArrayList<>();
        String cycleLabel = cycle.getStartDate() + " to " + cycle.getEndDate();

        for (Household h : households) {
            BigDecimal consumption = consumptionByHousehold.get(h.getId());
            BigDecimal baseCharge = tariffService.calculateCharge(tariffPlan, consumption).setScale(2, RoundingMode.HALF_UP);
            BigDecimal sharedAllocation = sharedAllocationByHousehold.get(h.getId());
            BigDecimal total = baseCharge.add(sharedAllocation);

            Invoice invoice = invoiceRepository.save(Invoice.builder()
                    .billingCycle(cycle)
                    .household(h)
                    .meteredConsumptionKl(consumption)
                    .baseCharge(baseCharge)
                    .sharedAllocation(sharedAllocation)
                    .adjustments(BigDecimal.ZERO)
                    .total(total)
                    .status(Invoice.Status.ISSUED)
                    .build());
            invoices.add(invoice);

            alertService.raiseBillingCompleteAlert(h, "Rs. " + total, cycleLabel);
        }

        cycle.setStatus(BillingCycle.Status.FINALIZED);
        cycle.setFinalizedAt(java.time.LocalDateTime.now());
        billingCycleRepository.save(cycle);

        return invoices;
    }

    @Transactional
    public BillingCycle archiveCycle(Long billingCycleId) {
        BillingCycle cycle = billingCycleRepository.findById(billingCycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Billing cycle not found"));
        if (cycle.getStatus() != BillingCycle.Status.FINALIZED) {
            throw new BadRequestException("Only a FINALIZED billing cycle can be archived");
        }
        cycle.setStatus(BillingCycle.Status.ARCHIVED);
        return billingCycleRepository.save(cycle);
    }

    public List<BillingCycle> getCyclesForApartment(Long apartmentId) {
        return billingCycleRepository.findByApartmentIdOrderByStartDateDesc(apartmentId);
    }

    public List<Invoice> getInvoicesForHousehold(Long householdId) {
        return invoiceRepository.findByHouseholdIdOrderByGeneratedAtDesc(householdId);
    }

    public List<Invoice> getInvoicesForCycle(Long cycleId) {
        return invoiceRepository.findByBillingCycleId(cycleId);
    }

    public Invoice getInvoice(Long invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
    }
}
