package idusw.sbb.triplinker.domain.post.repository;

import idusw.sbb.triplinker.domain.post.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    // 마이페이지 - 특정 사용자가 작성한 활성 게시글 목록 조회
    List<Post> findByUserIdAndStatusOrderByIdDesc(Long userId, String status);

    // 커뮤니티 - 게시글 목록 조회
    Page<Post> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    // 특정 여행 플랜과 연결된 게시글 목록 조회
    Page<Post> findByPlanIdAndStatusOrderByCreatedAtDesc(Long planId, String status, Pageable pageable);

    Page<Post> findByStatusAndCategoryOrderByCreatedAtDesc(String status, String category, Pageable pageable);

    @Query("""
        SELECT p
        FROM Post p
        WHERE p.status = :status
          AND (
                p.category = :category
                OR p.category IS NULL
                OR p.category = ''
          )
        ORDER BY p.createdAt DESC
        """)
    Page<Post> findRoutePostsIncludingNullCategory(
            @Param("status") String status,
            @Param("category") String category,
            Pageable pageable
    );
}