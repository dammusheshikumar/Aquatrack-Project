package com.aquatrack.dto.billing;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceResponse {
    private Long id;
    private Long billingCycleId;
    private Long householdId;
    private String flatNumber;
    private BigDecimal meteredConsumptionKl;
    private BigDecimal baseCharge;
    private BigDecimal sharedAllocation;
    private BigDecimal adjustments;
    private BigDecimal total;
    private String status;
    private LocalDateTime generatedAt;
}
