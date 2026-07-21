package com.aquatrack.repository;

import com.aquatrack.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByHouseholdIdOrderByCreatedAtDesc(Long householdId);
    List<Invoice> findByBillingCycleId(Long billingCycleId);
    Optional<Invoice> findByBillingCycleIdAndHouseholdId(Long billingCycleId, Long householdId);
}