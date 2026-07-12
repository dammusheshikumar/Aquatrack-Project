package com.aquatrack.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "water_purchases")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WaterPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "billing_cycle_id", nullable = false)
    private BillingCycle billingCycle;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private SourceType sourceType;

    @NotNull
    @Positive
    @Column(name = "volume_kl", nullable = false, precision = 12, scale = 3)
    private BigDecimal volumeKl;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal cost;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    private String notes;

    public enum SourceType { TANKER, MUNICIPAL }
}
