package idusw.sbb.triplinker.domain.post.dto;

import idusw.sbb.triplinker.domain.post.entity.Post;
import idusw.sbb.triplinker.domain.post.entity.PostComment;

import java.time.LocalDateTime;
import java.util.List;

public record PostDetailResponseDto(
        Long postId,                 // 게시글 ID
        Long userId,                 // 작성자 ID
        String writerName,           // 작성자명

        String category,             // 게시글 카테고리: ROUTE, STAY, FOOD, TOUR, CAFE
        String catLabel,             // 화면 표시용 카테고리명
        String catClass,             // 화면 표시용 카테고리 CSS 클래스

        Long planId,                 // 연결된 여행 플랜 ID
        String planTitle,            // 연결된 여행 플랜 제목
        String planDestination,      // 여행지
        String planStartDate,        // 여행 시작일
        String planEndDate,          // 여행 종료일
        String planRouteJson,        // 여행 일정(Route) JSON 데이터
        Integer planCompanionCount,  // 연결된 플랜 인원
        String planTravelStyles,     // 연결된 플랜 여행 스타일 JSON
        String planTransportType,    // 연결된 플랜 이동 수단
        Long planBudget,             // 연결된 플랜 예산

        String title,                // 제목
        String content,              // 본문
        String styleTags,            // 여행 취향 태그
        int likeCount,               // 좋아요 수
        int viewCount,               // 조회 수
        String status,               // 게시글 상태
        boolean isPublic,            // 공개 여부
        boolean likedByMe,           // 현재 사용자의 좋아요 여부
        boolean scrappedByMe,        // 현재 사용자의 스크랩 여부
        List<CommentInfo> comments,  // 댓글 목록
        LocalDateTime createdAt,     // 작성 일시
        LocalDateTime updatedAt      // 수정 일시
) {
    public static PostDetailResponseDto from(Post post,
                                             List<PostComment> comments,
                                             boolean likedByMe,
                                             boolean scrappedByMe) {

        String writerName = "DELETED".equals(String.valueOf(post.getUser().getStatus()))
                ? "탈퇴한 사용자"
                : post.getUser().getName();

        String category = normalizeCategory(post.getCategory());

        return new PostDetailResponseDto(
                post.getId(),
                post.getUser().getId(),
                writerName,

                category,
                getCatLabel(category),
                getCatClass(category),

                post.getPlan() != null ? post.getPlan().getId() : null,
                post.getPlan() != null ? post.getPlan().getTitle() : null,
                post.getPlan() != null ? post.getPlan().getDestination() : null,
                post.getPlan() != null && post.getPlan().getStartDate() != null
                        ? post.getPlan().getStartDate().toString()
                        : null,
                post.getPlan() != null && post.getPlan().getEndDate() != null
                        ? post.getPlan().getEndDate().toString()
                        : null,
                post.getPlan() != null ? post.getPlan().getRouteJson() : null,
                post.getPlan() != null && post.getPlan().getForm() != null
                        ? post.getPlan().getForm().getCompanionCount()
                        : null,
                post.getPlan() != null && post.getPlan().getForm() != null
                        ? post.getPlan().getForm().getTravelStyles()
                        : null,
                post.getPlan() != null && post.getPlan().getForm() != null
                        ? post.getPlan().getForm().getTransportType()
                        : null,
                post.getPlan() != null && post.getPlan().getForm() != null
                        ? post.getPlan().getForm().getBudget()
                        : null,

                post.getTitle(),
                post.getContent(),
                post.getStyleTags(),
                post.getLikeCount(),
                post.getViewCount(),
                post.getStatus(),
                post.isPublic(),
                likedByMe,
                scrappedByMe,
                comments.stream().map(CommentInfo::from).toList(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }

    private static String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "ROUTE";
        }

        return switch (category) {
            case "STAY" -> "STAY";
            case "FOOD" -> "FOOD";
            case "TOUR" -> "TOUR";
            case "CAFE" -> "CAFE";
            case "ROUTE" -> "ROUTE";
            default -> "ROUTE";
        };
    }

    private static String getCatLabel(String category) {
        return switch (category) {
            case "STAY" -> "숙소";
            case "FOOD" -> "맛집";
            case "TOUR" -> "관광지";
            case "CAFE" -> "카페";
            default -> "여행 경로";
        };
    }

    private static String getCatClass(String category) {
        return switch (category) {
            case "STAY" -> "cat-stay";
            case "FOOD" -> "cat-food";
            case "TOUR" -> "cat-tour";
            case "CAFE" -> "cat-cafe";
            default -> "cat-route";
        };
    }

    // 댓글 응답 정보
    public record CommentInfo(
            Long commentId,          // 댓글 ID
            Long userId,             // 댓글 작성자 ID
            String writerName,       // 댓글 작성자명
            String content,          // 댓글 내용
            String status,           // 댓글 상태
            LocalDateTime createdAt, // 작성 일시
            LocalDateTime updatedAt  // 수정 일시
    ) {
        public static CommentInfo from(PostComment comment) {
            String writerName = "DELETED".equals(String.valueOf(comment.getUser().getStatus()))
                    ? "탈퇴한 사용자"
                    : comment.getUser().getName();

            return new CommentInfo(
                    comment.getId(),
                    comment.getUser().getId(),
                    writerName,
                    comment.getContent(),
                    comment.getStatus(),
                    comment.getCreatedAt(),
                    comment.getUpdatedAt()
            );
        }
    }
}