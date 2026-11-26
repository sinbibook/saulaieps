(function (global) {
  'use strict';

  function BaseDataMapper() {
    this.data = null;
    this.isDataLoaded = false;
  }

  BaseDataMapper.prototype.initialize = function () {
    var self = this;
    var url = 'standard-template-data.json?t=' + Date.now();
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load standard-template-data.json');
        return res.json();
      })
      .then(function (json) {
        self.data = json;
        self.isDataLoaded = true;
        self.mapPage();
        if (window.__tplReveal) window.__tplReveal(); // 매핑 완료 → 화면 노출(페이드인)
      })
      .catch(function (err) {
        console.error('[BaseDataMapper] initialize error:', err);
        if (window.__tplReveal) window.__tplReveal(); // 실패해도 화면은 노출
      });
  };

  BaseDataMapper.prototype.mapPage = function () {};

  BaseDataMapper.prototype.updateData = function (newData) {
    this.data = newData;
    this.isDataLoaded = true;
    this.mapPage();
    if (window.__tplReveal) window.__tplReveal(); // 매핑 완료 → 화면 노출(페이드인)
  };

  // ── 데이터 접근 헬퍼 ──────────────────────────────────────
  BaseDataMapper.prototype.getProperty = function () {
    return (this.data && this.data.property) || {};
  };

  BaseDataMapper.prototype.getHomepage = function () {
    return (this.data && this.data.homepage) || {};
  };

  BaseDataMapper.prototype.getCustomFields = function () {
    return this.getHomepage().customFields || {};
  };

  // customFields.roomtypes (localhost / preview 경로 모두 대응)
  // 객실 목록의 단일 소스. rooms[] 는 roomtypes[i].id === rooms[j].id 매칭으로
  // 인원/평형/집기 등 상세값을 조회할 때만 쓴다.
  BaseDataMapper.prototype.getRoomtypes = function () {
    var cf = this.getCustomFields();
    if (cf.roomtypes && cf.roomtypes.length) return cf.roomtypes;
    if (this.data && this.data.customFields && this.data.customFields.roomtypes) {
      return this.data.customFields.roomtypes;
    }
    return cf.roomtypes || [];
  };

  BaseDataMapper.prototype.getPages = function () {
    // localhost 경로: this.data.homepage.customFields.pages
    var pagesFromHomepage = this.getCustomFields().pages;
    if (pagesFromHomepage && Object.keys(pagesFromHomepage).length > 0) {
      return pagesFromHomepage;
    }

    // preview 경로: this.data.customFields.pages
    if (this.data && this.data.customFields && this.data.customFields.pages) {
      return this.data.customFields.pages;
    }

    return {};
  };

  // customFields.property.name 우선, 없으면 property.name
  BaseDataMapper.prototype.getPropertyName = function () {
    var cf = this.getCustomFields();
    if (cf.property && cf.property.name) return cf.property.name;
    return this.getProperty().name || '';
  };

  // customFields.property.nameEn 우선, 없으면 property.nameEn
  //
  // 한글명(getPropertyName)과 같은 순서다. 백오피스 홈페이지 폼의 안내문이
  // "빈 값이면 숙소설정의 영문 숙소명을 사용합니다" — 즉 customFields 가 우선이고
  // 숙소설정(property)은 폴백이다.
  //
  // 예전에는 페이지 매퍼마다 이 함수를 복사해 두고 순서가 반대였다
  // (property.nameEn 먼저). 그래서 숙소설정에 값이 있으면 홈페이지에 입력한
  // 영문명이 묻혔다 — 감포솔레는 SOLE PENSION 을 넣었는데 헤더에
  // "Property English Name" 이 나왔다.
  BaseDataMapper.prototype.getPropertyNameEn = function () {
    var cf = this.getCustomFields();
    if (cf.property && cf.property.nameEn) return cf.property.nameEn;
    return this.getProperty().nameEn || '';
  };

  // homepage.images[0].logo 중 isSelected인 URL
  BaseDataMapper.prototype.getLogo = function () {
    var hp = this.getHomepage();
    var images = hp.images;
    if (!images || !images[0] || !images[0].logo) return '';
    var logos = images[0].logo;
    var selected = logos.find(function (l) {
      return l.isSelected;
    });
    return selected ? selected.url : logos[0] ? logos[0].url : '';
  };

  // property.realtimeBookingId
  // realtimeBookingId 는 "실시간예약링크" 같은 플레이스홀더/설명 문구가 그대로 들어올 수 있다.
  // 그걸 href 로 쓰면 상대경로로 해석돼 404 페이지가 새 탭으로 열리므로,
  // 실제 URL 로 보일 때만 링크로 취급하고 그 외에는 '#!'(비활성) 로 처리한다.
  BaseDataMapper.prototype.getBookingUrl = function () {
    var raw = this.getProperty().realtimeBookingId;
    if (typeof raw !== 'string') return '#!';

    var v = raw.trim();
    if (!v || v === '#!') return '#!';

    if (/^https?:\/\//i.test(v)) return v; // http(s)://...
    if (/^\/\//.test(v)) return 'https:' + v; // //도메인/...

    // 프로토콜 없이 도메인만 들어온 경우(booking.example.com/abc)는 https 를 붙여준다
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]|$)/i.test(v)) return 'https://' + v;

    return '#!';
  };

  // ── 이미지 헬퍼 ──────────────────────────────────────────
  // isSelected=true인 이미지를 sortOrder 순으로 반환
  BaseDataMapper.prototype.getSelectedImages = function (images) {
    if (!images || !images.length) return [];
    return images
      .filter(function (img) {
        return img.isSelected;
      })
      .sort(function (a, b) {
        return a.sortOrder - b.sortOrder;
      });
  };

  // 첫 번째 isSelected 이미지의 URL
  BaseDataMapper.prototype.getFirstSelectedImage = function (images) {
    var list = this.getSelectedImages(images);
    return list.length ? list[0].url : '';
  };

  // 객실 평면도 소스.
  // 크롤러가 원본 객실 상세의 평면도 영역에서 이미지를 찾았을 때만 이 필드/카테고리를 채운다.
  BaseDataMapper.prototype.getRoomFloorplanImages = function (roomtype) {
    if (!roomtype) return [];

    var direct =
      roomtype.floorplanImages ||
      roomtype.floorplans ||
      (roomtype.floorplan && roomtype.floorplan.images) ||
      [];
    if (direct && !Array.isArray(direct)) direct = [direct];
    if (direct.length)
      return this.getSelectedImages(direct).length ? this.getSelectedImages(direct) : direct;

    var images = roomtype.images || [];
    var filtered = images.filter(function (img) {
      return /^(roomtype_)?floorplan$|^room_floorplan$|^floor_plan$/i.test(img.category || '');
    });
    var selected = this.getSelectedImages(filtered);
    return selected.length ? selected : filtered.slice();
  };

  BaseDataMapper.prototype.getRoomFloorplanImage = function (roomtype) {
    var images = this.getRoomFloorplanImages(roomtype);
    return images.length ? images[0] : null;
  };

  // 백오피스에서 빈 값을 공백 한 칸으로 내려주는 경우까지 비어있다고 본다.
  BaseDataMapper.prototype.cleanText = function (value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  };

  BaseDataMapper.prototype.firstText = function () {
    for (var i = 0; i < arguments.length; i++) {
      var value = this.cleanText(arguments[i]);
      if (value) return value;
    }
    return '';
  };

  BaseDataMapper.prototype.findRoomById = function (id) {
    var rooms = (this.data && this.data.rooms) || [];
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i].id === id) return rooms[i];
    }
    return null;
  };

  BaseDataMapper.prototype.getRoomtypeName = function (roomtype) {
    if (!roomtype) return '';
    var room = this.findRoomById(roomtype.id);
    return this.firstText(roomtype.name, room && room.name);
  };

  // 객실 메뉴/목록 그룹 규칙.
  // groupName 이 하나라도 있으면 같은 그룹을 하나의 메뉴로 묶고,
  // 링크는 해당 그룹의 첫 번째 객실 상세로 연결한다.
  BaseDataMapper.prototype.getRoomGroupName = function (roomtype) {
    return this.firstText(roomtype && roomtype.groupName);
  };

  BaseDataMapper.prototype.hasRoomGroups = function (roomtypes) {
    var self = this;
    return (roomtypes || []).some(function (rt) {
      return !!self.getRoomGroupName(rt);
    });
  };

  BaseDataMapper.prototype.getRoomMenuItems = function (roomtypes, resolveName) {
    var self = this;
    var list = roomtypes || [];
    if (!this.hasRoomGroups(list)) {
      return list.map(function (rt) {
        return {
          label: self.firstText(resolveName && resolveName(rt), self.getRoomtypeName(rt)),
          roomtype: rt,
          roomtypes: [rt]
        };
      });
    }

    var seen = {};
    var items = [];
    list.forEach(function (rt) {
      var groupName = self.getRoomGroupName(rt);
      // 그룹 숙소에서는 미그룹 객실을 메뉴에 내지 않는다.
      // 원본 헤더가 그룹만 노출하고, 미그룹 객실은 목록 / Room Preview 로만 도달한다.
      // (Room Preview 는 roomtypes[] 전체를 그리므로 영향 없다)
      if (!groupName) return;

      var label = self.firstText(
        groupName,
        resolveName && resolveName(rt),
        self.getRoomtypeName(rt)
      );
      if (!String(label).trim()) return;

      var key = groupName ? 'group:' + groupName : 'room:' + rt.id;
      if (!seen[key]) {
        seen[key] = { label: label, groupName: groupName, roomtype: rt, roomtypes: [rt] };
        items.push(seen[key]);
      } else {
        seen[key].roomtypes.push(rt);
      }
    });
    return items;
  };

  BaseDataMapper.prototype.getRoomMenuLabel = function (item) {
    return (item && item.label) || '';
  };

  BaseDataMapper.prototype.getRoomMenuRoomtype = function (item) {
    return (item && item.roomtype) || item;
  };

  BaseDataMapper.prototype.getRoomMenuLink = function (item, paramName) {
    var roomtype = this.getRoomMenuRoomtype(item);
    var key = paramName || 'room_id';
    return 'room.html?' + key + '=' + encodeURIComponent(roomtype && roomtype.id);
  };

  BaseDataMapper.prototype.isRoomMenuItemActive = function (item, currentId) {
    if (!item || !currentId) return false;
    return (item.roomtypes || []).some(function (rt) {
      return String(rt && rt.id) === String(currentId);
    });
  };

  // ── 객실 미리보기(layout-map) 사용 여부 ──────────────────
  // layout-map.html 이 404 로 보내는 기준과 같아야 한다.
  // 섹션이 없거나 enabled=false 면 그 페이지는 열리지 않는다.
  BaseDataMapper.prototype.isLayoutMapEnabled = function () {
    var page = this.getPages().layoutMap;
    var section = page && page.sections && page.sections[0];
    return Boolean(section) && section.enabled !== false;
  };

  // 대메뉴 ROOMS 가 갈 곳.
  //   미리보기 켜짐 → layout-map.html (객실 미리보기)
  //   미리보기 꺼짐 → 첫 번째 객실 상세 (헤더 객실 메뉴의 첫 항목과 같은 곳 — 그룹 숙소면 첫 그룹의 첫 객실)
  // 객실이 하나도 없으면 갈 곳이 없으므로 null — 호출부가 원래 href 를 둔다.
  BaseDataMapper.prototype.getRoomsEntryLink = function () {
    if (this.isLayoutMapEnabled()) return './layout-map.html';
    var self = this;
    var link = null;
    var items = this.getRoomMenuItems(this.getRoomtypes());
    items.some(function (item) {
      if (!String(self.getRoomMenuLabel(item)).trim()) return false;
      link = self.getRoomMenuLink(item);
      return true;
    });
    return link;
  };

  BaseDataMapper.prototype.convertToCamelCase = function (obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertToCamelCase(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = this.convertToCamelCase(obj[key]);
        return result;
      }, {});
    }
    return obj;
  };

  // ── DOM 유틸 ────────────────────────────────────────────
  BaseDataMapper.prototype.setTextIfExist = function (selector, value) {
    var el = document.querySelector(selector);
    if (el && value !== undefined && value !== null) el.textContent = value;
  };

  BaseDataMapper.prototype.setAttrIfExist = function (selector, attr, value) {
    var el = document.querySelector(selector);
    if (el && value) el.setAttribute(attr, value);
  };

  BaseDataMapper.prototype.setAllAttr = function (selector, attr, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      if (value) el.setAttribute(attr, value);
    });
  };

  // ── 교차 배너(.sub_img_bnr) 공용 유틸 ─────────────────────
  // room / facility 두 페이지가 같은 마크업을 쓴다.
  // 설명 문구가 비어 올 때 쓰는 폴백 카피 — 원본 사이트의 공통 영문 카피.
  BaseDataMapper.prototype.BNR_FALLBACK_DESC_HTML =
    'Stay with your beloved companion <br>In a clean, cozy cabin. <br>Enjoy a happy moment with your companion.';

  // 원본 레이아웃이 li 2개 고정(좌 img+txt / 우 txt+img)이라 노출 이미지 수를 제한한다
  BaseDataMapper.prototype.BNR_MAX = 2;

  // 텍스트 이스케이프 + 줄바꿈(\n) → <br />
  BaseDataMapper.prototype.nl2br = function (text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');
  };

  // ── 연락처 정규화 ────────────────────────────────────────
  // BFF의 property.contactPhone 은 문자열 배열(string[])로 내려온다.
  // 배포 시점 차이로 문자열/누락도 들어올 수 있으므로 셋 다 허용해 문자열 배열로 정규화한다.
  // 계약 타입(총판A/총판B/판매대행) 분기는 BFF가 판단하므로 템플릿은 받은 배열을 그대로 렌더링한다.
  BaseDataMapper.prototype.toPhoneList = function (value) {
    var fallbackPhone = '1833-9306';
    var list = [];
    if (Array.isArray(value)) {
      list = value.filter(function (v) {
        return typeof v === 'string' && v.trim();
      });
    } else if (typeof value === 'string' && value.trim()) {
      list = [value];
    }
    return list.length > 0 ? list : [fallbackPhone];
  };

  // ── SEO 메타태그 업데이트 ──────────────────────────────────────
  BaseDataMapper.prototype.updateMetaTags = function (pageSEO) {
    var hp = this.getHomepage();
    var globalSEO = (hp && hp.seo) || {};
    var finalSEO = Object.assign({}, globalSEO, pageSEO || {});

    if (Object.keys(finalSEO).length > 0) {
      this.updateSEOInfo(finalSEO);
    }
  };

  BaseDataMapper.prototype.updateSEOInfo = function (seo) {
    if (!seo) return;

    // name 기반 meta 태그를 upsert (값 없으면 태그 생성 안 함 → 빈 태그 방지)
    function upsertMetaByName(name, content) {
      if (!content) return;
      var meta = document.head.querySelector('meta[name="' + name + '"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }

    if (seo.title) {
      var titleEl =
        document.querySelector('title[data-page-title]') || document.querySelector('title');
      if (titleEl) titleEl.textContent = seo.title;
    }

    upsertMetaByName('description', seo.description);
    upsertMetaByName('keywords', seo.keywords);
    upsertMetaByName('naver-site-verification', seo.naverSiteVerification);
    upsertMetaByName('google-site-verification', seo.googleSiteVerification);
  };

  global.BaseDataMapper = BaseDataMapper;
})(window);
