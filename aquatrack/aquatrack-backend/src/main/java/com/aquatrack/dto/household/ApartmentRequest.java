package com.aquatrack.dto.household;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApartmentRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String address;
}
