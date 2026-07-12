package com.aquatrack.repository;

import com.aquatrack.entity.WaterPurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WaterPurchaseRepository extends JpaRepository<WaterPurchase, Long> {
    List<WaterPurchase> findByBillingCycleId(Long billingCycleId);
}
