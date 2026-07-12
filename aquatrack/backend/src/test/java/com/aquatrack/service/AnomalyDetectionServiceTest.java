package com.aquatrack.service;

import com.aquatrack.entity.Household;
import com.aquatrack.entity.WaterUsageLog;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AnomalyDetectionServiceTest {

    private final AnomalyDetectionService service = new AnomalyDetectionService();

    private WaterUsageLog logOf(double kl, LocalDate date) {
        return WaterUsageLog.builder()
                .household(Household.builder().id(1L).build())
                .readingDate(date)
                .consumptionKl(BigDecimal.valueOf(kl))
                .readingValue(BigDecimal.valueOf(kl))
                .build();
    }

    @Test
    void stableUsageHistory_flagsNoAnomalyForNormalReading() {
        List<WaterUsageLog> history = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            history.add(logOf(1.0, LocalDate.now().minusDays(i)));
        }
        assertFalse(service.isAnomalous(history, BigDecimal.valueOf(1.1), 2.0));
    }

    @Test
    void suddenSpike_flagsAsAnomalyBeyondTwoStdDev() {
        List<WaterUsageLog> history = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            history.add(logOf(1.0, LocalDate.now().minusDays(i)));
        }
        // A 10x spike well beyond 2 standard deviations of a near-flat 1.0 kL/day history
        assertTrue(service.isAnomalous(history, BigDecimal.valueOf(10.0), 2.0));
    }

    @Test
    void insufficientHistory_neverFlagsAnomaly() {
        List<WaterUsageLog> history = List.of(logOf(1.0, LocalDate.now()), logOf(1.0, LocalDate.now().minusDays(1)));
        assertFalse(service.isAnomalous(history, BigDecimal.valueOf(50.0), 2.0));
    }
}
