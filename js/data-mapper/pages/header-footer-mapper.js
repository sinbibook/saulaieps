(function (global) {
  'use strict';

  var YBS_BASE_URL = 'https://www.yapen.co.kr/external?ypIdx=';

  // 상담하기 — 뒤에 property.tripPropertyId 가 붙는다
  var CONSULT_BASE_URL = 'https://www.bookingplay.co.kr/api/cti_eicn/kakao_happy_talk?tid=';

  // 파트너 타입 — 원천은 백오피스 DB `public.contract_info.partner_type` 이고
  // BFF 가 코드 문자열을 그대로 내려준다. **분기는 템플릿이 한다**(PC/모바일은 템플릿만 안다).
  //
  //   distributor_a  총판A     PC 상담하기 / 모바일 상담하기 + 예약하기
  //   distributor_b  총판B     PC 없음     / 모바일 예약하기
  //   sales_agency   판매대행  PC 없음     / 모바일 예약하기
  //
  // ⚠️ 예약하기는 **파트너 타입과 무관**하다 — 세 타입 모두 모바일에서만 뜬다.
  //    그건 기존 `.ft_btn_reserve.for_m` 의 미디어쿼리가 이미 하고 있어 손대지 않는다.
  //    타입으로 갈리는 것은 상담하기 하나뿐이다.
  var CONSULT_PARTNER_TYPES = ['distributor_a'];

  // ⚠️ base-mapper 에 `cleanText` 가 없는 템플릿이 있어 의존하지 않는다.
  function consultText(v) {
    return v === undefined || v === null ? '' : String(v).trim();
  }

  // 백오피스가 전달한 실시간 달력 링크가 http(s) URL일 때만 푸터에 노출한다.
  function mapFooterCalendar(data) {
    var homepageFields = data && data.homepage && data.homepage.customFields;
    var fields = homepageFields || (data && data.customFields) || {};
    var raw = fields.footer && fields.footer.calendarUrl;
    var value = typeof raw === 'string' ? raw.trim() : '';
    var valid = false;
    if (/^https?:\/\//i.test(value)) {
      try {
        var parsed = new URL(value);
        valid = (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !!parsed.hostname;
      } catch (error) {
        valid = false;
      }
    }
    document.querySelectorAll('[data-calendar-wrap]').forEach(function (el) {
      el.style.display = valid ? '' : 'none';
    });
    document.querySelectorAll('[data-calendar-link]').forEach(function (el) {
      if (valid) el.setAttribute('href', value);
      else el.removeAttribute('href');
    });
  }

  function HeaderFooterMapper() {
    BaseDataMapper.call(this);
  }
  HeaderFooterMapper.prototype = Object.create(BaseDataMapper.prototype);
  HeaderFooterMapper.prototype.constructor = HeaderFooterMapper;

  HeaderFooterMapper.prototype.mapPage = function () {
    this.mapLogo();
    this.mapFavicon();
    this.mapBookingLinks();
    this.mapYbs();
    this.mapConsult();
    this.mapSocialLinks();
    this.mapRoomMenu();
    this.mapFacilityMenu();
    this.mapPageToggles();
    this.mapFooter();
    mapFooterCalendar(this.data);
    // SEO: homepage.seo → title + description/keywords + 네이버/구글 사이트 인증 (전 페이지 공통)
    this.updateMetaTags();
  };

  // 페이지 enabled 여부 (sections[0].enabled === false 이면 비활성)
  HeaderFooterMapper.prototype.isPageEnabled = function (pageKey) {
    var page = this.getPages()[pageKey];
    var section = page && page.sections && page.sections[0];
    return !(section && section.enabled === false);
  };

  // MAPPER: homepage.images[0].logo[isSelected].url → [data-logo]
  //
  // 로고 이미지가 없는 숙소가 있다 (원본이 텍스트 로고를 쓰는 경우).
  // 그때 원본은 <a> 안에 영문명 + <span>한글명</span> 을 직접 찍고,
  // .header .logo a / .logo a span CSS 가 그걸 그대로 로고처럼 보여준다.
  // 이미지가 없을 때 플레이스홀더 대신 같은 마크업을 만들어 준다.
  HeaderFooterMapper.prototype.mapLogo = function () {
    var logoUrl = this.getLogo();
    var nameEn = this.getPropertyNameEn();
    var name = this.getPropertyName();

    document.querySelectorAll('[data-logo]').forEach(function (el) {
      if (logoUrl) {
        var logoAnchor = el.closest('a');
        if (logoAnchor) {
          [].slice.call(logoAnchor.childNodes).forEach(function (node) {
            if (node !== el) logoAnchor.removeChild(node);
          });
        }
        el.hidden = false;
        el.src = logoUrl;
        return;
      }

      var anchor = el.closest('a');
      if (!anchor || (!nameEn && !name)) {
        ImageHelpers.applyPlaceholder(el);
        return;
      }

      // 이미지는 지우지 않고 숨긴다 — 프리뷰에서 로고가 나중에 들어오면 되살아나야 한다
      el.hidden = true;

      // ⚠️ 텍스트를 span 으로 감싸면 안 된다.
      //    `.header .logo a span { font-size: 13px }` 규칙에 그 래퍼가 걸려
      //    영문명이 36px(`.logo a`) 이 아니라 13px 로 작아진다.
      //    display:contents 는 레이아웃만 통과시킬 뿐 폰트는 그대로 상속된다.
      //    원본과 같은 구조로 둔다 — 영문명은 a 의 직계 텍스트, 한글명만 span.
      //
      //    다시 그릴 때를 대비해 img 를 뺀 나머지 자식을 먼저 비운다.
      [].slice.call(anchor.childNodes).forEach(function (node) {
        if (node !== el) anchor.removeChild(node);
      });

      anchor.appendChild(document.createTextNode(nameEn || name));
      if (nameEn && name) {
        var sub = document.createElement('span');
        sub.textContent = name;
        anchor.appendChild(sub);
      }
    });
  };

  // MAPPER: favicon ← homepage.images[0].logo[isSelected].url (로고 데이터 재사용)
  HeaderFooterMapper.prototype.mapFavicon = function () {
    var logoUrl = this.getLogo();
    if (!logoUrl) return;
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  };

  // MAPPER: property.realtimeBookingId → [data-booking-link] (href 직접 주입)
  HeaderFooterMapper.prototype.mapBookingLinks = function () {
    var bookingUrl = this.getBookingUrl();
    document.querySelectorAll('[data-booking-link]').forEach(function (el) {
      if (bookingUrl && bookingUrl !== '#!') {
        el.href = bookingUrl;
        el.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: property.ybsId → [data-ybs-button] (없으면 숨김)
  HeaderFooterMapper.prototype.mapYbs = function () {
    var ybsId = this.getProperty().ybsId;
    document.querySelectorAll('[data-ybs-button]').forEach(function (el) {
      if (!ybsId) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      el.setAttribute('data-ybs-id', ybsId);
      var target = el.tagName === 'A' ? el : el.querySelector('a');
      if (target) {
        target.href = YBS_BASE_URL + ybsId;
        target.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: homepage.socialLinks.{facebook|instagram|blog|youtube} → [data-homepage-socialLinks-{platform}]
  //
  // 값이 있으면 href(+ target=_blank rel=noopener) + 노출, 없으면(null·빈 문자열·공백·키 없음) 숨긴다.
  // 네이버 버튼은 blog 값(어드민 blog 칸에 네이버 플레이스/블로그 주소), 인스타그램 버튼은 instagram 값.
  // facebook / youtube 는 D2형 헤더에 마크업이 없어 매칭 요소가 0개다.
  // D2형은 헤더(641px 이상, .hd_sns)와 aside(640px 이하, .aside_sns) 두 곳에 같은 버튼이 있고
  // 어느 쪽을 보일지는 CSS 미디어쿼리가 정한다.
  // 마크업은 매핑 전 깜빡임이 없도록 style="display: none" 으로 시작한다.
  // 버튼을 감싼 [data-social-wrap] 은 안에 보이는 버튼이 하나도 없으면 래퍼째 숨긴다(빈 칸 방지).
  // 헤더(aside 포함)에 버튼이 하나라도 보이면 루트에 data-social="on", 아니면 "off" — 레이아웃 보정 CSS 기준
  // (:has 대신 — 일부 브라우저에서 스타일 미반영).
  HeaderFooterMapper.prototype.mapSocialLinks = function () {
    var socialLinks = this.getHomepage().socialLinks || {};
    var headerOn = false;
    ['facebook', 'instagram', 'blog', 'youtube'].forEach(function (platform) {
      var raw = socialLinks[platform];
      var url = raw === undefined || raw === null ? '' : String(raw).trim();
      document
        .querySelectorAll('[data-homepage-socialLinks-' + platform + ']')
        .forEach(function (el) {
          if (!url) {
            el.style.display = 'none';
            el.setAttribute('href', '#!');
            return;
          }
          el.setAttribute('href', url);
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener');
          el.style.display = '';
          if (el.closest('.header')) headerOn = true;
        });
    });
    document.querySelectorAll('[data-social-wrap]').forEach(function (wrap) {
      var visible = Array.prototype.some.call(
        wrap.querySelectorAll(
          '[data-homepage-socialLinks-blog], [data-homepage-socialLinks-instagram]'
        ),
        function (el) {
          return el.style.display !== 'none';
        }
      );
      wrap.style.display = visible ? '' : 'none';
    });
    document.documentElement.setAttribute('data-social', headerOn ? 'on' : 'off');
  };

  // 상담 URL 에 쓸 tripPropertyId. 없거나 형식이 아니면 빈 문자열.
  HeaderFooterMapper.prototype.getConsultId = function () {
    var raw = consultText(this.getProperty().tripPropertyId);
    // ⚠️ URL 쿼리에 그대로 붙는 값이라 토큰 형태만 통과시킨다. 플레이스홀더
    //    문자열(`숙소 ID` 같은 한글·공백)이 들어와도 링크가 깨지지 않는다.
    return /^[A-Za-z0-9_-]+$/.test(raw) ? raw : '';
  };

  // 상담하기 노출 대상인가 — 파트너 타입 + tripPropertyId 둘 다 있어야 한다.
  HeaderFooterMapper.prototype.isConsultVisible = function () {
    var partnerType = consultText(this.getProperty().partnerType);
    return Boolean(this.getConsultId()) && CONSULT_PARTNER_TYPES.indexOf(partnerType) !== -1;
  };

  // MAPPER: property.tripPropertyId + partnerType → [data-consult-button] (우측 하단 상담하기)
  //
  // 총판A 만 노출하고, `tripPropertyId` 가 비면 타입과 무관하게 숨긴다.
  // 값이 없으면 `[data-consult-wrap]` 째 숨긴다 — 버튼만 숨기면 빈 박스가 남는다.
  HeaderFooterMapper.prototype.mapConsult = function () {
    var tripPropertyId = this.getConsultId();
    var visible = this.isConsultVisible();

    // 상담하기가 빠지면 예약하기 아래가 비어 버린다.
    // CSS 가 위치를 되돌릴 수 있도록 상태를 루트에 찍는다.
    document.documentElement.setAttribute('data-consult', visible ? 'on' : 'off');

    document.querySelectorAll('[data-consult-button]').forEach(function (el) {
      var host = el.closest('[data-consult-wrap]') || el;
      if (!visible) {
        host.style.display = 'none';
        return;
      }
      host.style.display = '';
      var target = el.tagName === 'A' ? el : el.querySelector('a');
      if (target) {
        target.href = CONSULT_BASE_URL + tripPropertyId;
        target.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: roomtypes[].name → [data-rooms-submenu] (data-room-menu-link 앵커 뒤에 li 동적 생성)
  HeaderFooterMapper.prototype.mapRoomMenu = function () {
    var self = this;
    var roomItems = this.getRoomMenuItems(this.getRoomtypes());
    document.querySelectorAll('[data-rooms-submenu]').forEach(function (container) {
      // 이전 생성분 제거 (preview 재렌더 대비)
      container.querySelectorAll('[data-generated="room"]').forEach(function (li) {
        li.remove();
      });
      roomItems.forEach(function (item) {
        var name = self.getRoomMenuLabel(item);
        // 이름 없는 객실타입은 빈 메뉴 항목(여백)이 되므로 건너뜀
        if (!String(name).trim()) return;
        var li = document.createElement('li');
        li.setAttribute('data-generated', 'room');
        var a = document.createElement('a');
        a.href = self.getRoomMenuLink(item);
        a.textContent = name;
        li.appendChild(a);
        container.appendChild(li);
      });
    });
  };

  // MAPPER: property.facilities[].name → [data-facility-menu-link] (컨테이너 비우고 li 동적 생성)
  HeaderFooterMapper.prototype.mapFacilityMenu = function () {
    var facilities = this.getProperty().facilities || [];
    document.querySelectorAll('[data-facility-menu-link]').forEach(function (container) {
      container.innerHTML = '';
      facilities.forEach(function (f) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = 'facility.html?id=' + f.id;
        a.textContent = f.name || '';
        li.appendChild(a);
        container.appendChild(li);
      });
    });
  };

  // MAPPER: pages.layoutMap / nearbyAttractions enabled → 메뉴 표시/숨김
  //
  // 미리보기가 꺼지면 "미리보기" li 를 숨기고, 대메뉴 ROOMS([data-rooms-link])는
  // 첫 번째 객실 상세로 보낸다 — 그대로 두면 layout-map.html 이 404 로 튕긴다.
  // 판정은 layout-map.html 의 404 기준과 같은 isLayoutMapEnabled() 를 쓴다.
  HeaderFooterMapper.prototype.mapPageToggles = function () {
    var layoutMapEnabled = this.isLayoutMapEnabled();
    document.querySelectorAll('[data-menu-id="layout-map"]').forEach(function (el) {
      el.style.display = layoutMapEnabled ? '' : 'none';
    });

    var roomsLink = this.getRoomsEntryLink();
    if (roomsLink) {
      document.querySelectorAll('[data-rooms-link]').forEach(function (el) {
        el.setAttribute('href', roomsLink);
      });
    }

    var nearbyEnabled = this.isPageEnabled('nearbyAttractions');
    document.querySelectorAll('[data-travel-menu]').forEach(function (el) {
      el.style.display = nearbyEnabled ? '' : 'none';
    });
  };

  // 전화번호 링크(<a data-footer-phone-link>)를 번호 개수만큼 복제해 " | " 로 구분 노출
  HeaderFooterMapper.prototype.renderFooterPhones = function (phones) {
    var links = document.querySelectorAll('[data-footer-phone-link]');
    if (!links.length || !phones.length) return;

    links.forEach(function (link) {
      var parent = link.parentNode;
      if (!parent) return;

      // 멱등: 이전 렌더로 만든 복제 링크/구분자를 정리하고 원본 링크 하나만 남긴다
      parent.querySelectorAll('[data-footer-phone-link]').forEach(function (el, i) {
        if (i > 0) parent.removeChild(el);
      });
      parent.querySelectorAll('[data-footer-phone-sep]').forEach(function (el) {
        parent.removeChild(el);
      });

      phones.forEach(function (phone, idx) {
        var el = idx === 0 ? link : link.cloneNode(true);
        var span = el.querySelector('[data-footer-phone]');
        if (span) span.textContent = phone;
        el.setAttribute('href', 'tel:' + String(phone).replace(/[^0-9+]/g, ''));

        if (idx > 0) {
          var sep = document.createElement('span');
          sep.setAttribute('data-footer-phone-sep', '');
          sep.textContent = ' | ';
          parent.appendChild(sep);
          parent.appendChild(el);
        }
      });
    });
  };

  // MAPPER: property.contactPhone / property.businessInfo → footer 라인별 텍스트
  // 전화번호 소스는 businessInfo.businessPhone(사업자 번호)이 아니라 property.contactPhone(노출용 번호 배열)이다.
  // MAPPER: property.tripProviderName → [data-copyright]
  // 공급사명이 있으면 data-copyright 의 템플릿 문자열에서 {provider} 를 치환한다.
  // 값이 없으면(백오피스 미입력 → "") HTML 의 기존 트립일레븐 문구를 그대로 둔다.
  HeaderFooterMapper.prototype.mapCopyright = function () {
    var provider = String(this.getProperty().tripProviderName || '').trim();
    if (!provider) return;
    document.querySelectorAll('[data-copyright]').forEach(function (el) {
      var tpl = el.getAttribute('data-copyright') || '';
      el.textContent = tpl.replace(/\{provider\}/g, provider);
    });
  };

  // MAPPER: customFields.footer.ruralStayMark → [data-footer-rural-stay-mark] (푸터 맨 위, 전화번호 위)
  // 농어촌민박사업자 이미지가 있을 때만 이미지 줄을 노출한다. 없으면 숨겨 기존 푸터와 같다.
  // 프리뷰는 같은 페이지에서 다시 매핑하므로 매번 표시 상태를 되돌린다.
  HeaderFooterMapper.prototype.mapRuralStayMark = function () {
    var footer = this.getCustomFields().footer || {};
    var footerMarks = footer;
    var marks = Array.isArray(footerMarks.ruralStayMarks)
      ? footerMarks.ruralStayMarks.slice(0, 2)
      : [footerMarks.ruralStayMark];
    var markUrl = marks.some(function (mark) { return mark && mark.url; });

    document.querySelectorAll('[data-footer-rural-stay-mark-wrap]').forEach(function (wrap) {
      wrap.style.display = markUrl ? '' : 'none';
    });
    document.querySelectorAll('[data-footer-rural-stay-mark-wrap]').forEach(function (wrap) {
      var images = wrap.querySelectorAll('[data-footer-rural-stay-mark]');
      var count = marks.filter(function (mark) { return mark && mark.url; }).length;
      images.forEach(function (img, index) {
        var mark = marks[index];
        var url = mark && mark.url ? String(mark.url) : '';
        img.style.display = url ? 'inline-block' : 'none';
        img.style.maxWidth = count > 1 ? 'calc((100% - 12px) / 2)' : '';
        img.style.marginLeft = index && url && marks[0] && marks[0].url ? '12px' : '';
        if (!url) {
          img.removeAttribute('src');
          return;
        }
        img.src = url;
        img.alt = (mark.description && String(mark.description).trim()) || '농어촌민박사업자';
      });
    });
  };

  HeaderFooterMapper.prototype.mapFooter = function () {
    this.mapCopyright();
    this.mapRuralStayMark();
    var prop = this.getProperty();
    var biz = prop.businessInfo || {};
    var phones = this.toPhoneList(prop.contactPhone);

    var fields = {
      '[data-footer-address]': biz.businessAddress,
      '[data-footer-business-name]': biz.businessName,
      '[data-footer-representative]': biz.representativeName,
      '[data-footer-business-number]': biz.businessNumber
    };
    Object.keys(fields).forEach(function (selector) {
      var value = fields[selector];
      if (value === undefined || value === null || value === '') return;
      document.querySelectorAll(selector).forEach(function (el) {
        el.textContent = value;
      });
    });

    this.renderFooterPhones(phones);
  };

  document.addEventListener('headerFooterLoaded', function () {
    var mapper = new HeaderFooterMapper();
    mapper.initialize();
    global.headerFooterMapperInstance = mapper;
  });

  global.HeaderFooterMapper = HeaderFooterMapper;
})(window);
