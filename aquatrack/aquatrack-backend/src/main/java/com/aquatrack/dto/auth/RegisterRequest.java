package com.aquatrack.dto.auth;

import com.aquatrack.entity.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank @Size(min = 4, max = 60)
    private String username;

    @NotBlank @Email
    private String email;

    @NotBlank
    @Size(min = 8, max = 100, message = "Password must be at least 8 characters long")
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*?&#^()_\\-+=~\\[\\]{}:;<>,.?/|\\\\])[A-Za-z\\d@$!%*?&#^()_\\-+=~\\[\\]{}:;<>,.?/|\\\\]{8,}$",
        message = "Password must contain at least 8 characters, including letters, numbers, and a special character."
    )
    private String password;

    @NotBlank
    private String fullName;

    @NotNull
    private Role role;

    private Long apartmentId;
    private Long householdId;
}
