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
 * Alert engine. Three detection strategies, run by the scheduler (and
 * on-demand by an admin):
 *  1. Absolute daily-limit breach: today's usage vs a household's configured
 *     cap (or, if unset, no check is performed for that household).
 *  2. Relative overuse: today's usage vs a configurable % of the household's
 *     recent average ("overuse-threshold-percent").
 *  3. Statistical anomaly (leak): usage more than 2 standard deviations
 *     (2 sigma) above the household's historical average.
 *
 * Every alert raised is also visible to the resident's dashboard (via
 * AlertController) and triggers an email. To avoid spamming a household
 * with duplicate emails every time the scheduler runs, a given alert type
 * is only raised again once the previous open alert of that type has been
 * resolved.
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
        if (recent.isEmpty()) return;

        BigDecimal latest = recent.get(0).getConsumptionKl();
        if (latest == null) return;

        // 1. Absolute daily-limit check — works from the very first reading, doesn't need history.
        if (household.getDailyLimitKl() != null && latest.compareTo(household.getDailyLimitKl()) > 0) {
            raiseAlertIfNotAlreadyOpen(household, AlertType.DAILY_LIMIT_EXCEEDED, AlertSeverity.CRITICAL,
                    "Today's usage (" + latest + " kL) exceeded this household's daily limit of " +
                    household.getDailyLimitKl() + " kL. Please check for open taps or ongoing appliance use.");
        }

        if (recent.size() < 5) return; // not enough history for the two statistical checks below

        List<BigDecimal> consumptions = recent.stream()
                .map(WaterUsageLog::getConsumptionKl)
                .filter(java.util.Objects::nonNull)
                .toList();
        if (consumptions.size() < 5) return;

        List<BigDecimal> history = consumptions.subList(1, consumptions.size());
        BigDecimal mean = average(history);
        BigDecimal stdDev = standardDeviation(history, mean);

        // 2. Relative overuse check
        if (mean.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ratio = latest.divide(mean, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
            if (ratio.doubleValue() >= overuseThresholdPercent) {
                raiseAlertIfNotAlreadyOpen(household, AlertType.OVERUSE, AlertSeverity.WARNING,
                        "Latest usage (" + latest + " kL) is " + ratio.setScale(0, RoundingMode.HALF_UP) +
                        "% of the household's recent average (" + mean.setScale(2, RoundingMode.HALF_UP) + " kL). " +
                        "Consider checking taps and fixtures for leaks.");
            }
        }

        // 3. Statistical anomaly (2-sigma) leak detection
        if (stdDev.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal threshold = mean.add(stdDev.multiply(BigDecimal.valueOf(stdDevMultiplier)));
            if (latest.compareTo(threshold) > 0) {
                raiseAlertIfNotAlreadyOpen(household, AlertType.ANOMALY_LEAK, AlertSeverity.CRITICAL,
                        "Latest usage (" + latest + " kL) is more than " + stdDevMultiplier +
                        " standard deviations above this household's average (" + mean.setScale(2, RoundingMode.HALF_UP) +
                        " kL, std dev " + stdDev.setScale(2, RoundingMode.HALF_UP) + " kL). This pattern often indicates a leak.");
            }
        }
    }

    /**
     * Avoids re-raising (and re-emailing) the same alert type every time the
     * scheduler runs while a household's issue is still unresolved — only
     * raises a fresh alert once the prior one of that type has been marked
     * resolved by an admin.
     */
    private void raiseAlertIfNotAlreadyOpen(Household household, AlertType type, AlertSeverity severity, String message) {
        if (alertRepository.existsByHouseholdIdAndAlertTypeAndResolvedFalse(household.getId(), type)) {
            return;
        }
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
