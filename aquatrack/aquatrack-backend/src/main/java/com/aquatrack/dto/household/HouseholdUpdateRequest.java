package com.aquatrack.dto.household;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class HouseholdUpdateRequest {
    @NotNull @Positive
    private BigDecimal flatSizeSqft;

    @NotNull @Positive
    private Integer occupancy;

    private String meterSerialNumber;
    private Boolean meterActive;

    /** Null clears any override and falls back to "no daily-limit alert" for this household. */
    private BigDecimal dailyLimitKl;
}
