package com.altpool.controller;

import com.altpool.dto.PasswordResetRequestDto;
import com.altpool.dto.ResolveResetRequest;
import com.altpool.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/password-resets")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public List<PasswordResetRequestDto> list(Authentication auth) {
        return service.findVisible(auth.getName());
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public PasswordResetRequestDto resolve(@PathVariable Long id,
                                           @Valid @RequestBody ResolveResetRequest body,
                                           Authentication auth) {
        return service.resolve(id, body.getNewPassword(), auth.getName());
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','GERANT')")
    public PasswordResetRequestDto reject(@PathVariable Long id, Authentication auth) {
        return service.reject(id, auth.getName());
    }
}
