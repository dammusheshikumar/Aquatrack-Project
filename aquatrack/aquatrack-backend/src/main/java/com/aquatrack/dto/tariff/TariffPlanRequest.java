package com.aquatrack.dto.tariff;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class TariffPlanRequest {
    @NotNull private Long apartmentId;
    @NotBlank private String planName;

    @NotEmpty @Valid
    private List<TariffTierRequest> tiers;
}
