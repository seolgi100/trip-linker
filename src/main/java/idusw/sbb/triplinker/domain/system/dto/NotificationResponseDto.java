package idusw.sbb.triplinker.domain.system.dto;

import idusw.sbb.triplinker.domain.system.entity.Notification;

import java.time.LocalDateTime;

public record NotificationResponseDto(
        Long notificationId,     // 알림 ID
        String type,             // 알림 유형
        String title,            // 알림 제목
        String content,          // 알림 내용
        boolean isRead,          // 읽음 여부
        LocalDateTime createdAt  // 알림 발송 일시
) {
    public static NotificationResponseDto from(Notification notification) {
        return new NotificationResponseDto(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getContent(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}