package com.aquatrack.dto.billing;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TariffPlanRequest {
    @NotNull private Long apartmentId;
    @NotBlank private String planName;
    @NotNull @PositiveOrZero private Double baseRate;
    @NotNull @Positive private Double baseTierLimit;
    @NotNull @PositiveOrZero private Double excessRate;
}
