package com.altpool.service;

import com.altpool.entity.User;
import com.altpool.entity.UserAvatar;
import com.altpool.exception.ApiException;
import com.altpool.repository.UserAvatarRepository;
import com.altpool.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AvatarService {

    private static final long MAX_BYTES = 2 * 1024 * 1024; // 2 MB
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"
    );
    private static final Map<String, String> EXT = Map.of(
            "image/png",  "png",
            "image/jpeg", "jpg",
            "image/jpg",  "jpg",
            "image/webp", "webp",
            "image/gif",  "gif"
    );

    private final UserAvatarRepository repo;
    private final UserRepository userRepository;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private Path avatarsDir() { return Path.of(uploadDir, "avatars"); }

    @PostConstruct
    void initDir() {
        try {
            Files.createDirectories(avatarsDir());
            log.info("Avatars directory: {}", avatarsDir().toAbsolutePath());
        } catch (IOException e) {
            log.error("Impossible de créer le dossier d'upload {}", avatarsDir(), e);
        }
    }

    /** Représente un fichier d'avatar prêt à streamer. */
    public record AvatarFile(Path path, String contentType) {}

    @Transactional
    public void upload(String username, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Aucun fichier reçu");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.badRequest("Fichier trop volumineux (max 2 Mo)");
        }
        String ct = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!ALLOWED_TYPES.contains(ct)) {
            throw ApiException.badRequest("Format non supporté (PNG, JPG, WEBP, GIF)");
        }

        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));

        try {
            // 1. Supprime l'ancien fichier si présent (extension peut différer)
            UserAvatar existing = repo.findByUserId(u.getId()).orElse(null);
            if (existing != null) {
                Files.deleteIfExists(Path.of(uploadDir, existing.getFilePath()));
            }

            // 2. Écrit le nouveau fichier sur disque : "avatars/{userId}.{ext}"
            String ext = EXT.get(ct);
            String relative = "avatars/" + u.getId() + "." + ext;
            Path target = Path.of(uploadDir, relative);
            Files.createDirectories(target.getParent());
            Files.write(target, file.getBytes());

            // 3. Sauvegarde la métadonnée
            UserAvatar avatar = existing != null ? existing : new UserAvatar();
            avatar.setUser(u);
            avatar.setContentType(ct);
            avatar.setFilePath(relative);
            repo.save(avatar);
        } catch (IOException e) {
            log.error("Erreur d'écriture de l'avatar pour {}", username, e);
            throw ApiException.badRequest("Impossible d'enregistrer le fichier");
        }
    }

    @Transactional(readOnly = true)
    public Optional<AvatarFile> getFile(Long userId) {
        return repo.findByUserId(userId).flatMap(a -> {
            Path p = Path.of(uploadDir, a.getFilePath());
            if (!Files.exists(p)) {
                log.warn("Avatar référencé en base mais introuvable sur disque : {}", p.toAbsolutePath());
                return Optional.empty();
            }
            return Optional.of(new AvatarFile(p, a.getContentType()));
        });
    }

    @Transactional
    public void delete(String username) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        repo.findByUserId(u.getId()).ifPresent(a -> {
            try { Files.deleteIfExists(Path.of(uploadDir, a.getFilePath())); }
            catch (IOException e) { log.warn("Impossible de supprimer le fichier {}", a.getFilePath(), e); }
            repo.delete(a);
        });
    }
}
