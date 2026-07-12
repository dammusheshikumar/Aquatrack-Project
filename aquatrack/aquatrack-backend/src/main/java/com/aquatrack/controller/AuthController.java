package com.aquatrack.controller;

import com.aquatrack.dto.auth.AuthResponse;
import com.aquatrack.dto.auth.GoogleAuthResponse;
import com.aquatrack.dto.auth.GoogleLoginRequest;
import com.aquatrack.dto.auth.GoogleRegisterRequest;
import com.aquatrack.dto.auth.LoginRequest;
import com.aquatrack.dto.auth.RegisterRequest;
import com.aquatrack.service.AuthService;
import com.aquatrack.service.GoogleAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;

    public AuthController(AuthService authService, GoogleAuthService googleAuthService) {
        this.authService = authService;
        this.googleAuthService = googleAuthService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    /**
     * Resident-only Google sign-in. If a resident account already exists for
     * the verified Google email, logs in immediately. Otherwise returns
     * accountExists=false with the Google email/name so the frontend can
     * collect apartment + flat number and call /auth/google/register.
     */
    @PostMapping("/google/login")
    public ResponseEntity<GoogleAuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest req) {
        return ResponseEntity.ok(googleAuthService.login(req.getIdToken()));
    }

    @PostMapping("/google/register")
    public ResponseEntity<AuthResponse> googleRegister(@Valid @RequestBody GoogleRegisterRequest req) {
        return ResponseEntity.ok(googleAuthService.register(req));
    }
}