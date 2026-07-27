package com.aquatrack.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GoogleAuthResponse {
    private boolean accountExists;
    private boolean pendingApproval;
    private AuthResponse auth;
    private String googleEmail;
    private String googleFullName;
}
