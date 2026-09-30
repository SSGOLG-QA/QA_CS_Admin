# cs.html 개선 필요 사항

어드민(`smartscore_admin.html`) 기준으로 `smartscore_cs.html`에서 개선이 필요한 항목 정리.

---

## 완료된 항목

### 1. 업데이트 — 복수 솔루션 구조 ✅

`data-sol` 속성을 공백 구분 다중값으로 지원. 필터 로직을 `split(' ').includes(filter)`로 변경하여 복수 솔루션 업데이트가 관련 탭 모두에 노출됨. 목록에서 복수 솔루션 뱃지도 함께 표시.

---

### 2. 업데이트 — 상태 표기 불일치 ✅

"배포 예정" 하드코딩 문자열은 `[BACKLOG]` 주석 처리된 검색결과 페이지 안에만 존재하며 실제 화면에 미노출. 업데이트 목록·상세 모두 `반영완료` 상태 데이터 기반으로 정리됨.

---

### 3. 업데이트 — 상세 클릭 동작 ✅

`pg-update-item`에 `onclick="showUpdateDetail(idx)"` 연결. `showUpdateDetail()` 함수가 UPDATES 배열에서 데이터를 읽어 솔루션별 섹션으로 동적 렌더링.

---

### 4. 공지사항 상세 — 본문 동적 렌더링 ✅

`showNoticeDetail(sol, title, date, content)` 함수가 전달받은 본문을 줄바꿈 기준으로 파싱하여 `#nd-content`에 동적 렌더링. 공지마다 다른 본문이 표시됨.

---

### 5. 공지사항·가이드 상세 — URL 자동 링크 변환 ✅

`linkifyText()` 함수를 공지 상세(`nd-content`)와 가이드 문서 상세(`doc-body`) 양쪽에 적용. 본문 내 `https://` URL이 클릭 가능한 링크로 자동 변환됨.

---

### 6. FAQ — 아코디언 토글 ✅

`toggleFaq(qRow)` 함수 구현. `faq-item-card`에 `.open` 클래스 토글로 답변 영역 열기/닫기. chevron 아이콘 180° 회전 애니메이션 적용.

---

### 7. 새 문의 접수 — 필수 항목 유효성 검사 ✅

`submitInquiry()` 함수 구현. 솔루션 선택·제목·상세 내용 필수 항목 검사 및 인라인 에러 메시지 표시. "문의 접수하기" 버튼에 `onclick="submitInquiry()"` 연결.

---

### 8. 내 문의 / 골프장 문의 목록 — 클릭 시 상세 이동 ✅

`inq-row`에 `onclick="showInquiryDetail(...)"` 연결. 채팅방 형태의 상세 뷰로 이동하며 상태에 따라 추가 문의 입력창 또는 재질문 안내를 표시.

---

### 9. 홈 공지사항·업데이트 탭 — 필터링 ✅

홈 `.tab-bar` 이벤트 핸들러에 `.notice-item`·`.update-item` 필터링 로직 추가. 탭 선택 시 해당 솔루션 항목만 표시하며, 결과가 0건이면 빈 상태(`home-empty`) 안내 노출.

---

### 10. 홈 "새 문의 접수하기" 버튼 — onclick ✅

`new-ticket-btn`에 `onclick="showPage('newinquiry')"` 연결 완료.

---

## 백로그 항목

### 11. 검색 기능 — 백로그 (후순위)

현재 cs.html에 구현된 검색 관련 코드는 모두 `<!-- [BACKLOG] -->` 주석 처리되어 있음.

### 주석 처리된 영역

| 위치 | 내용 |
|---|---|
| CSS | GNB 검색 버튼/패널, 홈 검색박스, 검색결과 페이지 전체 스타일, 퀵태그 스타일 |
| GNB HTML | 검색 버튼(`gnb-search-toggle`), 검색 패널(`gnb-search-panel`) |
| 홈 HTML | 히어로 검색박스(`home-search-input`), 퀵태그(`quick-tags`) |
| 페이지 HTML | 검색결과 페이지 전체(`page-search`) |
| JS | `setSearch()`, `doSearch()`, `toggleGnbSearch()` |
| ALL_PAGES | `'search'` 항목 주석 처리 |

### 향후 개선 방향 (검토 필요)

- **실시간 검색**: 입력 즉시 가이드·공지·FAQ 결과 노출 (debounce 처리)
- **검색 범위**: 솔루션 가이드 제목/본문 + 공지사항 + 업데이트 + FAQ + 문의/답변
- **퀵태그**: admin에서 운영자가 직접 설정 가능한 구조로 연동
- **검색결과 페이지**: 카테고리별 섹션 분리 표시, 검색어 하이라이팅(`<em>`)
- **GNB 검색**: 슬라이드다운 패널 방식, Enter / 검색 버튼으로 실행
- **검색어 동기화**: 홈 검색창 ↔ GNB 검색창 ↔ 결과 페이지 검색창 값 동기화
