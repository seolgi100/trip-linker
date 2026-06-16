package idusw.sbb.triplinker.domain.post.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PostWriteDto {

    // 여행 플랜 연동 작성 시 사용
    private Long planId;

    // 게시글 제목
    private String title;

    // 게시글 본문 또는 댓글 내용
    // 게시글 작성 시: 본문
    // 댓글 작성 시: 댓글 내용
    private String content;

    // 여행 취향 태그(JSON 문자열)
    private String styleTags;

    // 공개 여부
    private boolean isPublic = true;
}