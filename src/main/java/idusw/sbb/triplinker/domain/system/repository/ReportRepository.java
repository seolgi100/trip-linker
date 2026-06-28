package idusw.sbb.triplinker.domain.system.repository;

import idusw.sbb.triplinker.domain.system.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReportRepository extends JpaRepository<Report, Long> {

    // 관리자 신고 목록 - 상태별(PENDING/REJECTED/RESOLVED) 필터링 + 페이징
    Page<Report> findByStatusOrderByIdDesc(String status, Pageable pageable);

    // 대시보드 - 신고 미처리 건수
    long countByStatus(String status);

    // 관리자 - 처리 상태별 신고 목록 조회
    Page<Report> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    // 특정 게시글에 접수된 신고 목록 조회
    Page<Report> findByPostIdOrderByCreatedAtDesc(Long postId, Pageable pageable);

    // 특정 사용자가 접수한 신고 목록 조회
    Page<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId, Pageable pageable);

    // 커뮤니티 - 게시글 신고 중복 확인
    // comment_id가 null 또는 0 이하인 값을 게시글 자체 신고로 본다.
    // boolean 반환 쿼리는 MariaDB/JPA 환경에서 Integer -> Boolean 캐스팅 문제가 생길 수 있으므로 count로 처리한다.
    @Query("""
            select count(r)
            from Report r
            where r.post.id = :postId
              and (r.commentId is null or r.commentId <= 0)
            """)
    long countPostReport(
            @Param("postId") Long postId
    );

    // 커뮤니티 - 댓글 신고 중복 확인
    // 같은 게시글의 같은 댓글이 한 번이라도 신고되었으면 추가 신고를 막는다.
    @Query("""
            select count(r)
            from Report r
            where r.post.id = :postId
              and r.commentId = :commentId
            """)
    long countCommentReport(
            @Param("postId") Long postId,
            @Param("commentId") Long commentId
    );
}
