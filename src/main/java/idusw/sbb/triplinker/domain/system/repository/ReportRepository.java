package idusw.sbb.triplinker.domain.system.repository;

import idusw.sbb.triplinker.domain.system.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {

    // 관리자 - 처리 상태별 신고 목록 조회
    Page<Report> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    // 특정 게시글에 접수된 신고 목록 조회
    Page<Report> findByPostIdOrderByCreatedAtDesc(Long postId, Pageable pageable);

    // 특정 사용자가 접수한 신고 목록 조회
    Page<Report> findByReporterUserIdOrderByCreatedAtDesc(Long reporterUserId, Pageable pageable);
}