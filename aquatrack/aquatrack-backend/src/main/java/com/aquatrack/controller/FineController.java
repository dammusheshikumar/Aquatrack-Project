package com.aquatrack.controller;

import com.aquatrack.dto.admin.FineRequest;
import com.aquatrack.entity.Fine;
import com.aquatrack.entity.FineStatus;
import com.aquatrack.service.FineService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Lets an admin impose a fine directly on a household, and track its payment status. */
@RestController
@RequestMapping("/api")
public class FineController {

    private final FineService fineService;

    public FineController(FineService fineService) {
        this.fineService = fineService;
    }

    @PostMapping("/admin/fines")
    public ResponseEntity<Fine> imposeFine(@Valid @RequestBody FineRequest req, HttpServletRequest request) {
        Long adminUserId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(fineService.imposeFine(req, adminUserId));
    }

    @GetMapping("/admin/apartments/{apartmentId}/fines")
    public ResponseEntity<List<Fine>> listForApartment(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(fineService.listForApartment(apartmentId));
    }

    @GetMapping("/resident/households/{householdId}/fines")
    public ResponseEntity<List<Fine>> listForHousehold(@PathVariable Long householdId) {
        return ResponseEntity.ok(fineService.listForHousehold(householdId));
    }

    @PostMapping("/admin/fines/{id}/status")
    public ResponseEntity<Fine> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        FineStatus status = FineStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(fineService.updateStatus(id, status));
    }
}
