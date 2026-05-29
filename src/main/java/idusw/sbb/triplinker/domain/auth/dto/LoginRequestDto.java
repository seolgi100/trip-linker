package idusw.sbb.triplinker.domain.auth.dto;

public record LoginRequestDto (
        String username,
        String password
) {}