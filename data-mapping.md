# Data Mapping 정의서

`standard-template-data.json` 기준 각 HTML 페이지의 data-\* 속성 매핑 정의.

---

## 구현 주의사항

- 각 페이지 mapper 파일(`js/data-mapper/pages/*.js`)에서 아래 매핑 정의를 기준으로 `data-*` 속성을 탐색하여 데이터를 주입하도록 구현.
- 각 mapper에서 구현한 매핑 함수는 `js/preview-handler.js`에도 등록 필요. 등록하지 않으면 백오피스 미리보기 화면에 데이터가 반영되지 않음.
- **객실 목록의 단일 소스는 `homepage.customFields.roomtypes`**다. `BaseDataMapper.getRoomtypes()`가 localhost/preview 두 경로를 모두 처리하므로 페이지 매퍼는 이 메서드만 쓴다.
  최상위 `rooms[]`는 `roomtypes[i].id === rooms[j].id` 매칭으로 인원/평형/집기 등 **상세값을 조회할 때만** 사용한다.
- 이미지·아이콘 등 템플릿 고정 에셋은 `images/` 에 두고 상대경로(`images/xxx.png`)로 참조한다. 원본 사이트 도메인 직접 참조 금지.
- 페이지 간 링크는 상대경로(`./xxx.html`)를 쓴다. 절대경로(`/xxx.html`)는 GitHub Pages 하위 경로 배포에서 깨진다.
- **렌더 게이트**: 각 HTML `<head>`에 `html.tpl-loading body{opacity:0}` + `window.__tplReveal` 인라인 스크립트를 둔다. 매핑 완료 시(`BaseDataMapper.initialize/updateData`, `preview-handler.renderTemplate`) 해제해 placeholder 깜빡임(FOUC)을 막는다.

---

## 공통 상수

### totalRoomCount 한글 변환 테이블

```js
const ROOM_COUNT_LABELS = {
  bedroom: '침대룸',
  bathroom: '화장실',
  livingRoom: '거실',
  ondol: '온돌룸',
  kitchen: '주방'
};
```

값이 1 이상인 항목만 나열. `roomStructures`와 조합:

```
roomStructures[0] + "/ " + 값≥1인 항목들 나열
예) "원룸형/ 침대룸 화장실 주방"
```

### 평형 환산

`rooms[].size` 는 **제곱미터(㎡)** 값이다. 화면에는 평으로 환산해 노출한다.

```js
Math.round((sqm / 3.305785) * 10) / 10 + '평'; // 1평 = 3.305785㎡, 소수 1자리
// 예) 62.81㎡ → "19평"
```

### 연락처 정규화

`property.contactPhone` 은 **문자열 배열(`string[]`)**이다. 어떤 번호를 내려줄지는 BFF가 계약 타입(총판A/총판B/판매대행)을 보고 판단하므로 **템플릿은 받은 배열을 그대로 렌더링**하며 타입 분기를 두지 않는다.

`BaseDataMapper.toPhoneList(value)` 가 배열/문자열/누락을 모두 문자열 배열로 정규화한다(빈 값이면 `['1833-9306']`).

---

## common/header.html

| data-\* 속성                          | 요소                                                    | JSON 경로                                                                 |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `data-logo`                           | 로고 `<img>` (PC + 모바일 aside)                        | `homepage.images[0].logo[isSelected].url` (없으면 텍스트 로고 폴백)       |
| `data-booking-link`                   | 예약하기 `<a>` (전체, href 직접 주입)                   | `property.realtimeBookingId`                                              |
| `data-rooms-submenu`                  | ROOMS 서브메뉴 컨테이너 `<ul>` (PC + 모바일)            | — (동적 생성 기준점)                                                      |
| `data-room-menu-link`                 | 미리보기(layout-map.html) 링크                          | — (동적 생성 앵커, 이 뒤에 객실 li 추가)                                  |
| `data-facility-menu-link`             | SPECIAL 서브메뉴 컨테이너 `<ul>` (PC + 모바일)          | — (컨테이너 비우고 동적 생성)                                             |
| `data-travel-menu`                    | TRAVEL 메뉴 `<li>`/`<div>`/`<ul>` (PC + 모바일)         | `customFields.pages.nearbyAttractions.sections[0].enabled` (false면 숨김) |
| `data-travel-submenu`                 | TRAVEL 서브메뉴 컨테이너                                | — (동적 생성 기준점)                                                      |
| `data-menu-id="nearby-attractions"`   | 주변여행지 링크                                         | —                                                                         |
| `data-menu-id="layout-map"`           | ROOMS `<li>` (미리보기, PC + 모바일)                    | `customFields.pages.layoutMap.sections[0].enabled` (섹션 없음/false면 숨김) |
| `data-rooms-link`                     | 대메뉴 ROOMS `<a>` (PC. 모바일 aside ROOMS 는 링크 아님) | `customFields.pages.layoutMap.sections[0].enabled` (켜짐 → `layout-map.html` / 꺼짐 → 첫 객실 상세) |
| `data-homepage-socialLinks-blog`      | 네이버 버튼 `<a>` (헤더 `.hd_sns` + aside `.aside_sns`) | `homepage.socialLinks.blog` (없으면 숨김)                                 |
| `data-homepage-socialLinks-instagram` | 인스타 버튼 `<a>` (헤더 `.hd_sns` + aside `.aside_sns`) | `homepage.socialLinks.instagram` (없으면 숨김)                            |
| `data-social-wrap`                    | 두 버튼 래퍼 (`.hd_sns` / `.aside_sns`)                 | 보이는 버튼이 없으면 래퍼째 숨김                                          |

> ⚠️ 메뉴 구조: 대메뉴 6개 — ABOUT(펜션소개) / ROOMS(미리보기 + 객실) / SPECIAL / RESERVE / TRAVEL / LOCATION. YBS 버튼은 **footer** 에 위치. 객실 메뉴는 `roomtypes[]` 기준 `<li><a>` 생성.
>
> ℹ️ 원본 사이트는 ABOUT 하위가 `펜션소개`+`외부풍경` 2개지만, 백오피스 페이지 편집 화면이 8개(`index`/`main`/`room`/`facility`/`reservation`/`directions` + 선택 `layoutMap`/`nearbyAttractions`)뿐이라 **`main.html` 한 페이지로 합쳤다.** 외부풍경 이미지는 `main.hero.images` 로 들어온다.
>
> **네이버·인스타그램 버튼** (`homepage.socialLinks`)
>
> - `HeaderFooterMapper.mapSocialLinks()`(mapPage 에서 호출)가 `facebook / instagram / blog / youtube` 4종을 처리한다.
>   값이 있으면 `href` + `target="_blank" rel="noopener"` 를 넣고 노출, `null`·빈 문자열·공백·키 없음이면 숨긴다.
>   D2형 마크업은 blog(네이버)·instagram 두 개. 마크업은 `style="display: none"` 으로 시작(매핑 전 깜빡임 없음).
>   버튼이 하나라도 보이면 루트(`<html>`)에 `data-social="on"`, 아니면 `"off"`.
> - 위치·크기 (원본 saulaieps.kr·학암포랑데뷰 헤더엔 SNS 버튼이 없어 예약 아이콘 기준으로 맞춤)
>   - 641px 이상: 헤더 예약 아이콘(`.btn_hd_res`) **왼쪽** 같은 줄 `[N][인스타][예약]`, `.hd_cont` 안 absolute 세로 중앙.
>     PC 30px(예약 아이콘과 12px, 서로 10px) / ≤1023 26px(간격 8px) / ≤860 24px.
>   - 640px 이하: 가운데 로고와 겹쳐서 헤더에선 숨기고 **aside 메뉴 맨 아래**(LOCATION 다음) 왼쪽 정렬 30px, 간격 12px.
> - 어드민 프리뷰 `section_update` 의 `section === 'socialLinks'` 는 메시지를 루트에 병합하지 않고
>   `homepage.socialLinks` 에 반영한 뒤 헤더 버튼만 다시 매핑한다(다른 섹션은 기존 동작).

---

## common/footer.html

| data-\* 속성                  | 요소                              | JSON 경로                                                                 |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| `data-footer-phone`           | `.tel` 번호 텍스트 `<span>`       | `property.contactPhone` (배열 항목)                                       |
| `data-footer-phone-link`      | `.tel` 전화번호 `<a>` (tel: 링크) | `property.contactPhone` — 번호 개수만큼 `<a>` 복제, `" \| "` 로 구분 노출 |
| `data-footer-address`         | `.address` 주소 `<p>`             | `property.businessInfo.businessAddress`                                   |
| `data-footer-business-name`   | 업체명 `<span>`                   | `property.businessInfo.businessName`                                      |
| `data-footer-representative`  | 대표자 `<span>`                   | `property.businessInfo.representativeName`                                |
| `data-footer-business-number` | 사업자번호 `<span>`               | `property.businessInfo.businessNumber`                                    |
| `data-ybs-button`             | 야놀자 YBS `<a>`                  | `property.ybsId` (없으면 숨김)                                            |
| `data-booking-link`           | 실시간 예약 버튼 `<a>`            | `property.realtimeBookingId`                                              |

> D 템플릿은 사업자 정보를 개별 라인(`<p>`)으로 표기하므로 통합 `data-footer-business-info`/`data-footer-slogan` 대신 라인별 속성으로 매핑한다. (슬로건 영역 없음)
>
> ⚠️ **전화번호 소스 주의**: `businessInfo.businessPhone`(사업자 등록 전화번호)이 아니라 `property.contactPhone`(홈페이지 노출용 번호 배열)을 쓴다. 전자를 쓰면 BFF가 새 규칙 번호를 내려도 화면에 반영되지 않는다.
>
> ℹ️ **제거된 요소** — 매핑 소스가 없어 정적 하드코딩이던 항목을 삭제했다.
>
> - `.copy` 저작권 표시 — `property.tripProviderName` 으로 치환, 없으면 `COPYRIGHT©트립일레븐. ALL RIGHTS RESERVED.`
> - 개인정보처리방침 링크(트립일레븐 공통 약관 페이지) — JSON에 숙소별 약관 URL 필드 없음

---

## SEO / 메타 (전 페이지 공통)

`js/preview-handler.js`의 `applySeo()`가 모든 페이지에서 `homepage.seo`를 head에 주입 (standalone + 백오피스 preview 양쪽). meta 태그는 JS가 동적 생성(없으면 head에 추가)하므로 각 HTML 수정 불필요.

| 대상                                         | JSON 경로                                 |
| -------------------------------------------- | ----------------------------------------- |
| `<title data-page-title>` + `document.title` | `homepage.seo.title`                      |
| `<meta name="description">`                  | `homepage.seo.description`                |
| `<meta name="keywords">`                     | `homepage.seo.keywords`                   |
| `<meta property="og:title">`                 | `homepage.seo.title`                      |
| `<meta property="og:description">`           | `homepage.seo.description`                |
| `<meta name="naver-site-verification">`      | `homepage.seo.naverSiteVerification`      |
| `<meta name="google-site-verification">`     | `homepage.seo.googleSiteVerification`     |
| `<link rel="icon">` (파비콘)                 | `homepage.images[0].logo[isSelected].url` |

> `naver/googleSiteVerification` 과 파비콘은 `header-footer-mapper` 가 전 페이지에서 주입한다(`updateMetaTags()` / `mapFavicon()`). 값이 없으면 태그를 만들지 않는다.

---

## 테마 색상/폰트 (전 페이지 공통)

색상/폰트의 **소스는 `styles/theme.css`의 `:root` 변수**다. 모든 CSS는 `var(--color-primary/secondary)`, `var(--font-ko-main/ko-sub/en-main)`를 참조하며, 페이지별 테마 변경은 theme.css만 수정하면 된다. (폰트 import도 theme.css에 통합)

> ⚠️ standalone(실제 페이지)은 **theme.css를 그대로 사용**하고 JSON으로 덮어쓰지 않는다. `homepage.customFields.theme`을 적용하는 `applyThemeVariables()`는 **백오피스 preview에서만** 호출된다 (에디터 실시간 색상/폰트 편집용). — template-C와 동일.

| CSS 변수            | JSON 경로                              |
| ------------------- | -------------------------------------- |
| `--color-primary`   | `theme.color.primary`                  |
| `--color-secondary` | `theme.color.secondary`                |
| `--font-ko-main`    | `theme.font.koMain` (family/cdn/woff2) |
| `--font-ko-sub`     | `theme.font.koSub`                     |
| `--font-en-main`    | `theme.font.enMain`                    |

> 폰트 역할 구분: **제목·라벨은 `--font-ko-main` / `--font-en-main`, 백오피스에서 입력하는 한글 본문은 `--font-ko-sub`**.
> **ko-sub 적용 대상 (제목이 아닌 한글 본문 전부)**
>
> | 셀렉터                          | 내용                                                     |
> | ------------------------------- | -------------------------------------------------------- |
> | `.main_menu .menu_txt`          | index 하단 소개 문구                                     |
> | `.title_box p`                  | #태그 (`propertyThemes` / 시설명)                        |
> | `.room_list .swiper-slide p`    | Rooms Preview 객실 구조                                  |
> | `.visual .visual_txt p`         | 비주얼 하단 보조 텍스트 (room 객실 구조)                 |
> | `.about_txt`                    | main 소개 설명                                           |
> | `.about_bnr li .txt p`          | main 소개 블록 설명                                      |
> | `.about_wide_bnr p`             | 하단 와이드 배너 설명                                    |
> | `.sub_img_bnr li .txt p`        | room·facility 교차 배너 설명                             |
> | `.special_txt`                  | 시설 설명                                                |
> | `.travel_list ul li p`          | 주변여행지 설명                                          |
> | `.table_default th, td`         | 객실 정보 표 (한 표 안에서 폰트가 갈리지 않도록 th 포함) |
> | `.table_text`                   | 객실 편의시설 목록                                       |
> | `.reservation_box dd`           | 이용안내 / 환불규정 본문                                 |
> | `.map_info strong`              | 오시는길 주소                                            |
> | `.map_info dl dd`               | 오시는길 안내 본문                                       |
> | `.footer_wrap .footer .address` | 푸터 사업자 정보                                         |
> | `.footer_wrap .copy`            | 푸터 카피라이트                                          |
> | `.ff_notokr`                    | room 객실명 (원본 유틸 클래스 이식)                      |
>
> ko-main 으로 남기는 것 — 제목·라벨 계열: `h3` / `dt` 소제목 /
> 헤더·모바일 메뉴 / `.sub_cate_wrap` 탭 / `.sub_visual .txt_box` 페이지 라벨 / `.footer_wrap .privacy` 버튼.
> t-template-D 의 `.stxt`/`.ctxt`, L 의 `.tx2~4` 와 같은 원칙.
>
> **영문 고정 라벨은 `--font-en-main`** — `.title_box h3`(Rooms Preview 등), `.sub_visual h3`(ABOUT 등),
> `.special_list span`(SPECIAL), `.special_list .txt_box a`(VIEW MORE), `.menu_li .box:before`(01/02/03),
> `.reservation_box dt`(카운터).
>
> **영문·한글이 섞이는 제목 슬롯은 폰트 스택** `var(--font-en-main), var(--font-ko-main)` 로 둔다.
> 영문 글자는 en-main, 한글은 ko-main 으로 글자 단위로 갈린다 (헤더 `depth_box` 가 쓰던 방식).
> 제목이므로 한글 폴백은 ko-sub 이 아니라 **ko-main** 이다.
> 해당 슬롯 — `.visual .visual_txt strong`(index=`nameEn` / facility=시설명 / room=객실명),
> `.about_bnr li .txt strong`(`about[i].title`), `.sub_img_bnr li .txt strong`(`nameEn`→`name` 폴백),
> `.about_wide_bnr strong`(`closing.title`, 폴백 `Welcome To Pension`).
>
> `.special_list .swiper-slide strong`(부대시설명)은 한글 입력이 일반적이라 `ko-main` 단독으로 둔다.
>
> ℹ️ `.ff_notokr` 은 원본 사이트(`saulaieps.kr`)의 유틸 클래스 이식이다(`room.html` 객실명에 사용).
> 원본은 body 기본 폰트가 `Arial, Helvetica, 'Noto Sans KR' …` 순이라 한글 요소에 Noto 를 강제하려는 용도였다.
> D2 는 특정 폰트에 묶이지 않도록 `--font-ko-sub` 로 매핑한다 (t-template-F 와 동일).
> ko-main 으로 두면 body 기본값과 같아 클래스가 아무 효과도 갖지 못한다.

---

## 팝업 (index.html 전용)

`styles/popup.css` + `js/popup.js`(`PopupManager`) 공통 컴포넌트. **`index.html`에만** 적용한다.

```html
<link rel="stylesheet" type="text/css" href="styles/popup.css" />
...
<div id="popup-container"></div>
...
<script src="js/popup.js"></script>
```

| 항목               | JSON 경로                                                                   |
| ------------------ | --------------------------------------------------------------------------- |
| 팝업 목록          | `homepage.customFields.popup.popups[]`                                      |
| 노출 여부          | `popups[i].enabled`                                                         |
| 표시 기간          | `popups[i].startDate` ~ `popups[i].endDate`                                 |
| 정렬               | `popups[i].sortOrder`                                                       |
| 이미지             | `popups[i].images[isSelected]` — **선택 이미지마다 박스 1개**를 동시에 표시 |
| 링크               | `popups[i].link`                                                            |
| 제목/설명 오버레이 | `popups[i].title` / `popups[i].description`                                 |

**노출 조건**: `enabled === true` + 표시기간 내 + 선택 이미지 1장 이상 (+ 실사이트는 `오늘 숨김 아님`)

**동작 규칙**

- standalone: `popup.js`가 `./standard-template-data.json` 을 직접 fetch
- 백오피스 미리보기: `window.parent !== window` 로 감지. `preview-handler` 의 `POPUP_UPDATE` 메시지 → `updateFromPreview()`.
  전체 데이터 갱신(INITIAL_DATA/TEMPLATE_UPDATE 등) 시에도 `refreshPopupFromTemplate()` 로 반영하되, **페이로드에 `popup` 노드가 있을 때만** 갱신한다(`if (!popupNode) return`).
  팝업과 무관한 수정으로 빈 배열이 되어 떠 있던 팝업이 닫히는 것을 막기 위함 — template-center-slider / template-full-banner-accordion 과 동일한 가드.
- 닫기: 박스별 닫기 / 배경 클릭 / ESC
- **"오늘 하루 보지 않기"는 박스 단위**. `boxId = popupId + 이미지 index`, 저장 키 `popup_hidden_<boxId>`
  - **실사이트에서만 적용**한다(`localStorage`, 하루 단위). 미리보기에서는 무시하므로 편집 중 팝업이 항상 보인다
    (`if (!this.isPreviewMode && this.isHiddenToday(boxId))`)
  - 같은 팝업의 다른 이미지 박스는 영향 없음
- **크기**: `.popup-content` 는 폭 고정 없이 `width:auto` + `max-width:min(90vw, 380px)` (JS `PopupManager.MAX_BOX_WIDTH = 380` 과 동일), 이미지는 `width:auto / max-width:100% / object-fit:contain`.
  → 이미지 원본 크기·비율 그대로 노출되며 잘리지 않는다. (고정 상한 700px 제거)
- **노출 타이밍**: 폭은 `fitBoxes()` 가 이미지 `naturalWidth` 로 계산한다. 계산 전에 노출하면 원본 크기(최대 90vw)로 떴다가
  줄어들어 깜빡이므로, `fitBoxes(onReady)` 콜백에서 `.active` 를 붙인다. 미로드 이미지는 `load`/`error` 를 기다리고
  느린 이미지 대비 1.5초 상한을 둔다.

---

## index.html

| data-\* 속성                          | 요소                                   | JSON 경로                                                                                 |
| ------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `data-index-hero-slides`              | `.main_visual .swiper-wrapper`         | `homepage.customFields.pages.index.sections[0].hero.images[isSelected]`                   |
| `data-property-name-en`               | `.visual_txt strong`, `.logo_txt` 스팬 | `property.nameEn`                                                                         |
| `data-index-room-slides`              | `.main_room .swiper-wrapper`           | `homepage.customFields.roomtypes[]` + `rooms[]` id 매칭                                   |
| `data-index-facility-slides`          | `.main_special .swiper-wrapper`        | `property.facilities[]`                                                                   |
| `data-index-facility-tags`            | `.main_special .title_box p`           | `property.facilities[].name` (각 시설명에 `#` 붙여 공백 구분 나열, 예: `#찜질방 #노래방`) |
| `data-property-name`                  | `p.menu_txt span`                      | `property.name`                                                                           |
| `data-index-menu-image="reservation"` | `.menu_li` 첫 번째 `<img>`             | `index.essence.images` 중 `description === "menu_reservation"`                            |
| `data-index-menu-image="main"`        | `.menu_li` 두 번째 `<img>`             | `index.essence.images` 중 `description === "menu_main"`                                   |
| `data-index-menu-image="directions"`  | `.menu_li` 세 번째 `<img>`             | `index.essence.images` 중 `description === "menu_directions"`                             |

> ⚠️ `p.menu_txt` — 텍스트 내 숙소명은 `<span data-property-name>` 으로 감싸서 `property.name` 매핑. 나머지는 정적 텍스트.

### .menu_li 메뉴 이미지 매핑

각 메뉴 아이템 `<img>`에 `data-index-menu-image="{페이지키}"` 부여.

원본에서 이 3칸은 **각 페이지 히어로와 무관하게 손으로 고른 컷**이다
(오시는길만 우연히 히어로와 겹치는 경우가 있다). 그래서 히어로에서 파생하지 않고,
크롤러가 원본 `.menu_li` 이미지를 `pages.index.sections[0].essence.images` 에 담는다.

어느 칸인지는 **배열 위치가 아니라 `description` 마커**로 구분한다 —
어드민 왕복에서 배열 순서는 보존되지 않기 때문이다.

| data-index-menu-image 값 | essence 마커 (`description`) | 마커가 없을 때 폴백                                             |
| ------------------------ | ---------------------------- | --------------------------------------------------------------- |
| `"reservation"`          | `menu_reservation`           | `customFields.pages.reservation.sections[0].hero.images[0].url` |
| `"main"`                 | `menu_main`                  | `customFields.pages.main.sections[0].hero.images[0].url`        |
| `"directions"`           | `menu_directions`            | `customFields.pages.directions.sections[0].hero.images[0].url`  |

```html
<!-- 예시 -->
<img data-index-menu-image="reservation" src="" alt="" />
<img data-index-menu-image="main" src="" alt="" />
<img data-index-menu-image="directions" src="" alt="" />
```

### 로고 폴백 (텍스트 로고)

`homepage.images[0].logo` 에 이미지가 없는 숙소가 있다 (원본이 텍스트 로고를 쓰는 경우).
그때 `[data-logo]` `<img>` 를 숨기고, 감싸는 `<a>` 안에 원본과 같은 마크업을 만든다.

```html
<a href="./index.html">
  <img data-logo hidden />
  <span data-logo-text style="display: contents">
    SOLEPENSION
    <span>경주 감포 솔레 펜션</span>
  </span>
</a>
```

`property.nameEn` 이 본문, `property.name` 이 `<span>` 이다.
`.header .logo a` / `.header .logo a span` CSS 가 이미 이 구조를 로고처럼 렌더한다.

### data-index-facility-slides 슬라이드 내부 구조

```
property.facilities[i] 기준으로 슬라이드 동적 생성:
- 배경 이미지: facilities[i].images[0].url (background-image style)
- <span>:      "SPECIAL" 고정 텍스트
- <strong>:    facilities[i].name
- 링크:        facility.html?id={facilities[i].id}
```

### data-index-room-slides 슬라이드 내부 구조

```
roomtypes[i] 기준으로 슬라이드 동적 생성:
- 이미지:  roomtypes[i].images (thumbnail)
- <strong>: roomtypes[i].name
- <p>:     rooms[j] (roomtypes[i].id === rooms[j].id 매칭)
            → rooms[j].roomStructures[0] + "/ " + totalRoomCount 값≥1 항목 한글 나열
```

---

## main.html (= ABOUT / 펜션소개)

> 원본 `about.html` 구조. 백오피스 편집 화면 라벨은 **"숙소소개"**(`main-page-form`).

| data-\* 속성                    | 요소                     | JSON 경로                                                                                                                    |
| ------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `data-main-hero-bg`             | `.sub_visual`            | `pages.main.sections[0].hero.images[isSelected][0].url` (background-image)                                                   |
| `data-property-name`            | `.sub_visual .txt_box p` | `property.name` (타 서브페이지와 동일한 `{숙소명}, 펜션소개` 패턴)                                                           |
| `data-property-name-en`         | `span.logo_txt`          | `property.nameEn`                                                                                                            |
| `data-main-hero-title`          | `.inner h3`              | `pages.main.sections[0].hero.title` (**소개 섹션**)                                                                          |
| `data-main-hero-description`    | `p.about_txt`            | `pages.main.sections[0].hero.description` (`\n`→`<br>`)                                                                      |
| `data-main-hero-images`         | `.about_img ul.inner`    | `pages.main.sections[0].hero.images[isSelected]` (동적 생성, li>img 반복, **개수 제한 없음** — 원본 `view.html` 히어로 전부) |
| `data-main-about-bnr`           | `ul.about_bnr`           | `pages.main.sections[0].about[0..]` (**블록당 li 1개**, 동적 생성, 교차 레이아웃)                                            |
| `data-main-closing-bg`          | `.about_wide_bnr`        | `pages.index.sections[0].closing.images[isSelected][0].url` (background-image)                                               |
| `data-main-closing-title`       | `.about_wide_bnr strong` | `pages.index.sections[0].closing.title`                                                                                      |
| `data-main-closing-description` | `.about_wide_bnr p`      | `pages.index.sections[0].closing.description`                                                                                |

`.sub_visual .txt_box h3`(`ABOUT`)와 탭(`펜션소개`)은 페이지 라벨이라 정적 유지.

### data-main-about-bnr li 내부 구조

위쪽 `title_box` / `about_txt` / `about_img` 는 **소개 섹션(`main.hero`)** 을 쓰므로, `main.about` 은 이 블록 영역 전용이다. **`about[0]`부터** 순회해 블록당 `<li>` 하나를 만든다.

```
about[i] (i >= 0) 기준:
- .img (background-image): about[i].images[isSelected][0].url
- <strong>:                about[i].title
- <p>:                     about[i].description  (\n→<br>)
- 교차: 짝수 index → .img 먼저 / 홀수 index → .txt 먼저
```

백오피스에서 소개 블록을 늘리면 `<li>` 도 그만큼 늘고 좌우가 자동으로 교차한다. `about` 이 비어 있으면 매핑 위치 안내용 라벨(`소개섹션1 타이틀` / `소개섹션1 설명`) li 1개를 남긴다.

> `main` 전용 closing 이 없어 하단 와이드 배너는 `pages.index.sections[0].closing` 을 공용으로 쓴다 (기존 C/D/E/F/L 과 동일).
>
> ℹ️ `hero.images` 는 `.sub_visual` 배경(첫 장)과 상단 소개 3장에 함께 쓰인다.

---

## layout-map.html (= ROOMS / 미리보기)

> 원본 `room.html`(room_id 없는 목록 화면) 구조. ROOMS 대메뉴의 랜딩이며 "미리보기" 링크 대상.
> 백오피스 편집 화면 라벨은 **"배치도 (선택)"**(`layout-map-page-form`) — `layoutMap.hero` 가 페이지 히어로, `layoutMap.about` 이 하단 배치도 이미지에 대응한다.
> 기존 D/E/F 와 동일하게 `layout-map.html` 이 미리보기 역할을 맡는다. (별도 `room-list.html` 은 두지 않는다 — 백오피스에 `roomList` 편집 화면이 없다)

| data-\* 속성              | 요소                           | JSON 경로                                                                                                               |
| ------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `data-layout-map-hero-bg` | `.sub_visual` (배경)           | `pages.layoutMap.sections[0].hero.images[isSelected][0].url` → 없으면 `property.images[0].thumbnail[isSelected][0].url` |
| `data-property-name`      | `.txt_box p span`              | `property.name`                                                                                                         |
| `data-room-list-nav`      | `.sub_cate_wrap .sub_inner ul` | `customFields.roomtypes[].name` (동적 생성, 첫 번째 li `미리보기` 뒤에 추가)                                            |
| `data-property-name-en`   | `span.logo_txt`                | `property.nameEn`                                                                                                       |
| `data-property-themes`    | `.title_box p` (#모던 #심플)   | `property.propertyThemes` (각 테마에 `#` 붙여 나열)                                                                     |
| `data-room-list-slides`   | `.room_list .swiper-wrapper`   | `customFields.roomtypes[]` (동적 생성, index 객실 슬라이드와 동일)                                                      |
| `data-layout-map-image`   | `.wide_img img`                | `pages.layoutMap.sections[0].about.images[isSelected][0].url` → 없으면 `property.images[0].exterior[0].url`             |

### enabled 체크

`pages.layoutMap.sections[0]` 없음 또는 `enabled === false` → `404.html` 리다이렉트 — `isLayoutMapEnabled()`.
같은 기준으로 헤더 ROOMS > `미리보기` li 와 `room.html` 객실 탭 첫 칸 `미리보기` 를 숨긴다.

**대메뉴 `ROOMS`(`[data-rooms-link]`)는 이 값에 따라 이동처가 갈린다.** — `getRoomsEntryLink()`

| `layoutMap` | ROOMS 클릭 시                                                     |
| ----------- | ----------------------------------------------------------------- |
| 켜짐        | `layout-map.html` (객실 미리보기)                                 |
| 꺼짐        | 첫 번째 객실 상세 (헤더 객실 메뉴 첫 항목과 같음, 그룹 반영)      |

꺼진 상태에서 그대로 두면 `layout-map.html` 이 404 로 튕긴다. `HeaderFooterMapper.mapPageToggles()` 가
매 렌더(백오피스 preview 재렌더 포함) 다시 넣는다. 객실이 하나도 없으면 원래 href 를 둔다.

### data-room-list-slides 슬라이드 내부 구조

```
roomtypes[i] 기준으로 슬라이드 동적 생성:
- 이미지:  roomtypes[i].images 중 category=roomtype_thumbnail
- <strong>: roomtypes[i].name
- <p>:      rooms[j] (roomtypes[i].id === rooms[j].id 매칭)
            → rooms[j].roomStructures[0] + "/ " + totalRoomCount 값≥1 항목 한글 나열
- 링크:     room.html?room_id={roomtypes[i].id}
```

---

## room.html

| data-\* 속성                  | 요소                              | JSON 경로                                                                                                             |
| ----------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `data-property-name-en`       | `.visual_txt span`                | `property.nameEn`                                                                                                     |
| `data-room-name`              | `.visual_txt strong`              | `customFields.roomtypes[current].name`                                                                                |
| `data-room-structure`         | `.visual_txt p`                   | `rooms[j].roomStructures[0] + "/ " + totalRoomCount 값≥1 항목 한글 나열 (roomtypes[current].id === rooms[j].id 매칭)` |
| `data-room-hero-slides`       | `.swiper-wrapper` (히어로)        | `customFields.roomtypes[current].images.interior[isSelected]` (동적 생성)                                             |
| `data-room-list-nav`          | `.sub_cate_wrap .sub_inner ul`    | `customFields.roomtypes[].name` (동적 생성, 첫 번째 li `미리보기` 뒤). `미리보기` li 는 `layoutMap` 꺼지면 숨김         |
| `data-property-name-en`       | `span.logo_txt`                   | `property.nameEn`                                                                                                     |
| `data-room-name`              | `tbody td` (객실명, PC + 모바일)  | `customFields.roomtypes[current].name`                                                                                |
| `data-room-base-occupancy`    | `tbody td` (기준)                 | `rooms[j].baseOccupancy`                                                                                              |
| `data-room-max-occupancy`     | `tbody td` (최대)                 | `rooms[j].maxOccupancy`                                                                                               |
| `data-room-structure`         | `tbody td` (유형)                 | `rooms[j].roomStructures[0] + "/ " + totalRoomCount 값≥1 항목 한글 나열 (roomtypes[current].id === rooms[j].id 매칭)` |
| `data-room-size-pyeong`       | `tbody td` (평형, PC only)        | `rooms[j].size`(㎡) → 평 환산 (「공통 상수 > 평형 환산」 참조)                                                        |
| `data-room-amenities`         | `li` 내 텍스트 영역 (PC + 모바일) | `rooms[j].amenities.join(', ')`                                                                                       |
| `data-booking-url`            | `a.btn_reserve`                   | `property.realtimeBookingId` (전체 URL, href에 직접 주입)                                                             |
| `data-room-bnr`               | `ul.sub_img_bnr`                  | `customFields.roomtypes[current]` **exterior[0..1]** (외경 2장 이상일 때). 외경 1장 이하인 예전 데이터는 interior 중 `room_bnr:N` 2장 → 앞 2장 |
| (bnr li `strong`)             | `ul.sub_img_bnr li strong`        | `roomtypes[current].nameEn` → `name` → 폴백 `Cozy & Clean <br>Room's`                                                 |
| (bnr li `p`)                  | `ul.sub_img_bnr li p`             | interior `image.description` → 폴백 `Stay with your beloved companion …`                                              |
| `data-room-wide-bnr`          | `.sub_wide_bnr`                   | `customFields.roomtypes[current]` **exterior[2]** (외경 2장이면 숨김). 외경 1장 이하는 exterior[0] → thumbnail 폴백 |
| `data-room-floorplan-section` | `.room_floorplan`                 | 평면도 이미지가 없으면 섹션 전체 미노출                                                                               |
| `data-room-floorplan-image`   | `.room_floorplan img`             | 원본 객실 상세 페이지의 평면도 영역에서 크롤링된 이미지                                                               |
| `data-room-list-slides`       | `.main_room .swiper-wrapper`      | index.html, layout-map.html과 동일한 매핑                                                                             |
| `data-property-themes`        | `.title_box p` (#모던 #심플)      | `property.propertyThemes` (각 테마에 `#` 붙여 나열, 예: `#모던 #심플`)                                                |

> ℹ️ room 페이지는 `customFields.roomtypes`(객실타입 정보)와 `rooms`(개별 객실 정보)를 함께 사용. roomtypes[current].id === rooms[j].id 매칭으로 rooms[j] 데이터를 조회.

### interior 이미지 배분

`roomtype_interior[isSelected]` 는 두 영역에 나눠 쓴다.

| 영역                                      | 사용 범위                                                  |
| ----------------------------------------- | ---------------------------------------------------------- |
| `data-room-hero-slides` (히어로 슬라이더) | 마커(`room_bnr:N`) 없는 것 **전부**                        |
| `data-room-bnr` (교차 배너)               | 마커 붙은 2장 (`room_bnr:0`, `room_bnr:1`) — 없으면 앞 2장 |

교차 배너 2장은 **원본이 객실 사진 순서와 무관하게 따로 고른 컷**이다.
(감포솔레 솔레바다 기준 원본은 `room/23034/2`·`/6` 인데, 앞 2장을 쓰면 `/1`·`/2` 가 된다.)

그래서 크롤러가 원본 `.room_img_box ul.sub_img_bnr` 이미지를 `roomtype_interior` 로
한 번 더 담되, `description` 에 `room_bnr:0` / `room_bnr:1` 마커를 남긴다.
category 는 어드민이 덮어쓰고 배열 순서도 보존되지 않아 `description` 만이 살아남는 채널이다
(template-a 의 객실 슬롯 마커와 같은 규약).

- 히어로 슬라이더는 마커 붙은 컷을 **제외**한다 — 같은 사진이 두 번 나오지 않는다.
- 교차 배너의 `<p>` 는 마커를 문구로 찍지 않고 고정 폴백 문구를 쓴다.
- 마커가 없는 예전 데이터는 종전대로 interior 앞 2장으로 떨어진다.

교차 배너는 원본 레이아웃이 `li` 2개 고정(좌 `img`+`txt` / 우 `txt`+`img`)이라 개수를 늘리지 않는다.

**조각컷 3칸 (2026-11-26~)**: 크롤러는 원본 상세의 교차 배너 2장 + 와이드 1장을 순서대로 `roomtype_exterior`(백오피스 "객실 외경")에 담는다.
`exterior[0]`·`[1]` → 교차 배너, `[2]` → 와이드. 외경이 1장 이하인 예전 데이터만 아래 마커 규칙을 쓴다.

`roomtype_exterior` 는 하단 와이드 배너(`data-room-wide-bnr`)에 쓴다. 원본 상세의 그 자리 사진이며, 목록 카드용 `roomtype_thumbnail`(객실 사진 첫 장)과 구분한다.

### 객실 평면도

평면도는 일반 객실 이미지 URL만으로 판단하지 않는다. 크롤러가 원본 객실 상세 페이지의 평면도 HTML 영역을 별도로 탐지하고, 이미지가 있을 때만 아래 중 하나로 저장해야 노출한다.

| 지원 데이터 형태                                                                           | 비고            |
| ------------------------------------------------------------------------------------------ | --------------- |
| `roomtypes[current].floorplanImages[]`                                                     | 권장            |
| `roomtypes[current].floorplans[]`                                                          | 호환            |
| `roomtypes[current].floorplan.images[]`                                                    | 호환            |
| `roomtypes[current].images[].category = "roomtype_floorplan"`                              | 카테고리형 호환 |
| `roomtypes[current].images[].category = "floorplan"` / `"room_floorplan"` / `"floor_plan"` | 카테고리형 호환 |

해당 데이터가 없으면 `data-room-floorplan-section` 은 `display:none` 처리한다. `roomtype_interior`, `roomtype_thumbnail`, `roomtype_exterior` 의 이미지는 평면도 폴백으로 쓰지 않는다.

> **문구는 데이터 우선 + 폴백**이다. `roomtypes` 스키마의 텍스트 필드가 `name`/`nameEn` 뿐이고 실데이터에서 `nameEn`·이미지 `description` 이 비어 오는 경우가 많아, 값이 없을 때만 원본 사이트 카피로 채운다. 원본도 두 `li` 에 같은 문구를 반복 노출한다.
>
> ```
> strong : nameEn → name → "Cozy & Clean <br>Room's"
> p      : image.description → "Stay with your beloved companion <br>In a clean, cozy cabin. <br>Enjoy a happy moment with your companion."
> ```
>
> 설명 폴백 카피는 room/facility 공용이라 `BaseDataMapper.prototype.BNR_FALLBACK_DESC_HTML` 에, 노출 이미지 수는 `BaseDataMapper.prototype.BNR_MAX`(=2) 에 둔다.

---

## facility.html

| data-\* 속성                 | 요소                               | JSON 경로                                                                                    |
| ---------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `data-property-name-en`      | `span`                             | `property.nameEn`                                                                            |
| `data-facility-name`         | `strong` (히어로 + title_box h3)   | `property.facilities[current].name`                                                          |
| `data-facility-hero-slides`  | `.sub_wide_visual .swiper-wrapper` | `property.facilities[current].images` (배경 슬라이드 cover, 동적 생성)                       |
| `data-facility-nav`          | `.sub_inner ul`                    | `property.facilities[].name` (동적 생성, 현재 on, 이름없음 skip)                             |
| `data-facility-description`  | `p.special_txt`                    | `property.facilities[current].description` → 비어 있으면 `usageGuide`                        |
| `data-facility-bnr`          | `ul.sub_img_bnr`                   | `property.facilities[current].images[isSelected]` **앞 2장 고정** (교차 레이아웃, 동적 생성) |
| `data-property-name-en`      | `.main_special span.logo_txt`      | `property.nameEn`                                                                            |
| `data-index-facility-slides` | `.main_special .swiper-wrapper`    | index.html과 동일한 매핑                                                                     |
| `data-index-facility-tags`   | `.main_special .title_box p`       | `property.facilities[].name` (# 태그, index와 동일)                                          |

> title_box의 `<p>인근 해변</p>`(매핑 소스 없음)은 제거함.

### data-facility-bnr li 내부 구조

room.html 의 `data-room-bnr` 과 동일한 마크업·규칙이다. 원본 레이아웃이 `li` 2개 고정(좌 `img`+`txt` / 우 `txt`+`img`)이라 앞 2장만 쓰고, 나머지 이미지는 히어로 슬라이더(`data-facility-hero-slides`)에서 전부 노출된다.

```
facilities[current].images[isSelected][0..1] 기준:
- .img:     images[i].url (background-image)
- <strong>: facilities[current].nameEn → name → 폴백 "Special Intro"
- <p>:      images[i].description → 폴백 "Stay with your beloved companion …"
```

> 현재 BFF 응답의 `facilities[]` 에는 `nameEn` 필드가 없어 사실상 한글 시설명(`name`)이 노출된다. 필드가 추가되면 자동으로 영문명이 우선된다.

---

## reservation.html

| data-\* 속성                       | 요소                                              | JSON 경로                                                                                      |
| ---------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `data-reservation-hero-image`      | `.sub_visual`                                     | `customFields.pages.reservation.sections[0].hero.images[isSelected][0].url` (background-image) |
| `data-property-name`               | `.txt_box p span`                                 | `property.name`                                                                                |
| `data-booking-url`                 | `.sub_cate_wrap a` (예약하기)                     | `property.realtimeBookingId` (전체 URL, href에 직접 주입)                                      |
| `data-property-name-en`            | `span.logo_txt`                                   | `property.nameEn`                                                                              |
| `data-reservation-info-image`      | `dl.reservation_box:first-child dt img`           | `customFields.pages.reservation.sections[0].about.images[isSelected][0].url`                   |
| `data-reservation-checkin-info`    | `dl.reservation_box:first-child dd p:first-child` | `property.checkInOutInfo` (`[입퇴실안내]` 정적 유지, 이하 내용 동적 주입)                      |
| `data-reservation-usage-guide`     | `dl.reservation_box:first-child dd p:last-child`  | `property.usageGuide`                                                                          |
| `data-reservation-refund-image`    | `dl.reservation_box:last-child dt img`            | `customFields.pages.reservation.sections[0].about.images[isSelected][1].url`                   |
| `data-reservation-refund-policies` | `dl.reservation_box:last-child dd`                | `property.refundPolicies` (동적 생성)                                                          |

---

## nearby-attractions.html

| data-\* 속성                   | 요소              | JSON 경로                                                                                            |
| ------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `data-nearby-hero-image`       | `.sub_visual`     | `customFields.pages.nearbyAttractions.sections[0].hero.images[isSelected][0].url` (background-image) |
| `data-property-name`           | `.txt_box p span` | `property.name`                                                                                      |
| `data-property-name-en`        | `span.logo_txt`   | `property.nameEn`                                                                                    |
| `data-nearby-attractions-list` | `.travel_list ul` | `customFields.pages.nearbyAttractions.sections[0].about[]` (동적 생성)                               |

### data-nearby-attractions-list li 내부 구조

> ⚠️ 원본 사이트는 각 항목 `<p>` 안에 `<span>출처 : 대한민국구석구석(korean.visitkorea.or.kr)</span>` 을 두지만, `about[]` 스키마에 대응 필드(`source`)가 없다. **매퍼가 문구를 만들어내지 않으며**, 출처가 필요하면 크롤러가 `about[i].description` 끝에 포함시켜 내려준다 (`\n` → `<br>` 변환됨).

```
about[i] 기준:
- img:      about[i].images[isSelected][0].url
- <strong>: about[i].title
- p:        about[i].description
- em:       about[i].images[isSelected][0].description
```

### enabled 체크

`customFields.pages.nearbyAttractions.sections[0].enabled === false` → `404.html` 리다이렉트 + 헤더 TRAVEL 메뉴(`data-travel-menu`) 숨김 (layout-map과 동일 방식)

---

## directions.html

| data-\* 속성                     | 요소               | JSON 경로                                                                                     |
| -------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `data-directions-hero-image`     | `.sub_visual`      | `customFields.pages.directions.sections[0].hero.images[isSelected][0].url` (background-image) |
| `data-property-name`             | `.txt_box p span`  | `property.name`                                                                               |
| `data-property-name-en`          | `span.logo_txt`    | `property.nameEn`                                                                             |
| `#kakao-map`                     | `div#kakao-map`    | `property.latitude`, `property.longitude` (다른 템플릿 참조하여 카카오맵 SDK 마커 매핑)       |
| `data-property-address`          | `.map_info strong` | `property.address`                                                                            |
| `data-directions-notice-title`   | `.map_info dt`     | `customFields.pages.directions.sections[0].notice.title`                                      |
| `data-directions-notice-content` | `.map_info dd`     | `customFields.pages.directions.sections[0].notice.description`                                |

---

## 객실 그룹 규칙 (`groupName`)

`roomtypes[].groupName`이 **하나라도 있으면** 그룹 모드로
동작한다. 없으면 객실 하나가 항목 하나다. 규칙은 `base-mapper.js` 한 곳에 있다.

**그룹으로 접히는 곳은 헤더 ROOMS 메뉴와 객실 상세 탭뿐이다.**
Room Preview(미리보기) 카드는 그룹과 무관하게 **항상 전체 객실**을 깔고,
카드마다 자기 객실 상세로 연결한다 — 원본이 그렇다.

| 함수                     | 역할                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `hasRoomGroups()`        | `groupName` 이 하나라도 있는지                                            |
| `getRoomMenuItems()`     | 그룹 단위 항목 배열 — `{ label, groupName, roomtype(대표), roomtypes[] }` |
| `getRoomMenuLabel()`     | 메뉴에 쓸 이름 — **그룹명** (없으면 객실명)                               |
| `getRoomMenuLink()`      | **그룹의 첫 객실** 상세로 연결                                            |
| `isRoomMenuItemActive()` | 그룹 안 **어느 객실 id 로 들어와도** 그 항목을 활성으로 본다              |
| `renderRoomSlides()`     | 미리보기 카드 — **그룹을 쓰지 않고 `roomtypes[]` 전체**를 깐다            |

### 화면 흐름

```
헤더 ROOMS 메뉴        →  그룹명        (스파동 | 프리미엄동)
        ↓ 그룹명 클릭
그룹의 첫 번째 객실 상세 →  탭에 그 그룹의 모든 객실
                          (미리보기 | 에버골드 | 퍼블하제 | 유메)

Room Preview(미리보기)  →  전체 객실 (그룹과 무관), 카드마다 자기 객실 상세로 연결
```

### ⚠️ 객실 상세 탭은 그룹을 펼친다

헤더 ROOMS 메뉴는 그룹명 하나로 접히므로, **상세 페이지 탭까지 접으면 그룹의 첫 객실
외에는 헤더로 도달할 방법이 없다.** 그래서 탭은 현재 객실이 속한 그룹을 찾아
**그 그룹의 객실만** 렌더한다.

| 상황                             | 탭                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| 그룹 밖 (미리보기 / 미그룹 객실) | `미리보기 \| 스파동 \| 프리미엄동 \| …`                                            |
| 그룹 안 (멤버 2실 이상)          | `미리보기 \| 에버골드 \| 퍼블하제 \| 유메`                                         |
| 멤버 1실 그룹                    | 펼치지 않음 — 항목이 하나뿐이라 탭이 비다시피 하고 그룹명 = 객실명이라 의미가 없다 |
| `groupName` 없음                 | 기존과 동일 (객실 하나가 항목 하나)                                                |

**다른 그룹은 이 줄에 섞지 않는다.** 그룹명과 객실명이 나란히 놓이면 부모/자식이
형제처럼 보인다. 다른 그룹으로는 헤더 ROOMS 메뉴나 미리보기를 거쳐 이동한다.
(미리보기에서는 어느 객실이든 바로 갈 수 있다.)

탭을 다시 그릴 때 **첫 li(`미리보기`)는 남기고** `data-generated="room"` 이 붙은
이전 생성분만 지운다. 통째로 비우면 미리보기로 돌아갈 길이 없어진다.

---

## 카피라이트 (`data-copyright`)

푸터 카피라이트는 `property.tripProviderName`(Trip11 공급자명)으로 렌더한다.

`common/footer.html` 의 카피라이트 요소에 템플릿 문자열을 두고,
`header-footer-mapper.js` 의 `mapCopyright()` 가 `{provider}` 를 치환한다.

```html
<a href="http://trip11.kr/" data-copyright="COPYRIGHT©{provider}. ALL RIGHTS RESERVED.">
  COPYRIGHT©(주)트립일레븐. ALL RIGHTS RESERVED.
</a>
```

| `property.tripProviderName` | 결과                                     |
| --------------------------- | ---------------------------------------- |
| `"신비서"`                  | `COPYRIGHT©신비서. ALL RIGHTS RESERVED.` |
| `""` / 미입력               | HTML 에 적힌 기존 문구 그대로            |

- 문구 형식(대소문자, `ⓒ` 접두, `(주)` 표기)은 템플릿마다 달라서 **형식은 `data-copyright` 속성값이 갖고
  매퍼는 이름만 바꾼다**.
- 값이 없을 때(백오피스 미입력 → `""`) 는 건드리지 않으므로 기존 트립일레븐 문구가 그대로 남는다.
- `trip11.kr` 링크는 변경하지 않는다.
