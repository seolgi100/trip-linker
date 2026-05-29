package idusw.sbb.triplinker.domain.auth.dto;

public record TokenResponseDto(
        String accessToken,
        String refreshToken,
        boolean isPasswordChangeRecommended //90일 비번 변경 팝업용
) {}