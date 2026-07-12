package com.aquatrack.controller;

import com.aquatrack.dto.usage.BulkUploadResult;
import com.aquatrack.dto.usage.UsageLogRequest;
import com.aquatrack.entity.WaterUsageLog;
import com.aquatrack.service.UsageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/usage")
@RequiredArgsConstructor
public class UsageController {

    private final UsageService usageService;

    @PostMapping("/manual")
    public ResponseEntity<WaterUsageLog> logManual(@Valid @RequestBody UsageLogRequest request) {
        return ResponseEntity.ok(usageService.logManualReading(request));
    }

    @PostMapping(value = "/bulk-upload", consumes = "multipart/form-data")
    public ResponseEntity<BulkUploadResult> bulkUpload(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(usageService.bulkUpload(file));
    }

    @GetMapping("/household/{householdId}")
    public List<WaterUsageLog> history(@PathVariable Long householdId) {
        return usageService.getHistory(householdId);
    }

    @GetMapping("/household/{householdId}/recent")
    public List<WaterUsageLog> recent(@PathVariable Long householdId) {
        return usageService.getRecent(householdId);
    }

    @GetMapping("/household/{householdId}/range")
    public List<WaterUsageLog> range(@PathVariable Long householdId,
                                      @RequestParam LocalDate start,
                                      @RequestParam LocalDate end) {
        return usageService.getBetween(householdId, start, end);
    }
}
