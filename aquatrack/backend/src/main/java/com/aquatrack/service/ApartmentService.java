package com.aquatrack.service;

import com.aquatrack.entity.Apartment;
import com.aquatrack.exception.ResourceNotFoundException;
import com.aquatrack.repository.ApartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ApartmentService {

    private final ApartmentRepository apartmentRepository;

    public List<Apartment> findAll() {
        return apartmentRepository.findAll();
    }

    public Apartment findById(Long id) {
        return apartmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Apartment not found: " + id));
    }
}
