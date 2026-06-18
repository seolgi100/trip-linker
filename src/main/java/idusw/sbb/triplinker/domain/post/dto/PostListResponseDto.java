package idusw.sbb.triplinker.domain.post.dto;

import idusw.sbb.triplinker.domain.post.entity.Post;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

public record PostListResponseDto(
        Long postId,
        String category,
        String catLabel,
        String catClass,
        String title,
        String writerName,
        LocalDateTime createdAt,
        List<String> styleTags,
        int likes,
        int scraps,
        int views
) {
    public static PostListResponseDto from(Post post) {
        return from(post, 0);
    }

    public static PostListResponseDto from(Post post, int scraps) {
        String category = normalizeCategory(post.getCategory());

        return new PostListResponseDto(
                post.getId(),
                category,
                getCatLabel(category),
                getCatClass(category),
                post.getTitle(),
                post.getUser() != null ? post.getUser().getName() : "사용자",
                post.getCreatedAt(),
                parseStyleTags(post.getStyleTags()),
                post.getLikeCount(),
                scraps,
                post.getViewCount()
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

    private static List<String> parseStyleTags(String styleTags) {
        if (styleTags == null || styleTags.isBlank()) {
            return List.of();
        }

        return Arrays.stream(styleTags.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .toList();
    }
}