package com.aquatrack.controller;

import com.aquatrack.entity.User;
import com.aquatrack.service.ResidentApprovalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class ResidentApprovalController {

    private final ResidentApprovalService residentApprovalService;

    public ResidentApprovalController(ResidentApprovalService residentApprovalService) {
        this.residentApprovalService = residentApprovalService;
    }

    @GetMapping("/apartments/{apartmentId}/pending-residents")
    public ResponseEntity<List<User>> listPending(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(residentApprovalService.listPending(apartmentId));
    }

    @GetMapping("/pending-admins")
    public ResponseEntity<List<User>> listPendingAdmins() {
        return ResponseEntity.ok(residentApprovalService.listPendingAdmins());
    }

    @PostMapping("/residents/{userId}/approve")
    public ResponseEntity<User> approve(@PathVariable Long userId) {
        return ResponseEntity.ok(residentApprovalService.approve(userId));
    }

    @PostMapping("/residents/{userId}/reject")
    public ResponseEntity<Void> reject(@PathVariable Long userId) {
        residentApprovalService.reject(userId);
        return ResponseEntity.noContent().build();
    }
}
