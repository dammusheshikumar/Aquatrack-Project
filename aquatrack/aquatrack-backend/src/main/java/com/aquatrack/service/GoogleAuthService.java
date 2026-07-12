package com.aquatrack.service;

import com.aquatrack.config.JwtUtil;
import com.aquatrack.dto.auth.AuthResponse;
import com.aquatrack.dto.auth.GoogleAuthResponse;
import com.aquatrack.dto.auth.GoogleRegisterRequest;
import com.aquatrack.entity.AuthProvider;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.Role;
import com.aquatrack.entity.User;
import com.aquatrack.exception.BadRequestException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.GeneralSecurityException;
import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

/**
 * Handles "Sign in with Google" for residents only. Admins never authenticate
 * via Google — a Google email that matches an ADMIN account is rejected.
 *
 * The frontend uses Google Identity Services to obtain an ID token client-side;
 * this service verifies that token's signature and audience against Google's
 * public keys before trusting any claim inside it.
 */
@Service
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final GoogleIdTokenVerifier verifier;

    public GoogleAuthService(UserRepository userRepository, HouseholdRepository householdRepository,
                              PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
                              @Value("${aquatrack.google.client-id}") String googleClientId) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    @Transactional
    public GoogleAuthResponse login(String idToken) {
        GoogleIdToken.Payload payload = verify(idToken);
        String email = payload.getEmail();
        String fullName = (String) payload.get("name");

        return userRepository.findByEmail(email)
                .map(user -> {
                    if (user.getRole() != Role.RESIDENT) {
                        throw new BadRequestException(
                                "This email is registered as an apartment admin. Google sign-in is available for residents only.");
                    }
                    return new GoogleAuthResponse(true, issueAuth(user), null, null);
                })
                .orElseGet(() -> new GoogleAuthResponse(false, null, email, fullName));
    }

    @Transactional
    public AuthResponse register(GoogleRegisterRequest req) {
        GoogleIdToken.Payload payload = verify(req.getIdToken());
        String email = payload.getEmail();
        String fullName = (String) payload.get("name");

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this Google email already exists. Try signing in instead.");
        }

        Household household = householdRepository.findByApartmentIdAndFlatNumber(req.getApartmentId(), req.getFlatNumber())
                .orElseThrow(() -> new BadRequestException(
                        "No household found for flat '" + req.getFlatNumber() + "' in this apartment. Ask your admin to register it first."));

        String username = deriveUniqueUsername(email);

        User user = User.builder()
                .username(username)
                .email(email)
                .fullName(fullName != null ? fullName : email)
                // Google accounts never log in with a password; store a random,
                // never-disclosed hash purely to satisfy the NOT NULL column.
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.RESIDENT)
                .authProvider(AuthProvider.GOOGLE)
                .household(household)
                .enabled(true)
                .build();

        User saved = userRepository.save(user);
        return issueAuth(saved);
    }

    private GoogleIdToken.Payload verify(String idToken) {
        try {
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                throw new BadRequestException("Invalid or expired Google sign-in token. Please try again.");
            }
            return token.getPayload();
        } catch (GeneralSecurityException | IOException e) {
            throw new BadRequestException("Could not verify Google sign-in token: " + e.getMessage());
        }
    }

    private String deriveUniqueUsername(String email) {
        String base = email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9._-]", "");
        if (base.length() < 4) base = base + "user";
        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }

    private AuthResponse issueAuth(User user) {
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());
        Long apartmentId = user.getApartment() != null ? user.getApartment().getId() :
                (user.getHousehold() != null ? user.getHousehold().getApartment().getId() : null);

        return new AuthResponse(token, user.getUsername(), user.getRole().name(), user.getId(),
                user.getHousehold() != null ? user.getHousehold().getId() : null,
                apartmentId, user.getFullName());
    }
}