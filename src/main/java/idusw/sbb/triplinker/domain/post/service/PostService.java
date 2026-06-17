package idusw.sbb.triplinker.domain.post.service;

import idusw.sbb.triplinker.domain.plan.entity.TravelPlan;
import idusw.sbb.triplinker.domain.plan.repository.TravelPlanRepository;
import idusw.sbb.triplinker.domain.post.dto.PostDetailResponseDto;
import idusw.sbb.triplinker.domain.post.dto.PostListResponseDto;
import idusw.sbb.triplinker.domain.post.dto.PostWriteDto;
import idusw.sbb.triplinker.domain.post.entity.Post;
import idusw.sbb.triplinker.domain.post.entity.PostComment;
import idusw.sbb.triplinker.domain.post.entity.PostLike;
import idusw.sbb.triplinker.domain.post.entity.PostScrap;
import idusw.sbb.triplinker.domain.post.repository.PostCommentRepository;
import idusw.sbb.triplinker.domain.post.repository.PostLikeRepository;
import idusw.sbb.triplinker.domain.post.repository.PostRepository;
import idusw.sbb.triplinker.domain.post.repository.PostScrapRepository;
import idusw.sbb.triplinker.domain.user.entity.User;
import idusw.sbb.triplinker.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;

    private final PostCommentRepository postCommentRepository;
    private final PostScrapRepository postScrapRepository;
    private final UserRepository userRepository;
    private final TravelPlanRepository travelPlanRepository;

    //후기 목록 조회
    public List<PostListResponseDto> getMyPosts(Long userId) {
        return postRepository.findByUserIdAndStatusOrderByIdDesc(userId, "ACTIVE")
                .stream()
                .map(PostListResponseDto::from)
                .collect(Collectors.toList());
    }

    //좋아요한 후기 목록 조회
    public List<PostListResponseDto> getMyLikedPosts(Long userId) {
        return postLikeRepository.findLikedPostsByUserId(userId)
                .stream()
                .map(PostListResponseDto::from)
                .collect(Collectors.toList());
    }

    // 커뮤니티 - 게시글 목록 조회
    public Page<PostListResponseDto> getPosts(Pageable pageable) {
        return postRepository.findByStatusOrderByCreatedAtDesc("ACTIVE", pageable)
                .map(post -> PostListResponseDto.from(
                        post,
                        (int) postScrapRepository.countByPost_Id(post.getId())
                ));
    }

    // 커뮤니티 - 게시글 작성
    @Transactional
    public Long createPost(Long userId, PostWriteDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("해당 유저를 찾을 수 없습니다."));

        TravelPlan plan = null;

        if (dto.getPlanId() != null) {
            plan = travelPlanRepository.findById(dto.getPlanId())
                    .orElseThrow(() -> new IllegalArgumentException("해당 여행 플랜을 찾을 수 없습니다."));
        }

        Post post = Post.builder()
                .user(user)
                .plan(plan)
                .title(dto.getTitle())
                .content(dto.getContent())
                .styleTags(dto.getStyleTags())
                .status("ACTIVE")
                .isPublic(dto.isPublic())
                .build();

        return postRepository.save(post).getId();
    }

    // 커뮤니티 - 게시글 상세 조회
    @Transactional
    public PostDetailResponseDto getPost(Long userId, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        post.increaseViewCount();

        List<PostComment> comments = postCommentRepository
                .findByPostIdAndStatusOrderByCreatedAtAsc(postId, "ACTIVE", Pageable.unpaged())
                .getContent();

        boolean likedByMe = false;
        boolean scrappedByMe = false;

        if (userId != null) {
            likedByMe = postLikeRepository.existsByUserIdAndPostId(userId, postId);
            scrappedByMe = postScrapRepository.existsByUserIdAndPostId(userId, postId);
        }

        return PostDetailResponseDto.from(post, comments, likedByMe, scrappedByMe);
    }

    // 커뮤니티 - 게시글 삭제
    @Transactional
    public void deletePost(Long userId, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        if (!Objects.equals(post.getUser().getId(), userId)) {
            throw new IllegalArgumentException("게시글 삭제 권한이 없습니다.");
        }

        post.delete();
    }

    // 커뮤니티 - 댓글 작성
    @Transactional
    public Long addComment(Long userId, Long postId, PostWriteDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("해당 유저를 찾을 수 없습니다."));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        PostComment comment = PostComment.builder()
                .post(post)
                .user(user)
                .content(dto.getContent())
                .status("ACTIVE")
                .build();

        return postCommentRepository.save(comment).getId();
    }

    // 커뮤니티 - 좋아요 등록
    @Transactional
    public void likePost(Long userId, Long postId) {
        if (postLikeRepository.existsByUserIdAndPostId(userId, postId)) {
            return;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("해당 유저를 찾을 수 없습니다."));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        PostLike postLike = PostLike.builder()
                .user(user)
                .post(post)
                .build();

        postLikeRepository.save(postLike);
        post.increaseLikeCount();
    }

    // 커뮤니티 - 좋아요 취소
    @Transactional
    public void unlikePost(Long userId, Long postId) {
        postLikeRepository.findByUserIdAndPostId(userId, postId)
                .ifPresent(postLike -> {
                    postLikeRepository.delete(postLike);
                    postLike.getPost().decreaseLikeCount();
                });
    }

    // 커뮤니티 - 게시글 스크랩 등록
    @Transactional
    public void scrapPost(Long userId, Long postId, String category) {
        if (postScrapRepository.existsByUserIdAndPostId(userId, postId)) {
            return;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("해당 유저를 찾을 수 없습니다."));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        String scrapCategory = (category == null || category.isBlank()) ? "ROUTE" : category;

        PostScrap postScrap = PostScrap.builder()
                .user(user)
                .post(post)
                .category(scrapCategory)
                .build();

        postScrapRepository.save(postScrap);
    }

    // 커뮤니티 - 게시글 스크랩 취소
    @Transactional
    public void cancelScrap(Long userId, Long postId) {
        postScrapRepository.findByUserIdAndPostId(userId, postId)
                .ifPresent(postScrapRepository::delete);
    }

    // 커뮤니티 - 댓글 목록 조회
    public List<PostDetailResponseDto.CommentInfo> getComments(Long postId) {
        return postCommentRepository
                .findByPostIdAndStatusOrderByCreatedAtAsc(postId, "ACTIVE", Pageable.unpaged())
                .getContent()
                .stream()
                .map(PostDetailResponseDto.CommentInfo::from)
                .collect(Collectors.toList());
    }
}
