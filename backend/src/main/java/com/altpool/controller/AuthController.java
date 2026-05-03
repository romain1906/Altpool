package com.altpool.controller;

import com.altpool.dto.AuthDtos.AuthResponse;
import com.altpool.dto.AuthDtos.ForgotPasswordRequest;
import com.altpool.dto.AuthDtos.LoginRequest;
import com.altpool.dto.PasswordResetRequestDto;
import com.altpool.service.AuthService;
import com.altpool.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService resetService;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/forgot-password")
    public PasswordResetRequestDto forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        return resetService.request(req.getUsername());
    }
}
