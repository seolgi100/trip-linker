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

    function getCurrentPostCategory() {
        const category = window._currentPostCategory || 'ROUTE';

        if (['ROUTE', 'STAY', 'FOOD', 'TOUR', 'CAFE'].includes(category)) {
            return category;
        }

        return 'ROUTE';
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

        const category = getCurrentPostCategory();

        const res = await api.post(`/api/posts/${postId}/scraps?category=${category}`, {});

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

        const currentTab =
            typeof _commState !== 'undefined' && _commState.currentTab
                ? _commState.currentTab
                : 'route';

        const categoryMap = {
            route: 'ROUTE',
            stay: 'STAY',
            food: 'FOOD',
            tour: 'TOUR',
            cafe: 'CAFE'
        };

        const category = categoryMap[currentTab] || 'ROUTE';

        const res = await api.post(`/api/posts/${postId}/scraps?category=${category}`, {});

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
        window._currentPostCategory = post.category || 'ROUTE';
        window._currentPostDetail = post;

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

        const imageHtml = (post.imageUrls && post.imageUrls.length)
            ? `<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
                ${post.imageUrls.map(url =>
                    `<img src="${escapeHtml(url)}" alt="첨부 이미지"
                          style="max-width:100%;border-radius:10px;display:block"
                          onerror="this.style.display='none'">`
                ).join('')}
               </div>`
            : '';

        setHtml('pr-body', `
            ${tagHtml}
            <div style="white-space:pre-wrap;line-height:1.8;color:var(--text2);font-size:15px">
                ${escapeHtml(post.content || '')}
            </div>
            ${imageHtml}
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

        if (editBtn) {
            editBtn.style.display = 'none';
            editBtn.onclick = null;
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
        sessionStorage.setItem('communityCurrentPostId', String(postId));

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
 * community v2 - 현재 커뮤니티 카테고리 추적 + 게시글 작성 함수 보완
 * 목적:
 * - 숙소/맛집/관광지/카페 탭에서 작성한 글이 각각 STAY/FOOD/TOUR/CAFE로 저장되도록 처리
 * - page_community.html의 setCommTab(this, 'stay') 구조에 맞춰 현재 탭 저장
 * - PostWriteDto.styleTags(String)에 맞춰 태그를 문자열로 전송
 * ============================================================================= */

(function () {
    'use strict';

    window._communityWriteCategory = window._communityWriteCategory || 'ROUTE';

    const tabToCategory = {
        route: 'ROUTE',
        stay: 'STAY',
        food: 'FOOD',
        tour: 'TOUR',
        cafe: 'CAFE'
    };

    const categoryToTab = {
        ROUTE: 'route',
        STAY: 'stay',
        FOOD: 'food',
        TOUR: 'tour',
        CAFE: 'cafe'
    };

    function setWriteCategoryByTab(tab) {
        const category = tabToCategory[tab] || 'ROUTE';

        window._communityWriteCategory = category;

        if (typeof _commState !== 'undefined') {
            _commState.currentTab = categoryToTab[category] || 'route';
        }

        console.log('[community category selected]', {
            tab: tab,
            category: window._communityWriteCategory,
            currentTab: typeof _commState !== 'undefined' ? _commState.currentTab : null
        });
    }

    function getCategoryFromCurrentTabButton() {
        const activeTab = document.querySelector('#commTabs .comm-tab.on');

        if (!activeTab) {
            return window._communityWriteCategory || 'ROUTE';
        }

        const text = activeTab.textContent.trim();

        if (text.includes('숙소')) return 'STAY';
        if (text.includes('맛집')) return 'FOOD';
        if (text.includes('관광지')) return 'TOUR';
        if (text.includes('카페')) return 'CAFE';
        if (text.includes('여행 경로')) return 'ROUTE';

        return window._communityWriteCategory || 'ROUTE';
    }

    function wrapSetCommTab() {
        if (typeof window.setCommTab !== 'function') return;
        if (window.setCommTab.__communityV2Wrapped) return;

        const originalSetCommTab = window.setCommTab;

        window.setCommTab = function (btn, cat) {
            setWriteCategoryByTab(cat);
            return originalSetCommTab.apply(this, arguments);
        };

        window.setCommTab.__communityV2Wrapped = true;
    }

    setTimeout(wrapSetCommTab, 300);
    setTimeout(wrapSetCommTab, 800);
    setTimeout(wrapSetCommTab, 1500);

    window.submitReview = async function () {

        function resetCommunityWriteForm() {
            const titleEl = document.getElementById('writeTitle');
            const editorEl = document.getElementById('blogEditor');
            const tagsEl = document.getElementById('writeTags');
            const publicEl = document.getElementById('writePublic');
            const planEl = document.getElementById('writePlanId');
            const imageInput = document.getElementById('communityImageInput');

            if (titleEl) titleEl.value = '';
            if (tagsEl) tagsEl.value = '';
            if (planEl) planEl.value = '';
            if (imageInput) imageInput.value = '';

            if (publicEl) publicEl.checked = true;

            if (editorEl) {
                if ('value' in editorEl) {
                    editorEl.value = '';
                }
                editorEl.innerHTML = '';
                editorEl.textContent = '';
            }

            window._communitySelectedImages = [];
        }

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

        const tagText = tagsEl ? tagsEl.value.trim() : '';

        const styleTags = tagText
            .split(/[\s,]+/)
            .map(v => v.trim())
            .filter(Boolean)
            .join(',');

        const isPublic = publicEl ? !!publicEl.checked : true;

        if (!title || !content) {
            if (typeof toast === 'function') {
                toast('제목과 내용을 입력해주세요.');
            }
            return;
        }

        const categoryCode = getCategoryFromCurrentTabButton();

        window._communityWriteCategory = categoryCode;

        console.log('[category debug]', {
            currentTab: typeof _commState !== 'undefined' ? _commState.currentTab : null,
            writeCategory: window._communityWriteCategory,
            categoryCode: categoryCode
        });

        // 선택된 이미지가 있으면 먼저 서버에 업로드하고 URL 목록을 받아오기
        let imageUrls = [];

        const selectedImages = (window._communitySelectedImages || [])
            .filter(item => item && item.file instanceof File);

        window._communitySelectedImages = selectedImages;

        if (selectedImages.length > 0) {
            const formData = new FormData();

            selectedImages.forEach(item => {
                formData.append('files', item.file);
            });

            const token = Token.getAccess();

            const uploadRes = await fetch('/api/posts/images', {
                method: 'POST',
                headers: token ? { Authorization: 'Bearer ' + token } : {},
                body: formData
            });

            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                console.error('[community-v2] 이미지 업로드 실패:', uploadRes.status, errText);

                if (uploadRes.status === 413) {
                    if (typeof toast === 'function') {
                        toast('이미지 용량이 너무 큽니다. 더 작은 이미지로 다시 시도해주세요.');
                    }
                    return;
                }

                if (typeof toast === 'function') {
                    toast('이미지 업로드에 실패했습니다.');
                }
                return;
            }

            imageUrls = await uploadRes.json();
        }

        const body = {
            planId: document.getElementById('writePlanId')?.value
                ? Number(document.getElementById('writePlanId').value)
                : null,
            title: title,
            content: content,
            styleTags: styleTags,
            category: categoryCode,
            isPublic: isPublic,
            imageUrls: imageUrls
        };

        console.log('[submitReview body]', body);

        const res = await api.post('/api/posts', body);

        const success =
            typeof res === 'number' ||
            res?.success === true ||
            typeof res?.data === 'number';

        if (success) {
            resetCommunityWriteForm();

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
                    file: file,
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
            // 새 작성 모달이 열릴 때마다 이전 이미지 선택 상태를 초기화한다
            window._communitySelectedImages = [];

            const imageInput = document.getElementById('communityImageInput');
            if (imageInput) imageInput.value = '';

            const oldInput = document.getElementById('communityImageInput');
            if (oldInput) {
                oldInput.value = '';
            }

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

/* =============================================================================
 * community v2 - 커뮤니티 목록 카드 렌더링 보완
 * 목적:
 * - 목록 카드 오른쪽 아래 좋아요/스크랩/신고 버튼 제거
 * - 와이어프레임처럼 작성자 · 작성일 표시
 * - 백엔드 목록 DTO 필드명(writerName, createdAt, likes, scraps, views, styleTags)에 맞춤
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

    function parseStyleTags(styleTags) {
        if (!styleTags) return [];

        if (Array.isArray(styleTags)) {
            return styleTags.map(v => String(v).trim()).filter(Boolean);
        }

        try {
            const parsed = JSON.parse(styleTags);
            if (Array.isArray(parsed)) {
                return parsed.map(v => String(v).trim()).filter(Boolean);
            }
        } catch (e) {
            // JSON 문자열이 아니면 쉼표 문자열로 처리
        }

        return String(styleTags)
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
    }

    function formatPostDate(createdAt) {
        if (!createdAt) return '날짜 없음';

        try {
            return String(createdAt)
                .substring(0, 10)
                .replaceAll('-', '.');
        } catch (e) {
            return '날짜 없음';
        }
    }

    function getCategoryLabel(tabKey, post) {
        if (post.catLabel) return post.catLabel;

        const map = {
            route: '여행 경로',
            stay: '숙소',
            food: '맛집',
            tour: '관광지',
            cafe: '카페'
        };

        return map[tabKey] || '여행 경로';
    }

    function getCategoryClass(tabKey, post) {
        if (post.catClass) return post.catClass;

        const map = {
            route: 'cat-route',
            stay: 'cat-stay',
            food: 'cat-food',
            tour: 'cat-tour',
            cafe: 'cat-cafe'
        };

        return map[tabKey] || 'cat-route';
    }

    window._renderPostList = function (posts, reset) {
        const currentTab =
            typeof _commState !== 'undefined' && _commState.currentTab
                ? _commState.currentTab
                : 'route';

        const tabEl = document.getElementById('tab-' + currentTab);
        if (!tabEl) return;

        if (reset) tabEl.innerHTML = '';

        if (!posts || !posts.length) {
            tabEl.innerHTML += `
                <div style="padding:40px 20px;text-align:center;color:var(--text3);font-size:14px">
                    게시글이 없습니다.
                </div>
            `;
            return;
        }

        posts.forEach(post => {
            const postId = post.postId;
            const tags = parseStyleTags(post.styleTags);

            const dateText = formatPostDate(post.createdAt);
            const writerText = post.writerName || '사용자';

            const likes = post.likes ?? post.likeCount ?? 0;
            const scraps = post.scraps ?? post.scrapCount ?? 0;
            const views = post.views ?? post.viewCount ?? 0;

            const catLabel = getCategoryLabel(currentTab, post);
            const catClass = getCategoryClass(currentTab, post);

            const dateVal = post.createdAt
                ? String(post.createdAt).substring(0, 10).replaceAll('-', '')
                : '0';

            const div = document.createElement('div');
            div.className = 'comm-post-item';
            div.setAttribute('data-tags', tags.join(','));
            div.setAttribute('data-content', post.content || '');
            div.setAttribute('data-author', writerText);
            div.setAttribute('data-likes', likes);
            div.setAttribute('data-scrap', scraps);
            div.setAttribute('data-date', dateVal);

            div.innerHTML = `
                <div class="post-card" onclick="openPostDetail(${postId})">
                    <div class="community-card-head">
                        <span class="post-cat ${escapeHtml(catClass)}">${escapeHtml(catLabel)}</span>
                        <span class="community-card-meta">${escapeHtml(writerText)} · ${escapeHtml(dateText)}</span>
                    </div>

                    <div class="post-ttl">${escapeHtml(post.title || '제목 없음')}</div>

                    ${
                tags.length
                    ? `<div class="community-card-tags">
                                ${tags.map(tag => `
                                    <span>#${escapeHtml(tag)}</span>
                                `).join('')}
                               </div>`
                    : ''
            }

                    <div class="post-foot">
                        <div class="post-stats">
                            <span class="post-stat">❤️ ${likes}</span>
                            <span class="post-stat">🔖 ${scraps}</span>
                            <span class="post-stat">👁 ${views}</span>
                        </div>
                    </div>
                </div>
            `;

            tabEl.appendChild(div);
        });
    };

    /*
     * 기존 loadCommunityPosts 내부에서 식별자 _renderPostList를 직접 참조하는 경우까지 대비
     */
    try {
        _renderPostList = window._renderPostList;
    } catch (e) {
        // 일부 환경에서는 재할당이 막힐 수 있으므로 무시
    }
})();

/* =============================================================================
 * community v2 - 상세 페이지 와이어프레임 최종 보정
 * 목적:
 * - 해시태그를 연결된 플랜 위로 이동
 * - 상세 메타를 작성자 · 작성일 · 조회수 · 좋아요 형태로 정리
 * - 방문 장소별 별점 & 한줄평 카드 축소형 렌더링
 * - "전체보기" 클릭 시 장소 상세 팝업 연결
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

    function formatDate(value) {
        if (!value) return '';

        try {
            return String(value)
                .substring(0, 10)
                .replaceAll('-', '.');
        } catch (e) {
            return '';
        }
    }

    function parseStyleTags(styleTags) {
        if (!styleTags) return [];

        if (Array.isArray(styleTags)) {
            return styleTags.map(v => String(v).trim()).filter(Boolean);
        }

        try {
            const parsed = JSON.parse(styleTags);
            if (Array.isArray(parsed)) {
                return parsed.map(v => String(v).trim()).filter(Boolean);
            }
        } catch (e) {
            // JSON 문자열이 아니면 쉼표 문자열로 처리
        }

        return String(styleTags)
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
    }

    function parseRouteData(value) {
        try {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') return JSON.parse(value);
            if (typeof value.data === 'string') return JSON.parse(value.data);
            if (Array.isArray(value.data)) return value.data;
        } catch (e) {
            console.warn('[community-v2] 상세 routeData 파싱 실패:', e);
        }

        return [];
    }

    function getActualPlaces(routeData) {
        const places = [];

        routeData.forEach(day => {
            (day.places || []).forEach(p => {
                if (p.transit) return;
                if (!p.name) return;

                places.push({
                    ...p,
                    day: day.day
                });
            });
        });

        return places;
    }

    async function getRouteData(post) {
        if (!post?.planId) return parseRouteData(post?.planRouteJson);

        const res = await api.get(`/api/trips/${post.planId}/routes?t=${Date.now()}`);

        if (res && res.success !== false && res.data) {
            return parseRouteData(res.data);
        }

        return parseRouteData(post.planRouteJson);
    }

    function removeBodyInlineTags() {
        const body = document.getElementById('pr-body');
        if (!body) return;

        const first = body.firstElementChild;

        if (first && first.querySelector && first.querySelector('.post-cat')) {
            first.remove();
        }
    }

    function renderDetailMeta(post) {
        const metaEl = document.getElementById('pr-meta');
        if (!metaEl) return;

        const writer = post.writerName || '사용자';
        const dateText = formatDate(post.createdAt);
        const views = post.viewCount ?? post.views ?? 0;
        const likes = post.likeCount ?? post.likes ?? 0;

        metaEl.innerHTML = `
            <span>${escapeHtml(writer)}</span>
            ${dateText ? `<span>${escapeHtml(dateText)}</span>` : ''}
            <span>👁 ${escapeHtml(views)}</span>
            <span>❤️ ${escapeHtml(likes)}</span>
        `;
    }

    function renderDetailCategory(post) {
        const catEl = document.getElementById('pr-cat');
        const tagEl = document.getElementById('pr-tag');

        if (catEl) catEl.textContent = post.catLabel || '여행 경로';

        /*
         * 상단 작은 #태그는 와이어프레임과 중복되므로 숨긴다.
         * 해시태그 전체 목록은 연결된 플랜 위에 따로 렌더링한다.
         */
        if (tagEl) tagEl.style.display = 'none';
    }

    function renderTagsBeforePlan(post) {
        const badge = document.getElementById('pr-plan-badge');
        if (!badge) return;

        const tags = parseStyleTags(post.styleTags);

        const old = document.getElementById('pr-detail-tags');
        if (old) old.remove();

        if (!tags.length) return;

        const tagBox = document.createElement('div');
        tagBox.id = 'pr-detail-tags';
        tagBox.className = 'review-detail-tags';

        tagBox.innerHTML = tags.map(tag => `
            <span>#${escapeHtml(tag)}</span>
        `).join('');

        badge.insertAdjacentElement('beforebegin', tagBox);
    }

    function getPlanSummary(post, routeData) {
        const places = getActualPlaces(routeData);
        const placeCount = places.length;

        const title = post.planTitle || post.planDestination || '연동된 플랜';

        const styles = post.planTravelStyles
            ? String(post.planTravelStyles).replaceAll(',', ' · ')
            : '여행';

        const transport = post.planTransportType || '';

        const budget = post.planBudget
            ? '₩' + Number(post.planBudget).toLocaleString('ko-KR')
            : '';

        return [
            title,
            placeCount ? `${placeCount}곳` : '',
            styles,
            transport,
            budget
        ].filter(Boolean).join(' · ');
    }

    function renderPlanBadge(post, routeData) {
        const badge = document.getElementById('pr-plan-badge');
        if (!badge) return;

        if (!post.planId) {
            badge.style.display = 'none';
            return;
        }

        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'space-between';
        badge.style.gap = '12px';

        badge.innerHTML = `
            <div>
                <strong>🧳 연결된 플랜</strong>
                <span class="review-plan-summary">
                    ${escapeHtml(getPlanSummary(post, routeData))}
                </span>
            </div>

            <button id="btn-plan-preview"
                    type="button"
                    class="btn-plan-preview"
                    onclick="openCommunityPlanPreview()">
                미리보기
            </button>
        `;
    }

    function getPlaceShortType(type) {
        if (type === 'stay') return '숙소';
        if (type === 'cafe' || type === 'breakfast') return '카페';
        if (type === 'food' || type === 'lunch' || type === 'dinner') return '맛집';
        if (type === 'tour') return '관광지';
        return '장소';
    }

    function getPlaceComment(place) {
        if (place.review) return place.review;
        if (place.comment) return place.comment;
        if (place.oneLineReview) return place.oneLineReview;
        if (place.summary) return place.summary;

        return '';
    }

    function renderPlaceSnapshot(routeData) {
        const placeList = document.getElementById('pr-place-list');
        if (!placeList) return;

        const places = getActualPlaces(routeData);

        if (!places.length) {
            placeList.style.display = 'none';
            return;
        }

        const previewPlaces = places.slice(0, 2);

        placeList.style.display = 'block';

        placeList.innerHTML = `
            <div class="review-place-snapshot">
                <h3>📍 방문 장소별 별점 & 한줄평</h3>

                ${previewPlaces.map((p, index) => `
                    <div class="review-place-snapshot-row">
                        <div class="review-place-snapshot-icon">${escapeHtml(p.icon || '📍')}</div>

                        <div class="review-place-snapshot-info">
                            <strong>${escapeHtml(p.name)}</strong>
                            <span>
                                ${escapeHtml(getPlaceShortType(p.type))}
                            </span>
                        </div>

                        <div class="review-place-snapshot-rating">
                            <b>${escapeHtml(p.stars || '★★★★ 4.5')}</b>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    window.openCommunityPlaceSummary = function (placeName, placeType) {
        if (!placeName) return;

        /*
         * app_main.js에 있는 장소 팝업 함수가 있으면 재사용한다.
         */
        if (typeof showMapPlacePopup === 'function') {
            showMapPlacePopup(placeName, placeType || 'tour');
            return;
        }

        /*
         * 장소 팝업 함수가 없는 환경에서는 최소 안내.
         */
        if (typeof toast === 'function') {
            toast(`${placeName} 상세보기`);
        }
    };

    async function beautifyReviewDetail(postId) {
        const post = window._currentPostDetail;

        if (!post) return;

        const category = String(post.category || 'ROUTE').toUpperCase();

        if (category !== 'ROUTE') {
            const detailTags = document.getElementById('pr-detail-tags');
            if (detailTags) detailTags.remove();

            const placeList = document.getElementById('pr-place-list');
            if (placeList) {
                placeList.style.display = 'none';
                placeList.innerHTML = '';
            }

            const planBadge = document.getElementById('pr-plan-badge');
            if (planBadge) {
                planBadge.style.display = 'none';
                planBadge.innerHTML = '';
            }

            renderDetailCategory(post);
            renderDetailMeta(post);

            return;
        }

        const routeData = await getRouteData(post);

        removeBodyInlineTags();
        renderDetailCategory(post);
        renderDetailMeta(post);
        renderTagsBeforePlan(post);
        renderPlanBadge(post, routeData);
        renderPlaceSnapshot(routeData);
    }

    const prevOpenPostDetailForWireframe = window.openPostDetail;

    if (typeof prevOpenPostDetailForWireframe === 'function') {
        window.openPostDetail = async function (postId) {
            const result = await prevOpenPostDetailForWireframe.apply(this, arguments);

            try {
                await beautifyReviewDetail(postId);
            } catch (e) {
                console.warn('[community-v2] 상세 페이지 와이어프레임 최종 보정 실패:', e);
            }

            return result;
        };
    }
})();

/* =============================================================================
 * community v2 - 사이드바 인기 태그 / AI 취향 추천 렌더링
 * 목적:
 * - 기존 page_community.html의 popular-tags-list, ai-reco-list 영역 채우기
 * - 기존 /api/posts 목록 API 활용
 * - 인기 태그 클릭 시 기존 filterByTag 함수와 연동
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

    function parseStyleTags(styleTags) {
        function cleanTag(value) {
            return String(value ?? '')
                .trim()
                .replace(/^#/, '')
                .replaceAll('[', '')
                .replaceAll(']', '')
                .replaceAll('"', '')
                .trim();
        }

        if (!styleTags) return [];

        if (Array.isArray(styleTags)) {
            return styleTags
                .map(cleanTag)
                .filter(Boolean);
        }

        try {
            const parsed = JSON.parse(styleTags);
            if (Array.isArray(parsed)) {
                return parsed
                    .map(cleanTag)
                    .filter(Boolean);
            }
        } catch (e) {
            // JSON 문자열이 아니면 아래에서 처리
        }

        return String(styleTags)
            .split(',')
            .map(cleanTag)
            .filter(Boolean);
    }

    function extractPosts(res) {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.data?.content)) return res.data.content;
        if (Array.isArray(res?.content)) return res.content;
        return [];
    }

    async function fetchCommunityPostsForSide() {
        /*
         * sort=scrap&category=route는 현재 커뮤니티 목록에서 이미 정상 호출되는 API 형식.
         * size를 크게 줘서 태그/추천 계산에 사용할 데이터를 조금 더 확보한다.
         */
        const res = await api.get('/api/posts?page=0&size=50&sort=scrap&category=route');
        return extractPosts(res);
    }

    function renderPopularTags(posts) {
        const box = document.getElementById('popular-tags-list');
        if (!box) return;

        const tagCount = {};

        posts.forEach(post => {
            parseStyleTags(post.styleTags).forEach(tag => {
                if (!tag) return;
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            });
        });

        let tags = Object.entries(tagCount)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }))
            .slice(0, 9);

        /*
         * 작성된 글에 태그가 너무 적을 때 화면이 비지 않도록 최소 보정
         */
        if (!tags.length) {
            tags = [
                { name: '힐링', count: 1 },
                { name: '맛집', count: 1 },
                { name: '카페', count: 1 },
                { name: '가성비', count: 1 },
                { name: '바다', count: 1 },
                { name: '커뮤니티', count: 1 }
            ];
        }

        box.innerHTML = tags.map(t => `
            <button type="button"
                    class="chip chip-sm community-side-tag"
                    title="${escapeHtml(t.count)}개 글"
                    onclick="handleCommunitySideTag('${escapeHtml(t.name)}', this)">
                #${escapeHtml(t.name)}
            </button>
        `).join('');
    }

    function getPostScore(post) {
        const likes = Number(post.likes ?? post.likeCount ?? 0);
        const scraps = Number(post.scraps ?? post.scrapCount ?? 0);
        const views = Number(post.views ?? post.viewCount ?? 0);

        /*
         * 스크랩과 좋아요를 더 크게 보고, 조회수는 약하게 반영
         */
        return likes * 3 + scraps * 4 + views * 0.1;
    }

    function renderAiRecommendations(posts) {
        const titleEl = document.getElementById('ai-reco-title');
        const box = document.getElementById('ai-reco-list');

        if (!box) return;

        if (titleEl) {
            titleEl.textContent = '지난 제주 힐링 여행 기반 추천';
        }

        const recommendations = [...posts]
            .filter(p => p.postId && p.title)
            .sort((a, b) => getPostScore(b) - getPostScore(a));

        if (!recommendations.length) {
            box.innerHTML = `
            <div class="community-ai-simple-card">
                <div class="community-ai-empty">
                    추천할 게시글이 아직 없습니다.
                </div>
            </div>
        `;
            return;
        }

        const post = recommendations[0];
        const tags = parseStyleTags(post.styleTags);

        /*
         * 와이어프레임 느낌용 취향 일치 수
         * 태그 수 + 반응 점수를 간단히 반영
         */
        const likes = Number(post.likes ?? post.likeCount ?? 0);
        const scraps = Number(post.scraps ?? post.scrapCount ?? 0);
        const matchCount = Math.max(
            1,
            tags.length + (likes > 0 ? 1 : 0) + (scraps > 0 ? 1 : 0)
        );

        box.innerHTML = `
        <div class="community-ai-simple-card"
             onclick="openPostDetail(${post.postId})">
            <div class="community-ai-simple-cat">
                ${escapeHtml(post.catLabel || '여행 경로')}
            </div>

            <div class="community-ai-simple-title">
                ${escapeHtml(post.title)}
            </div>

            <div class="community-ai-simple-match">
                취향 일치 ${escapeHtml(matchCount)}개
            </div>
        </div>
    `;
    }

    window.handleCommunitySideTag = function (tag, btn) {
        if (typeof filterByTag === 'function') {
            filterByTag(tag, btn);
            return;
        }

        /*
         * 혹시 filterByTag가 없는 경우의 최소 대체 동작
         */
        const q = String(tag || '').toLowerCase();

        document.querySelectorAll('.comm-post-item').forEach(item => {
            const tags = (item.getAttribute('data-tags') || '').toLowerCase();
            item.style.display = tags.includes(q) ? '' : 'none';
        });
    };

    window.loadCommunitySidePanels = async function () {
        if (window._communitySidePanelsLoading) return;

        const tagBox = document.getElementById('popular-tags-list');
        const recoBox = document.getElementById('ai-reco-list');

        if (!tagBox && !recoBox) return;

        window._communitySidePanelsLoading = true;

        if (!tagBox && !recoBox) return;

        try {
            const posts = await fetchCommunityPostsForSide();

            renderPopularTags(posts);
            renderAiRecommendations(posts);
        } catch (e) {
            console.error('[community-v2] 사이드바 데이터 렌더링 실패:', e);

            if (tagBox) {
                tagBox.innerHTML = `
            <div style="font-size:12px;color:var(--text3);grid-column:1 / -1">
                인기 태그를 불러오지 못했습니다.
            </div>
        `;
            }

            if (recoBox) {
                recoBox.innerHTML = `
            <div style="font-size:12px;color:var(--text3)">
                추천 정보를 불러오지 못했습니다.
            </div>
        `;
            }
        } finally {
            window._communitySidePanelsLoading = false;
        }
    };


    // setTimeout(function () {
    //     window.loadCommunitySidePanels();
    // }, 300);
})();

/* =============================================================================
 * community v2 - 카테고리별 목록/페이징 분리 보정
 * 목적:
 * - route/stay/food/tour/cafe 탭마다 /api/posts?category=...로 조회
 * - 여행 경로 페이징이 다른 카테고리에 공유되는 문제 방지
 * - 돌아오기 후 다른 카테고리 목록이 사라지는 문제 방지
 * ============================================================================= */

(function () {
    'use strict';

    const tabTextToKey = {
        '여행 경로': 'route',
        '숙소': 'stay',
        '맛집': 'food',
        '관광지': 'tour',
        '카페': 'cafe'
    };

    function getCurrentTabKey() {
        const activeTab = document.querySelector('#commTabs .comm-tab.on');

        if (activeTab) {
            const text = activeTab.textContent.trim();
            if (tabTextToKey[text]) return tabTextToKey[text];
        }

        if (typeof _commState !== 'undefined' && _commState.currentTab) {
            return _commState.currentTab;
        }

        return 'route';
    }

    function extractPage(res) {
        const page = res?.data || res || {};

        return {
            content: Array.isArray(page.content) ? page.content : [],
            number: Number(page.number ?? 0),
            totalPages: Number(page.totalPages ?? 1),
            totalElements: Number(page.totalElements ?? 0)
        };
    }

    function removeCommunityV2Pager() {
        /*
         * v2에서 새로 만든 페이징 제거
         */
        const v2Pager = document.getElementById('community-v2-pagination');
        if (v2Pager) v2Pager.remove();

        /*
         * 기존 app_community.js가 만든 페이징 제거
         * 클래스명이 다를 수 있어서 후보를 넓게 잡는다.
         */
        document.querySelectorAll('.pagination, .pager, .comm-pagination, .page-wrap, .post-pagination').forEach(el => {
            if (el.id !== 'community-v2-pagination') {
                el.remove();
            }
        });

        /*
         * 클래스가 없는 숫자 버튼 페이징 제거
         * 예: [1] [2] [3] [4] [5]
         */
        document.querySelectorAll('div').forEach(div => {
            if (div.id === 'community-v2-pagination') return;

            const buttons = Array.from(div.querySelectorAll(':scope > button'));

            if (buttons.length < 2) return;

            const isNumberPager = buttons.every(btn => {
                const text = btn.textContent.trim();
                return /^\d+$/.test(text);
            });

            if (isNumberPager) {
                div.remove();
            }
        });
    }

    function renderCommunityV2Pager(tab, pageNumber, totalPages) {
        removeCommunityV2Pager();

        const tabEl = document.getElementById('tab-' + tab);
        if (!tabEl) return;

        if (!totalPages || totalPages <= 1) {
            return;
        }

        const pager = document.createElement('div');
        pager.id = 'community-v2-pagination';
        pager.className = 'community-v2-pagination';

        let html = '';

        for (let i = 0; i < totalPages; i++) {
            html += `
                <button type="button"
                        class="community-v2-page-btn ${i === pageNumber ? 'on' : ''}"
                        data-page="${i}">
                    ${i + 1}
                </button>
            `;
        }

        pager.innerHTML = html;

        pager.querySelectorAll('.community-v2-page-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const nextPage = Number(this.dataset.page || 0);
                window.loadCommunityPosts(nextPage, true);
            });
        });

        tabEl.insertAdjacentElement('afterend', pager);
    }

    window.loadCommunityPosts = async function (page = 0, reset = true) {
        const tab = getCurrentTabKey();

        const requestKey = `${tab}:${page}:${reset}`;

        if (window._communityPostsLoadingKey === requestKey) {
            return;
        }

        window._communityPostsLoadingKey = requestKey;

        removeCommunityV2Pager();

        if (typeof _commState !== 'undefined') {
            _commState.currentTab = tab;
            _commState.page = page;
        }

        const tabEl = document.getElementById('tab-' + tab);

        if (tabEl && reset) {
            tabEl.innerHTML = `
                <div style="padding:40px 20px;text-align:center;color:var(--text3);font-size:14px">
                    불러오는 중...
                </div>
            `;
        }

        try {
            const res = await api.get(`/api/posts?page=${page}&size=10&sort=scrap&category=${tab}`);
            const pageData = extractPage(res);

            if (typeof window._renderPostList === 'function') {
                window._renderPostList(pageData.content, reset);
            }

            renderCommunityV2Pager(tab, pageData.number, pageData.totalPages);

            if (typeof window.loadCommunitySidePanels === 'function') {
                window.loadCommunitySidePanels();
            }
        } catch (e) {
            console.error('[community-v2] 카테고리 목록 조회 실패:', e);

            if (tabEl) {
                tabEl.innerHTML = `
            <div style="padding:40px 20px;text-align:center;color:var(--coral);font-size:14px">
                게시글을 불러오지 못했습니다.
            </div>
        `;
            }
        } finally {
            window._communityPostsLoadingKey = null;
        }
    };

    function wrapSetCommTabForList() {
        if (typeof window.setCommTab !== 'function') return;
        if (window.setCommTab.__communityV2ListWrapped) return;

        const originalSetCommTab = window.setCommTab;

        window.setCommTab = function (btn, cat) {
            const result = originalSetCommTab.apply(this, arguments);

            if (typeof _commState !== 'undefined') {
                _commState.currentTab = cat || 'route';
                _commState.page = 0;
            }

            setTimeout(function () {
                window.loadCommunityPosts(0, true);
            }, 50);

            return result;
        };

        window.setCommTab.__communityV2ListWrapped = true;
    }

    setTimeout(wrapSetCommTabForList, 300);
    setTimeout(wrapSetCommTabForList, 800);
    setTimeout(wrapSetCommTabForList, 1500);
})();

/* =============================================================================
 * community v2 - 상세 페이지 새로고침 복구
 * 목적:
 * - 후기 상세 화면에서 새로고침했을 때 postId가 사라져 화면이 깨지는 문제 방지
 * - 마지막으로 열었던 게시글 ID를 sessionStorage에서 꺼내 다시 조회
 * ============================================================================= */

(function () {
    'use strict';

    function isReviewPageVisible() {
        const reviewPage = document.getElementById('page-review');

        if (!reviewPage) return false;

        const style = window.getComputedStyle(reviewPage);

        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    window.restoreCommunityReviewDetail = function () {
        const savedPostId = sessionStorage.getItem('communityCurrentPostId');

        if (!savedPostId) return;


        // 이미 상세 데이터가 있으면 다시 호출하지 않는다.

        if (window._currentPostDetail && String(window._currentPostId) === String(savedPostId)) {
            return;
        }


        // 상세 페이지가 보이는 상태에서만 복구한다.

        if (!isReviewPageVisible()) {
            return;
        }

        if (typeof window.openPostDetail === 'function') {
            window.openPostDetail(savedPostId);
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(window.restoreCommunityReviewDetail, 500);
        setTimeout(window.restoreCommunityReviewDetail, 1200);
    });


    // go('review')로 화면 전환된 직후에도 한 번 더 복구 시도

    const originalGoForCommunityRestore = window.go;

    if (typeof originalGoForCommunityRestore === 'function' && !originalGoForCommunityRestore.__communityRestoreWrapped) {
        window.go = function (id, addToHistory) {
            const result = originalGoForCommunityRestore.apply(this, arguments);

            if (id === 'review') {
                setTimeout(window.restoreCommunityReviewDetail, 300);
            }

            return result;
        };

        window.go.__communityRestoreWrapped = true;
    }
})();

/* =============================================================================
 * community v2 - 검색 기능 보정
 * 목적:
 * - page_community.html은 수정하지 않고 doSearch만 확실히 덮어쓰기
 * - 제목/내용/작성자/태그 검색을 각각 분리
 * - 검색어가 비어 있으면 현재 탭 전체 목록 다시 표시
 * ============================================================================= */

(function () {
    'use strict';

    function getCurrentTabKeyForSearch() {
        const activeTab = document.querySelector('#commTabs .comm-tab.on');

        if (activeTab) {
            const text = activeTab.textContent.trim();

            if (text.includes('숙소')) return 'stay';
            if (text.includes('맛집')) return 'food';
            if (text.includes('관광지')) return 'tour';
            if (text.includes('카페')) return 'cafe';
            if (text.includes('여행 경로')) return 'route';
        }

        if (typeof _commState !== 'undefined' && _commState.currentTab) {
            return _commState.currentTab;
        }

        return 'route';
    }

    function getCurrentTabElement() {
        const currentTab = getCurrentTabKeyForSearch();
        return document.getElementById('tab-' + currentTab);
    }

    function showAllCurrentTabItems() {
        const tabEl = getCurrentTabElement();
        if (!tabEl) return 0;

        let count = 0;

        tabEl.querySelectorAll('.comm-post-item').forEach(function (item) {
            item.style.display = '';
            count++;
        });

        const oldEmpty = document.getElementById('community-search-empty');
        if (oldEmpty) oldEmpty.remove();

        return count;
    }

    function showSearchEmptyMessage(tabEl) {
        const oldEmpty = document.getElementById('community-search-empty');
        if (oldEmpty) oldEmpty.remove();

        const empty = document.createElement('div');
        empty.id = 'community-search-empty';
        empty.style.padding = '40px 20px';
        empty.style.textAlign = 'center';
        empty.style.color = 'var(--text3)';
        empty.style.fontSize = '14px';
        empty.textContent = '검색 결과가 없습니다.';

        tabEl.appendChild(empty);
    }

    function hideSearchEmptyMessage() {
        const oldEmpty = document.getElementById('community-search-empty');
        if (oldEmpty) oldEmpty.remove();
    }

    function communityV2Search() {
        const typeEl = document.getElementById('searchType');
        const inputEl = document.getElementById('searchInp');

        const type = typeEl ? typeEl.value : 'title';
        const q = inputEl ? inputEl.value.trim().toLowerCase() : '';

        const tabEl = getCurrentTabElement();
        if (!tabEl) return;

        /*
         * 검색어가 없으면 현재 탭 전체 목록 복구
         */
        if (!q) {
            const count = showAllCurrentTabItems();

            if (typeof toast === 'function') {
                toast('전체 목록을 표시합니다. (' + count + '건)');
            }

            return;
        }

        hideSearchEmptyMessage();

        let found = 0;

        tabEl.querySelectorAll('.comm-post-item').forEach(function (item) {
            const title = (item.querySelector('.post-ttl')?.textContent || '').toLowerCase();
            const content = (item.getAttribute('data-content') || '').toLowerCase();
            const author = (item.getAttribute('data-author') || '').toLowerCase();
            const tags = (item.getAttribute('data-tags') || '').toLowerCase();

            let match = false;

            if (type === 'title') {
                match = title.includes(q);
            } else if (type === 'content') {
                match = content.includes(q);
            } else if (type === 'author') {
                match = author.includes(q);
            } else if (type === 'tag') {
                match = tags.includes(q);
            }

            item.style.display = match ? '' : 'none';

            if (match) found++;
        });

        if (found === 0) {
            showSearchEmptyMessage(tabEl);
        }

        if (typeof toast === 'function') {
            toast('"' + q + '" 검색 결과: ' + found + '건');
        }
    }

    /*
     * page_community.html 안의 doSearch를 건드리지 않고,
     * app_community_v2.js에서 더 나중에 확실히 덮어쓴다.
     */
    function installCommunityV2Search() {
        window.doSearch = communityV2Search;

        const searchBtn = document.querySelector('.btn-search');
        if (searchBtn) {
            searchBtn.onclick = function (e) {
                if (e) e.preventDefault();
                communityV2Search();
            };
        }

        const searchInput = document.getElementById('searchInp');
        if (searchInput && !searchInput.__communityV2SearchBound) {
            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    communityV2Search();
                }
            });

            searchInput.__communityV2SearchBound = true;
        }
    }

    installCommunityV2Search();

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(installCommunityV2Search, 300);
        setTimeout(installCommunityV2Search, 1000);
        setTimeout(installCommunityV2Search, 2000);
    });

    window.addEventListener('load', function () {
        setTimeout(installCommunityV2Search, 300);
    });
})();

/* =============================================================================
 * community v2 - 상세 CTA 카테고리별 표시 보정
 * 목적:
 * - 여행 경로 글에는 CTA 유지
 * - 숙소/맛집/관광지/카페 글에는 "이 경로가 마음에 드셨나요?" CTA 숨김
 * ============================================================================= */

(function () {
    'use strict';

    function normalizeCategoryForCta(category) {
        if (!category || String(category).trim() === '') return 'ROUTE';

        const value = String(category).toUpperCase();

        if (['ROUTE', 'STAY', 'FOOD', 'TOUR', 'CAFE'].includes(value)) {
            return value;
        }

        return 'ROUTE';
    }

    function fixReviewCtaByCategory() {
        const post = window._currentPostDetail;
        const cta = document.querySelector('#page-review .review-cta');

        if (!cta || !post) return;

        const category = normalizeCategoryForCta(post.category);

        if (category === 'ROUTE') {
            cta.style.display = '';
        } else {
            cta.style.display = 'none';
        }
    }

    const prevOpenPostDetailForCta = window.openPostDetail;

    if (typeof prevOpenPostDetailForCta === 'function' && !prevOpenPostDetailForCta.__communityCtaWrapped) {
        window.openPostDetail = async function (postId) {
            const result = await prevOpenPostDetailForCta.apply(this, arguments);

            setTimeout(fixReviewCtaByCategory, 50);

            return result;
        };

        window.openPostDetail.__communityCtaWrapped = true;
    }
})();

/* =============================================================================
 * community v2 - 좋아요/스크랩 버튼 상태 표시 + 토글 보정
 * 목적:
 * - 상세 진입 시 likedByMe/scrappedByMe에 따라 버튼을 민트색으로 채움
 * - 다시 누르면 취소되고 버튼 색상도 원래대로 복구
 * ============================================================================= */

(function () {
    'use strict';

    const ACTIVE_COLOR = '#46B29E';

    function getCurrentPostId() {
        return window._currentPostId || window._openedPostId || null;
    }

    function setButtonActive(btn, active) {
        if (!btn) return;

        if (active) {
            btn.classList.add('community-action-active');
            btn.style.background = ACTIVE_COLOR;
            btn.style.borderColor = ACTIVE_COLOR;
            btn.style.color = '#fff';
        } else {
            btn.classList.remove('community-action-active');
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }
    }

    function getLikeButton() {
        return [...document.querySelectorAll('button')]
            .find(btn => btn.textContent && btn.textContent.includes('좋아요'));
    }

    function getScrapButton() {
        return [...document.querySelectorAll('button')]
            .find(btn => btn.textContent && btn.textContent.includes('스크랩'));
    }

    function applyCurrentPostActionState() {
        const post = window._currentPostDetail;
        if (!post) return;

        const likeBtn = getLikeButton();
        const scrapBtn = getScrapButton();

        setButtonActive(likeBtn, !!post.likedByMe);
        setButtonActive(scrapBtn, !!post.scrappedByMe);
    }

    const prevOpenPostDetailForActionState = window.openPostDetail;

    if (typeof prevOpenPostDetailForActionState === 'function' && !prevOpenPostDetailForActionState.__communityActionStateWrapped) {
        window.openPostDetail = async function (postId) {
            const result = await prevOpenPostDetailForActionState.apply(this, arguments);

            setTimeout(applyCurrentPostActionState, 80);

            return result;
        };

        window.openPostDetail.__communityActionStateWrapped = true;
    }

    window.doReviewLike = async function () {
        if (typeof Token === 'undefined' || !Token.getAccess || !Token.getAccess()) {
            if (typeof toast === 'function') toast('로그인이 필요합니다.');
            if (typeof go === 'function') go('login');
            return;
        }

        const postId = getCurrentPostId();

        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        const res = await api.post(`/api/posts/${postId}/likes`, {});

        if (!res || res.success === false) {
            if (typeof toast === 'function') toast(res?.message || '좋아요 처리에 실패했습니다.');
            return;
        }

        const liked = res.data === true;

        if (window._currentPostDetail) {
            window._currentPostDetail.likedByMe = liked;

            const currentCount =
                Number(window._currentPostDetail.likeCount ?? window._currentPostDetail.likes ?? 0);

            window._currentPostDetail.likeCount = liked
                ? currentCount + 1
                : Math.max(0, currentCount - 1);
        }

        if (typeof toast === 'function') {
            toast(liked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.');
        }

        await window.openPostDetail(postId);
    };

    window.doReviewScrap = async function () {
        if (typeof Token === 'undefined' || !Token.getAccess || !Token.getAccess()) {
            if (typeof toast === 'function') toast('로그인이 필요합니다.');
            if (typeof go === 'function') go('login');
            return;
        }

        const postId = getCurrentPostId();

        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        const category = window._currentPostCategory || window._currentPostDetail?.category || 'ROUTE';

        const res = await api.post(`/api/posts/${postId}/scraps?category=${category}`, {});

        if (!res || res.success === false) {
            if (typeof toast === 'function') toast(res?.message || '스크랩 처리에 실패했습니다.');
            return;
        }

        const scrapped = res.data === true;

        if (window._currentPostDetail) {
            window._currentPostDetail.scrappedByMe = scrapped;
        }

        if (typeof toast === 'function') {
            toast(scrapped ? '스크랩했습니다.' : '스크랩을 취소했습니다.');
        }

        await window.openPostDetail(postId);
    };
})();

/* =============================================================================
 * community v2 - 마이페이지 작성 후기 수정/삭제 실제 API 연결
 * app_main.js 수정 금지 → 여기서 window 함수 덮어쓰기
 * ============================================================================= */
(function () {
    'use strict';

    function getAccessToken() {
        if (typeof Token !== 'undefined' && Token.getAccess) {
            return Token.getAccess();
        }

        return localStorage.getItem('accessToken')
            || localStorage.getItem('access_token')
            || sessionStorage.getItem('accessToken')
            || sessionStorage.getItem('access_token');
    }

    function authHeaders(json) {
        const token = getAccessToken();

        const headers = {};

        if (json) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        return headers;
    }

    function esc(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function extractPosts(res) {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.data?.content)) return res.data.content;
        if (Array.isArray(res?.content)) return res.content;
        return [];
    }

    async function requestJson(url, options) {
        const response = await fetch(url, options);

        let data = null;

        try {
            data = await response.json();
        } catch (e) {
            data = null;
        }

        if (!response.ok) {
            throw new Error(data?.message || '요청 처리에 실패했습니다.');
        }

        return data;
    }

    async function loadMyPostsForCommunityV2() {
        /*
         * PostController 기준:
         * @RequestMapping("/api/posts")
         * @GetMapping("/me")
         * → /api/posts/me
         */
        const res = await requestJson('/api/posts/me', {
            method: 'GET',
            headers: authHeaders(false)
        });

        return extractPosts(res);
    }

    async function reloadCommunityListForCommunityV2() {
        if (typeof window.loadCommunityPosts === 'function') {
            await window.loadCommunityPosts(0, true);
            return;
        }

        if (typeof window.loadPosts === 'function') {
            await window.loadPosts();
        }
    }

    window._renderMyReviews = async function () {
        const listEl = document.getElementById('my-reviews-list');

        if (!listEl) return;

        listEl.innerHTML =
            '<div style="color:var(--text3);font-size:13px;padding:20px 0;text-align:center">후기를 불러오는 중...</div>';

        let posts = [];

        try {
            posts = await loadMyPostsForCommunityV2();
        } catch (e) {
            listEl.innerHTML =
                '<p style="color:var(--text3);font-size:13px">작성한 후기를 불러오지 못했습니다.</p>';

            if (typeof toast === 'function') {
                toast(e.message || '작성한 후기를 불러오지 못했습니다.');
            }

            return;
        }

        if (!posts.length) {
            listEl.innerHTML =
                '<p style="color:var(--text3);font-size:13px">작성한 후기가 없습니다.</p>';
            return;
        }

        listEl.innerHTML = posts.map(function (post) {
            const postId = post.postId || post.id;
            const title = post.title || '제목 없음';
            const likes = post.likes ?? post.likeCount ?? 0;
            const views = post.views ?? post.viewCount ?? 0;
            const category = post.catLabel || post.category || '후기';
            const catClass = post.catClass || '';

            return `
                <div class="post-card"
                     data-my-post-id="${esc(postId)}"
                     onclick="openPostDetail(${esc(postId)})">

                    <span class="post-cat ${esc(catClass)}">${esc(category)}</span>

                    <div class="post-ttl" style="margin-top:5px">
                        ${esc(title)}
                    </div>

                    <div class="post-foot">
                        <div class="post-stats">
                            <span class="post-stat">❤️ ${esc(likes)}</span>
                            ${views ? `<span class="post-stat">👁 ${esc(views)}</span>` : ''}
                        </div>

                        <div style="display:flex;gap:6px">
                            <button class="btn-scrap"
                                    onclick="event.stopPropagation(); editMyPost(${esc(postId)})">
                                ✏️ 수정
                            </button>

                            <button class="btn-scrap"
                                    style="color:var(--coral);border-color:var(--coral)"
                                    onclick="event.stopPropagation(); deleteMyPost(${esc(postId)})">
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    window.deleteMyPost = async function (postId) {
        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        if (!confirm('게시글을 삭제하시겠습니까?')) return;

        try {
            /*
             * PostController 기준:
             * @DeleteMapping("/{postId}")
             * → DELETE /api/posts/{postId}
             */
            await fetch('/api/posts/' + postId, {
                method: 'DELETE',
                headers: authHeaders(false)
            }).then(function (response) {
                if (!response.ok) {
                    throw new Error('삭제에 실패했습니다.');
                }
            });

            if (typeof toast === 'function') toast('게시글이 삭제되었습니다.');

            const card = document.querySelector('[data-my-post-id="' + postId + '"]');
            if (card) card.remove();

            await window._renderMyReviews();
            await reloadCommunityListForCommunityV2();

        } catch (e) {
            if (typeof toast === 'function') toast(e.message || '삭제에 실패했습니다.');
        }
    };

    /*
     * 마이페이지로 이동했을 때 app_main.js가 먼저 렌더링하더라도,
     * 나중에 우리 함수로 다시 덮어 렌더링한다.
     */
    const prevGoForMyReviews = window.go;

    if (typeof prevGoForMyReviews === 'function' && !prevGoForMyReviews.__communityMyReviewWrapped) {
        window.go = function (id, addToHistory) {
            const result = prevGoForMyReviews.apply(this, arguments);

            if (id === 'mypage') {
                setTimeout(function () {
                    window._renderMyReviews();
                }, 300);
            }

            return result;
        };

        window.go.__communityMyReviewWrapped = true;
    }

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            if (document.getElementById('my-reviews-list')) {
                window._renderMyReviews();
            }
        }, 700);
    });
})();

/* =============================================================================
 * community v2 - 좋아요/스크랩 버튼 색상 유지
 * ============================================================================= */
(function () {
    'use strict';

    const ACTIVE_COLOR = '#46B29E';

    function getCurrentPostId() {
        return window._currentPostId
            || window._openedPostId
            || window._currentPostDetail?.postId
            || window._currentPostDetail?.id
            || null;
    }

    function findActionButton(keyword) {
        return [...document.querySelectorAll('#page-review button, #page-review .btn-f, #page-review .btn-scrap')]
            .find(function (btn) {
                return (btn.textContent || '').includes(keyword);
            });
    }

    function setButtonState(btn, active) {
        if (!btn) return;

        if (active) {
            btn.classList.add('community-action-active');
            btn.style.background = ACTIVE_COLOR;
            btn.style.borderColor = ACTIVE_COLOR;
            btn.style.color = '#fff';
        } else {
            btn.classList.remove('community-action-active');
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }
    }

    function applyActionState() {
        const post = window._currentPostDetail;
        if (!post) return;

        setButtonState(findActionButton('좋아요'), !!post.likedByMe);
        setButtonState(findActionButton('스크랩'), !!post.scrappedByMe);
    }

    const prevOpenPostDetailForAction = window.openPostDetail;

    if (typeof prevOpenPostDetailForAction === 'function' && !prevOpenPostDetailForAction.__communityActionStateWrapped) {
        window.openPostDetail = async function (postId) {
            const result = await prevOpenPostDetailForAction.apply(this, arguments);

            setTimeout(applyActionState, 50);
            setTimeout(applyActionState, 300);
            setTimeout(applyActionState, 800);

            return result;
        };

        window.openPostDetail.__communityActionStateWrapped = true;
    }

    window.doReviewLike = async function () {
        if (typeof Token !== 'undefined' && Token.getAccess && !Token.getAccess()) {
            if (typeof toast === 'function') toast('로그인이 필요합니다.');
            if (typeof go === 'function') go('login');
            return;
        }

        const postId = getCurrentPostId();

        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        const res = await api.post('/api/posts/' + postId + '/likes', {});
        const liked = res?.data === true;

        if (window._currentPostDetail) {
            window._currentPostDetail.likedByMe = liked;
        }

        if (typeof toast === 'function') {
            toast(liked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.');
        }

        await window.openPostDetail(postId);
        setTimeout(applyActionState, 100);
    };

    window.doReviewScrap = async function () {
        if (typeof Token !== 'undefined' && Token.getAccess && !Token.getAccess()) {
            if (typeof toast === 'function') toast('로그인이 필요합니다.');
            if (typeof go === 'function') go('login');
            return;
        }

        const postId = getCurrentPostId();

        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        const category = window._currentPostCategory || window._currentPostDetail?.category || 'ROUTE';

        const res = await api.post('/api/posts/' + postId + '/scraps?category=' + category, {});
        const scrapped = res?.data === true;

        if (window._currentPostDetail) {
            window._currentPostDetail.scrappedByMe = scrapped;
        }

        if (typeof toast === 'function') {
            toast(scrapped ? '스크랩했습니다.' : '스크랩을 취소했습니다.');
        }

        await window.openPostDetail(postId);
        setTimeout(applyActionState, 100);
    };
})();

/* =============================================================================
 * community v2 - 마이페이지 후기 수정 모달 + 이미지 삭제
 * 목적:
 * - 기존 prompt 수정 방식 제거
 * - 제목/내용/태그/공개여부 수정
 * - 기존 이미지 삭제 가능
 * - app_main.js 수정 없이 app_community_v2.js에서 editMyPost 덮어쓰기
 * ============================================================================= */
(function () {
    'use strict';

    let editSelectedImages = [];

    function getAccessToken() {
        if (typeof Token !== 'undefined' && Token.getAccess) {
            return Token.getAccess();
        }

        return localStorage.getItem('accessToken')
            || localStorage.getItem('access_token')
            || localStorage.getItem('token')
            || sessionStorage.getItem('accessToken')
            || sessionStorage.getItem('access_token')
            || sessionStorage.getItem('token');
    }

    function authHeaders(json) {
        const token = getAccessToken();
        const headers = {};

        if (json) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        return headers;
    }

    async function requestJson(url, options) {
        const response = await fetch(url, options);

        let data = null;

        try {
            data = await response.json();
        } catch (e) {
            data = null;
        }

        if (!response.ok) {
            throw new Error(data?.message || '요청 처리에 실패했습니다.');
        }

        return data;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function styleTagsToInput(styleTags) {
        if (!styleTags) return '';

        if (Array.isArray(styleTags)) {
            return styleTags.join(', ');
        }

        try {
            const parsed = JSON.parse(styleTags);
            if (Array.isArray(parsed)) {
                return parsed.join(', ');
            }
        } catch (e) {
            // JSON이 아니면 문자열 그대로 사용
        }

        return String(styleTags);
    }

    function inputToStyleTags(value) {
        return String(value || '')
            .split(/[\s,]+/)
            .map(v => v.trim())
            .filter(Boolean)
            .join(',');
    }

    function ensureEditModal() {
        let overlay = document.getElementById('communityEditPostOverlay');

        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'communityEditPostOverlay';
        overlay.style.cssText = `
            display:none;
            position:fixed;
            inset:0;
            z-index:9999;
            background:rgba(0,0,0,.45);
            align-items:center;
            justify-content:center;
            padding:20px;
            box-sizing:border-box;
        `;

        overlay.innerHTML = `
            <div style="
                width:720px;
                max-width:100%;
                max-height:90vh;
                overflow:auto;
                background:#fff;
                border-radius:22px;
                padding:26px;
                box-sizing:border-box;
                box-shadow:0 18px 50px rgba(0,0,0,.25);
            ">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
                    <h2 style="margin:0;font-size:20px;font-weight:800;color:var(--text1)">후기 수정</h2>
                    <button type="button"
                            id="communityEditCloseBtn"
                            style="border:none;background:transparent;font-size:28px;cursor:pointer;color:var(--text3)">×</button>
                </div>

                <input type="hidden" id="communityEditPostId">

                <div class="form-group" style="margin-bottom:14px">
                    <label class="form-label">제목</label>
                    <input id="communityEditTitle"
                           class="form-input"
                           type="text"
                           placeholder="제목을 입력하세요"
                           style="width:100%">
                </div>

                <div class="form-group" style="margin-bottom:14px">
                    <label class="form-label">카테고리</label>
                    <select id="communityEditCategory"
                            class="form-input"
                            style="width:100%">
                        <option value="ROUTE">여행 경로</option>
                        <option value="STAY">숙소</option>
                        <option value="FOOD">맛집</option>
                        <option value="TOUR">관광지</option>
                        <option value="CAFE">카페</option>
                    </select>
                </div>

                <div class="form-group" style="margin-bottom:14px">
                    <label class="form-label">태그</label>
                    <input id="communityEditTags"
                           class="form-input"
                           type="text"
                           placeholder="예: 힐링, 제주, 맛집"
                           style="width:100%">
                </div>

                <div class="form-group" style="margin-bottom:14px">
                    <label class="form-label">내용</label>
                    <textarea id="communityEditContent"
                              class="form-input"
                              placeholder="내용을 입력하세요"
                              style="width:100%;min-height:180px;resize:vertical;line-height:1.7"></textarea>
                </div>

                <div class="form-group" style="margin-bottom:14px">
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);cursor:pointer">
                        <input id="communityEditPublic" type="checkbox">
                        공개글로 설정
                    </label>
                </div>

                <div class="form-group" style="margin-bottom:18px">
                    <label class="form-label">첨부 이미지</label>
                    <div id="communityEditImages"
                         style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px"></div>
                    <p id="communityEditImageEmpty"
                       style="display:none;color:var(--text3);font-size:13px;margin:8px 0 0">
                        첨부된 이미지가 없습니다.
                    </p>
                    
                    <div style="margin-top:10px">
                        <button type="button"
                                id="communityEditAddImageBtn"
                                class="btn-prev-step"
                                style="padding:9px 14px;border-radius:10px;font-size:13px">
                            새 이미지 추가
                        </button>
                    
                        <input id="communityEditImageInput"
                               type="file"
                               accept="image/*"
                               multiple
                               style="display:none">
                    </div>
                    
                    <div id="communityEditNewImagePreview"
                         style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-top:10px"></div>
                    
                </div>

                <div style="display:flex;gap:8px;justify-content:flex-end">
                    <button type="button"
                            id="communityEditCancelBtn"
                            class="btn-prev-step"
                            style="padding:11px 18px;border-radius:var(--r)">
                        취소
                    </button>
                    <button type="button"
                            id="communityEditSubmitBtn"
                            class="btn-f"
                            style="padding:11px 22px;border-radius:var(--r)">
                        수정 완료
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                closeEditModal();
            }
        });

        document.getElementById('communityEditCloseBtn').onclick = closeEditModal;
        document.getElementById('communityEditCancelBtn').onclick = closeEditModal;
        document.getElementById('communityEditSubmitBtn').onclick = submitEditPost;

        bindEditImageInput();

        return overlay;
    }

    function closeEditModal() {
        const overlay = document.getElementById('communityEditPostOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    function renderEditImages(postId, imageUrls) {
        const box = document.getElementById('communityEditImages');
        const empty = document.getElementById('communityEditImageEmpty');

        if (!box || !empty) return;

        const urls = Array.isArray(imageUrls) ? imageUrls : [];

        if (!urls.length) {
            box.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';

        box.innerHTML = urls.map(url => `
            <div class="community-edit-image-item"
                 data-image-url="${escapeHtml(url)}"
                 style="position:relative;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#fff">
                <img src="${escapeHtml(url)}"
                     alt="첨부 이미지"
                     style="width:100%;height:110px;object-fit:cover;display:block"
                     onerror="this.style.display='none'">
                <button type="button"
                        class="community-edit-image-delete"
                        data-post-id="${escapeHtml(postId)}"
                        data-image-url="${escapeHtml(url)}"
                        style="
                            width:100%;
                            border:none;
                            border-top:1px solid var(--border);
                            background:#FEF3F2;
                            color:var(--coral);
                            padding:8px 0;
                            font-size:12px;
                            font-weight:800;
                            cursor:pointer;
                        ">
                    이미지 삭제
                </button>
            </div>
        `).join('');

        box.querySelectorAll('.community-edit-image-delete').forEach(btn => {
            btn.onclick = async function () {
                const targetPostId = this.getAttribute('data-post-id');
                const imageUrl = this.getAttribute('data-image-url');

                if (!targetPostId || !imageUrl) {
                    if (typeof toast === 'function') toast('이미지 정보를 찾을 수 없습니다.');
                    return;
                }

                if (!confirm('이 이미지를 삭제하시겠습니까? 삭제하면 복구할 수 없습니다.')) {
                    return;
                }

                try {
                    await requestJson(
                        '/api/posts/' + targetPostId + '/images?imageUrl=' + encodeURIComponent(imageUrl),
                        {
                            method: 'DELETE',
                            headers: authHeaders(false)
                        }
                    );

                    const item = this.closest('.community-edit-image-item');
                    if (item) item.remove();

                    if (!box.querySelector('.community-edit-image-item')) {
                        empty.style.display = 'block';
                    }

                    if (typeof toast === 'function') toast('이미지가 삭제되었습니다.');
                } catch (e) {
                    if (typeof toast === 'function') toast(e.message || '이미지 삭제에 실패했습니다.');
                }
            };
        });
    }

    function bindEditImageInput() {
        const btn = document.getElementById('communityEditAddImageBtn');
        const input = document.getElementById('communityEditImageInput');

        if (!btn || !input) return;

        btn.onclick = function () {
            input.click();
        };

        input.onchange = handleEditImageSelect;
    }

    function handleEditImageSelect(e) {
        const files = [...(e.target.files || [])];

        if (!files.length) return;

        const preview = document.getElementById('communityEditNewImagePreview');
        if (!preview) return;

        files.forEach(file => {
            if (!file.type.startsWith('image/')) {
                if (typeof toast === 'function') toast('이미지 파일만 추가할 수 있습니다.');
                return;
            }

            const itemId = 'edit-img-' + Date.now() + '-' + Math.random().toString(16).slice(2);

            editSelectedImages.push({
                id: itemId,
                file: file
            });

            const reader = new FileReader();

            reader.onload = function (event) {
                const card = document.createElement('div');
                card.id = itemId;
                card.style.cssText = `
                border:1px solid var(--border);
                border-radius:12px;
                overflow:hidden;
                background:#fff;
            `;

                card.innerHTML = `
                <img src="${event.target.result}"
                     alt="새 이미지"
                     style="width:100%;height:110px;object-fit:cover;display:block">
                <button type="button"
                        style="
                            width:100%;
                            border:none;
                            border-top:1px solid var(--border);
                            background:#F8FAF9;
                            color:var(--text2);
                            padding:8px 0;
                            font-size:12px;
                            font-weight:800;
                            cursor:pointer;
                        ">
                    추가 취소
                </button>
            `;

                card.querySelector('button').onclick = function () {
                    editSelectedImages = editSelectedImages.filter(img => img.id !== itemId);
                    card.remove();
                };

                preview.appendChild(card);
            };

            reader.readAsDataURL(file);
        });

        e.target.value = '';
    }

    async function uploadEditImages() {
        if (!editSelectedImages.length) return [];

        const formData = new FormData();

        editSelectedImages.forEach(item => {
            formData.append('files', item.file);
        });

        const token = getAccessToken();

        const uploadRes = await fetch('/api/posts/images', {
            method: 'POST',
            headers: token ? { Authorization: 'Bearer ' + token } : {},
            body: formData
        });

        if (!uploadRes.ok) {
            throw new Error('이미지 업로드에 실패했습니다.');
        }

        return await uploadRes.json();
    }

    async function submitEditPost() {
        const postId = document.getElementById('communityEditPostId')?.value;
        const title = document.getElementById('communityEditTitle')?.value.trim();
        const content = document.getElementById('communityEditContent')?.value.trim();
        const category = document.getElementById('communityEditCategory')?.value || 'ROUTE';
        const tags = document.getElementById('communityEditTags')?.value || '';
        const isPublic = !!document.getElementById('communityEditPublic')?.checked;

        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        if (!title || !content) {
            if (typeof toast === 'function') toast('제목과 내용을 입력해주세요.');
            return;
        }

        let uploadedImageUrls = [];

        try {
            uploadedImageUrls = await uploadEditImages();
        } catch (e) {
            if (typeof toast === 'function') toast(e.message || '이미지 업로드에 실패했습니다.');
            return;
        }

        const body = {
            title: title,
            content: content,
            styleTags: inputToStyleTags(tags),
            category: category,
            isPublic: isPublic,
            planId: window._communityEditOriginalPost?.planId || null,
            imageUrls: uploadedImageUrls
        };

        try {
            await requestJson('/api/posts/' + postId, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify(body)
            });

            if (typeof toast === 'function') toast('후기가 수정되었습니다.');

            closeEditModal();

            if (typeof window._renderMyReviews === 'function') {
                await window._renderMyReviews();
            }

            if (typeof window.loadCommunityPosts === 'function') {
                await window.loadCommunityPosts(0, true);
            }

            if (
                (window._currentPostId && String(window._currentPostId) === String(postId)) ||
                (window._openedPostId && String(window._openedPostId) === String(postId))
            ) {
                if (typeof window.openPostDetail === 'function') {
                    await window.openPostDetail(postId);
                }
            }
        } catch (e) {
            if (typeof toast === 'function') toast(e.message || '수정에 실패했습니다.');
        }
    }

    window.editMyPost = async function (postId) {
        if (!postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        if (typeof Token !== 'undefined' && Token.getAccess && !Token.getAccess()) {
            if (typeof toast === 'function') toast('로그인이 필요합니다.');
            if (typeof go === 'function') go('login');
            return;
        }

        let postRes;

        try {
            postRes = await requestJson('/api/posts/' + postId, {
                method: 'GET',
                headers: authHeaders(false)
            });
        } catch (e) {
            if (typeof toast === 'function') toast(e.message || '게시글 정보를 불러오지 못했습니다.');
            return;
        }

        const post = postRes?.data || postRes;

        if (!post || !post.postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        /*
         * 프론트에서도 1차 방어.
         * 최종 권한 검사는 백엔드 PostService.updatePost/deletePostImage에서 다시 수행됨.
         */
        if (
            typeof _currentUser !== 'undefined' &&
            _currentUser &&
            _currentUser.userId &&
            post.userId &&
            Number(_currentUser.userId) !== Number(post.userId)
        ) {
            if (typeof toast === 'function') toast('본인이 작성한 글만 수정할 수 있습니다.');
            return;
        }

        const overlay = ensureEditModal();

        window._communityEditOriginalPost = post;

        document.getElementById('communityEditPostId').value = post.postId;
        document.getElementById('communityEditTitle').value = post.title || '';
        document.getElementById('communityEditContent').value = post.content || '';
        document.getElementById('communityEditCategory').value = post.category || 'ROUTE';
        document.getElementById('communityEditTags').value = styleTagsToInput(post.styleTags);
        document.getElementById('communityEditPublic').checked = post.isPublic !== false;

        renderEditImages(post.postId, post.imageUrls || []);

        editSelectedImages = [];

        const preview = document.getElementById('communityEditNewImagePreview');
        if (preview) preview.innerHTML = '';

        const imageInput = document.getElementById('communityEditImageInput');
        if (imageInput) imageInput.value = '';

        overlay.style.display = 'flex';
    };
})();

/* =============================================================================
 * community v2 - 상세 페이지 인라인 수정 모드
 * 목적:
 * - 상세 페이지에서 모달 없이 바로 게시글 수정
 * - 기존 본문 영역을 수정 폼으로 전환
 * - 기존 이미지 삭제, 새 이미지 추가 지원
 * ============================================================================= */
(function () {
    'use strict';

    let detailEditSelectedImages = [];

    function getAccessToken() {
        if (typeof Token !== 'undefined' && Token.getAccess) {
            return Token.getAccess();
        }

        return localStorage.getItem('accessToken')
            || localStorage.getItem('access_token')
            || localStorage.getItem('token')
            || sessionStorage.getItem('accessToken')
            || sessionStorage.getItem('access_token')
            || sessionStorage.getItem('token');
    }

    function authHeaders(json) {
        const token = getAccessToken();
        const headers = {};

        if (json) headers['Content-Type'] = 'application/json';
        if (token) headers['Authorization'] = 'Bearer ' + token;

        return headers;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function styleTagsToInput(styleTags) {
        if (!styleTags) return '';

        if (Array.isArray(styleTags)) {
            return styleTags.join(', ');
        }

        try {
            const parsed = JSON.parse(styleTags);
            if (Array.isArray(parsed)) return parsed.join(', ');
        } catch (e) {
            // JSON이 아니면 그대로 사용
        }

        return String(styleTags);
    }

    function inputToStyleTags(value) {
        return String(value || '')
            .split(/[\s,]+/)
            .map(v => v.trim())
            .filter(Boolean)
            .join(',');
    }

    async function requestJson(url, options) {
        const response = await fetch(url, options);

        let data = null;

        try {
            data = await response.json();
        } catch (e) {
            data = null;
        }

        if (!response.ok) {
            throw new Error(data?.message || '요청 처리에 실패했습니다.');
        }

        return data;
    }

    function canShowDetailEditButton(post) {
        // 상세 페이지에서는 로그인 상태면 수정 버튼을 보여준다.
        return !!getAccessToken() && post && post.postId;
    }

    function hideOldDetailEditButton() {
        // 상세 페이지 안에 있는 예전 수정 버튼만 숨긴다.
        const reviewPage =
            document.getElementById('page-review') ||
            document.querySelector('.review-detail') ||
            document.querySelector('.review-page');

        if (!reviewPage) return;

        reviewPage.querySelectorAll('button').forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';

            if (onclick.includes("go('edit-review')") || onclick.includes('go("edit-review")')) {
                btn.style.display = 'none';
                btn.onclick = null;
            }
        });
    }

    function ensureDetailEditButton() {
        hideOldDetailEditButton();

        const post = window._currentPostDetail;
        if (!post) return;

        const meta = document.getElementById('pr-meta');
        if (!meta) return;

        let btn = document.getElementById('btn-detail-inline-edit');

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-detail-inline-edit';
            btn.type = 'button';
            btn.className = 'btn-f';
            btn.style.cssText = `
                margin-left:8px;
                padding:5px 10px;
                border-radius:8px;
                font-size:12px;
                line-height:1.2;
                height:28px;
                width:max-content;
                align-items:center;
            `;
            btn.textContent = '수정';
            meta.insertAdjacentElement('beforeend', btn);
        }

        if (!canShowDetailEditButton(post)) {
            btn.style.display = 'none';
            btn.onclick = null;
            return;
        }

        btn.style.display = 'inline-flex';
        btn.onclick = function () {
            startDetailEditMode(post.postId);
        };
    }

    async function uploadDetailEditImages() {
        if (!detailEditSelectedImages.length) return [];

        const formData = new FormData();

        detailEditSelectedImages.forEach(item => {
            formData.append('files', item.file);
        });

        const token = getAccessToken();

        const uploadRes = await fetch('/api/posts/images', {
            method: 'POST',
            headers: token ? { Authorization: 'Bearer ' + token } : {},
            body: formData
        });

        if (!uploadRes.ok) {
            throw new Error('이미지 업로드에 실패했습니다.');
        }

        return await uploadRes.json();
    }

    function renderExistingImagesForEdit(post) {
        const urls = Array.isArray(post.imageUrls) ? post.imageUrls : [];

        if (!urls.length) {
            return `
                <p id="detailEditImageEmpty"
                   style="color:var(--text3);font-size:13px;margin:6px 0 0">
                    첨부된 이미지가 없습니다.
                </p>
            `;
        }

        return `
            <div id="detailEditExistingImages" style="
                    display:grid;
                    grid-template-columns:repeat(auto-fill,minmax(120px,120px));
                    gap:10px;
                    margin-top:8px;
                    align-items:start;">
                ${urls.map(url => `
                    <div class="detail-edit-image-item"
                         data-image-url="${escapeHtml(url)}"
                         style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#fff">
                        <img src="${escapeHtml(url)}"
                             alt="첨부 이미지"
                             style="width:100%;height:92px;object-fit:cover;display:block"
                             onerror="this.style.display='none'">

                        <button type="button"
                                class="detail-edit-image-delete"
                                data-image-url="${escapeHtml(url)}"
                                style="
                                    width:100%;
                                    border:none;
                                    border-top:1px solid var(--border);
                                    background:#FEF3F2;
                                    color:var(--coral);
                                    padding:8px 0;
                                    font-size:12px;
                                    font-weight:800;
                                    cursor:pointer;
                                ">
                            이미지 삭제
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function bindExistingImageDelete(postId) {
        document.querySelectorAll('.detail-edit-image-delete').forEach(btn => {
            btn.onclick = async function () {
                const imageUrl = this.getAttribute('data-image-url');

                if (!imageUrl) {
                    if (typeof toast === 'function') toast('이미지 정보를 찾을 수 없습니다.');
                    return;
                }

                if (!confirm('이 이미지를 삭제하시겠습니까? 삭제하면 복구할 수 없습니다.')) {
                    return;
                }

                try {
                    await requestJson(
                        '/api/posts/' + postId + '/images?imageUrl=' + encodeURIComponent(imageUrl),
                        {
                            method: 'DELETE',
                            headers: authHeaders(false)
                        }
                    );

                    const item = this.closest('.detail-edit-image-item');
                    if (item) item.remove();

                    if (typeof toast === 'function') toast('이미지가 삭제되었습니다.');
                } catch (e) {
                    if (typeof toast === 'function') toast(e.message || '이미지 삭제에 실패했습니다.');
                }
            };
        });
    }

    function bindNewImageInput() {
        const btn = document.getElementById('detailEditAddImageBtn');
        const input = document.getElementById('detailEditImageInput');
        const preview = document.getElementById('detailEditNewImagePreview');

        if (!btn || !input || !preview) return;

        btn.onclick = function () {
            input.click();
        };

        input.onchange = function (e) {
            const files = [...(e.target.files || [])];

            files.forEach(file => {
                if (!file.type.startsWith('image/')) {
                    if (typeof toast === 'function') toast('이미지 파일만 추가할 수 있습니다.');
                    return;
                }

                const itemId = 'detail-edit-img-' + Date.now() + '-' + Math.random().toString(16).slice(2);

                detailEditSelectedImages.push({
                    id: itemId,
                    file: file
                });

                const reader = new FileReader();

                reader.onload = function (event) {
                    const card = document.createElement('div');
                    card.id = itemId;
                    card.style.cssText = `
                        border:1px solid var(--border);
                        border-radius:12px;
                        overflow:hidden;
                        background:#fff;
                    `;

                    card.innerHTML = `
                        <img src="${event.target.result}"
                             alt="새 이미지"
                             style="width:100%;height:92px;object-fit:cover;display:block">

                        <button type="button"
                                style="
                                    width:100%;
                                    border:none;
                                    border-top:1px solid var(--border);
                                    background:#F8FAF9;
                                    color:var(--text2);
                                    padding:8px 0;
                                    font-size:12px;
                                    font-weight:800;
                                    cursor:pointer;
                                ">
                            추가 취소
                        </button>
                    `;

                    card.querySelector('button').onclick = function () {
                        detailEditSelectedImages = detailEditSelectedImages.filter(img => img.id !== itemId);
                        card.remove();
                    };

                    preview.appendChild(card);
                };

                reader.readAsDataURL(file);
            });

            e.target.value = '';
        };
    }

    async function startDetailEditMode(postId) {
        if (!postId) return;

        let post;

        try {
            const res = await requestJson('/api/posts/' + postId, {
                method: 'GET',
                headers: authHeaders(false)
            });

            post = res?.data || res;
        } catch (e) {
            if (typeof toast === 'function') toast(e.message || '게시글 정보를 불러오지 못했습니다.');
            return;
        }

        if (!post || !post.postId) {
            if (typeof toast === 'function') toast('게시글 정보를 찾을 수 없습니다.');
            return;
        }

        detailEditSelectedImages = [];

        const titleEl = document.getElementById('pr-title');
        const bodyEl = document.getElementById('pr-body');
        const planBadge = document.getElementById('pr-plan-badge');
        const placeList = document.getElementById('pr-place-list');
        const comments = document.getElementById('pr-comments');

        const editBtn = document.getElementById('btn-detail-inline-edit');
        const reviewCta = document.querySelector('.review-cta');

        hideOldDetailEditButton();

        if (editBtn) editBtn.style.display = 'none';
        if (reviewCta) reviewCta.style.display = 'none';

        if (!titleEl || !bodyEl) {
            if (typeof toast === 'function') toast('수정 영역을 찾지 못했습니다.');
            return;
        }

        titleEl.innerHTML = `
            <input id="detailEditTitle"
                   type="text"
                   value="${escapeHtml(post.title || '')}"
                   style="
                        width:100%;
                        padding:12px 14px;
                        border-radius:12px;
                        border:1.5px solid var(--border2);
                        font-size:22px;
                        font-weight:800;
                        box-sizing:border-box;
                   ">
        `;

        if (planBadge) planBadge.style.display = 'none';
        if (placeList) placeList.style.display = 'none';
        if (comments) comments.style.display = 'none';

        bodyEl.innerHTML = `
            <div class="detail-inline-edit-box"
                 style="display:flex;flex-direction:column;gap:14px">

                <div>
                    <label style="display:block;font-size:13px;font-weight:800;margin-bottom:6px;color:var(--text2)">
                        카테고리
                    </label>
                    <select id="detailEditCategory"
                            style="width:100%;padding:11px 12px;border-radius:10px;border:1.5px solid var(--border2)">
                        <option value="ROUTE">여행 경로</option>
                        <option value="STAY">숙소</option>
                        <option value="FOOD">맛집</option>
                        <option value="TOUR">관광지</option>
                        <option value="CAFE">카페</option>
                    </select>
                </div>

                <div>
                    <label style="display:block;font-size:13px;font-weight:800;margin-bottom:6px;color:var(--text2)">
                        태그
                    </label>
                    <input id="detailEditTags"
                           type="text"
                           value="${escapeHtml(styleTagsToInput(post.styleTags))}"
                           placeholder="예: 힐링, 제주, 맛집"
                           style="width:100%;padding:11px 12px;border-radius:10px;border:1.5px solid var(--border2);box-sizing:border-box">
                </div>

                <div>
                    <label style="display:block;font-size:13px;font-weight:800;margin-bottom:6px;color:var(--text2)">
                        내용
                    </label>
                    <textarea id="detailEditContent"
                              style="width:100%;min-height:240px;padding:12px 14px;border-radius:12px;border:1.5px solid var(--border2);line-height:1.7;resize:vertical;box-sizing:border-box">${escapeHtml(post.content || '')}</textarea>
                </div>

                <div>
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);cursor:pointer">
                        <input id="detailEditPublic" type="checkbox">
                        공개글로 설정
                    </label>
                </div>

                <div>
                    <label style="display:block;font-size:13px;font-weight:800;margin-bottom:6px;color:var(--text2)">
                        기존 이미지
                    </label>
                    ${renderExistingImagesForEdit(post)}
                </div>

                <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                        <label style="font-size:13px;font-weight:800;color:var(--text2)">
                            새 이미지
                        </label>
                
                        <button type="button"
                                id="detailEditAddImageBtn"
                                class="btn-prev-step"
                                style="padding:7px 12px;border-radius:10px;font-size:12px">
                            이미지 추가
                        </button>
                    </div>
                
                    <input id="detailEditImageInput"
                           type="file"
                           accept="image/*"
                           multiple
                           style="display:none">
                
                    <div id="detailEditNewImagePreview"
                         style="
                            display:grid;
                            grid-template-columns:repeat(auto-fill,minmax(120px,120px));
                            gap:10px;
                            margin-top:10px;
                            align-items:start;
                         "></div>
                </div>

                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
                    <button type="button"
                            id="detailEditCancelBtn"
                            class="btn-prev-step"
                            style="padding:11px 18px;border-radius:10px">
                        취소
                    </button>

                    <button type="button"
                            id="detailEditSaveBtn"
                            class="btn-f"
                            style="padding:11px 22px;border-radius:10px">
                        저장
                    </button>
                </div>
            </div>
        `;

        document.getElementById('detailEditCategory').value = post.category || 'ROUTE';
        document.getElementById('detailEditPublic').checked = post.isPublic !== false;

        bindExistingImageDelete(post.postId);
        bindNewImageInput();

        document.getElementById('detailEditCancelBtn').onclick = function () {
            const reviewCta = document.querySelector('.review-cta');
            if (reviewCta) reviewCta.style.display = '';

            if (typeof window.openPostDetail === 'function') {
                window.openPostDetail(post.postId);
            }
        };

        document.getElementById('detailEditSaveBtn').onclick = async function () {
            await saveDetailEdit(post.postId, post);
        };
    }

    async function saveDetailEdit(postId, originalPost) {
        const title = document.getElementById('detailEditTitle')?.value.trim();
        const content = document.getElementById('detailEditContent')?.value.trim();
        const category = document.getElementById('detailEditCategory')?.value || 'ROUTE';
        const tags = document.getElementById('detailEditTags')?.value || '';
        const isPublic = !!document.getElementById('detailEditPublic')?.checked;

        if (!title || !content) {
            if (typeof toast === 'function') toast('제목과 내용을 입력해주세요.');
            return;
        }

        let uploadedImageUrls = [];

        try {
            uploadedImageUrls = await uploadDetailEditImages();
        } catch (e) {
            if (typeof toast === 'function') toast(e.message || '이미지 업로드에 실패했습니다.');
            return;
        }

        const body = {
            title: title,
            content: content,
            styleTags: inputToStyleTags(tags),
            category: category,
            isPublic: isPublic,
            planId: originalPost?.planId || null,
            imageUrls: uploadedImageUrls
        };

        try {
            await requestJson('/api/posts/' + postId, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify(body)
            });

            if (typeof toast === 'function') toast('후기가 수정되었습니다.');

            const reviewCta = document.querySelector('.review-cta');
            if (reviewCta) reviewCta.style.display = '';

            detailEditSelectedImages = [];

            if (typeof window.loadCommunityPosts === 'function') {
                await window.loadCommunityPosts(0, true);
            }

            if (typeof window.openPostDetail === 'function') {
                await window.openPostDetail(postId);
            }
        } catch (e) {
            if (typeof toast === 'function') toast(e.message || '수정에 실패했습니다.');
        }
    }

    const prevOpenPostDetailForInlineEdit = window.openPostDetail;

    if (typeof prevOpenPostDetailForInlineEdit === 'function') {
        window.openPostDetail = async function (postId) {
            const result = await prevOpenPostDetailForInlineEdit.apply(this, arguments);

            setTimeout(ensureDetailEditButton, 100);
            setTimeout(ensureDetailEditButton, 300);

            return result;
        };
    }

    window.startDetailEditMode = startDetailEditMode;
})();
