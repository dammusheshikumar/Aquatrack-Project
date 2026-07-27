package com.aquatrack.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class FineRequest {
    @NotNull private Long householdId;
    @NotNull @Positive private BigDecimal amount;
    @NotBlank private String reason;
}
