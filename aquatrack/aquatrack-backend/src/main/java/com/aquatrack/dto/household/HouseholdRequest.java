package com.aquatrack.dto.household;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class HouseholdRequest {
    @NotNull
    private Long apartmentId;

    @NotBlank
    private String flatNumber;

    @NotNull
    @Positive
    private BigDecimal flatSizeSqft;

    @NotNull
    @Positive
    private Integer occupancy;

    private String meterSerialNumber;
}
