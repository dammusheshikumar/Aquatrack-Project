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

@Service
public class ResidentApprovalService {

    private final UserRepository userRepository;
    private final EmailService emailService;

    public ResidentApprovalService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public List<User> listPending(Long apartmentId) {
        List<User> residents = userRepository.findByHousehold_Apartment_IdAndRoleAndApprovalStatus(
                apartmentId, Role.RESIDENT, ApprovalStatus.PENDING);
        List<User> admins = userRepository.findByApartmentIdAndRoleAndApprovalStatus(
                apartmentId, Role.ADMIN, ApprovalStatus.PENDING);
        residents.addAll(admins);
        return residents;
    }

    public List<User> listPendingAdmins() {
        return userRepository.findByRoleAndApprovalStatus(Role.ADMIN, ApprovalStatus.PENDING);
    }

    @Transactional
    public User approve(Long userId) {
        User user = getPendingUser(userId);
        user.setApprovalStatus(ApprovalStatus.APPROVED);
        User saved = userRepository.save(user);
        try {
            emailService.sendRegistrationApprovedEmail(saved);
        } catch (Exception ignored) {}
        return saved;
    }

    @Transactional
    public void reject(Long userId) {
        User user = getPendingUser(userId);
        try {
            emailService.sendRegistrationRejectedEmail(user);
        } catch (Exception ignored) {}
        userRepository.delete(user);
    }

    private User getPendingUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new BadRequestException("This registration has already been reviewed");
        }
        return user;
    }
}
