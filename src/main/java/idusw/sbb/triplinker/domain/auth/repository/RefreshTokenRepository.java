package idusw.sbb.triplinker.domain.auth.repository;

import idusw.sbb.triplinker.domain.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    //나중에 필요하면 쓸 수 있게 유저 아이디로 토큰 찾는 기능 하나 추가
    void deleteByUserId(Long userId);
}
