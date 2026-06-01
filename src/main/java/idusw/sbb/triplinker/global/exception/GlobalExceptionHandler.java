package idusw.sbb.triplinker.global.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SocialAccountExistException.class)
    public ResponseEntity<Map<String, String>> handleSocialAccountExistException(SocialAccountExistException ex) {

        Map<String, String> errorResponse = new HashMap<>();

        //프론트엔드가 에러 종류를 식별할 수 있는 암호(코드)
        errorResponse.put("code", "SOCIAL_ACCOUNT_EXIST");
        errorResponse.put("message", ex.getMessage()); //"이미 소셜 계정으로 가입된 이메일입니다."
        errorResponse.put("provider", ex.getProvider()); //"kakao" 또는 "google"

        //409 Conflict (충돌) 상태 코드 응답
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }
}
