package com.aquatrack.dto.usage;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class UsageLogResponse {
    private Long id;
    private Long householdId;
    private LocalDate readingDate;
    private BigDecimal readingValue;
    private BigDecimal consumptionKl;
    private String source;
}
