package com.aquatrack.dto.usage;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsageLogResponse {
    private Long id;
    private Long householdId;
    private LocalDate readingDate;
    private BigDecimal readingValue;
    private BigDecimal consumptionKl;
    private String source;
}
