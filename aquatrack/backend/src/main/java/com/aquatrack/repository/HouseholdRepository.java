package com.aquatrack.repository;

import com.aquatrack.entity.Household;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HouseholdRepository extends JpaRepository<Household, Long> {
    List<Household> findByApartmentId(Long apartmentId);
    boolean existsByApartmentIdAndFlatNumber(Long apartmentId, String flatNumber);
}
