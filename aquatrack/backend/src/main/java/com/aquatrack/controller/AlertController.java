package com.aquatrack.controller;

import com.aquatrack.entity.Alert;
import com.aquatrack.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping("/active")
    public List<Alert> active() {
        return alertService.getActiveAlerts();
    }

    @GetMapping("/household/{householdId}")
    public List<Alert> forHousehold(@PathVariable Long householdId) {
        return alertService.getHouseholdAlerts(householdId);
    }
}
