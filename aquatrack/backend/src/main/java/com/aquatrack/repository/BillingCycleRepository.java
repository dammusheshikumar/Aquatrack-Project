package com.aquatrack.repository;

import com.aquatrack.entity.BillingCycle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BillingCycleRepository extends JpaRepository<BillingCycle, Long> {
    List<BillingCycle> findByApartmentIdOrderByStartDateDesc(Long apartmentId);
    Optional<BillingCycle> findByApartmentIdAndStatus(Long apartmentId, BillingCycle.Status status);
}
