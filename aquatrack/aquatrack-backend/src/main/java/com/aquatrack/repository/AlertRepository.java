package com.aquatrack.repository;

import com.aquatrack.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByHouseholdIdOrderByCreatedAtDesc(Long householdId);
    List<Alert> findByResolvedFalseOrderByCreatedAtDesc();
    List<Alert> findByHousehold_Apartment_IdAndResolvedFalseOrderByCreatedAtDesc(Long apartmentId);
}
