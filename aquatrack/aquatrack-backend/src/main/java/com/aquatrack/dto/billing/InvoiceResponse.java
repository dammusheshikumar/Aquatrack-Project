package com.aquatrack.dto.billing;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class InvoiceResponse {
    private Long id;
    private Long billingCycleId;
    private Long householdId;
    private String flatNumber;
    private BigDecimal consumptionKl;
    private BigDecimal baseCharge;
    private BigDecimal sharedAllocation;
    private BigDecimal adjustments;
    private BigDecimal total;
}