package com.aquatrack.dto.usage;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsageLogRequest {
    @NotNull private Long householdId;
    @NotNull private LocalDate readingDate;
    @NotNull @PositiveOrZero private Double readingValue;
}
