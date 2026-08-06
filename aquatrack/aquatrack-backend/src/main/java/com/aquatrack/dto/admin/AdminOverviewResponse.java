package com.aquatrack.dto.admin;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdminOverviewResponse {
    private long totalApartments;
    private long totalHouseholds;
    private long activeAlerts;
    private BigDecimal averageDailyUsageKl;
    private Map<String, BigDecimal> monthlyConsumptionByHousehold;
    private List<AlertSummary> recentAlerts;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AlertSummary {
        private Long id;
        private String flatNumber;
        private String alertType;
        private String severity;
        private String message;
        private String createdAt;
    }
}
