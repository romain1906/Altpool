package com.altpool.controller;

import com.altpool.service.AvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AvatarController {

    private final AvatarService avatarService;

    @PostMapping(value = "/users/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(@RequestPart("file") MultipartFile file,
                                      Authentication auth) {
        avatarService.upload(auth.getName(), file);
        return Map.of("status", "ok");
    }

    @DeleteMapping("/users/me/avatar")
    public Map<String, String> delete(Authentication auth) {
        avatarService.delete(auth.getName());
        return Map.of("status", "ok");
    }

    /** Endpoint PUBLIC — utilisable directement dans <img src>. */
    @GetMapping("/users/{id}/avatar")
    public ResponseEntity<Resource> get(@PathVariable Long id) {
        return avatarService.getFile(id)
                .<ResponseEntity<Resource>>map(af -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(af.contentType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)))
                        .body(new FileSystemResource(af.path())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
