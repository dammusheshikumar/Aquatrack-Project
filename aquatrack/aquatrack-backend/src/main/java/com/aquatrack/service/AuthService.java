package com.aquatrack.service;

import com.aquatrack.config.JwtUtil;
import com.aquatrack.dto.auth.AuthResponse;
import com.aquatrack.dto.auth.LoginRequest;
import com.aquatrack.dto.auth.RegisterRequest;
import com.aquatrack.dto.auth.RegisterResponse;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.ApprovalStatus;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.Role;
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

    public AuthService(UserRepository userRepository, HouseholdRepository householdRepository,
                        ApartmentRepository apartmentRepository, PasswordEncoder passwordEncoder,
                        AuthenticationManager authenticationManager, JwtUtil jwtUtil, EmailService emailService) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.apartmentRepository = apartmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    /**
     * SUPER_ADMIN accounts are created APPROVED and get a token immediately.
     * ADMIN (Apartment Admin) and RESIDENT accounts start PENDING — no token is issued
     * until approved by Super Admin / Apartment Admin respectively.
     */
    private static final String PASSWORD_PATTERN =
            "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*?&#^()_\\-+=~\\[\\]{}:;<>,.?/|\\\\])[A-Za-z\\d@$!%*?&#^()_\\-+=~\\[\\]{}:;<>,.?/|\\\\]{8,}$";

    private void validatePassword(String password) {
        if (password == null || !password.matches(PASSWORD_PATTERN)) {
            throw new BadRequestException("Password must be at least 8 characters long and contain letters, numbers, and at least one special character.");
        }
    }

    public RegisterResponse register(RegisterRequest req) {
        validatePassword(req.getPassword());
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("Username already taken");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        Role role = req.getRole() != null ? req.getRole() : Role.RESIDENT;
        boolean isSuperAdmin = role == Role.SUPER_ADMIN;

        User.UserBuilder builder = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .role(role)
                .enabled(true)
                .approvalStatus(isSuperAdmin ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING);

        if (role == Role.ADMIN) {
            if (req.getApartmentId() != null) {
                Apartment apt = apartmentRepository.findById(req.getApartmentId())
                        .orElseThrow(() -> new BadRequestException("Apartment not found"));
                builder.apartment(apt);
            }
        } else if (role == Role.RESIDENT) {
            if (req.getHouseholdId() == null) {
                throw new BadRequestException("householdId is required for RESIDENT registration");
            }
            Household household = householdRepository.findById(req.getHouseholdId())
                    .orElseThrow(() -> new BadRequestException("Household not found"));
            builder.household(household);
        }

        User saved = userRepository.save(builder.build());

        if (isSuperAdmin) {
            String token = jwtUtil.generateToken(saved.getUsername(), saved.getRole().name(), saved.getId());
            AuthResponse auth = new AuthResponse(token, saved.getUsername(), saved.getRole().name(), saved.getId(),
                    null, saved.getApartment() != null ? saved.getApartment().getId() : null, saved.getFullName());
            return new RegisterResponse(false, "Super Admin account created.", auth);
        }

        String pendingMsg = role == Role.ADMIN
                ? "Your Apartment Admin registration has been submitted successfully! Your account is pending approval from the Super Admin. You will be able to log in once approved."
                : "Your registration has been submitted successfully! Your account is pending approval from your Apartment Admin. You will be able to log in once approved.";

        try {
            emailService.sendRegistrationPendingEmail(saved);
        } catch (Exception ignored) {}

        return new RegisterResponse(true, pendingMsg, null);
    }

    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));

        enforceApproval(user);

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());

        Long apartmentId = user.getApartment() != null ? user.getApartment().getId() :
                (user.getHousehold() != null ? user.getHousehold().getApartment().getId() : null);

        return new AuthResponse(token, user.getUsername(), user.getRole().name(), user.getId(),
                user.getHousehold() != null ? user.getHousehold().getId() : null,
                apartmentId, user.getFullName());
    }

    /** Enforces approval gate for both Resident and Apartment Admin accounts. */
    void enforceApproval(User user) {
        if ((user.getRole() == Role.RESIDENT || user.getRole() == Role.ADMIN) && user.getApprovalStatus() != ApprovalStatus.APPROVED) {
            if (user.getApprovalStatus() == ApprovalStatus.PENDING) {
                throw new BadRequestException(
                        "Your registration is still pending approval. You'll be able to log in once approved.");
            }
            throw new BadRequestException(
                    "Your registration was not approved. Contact your administrator for details.");
        }
    }
}
