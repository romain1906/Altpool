package com.altpool.service;

import com.altpool.dto.AuthDtos.AuthResponse;
import com.altpool.dto.AuthDtos.LoginRequest;
import com.altpool.entity.User;
import com.altpool.exception.ApiException;
import com.altpool.repository.UserRepository;
import com.altpool.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        return AuthResponse.builder()
                .token(jwtService.generate(user))
                .userId(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .build();
    }
}
