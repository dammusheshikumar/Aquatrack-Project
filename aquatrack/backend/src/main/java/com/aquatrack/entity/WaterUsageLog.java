package com.aquatrack.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @NotNull
    @Column(name = "reading_date", nullable = false)
    private LocalDate readingDate;

    @NotNull
    @PositiveOrZero
    @Column(name = "reading_value", nullable = false, precision = 10, scale = 3)
    private BigDecimal readingValue;

    @NotNull
    @PositiveOrZero
    @Column(name = "consumption_kl", nullable = false, precision = 10, scale = 3)
    private BigDecimal consumptionKl;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private Source source = Source.MANUAL;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public enum Source { MANUAL, BULK_CSV }
}
