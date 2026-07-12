package com.aquatrack.service;

import com.aquatrack.dto.usage.CsvUploadResult;
import com.aquatrack.dto.usage.UsageLogRequest;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.UsageSource;
import com.aquatrack.entity.WaterUsageLog;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.WaterUsageLogRepository;
import com.opencsv.CSVReader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Handles manual and bulk (CSV) water usage log ingestion.
 * Duplicate detection: one reading per household per day (DB unique constraint
 * + pre-check) so the same reading/file row can never be double-counted.
 */
@Service
public class UsageLogService {

    private final WaterUsageLogRepository usageLogRepository;
    private final HouseholdRepository householdRepository;

    public UsageLogService(WaterUsageLogRepository usageLogRepository, HouseholdRepository householdRepository) {
        this.usageLogRepository = usageLogRepository;
        this.householdRepository = householdRepository;
    }

    @Transactional
    public WaterUsageLog logManualReading(UsageLogRequest req) {
        Household household = householdRepository.findById(req.getHouseholdId())
                .orElseThrow(() -> new ResourceNotFoundException("Household not found: " + req.getHouseholdId()));

        if (usageLogRepository.existsByHouseholdIdAndReadingDate(req.getHouseholdId(), req.getReadingDate())) {
            throw new BadRequestException("A reading for this household on " + req.getReadingDate() + " already exists");
        }

        BigDecimal consumption = computeConsumption(household.getId(), req.getReadingDate(), req.getReadingValue());

        WaterUsageLog log = WaterUsageLog.builder()
                .household(household)
                .readingDate(req.getReadingDate())
                .readingValue(req.getReadingValue())
                .consumptionKl(consumption)
                .source(UsageSource.MANUAL)
                .build();

        return usageLogRepository.save(log);
    }

    /**
     * Bulk CSV upload. Expected columns: flat_number,reading_date(yyyy-MM-dd),reading_value
     * Rows referencing a reading that already exists for that household+date are skipped
     * (duplicate detection), not overwritten, and reported back to the caller.
     */
    @Transactional
    public CsvUploadResult bulkUpload(Long apartmentId, MultipartFile file) {
        int total = 0, inserted = 0, duplicates = 0;
        List<String> errors = new ArrayList<>();

        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            String[] header = reader.readNext(); // skip header row
            String[] row;
            int rowNum = 1;
            while ((row = reader.readNext()) != null) {
                rowNum++;
                total++;
                try {
                    if (row.length < 3) {
                        errors.add("Row " + rowNum + ": expected 3 columns, got " + row.length);
                        continue;
                    }
                    String flatNumber = row[0].trim();
                    LocalDate readingDate = LocalDate.parse(row[1].trim());
                    BigDecimal readingValue = new BigDecimal(row[2].trim());

                    Optional<Household> householdOpt =
                            householdRepository.findByApartmentIdAndFlatNumber(apartmentId, flatNumber);
                    if (householdOpt.isEmpty()) {
                        errors.add("Row " + rowNum + ": unknown flat number '" + flatNumber + "'");
                        continue;
                    }
                    Household household = householdOpt.get();

                    if (usageLogRepository.existsByHouseholdIdAndReadingDate(household.getId(), readingDate)) {
                        duplicates++;
                        continue;
                    }

                    BigDecimal consumption = computeConsumption(household.getId(), readingDate, readingValue);

                    WaterUsageLog log = WaterUsageLog.builder()
                            .household(household)
                            .readingDate(readingDate)
                            .readingValue(readingValue)
                            .consumptionKl(consumption)
                            .source(UsageSource.BULK_CSV)
                            .build();
                    usageLogRepository.save(log);
                    inserted++;
                } catch (Exception rowEx) {
                    errors.add("Row " + rowNum + ": " + rowEx.getMessage());
                }
            }
        } catch (Exception e) {
            throw new BadRequestException("Failed to parse CSV: " + e.getMessage());
        }

        return new CsvUploadResult(total, inserted, duplicates, errors);
    }

    public List<WaterUsageLog> getHistory(Long householdId) {
        return usageLogRepository.findByHouseholdIdOrderByReadingDateAsc(householdId);
    }

    public List<WaterUsageLog> getRecent(Long householdId) {
        return usageLogRepository.findTop30ByHouseholdIdOrderByReadingDateDesc(householdId);
    }

    /**
     * Consumption for a reading is derived from the delta against the most recent
     * prior reading for that household (meter readings are cumulative).
     * If there is no prior reading, the reading value itself is treated as the
     * first period's consumption.
     */
    private BigDecimal computeConsumption(Long householdId, LocalDate readingDate, BigDecimal readingValue) {
        List<WaterUsageLog> history = usageLogRepository.findByHouseholdIdOrderByReadingDateAsc(householdId);
        WaterUsageLog previous = null;
        for (WaterUsageLog log : history) {
            if (log.getReadingDate().isBefore(readingDate)) {
                previous = log;
            }
        }
        if (previous == null) {
            return readingValue;
        }
        BigDecimal delta = readingValue.subtract(previous.getReadingValue());
        return delta.max(BigDecimal.ZERO);
    }
}
