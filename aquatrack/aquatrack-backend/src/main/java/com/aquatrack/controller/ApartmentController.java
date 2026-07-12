package com.aquatrack.controller;

import com.aquatrack.dto.household.ApartmentRequest;
import com.aquatrack.dto.household.HouseholdRequest;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.Household;
import com.aquatrack.service.ApartmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ApartmentController {

    private final ApartmentService apartmentService;

    public ApartmentController(ApartmentService apartmentService) {
        this.apartmentService = apartmentService;
    }

    @PostMapping("/admin/apartments")
    public ResponseEntity<Apartment> createApartment(@Valid @RequestBody ApartmentRequest req) {
        return ResponseEntity.ok(apartmentService.createApartment(req));
    }

    @PutMapping("/admin/apartments/{id}")
    public ResponseEntity<Apartment> updateApartment(@PathVariable Long id, @Valid @RequestBody ApartmentRequest req) {
        return ResponseEntity.ok(apartmentService.updateApartment(id, req));
    }

    @DeleteMapping("/admin/apartments/{id}")
    public ResponseEntity<Void> deleteApartment(@PathVariable Long id) {
        apartmentService.deleteApartment(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/public/apartments")
    public ResponseEntity<List<Apartment>> listApartments() {
        return ResponseEntity.ok(apartmentService.listApartments());
    }

    @GetMapping("/resident/apartments/{id}")
    public ResponseEntity<Apartment> getApartment(@PathVariable Long id) {
        return ResponseEntity.ok(apartmentService.getApartment(id));
    }

    @PostMapping("/admin/households")
    public ResponseEntity<Household> createHousehold(@Valid @RequestBody HouseholdRequest req) {
        return ResponseEntity.ok(apartmentService.createHousehold(req));
    }

    @GetMapping("/admin/apartments/{apartmentId}/households")
    public ResponseEntity<List<Household>> listHouseholds(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(apartmentService.listHouseholds(apartmentId));
    }

    @GetMapping("/resident/households/{id}")
    public ResponseEntity<Household> getHousehold(@PathVariable Long id) {
        return ResponseEntity.ok(apartmentService.getHousehold(id));
    }

    /**
     * Public lookup so a resident can find their household's internal ID by
     * apartment + flat number during registration, without needing admin access.
     */
    @GetMapping("/public/apartments/{apartmentId}/households/lookup")
    public ResponseEntity<Household> lookupHousehold(@PathVariable Long apartmentId,
                                                        @RequestParam String flatNumber) {
        return ResponseEntity.ok(apartmentService.lookupHousehold(apartmentId, flatNumber));
    }
}