package com.aquatrack.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GoogleRegisterRequest {
    @NotBlank
    private String idToken;

    @NotNull
    private Long apartmentId;

    @NotBlank
    private String flatNumber;
}