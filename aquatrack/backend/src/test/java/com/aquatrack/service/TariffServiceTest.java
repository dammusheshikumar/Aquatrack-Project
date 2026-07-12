package com.aquatrack.service;

import com.aquatrack.entity.TariffPlan;
import com.aquatrack.repository.ApartmentRepository;
import com.aquatrack.repository.TariffPlanRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(MockitoExtension.class)
class TariffServiceTest {

    @Mock private TariffPlanRepository tariffPlanRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @InjectMocks private TariffService tariffService;

    @Test
    void chargeWithinBaseTier_isChargedAtBaseRate() {
        TariffPlan plan = TariffPlan.builder()
                .baseRate(BigDecimal.valueOf(20))
                .baseTierLimit(BigDecimal.valueOf(10))
                .excessRate(BigDecimal.valueOf(40))
                .build();

        BigDecimal charge = tariffService.calculateCharge(plan, BigDecimal.valueOf(8));
        assertEquals(0, charge.compareTo(BigDecimal.valueOf(160))); // 8 * 20
    }

    @Test
    void chargeAboveBaseTier_splitsBaseAndExcessRates() {
        TariffPlan plan = TariffPlan.builder()
                .baseRate(BigDecimal.valueOf(20))
                .baseTierLimit(BigDecimal.valueOf(10))
                .excessRate(BigDecimal.valueOf(40))
                .build();

        // 10 kL at base rate (200) + 5 kL at excess rate (200) = 400
        BigDecimal charge = tariffService.calculateCharge(plan, BigDecimal.valueOf(15));
        assertEquals(0, charge.compareTo(BigDecimal.valueOf(400)));
    }

    @Test
    void zeroConsumption_isZeroCharge() {
        TariffPlan plan = TariffPlan.builder()
                .baseRate(BigDecimal.valueOf(20))
                .baseTierLimit(BigDecimal.valueOf(10))
                .excessRate(BigDecimal.valueOf(40))
                .build();

        BigDecimal charge = tariffService.calculateCharge(plan, BigDecimal.ZERO);
        assertEquals(0, charge.compareTo(BigDecimal.ZERO));
    }
}
