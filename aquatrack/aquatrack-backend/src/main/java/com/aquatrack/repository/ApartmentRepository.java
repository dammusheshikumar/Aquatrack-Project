package com.aquatrack.repository;

import com.aquatrack.entity.Apartment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
    Optional<Apartment> findByName(String name);
}
