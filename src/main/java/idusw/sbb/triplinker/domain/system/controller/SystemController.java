package idusw.sbb.triplinker.domain.system.controller;

import idusw.sbb.triplinker.domain.auth.security.CustomUserDetails;
import idusw.sbb.triplinker.domain.system.dto.NotificationResponseDto;
import idusw.sbb.triplinker.domain.system.dto.ReportRequestDto;
import idusw.sbb.triplinker.domain.system.service.SystemService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SystemController {

    private final SystemService systemService;

    // 게시글 신고 접수
    @PostMapping("/reports")
    public ResponseEntity<Long> reportPost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody ReportRequestDto dto
    ) {
        Long reportId = systemService.reportPost(userDetails.getUserId(), dto);
        return ResponseEntity.ok(reportId);
    }

    // 내 알림 목록 조회
    @GetMapping("/notifications")
    public ResponseEntity<Page<NotificationResponseDto>> getNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable
    ) {
        return ResponseEntity.ok(systemService.getNotifications(userDetails.getUserId(), pageable));
    }

    // 알림 읽음 처리
    @PatchMapping("/notifications/{notificationId}/read")
    public ResponseEntity<Void> readNotification(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long notificationId
    ) {
        systemService.readNotification(userDetails.getUserId(), notificationId);
        return ResponseEntity.ok().build();
    }
}