package com.aquatrack.service;

import com.aquatrack.dto.household.ApartmentRequest;
import com.aquatrack.dto.household.HouseholdRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.Household;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.ApartmentRepository;
import com.aquatrack.repository.HouseholdRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ApartmentService {

    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;

    public ApartmentService(ApartmentRepository apartmentRepository, HouseholdRepository householdRepository) {
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
    }

    public Apartment createApartment(ApartmentRequest req) {
        Apartment apartment = Apartment.builder()
                .name(req.getName())
                .address(req.getAddress())
                .build();
        return apartmentRepository.save(apartment);
    }

    public List<Apartment> listApartments() {
        return apartmentRepository.findAll();
    }

    public Apartment getApartment(Long id) {
        return apartmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found: " + id));
    }

    @Transactional
    public Apartment updateApartment(Long id, ApartmentRequest req) {
        Apartment apartment = getApartment(id);
        apartment.setName(req.getName());
        apartment.setAddress(req.getAddress());
        return apartmentRepository.save(apartment);
    }

    @Transactional
    public void deleteApartment(Long id) {
        Apartment apartment = getApartment(id);
        // DB-level ON DELETE CASCADE removes households, usage logs, tariff plans,
        // billing cycles, invoices, and alerts belonging to this apartment.
        apartmentRepository.delete(apartment);
    }

    @Transactional
    public Household createHousehold(HouseholdRequest req) {
        Apartment apartment = getApartment(req.getApartmentId());

        householdRepository.findByApartmentIdAndFlatNumber(req.getApartmentId(), req.getFlatNumber())
                .ifPresent(h -> { throw new BadRequestException("Flat number already registered in this apartment"); });

        Household household = Household.builder()
                .apartment(apartment)
                .flatNumber(req.getFlatNumber())
                .flatSizeSqft(req.getFlatSizeSqft())
                .occupancy(req.getOccupancy())
                .meterSerialNumber(req.getMeterSerialNumber())
                .meterActive(true)
                .build();

        return householdRepository.save(household);
    }

    public List<Household> listHouseholds(Long apartmentId) {
        return householdRepository.findByApartmentId(apartmentId);
    }

    public Household getHousehold(Long id) {
        return householdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Household not found: " + id));
    }

    public Household lookupHousehold(Long apartmentId, String flatNumber) {
        return householdRepository.findByApartmentIdAndFlatNumber(apartmentId, flatNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No household found for flat '" + flatNumber + "' in this apartment. Ask your admin to register it first."));
    }
}