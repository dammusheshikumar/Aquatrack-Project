package com.aquatrack.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Returned instead of AuthResponse when a new RESIDENT registers: no token
 * is issued because the account is pending admin approval.
 */
@Data
@AllArgsConstructor
public class RegisterResponse {
    private boolean pendingApproval;
    private String message;
    private AuthResponse auth; // populated only when no approval was required (e.g. ADMIN)
}
