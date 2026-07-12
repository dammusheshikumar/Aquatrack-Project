package com.aquatrack.controller;

import com.aquatrack.dto.billing.BillingCycleRequest;
import com.aquatrack.dto.billing.WaterPurchaseRequest;
import com.aquatrack.entity.BillingCycle;
import com.aquatrack.entity.Invoice;
import com.aquatrack.entity.WaterPurchase;
import com.aquatrack.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @PostMapping("/cycles")
    public ResponseEntity<BillingCycle> openCycle(@Valid @RequestBody BillingCycleRequest request) {
        return ResponseEntity.ok(billingService.openCycle(request));
    }

    @GetMapping("/cycles/apartment/{apartmentId}")
    public List<BillingCycle> cyclesForApartment(@PathVariable Long apartmentId) {
        return billingService.getCyclesForApartment(apartmentId);
    }

    @PostMapping("/purchases")
    public ResponseEntity<WaterPurchase> recordPurchase(@Valid @RequestBody WaterPurchaseRequest request) {
        return ResponseEntity.ok(billingService.recordPurchase(request));
    }

    @PostMapping("/cycles/{id}/finalize")
    public ResponseEntity<List<Invoice>> finalizeCycle(@PathVariable Long id) {
        return ResponseEntity.ok(billingService.finalizeCycle(id));
    }

    @PostMapping("/cycles/{id}/archive")
    public ResponseEntity<BillingCycle> archiveCycle(@PathVariable Long id) {
        return ResponseEntity.ok(billingService.archiveCycle(id));
    }
}
