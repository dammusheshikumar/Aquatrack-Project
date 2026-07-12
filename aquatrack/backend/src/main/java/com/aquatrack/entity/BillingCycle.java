package com.aquatrack.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "billing_cycles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BillingCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private Status status = Status.OPEN;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Builder.Default
    @Column(name = "total_purchased_volume_kl", nullable = false, precision = 12, scale = 3)
    private BigDecimal totalPurchasedVolumeKl = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_purchase_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPurchaseCost = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "unit_cost", nullable = false, precision = 10, scale = 4)
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public enum Status { OPEN, FINALIZED, ARCHIVED }
}
