package com.aquatrack.controller;

import com.aquatrack.dto.admin.AdminOverviewResponse;
import com.aquatrack.entity.Alert;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.WaterUsageLog;
import com.aquatrack.repository.AlertRepository;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.WaterUsageLogRepository;
import com.aquatrack.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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
import java.util.stream.Collectors;

/**
 * Powers the admin overview panel: headline stats, monthly consumption-by-household chart data,
 * and the active-alerts feed - mirroring the reference dashboard mock-up.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final HouseholdRepository householdRepository;
    private final WaterUsageLogRepository usageLogRepository;
    private final AlertRepository alertRepository;

    @GetMapping("/overview")
    public AdminOverviewResponse overview(@AuthenticationPrincipal CustomUserDetails principal) {
        Long apartmentId = principal.getApartmentId();
        List<Household> households = householdRepository.findByApartmentId(apartmentId);

        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate today = LocalDate.now();

        Map<String, BigDecimal> monthlyConsumption = new LinkedHashMap<>();
        BigDecimal totalDaily = BigDecimal.ZERO;
        int readingDays = 0;

        for (Household h : households) {
            List<WaterUsageLog> logs = usageLogRepository.findByHouseholdIdAndReadingDateBetween(h.getId(), monthStart, today);
            BigDecimal monthTotal = logs.stream().map(WaterUsageLog::getConsumptionKl).reduce(BigDecimal.ZERO, BigDecimal::add);
            monthlyConsumption.put(h.getFlatNumber(), monthTotal.setScale(2, RoundingMode.HALF_UP));
            totalDaily = totalDaily.add(monthTotal);
            readingDays += logs.size();
        }

        BigDecimal avgDaily = readingDays > 0
                ? totalDaily.divide(BigDecimal.valueOf(readingDays), 3, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<Alert> recentAlerts = alertRepository.findByIsResolvedFalseOrderByCreatedAtDesc().stream()
                .filter(a -> a.getHousehold().getApartment().getId().equals(apartmentId))
                .limit(10)
                .collect(Collectors.toList());

        List<AdminOverviewResponse.AlertSummary> alertSummaries = recentAlerts.stream()
                .map(a -> AdminOverviewResponse.AlertSummary.builder()
                        .id(a.getId())
                        .flatNumber(a.getHousehold().getFlatNumber())
                        .alertType(a.getAlertType().name())
                        .severity(a.getSeverity().name())
                        .message(a.getMessage())
                        .createdAt(a.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm")))
                        .build())
                .collect(Collectors.toList());

        return AdminOverviewResponse.builder()
                .totalApartments(1)
                .totalHouseholds(households.size())
                .activeAlerts(recentAlerts.size())
                .averageDailyUsageKl(avgDaily)
                .monthlyConsumptionByHousehold(monthlyConsumption)
                .recentAlerts(alertSummaries)
                .build();
    }
}
