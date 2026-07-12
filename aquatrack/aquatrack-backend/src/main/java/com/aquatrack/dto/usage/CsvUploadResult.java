package com.aquatrack.dto.usage;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class CsvUploadResult {
    private int totalRows;
    private int inserted;
    private int duplicatesSkipped;
    private List<String> errors;
}
