package com.aquatrack.dto.billing;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WaterPurchaseRequest {
    @NotNull private Long billingCycleId;
    @NotBlank private String sourceType; // TANKER or MUNICIPAL
    @NotNull @Positive private Double volumeKl;
    @NotNull @PositiveOrZero private Double cost;
    @NotNull private LocalDate purchaseDate;
    private String notes;
}
