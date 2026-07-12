package com.aquatrack.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private String role;
    private Long userId;
    private Long householdId;
    private Long apartmentId;
    private String fullName;
}
