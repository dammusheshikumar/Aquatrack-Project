package com.aquatrack.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

/**
 * A household enriched with its resident accounts and outstanding fines —
 * everything an admin needs to see and act on (including imposing a fine)
 * without leaving the Households tab.
 */
@Data
@AllArgsConstructor
public class HouseholdDetailResponse {
    private Long id;
    private String flatNumber;
    private BigDecimal flatSizeSqft;
    private Integer occupancy;
    private String meterSerialNumber;
    private boolean meterActive;
    private BigDecimal dailyLimitKl;
    private List<ResidentAccountResponse> residents;
    private int unpaidFineCount;
    private BigDecimal unpaidFineTotal;
}
