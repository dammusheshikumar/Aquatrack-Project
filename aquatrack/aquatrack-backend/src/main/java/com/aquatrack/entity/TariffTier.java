package com.aquatrack.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * One rate band within a tiered tariff plan, e.g. "0-10 kL at Rs.20/kL".
 * A plan holds an ordered list of tiers; every tier except the last must
 * have a finite upToKl boundary, and the last tier's upToKl is null,
 * meaning "this rate applies to everything beyond the previous tier's limit".
 */
@Entity
@Table(name = "tariff_tiers", uniqueConstraints = @UniqueConstraint(columnNames = {"tariff_plan_id", "tier_order"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TariffTier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tariff_plan_id", nullable = false)
    private TariffPlan tariffPlan;

    @Column(name = "tier_order", nullable = false)
    private Integer tierOrder;

    @Column(name = "up_to_kl", precision = 10, scale = 2)
    private BigDecimal upToKl;

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal rate;
}
