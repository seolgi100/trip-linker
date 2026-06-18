package idusw.sbb.triplinker.domain.post.controller;

import idusw.sbb.triplinker.domain.auth.security.CustomUserDetails;
import idusw.sbb.triplinker.domain.post.dto.PostDetailResponseDto;
import idusw.sbb.triplinker.domain.post.dto.PostListResponseDto;
import idusw.sbb.triplinker.domain.post.dto.PostWriteDto;
import idusw.sbb.triplinker.domain.post.service.PostService;
import idusw.sbb.triplinker.domain.system.dto.ReportRequestDto;
import idusw.sbb.triplinker.domain.system.service.SystemService;
import idusw.sbb.triplinker.global.common.ApiResponse;
import idusw.sbb.triplinker.global.service.LocalFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final SystemService systemService;
    private final LocalFileService localFileService;

    // 커뮤니티 - 이미지 업로드
    @PostMapping("/images")
    public ResponseEntity<List<String>> uploadImages(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("files") List<MultipartFile> files
    ) throws IOException {
        List<String> imageUrls = new ArrayList<>();
        for (MultipartFile file : files) {
            imageUrls.add(localFileService.save(file));
        }
        return ResponseEntity.ok(imageUrls);
    }

    // 커뮤니티 - 게시글 목록 조회
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostListResponseDto>>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String category
    ) {
        Pageable pageable = PageRequest.of(page, size);

        Page<PostListResponseDto> posts = postService.getPosts(pageable, category);

        return ResponseEntity.ok(
                ApiResponse.success("게시글 목록 조회 성공", posts)
        );
    }

    // 마이페이지 - 내가 작성한 후기 목록 조회
    @GetMapping("/me")
    public ResponseEntity<List<PostListResponseDto>> getMyPosts(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(postService.getMyPosts(userDetails.getUserId()));
    }

    // 마이페이지 - 좋아요한 후기 목록 조회
    @GetMapping("/liked")
    public ResponseEntity<List<PostListResponseDto>> getMyLikedPosts(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(postService.getMyLikedPosts(userDetails.getUserId()));
    }

    // 커뮤니티 - 게시글 작성
    @PostMapping
    public ResponseEntity<Long> createPost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody PostWriteDto dto
    ) {
        Long postId = postService.createPost(userDetails.getUserId(), dto);
        return ResponseEntity.ok(postId);
    }

    // 커뮤니티 - 게시글 상세 조회
    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostDetailResponseDto>> getPost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long postId
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;

        PostDetailResponseDto post = postService.getPost(userId, postId);

        return ResponseEntity.ok(
                ApiResponse.success("게시글 상세 조회 성공", post)
        );
    }

    // 커뮤니티 - 게시글 삭제
    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long postId
    ) {
        postService.deletePost(userDetails.getUserId(), postId);
        return ResponseEntity.ok().build();
    }

    // 커뮤니티 - 댓글 목록 조회
    @GetMapping("/{postId}/comments")
    public ResponseEntity<List<PostDetailResponseDto.CommentInfo>> getComments(
            @PathVariable Long postId
    ) {
        return ResponseEntity.ok(postService.getComments(postId));
    }

    // 커뮤니티 - 댓글 작성
    @PostMapping("/{postId}/comments")
    public ResponseEntity<Long> addComment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long postId,
            @RequestBody PostWriteDto dto
    ) {
        Long commentId = postService.addComment(userDetails.getUserId(), postId, dto);
        return ResponseEntity.ok(commentId);
    }

    // 커뮤니티 - 좋아요 등록
    @PostMapping("/{postId}/likes")
    public ResponseEntity<Void> likePost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long postId
    ) {
        postService.likePost(userDetails.getUserId(), postId);
        return ResponseEntity.ok().build();
    }

    // 커뮤니티 - 좋아요 취소
    @DeleteMapping("/{postId}/likes")
    public ResponseEntity<Void> unlikePost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long postId
    ) {
        postService.unlikePost(userDetails.getUserId(), postId);
        return ResponseEntity.ok().build();
    }

    // 커뮤니티 - 게시글 스크랩 등록
    @PostMapping("/{postId}/scraps")
    public ResponseEntity<Void> scrapPost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long postId,
            @RequestParam(required = false, defaultValue = "ROUTE") String category
    ) {
        postService.scrapPost(userDetails.getUserId(), postId, category);
        return ResponseEntity.ok().build();
    }

    // 커뮤니티 - 게시글 스크랩 취소
    @DeleteMapping("/{postId}/scraps")
    public ResponseEntity<Void> cancelScrap(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long postId
    ) {
        postService.cancelScrap(userDetails.getUserId(), postId);
        return ResponseEntity.ok().build();
    }

    // 커뮤니티 - 게시글 신고 접수
    @PostMapping("/{postId}/reports")
    public ResponseEntity<Long> reportPost(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long postId,
            @RequestBody ReportRequestDto dto
    ) {
        ReportRequestDto reportDto = new ReportRequestDto(postId, dto.getReason());
        Long reportId = systemService.reportPost(userDetails.getUserId(), reportDto);
        return ResponseEntity.ok(reportId);
    }
}