package com.aquatrack.controller;

import com.aquatrack.entity.Apartment;
import com.aquatrack.service.ApartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/apartments")
@RequiredArgsConstructor
public class ApartmentController {

    private final ApartmentService apartmentService;

    @GetMapping
    public List<Apartment> all() {
        return apartmentService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Apartment> get(@PathVariable Long id) {
        return ResponseEntity.ok(apartmentService.findById(id));
    }
}
