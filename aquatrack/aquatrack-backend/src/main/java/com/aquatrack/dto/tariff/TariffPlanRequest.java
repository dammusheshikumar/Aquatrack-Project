package com.aquatrack.dto.tariff;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class TariffPlanRequest {
    @NotNull
    private Long apartmentId;

    @NotBlank
    private String planName;

    @NotNull
    @Positive
    private BigDecimal baseRate;

    @NotNull
    @Positive
    private BigDecimal baseTierLimitKl;

    @NotNull
    @Positive
    private BigDecimal excessRate;
}