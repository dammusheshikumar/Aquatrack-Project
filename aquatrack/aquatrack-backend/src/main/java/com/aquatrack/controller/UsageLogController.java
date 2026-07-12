package com.aquatrack.controller;

import com.aquatrack.dto.usage.CsvUploadResult;
import com.aquatrack.dto.usage.UsageLogRequest;
import com.aquatrack.entity.WaterUsageLog;
import com.aquatrack.service.UsageLogService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class UsageLogController {

    private final UsageLogService usageLogService;

    public UsageLogController(UsageLogService usageLogService) {
        this.usageLogService = usageLogService;
    }

    @PostMapping("/resident/usage-logs")
    public ResponseEntity<WaterUsageLog> logReading(@Valid @RequestBody UsageLogRequest req) {
        return ResponseEntity.ok(usageLogService.logManualReading(req));
    }

    @PostMapping(value = "/admin/usage-logs/bulk-upload", consumes = "multipart/form-data")
    public ResponseEntity<CsvUploadResult> bulkUpload(@RequestParam Long apartmentId,
                                                        @RequestParam MultipartFile file) {
        return ResponseEntity.ok(usageLogService.bulkUpload(apartmentId, file));
    }

    @GetMapping("/resident/households/{householdId}/usage-logs")
    public ResponseEntity<List<WaterUsageLog>> history(@PathVariable Long householdId) {
        return ResponseEntity.ok(usageLogService.getHistory(householdId));
    }

    @GetMapping("/resident/households/{householdId}/usage-logs/recent")
    public ResponseEntity<List<WaterUsageLog>> recent(@PathVariable Long householdId) {
        return ResponseEntity.ok(usageLogService.getRecent(householdId));
    }
}
