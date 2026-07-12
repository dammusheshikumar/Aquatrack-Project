package com.aquatrack.service;

import com.aquatrack.dto.auth.AuthResponse;
import com.aquatrack.dto.auth.LoginRequest;
import com.aquatrack.dto.auth.RegisterRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.User;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.ApartmentRepository;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.UserRepository;
import com.aquatrack.security.CustomUserDetails;
import com.aquatrack.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("Username already taken");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User.Role role;
        try {
            role = User.Role.valueOf(req.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Role must be ADMIN or RESIDENT");
        }

        User.UserBuilder userBuilder = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .role(role);

        Apartment apartment;
        Household household = null;

        if (role == User.Role.ADMIN) {
            if (req.getApartmentName() == null || req.getApartmentAddress() == null) {
                throw new BadRequestException("apartmentName and apartmentAddress are required for admin registration");
            }
            apartment = apartmentRepository.save(Apartment.builder()
                    .name(req.getApartmentName())
                    .address(req.getApartmentAddress())
                    .build());
            userBuilder.apartment(apartment);
        } else {
            if (req.getApartmentId() == null || req.getFlatNumber() == null) {
                throw new BadRequestException("apartmentId and flatNumber are required for resident registration");
            }
            apartment = apartmentRepository.findById(req.getApartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Apartment not found"));

            if (householdRepository.existsByApartmentIdAndFlatNumber(apartment.getId(), req.getFlatNumber())) {
                throw new BadRequestException("This flat is already registered");
            }

            household = householdRepository.save(Household.builder()
                    .apartment(apartment)
                    .flatNumber(req.getFlatNumber())
                    .flatSizeSqft(BigDecimal.valueOf(req.getFlatSizeSqft() != null ? req.getFlatSizeSqft() : 600))
                    .occupancy(req.getOccupancy() != null ? req.getOccupancy() : 1)
                    .hasWorkingMeter(true)
                    .build());

            userBuilder.apartment(apartment).household(household);
        }

        User saved = userRepository.save(userBuilder.build());
        String token = jwtUtil.generateToken(saved.getUsername(), saved.getRole().name(), saved.getId());

        return AuthResponse.builder()
                .token(token)
                .userId(saved.getId())
                .username(saved.getUsername())
                .fullName(saved.getFullName())
                .role(saved.getRole().name())
                .apartmentId(apartment.getId())
                .householdId(household != null ? household.getId() : null)
                .build();
    }

    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .apartmentId(user.getApartment() != null ? user.getApartment().getId() : null)
                .householdId(user.getHousehold() != null ? user.getHousehold().getId() : null)
                .build();
    }
}
