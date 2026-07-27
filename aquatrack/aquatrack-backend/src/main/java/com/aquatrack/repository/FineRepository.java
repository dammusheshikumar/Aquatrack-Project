package com.aquatrack.repository;

import com.aquatrack.entity.Fine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FineRepository extends JpaRepository<Fine, Long> {
    List<Fine> findByHouseholdIdOrderByCreatedAtDesc(Long householdId);
    List<Fine> findByHousehold_Apartment_IdOrderByCreatedAtDesc(Long apartmentId);
}
