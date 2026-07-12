package com.aquatrack.controller;

import com.aquatrack.entity.Alert;
import com.aquatrack.service.AlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping("/admin/apartments/{apartmentId}/alerts")
    public ResponseEntity<List<Alert>> activeForApartment(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(alertService.getActiveAlertsForApartment(apartmentId));
    }

    @GetMapping("/resident/households/{householdId}/alerts")
    public ResponseEntity<List<Alert>> forHousehold(@PathVariable Long householdId) {
        return ResponseEntity.ok(alertService.getAlertsForHousehold(householdId));
    }

    @PostMapping("/admin/alerts/{id}/resolve")
    public ResponseEntity<Void> resolve(@PathVariable Long id) {
        alertService.resolveAlert(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/alerts/run-check")
    public ResponseEntity<Void> runCheckNow() {
        alertService.runChecksForAllHouseholds();
        return ResponseEntity.noContent().build();
    }
}
