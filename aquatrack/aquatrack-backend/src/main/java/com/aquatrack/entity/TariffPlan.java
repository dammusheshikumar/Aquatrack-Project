package com.aquatrack.entity;

import jakarta.persistence.*;
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

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @Column(name = "plan_name", nullable = false, length = 100)
    private String planName;

    @Column(name = "base_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal baseRate;

    @Column(name = "base_tier_limit_kl", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseTierLimitKl;

    @Column(name = "excess_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal excessRate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}