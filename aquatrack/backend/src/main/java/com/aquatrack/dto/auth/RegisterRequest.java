package com.aquatrack.dto.auth;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegisterRequest {
    @NotBlank private String username;
    @NotBlank @Email private String email;
    @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") private String password;
    @NotBlank private String fullName;
    @NotBlank private String role; // ADMIN or RESIDENT

    // Required for ADMIN: creates a new apartment
    private String apartmentName;
    private String apartmentAddress;

    // Required for RESIDENT: joins an existing apartment + household
    private Long apartmentId;
    private String flatNumber;
    private Double flatSizeSqft;
    private Integer occupancy;
}
