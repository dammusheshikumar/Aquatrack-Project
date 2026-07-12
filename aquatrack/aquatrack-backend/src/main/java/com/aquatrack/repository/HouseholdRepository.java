package com.aquatrack.repository;

import com.aquatrack.entity.Household;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface HouseholdRepository extends JpaRepository<Household, Long> {
    List<Household> findByApartmentId(Long apartmentId);
    Optional<Household> findByApartmentIdAndFlatNumber(Long apartmentId, String flatNumber);
}
