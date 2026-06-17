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
 * community v2 - 후기 작성 모달 플랜 연동 select 보완
 * 목적:
 * - 기존 HTML 수정 없이 "플랜 연동 (선택)" 영역에 내 여행계획 select 삽입
 * - 후기 작성 시 선택한 planId를 POST /api/posts body에 포함
 * ============================================================================= */

(function () {
    'use strict';

    /*
     * API 응답에서 배열 꺼내기
     * 가능한 구조:
     * 1) { success:true, data:[...] }
     * 2) { success:true, data:{ content:[...] } }
     * 3) [...]
     */
    function extractArray(res) {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.data?.content)) return res.data.content;
        if (Array.isArray(res?.content)) return res.content;
        return [];
    }

    /*
     * 여행계획 표시 이름 만들기
     */
    function getTripTitle(trip) {
        return (
            trip.title ||
            trip.planTitle ||
            trip.destination ||
            trip.name ||
            `여행계획 #${trip.tripId || trip.planId || trip.id}`
        );
    }

    /*
     * 여행계획 id 추출
     */
    function getTripId(trip) {
        return trip.tripId || trip.planId || trip.id || trip.travelPlanId;
    }

    /*
     * 후기 작성 모달 내부에 플랜 select가 없으면 새로 만든다.
     */
    async function injectWritePlanSelect() {
        if (document.getElementById('writePlanId')) {
            await loadWritePlanOptions();
            return;
        }

        const titleEl = document.getElementById('writeTitle');
        if (!titleEl) {
            console.warn('[community-v2] writeTitle을 찾지 못했습니다.');
            return;
        }

        /*
         * writeTitle 기준으로 가장 가까운 작성 모달 영역을 찾는다.
         * 모달 구조가 달라도 최대한 안전하게 동작하도록 작성.
         */
        const modal =
            titleEl.closest('.modal') ||
            titleEl.closest('.overlay') ||
            titleEl.closest('div') ||
            document.body;

        /*
         * "플랜 연동 (선택)" 텍스트 근처를 정확히 찾기 어렵기 때문에
         * 제목 입력칸 아래쪽에 삽입한다.
         */
        const wrap = document.createElement('div');
        wrap.id = 'writePlanWrap';
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

        await loadWritePlanOptions();
    }

    /*
     * 내 여행계획 목록을 불러와 select에 넣는다.
     */
    async function loadWritePlanOptions() {
        const select = document.getElementById('writePlanId');
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

    /*
     * 후기 작성 모달 열기 함수가 있으면 감싸서,
     * 모달이 열린 직후 플랜 select를 삽입한다.
     */
    const originalOpenWriteModal = window.openWriteModal;
    if (typeof originalOpenWriteModal === 'function') {
        window.openWriteModal = function () {
            const result = originalOpenWriteModal.apply(this, arguments);
            setTimeout(injectWritePlanSelect, 100);
            return result;
        };
    }

    /*
     * 다른 이름으로 열릴 가능성도 대비
     */
    const originalOpenWrite = window.openWrite;
    if (typeof originalOpenWrite === 'function') {
        window.openWrite = function () {
            const result = originalOpenWrite.apply(this, arguments);
            setTimeout(injectWritePlanSelect, 100);
            return result;
        };
    }

    /*
     * 수동 호출용
     */
    window.injectWritePlanSelect = injectWritePlanSelect;
})();

/* =============================================================================
 * community v2 - 후기 작성 버튼(checkAndOpenWrite) 보완
 * 목적:
 * - 실제 후기 작성 버튼 onclick="checkAndOpenWrite()"에 맞춰 플랜 select 자동 삽입
 * - 기존 app_community.js 수정 없이 새 파일에서 함수 감싸기
 * ============================================================================= */

(function () {
    'use strict';

    const originalCheckAndOpenWrite = window.checkAndOpenWrite;

    if (typeof originalCheckAndOpenWrite === 'function') {
        window.checkAndOpenWrite = function () {
            const result = originalCheckAndOpenWrite.apply(this, arguments);

            setTimeout(function () {
                if (typeof window.injectWritePlanSelect === 'function') {
                    window.injectWritePlanSelect();
                }
            }, 150);

            return result;
        };
    } else {
        console.warn('[community-v2] checkAndOpenWrite 함수를 찾지 못했습니다.');
    }
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
 * community v2 - 연결된 플랜 미리보기 모달
 * 목적:
 * - 상세 페이지의 연결된 플랜 영역에 "미리보기" 버튼 추가
 * - 버튼 클릭 시 와이어프레임 형태의 플랜 미리보기 모달 표시
 * - 기존 HTML 수정 없이 JS에서 모달 생성
 * ============================================================================= */

(function () {
    'use strict';

    let _communityCurrentPlanPreview = null;

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function formatMoney(value) {
        if (value === null || value === undefined || value === '') return '예산 정보 없음';
        const num = Number(value);
        if (Number.isNaN(num)) return escapeHtml(value);
        return '₩' + num.toLocaleString('ko-KR') + '~';
    }

    function formatPeriod(start, end) {
        if (!start && !end) return '일정 정보 없음';
        if (start && end) return `${start} ~ ${end}`;
        return start || end;
    }

    function parseRouteJson(planRouteJson) {
        if (!planRouteJson) return [];

        try {
            const parsed = typeof planRouteJson === 'string'
                ? JSON.parse(planRouteJson)
                : planRouteJson;

            if (Array.isArray(parsed)) return parsed;
            if (Array.isArray(parsed.days)) return parsed.days;
            if (Array.isArray(parsed.routes)) return parsed.routes;
            if (Array.isArray(parsed.places)) return [{ day: '방문 장소', places: parsed }];

            return [];
        } catch (e) {
            console.warn('[community-v2] planRouteJson 파싱 실패:', e);
            return [];
        }
    }

    function getPlanDayCount(post) {
        if (post.planStartDate && post.planEndDate) {
            try {
                const s = new Date(post.planStartDate);
                const e = new Date(post.planEndDate);
                const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
                if (diff > 0) return `${diff}일`;
            } catch (e) {}
        }
        return '일정';
    }

    function getRoutePlaceCount(routeDays) {
        let count = 0;

        routeDays.forEach(day => {
            if (Array.isArray(day.places)) count += day.places.length;
            else if (Array.isArray(day.items)) count += day.items.length;
        });

        return count;
    }

    function ensurePlanPreviewModal() {
        let modal = document.getElementById('communityPlanPreviewOverlay');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'communityPlanPreviewOverlay';
        modal.className = 'community-plan-preview-overlay';
        modal.innerHTML = `
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
                    <div class="cpp-route-line"></div>
                    <span class="cpp-pin cpp-pin-1"></span>
                    <span class="cpp-pin cpp-pin-2"></span>
                    <span class="cpp-pin cpp-pin-3"></span>
                    <span class="cpp-map-text">Naver/Kakao Map API 렌더링 영역</span>
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
                    <button type="button" class="cpp-main-btn" onclick="go('planner')">→ 해당 경로로 여행 계획하기</button>
                    <button type="button" class="cpp-sub-btn" onclick="scrapCurrentPreviewPlan()">📌 스크랩</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    function renderPreviewModal(post) {
        const routeDays = parseRouteJson(post.planRouteJson);
        const placeCount = getRoutePlaceCount(routeDays);

        document.getElementById('cpp-title').textContent =
            post.planTitle || post.planDestination || '연동된 여행 플랜';

        document.getElementById('cpp-budget').textContent =
            formatMoney(post.planBudget);

        document.getElementById('cpp-place-count').textContent =
            placeCount ? `${placeCount}곳` : '0곳';

        document.getElementById('cpp-period').textContent =
            getPlanDayCount(post);

        const stayEl = document.getElementById('cpp-stay');
        stayEl.textContent = post.planDestination
            ? `${post.planDestination} 여행 플랜입니다.`
            : '연동된 플랜의 숙소 정보가 없습니다.';

        const placesEl = document.getElementById('cpp-places');

        if (!routeDays.length) {
            placesEl.innerHTML = `
                <div class="cpp-place-row">
                    <span>📍</span>
                    <strong>${escapeHtml(post.planDestination || post.planTitle || '방문 장소 정보 없음')}</strong>
                    <em>상세 경로 정보 없음</em>
                </div>
            `;
            return;
        }

        const rows = [];

        routeDays.forEach((day, dayIndex) => {
            const places = day.places || day.items || [];

            places.slice(0, 4).forEach((place, idx) => {
                const name = place.name || place.placeName || place.title || `장소 ${idx + 1}`;
                const rating = place.rating || place.score || '';

                rows.push(`
                    <div class="cpp-place-row">
                        <span>${idx % 2 === 0 ? '📍' : '☕'}</span>
                        <strong>${escapeHtml(name)}</strong>
                        <em>${rating ? '★ ' + escapeHtml(rating) : '플랜 장소'}</em>
                    </div>
                `);
            });
        });

        placesEl.innerHTML = rows.length
            ? rows.join('')
            : `
                <div class="cpp-place-row">
                    <span>📍</span>
                    <strong>${escapeHtml(post.planDestination || '방문 장소 정보 없음')}</strong>
                    <em>상세 경로 정보 없음</em>
                </div>
            `;
    }

    function addPreviewButtonToPlanBadge(post) {
        const badge = document.getElementById('pr-plan-badge');
        if (!badge || !post || !post.planId) return;

        _communityCurrentPlanPreview = post;

        let btn = document.getElementById('btn-plan-preview');

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-plan-preview';
            btn.type = 'button';
            btn.className = 'btn-plan-preview';
            btn.textContent = '미리보기';
            btn.onclick = function () {
                openCommunityPlanPreview();
            };

            badge.appendChild(btn);
        }
    }

    window.openCommunityPlanPreview = function () {
        if (!_communityCurrentPlanPreview) {
            if (typeof toast === 'function') toast('연동된 플랜 정보를 찾을 수 없습니다.');
            return;
        }

        const modal = ensurePlanPreviewModal();
        renderPreviewModal(_communityCurrentPlanPreview);
        modal.classList.add('open');
    };

    window.closeCommunityPlanPreview = function () {
        const modal = document.getElementById('communityPlanPreviewOverlay');
        if (modal) modal.classList.remove('open');
    };

    window.scrapCurrentPreviewPlan = function () {
        if (typeof toast === 'function') toast('플랜 스크랩 기능은 추후 연결됩니다.');
    };

    /*
     * 기존 openPostDetail 실행 후, 상세 응답을 다시 받아 미리보기 버튼 연결
     * 기존 렌더링 로직은 유지하고 필요한 버튼만 추가한다.
     */
    const prevOpenPostDetailForPlanPreview = window.openPostDetail;

    if (typeof prevOpenPostDetailForPlanPreview === 'function') {
        window.openPostDetail = async function (postId) {
            const result = await prevOpenPostDetailForPlanPreview.apply(this, arguments);

            try {
                const res = await api.get(`/api/posts/${postId}`);
                if (res && res.success !== false && res.data) {
                    addPreviewButtonToPlanBadge(res.data);
                }
            } catch (e) {
                console.warn('[community-v2] 플랜 미리보기 버튼 연결 실패:', e);
            }

            return result;
        };
    }
})();

/* =============================================================================
 * community v2 - 플랜 미리보기 Kakao 지도 렌더링 보완
 * 목적:
 * - 기존 미리보기 모달의 가짜 지도 영역을 실제 Kakao Map으로 교체
 * - planTitle 또는 상세 페이지의 연동 플랜 텍스트를 키워드로 장소 검색
 * - 기존 app_main.js / page_map.html 수정 없이 처리
 * ============================================================================= */

(function () {
    'use strict';

    const prevOpenCommunityPlanPreviewForMap = window.openCommunityPlanPreview;

    window.openCommunityPlanPreview = function () {
        if (typeof prevOpenCommunityPlanPreviewForMap === 'function') {
            prevOpenCommunityPlanPreviewForMap.apply(this, arguments);
        }

        setTimeout(function () {
            renderCommunityPlanKakaoMap();
        }, 250);
    };

    function getPreviewMapKeyword() {
        const title = document.getElementById('cpp-title')?.textContent?.trim();
        if (title) return title;

        const badgeText = document.getElementById('pr-plan-badge')?.innerText || '';
        const lines = badgeText
            .split('\n')
            .map(v => v.trim())
            .filter(Boolean)
            .filter(v => v !== '연동된 플랜' && v !== '미리보기');

        if (lines.length) return lines[0];

        return '서울';
    }

    function renderCommunityPlanKakaoMap() {
        const mapWrap = document.querySelector('.community-plan-preview-map');
        if (!mapWrap) return;

        mapWrap.innerHTML = `
            <div id="communityPlanKakaoMap">
                <div class="cpp-map-loading">지도 불러오는 중...</div>
            </div>
        `;

        if (typeof kakao === 'undefined' || !kakao.maps) {
            mapWrap.innerHTML = `
                <div class="cpp-map-loading">
                    Kakao 지도 SDK를 불러오지 못했습니다.
                </div>
            `;
            console.warn('[community-v2] kakao.maps 없음');
            return;
        }

        kakao.maps.load(function () {
            const container = document.getElementById('communityPlanKakaoMap');
            if (!container) return;

            const defaultCenter = new kakao.maps.LatLng(37.5665, 126.9780);

            const map = new kakao.maps.Map(container, {
                center: defaultCenter,
                level: 6
            });

            const keyword = getPreviewMapKeyword();

            if (!kakao.maps.services || !kakao.maps.services.Places) {
                new kakao.maps.Marker({
                    map: map,
                    position: defaultCenter
                });
                return;
            }

            const places = new kakao.maps.services.Places();

            places.keywordSearch(keyword, function (data, status) {
                if (status !== kakao.maps.services.Status.OK || !data || !data.length) {
                    new kakao.maps.Marker({
                        map: map,
                        position: defaultCenter
                    });
                    return;
                }

                const bounds = new kakao.maps.LatLngBounds();

                data.slice(0, 3).forEach(function (place, index) {
                    const position = new kakao.maps.LatLng(place.y, place.x);

                    new kakao.maps.Marker({
                        map: map,
                        position: position
                    });

                    bounds.extend(position);
                });

                map.setBounds(bounds);

                setTimeout(function () {
                    map.relayout();
                    map.setBounds(bounds);
                }, 100);
            });
        });
    }

    window.renderCommunityPlanKakaoMap = renderCommunityPlanKakaoMap;
})();