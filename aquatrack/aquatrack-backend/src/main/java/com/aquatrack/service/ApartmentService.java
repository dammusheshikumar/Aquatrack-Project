package com.aquatrack.service;

import com.aquatrack.dto.admin.HouseholdDetailResponse;
import com.aquatrack.dto.admin.ResidentAccountResponse;
import com.aquatrack.dto.household.ApartmentRequest;
import com.aquatrack.dto.household.HouseholdRequest;
import com.aquatrack.dto.household.HouseholdUpdateRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.Fine;
import com.aquatrack.entity.FineStatus;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.User;
import com.aquatrack.exception.BadRequestException;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.ApartmentRepository;
import com.aquatrack.repository.FineRepository;
import com.aquatrack.repository.HouseholdRepository;
import com.aquatrack.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ApartmentService {

    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final FineRepository fineRepository;

    public ApartmentService(ApartmentRepository apartmentRepository, HouseholdRepository householdRepository,
                             UserRepository userRepository, FineRepository fineRepository) {
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
        this.userRepository = userRepository;
        this.fineRepository = fineRepository;
    }

    public Apartment createApartment(ApartmentRequest req) {
        Apartment apartment = Apartment.builder().name(req.getName()).address(req.getAddress()).build();
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
        // billing cycles, invoices, fines, alerts, and linked user accounts.
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
                .dailyLimitKl(req.getDailyLimitKl())
                .build();

        return householdRepository.save(household);
    }

    @Transactional
    public Household updateHousehold(Long id, HouseholdUpdateRequest req) {
        Household household = getHousehold(id);
        household.setFlatSizeSqft(req.getFlatSizeSqft());
        household.setOccupancy(req.getOccupancy());
        if (req.getMeterSerialNumber() != null) household.setMeterSerialNumber(req.getMeterSerialNumber());
        if (req.getMeterActive() != null) household.setMeterActive(req.getMeterActive());
        household.setDailyLimitKl(req.getDailyLimitKl());
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

    /**
     * Enriches every household in an apartment with its resident accounts and
     * outstanding fine summary — the single view an admin needs to see who
     * lives where and impose a fine directly, without extra navigation.
     */
    public List<HouseholdDetailResponse> listHouseholdDetails(Long apartmentId) {
        List<Household> households = householdRepository.findByApartmentId(apartmentId);
        return households.stream().map(this::toDetailResponse).toList();
    }

    private HouseholdDetailResponse toDetailResponse(Household household) {
        List<User> residents = userRepository.findByHouseholdId(household.getId());
        List<ResidentAccountResponse> residentDtos = residents.stream()
                .map(u -> new ResidentAccountResponse(
                        u.getId(), u.getFullName(), u.getUsername(), u.getEmail(),
                        u.getAuthProvider().name(), u.getApprovalStatus().name(), u.getEnabled()))
                .toList();

        List<Fine> fines = fineRepository.findByHouseholdIdOrderByCreatedAtDesc(household.getId());
        List<Fine> unpaid = fines.stream().filter(f -> f.getStatus() == FineStatus.UNPAID).toList();
        BigDecimal unpaidTotal = unpaid.stream().map(Fine::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new HouseholdDetailResponse(
                household.getId(), household.getFlatNumber(), household.getFlatSizeSqft(),
                household.getOccupancy(), household.getMeterSerialNumber(), household.getMeterActive(),
                household.getDailyLimitKl(), residentDtos, unpaid.size(), unpaidTotal);
    }
}