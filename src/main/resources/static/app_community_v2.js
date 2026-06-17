/* =============================================================================
 * community v2 - 후기 상세 버튼 보완
 * 목적:
 * - 기존 HTML(page_place.html)의 onclick 함수 연결 보완
 * - 기존 app_community.js 수정 없이 좋아요/스크랩/신고 기능 연결
 * ============================================================================= */

(function () {
    'use strict';

    /*
     * 기존 openPostDetail(postId)이 있으면 감싸서 postId를 전역에 저장한다.
     * 이렇게 해야 상세 화면에서 좋아요/스크랩/신고 버튼이 현재 게시글 번호를 알 수 있다.
     */
    const originalOpenPostDetail = window.openPostDetail;

    if (typeof originalOpenPostDetail === 'function') {
        window.openPostDetail = async function (postId) {
            window._currentPostId = postId;
            return originalOpenPostDetail.apply(this, arguments);
        };
    }

    /*
     * 현재 상세 화면의 게시글 ID 가져오기
     */
    function getCurrentPostId() {
        if (window._currentPostId) return window._currentPostId;
        if (window._openedPostId) return window._openedPostId;

        // 마지막 보조 수단: 상세 제목이 보이는 상태에서 id가 없으면 null
        return null;
    }

    /*
     * 로그인 확인
     */
    function requireLoginForCommunityAction() {
        if (typeof Token === 'undefined' || !Token.getAccess || !Token.getAccess()) {
            if (typeof toast === 'function') toast('로그인이 필요합니다.');
            if (typeof go === 'function') go('login');
            return false;
        }
        return true;
    }

    /*
     * 좋아요
     * HTML: onclick="doReviewLike()"
     */
    window.doReviewLike = async function () {
        if (!requireLoginForCommunityAction()) return;

        const postId = getCurrentPostId();
        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            console.warn('[community-v2] current postId 없음');
            return;
        }

        const res = await api.post(`/api/posts/${postId}/likes`, {});

        if (res && res.success !== false) {
            if (typeof toast === 'function') toast('좋아요를 눌렀습니다.');
            refreshCurrentReview(postId);
        } else {
            if (typeof toast === 'function') toast(res?.message || '좋아요 처리에 실패했습니다.');
        }
    };

    /*
     * 스크랩
     * HTML: onclick="doReviewScrap()"
     */
    window.doReviewScrap = async function () {
        if (!requireLoginForCommunityAction()) return;

        const postId = getCurrentPostId();
        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            console.warn('[community-v2] current postId 없음');
            return;
        }

        const res = await api.post(`/api/posts/${postId}/scraps?category=ROUTE`, {});

        if (res && res.success !== false) {
            if (typeof toast === 'function') toast('스크랩했습니다.');
            refreshCurrentReview(postId);
        } else {
            if (typeof toast === 'function') toast(res?.message || '스크랩 처리에 실패했습니다.');
        }
    };

    /*
     * 신고
     * HTML: onclick="doReviewReport()"
     */
    window.doReviewReport = async function () {
        if (!requireLoginForCommunityAction()) return;

        const postId = getCurrentPostId();
        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            console.warn('[community-v2] current postId 없음');
            return;
        }

        const reason = prompt('신고 사유를 입력해주세요.');
        if (!reason || !reason.trim()) return;

        const res = await api.post(`/api/posts/${postId}/reports`, {
            postId: postId,
            reason: reason.trim()
        });

        if (res && res.success !== false) {
            if (typeof toast === 'function') toast('신고가 접수되었습니다.');
        } else {
            if (typeof toast === 'function') toast(res?.message || '신고 처리에 실패했습니다.');
        }
    };

    /*
     * 상세 정보 새로고침
     */
    async function refreshCurrentReview(postId) {
        if (typeof window.openPostDetail === 'function') {
            await window.openPostDetail(postId);
        }
    }
})();

/* =============================================================================
 * community v2 - 목록 카드 스크랩 함수 보완
 * 목적:
 * - 기존 app_community.js의 scrapPost(e, postId)를 직접 수정하지 않고 덮어쓰기
 * - HTTP 200 + 빈 응답 또는 success 필드 누락도 성공으로 처리
 * - category=ROUTE 파라미터를 명시적으로 전달
 * ============================================================================= */

(function () {
    'use strict';

    window.scrapPost = async function (e, postId) {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }

        if (typeof Token === 'undefined' || !Token.getAccess || !Token.getAccess()) {
            if (typeof toast === 'function') toast('로그인이 필요합니다.');
            if (typeof go === 'function') go('login');
            return;
        }

        if (typeof _isSuspended !== 'undefined' && _isSuspended) {
            if (typeof toast === 'function') toast('⛔ 해당 계정은 커뮤니티 기능이 제한되었습니다.');
            return;
        }

        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            console.warn('[community-v2] scrapPost postId 없음');
            return;
        }

        const res = await api.post(`/api/posts/${postId}/scraps?category=ROUTE`, {});

        /*
         * 정상 처리 기준:
         * 1) res.success === true
         * 2) 응답 body가 비어 있음 {}
         * 3) success 필드가 없지만 HTTP 200으로 apiCall이 정상 반환한 경우
         */
        const isEmptyResponse =
            res &&
            typeof res === 'object' &&
            Object.keys(res).length === 0;

        const isSuccessLike =
            res &&
            res.success !== false;

        if (isEmptyResponse || isSuccessLike) {
            const el = document.getElementById('scrap-cnt-' + postId);
            if (el) {
                const n = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
                el.textContent = '🔖 ' + (n + 1);
            }

            if (typeof toast === 'function') toast('스크랩했습니다.');
            return;
        }

        if (typeof toast === 'function') {
            toast(res?.message || '스크랩 처리에 실패했습니다.');
        }
    };
})();

/* =============================================================================
 * community v2 - 게시글 상세 렌더링 보완
 * 목적:
 * - GET /api/posts/{postId} 응답은 정상인데 화면에 제목/본문이 안 들어가는 문제 해결
 * - 기존 page_place.html 구조를 유지하고 id 기반으로 값만 주입
 * - 기존 app_community.js, page_place.html 수정 없이 새 파일에서 보완
 * ============================================================================= */

(function () {
    'use strict';

    /*
     * XSS 방지용 기본 escape
     */
    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    /*
     * styleTags가 JSON 문자열("[\"가성비\", \"힐링\"]")이든
     * 쉼표 문자열("가성비,힐링")이든 배열로 변환
     */
    function parseStyleTags(styleTags) {
        if (!styleTags) return [];

        if (Array.isArray(styleTags)) return styleTags;

        try {
            const parsed = JSON.parse(styleTags);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // JSON이 아니면 쉼표 문자열로 처리
        }

        return String(styleTags)
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
    }

    /*
     * 날짜 표시
     */
    function formatDate(value) {
        if (!value) return '';
        try {
            return String(value).replace('T', ' ').slice(0, 16);
        } catch (e) {
            return '';
        }
    }

    /*
     * 요소 textContent 안전 세팅
     */
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? '';
    }

    /*
     * 요소 innerHTML 안전 세팅
     */
    function setHtml(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html ?? '';
    }

    /*
     * 댓글 렌더링
     */
    function renderReviewComments(comments) {
        const box = document.getElementById('pr-comments');
        if (!box) return;

        const list = Array.isArray(comments) ? comments : [];

        const commentItems = list.length
            ? list.map(c => `
                <div class="comment-item">
                    <div>
                        <span class="comment-writer">${escapeHtml(c.writerName || '사용자')}</span>
                        <span class="comment-date">${escapeHtml(formatDate(c.createdAt))}</span>
                    </div>
                    <div class="comment-content">${escapeHtml(c.content || '')}</div>
                </div>
            `).join('')
            : `<div style="padding:12px 0;color:var(--text3);font-size:13px">아직 댓글이 없습니다.</div>`;

        box.innerHTML = `
            <h3>댓글</h3>
            <div style="display:flex;gap:8px;margin-bottom:14px">
                <input id="commentInput"
                       type="text"
                       placeholder="댓글을 입력하세요..."
                       style="flex:1;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border2);font-size:13px">
                <button class="btn-f" onclick="submitComment()">등록</button>
            </div>
            <div id="commentList">
                ${commentItems}
            </div>
        `;
    }

    /*
     * 플랜 연동 정보 렌더링
     */
    function renderLinkedPlan(post) {
        const badge = document.getElementById('pr-plan-badge');
        const placeList = document.getElementById('pr-place-list');

        if (!badge) return;

        if (!post.planId) {
            badge.style.display = 'none';
            if (placeList) placeList.style.display = 'none';
            return;
        }

        badge.style.display = 'block';
        badge.innerHTML = `
            <strong>연동된 플랜</strong><br>
            ${escapeHtml(post.planTitle || '제목 없는 플랜')}
            ${post.planDestination ? ` · ${escapeHtml(post.planDestination)}` : ''}
        `;

        if (placeList) {
            placeList.style.display = 'block';
            placeList.innerHTML = `
                <div class="route-preview-card">
                    <div class="route-preview-title">${escapeHtml(post.planTitle || '연동된 여행 플랜')}</div>
                    <div class="route-preview-meta">
                        ${escapeHtml(post.planStartDate || '')}
                        ${post.planEndDate ? ` ~ ${escapeHtml(post.planEndDate)}` : ''}
                    </div>
                </div>
            `;
        }
    }

    /*
     * 상세 화면 전체 렌더링
     */
    function renderPostDetail(post) {
        if (!post) return;

        window._currentPostId = post.postId;
        window._openedPostId = post.postId;

        const tags = parseStyleTags(post.styleTags);

        setText('pr-title', post.title || '');
        setText('pr-author-name', post.writerName || '사용자');
        setText('pr-author-av', (post.writerName || 'U').substring(0, 1));

        setText('pr-cat', '여행 후기');
        setText('pr-tag', tags.length ? '#' + tags[0] : '#커뮤니티');

        setHtml('pr-meta', `
            <span>조회 ${escapeHtml(post.viewCount ?? 0)}</span>
            <span>좋아요 ${escapeHtml(post.likeCount ?? 0)}</span>
            ${post.createdAt ? `<span>${escapeHtml(formatDate(post.createdAt))}</span>` : ''}
        `);

        const tagHtml = tags.length
            ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
                    ${tags.map(tag => `<span class="post-cat" style="background:var(--sage-pale);color:var(--sage-d)">#${escapeHtml(tag)}</span>`).join('')}
               </div>`
            : '';

        setHtml('pr-body', `
            ${tagHtml}
            <div style="white-space:pre-wrap;line-height:1.8;color:var(--text2);font-size:15px">
                ${escapeHtml(post.content || '')}
            </div>
        `);

        renderLinkedPlan(post);
        renderReviewComments(post.comments);

        const ctaSub = document.getElementById('pr-cta-sub');
        if (ctaSub) {
            ctaSub.textContent = post.planTitle
                ? `${post.planTitle} 플랜을 기반으로 새 여행을 계획할 수 있습니다.`
                : '';
        }

        const editBtn = document.getElementById('btn-review-edit');
        if (editBtn && typeof _currentUser !== 'undefined' && _currentUser && _currentUser.userId === post.userId) {
            editBtn.style.display = 'inline-flex';
        }
    }

    /*
     * 상세 조회 + 렌더링
     * 기존 openPostDetail을 완전히 보완한다.
     */
    window.openPostDetail = async function (postId) {
        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        window._currentPostId = postId;
        window._openedPostId = postId;

        if (typeof go === 'function') {
            go('review');
        }

        setText('pr-title', '');
        setHtml('pr-body', '<div style="text-align:center;padding:40px;color:var(--text3)">불러오는 중...</div>');

        const res = await api.get(`/api/posts/${postId}`);

        if (!res || res.success === false || !res.data) {
            setHtml('pr-body', '<div style="text-align:center;padding:40px;color:var(--coral)">게시글을 불러오지 못했습니다.</div>');
            if (typeof toast === 'function') toast(res?.message || '게시글 조회에 실패했습니다.');
            return;
        }

        renderPostDetail(res.data);
    };

    /*
     * 댓글 작성
     * HTML: onclick="submitComment()"
     */
    window.submitComment = async function () {
        const postId = window._currentPostId || window._openedPostId;
        const input = document.getElementById('commentInput');
        const content = input ? input.value.trim() : '';

        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        if (typeof Token === 'undefined' || !Token.getAccess || !Token.getAccess()) {
            if (typeof toast === 'function') toast('로그인이 필요합니다.');
            if (typeof go === 'function') go('login');
            return;
        }

        if (!content) {
            if (typeof toast === 'function') toast('댓글을 입력해주세요.');
            return;
        }

        const res = await api.post(`/api/posts/${postId}/comments`, {
            content: content
        });

        if (res && res.success !== false) {
            if (typeof toast === 'function') toast('댓글이 등록되었습니다.');
            await window.openPostDetail(postId);
        } else {
            if (typeof toast === 'function') toast(res?.message || '댓글 등록에 실패했습니다.');
        }
    };
})();

/* =============================================================================
 * community v2 - 게시글 작성 함수 보완
 * 목적:
 * - styleTags 배열 전송으로 인한 JSON parse error 해결
 * - 백엔드 PostWriteDto.styleTags(String)에 맞춰 문자열로 전송
 * - 기존 app_community.js 수정 없이 submitReview만 덮어쓰기
 * =============================================================================
 */

(function () {
    'use strict';

    window.submitReview = async function () {

        if (typeof _isSuspended !== 'undefined' && _isSuspended) {
            if (typeof toast === 'function') {
                toast('⛔ 해당 계정은 커뮤니티 기능이 제한되었습니다.');
            }
            return;
        }

        if (typeof Token === 'undefined' || !Token.getAccess || !Token.getAccess()) {
            if (typeof toast === 'function') {
                toast('로그인이 필요합니다.');
            }

            if (typeof go === 'function') {
                go('login');
            }
            return;
        }

        const titleEl = document.getElementById('writeTitle');
        const editorEl = document.getElementById('blogEditor');
        const tagsEl = document.getElementById('writeTags');
        const publicEl = document.getElementById('writePublic');

        const title = titleEl ? titleEl.value.trim() : '';
        const content = editorEl
            ? (editorEl.innerText || editorEl.value || '').trim()
            : '';

        const plainContent = content;
        const tagText = tagsEl ? tagsEl.value.trim() : '';

        // PostWriteDto.styleTags는 String 타입
        // 예: "테스트,커뮤니티"
        const styleTags = tagText
            .split(/[\s,]+/)
            .map(v => v.trim())
            .filter(Boolean)
            .join(',');

        const isPublic = publicEl ? !!publicEl.checked : true;

        if (!title || !plainContent) {
            if (typeof toast === 'function') {
                toast('제목과 내용을 입력해주세요.');
            }
            return;
        }

        const body = {
            planId: document.getElementById('writePlanId')?.value
                ? Number(document.getElementById('writePlanId').value)
                : null,
            title: title,
            content: content,
            styleTags: styleTags,
            isPublic: isPublic
        };

        const res = await api.post('/api/posts', body);

        // PostController.createPost는 Long postId 반환
        const success =
            typeof res === 'number' ||
            res?.success === true ||
            typeof res?.data === 'number';

        if (success) {
            if (typeof closeWrite === 'function') {
                closeWrite();
            }

            if (typeof toast === 'function') {
                toast('후기가 등록되었습니다! 🎉');
            }

            if (typeof loadCommunityPosts === 'function') {
                await loadCommunityPosts(0, true);
            }

            if (typeof go === 'function') {
                go('community');
            }

            return;
        }

        if (typeof toast === 'function') {
            toast(res?.message || '게시글 등록에 실패했습니다.');
        }
    };

})();

/* =============================================================================
 * community v2 - 플랜 연동 select 중복 제거 보완
 * 목적:
 * - 기존 후기 작성 모달에 있던 플랜 연동 select를 그대로 사용
 * - 우리가 추가했던 writePlanWrap 중복 영역 제거
 * - select 옵션만 /api/trips 결과로 채우기
 * ============================================================================= */

(function () {
    'use strict';

    function extractArray(res) {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.data?.content)) return res.data.content;
        if (Array.isArray(res?.content)) return res.content;
        return [];
    }

    function getTripId(trip) {
        return trip.tripId || trip.planId || trip.id || trip.travelPlanId;
    }

    function getTripTitle(trip) {
        return (
            trip.title ||
            trip.planTitle ||
            trip.destination ||
            trip.name ||
            `여행계획 #${getTripId(trip)}`
        );
    }

    async function loadWritePlanOptions(select) {
        if (!select) return;

        select.innerHTML = `<option value="">플랜을 선택하지 않음</option>`;

        try {
            const res = await api.get('/api/trips');
            const trips = extractArray(res);

            if (!trips.length) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = '연동 가능한 플랜이 없습니다';
                opt.disabled = true;
                select.appendChild(opt);
                return;
            }

            trips.forEach(trip => {
                const id = getTripId(trip);
                if (!id) return;

                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = getTripTitle(trip);
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('[community-v2] 플랜 목록 조회 실패:', e);
            if (typeof toast === 'function') toast('플랜 목록을 불러오지 못했습니다.');
        }
    }

    window.injectWritePlanSelect = async function () {
        const titleEl = document.getElementById('writeTitle');
        if (!titleEl) {
            console.warn('[community-v2] writeTitle을 찾지 못했습니다.');
            return;
        }

        const modal =
            titleEl.closest('.modal') ||
            titleEl.closest('.overlay') ||
            titleEl.closest('div') ||
            document.body;

        /*
         * 이전 코드가 만든 중복 영역 제거
         */
        const duplicatedWrap = document.getElementById('writePlanWrap');
        if (duplicatedWrap) {
            duplicatedWrap.remove();
        }

        /*
         * 기존 HTML 안에 있던 플랜 select 찾기
         * - 후기 작성 모달 내부 select 중에서
         * - 지역 선택용 loc-big은 제외
         */
        let select = document.getElementById('writePlanId');

        if (!select) {
            const candidates = [...modal.querySelectorAll('select')]
                .filter(s => !s.classList.contains('loc-big'));

            select = candidates[0];
        }

        /*
         * 기존 select가 없을 때만 새로 만든다.
         * 보통은 여기까지 안 옴.
         */
        if (!select) {
            const wrap = document.createElement('div');
            wrap.style.marginTop = '14px';
            wrap.style.marginBottom = '14px';

            wrap.innerHTML = `
                <label style="display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text2)">
                    플랜 연동 (선택)
                </label>
                <select id="writePlanId"
                        style="width:100%;padding:11px 12px;border-radius:10px;border:1.5px solid var(--border2);background:#fff;color:var(--text1);font-size:13px">
                    <option value="">플랜을 선택하지 않음</option>
                </select>
            `;

            titleEl.insertAdjacentElement('afterend', wrap);
            select = document.getElementById('writePlanId');
        }

        /*
         * 기존 select를 우리가 submitReview에서 읽을 수 있도록 id 부여
         */
        select.id = 'writePlanId';

        await loadWritePlanOptions(select);
    };
})();

/* =============================================================================
 * community v2 - 후기 작성 이미지 첨부 버튼 보완
 * 목적:
 * - 기존 HTML의 onclick="toast('이미지 업로드')" 버튼을 직접 수정하지 않고 덮어쓰기
 * - 사진 첨부 클릭 시 파일 선택창 열기
 * - 선택한 이미지를 작성 에디터에 미리보기로 삽입
 * 주의:
 * - 현재 단계는 프론트 미리보기 중심
 * - 실제 서버 이미지 저장은 별도 이미지 업로드 API가 필요할 수 있음
 * ============================================================================= */

(function () {
    'use strict';

    window._communitySelectedImages = window._communitySelectedImages || [];

    function findImageButton() {
        return [...document.querySelectorAll('button')]
            .find(btn => btn.innerText && btn.innerText.includes('사진 첨부'));
    }

    function getEditor() {
        return document.getElementById('blogEditor');
    }

    function ensureImageInput() {
        let input = document.getElementById('communityImageInput');

        if (!input) {
            input = document.createElement('input');
            input.id = 'communityImageInput';
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.style.display = 'none';
            document.body.appendChild(input);

            input.addEventListener('change', handleImageSelect);
        }

        return input;
    }

    function handleImageSelect(e) {
        const files = [...(e.target.files || [])];

        if (!files.length) return;

        const editor = getEditor();

        if (!editor) {
            if (typeof toast === 'function') toast('본문 입력창을 찾을 수 없습니다.');
            return;
        }

        files.forEach(file => {
            if (!file.type.startsWith('image/')) {
                if (typeof toast === 'function') toast('이미지 파일만 첨부할 수 있습니다.');
                return;
            }

            const reader = new FileReader();

            reader.onload = function (event) {
                const dataUrl = event.target.result;

                window._communitySelectedImages.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: dataUrl
                });

                const img = document.createElement('img');
                img.src = dataUrl;
                img.alt = file.name;
                img.style.maxWidth = '100%';
                img.style.borderRadius = '10px';
                img.style.margin = '10px 0';
                img.style.display = 'block';

                editor.appendChild(img);

                const br = document.createElement('br');
                editor.appendChild(br);
            };

            reader.readAsDataURL(file);
        });

        if (typeof toast === 'function') toast('이미지를 첨부했습니다.');

        // 같은 파일을 다시 선택할 수 있도록 초기화
        e.target.value = '';
    }

    window.bindCommunityImageButton = function () {
        const btn = findImageButton();

        if (!btn) {
            console.warn('[community-v2] 사진 첨부 버튼을 찾지 못했습니다.');
            return;
        }

        btn.onclick = function (e) {
            if (e) e.preventDefault();

            const input = ensureImageInput();
            input.click();
        };
    };

    /*
     * 후기 작성 버튼을 눌러 모달이 열린 뒤 사진 버튼을 다시 연결한다.
     * checkAndOpenWrite는 이미 이전 코드에서 감싸져 있을 수 있으므로 한 번 더 안전하게 감싼다.
     */
    const prevCheckAndOpenWriteForImage = window.checkAndOpenWrite;

    if (typeof prevCheckAndOpenWriteForImage === 'function') {
        window.checkAndOpenWrite = function () {
            const result = prevCheckAndOpenWriteForImage.apply(this, arguments);

            setTimeout(function () {
                if (typeof window.injectWritePlanSelect === 'function') {
                    window.injectWritePlanSelect();
                }

                window.bindCommunityImageButton();
            }, 200);

            return result;
        };
    }

    /*
     * 이미 모달이 열려 있는 상태에서 새로고침 없이 테스트할 수 있도록 수동 호출 가능
     */
})();

/* =============================================================================
 * community v2 - 연결된 플랜 미리보기 버튼 연결
 * 목적:
 * - 상세 페이지의 연동된 플랜 영역에 미리보기 버튼만 추가
 * - 실제 모달 렌더링은 아래 "플랜 미리보기 지도 최종 보정" 블록에서 처리
 * ============================================================================= */

(function () {
    'use strict';

    function addPreviewButtonToPlanBadge(post) {
        const badge = document.getElementById('pr-plan-badge');

        if (!badge || !post || !post.planId) return;

        let btn = document.getElementById('btn-plan-preview');

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-plan-preview';
            btn.type = 'button';
            btn.className = 'btn-plan-preview';
            btn.textContent = '미리보기';
            btn.onclick = function () {
                if (typeof window.openCommunityPlanPreview === 'function') {
                    window.openCommunityPlanPreview();
                }
            };

            badge.appendChild(btn);
        }
    }

    const prevOpenPostDetailForPreviewButton = window.openPostDetail;

    if (typeof prevOpenPostDetailForPreviewButton === 'function') {
        window.openPostDetail = async function (postId) {
            const result = await prevOpenPostDetailForPreviewButton.apply(this, arguments);

            try {
                const res = await api.get(`/api/posts/${postId}`);
                if (res && res.success !== false && res.data) {
                    addPreviewButtonToPlanBadge(res.data);
                }
            } catch (e) {
                console.warn('[community-v2] 미리보기 버튼 연결 실패:', e);
            }

            return result;
        };
    }
})();

/* =============================================================================
 * community v2 - 플랜 미리보기 지도 최종 보정
 * 목적:
 * - lat/lng가 없거나 키 이름이 달라도 장소명으로 Kakao 검색
 * - 방문 장소 수를 좌표 여부와 상관없이 정상 계산
 * - 장소 아이콘/라벨/경로선 표시
 * ============================================================================= */

(function () {
    'use strict';

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function parseRouteData(value) {
        try {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') return JSON.parse(value);
            if (typeof value.data === 'string') return JSON.parse(value.data);
            if (Array.isArray(value.data)) return value.data;
        } catch (e) {
            console.warn('[community-v2] routeData parse fail:', e);
        }
        return [];
    }

    function getCoord(place) {
        const lat =
            place.lat ??
            place.latitude ??
            place.placeLat ??
            place.y;

        const lng =
            place.lng ??
            place.longitude ??
            place.placeLng ??
            place.x;

        const nLat = Number(lat);
        const nLng = Number(lng);

        if (Number.isNaN(nLat) || Number.isNaN(nLng)) return null;

        return { lat: nLat, lng: nLng };
    }

    function getAllPlaces(routeData) {
        const places = [];

        routeData.forEach(day => {
            (day.places || []).forEach(p => {
                if (p.transit) return;
                if (!p.name) return;

                places.push({
                    ...p,
                    day: day.day,
                    coord: getCoord(p)
                });
            });
        });

        return places;
    }

    function getPinColor(type) {
        if (type === 'stay') return '#2D9E8A';
        if (type === 'food' || type === 'lunch' || type === 'dinner' || type === 'breakfast') return '#F87171';
        if (type === 'cafe') return '#7C3AED';
        if (type === 'tour') return '#22B5C4';
        return '#2D9E8A';
    }

    function getDayColor(day) {
        const colors = ['#2D9E8A', '#A78BFA', '#22B5C4', '#F5A623', '#F472B6'];
        return colors[(Number(day || 1) - 1) % colors.length];
    }

    function getDayCount(post) {
        if (!post?.planStartDate || !post?.planEndDate) return '일정';

        const s = new Date(post.planStartDate);
        const e = new Date(post.planEndDate);
        const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;

        return diff > 0 ? `${diff}일` : '일정';
    }

    function formatBudget(routeData, fallbackBudget) {
        const total = routeData.reduce((sum, day) => {
            const n = Number(String(day.budget || '').replace(/[^\d]/g, ''));
            return sum + (Number.isNaN(n) ? 0 : n);
        }, 0);

        if (total > 0) return `₩${total.toLocaleString('ko-KR')}~`;

        if (fallbackBudget) {
            const n = Number(fallbackBudget);
            if (!Number.isNaN(n)) return `₩${n.toLocaleString('ko-KR')}~`;
        }

        return '예산 정보 없음';
    }

    function ensurePreviewModal() {
        let overlay = document.getElementById('communityPlanPreviewOverlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'communityPlanPreviewOverlay';
            overlay.className = 'community-plan-preview-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="community-plan-preview-modal">
                <button class="community-plan-preview-close" type="button" onclick="closeCommunityPlanPreview()">×</button>

                <div class="community-plan-preview-badges">
                    <span>시즌 큐레이션</span>
                    <span>초여름</span>
                </div>

                <h2 id="cpp-title">플랜 미리보기</h2>

                <div class="community-plan-preview-stats">
                    <div>
                        <strong id="cpp-budget">예산 정보 없음</strong>
                        <span>예산 합산 검증액</span>
                    </div>
                    <div>
                        <strong id="cpp-place-count">0곳</strong>
                        <span>방문 장소</span>
                    </div>
                    <div>
                        <strong id="cpp-period">일정</strong>
                        <span>일정</span>
                    </div>
                </div>

                <div class="community-plan-preview-map">
                    <div id="communityPlanKakaoMap" style="width:100%;height:100%;border-radius:14px"></div>
                </div>

                <div class="community-plan-preview-section">
                    <h3>🏨 숙소 스냅샷</h3>
                    <p id="cpp-stay">연동된 플랜의 숙소 정보가 없습니다.</p>
                </div>

                <div class="community-plan-preview-section">
                    <h3>🍽 맛집 리스트 핵심글</h3>
                    <div id="cpp-places"></div>
                </div>

                <div class="community-plan-preview-actions">
                    <button type="button" class="cpp-main-btn" id="cpp-go-planner-btn">→ 해당 경로로 여행 계획하기</button>
                    <button type="button" class="cpp-sub-btn" onclick="scrapCurrentPreviewPlan()">📌 스크랩</button>
                </div>
            </div>
        `;

        const goBtn = document.getElementById('cpp-go-planner-btn');
        if (goBtn) {
            goBtn.onclick = function () {
                closeCommunityPlanPreview();
                if (typeof go === 'function') go('planner');
            };
        }

        return overlay;
    }

    function renderPreviewInfo(post, routeData) {
        const places = getAllPlaces(routeData);

        document.getElementById('cpp-title').textContent =
            post.planTitle || post.planDestination || '연동된 여행 플랜';

        document.getElementById('cpp-budget').textContent =
            formatBudget(routeData, post.planBudget);

        document.getElementById('cpp-place-count').textContent =
            `${places.length}곳`;

        document.getElementById('cpp-period').textContent =
            getDayCount(post);

        const stay = places.find(p => p.type === 'stay');
        document.getElementById('cpp-stay').textContent = stay
            ? `${stay.name} · ${stay.sub || '숙소'}`
            : `${post.planTitle || '연동된 플랜'}입니다.`;
    }

    function renderPreviewList(routeData) {
        const box = document.getElementById('cpp-places');
        if (!box) return;

        const html = [];

        routeData.forEach(day => {
            html.push(`<div class="cpp-day-title">${escapeHtml(day.label || `Day ${day.day}`)}</div>`);

            (day.places || []).forEach(p => {
                if (p.transit) {
                    html.push(`<div class="cpp-transit-row">${escapeHtml(p.transit)}</div>`);
                    return;
                }

                html.push(`
                    <div class="cpp-place-row">
                        <span>${escapeHtml(p.icon || '📍')}</span>
                        <strong>${escapeHtml(p.name || '장소')}</strong>
                        <em>${escapeHtml(p.time || p.sub || '플랜 장소')}</em>
                    </div>
                `);
            });
        });

        box.innerHTML = html.join('');
    }

    function searchPlaceByName(place, callback) {
        if (place.coord) {
            callback(place.coord);
            return;
        }

        if (!kakao.maps.services || !kakao.maps.services.Places) {
            callback(null);
            return;
        }

        const ps = new kakao.maps.services.Places();

        ps.keywordSearch(place.name, function (data, status) {
            if (status === kakao.maps.services.Status.OK && data && data.length) {
                callback({
                    lat: Number(data[0].y),
                    lng: Number(data[0].x)
                });
            } else {
                callback(null);
            }
        });
    }

    function renderActualKakaoMap(routeData) {
        const container = document.getElementById('communityPlanKakaoMap');
        if (!container) return;

        const places = getAllPlaces(routeData);

        if (!places.length) {
            container.innerHTML = `<div class="cpp-map-loading">표시할 장소가 없습니다.</div>`;
            return;
        }

        if (typeof kakao === 'undefined' || !kakao.maps) {
            container.innerHTML = `<div class="cpp-map-loading">Kakao 지도 SDK를 불러오지 못했습니다.</div>`;
            return;
        }

        kakao.maps.load(function () {
            container.innerHTML = '';

            const defaultCenter = new kakao.maps.LatLng(37.5665, 126.9780);

            const map = new kakao.maps.Map(container, {
                center: defaultCenter,
                level: 6
            });

            const bounds = new kakao.maps.LatLngBounds();
            const placedByDay = {};
            let resolvedCount = 0;

            places.forEach(place => {
                searchPlaceByName(place, function (coord) {
                    resolvedCount++;

                    if (coord) {
                        const position = new kakao.maps.LatLng(coord.lat, coord.lng);
                        bounds.extend(position);

                        if (!placedByDay[place.day]) placedByDay[place.day] = [];
                        placedByDay[place.day].push({
                            ...place,
                            position
                        });

                        const color = getPinColor(place.type);

                        const content = `
                            <div style="cursor:pointer;position:relative;width:0;height:0;">
                                <div style="
                                    position:absolute;
                                    left:-18px;
                                    top:-18px;
                                    width:36px;
                                    height:36px;
                                    box-sizing:border-box;
                                    border-radius:50%;
                                    background:${color};
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    font-size:16px;
                                    box-shadow:0 2px 8px rgba(0,0,0,.3);
                                    border:2.5px solid #fff;
                                    z-index:2;
                                ">${escapeHtml(place.icon || '📍')}</div>

                                <div style="
                                    position:absolute;
                                    top:20px;
                                    left:0;
                                    transform:translateX(-50%);
                                    background:#fff;
                                    border-radius:8px;
                                    padding:3px 8px;
                                    font-size:10px;
                                    font-weight:800;
                                    color:#111;
                                    box-shadow:0 2px 6px rgba(0,0,0,.3);
                                    white-space:nowrap;
                                    border:1px solid rgba(0,0,0,.08);
                                    z-index:1;
                                ">${escapeHtml(place.name)}</div>
                            </div>
                        `;

                        new kakao.maps.CustomOverlay({
                            map,
                            position,
                            content,
                            xAnchor: 0,
                            yAnchor: 0
                        });
                    }

                    if (resolvedCount === places.length) {
                        const days = Object.keys(placedByDay);

                        days.forEach(day => {
                            const path = placedByDay[day].map(p => p.position);

                            if (path.length < 2) return;

                            new kakao.maps.Polyline({
                                map,
                                path,
                                strokeWeight: 5,
                                strokeColor: getDayColor(day),
                                strokeOpacity: 0.65,
                                strokeStyle: 'solid'
                            });
                        });

                        if (days.length > 0) {
                            map.setBounds(bounds);

                            setTimeout(function () {
                                map.relayout();
                                map.setBounds(bounds);
                            }, 150);
                        } else {
                            container.innerHTML = `<div class="cpp-map-loading">지도에 표시할 장소를 찾지 못했습니다.</div>`;
                        }
                    }
                });
            });
        });
    }

    async function getCurrentPostForPreview() {
        const postId = window._currentPostId || window._openedPostId;
        if (!postId) return null;

        const res = await api.get(`/api/posts/${postId}`);
        if (res && res.success !== false && res.data) return res.data;

        return null;
    }

    async function getRouteData(post) {
        if (!post?.planId) return parseRouteData(post?.planRouteJson);

        const res = await api.get(`/api/trips/${post.planId}/routes?t=${Date.now()}`);

        if (res && res.success !== false && res.data) {
            return parseRouteData(res.data);
        }

        return parseRouteData(post.planRouteJson);
    }

    window.openCommunityPlanPreview = async function () {
        const post = await getCurrentPostForPreview();

        if (!post || !post.planId) {
            if (typeof toast === 'function') toast('연동된 플랜 정보를 찾을 수 없습니다.');
            return;
        }

        const overlay = ensurePreviewModal();
        overlay.classList.add('open');

        const routeData = await getRouteData(post);

        renderPreviewInfo(post, routeData);
        renderPreviewList(routeData);
        renderActualKakaoMap(routeData);
    };

    window.closeCommunityPlanPreview = function () {
        const overlay = document.getElementById('communityPlanPreviewOverlay');
        if (overlay) overlay.classList.remove('open');
    };
})();