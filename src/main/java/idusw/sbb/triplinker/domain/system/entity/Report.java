package idusw.sbb.triplinker.domain.system.entity;

import idusw.sbb.triplinker.domain.post.entity.Post;
import idusw.sbb.triplinker.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "REPORTS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

    // 신고 기본키
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 신고 대상 게시글
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    // 신고 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_user_id", nullable = false)
    private User reporterUser;

    // 신고 사유
    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    // 처리 상태
    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    // 관리자 처리 메모
    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    // 신고 처리 일시
    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    // 신고 접수 일시
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Report(Post post,
                  User reporterUser,
                  String reason,
                  String status,
                  String adminNote) {

        this.post = post;
        this.reporterUser = reporterUser;
        this.reason = reason;
        this.status = status != null ? status : "PENDING";
        this.adminNote = adminNote;

        // 신고 생성 시 현재 시간 저장
        this.createdAt = LocalDateTime.now();
    }

    // 신고 승인 처리
    public void resolve(String adminNote) {
        this.status = "RESOLVED";
        this.adminNote = adminNote;
        this.processedAt = LocalDateTime.now();
    }

    // 신고 반려 처리
    public void reject(String adminNote) {
        this.status = "REJECTED";
        this.adminNote = adminNote;
        this.processedAt = LocalDateTime.now();
    }
}