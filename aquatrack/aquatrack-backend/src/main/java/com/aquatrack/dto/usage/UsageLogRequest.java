package com.aquatrack.dto.usage;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UsageLogRequest {
    @NotNull
    private Long householdId;

    @NotNull
    private LocalDate readingDate;

    @NotNull
    @PositiveOrZero
    private BigDecimal readingValue;
}
