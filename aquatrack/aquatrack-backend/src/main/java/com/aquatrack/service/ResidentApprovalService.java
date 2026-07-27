package com.aquatrack.service;

import com.aquatrack.entity.ApprovalStatus;
import com.aquatrack.entity.Role;
import com.aquatrack.entity.User;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Admin-side workflow for reviewing resident self-registrations. New
 * residents (local or Google) are created PENDING and cannot log in until
 * approved here.
 */
@Service
public class ResidentApprovalService {

    private final UserRepository userRepository;
    private final EmailService emailService;

    public ResidentApprovalService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public List<User> listPending(Long apartmentId) {
        return userRepository.findByHousehold_Apartment_IdAndRoleAndApprovalStatus(
                apartmentId, Role.RESIDENT, ApprovalStatus.PENDING);
    }

    @Transactional
    public User approve(Long userId) {
        User user = getPendingResident(userId);
        user.setApprovalStatus(ApprovalStatus.APPROVED);
        User saved = userRepository.save(user);
        emailService.sendRegistrationApprovedEmail(saved);
        return saved;
    }

    @Transactional
    public void reject(Long userId) {
        User user = getPendingResident(userId);
        emailService.sendRegistrationRejectedEmail(user);
        userRepository.delete(user);
    }

    private User getPendingResident(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getRole() != Role.RESIDENT) {
            throw new BadRequestException("Only resident registrations go through this approval workflow");
        }
        if (user.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new BadRequestException("This registration has already been reviewed");
        }
        return user;
    }
}
