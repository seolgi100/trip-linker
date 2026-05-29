package idusw.sbb.triplinker.domain.auth.service;

import idusw.sbb.triplinker.domain.auth.entity.OAuthAccount;
import idusw.sbb.triplinker.domain.auth.repository.OAuthAccountRepository;
import idusw.sbb.triplinker.domain.auth.security.CustomUserDetails;
import idusw.sbb.triplinker.domain.user.entity.User;
import idusw.sbb.triplinker.domain.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final OAuthAccountRepository oauthAccountRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        //1. 구글/카카오에서 보낸 유저 정보 가져오기
        OAuth2User oAuth2User = super.loadUser(userRequest);

        //2. 어디서 왔는지(google, kakao) 확인
        String provider = userRequest.getClientRegistration().getRegistrationId();

        //3. 소셜 고유 ID 추출 (구글은 'sub', 카카오는 'id' 라는 이름으로 줍니다)
        String providerId = extractProviderId(provider, oAuth2User.getAttributes());

        //4. OAuthAccount에 있는 사람인지 확인하고, 없으면 자동 회원가입
        OAuthAccount oauthAccount = oauthAccountRepository.findByProviderAndProviderId(provider, providerId)
                .orElseGet(() -> registerNewOAuthUser(provider, providerId));

        //5. User 테이블에서 이 사람의 회원 정보 가져오기
        User user = userRepository.findById(oauthAccount.getUserId())
                .orElseThrow(() -> new IllegalStateException("소셜 계정과 연결된 유저를 찾을 수 없습니다."));

        //6. CustomUserDetails를 만들어서 시큐리티에 전달
        return new CustomUserDetails(user, oAuth2User.getAttributes());
    }

    //구글과 카카오의 데이터 규격이 달라서, 고유 ID만 예쁘게 잘라내는 보조 메서드
    private String extractProviderId(String provider, Map<String, Object> attributes) {
        if ("google".equals(provider)) {
            return String.valueOf(attributes.get("sub"));
        } else if ("kakao".equals(provider)) {
            return String.valueOf(attributes.get("id"));
        }
        throw new OAuth2AuthenticationException("지원하지 않는 소셜 로그인입니다: " + provider);
    }

    //처음 온 소셜 유저 "강제 자동 회원가입" 로직
    private OAuthAccount registerNewOAuthUser(String provider, String providerId) {
        //1. User 테이블에 넣을 임시 아이디 생성 (예: kakao_123456789)
        String dummyUsername = provider + "_" + providerId;

        //2. User 테이블에 회원가입(소셜은 비밀번호가 없으니 UUID로 쓰레기값 넣기)
        User newUser = User.builder()
                .username(dummyUsername)
                .passwordHash(UUID.randomUUID().toString()) //절대 로그인할 수 없는 쓰레기 암호
                .role("USER")
                .status("ACTIVE")
                .build();
        userRepository.save(newUser);

        //3. OAuth 장부에도 기록
        OAuthAccount newAccount = OAuthAccount.builder()
                .userId(newUser.getId())
                .provider(provider)
                .providerId(providerId)
                .build();
        return oauthAccountRepository.save(newAccount);
    }
}