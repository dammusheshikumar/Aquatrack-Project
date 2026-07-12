package com.aquatrack.service;

import com.aquatrack.dto.usage.BulkUploadResult;
import com.aquatrack.dto.usage.UsageLogRequest;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.WaterUsageLog;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.WaterUsageLogRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UsageService {

    private final WaterUsageLogRepository usageLogRepository;
    private final HouseholdRepository householdRepository;

    @Transactional
    public WaterUsageLog logManualReading(UsageLogRequest req) {
        Household household = householdRepository.findById(req.getHouseholdId())
                .orElseThrow(() -> new ResourceNotFoundException("Household not found"));

        if (usageLogRepository.existsByHouseholdIdAndReadingDate(household.getId(), req.getReadingDate())) {
            throw new BadRequestException("A reading for this household on " + req.getReadingDate() + " already exists");
        }

        BigDecimal consumption = computeConsumption(household.getId(), req.getReadingDate(), BigDecimal.valueOf(req.getReadingValue()));

        WaterUsageLog log = WaterUsageLog.builder()
                .household(household)
                .readingDate(req.getReadingDate())
                .readingValue(BigDecimal.valueOf(req.getReadingValue()))
                .consumptionKl(consumption)
                .source(WaterUsageLog.Source.MANUAL)
                .build();

        return usageLogRepository.save(log);
    }

    /**
     * Bulk CSV upload. Expected columns: household_id, reading_date (YYYY-MM-DD), reading_value
     * Detects duplicate (household_id, reading_date) pairs both within the file and against existing records.
     */
    @Transactional
    public BulkUploadResult bulkUpload(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int total = 0, inserted = 0, duplicates = 0, failed = 0;

        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            CSVParser parser = CSVFormat.DEFAULT.builder()
                    .setHeader().setSkipHeaderRecord(true).setTrim(true)
                    .build()
                    .parse(reader);

            java.util.Set<String> seenInFile = new java.util.HashSet<>();

            for (CSVRecord record : parser) {
                total++;
                try {
                    Long householdId = Long.parseLong(record.get("household_id").trim());
                    LocalDate readingDate = LocalDate.parse(record.get("reading_date").trim());
                    BigDecimal readingValue = new BigDecimal(record.get("reading_value").trim());

                    String dedupeKey = householdId + "|" + readingDate;
                    if (!seenInFile.add(dedupeKey)) {
                        duplicates++;
                        errors.add("Row " + record.getRecordNumber() + ": duplicate within file for household " + householdId + " on " + readingDate);
                        continue;
                    }

                    if (usageLogRepository.existsByHouseholdIdAndReadingDate(householdId, readingDate)) {
                        duplicates++;
                        errors.add("Row " + record.getRecordNumber() + ": reading already exists for household " + householdId + " on " + readingDate);
                        continue;
                    }

                    Household household = householdRepository.findById(householdId)
                            .orElseThrow(() -> new ResourceNotFoundException("Household " + householdId + " not found"));

                    BigDecimal consumption = computeConsumption(householdId, readingDate, readingValue);

                    WaterUsageLog log = WaterUsageLog.builder()
                            .household(household)
                            .readingDate(readingDate)
                            .readingValue(readingValue)
                            .consumptionKl(consumption)
                            .source(WaterUsageLog.Source.BULK_CSV)
                            .build();
                    usageLogRepository.save(log);
                    inserted++;

                } catch (Exception rowEx) {
                    failed++;
                    errors.add("Row " + record.getRecordNumber() + ": " + rowEx.getMessage());
                }
            }
        } catch (Exception e) {
            throw new BadRequestException("Failed to parse CSV file: " + e.getMessage());
        }

        return BulkUploadResult.builder()
                .totalRows(total)
                .inserted(inserted)
                .duplicatesSkipped(duplicates)
                .failed(failed)
                .errors(errors)
                .build();
    }

    public List<WaterUsageLog> getHistory(Long householdId) {
        return usageLogRepository.findByHouseholdIdOrderByReadingDateAsc(householdId);
    }

    public List<WaterUsageLog> getRecent(Long householdId) {
        return usageLogRepository.findTop30ByHouseholdIdOrderByReadingDateDesc(householdId);
    }

    public List<WaterUsageLog> getBetween(Long householdId, LocalDate start, LocalDate end) {
        return usageLogRepository.findByHouseholdIdAndReadingDateBetween(householdId, start, end);
    }

    /**
     * Normalizes a raw meter reading into a daily consumption figure.
     * If a previous reading exists and the new value is >= previous (cumulative meter),
     * consumption = current - previous. Otherwise the raw value is treated as the day's consumption directly
     * (covers first reading, or meters that report daily usage rather than cumulative totals).
     */
    private BigDecimal computeConsumption(Long householdId, LocalDate readingDate, BigDecimal readingValue) {
        Optional<WaterUsageLog> previous = usageLogRepository
                .findByHouseholdIdOrderByReadingDateAsc(householdId).stream()
                .filter(l -> l.getReadingDate().isBefore(readingDate))
                .reduce((first, second) -> second); // last one before readingDate

        if (previous.isPresent() && readingValue.compareTo(previous.get().getReadingValue()) >= 0) {
            return readingValue.subtract(previous.get().getReadingValue());
        }
        return readingValue;
    }
}
