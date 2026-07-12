package com.aquatrack.controller;

import com.aquatrack.entity.Household;
import com.aquatrack.service.HouseholdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/households")
@RequiredArgsConstructor
public class HouseholdController {

    private final HouseholdService householdService;

    @GetMapping("/apartment/{apartmentId}")
    public List<Household> byApartment(@PathVariable Long apartmentId) {
        return householdService.findByApartment(apartmentId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Household> get(@PathVariable Long id) {
        return ResponseEntity.ok(householdService.findById(id));
    }

    @PostMapping
    public ResponseEntity<Household> create(@RequestBody Map<String, Object> body) {
        Long apartmentId = Long.valueOf(body.get("apartmentId").toString());
        String flatNumber = body.get("flatNumber").toString();
        Double flatSize = Double.valueOf(body.get("flatSizeSqft").toString());
        Integer occupancy = Integer.valueOf(body.get("occupancy").toString());
        String meterSerial = body.getOrDefault("meterSerialNumber", "").toString();
        return ResponseEntity.ok(householdService.create(apartmentId, flatNumber, flatSize, occupancy, meterSerial));
    }

    @PatchMapping("/{id}/meter-status")
    public ResponseEntity<Household> updateMeterStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(householdService.updateMeterStatus(id, body.get("hasWorkingMeter")));
    }
}
