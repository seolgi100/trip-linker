package idusw.sbb.triplinker.domain.post.dto;

import idusw.sbb.triplinker.domain.post.entity.Post;

import java.time.LocalDateTime;

public record PostListResponseDto(
        Long postId,
        String catLabel,
        String catClass,
        String title,
        String writerName,
        LocalDateTime createdAt,
        String styleTags,
        int likes,
        int scraps,
        int views
) {
    public static PostListResponseDto from(Post post) {
        return from(post, 0);
    }

    public static PostListResponseDto from(Post post, int scraps) {
        return new PostListResponseDto(
                post.getId(),
                "여행 경로",
                "cat-route",
                post.getTitle(),
                post.getUser() != null
                        ? post.getUser().getName()
                        : "사용자",
                post.getCreatedAt(),
                post.getStyleTags(),
                post.getLikeCount(),
                scraps,
                post.getViewCount()
        );
    }
}