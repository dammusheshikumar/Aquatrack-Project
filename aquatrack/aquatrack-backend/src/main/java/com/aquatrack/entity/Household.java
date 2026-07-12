package com.aquatrack.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "households", uniqueConstraints = @UniqueConstraint(columnNames = {"apartment_id", "flat_number"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Household {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @Column(name = "flat_number", nullable = false, length = 30)
    private String flatNumber;

    @Column(name = "flat_size_sqft", nullable = false, precision = 10, scale = 2)
    private BigDecimal flatSizeSqft;

    @Column(nullable = false)
    private Integer occupancy;

    @Column(name = "meter_serial_number", length = 60)
    private String meterSerialNumber;

    @Column(name = "meter_active", nullable = false)
    @Builder.Default
    private Boolean meterActive = true;

    @JsonIgnore
    @OneToMany(mappedBy = "household", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<WaterUsageLog> usageLogs = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
