package com.aquatrack.service;

import com.aquatrack.entity.*;
import com.aquatrack.repository.AlertRepository;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.WaterUsageLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Alert engine. Two detection strategies, run by the scheduler:
 *  1. Threshold breach: today's usage vs a configurable % of the household's
 *     recent average ("overuse-threshold-percent").
 *  2. Statistical anomaly: usage more than 2 standard deviations (2 sigma)
 *     above the household's historical average — a simple, concrete
 *     first exposure to statistical outlier detection for leak indication.
 */
@Service
public class AlertService {

    private final WaterUsageLogRepository usageLogRepository;
    private final HouseholdRepository householdRepository;
    private final AlertRepository alertRepository;
    private final EmailService emailService;

    @Value("${aquatrack.alerts.overuse-threshold-percent}")
    private double overuseThresholdPercent;

    @Value("${aquatrack.alerts.anomaly-std-dev-multiplier}")
    private double stdDevMultiplier;

    public AlertService(WaterUsageLogRepository usageLogRepository, HouseholdRepository householdRepository,
                         AlertRepository alertRepository, EmailService emailService) {
        this.usageLogRepository = usageLogRepository;
        this.householdRepository = householdRepository;
        this.alertRepository = alertRepository;
        this.emailService = emailService;
    }

    @Transactional
    public void runChecksForAllHouseholds() {
        List<Household> households = householdRepository.findAll();
        for (Household household : households) {
            checkHousehold(household);
        }
    }

    @Transactional
    public void checkHousehold(Household household) {
        List<WaterUsageLog> recent = usageLogRepository.findTop30ByHouseholdIdOrderByReadingDateDesc(household.getId());
        if (recent.size() < 5) {
            return; // not enough history for a meaningful baseline
        }

        List<BigDecimal> consumptions = recent.stream()
                .map(WaterUsageLog::getConsumptionKl)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (consumptions.size() < 5) return;

        BigDecimal latest = consumptions.get(0);
        List<BigDecimal> history = consumptions.subList(1, consumptions.size());

        BigDecimal mean = average(history);
        BigDecimal stdDev = standardDeviation(history, mean);

        // 1. Threshold overuse check
        if (mean.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ratio = latest.divide(mean, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            if (ratio.doubleValue() >= overuseThresholdPercent) {
                raiseAlert(household, AlertType.OVERUSE, AlertSeverity.WARNING,
                        "Latest usage (" + latest + " kL) is " + ratio.setScale(0, RoundingMode.HALF_UP) +
                        "% of the household's recent average (" + mean.setScale(2, RoundingMode.HALF_UP) + " kL). " +
                        "Consider checking taps and fixtures for leaks.");
            }
        }

        // 2. Statistical anomaly (2-sigma) leak detection
        if (stdDev.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal threshold = mean.add(stdDev.multiply(BigDecimal.valueOf(stdDevMultiplier)));
            if (latest.compareTo(threshold) > 0) {
                raiseAlert(household, AlertType.ANOMALY_LEAK, AlertSeverity.CRITICAL,
                        "Latest usage (" + latest + " kL) is more than " + stdDevMultiplier +
                        " standard deviations above this household's average (" + mean.setScale(2, RoundingMode.HALF_UP) +
                        " kL, std dev " + stdDev.setScale(2, RoundingMode.HALF_UP) + " kL). This pattern often indicates a leak.");
            }
        }
    }

    private void raiseAlert(Household household, AlertType type, AlertSeverity severity, String message) {
        Alert alert = Alert.builder()
                .household(household)
                .alertType(type)
                .severity(severity)
                .message(message)
                .resolved(false)
                .build();
        alert = alertRepository.save(alert);
        emailService.sendAlertEmail(alert);
    }

    public List<Alert> getActiveAlerts() {
        return alertRepository.findByResolvedFalseOrderByCreatedAtDesc();
    }

    public List<Alert> getActiveAlertsForApartment(Long apartmentId) {
        return alertRepository.findByHousehold_Apartment_IdAndResolvedFalseOrderByCreatedAtDesc(apartmentId);
    }

    public List<Alert> getAlertsForHousehold(Long householdId) {
        return alertRepository.findByHouseholdIdOrderByCreatedAtDesc(householdId);
    }

    @Transactional
    public void resolveAlert(Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new com.aquatrack.exception.ResourceNotFoundException("Alert not found"));
        alert.setResolved(true);
        alertRepository.save(alert);
    }

    private BigDecimal average(List<BigDecimal> values) {
        if (values.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(values.size()), 6, RoundingMode.HALF_UP);
    }

    private BigDecimal standardDeviation(List<BigDecimal> values, BigDecimal mean) {
        if (values.size() < 2) return BigDecimal.ZERO;
        BigDecimal sumSquaredDiffs = BigDecimal.ZERO;
        for (BigDecimal v : values) {
            BigDecimal diff = v.subtract(mean);
            sumSquaredDiffs = sumSquaredDiffs.add(diff.multiply(diff));
        }
        BigDecimal variance = sumSquaredDiffs.divide(BigDecimal.valueOf(values.size()), 6, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(Math.sqrt(variance.doubleValue()));
    }
}
