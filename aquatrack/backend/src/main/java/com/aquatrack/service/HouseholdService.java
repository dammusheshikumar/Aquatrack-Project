package com.aquatrack.service;

import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.Household;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.HouseholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HouseholdService {

    private final HouseholdRepository householdRepository;
    private final ApartmentService apartmentService;

    public List<Household> findByApartment(Long apartmentId) {
        return householdRepository.findByApartmentId(apartmentId);
    }

    public Household findById(Long id) {
        return householdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Household not found: " + id));
    }

    public Household create(Long apartmentId, String flatNumber, Double flatSizeSqft, Integer occupancy, String meterSerial) {
        Apartment apartment = apartmentService.findById(apartmentId);
        if (householdRepository.existsByApartmentIdAndFlatNumber(apartmentId, flatNumber)) {
            throw new BadRequestException("Flat " + flatNumber + " already exists in this apartment");
        }
        Household household = Household.builder()
                .apartment(apartment)
                .flatNumber(flatNumber)
                .flatSizeSqft(java.math.BigDecimal.valueOf(flatSizeSqft))
                .occupancy(occupancy)
                .meterSerialNumber(meterSerial)
                .hasWorkingMeter(true)
                .build();
        return householdRepository.save(household);
    }

    public Household updateMeterStatus(Long householdId, boolean hasWorkingMeter) {
        Household household = findById(householdId);
        household.setHasWorkingMeter(hasWorkingMeter);
        return householdRepository.save(household);
    }
}
