package com.aquatrack.dto.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class InvoiceAdjustmentRequest {
    @NotNull private BigDecimal amount; // positive = charge more, negative = credit
    @NotBlank private String reason;
}
