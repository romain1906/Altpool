package com.altpool.repository;

import com.altpool.entity.UserAvatar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {
    Optional<UserAvatar> findByUserId(Long userId);
}
