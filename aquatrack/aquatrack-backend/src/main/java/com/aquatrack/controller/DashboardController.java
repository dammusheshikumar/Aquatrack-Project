package com.aquatrack.controller;

import com.aquatrack.entity.Household;
import com.aquatrack.entity.WaterUsageLog;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.service.UsageLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Aggregated read endpoints for the React dashboards: all-household usage
 * comparison for the admin panel, and peer-benchmarking comparison for
 * residents (own usage vs apartment average / similar-sized households).
 */
@RestController
@RequestMapping("/api")
public class DashboardController {

    private final HouseholdRepository householdRepository;
    private final UsageLogService usageLogService;

    public DashboardController(HouseholdRepository householdRepository, UsageLogService usageLogService) {
        this.householdRepository = householdRepository;
        this.usageLogService = usageLogService;
    }

    @GetMapping("/admin/apartments/{apartmentId}/usage-comparison")
    public ResponseEntity<List<Map<String, Object>>> usageComparison(@PathVariable Long apartmentId) {
        List<Household> households = householdRepository.findByApartmentId(apartmentId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Household h : households) {
            List<WaterUsageLog> recent = usageLogService.getRecent(h.getId());
            BigDecimal total = recent.stream()
                    .map(WaterUsageLog::getConsumptionKl)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> row = new HashMap<>();
            row.put("householdId", h.getId());
            row.put("flatNumber", h.getFlatNumber());
            row.put("totalConsumptionKl", total);
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/resident/households/{householdId}/peer-comparison")
    public ResponseEntity<Map<String, Object>> peerComparison(@PathVariable Long householdId) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new com.aquatrack.exception.ResourceNotFoundException("Household not found"));

        List<Household> peers = householdRepository.findByApartmentId(household.getApartment().getId());

        BigDecimal myTotal = sumRecent(householdId);

        BigDecimal apartmentTotal = BigDecimal.ZERO;
        BigDecimal similarSizedTotal = BigDecimal.ZERO;
        int similarSizedCount = 0;

        BigDecimal sizeLowerBound = household.getFlatSizeSqft().multiply(BigDecimal.valueOf(0.85));
        BigDecimal sizeUpperBound = household.getFlatSizeSqft().multiply(BigDecimal.valueOf(1.15));

        for (Household peer : peers) {
            BigDecimal peerTotal = sumRecent(peer.getId());
            apartmentTotal = apartmentTotal.add(peerTotal);

            if (peer.getFlatSizeSqft().compareTo(sizeLowerBound) >= 0 &&
                    peer.getFlatSizeSqft().compareTo(sizeUpperBound) <= 0) {
                similarSizedTotal = similarSizedTotal.add(peerTotal);
                similarSizedCount++;
            }
        }

        BigDecimal apartmentAverage = peers.isEmpty() ? BigDecimal.ZERO :
                apartmentTotal.divide(BigDecimal.valueOf(peers.size()), 3, RoundingMode.HALF_UP);
        BigDecimal similarSizedAverage = similarSizedCount == 0 ? BigDecimal.ZERO :
                similarSizedTotal.divide(BigDecimal.valueOf(similarSizedCount), 3, RoundingMode.HALF_UP);

        Map<String, Object> result = new HashMap<>();
        result.put("myConsumptionKl", myTotal);
        result.put("apartmentAverageKl", apartmentAverage);
        result.put("similarSizedAverageKl", similarSizedAverage);
        result.put("similarSizedHouseholdCount", similarSizedCount);
        return ResponseEntity.ok(result);
    }

    private BigDecimal sumRecent(Long householdId) {
        return usageLogService.getRecent(householdId).stream()
                .map(WaterUsageLog::getConsumptionKl)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
