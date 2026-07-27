package com.aquatrack.dto.billing;

import com.aquatrack.entity.PurchaseType;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PurchaseEntryRequest {
    @NotNull private Long billingCycleId;
    @NotNull private LocalDate purchaseDate;
    @NotNull private PurchaseType purchaseType;
    @NotNull @Positive private BigDecimal volumeKl;
    @NotNull @Positive private BigDecimal unitCost;
    private String notes;
}
