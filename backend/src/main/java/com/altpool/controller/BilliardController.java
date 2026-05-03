package com.altpool.controller;

import com.altpool.dto.BilliardTableDto;
import com.altpool.service.BilliardTableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/billards")
@RequiredArgsConstructor
public class BilliardController {

    private final BilliardTableService billiardService;

    @GetMapping
    public List<BilliardTableDto> list() {
        return billiardService.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public BilliardTableDto create(@Valid @RequestBody BilliardTableDto dto) {
        return billiardService.create(dto);
    }
}
