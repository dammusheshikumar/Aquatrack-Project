package com.aquatrack.service;

import com.aquatrack.dto.billing.BillingCycleRequest;
import com.aquatrack.dto.billing.InvoiceAdjustmentRequest;
import com.aquatrack.dto.billing.PurchaseEntryRequest;
import com.aquatrack.entity.*;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Core billing engine:
 *  1. Tiered tariff calculation per household from metered consumption,
 *     generalized to any number of configured rate tiers.
 *  2. Itemized bulk water purchase tracking (tanker / municipal / other) per
 *     billing cycle, with a weighted-average unit cost recomputed from every
 *     purchase entry recorded so far.
 *  3. Proportional shared-cost apportionment (by consumption, with a
 *     flat-area fallback for households with no working meter).
 *  4. Billing cycle lifecycle: OPEN -> FINALIZED -> ARCHIVED, plus
 *     post-finalize, reason-tracked invoice adjustments.
 */
@Service
public class BillingService {

    private final BillingCycleRepository billingCycleRepository;
    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final WaterUsageLogRepository usageLogRepository;
    private final InvoiceRepository invoiceRepository;
    private final WaterPurchaseRepository waterPurchaseRepository;
    private final UserRepository userRepository;
    private final TariffService tariffService;
    private final EmailService emailService;

    public BillingService(BillingCycleRepository billingCycleRepository, ApartmentRepository apartmentRepository,
                           HouseholdRepository householdRepository, WaterUsageLogRepository usageLogRepository,
                           InvoiceRepository invoiceRepository, WaterPurchaseRepository waterPurchaseRepository,
                           UserRepository userRepository, TariffService tariffService, EmailService emailService) {
        this.billingCycleRepository = billingCycleRepository;
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
        this.usageLogRepository = usageLogRepository;
        this.invoiceRepository = invoiceRepository;
        this.waterPurchaseRepository = waterPurchaseRepository;
        this.userRepository = userRepository;
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

    /**
     * Records one itemized purchase entry (tanker delivery or municipal bill)
     * and recomputes the cycle's total volume and weighted-average unit cost
     * from every purchase recorded so far, so the aggregate is always exact
     * regardless of how many entries are added.
     */
    @Transactional
    public WaterPurchase recordPurchase(PurchaseEntryRequest req) {
        BillingCycle cycle = billingCycleRepository.findById(req.getBillingCycleId())
                .orElseThrow(() -> new ResourceNotFoundException("Billing cycle not found"));

        if (cycle.getStatus() != BillingCycleStatus.OPEN) {
            throw new BadRequestException("Can only record purchases against an OPEN billing cycle");
        }

        BigDecimal totalCost = req.getVolumeKl().multiply(req.getUnitCost()).setScale(2, RoundingMode.HALF_UP);

        WaterPurchase purchase = WaterPurchase.builder()
                .billingCycle(cycle)
                .purchaseDate(req.getPurchaseDate())
                .purchaseType(req.getPurchaseType())
                .volumeKl(req.getVolumeKl())
                .unitCost(req.getUnitCost())
                .totalCost(totalCost)
                .notes(req.getNotes())
                .build();
        waterPurchaseRepository.save(purchase);

        recomputeCycleAggregate(cycle);

        return purchase;
    }

    public List<WaterPurchase> getPurchasesForCycle(Long billingCycleId) {
        return waterPurchaseRepository.findByBillingCycleIdOrderByPurchaseDateDesc(billingCycleId);
    }

    private void recomputeCycleAggregate(BillingCycle cycle) {
        List<WaterPurchase> purchases = waterPurchaseRepository.findByBillingCycleIdOrderByPurchaseDateDesc(cycle.getId());
        BigDecimal totalVolume = purchases.stream().map(WaterPurchase::getVolumeKl).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCost = purchases.stream().map(WaterPurchase::getTotalCost).reduce(BigDecimal.ZERO, BigDecimal::add);

        cycle.setTotalPurchasedVolumeKl(totalVolume);
        cycle.setUnitCost(totalVolume.compareTo(BigDecimal.ZERO) > 0
                ? totalCost.divide(totalVolume, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        billingCycleRepository.save(cycle);
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

        BigDecimal totalMeteredConsumption = BigDecimal.ZERO;
        BigDecimal totalFlatArea = BigDecimal.ZERO;
        for (Household h : households) {
            totalFlatArea = totalFlatArea.add(h.getFlatSizeSqft());
            if (Boolean.TRUE.equals(h.getMeterActive())) {
                totalMeteredConsumption = totalMeteredConsumption.add(cycleConsumption(h.getId(), cycle));
            }
        }

        BigDecimal totalSharedCost = cycle.getTotalPurchasedVolumeKl().multiply(cycle.getUnitCost());

        List<Invoice> invoices = new ArrayList<>();

        for (Household h : households) {
            BigDecimal consumption = cycleConsumption(h.getId(), cycle);
            BigDecimal baseCharge = tieredCharge(consumption, plan);

            BigDecimal sharedAllocation;
            if (Boolean.TRUE.equals(h.getMeterActive()) && totalMeteredConsumption.compareTo(BigDecimal.ZERO) > 0) {
                sharedAllocation = totalSharedCost
                        .multiply(consumption)
                        .divide(totalMeteredConsumption, 6, RoundingMode.HALF_UP);
            } else {
                sharedAllocation = totalFlatArea.compareTo(BigDecimal.ZERO) > 0
                        ? totalSharedCost.multiply(h.getFlatSizeSqft()).divide(totalFlatArea, 6, RoundingMode.HALF_UP)
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

        for (Invoice inv : invoices) {
            emailService.sendBillingCycleCompleteEmail(inv);
        }

        return invoices;
    }

    /**
     * Applies a reason-tracked correction to an already-generated invoice
     * (e.g. a billing dispute resolution or a manual credit). Positive
     * amounts increase the total due; negative amounts reduce it.
     */
    @Transactional
    public Invoice applyAdjustment(Long invoiceId, InvoiceAdjustmentRequest req, Long adminUserId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        User admin = adminUserId != null ? userRepository.findById(adminUserId).orElse(null) : null;

        InvoiceAdjustment adjustment = InvoiceAdjustment.builder()
                .invoice(invoice)
                .amount(req.getAmount())
                .reason(req.getReason())
                .createdByAdmin(admin)
                .build();
        invoice.getAdjustmentHistory().add(adjustment);

        invoice.setAdjustments(invoice.getAdjustments().add(req.getAmount()));
        invoice.setTotal(invoice.getBaseCharge().add(invoice.getSharedAllocation()).add(invoice.getAdjustments())
                .setScale(2, RoundingMode.HALF_UP));

        return invoiceRepository.save(invoice);
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
     * Tiered tariff calculation, generalized to any number of configured
     * rate bands. Each tier's rate applies only to the slice of consumption
     * that falls within it, so a boundary is always billed correctly —
     * e.g. tiers [0-10 kL @ Rs.20, 10-25 kL @ Rs.35, 25+ kL @ Rs.50] charge a
     * 30 kL household (10 x 20) + (15 x 35) + (5 x 50) = Rs.975, never
     * 30 x 50 (which would over-charge every kL at the top rate) or
     * 30 x 20 (which would under-charge by ignoring the higher bands).
     */
    public BigDecimal tieredCharge(BigDecimal consumptionKl, TariffPlan plan) {
        if (consumptionKl.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (plan.getTiers() == null || plan.getTiers().isEmpty()) {
            throw new BadRequestException("Tariff plan '" + plan.getPlanName() + "' has no configured rate tiers");
        }

        BigDecimal remaining = consumptionKl;
        BigDecimal previousLimit = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;

        for (TariffTier tier : plan.getTiers()) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            BigDecimal tierCapacity = tier.getUpToKl() != null
                    ? tier.getUpToKl().subtract(previousLimit)
                    : remaining;

            BigDecimal volumeInTier = remaining.min(tierCapacity);
            total = total.add(volumeInTier.multiply(tier.getRate()));
            remaining = remaining.subtract(volumeInTier);

            if (tier.getUpToKl() != null) {
                previousLimit = tier.getUpToKl();
            }
        }

        return total;
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
