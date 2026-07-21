package com.aquatrack.service;

import com.aquatrack.dto.billing.BillingCycleRequest;
import com.aquatrack.dto.billing.PurchaseEntryRequest;
import com.aquatrack.entity.*;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Core billing engine:
 *  1. Tiered tariff calculation per household from metered consumption.
 *  2. Bulk water purchase tracking per billing cycle.
 *  3. Proportional shared-cost apportionment (by consumption, with a
 *     flat-area fallback for households with no working meter).
 *  4. Billing cycle lifecycle: OPEN -> FINALIZED -> ARCHIVED.
 */
@Service
public class BillingService {

    private final BillingCycleRepository billingCycleRepository;
    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final WaterUsageLogRepository usageLogRepository;
    private final InvoiceRepository invoiceRepository;
    private final TariffService tariffService;
    private final EmailService emailService;

    public BillingService(BillingCycleRepository billingCycleRepository, ApartmentRepository apartmentRepository,
                           HouseholdRepository householdRepository, WaterUsageLogRepository usageLogRepository,
                           InvoiceRepository invoiceRepository, TariffService tariffService, EmailService emailService) {
        this.billingCycleRepository = billingCycleRepository;
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
        this.usageLogRepository = usageLogRepository;
        this.invoiceRepository = invoiceRepository;
        this.tariffService = tariffService;
        this.emailService = emailService;
    }

    @Transactional
    public BillingCycle openCycle(BillingCycleRequest req) {
        Apartment apartment = apartmentRepository.findById(req.getApartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));

        billingCycleRepository.findByApartmentIdAndStatus(apartment.getId(), BillingCycleStatus.OPEN)
                .ifPresent(c -> { throw new BadRequestException("An OPEN billing cycle already exists for this apartment"); });

        BillingCycle cycle = BillingCycle.builder()
                .apartment(apartment)
                .status(BillingCycleStatus.OPEN)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .build();

        return billingCycleRepository.save(cycle);
    }

    @Transactional
    public BillingCycle recordPurchase(PurchaseEntryRequest req) {
        BillingCycle cycle = billingCycleRepository.findById(req.getBillingCycleId())
                .orElseThrow(() -> new ResourceNotFoundException("Billing cycle not found"));

        if (cycle.getStatus() != BillingCycleStatus.OPEN) {
            throw new BadRequestException("Can only record purchases against an OPEN billing cycle");
        }

        // Weighted-average unit cost across all purchase entries recorded so far in this cycle.
        BigDecimal existingVolume = cycle.getTotalPurchasedVolumeKl();
        BigDecimal existingCost = existingVolume.multiply(cycle.getUnitCost());
        BigDecimal newVolume = existingVolume.add(req.getPurchasedVolumeKl());
        BigDecimal newCost = existingCost.add(req.getPurchasedVolumeKl().multiply(req.getUnitCost()));

        cycle.setTotalPurchasedVolumeKl(newVolume);
        cycle.setUnitCost(newVolume.compareTo(BigDecimal.ZERO) > 0
                ? newCost.divide(newVolume, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);

        return billingCycleRepository.save(cycle);
    }

    /**
     * Finalizes a billing cycle: computes tiered per-household charges from
     * metered consumption, apportions the apartment's total water cost
     * proportionally to consumption (flat-area fallback for meter-less
     * households), and generates one invoice per household.
     */
    @Transactional
    public List<Invoice> finalizeCycle(Long billingCycleId) {
        BillingCycle cycle = billingCycleRepository.findById(billingCycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Billing cycle not found"));

        if (cycle.getStatus() != BillingCycleStatus.OPEN) {
            throw new BadRequestException("Billing cycle is not OPEN");
        }

        Apartment apartment = cycle.getApartment();
        TariffPlan plan = tariffService.getActivePlan(apartment);
        List<Household> households = householdRepository.findByApartmentId(apartment.getId());

        if (households.isEmpty()) {
            throw new BadRequestException("Apartment has no households to bill");
        }

        // Total metered consumption during the cycle, split by meter-active vs meter-less
        BigDecimal totalMeteredConsumption = BigDecimal.ZERO;
        BigDecimal totalFlatArea = BigDecimal.ZERO;
        for (Household h : households) {
            totalFlatArea = totalFlatArea.add(h.getFlatSizeSqft());
            if (Boolean.TRUE.equals(h.getMeterActive())) {
                totalMeteredConsumption = totalMeteredConsumption.add(
                        cycleConsumption(h.getId(), cycle));
            }
        }

        BigDecimal totalSharedCost = cycle.getTotalPurchasedVolumeKl().multiply(cycle.getUnitCost());

        List<Invoice> invoices = new java.util.ArrayList<>();

        for (Household h : households) {
            BigDecimal consumption = cycleConsumption(h.getId(), cycle);
            BigDecimal baseCharge = tieredCharge(consumption, plan);

            BigDecimal sharedAllocation;
            if (Boolean.TRUE.equals(h.getMeterActive()) && totalMeteredConsumption.compareTo(BigDecimal.ZERO) > 0) {
                // proportional to metered consumption
                sharedAllocation = totalSharedCost
                        .multiply(consumption)
                        .divide(totalMeteredConsumption, 6, RoundingMode.HALF_UP);
            } else {
                // flat-area fallback for households without a working meter
                sharedAllocation = totalFlatArea.compareTo(BigDecimal.ZERO) > 0
                        ? totalSharedCost.multiply(h.getFlatSizeSqft())
                            .divide(totalFlatArea, 6, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;
            }

            BigDecimal total = baseCharge.add(sharedAllocation).setScale(2, RoundingMode.HALF_UP);

            Invoice invoice = Invoice.builder()
                    .billingCycle(cycle)
                    .household(h)
                    .consumptionKl(consumption)
                    .baseCharge(baseCharge.setScale(2, RoundingMode.HALF_UP))
                    .sharedAllocation(sharedAllocation.setScale(2, RoundingMode.HALF_UP))
                    .adjustments(BigDecimal.ZERO)
                    .total(total)
                    .build();

            invoices.add(invoiceRepository.save(invoice));
        }

        cycle.setStatus(BillingCycleStatus.FINALIZED);
        cycle.setFinalizedAt(java.time.LocalDateTime.now());
        billingCycleRepository.save(cycle);

        // notify residents that billing is complete
        for (Invoice inv : invoices) {
            emailService.sendBillingCycleCompleteEmail(inv);
        }

        return invoices;
    }

    @Transactional
    public BillingCycle archiveCycle(Long billingCycleId) {
        BillingCycle cycle = billingCycleRepository.findById(billingCycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Billing cycle not found"));
        if (cycle.getStatus() != BillingCycleStatus.FINALIZED) {
            throw new BadRequestException("Only a FINALIZED cycle can be archived");
        }
        cycle.setStatus(BillingCycleStatus.ARCHIVED);
        return billingCycleRepository.save(cycle);
    }

    /**
     * Tiered tariff calculation: base_rate applies up to base_tier_limit_kl,
     * excess_rate applies to everything beyond that, correctly handling the
     * tier boundary.
     */
    public BigDecimal tieredCharge(BigDecimal consumptionKl, TariffPlan plan) {
        if (consumptionKl.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal limit = plan.getBaseTierLimitKl();
        if (consumptionKl.compareTo(limit) <= 0) {
            return consumptionKl.multiply(plan.getBaseRate());
        }
        BigDecimal baseAmount = limit.multiply(plan.getBaseRate());
        BigDecimal excessVolume = consumptionKl.subtract(limit);
        BigDecimal excessAmount = excessVolume.multiply(plan.getExcessRate());
        return baseAmount.add(excessAmount);
    }

    private BigDecimal cycleConsumption(Long householdId, BillingCycle cycle) {
        List<WaterUsageLog> logs = usageLogRepository
                .findByHouseholdIdAndReadingDateBetweenOrderByReadingDateAsc(
                        householdId, cycle.getStartDate(), cycle.getEndDate());
        return logs.stream()
                .map(WaterUsageLog::getConsumptionKl)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public List<BillingCycle> listCycles(Long apartmentId) {
        return billingCycleRepository.findByApartmentIdOrderByStartDateDesc(apartmentId);
    }

    public List<Invoice> getInvoicesForCycle(Long cycleId) {
        return invoiceRepository.findByBillingCycleId(cycleId);
    }

    public List<Invoice> getInvoicesForHousehold(Long householdId) {
        return invoiceRepository.findByHouseholdIdOrderByCreatedAtDesc(householdId);
    }

    public Invoice getInvoiceById(Long invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
    }
}