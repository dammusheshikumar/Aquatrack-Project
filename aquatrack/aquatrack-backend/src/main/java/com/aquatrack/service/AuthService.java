package com.aquatrack.service;

import com.aquatrack.config.JwtUtil;
import com.aquatrack.dto.auth.AuthResponse;
import com.aquatrack.dto.auth.LoginRequest;
import com.aquatrack.dto.auth.RegisterRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.User;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.repository.ApartmentRepository;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final ApartmentRepository apartmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository,
                       HouseholdRepository householdRepository,
                       ApartmentRepository apartmentRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtUtil jwtUtil,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.apartmentRepository = apartmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("Username already taken");
        }

        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User.UserBuilder builder = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .role(req.getRole())
                .enabled(true);

        if (req.getRole().name().equals("ADMIN")) {
            if (req.getApartmentId() != null) {
                Apartment apt = apartmentRepository.findById(req.getApartmentId())
                        .orElseThrow(() -> new BadRequestException("Apartment not found"));
                builder.apartment(apt);
            }
        } else {
            if (req.getHouseholdId() == null) {
                throw new BadRequestException("householdId is required for RESIDENT registration");
            }

            Household household = householdRepository.findById(req.getHouseholdId())
                    .orElseThrow(() -> new BadRequestException("Household not found"));

            builder.household(household);
        }

        User saved = userRepository.save(builder.build());

        String token = jwtUtil.generateToken(
                saved.getUsername(),
                saved.getRole().name(),
                saved.getId()
        );

        return new AuthResponse(
                token,
                saved.getUsername(),
                saved.getRole().name(),
                saved.getId(),
                saved.getHousehold() != null ? saved.getHousehold().getId() : null,
                saved.getApartment() != null
                        ? saved.getApartment().getId()
                        : (saved.getHousehold() != null
                                ? saved.getHousehold().getApartment().getId()
                                : null),
                saved.getFullName()
        );
    }

    public AuthResponse login(LoginRequest req) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        req.getUsername(),
                        req.getPassword()
                )
        );

        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));

        // Send login notification email
        if (user.getRole().name().equals("RESIDENT")) {
            emailService.sendLoginNotification(user);
        }

        String token = jwtUtil.generateToken(
                user.getUsername(),
                user.getRole().name(),
                user.getId()
        );

        Long apartmentId = user.getApartment() != null
                ? user.getApartment().getId()
                : (user.getHousehold() != null
                        ? user.getHousehold().getApartment().getId()
                        : null);

        return new AuthResponse(
                token,
                user.getUsername(),
                user.getRole().name(),
                user.getId(),
                user.getHousehold() != null ? user.getHousehold().getId() : null,
                apartmentId,
                user.getFullName()
        );
    }
}