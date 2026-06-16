package idusw.sbb.triplinker.domain.system.service;

import idusw.sbb.triplinker.domain.post.entity.Post;
import idusw.sbb.triplinker.domain.post.repository.PostRepository;
import idusw.sbb.triplinker.domain.system.dto.NotificationResponseDto;
import idusw.sbb.triplinker.domain.system.dto.ReportRequestDto;
import idusw.sbb.triplinker.domain.system.entity.Notification;
import idusw.sbb.triplinker.domain.system.entity.Report;
import idusw.sbb.triplinker.domain.system.repository.NotificationRepository;
import idusw.sbb.triplinker.domain.system.repository.ReportRepository;
import idusw.sbb.triplinker.domain.user.entity.User;
import idusw.sbb.triplinker.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SystemServiceImpl implements SystemService {

    private final ReportRepository reportRepository;
    private final NotificationRepository notificationRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    // 게시글 신고 접수
    @Override
    @Transactional
    public Long reportPost(Long userId, ReportRequestDto dto) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("신고 회원을 찾을 수 없습니다."));

        Post post = postRepository.findById(dto.getPostId())
                .orElseThrow(() -> new IllegalArgumentException("신고 대상 게시글을 찾을 수 없습니다."));

        Report report = Report.builder()
                .post(post)
                .reporterUser(reporter)
                .reason(dto.getReason())
                .status("PENDING")
                .build();

        return reportRepository.save(report).getId();
    }

    // 내 알림 목록 조회
    @Override
    public Page<NotificationResponseDto> getNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationResponseDto::from);
    }

    // 알림 읽음 처리
    @Override
    @Transactional
    public void readNotification(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));

        if (!Objects.equals(notification.getUser().getId(), userId)) {
            throw new IllegalArgumentException("알림 읽음 처리 권한이 없습니다.");
        }

        notification.markAsRead();
    }
}