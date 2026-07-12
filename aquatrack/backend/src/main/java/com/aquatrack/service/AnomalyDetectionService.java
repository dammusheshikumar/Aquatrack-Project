package com.aquatrack.service;

import com.aquatrack.entity.WaterUsageLog;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.List;

/**
 * Simple statistical outlier detection used as the leak-detection rule:
 * flag a reading as anomalous if it exceeds the household's rolling average
 * by more than N standard deviations (default 2-sigma).
 */
@Service
public class AnomalyDetectionService {

    public boolean isAnomalous(List<WaterUsageLog> history, BigDecimal latestConsumption, double stdDevMultiplier) {
        if (history.size() < 5) {
            return false; // not enough history for a meaningful standard deviation
        }
        double mean = mean(history);
        double stdDev = standardDeviation(history, mean);
        if (stdDev == 0) {
            return false;
        }
        double threshold = mean + (stdDevMultiplier * stdDev);
        return latestConsumption.doubleValue() > threshold;
    }

    public double mean(List<WaterUsageLog> history) {
        return history.stream()
                .mapToDouble(l -> l.getConsumptionKl().doubleValue())
                .average().orElse(0.0);
    }

    public double standardDeviation(List<WaterUsageLog> history, double mean) {
        double variance = history.stream()
                .mapToDouble(l -> Math.pow(l.getConsumptionKl().doubleValue() - mean, 2))
                .average().orElse(0.0);
        return Math.sqrt(variance);
    }

    public BigDecimal meanAsBigDecimal(List<WaterUsageLog> history) {
        return BigDecimal.valueOf(mean(history)).round(new MathContext(6));
    }
}
