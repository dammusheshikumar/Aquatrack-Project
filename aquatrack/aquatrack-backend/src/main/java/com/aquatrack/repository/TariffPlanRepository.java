package com.aquatrack.repository;

import com.aquatrack.entity.TariffPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TariffPlanRepository extends JpaRepository<TariffPlan, Long> {
    List<TariffPlan> findByApartmentIdOrderByCreatedAtDesc(Long apartmentId);
}
