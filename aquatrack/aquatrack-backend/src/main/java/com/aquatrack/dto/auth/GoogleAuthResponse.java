package com.aquatrack.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response for the Google sign-in check. If a matching RESIDENT account
 * already exists, `auth` is populated and the user is logged in immediately.
 * Otherwise `accountExists` is false and the frontend collects the resident's
 * apartment + flat number to complete registration via /auth/google/register.
 */
@Data
@AllArgsConstructor
public class GoogleAuthResponse {
    private boolean accountExists;
    private AuthResponse auth;
    private String googleEmail;
    private String googleFullName;
}