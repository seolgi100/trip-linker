package idusw.sbb.triplinker.domain.auth.service;

import idusw.sbb.triplinker.domain.auth.dto.LoginRequestDto;
import idusw.sbb.triplinker.domain.auth.dto.TokenResponseDto;
import idusw.sbb.triplinker.domain.auth.entity.RefreshToken;
import idusw.sbb.triplinker.domain.auth.repository.RefreshTokenRepository;
import idusw.sbb.triplinker.domain.user.entity.User;
import idusw.sbb.triplinker.domain.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public TokenResponseDto login(LoginRequestDto request) {

        //1. 유저 조회
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이디입니다."));

        //2. 계정 잠금 상태 확인
        if ("SUSPENDED".equals(user.getStatus())) {
            throw new IllegalArgumentException("비밀번호 5회 오류로 잠긴 계정입니다. 비밀번호 재설정을 이용해 주세요.");
        }

        //3. 비밀번호 검증 (DB의 해시값과 입력한 비번 비교)
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            //상연님 연동 - 로그인 실패 카운트 증가
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        //4. 로그인 성공
        //상연님 연동 - 실패 카운트 초기화 및 성공 이력 저장

        //5. 토큰 발급
        String accessToken = jwtProvider.createAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtProvider.createRefreshToken(user.getId());

        //6. Refresh Token 해싱 후 DB 저장 (기존 토큰 지우고 새로 저장)
        refreshTokenRepository.deleteByUserId(user.getId());

        String hashedRefreshToken = hashSha256(refreshToken);
        RefreshToken tokenEntity = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hashedRefreshToken)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        refreshTokenRepository.save(tokenEntity);

        //7. 90일 비밀번호 변경 권장 체크
        boolean isPasswordChangeRecommended = false;
        if (user.getPasswordUpdatedAt() != null) {
            long daysSinceLastUpdate = ChronoUnit.DAYS.between(user.getPasswordUpdatedAt(), LocalDateTime.now());
            if (daysSinceLastUpdate >= 90) {
                isPasswordChangeRecommended = true;
            }
        }

        //8. 최종 응답 반환
        return new TokenResponseDto(accessToken, refreshToken, isPasswordChangeRecommended);

    }


    private String hashSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) hex.append('0');
                hex.append(h);
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("토큰 해싱 중 오류가 발생했습니다.", e);
        }
    }
}
