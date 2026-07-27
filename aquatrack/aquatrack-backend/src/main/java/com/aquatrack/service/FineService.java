package com.aquatrack.service;

import com.aquatrack.dto.admin.FineRequest;
import com.aquatrack.entity.*;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.AlertRepository;
import com.aquatrack.repository.FineRepository;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lets an admin impose a fine directly on a household (e.g. for repeated
 * overuse, a policy violation, or unresolved leak reports). Every fine also
 * raises a FINE_IMPOSED alert, so it surfaces in the resident's alert feed
 * and triggers the same email notification pipeline as usage alerts.
 */
@Service
public class FineService {

    private final FineRepository fineRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final AlertRepository alertRepository;
    private final EmailService emailService;

    public FineService(FineRepository fineRepository, HouseholdRepository householdRepository,
                        UserRepository userRepository, AlertRepository alertRepository, EmailService emailService) {
        this.fineRepository = fineRepository;
        this.householdRepository = householdRepository;
        this.userRepository = userRepository;
        this.alertRepository = alertRepository;
        this.emailService = emailService;
    }

    @Transactional
    public Fine imposeFine(FineRequest req, Long adminUserId) {
        Household household = householdRepository.findById(req.getHouseholdId())
                .orElseThrow(() -> new ResourceNotFoundException("Household not found: " + req.getHouseholdId()));

        User admin = adminUserId != null ? userRepository.findById(adminUserId).orElse(null) : null;

        Fine fine = Fine.builder()
                .household(household)
                .amount(req.getAmount())
                .reason(req.getReason())
                .status(FineStatus.UNPAID)
                .imposedByAdmin(admin)
                .build();
        fine = fineRepository.save(fine);

        Alert alert = Alert.builder()
                .household(household)
                .alertType(AlertType.FINE_IMPOSED)
                .severity(AlertSeverity.WARNING)
                .message("A fine of Rs. " + req.getAmount() + " has been applied to your household. Reason: " + req.getReason())
                .resolved(false)
                .build();
        alertRepository.save(alert);
        emailService.sendAlertEmail(alert);

        return fine;
    }

    public List<Fine> listForHousehold(Long householdId) {
        return fineRepository.findByHouseholdIdOrderByCreatedAtDesc(householdId);
    }

    public List<Fine> listForApartment(Long apartmentId) {
        return fineRepository.findByHousehold_Apartment_IdOrderByCreatedAtDesc(apartmentId);
    }

    @Transactional
    public Fine updateStatus(Long fineId, FineStatus status) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(() -> new ResourceNotFoundException("Fine not found: " + fineId));
        if (fine.getStatus() != FineStatus.UNPAID) {
            throw new BadRequestException("This fine has already been resolved");
        }
        fine.setStatus(status);
        fine.setResolvedAt(java.time.LocalDateTime.now());
        return fineRepository.save(fine);
    }
}
