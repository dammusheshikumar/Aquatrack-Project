package com.aquatrack.dto.usage;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BulkUploadResult {
    private int totalRows;
    private int inserted;
    private int duplicatesSkipped;
    private int failed;
    private List<String> errors;
}
