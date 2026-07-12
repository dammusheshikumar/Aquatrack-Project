package com.aquatrack.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tariff_plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TariffPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @NotBlank
    @Column(name = "plan_name", nullable = false, length = 100)
    private String planName;

    @NotNull
    @PositiveOrZero
    @Column(name = "base_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal baseRate;

    @NotNull
    @Positive
    @Column(name = "base_tier_limit", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseTierLimit;

    @NotNull
    @PositiveOrZero
    @Column(name = "excess_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal excessRate;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
