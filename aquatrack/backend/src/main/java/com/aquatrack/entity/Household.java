package com.aquatrack.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "households", uniqueConstraints = @UniqueConstraint(columnNames = {"apartment_id", "flat_number"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Household {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @NotBlank
    @Column(name = "flat_number", nullable = false, length = 20)
    private String flatNumber;

    @NotNull
    @Positive
    @Column(name = "flat_size_sqft", nullable = false, precision = 10, scale = 2)
    private BigDecimal flatSizeSqft;

    @Min(1)
    @Column(nullable = false)
    private Integer occupancy;

    @Column(name = "meter_serial_number", length = 50)
    private String meterSerialNumber;

    @Column(name = "has_working_meter", nullable = false)
    @Builder.Default
    private Boolean hasWorkingMeter = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
