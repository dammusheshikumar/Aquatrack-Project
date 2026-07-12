package com.aquatrack.dto.billing;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BillingCycleRequest {
    @NotNull private Long apartmentId;
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
}
