package com.aquatrack.dto.auth;

import com.aquatrack.entity.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    @Size(min = 4, max = 60)
    private String username;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6)
    private String password;

    @NotBlank
    private String fullName;

    @NotNull
    private Role role;

    private Long apartmentId;

    private Long householdId;
}
