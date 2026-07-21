package com.aquatrack.controller;

import com.aquatrack.dto.tariff.TariffPlanRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.TariffPlan;
import com.aquatrack.service.ApartmentService;
import com.aquatrack.service.TariffService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/admin/tariff-plans")
public class TariffController {

    private final TariffService tariffService;
    private final ApartmentService apartmentService;

    public TariffController(TariffService tariffService, ApartmentService apartmentService) {
        this.tariffService = tariffService;
        this.apartmentService = apartmentService;
    }

    // Create a new tariff plan
    @PostMapping
    public ResponseEntity<TariffPlan> createPlan(@Valid @RequestBody TariffPlanRequest request) {
        TariffPlan plan = tariffService.createPlan(request);
        return new ResponseEntity<>(plan, HttpStatus.CREATED);
    }

    // Get all tariff plans for an apartment
    @GetMapping("/apartment/{apartmentId}")
    public ResponseEntity<List<TariffPlan>> listPlans(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(tariffService.listPlans(apartmentId));
    }

    // Get active tariff plan
    @GetMapping("/apartment/{apartmentId}/active")
    public ResponseEntity<TariffPlan> getActivePlan(@PathVariable Long apartmentId) {
        Apartment apartment = apartmentService.getApartment(apartmentId);
        return ResponseEntity.ok(tariffService.getActivePlan(apartment));
    }

    // Activate a tariff plan
    @PutMapping("/apartment/{apartmentId}/activate/{tariffId}")
    public ResponseEntity<TariffPlan> activatePlan(
            @PathVariable Long apartmentId,
            @PathVariable Long tariffId) {
        return ResponseEntity.ok(tariffService.activatePlan(apartmentId, tariffId));
    }

    // Calculate bill using tariff
    @GetMapping("/calculate")
    public ResponseEntity<BigDecimal> calculateCharge(
            @RequestParam Long apartmentId,
            @RequestParam BigDecimal consumptionKl) {

        Apartment apartment = apartmentService.getApartment(apartmentId);
        TariffPlan tariff = tariffService.getActivePlan(apartment);
        BigDecimal amount = tariffService.calculateCharge(consumptionKl, tariff);

        return ResponseEntity.ok(amount);
    }
}