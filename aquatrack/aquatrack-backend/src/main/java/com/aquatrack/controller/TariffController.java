package com.aquatrack.controller;

import com.aquatrack.dto.tariff.TariffPlanRequest;
import com.aquatrack.entity.TariffPlan;
import com.aquatrack.service.TariffService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tariff-plans")
public class TariffController {

    private final TariffService tariffService;

    public TariffController(TariffService tariffService) {
        this.tariffService = tariffService;
    }

    @PostMapping
    public ResponseEntity<TariffPlan> create(@Valid @RequestBody TariffPlanRequest req) {
        return ResponseEntity.ok(tariffService.createPlan(req));
    }

    @GetMapping("/apartment/{apartmentId}")
    public ResponseEntity<List<TariffPlan>> list(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(tariffService.listPlans(apartmentId));
    }
}
