package com.aquatrack.repository;

import com.aquatrack.entity.WaterUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WaterUsageLogRepository extends JpaRepository<WaterUsageLog, Long> {
    List<WaterUsageLog> findByHouseholdIdOrderByReadingDateAsc(Long householdId);
    List<WaterUsageLog> findByHouseholdIdAndReadingDateBetweenOrderByReadingDateAsc(
            Long householdId, LocalDate start, LocalDate end);
    Optional<WaterUsageLog> findByHouseholdIdAndReadingDate(Long householdId, LocalDate readingDate);
    boolean existsByHouseholdIdAndReadingDate(Long householdId, LocalDate readingDate);
    List<WaterUsageLog> findTop30ByHouseholdIdOrderByReadingDateDesc(Long householdId);
}
