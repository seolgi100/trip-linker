package idusw.sbb.triplinker.domain.system.entity;

import idusw.sbb.triplinker.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "NOTIFICATIONS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    // 알림 기본키
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 알림 수신 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 알림 유형: EMAIL / PUSH / IN_APP
    @Column(nullable = false, length = 30)
    private String type;

    // 알림 제목
    @Column(length = 200)
    private String title;

    // 알림 내용
    @Column(columnDefinition = "TEXT")
    private String content;

    // 읽음 여부: false=미확인, true=확인
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    // 알림 발송 일시
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Notification(User user, String type, String title, String content, Boolean isRead) {
        this.user = user;
        this.type = type;
        this.title = title;
        this.content = content;
        this.isRead = isRead != null ? isRead : false;
    }

    // 알림 읽음 처리
    public void markAsRead() {
        this.isRead = true;
    }
}