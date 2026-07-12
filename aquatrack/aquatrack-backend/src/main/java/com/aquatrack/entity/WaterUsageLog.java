package com.aquatrack.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "water_usage_logs", uniqueConstraints = @UniqueConstraint(columnNames = {"household_id", "reading_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WaterUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @Column(name = "reading_date", nullable = false)
    private LocalDate readingDate;

    @Column(name = "reading_value", nullable = false, precision = 12, scale = 3)
    private BigDecimal readingValue;

    @Column(name = "consumption_kl", precision = 12, scale = 3)
    private BigDecimal consumptionKl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UsageSource source = UsageSource.MANUAL;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
