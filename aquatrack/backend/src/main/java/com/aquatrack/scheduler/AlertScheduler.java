package com.aquatrack.scheduler;

import com.aquatrack.entity.Household;
import com.aquatrack.entity.WaterUsageLog;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.WaterUsageLogRepository;
import com.aquatrack.service.AlertService;
import com.aquatrack.service.AnomalyDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * Periodic background job (Spring @Scheduled) that checks every household's most recent
 * reading against two rules:
 *   1. Overuse threshold: today's consumption > 1.5x the household's own rolling average
 *   2. Anomaly / leak detection: today's consumption > mean + 2*stdDev (2-sigma rule)
 * Runs without any user-triggered request, which is the point of scheduled jobs.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlertScheduler {

    private final HouseholdRepository householdRepository;
    private final WaterUsageLogRepository usageLogRepository;
    private final AnomalyDetectionService anomalyDetectionService;
    private final AlertService alertService;

    @Value("${app.alerts.overuse-threshold-multiplier}")
    private double overuseMultiplier;

    @Value("${app.alerts.anomaly-std-dev-multiplier}")
    private double anomalyStdDevMultiplier;

    // Runs once a day at 06:00 server time. Cron: sec min hour day month weekday
    @Scheduled(cron = "0 0 6 * * *")
    public void checkAllHouseholdsForAlerts() {
        log.info("Running scheduled usage-alert scan for all households");
        List<Household> households = householdRepository.findAll();
        for (Household household : households) {
            checkHousehold(household);
        }
    }

    public void checkHousehold(Household household) {
        List<WaterUsageLog> history = usageLogRepository.findTop30ByHouseholdIdOrderByReadingDateDesc(household.getId());
        if (history.isEmpty()) {
            return;
        }

        WaterUsageLog latest = history.get(0);
        if (!latest.getReadingDate().equals(LocalDate.now()) && !latest.getReadingDate().equals(LocalDate.now().minusDays(1))) {
            return; // only alert on recent readings
        }

        List<WaterUsageLog> priorHistory = history.subList(1, history.size());
        if (priorHistory.isEmpty()) {
            return;
        }

        double avg = anomalyDetectionService.mean(priorHistory);
        BigDecimal average = BigDecimal.valueOf(avg).setScale(3, RoundingMode.HALF_UP);
        BigDecimal threshold = average.multiply(BigDecimal.valueOf(overuseMultiplier));

        boolean isOveruse = latest.getConsumptionKl().compareTo(threshold) > 0;
        boolean isAnomaly = anomalyDetectionService.isAnomalous(priorHistory, latest.getConsumptionKl(), anomalyStdDevMultiplier);

        if (isAnomaly) {
            alertService.raiseAnomalyAlert(household, latest.getConsumptionKl(), average);
        } else if (isOveruse) {
            alertService.raiseOveruseAlert(household, latest.getConsumptionKl(), threshold);
        }
    }
}
