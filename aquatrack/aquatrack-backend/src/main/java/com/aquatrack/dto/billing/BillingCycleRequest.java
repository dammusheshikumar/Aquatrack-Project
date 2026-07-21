package com.aquatrack.dto.billing;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class BillingCycleRequest {
    @NotNull
    private Long apartmentId;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;
}