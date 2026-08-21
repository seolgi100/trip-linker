package idusw.sbb.triplinker;

import idusw.sbb.triplinker.domain.auth.dto.LoginRequestDto;
import idusw.sbb.triplinker.domain.auth.service.AuthService;
import idusw.sbb.triplinker.domain.user.entity.SecurityEventType;
import idusw.sbb.triplinker.domain.user.entity.User;
import idusw.sbb.triplinker.domain.user.entity.UserSecurityHistory;
import idusw.sbb.triplinker.domain.user.repository.UserRepository;
import idusw.sbb.triplinker.domain.user.repository.UserSecurityHistoryRepository;
import idusw.sbb.triplinker.global.exception.LoginFailException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional // 테스트가 끝나면 DB 데이터를 자동으로 롤백해줍니다.
public class UserSecurityServiceTest {

    @Autowired
    private AuthService authService; // 실제 로그인 경로를 그대로 검증한다

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSecurityHistoryRepository historyRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    private final String TARGET_USERNAME = "sangyeon123";
    private final String CORRECT_PASSWORD = "Correct123!";

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .username(TARGET_USERNAME)
                .passwordHash(passwordEncoder.encode(CORRECT_PASSWORD))
                .name("정상연")
                .email("sangyeon@triplinker.com")
                .region("서울")
                .status("ACTIVE")       // 초기 상태는 ACTIVE
                .role("USER")
                .build();
        userRepository.save(user);
    }

    @Test
    @DisplayName("로그인 5회 실패 시 5분간 계정이 잠기고, 보안 이력 테이블에 실패 이력이 누적된다.")
    void login_FiveTimes_WrongPassword_ShouldLockAccountAndRecordHistory() {
        // Given: 테스트용 가상 IP
        String clientIp = "127.0.0.1";
        LoginRequestDto wrongRequest = new LoginRequestDto(TARGET_USERNAME, "WrongPassword!");

        // When: 실제 로그인 API가 호출하는 AuthService.login()을 5번 실패시킨다
        for (int i = 1; i <= 5; i++) {
            assertThrows(LoginFailException.class,
                    () -> authService.login(wrongRequest, clientIp),
                    "비밀번호가 틀리면 LoginFailException이 발생해야 합니다.");
        }

        // Then 1: 유저 정보 검증 (실패 횟수가 5가 되었고 lockedUntil이 설정되었는지)
        User updatedUser = userRepository.findByUsername(TARGET_USERNAME)
                .orElseThrow(() -> new AssertionError("유저를 찾을 수 없습니다."));

        assertEquals(5, updatedUser.getLoginFailCount(), "로그인 실패 횟수는 5회여야 합니다.");
        assertTrue(updatedUser.isLocked(), "5회 실패 시 isLocked()가 true를 반환해야 합니다.");
        assertNotNull(updatedUser.getLockedUntil(), "계정 잠금 해제 시간(lockedUntil)이 설정되어야 합니다.");

        // Then 2: UserSecurityHistory 이력 테이블 검증
        List<UserSecurityHistory> loginFailHistories =
                historyRepository.findByUserIdOrderByCreatedAtDesc(updatedUser.getId())
                        .stream()
                        .filter(h -> h.getEventType() == SecurityEventType.LOGIN_FAIL)
                        .toList();

        assertEquals(5, loginFailHistories.size(), "실패 횟수만큼 LOGIN_FAIL 이력이 쌓여야 합니다.");

        // 가장 최근 이력에 IP가 남아있는지 확인 (엔티티에 ip 필드가 없어 description으로 검증)
        UserSecurityHistory latestHistory = loginFailHistories.get(0);
        assertTrue(latestHistory.getDescription().contains(clientIp),
                "기록된 설명(description)에 IP가 포함되어야 합니다.");
    }
}
