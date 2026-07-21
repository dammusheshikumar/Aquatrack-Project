package com.aquatrack.dto.billing;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class PurchaseEntryRequest {
    @NotNull
    private Long billingCycleId;

    @NotNull
    @Positive
    private BigDecimal purchasedVolumeKl;

    @NotNull
    @Positive
    private BigDecimal unitCost;
}