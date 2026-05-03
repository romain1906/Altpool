package com.altpool.controller;

import com.altpool.dto.ReservationDto;
import com.altpool.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @GetMapping
    public List<ReservationDto> list() {
        return reservationService.findAll();
    }

    @PostMapping
    public ReservationDto create(@Valid @RequestBody ReservationDto dto, Authentication auth) {
        return reservationService.create(dto, auth.getName());
    }
}
