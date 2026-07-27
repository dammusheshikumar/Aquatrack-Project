package com.aquatrack.dto.tariff;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class TariffTierRequest {
    /** Null only allowed on the last tier in the list = unlimited. Validated in TariffService. */
    private BigDecimal upToKl;

    @NotNull @Positive
    private BigDecimal rate;
}
