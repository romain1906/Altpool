package com.altpool.controller;

import com.altpool.dto.ChangePasswordRequest;
import com.altpool.dto.ClubDto;
import com.altpool.dto.CreateUserRequest;
import com.altpool.dto.UpdateProfileRequest;
import com.altpool.dto.UpdateUserRequest;
import com.altpool.dto.UserDto;
import com.altpool.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserDto me(Authentication auth) {
        return userService.getMe(auth.getName());
    }

    @PatchMapping("/me")
    public UserDto updateMe(@Valid @RequestBody UpdateProfileRequest req, Authentication auth) {
        return userService.updateProfile(auth.getName(), req);
    }

    @PostMapping("/me/password")
    public Map<String, String> changeMyPassword(@Valid @RequestBody ChangePasswordRequest req,
                                                Authentication auth) {
        userService.changePassword(auth.getName(), req);
        return Map.of("status", "ok");
    }

    @GetMapping("/me/clubs")
    public List<ClubDto> myClubs(Authentication auth) {
        return userService.getMyClubs(auth.getName());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> list() {
        return userService.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto create(@Valid @RequestBody CreateUserRequest req) {
        return userService.create(req);
    }

    /** Modifie le rôle et/ou les clubs gérés d'un user existant. */
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest req) {
        return userService.updateUser(id, req);
    }
}
