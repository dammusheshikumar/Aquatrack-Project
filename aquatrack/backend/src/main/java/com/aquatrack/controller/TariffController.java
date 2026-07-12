package com.aquatrack.controller;

import com.aquatrack.dto.billing.TariffPlanRequest;
import com.aquatrack.entity.TariffPlan;
import com.aquatrack.service.TariffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tariffs")
@RequiredArgsConstructor
public class TariffController {

    private final TariffService tariffService;

    @GetMapping("/apartment/{apartmentId}")
    public List<TariffPlan> byApartment(@PathVariable Long apartmentId) {
        return tariffService.findByApartment(apartmentId);
    }

    @GetMapping("/apartment/{apartmentId}/active")
    public ResponseEntity<TariffPlan> active(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(tariffService.getActivePlan(apartmentId));
    }

    @PostMapping
    public ResponseEntity<TariffPlan> create(@Valid @RequestBody TariffPlanRequest request) {
        return ResponseEntity.ok(tariffService.createOrReplace(request));
    }
}
