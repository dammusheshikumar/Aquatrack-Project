package com.aquatrack.scheduler;

import com.aquatrack.service.AlertService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Runs the alert engine periodically using Spring's @Scheduled, so leak,
 * overuse, and daily-limit detection happens automatically without any
 * user-triggered request. Cron expression is externalized to
 * application.yml (aquatrack.alerts.scheduler-cron).
 */
@Component
public class AlertScheduler {

    private final AlertService alertService;

    public AlertScheduler(AlertService alertService) {
        this.alertService = alertService;
    }

    @Scheduled(cron = "${aquatrack.alerts.scheduler-cron}")
    public void runDailyAlertChecks() {
        alertService.runChecksForAllHouseholds();
    }
}
