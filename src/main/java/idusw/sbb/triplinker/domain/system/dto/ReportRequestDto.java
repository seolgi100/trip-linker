package idusw.sbb.triplinker.domain.system.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReportRequestDto {

    // 신고 대상 게시글 ID
    private Long postId;

    // 신고 사유
    private String reason;

    public ReportRequestDto(Long postId, String reason) {
        this.postId = postId;
        this.reason = reason;
    }
}