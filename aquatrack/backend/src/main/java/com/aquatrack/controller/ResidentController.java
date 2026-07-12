package com.aquatrack.controller;

import com.aquatrack.dto.admin.ResidentDashboardResponse;
import com.aquatrack.entity.BillingCycle;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.WaterUsageLog;
import com.aquatrack.repository.BillingCycleRepository;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.WaterUsageLogRepository;
import com.aquatrack.security.CustomUserDetails;
import com.aquatrack.service.TariffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Powers the resident dashboard: daily/monthly consumption trend, current cycle summary,
 * a projected bill preview, and rotating water-saving tips.
 */
@RestController
@RequestMapping("/api/resident")
@RequiredArgsConstructor
public class ResidentController {

    private final HouseholdRepository householdRepository;
    private final WaterUsageLogRepository usageLogRepository;
    private final BillingCycleRepository billingCycleRepository;
    private final TariffService tariffService;

    private static final List<String> TIPS = List.of(
            "Fix leaking taps promptly - a slow drip can waste over 15 litres a day.",
            "Run washing machines and dishwashers only with a full load.",
            "Take shorter showers - cutting 2 minutes can save up to 20 litres.",
            "Reuse RO reject water for plants or cleaning floors.",
            "Turn off the tap while brushing teeth or soaping dishes."
    );

    @GetMapping("/dashboard")
    public ResidentDashboardResponse dashboard(@AuthenticationPrincipal CustomUserDetails principal) {
        Household household = householdRepository.findById(principal.getHouseholdId())
                .orElseThrow(() -> new com.aquatrack.exception.ResourceNotFoundException("Household not found"));

        List<WaterUsageLog> last30 = usageLogRepository.findTop30ByHouseholdIdOrderByReadingDateDesc(household.getId());

        Map<String, BigDecimal> dailyUsage = new LinkedHashMap<>();
        last30.stream()
                .sorted((a, b) -> a.getReadingDate().compareTo(b.getReadingDate()))
                .forEach(l -> dailyUsage.put(l.getReadingDate().format(DateTimeFormatter.ISO_DATE), l.getConsumptionKl()));

        BigDecimal apartmentAverage = BigDecimal.ZERO;
        List<Household> apartmentHouseholds = householdRepository.findByApartmentId(household.getApartment().getId());
        if (!apartmentHouseholds.isEmpty()) {
            BigDecimal sum = BigDecimal.ZERO;
            int count = 0;
            for (Household h : apartmentHouseholds) {
                List<WaterUsageLog> recent = usageLogRepository.findTop30ByHouseholdIdOrderByReadingDateDesc(h.getId());
                BigDecimal total = recent.stream().map(WaterUsageLog::getConsumptionKl).reduce(BigDecimal.ZERO, BigDecimal::add);
                sum = sum.add(total);
                count++;
            }
            if (count > 0) apartmentAverage = sum.divide(BigDecimal.valueOf(count), 3, RoundingMode.HALF_UP);
        }

        BigDecimal currentCycleConsumption = last30.stream()
                .map(WaterUsageLog::getConsumptionKl).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal projectedBill = BigDecimal.ZERO;
        String cycleStatus = "NO_ACTIVE_CYCLE";
        var openCycle = billingCycleRepository.findByApartmentIdAndStatus(household.getApartment().getId(), BillingCycle.Status.OPEN);
        if (openCycle.isPresent()) {
            cycleStatus = "OPEN";
            try {
                var plan = tariffService.getActivePlan(household.getApartment().getId());
                projectedBill = tariffService.calculateCharge(plan, currentCycleConsumption).setScale(2, RoundingMode.HALF_UP);
            } catch (Exception ignored) {
                // no active tariff plan configured yet
            }
        }

        int tipIndex = (int) (LocalDate.now().toEpochDay() % TIPS.size());
        List<String> tips = List.of(TIPS.get(tipIndex), TIPS.get((tipIndex + 1) % TIPS.size()));

        return ResidentDashboardResponse.builder()
                .flatNumber(household.getFlatNumber())
                .currentCycleConsumptionKl(currentCycleConsumption)
                .apartmentAverageConsumptionKl(apartmentAverage)
                .projectedBill(projectedBill)
                .dailyUsageLast30Days(dailyUsage)
                .waterSavingTips(tips)
                .billingCycleStatus(cycleStatus)
                .build();
    }
}
