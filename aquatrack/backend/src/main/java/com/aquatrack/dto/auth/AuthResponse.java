package com.aquatrack.dto.auth;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuthResponse {
    private String token;
    private Long userId;
    private String username;
    private String fullName;
    private String role;
    private Long apartmentId;
    private Long householdId;
}
