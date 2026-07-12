package com.aquatrack.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices", uniqueConstraints = @UniqueConstraint(columnNames = {"billing_cycle_id", "household_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "billing_cycle_id", nullable = false)
    private BillingCycle billingCycle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @Column(name = "metered_consumption_kl", nullable = false, precision = 10, scale = 3)
    private BigDecimal meteredConsumptionKl;

    @Column(name = "base_charge", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseCharge;

    @Builder.Default
    @Column(name = "shared_allocation", nullable = false, precision = 12, scale = 2)
    private BigDecimal sharedAllocation = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "adjustments", nullable = false, precision = 12, scale = 2)
    private BigDecimal adjustments = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private Status status = Status.ISSUED;

    @Column(name = "generated_at", updatable = false)
    private LocalDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
        this.generatedAt = LocalDateTime.now();
    }

    public enum Status { ISSUED, PAID }
}
