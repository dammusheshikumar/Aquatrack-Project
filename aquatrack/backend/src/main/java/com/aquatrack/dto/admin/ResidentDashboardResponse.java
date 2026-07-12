package com.aquatrack.dto.admin;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ResidentDashboardResponse {
    private String flatNumber;
    private BigDecimal currentCycleConsumptionKl;
    private BigDecimal apartmentAverageConsumptionKl;
    private BigDecimal projectedBill;
    private Map<String, BigDecimal> dailyUsageLast30Days;
    private List<String> waterSavingTips;
    private String billingCycleStatus;
}
