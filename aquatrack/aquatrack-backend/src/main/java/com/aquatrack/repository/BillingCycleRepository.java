package com.aquatrack.repository;

import com.aquatrack.entity.BillingCycle;
import com.aquatrack.entity.BillingCycleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BillingCycleRepository extends JpaRepository<BillingCycle, Long> {
    List<BillingCycle> findByApartmentIdOrderByStartDateDesc(Long apartmentId);
    Optional<BillingCycle> findByApartmentIdAndStatus(Long apartmentId, BillingCycleStatus status);
    Optional<BillingCycle> findByApartmentIdAndStartDate(Long apartmentId, LocalDate startDate);
}
