(function (global) {
  'use strict';

  // 교차 배너 제목 — 원본 사이트와 동일한 고정 영문 카피.
  // 이 자리는 디자인상 영문 장식 문구 슬롯이라 객실명(한글)을 넣지 않는다. (매핑 대상 아님)
  var BNR_TITLE_HTML = "Cozy &amp; Clean <br>Room's";

  // 크롤러가 "Room's Detail" 교차 배너용으로 고른 컷에 붙이는 마커 (description: "room_bnr:0")
  // 원본은 이 2장을 객실 사진 순서와 무관하게 따로 고른다.
  var ROOM_BNR_MARK = 'room_bnr';
  function bnrMarkIndex(im) {
    var d = (im && im.description) || '';
    if (d.indexOf(ROOM_BNR_MARK + ':') !== 0) return -1;
    var n = parseInt(d.slice(ROOM_BNR_MARK.length + 1), 10);
    return isNaN(n) ? -1 : n;
  }

  var ROOM_COUNT_LABELS = {
    bedroom: '침대룸',
    bathroom: '화장실',
    livingRoom: '거실',
    ondol: '온돌룸',
    kitchen: '주방'
  };

  function buildRoomStructure(room) {
    if (!room) return '';
    var structures = room.roomStructures || [];
    var base = structures.length ? structures[0] : '';
    var counts = room.totalRoomCount || {};
    var labels = [];
    Object.keys(ROOM_COUNT_LABELS).forEach(function (key) {
      if (counts[key] >= 1) labels.push(ROOM_COUNT_LABELS[key]);
    });
    if (base && labels.length) return base + '/ ' + labels.join(' ');
    return base || labels.join(' ');
  }

  // 배경 이미지 적용 (url 있으면 cover 배경, 없으면 No-Image placeholder)
  function setBackground(el, url, cover) {
    if (!el) return;
    if (url) {
      el.style.backgroundImage = 'url(' + url + ')';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      if (cover) el.style.backgroundSize = 'cover';
    } else {
      ImageHelpers.applyBackgroundPlaceholder(el);
    }
  }

  function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function notNil(v) {
    return v !== null && v !== undefined;
  }

  function RoomMapper() {
    BaseDataMapper.call(this);
  }
  RoomMapper.prototype = Object.create(BaseDataMapper.prototype);
  RoomMapper.prototype.constructor = RoomMapper;

  RoomMapper.prototype.mapPage = function () {
    var rt = this.getCurrentRoomType();
    var room = this.getMatchedRoom(rt);

    this.mapPropertyNameEn();
    this.mapHeroSlides(rt);
    this.mapRoomInfo(rt, room);
    this.mapBookingUrl();
    var pieces = this.getRoomPieces(rt);
    this.mapBnr(rt, pieces);
    this.mapWideBnr(rt, pieces);
    this.mapRoomNav(rt);
    this.mapFloorplan(rt);
    this.mapRoomSlides();
    this.mapThemes();

    if (typeof window.initMainSwipers === 'function') window.initMainSwipers();
  };

  // MAPPER: property.propertyThemes → [data-property-themes] (각 테마에 # 붙여 나열)
  RoomMapper.prototype.mapThemes = function () {
    var el = document.querySelector('[data-property-themes]');
    if (!el) return;
    var themes = this.getProperty().propertyThemes || [];
    el.textContent = themes
      .filter(function (t) {
        return t && t.trim();
      })
      .map(function (t) {
        return '#' + t.trim();
      })
      .join(' ');
  };

  // 현재 객실타입: URL ?room_id= (preview는 ?id= 호환), 없으면 첫 번째
  RoomMapper.prototype.getCurrentRoomType = function () {
    var roomtypes = this.getRoomtypes();
    var params = new URLSearchParams(window.location.search);
    var roomId = params.get('room_id') || params.get('id');
    if (roomId) {
      var found = roomtypes.filter(function (rt) {
        return rt.id === roomId;
      })[0];
      if (found) return found;
    }
    return roomtypes[0] || null;
  };

  // roomtypes[current].id === rooms[j].id 매칭
  RoomMapper.prototype.getMatchedRoom = function (roomtype) {
    if (!roomtype) return null;
    var rooms = (this.data && this.data.rooms) || [];
    return (
      rooms.filter(function (r) {
        return r.id === roomtype.id;
      })[0] || null
    );
  };

  // roomtypes[i].images 중 특정 category(isSelected, sortOrder순)
  RoomMapper.prototype.getCategoryImages = function (rt, category) {
    var imgs = (rt && rt.images) || [];
    var filtered = imgs.filter(function (im) {
      return im.category === category;
    });
    return this.getSelectedImages(filtered);
  };

  // MAPPER: property.nameEn → [data-property-name-en]
  RoomMapper.prototype.mapPropertyNameEn = function () {
    setAllText('[data-property-name-en]', this.getPropertyNameEn());
  };

  // MAPPER: roomtypes[current].images interior[isSelected] → 히어로 배경 슬라이드
  RoomMapper.prototype.mapHeroSlides = function (rt) {
    var wrapper = document.querySelector('[data-room-hero-slides]');
    if (!wrapper) return;

    // 마커 붙은 컷은 아래 교차 배너 전용이라 슬라이더에서는 뺀다 (중복 노출 방지)
    var images = this.getCategoryImages(rt, 'roomtype_interior').filter(function (im) {
      return bnrMarkIndex(im) < 0;
    });
    wrapper.innerHTML = '';

    if (!images.length) {
      var ph = document.createElement('div');
      ph.className = 'swiper-slide';
      ImageHelpers.applyBackgroundPlaceholder(ph);
      wrapper.appendChild(ph);
      return;
    }

    images.forEach(function (img) {
      var div = document.createElement('div');
      div.className = 'swiper-slide';
      setBackground(div, img.url, true);
      wrapper.appendChild(div);
    });
  };

  // MAPPER: 객실명/유형/인원/평형/집기품목 (히어로 + 표 PC/모바일 공통)
  RoomMapper.prototype.mapRoomInfo = function (rt, room) {
    var name = this.getRoomtypeName(rt);
    setAllText('[data-room-name]', name);
    setAllText('[data-room-structure]', buildRoomStructure(room));
    setAllText(
      '[data-room-base-occupancy]',
      room && notNil(room.baseOccupancy) ? room.baseOccupancy : ''
    );
    setAllText(
      '[data-room-max-occupancy]',
      room && notNil(room.maxOccupancy) ? room.maxOccupancy : ''
    );
    // 평형: rooms[j].size(㎡)를 평으로 환산 (1평 = 3.305785㎡, 소수 1자리) — sizePyeong 미전송 대비
    var sqm = room && notNil(room.size) ? Number(room.size) : null;
    setAllText(
      '[data-room-size-pyeong]',
      sqm !== null && !isNaN(sqm) ? Math.round((sqm / 3.305785) * 10) / 10 + '평' : ''
    );
    setAllText(
      '[data-room-amenities]',
      room && room.amenities && room.amenities.length ? room.amenities.join(', ') : ''
    );
  };

  // MAPPER: property.realtimeBookingId → [data-booking-url] href 직접 주입
  RoomMapper.prototype.mapBookingUrl = function () {
    var url = this.getBookingUrl();
    document.querySelectorAll('[data-booking-url]').forEach(function (el) {
      if (url && url !== '#!') {
        el.href = url;
        el.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: roomtypes[current] interior 이미지 → [data-room-bnr] (교차 레이아웃)
  // 원본 레이아웃이 li 2개 고정(좌: img+txt / 우: txt+img)이므로 앞 2장만 사용한다.
  // 나머지 interior 이미지는 상단 히어로 슬라이더([data-room-hero-slides])에서 전부 노출된다.
  // li 내부 문구:
  //   strong : "Cozy & Clean Room's" 고정 (영문 장식 슬롯 — 매핑 안 함)
  //   p      : image.description → 없으면 "Stay with your beloved companion …" 폴백
  /**
   * "Room's Detail" 조각컷 3칸 (교차 배너 2장 + 하단 와이드 1장).
   *
   * 크롤러가 원본이 고른 3장을 순서대로 객실 외경(roomtype_exterior)에 담는다
   * — 백오피스 "객실 외경" 칸에 3장이 보이고 직원이 바꾸거나 순서를 바꿀 수 있다.
   *   exterior[0] → 교차 배너 1, [1] → 교차 배너 2, [2] → 하단 와이드
   *
   * 2026-11-26 마카이(macaiops.com) 이전 데이터는 교차 배너 2장을 interior 의
   * room_bnr:N 마커로, 와이드 1장만 exterior 로 담았다. 그래서 백오피스에서는
   * "조각컷 3장 중 1장만 들어왔다"로 보였다. exterior 가 1장 이하면 예전 규칙을 그대로 쓴다.
   *
   * @returns {{ bnr: Array|null, wide: Object|null, fromExterior: boolean }}
   *          bnr 가 null 이면 mapBnr 가 예전 규칙(마커 → 앞 2장)으로 고른다.
   */
  RoomMapper.prototype.getRoomPieces = function (rt) {
    var ext = this.getCategoryImages(rt, 'roomtype_exterior');
    if (ext.length >= 2) {
      return { bnr: ext.slice(0, this.BNR_MAX), wide: ext[2] || null, fromExterior: true };
    }
    var wide = ext[0] || this.getCategoryImages(rt, 'roomtype_thumbnail')[0] || null;
    return { bnr: null, wide: wide, fromExterior: false };
  };

  RoomMapper.prototype.mapBnr = function (rt, pieces) {
    var ul = document.querySelector('[data-room-bnr]');
    if (!ul) return;

    pieces = pieces || this.getRoomPieces(rt);
    var interior = this.getCategoryImages(rt, 'roomtype_interior');

    // 크롤러가 고른 컷(room_bnr:N)이 있으면 그걸 N 순서대로 쓴다.
    // 마커가 없는 예전 데이터는 예전처럼 객실 사진 앞 2장으로 떨어진다.
    var marked = interior
      .filter(function (im) {
        return bnrMarkIndex(im) >= 0;
      })
      .sort(function (a, b) {
        return bnrMarkIndex(a) - bnrMarkIndex(b);
      });
    var images = pieces.bnr
      ? pieces.bnr
      : (marked.length
          ? marked
          : interior.filter(function (im) {
              return bnrMarkIndex(im) < 0;
            })
        ).slice(0, this.BNR_MAX);

    var nl2br = this.nl2br.bind(this);
    var descFallback = this.BNR_FALLBACK_DESC_HTML;

    if (!images.length) images = [{ url: '' }];

    ul.innerHTML = '';
    images.forEach(function (imgData, index) {
      var li = document.createElement('li');

      var imgDiv = document.createElement('div');
      imgDiv.className = 'img';
      setBackground(imgDiv, imgData.url, true);

      var txtDiv = document.createElement('div');
      txtDiv.className = 'txt';
      var inner = document.createElement('div');
      var strong = document.createElement('strong');
      strong.innerHTML = BNR_TITLE_HTML;
      var p = document.createElement('p');
      // description 이 마커면 문구가 아니다 — 고정 폴백 문구를 쓴다
      var desc = bnrMarkIndex(imgData) >= 0 ? '' : imgData.description;
      p.innerHTML = desc ? nl2br(desc) : descFallback;
      inner.appendChild(strong);
      inner.appendChild(p);
      txtDiv.appendChild(inner);

      // 교차: 짝수 index(odd nth) → img 먼저, 홀수 index(even nth) → txt 먼저
      if (index % 2 === 0) {
        li.appendChild(imgDiv);
        li.appendChild(txtDiv);
      } else {
        li.appendChild(txtDiv);
        li.appendChild(imgDiv);
      }
      ul.appendChild(li);
    });
  };

  // MAPPER: 조각컷 하단 와이드 → [data-room-wide-bnr] 배경 (배치는 getRoomPieces)
  //
  // 원본 객실 상세의 하단 와이드 배너다. thumbnail 을 쓰면 안 된다 —
  // thumbnail 은 목록·카드용 대표 이미지(객실 사진 첫 장)라 자리가 다르다.
  // exterior 가 없는 예전 데이터만 thumbnail 로 폴백한다.
  // 외경을 2장만 남긴 객실(교차 배너 2칸만 채움)은 와이드를 숨긴다.
  RoomMapper.prototype.mapWideBnr = function (rt, pieces) {
    var el = document.querySelector('[data-room-wide-bnr]');
    if (!el) return;
    pieces = pieces || this.getRoomPieces(rt);
    if (pieces.fromExterior && !pieces.wide) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    setBackground(el, pieces.wide && pieces.wide.url, true);
  };

  // MAPPER: roomtypes[current] 평면도 크롤링 이미지 → [data-room-floorplan-image]
  // 이미지가 없으면 평면도 섹션 전체 미노출.
  RoomMapper.prototype.mapFloorplan = function (rt) {
    var section = document.querySelector('[data-room-floorplan-section]');
    if (!section) return;

    var imgEl = section.querySelector('[data-room-floorplan-image]');
    var image = this.getRoomFloorplanImage(rt);
    if (!image || !image.url) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    if (imgEl) {
      imgEl.src = image.url;
      imgEl.alt = this.cleanText(image.description) || '객실 평면도';
    }
  };

  // MAPPER: roomtypes[].name → [data-room-list-nav] (현재 객실 on, 이름 없는 것 skip, 미리보기 li 유지)
  RoomMapper.prototype.mapRoomNav = function (currentRt) {
    var roomtypes = this.getRoomtypes();
    var roomItems = this.getRoomMenuItems(roomtypes);
    var ul = document.querySelector('[data-room-list-nav]');
    if (!ul) return;

    ul.querySelectorAll('[data-generated="nav"]').forEach(function (li) {
      li.remove();
    });

    // 첫 li 는 "미리보기"(layout-map) 다. 미리보기가 꺼져 있으면 눌러도 404 이므로 숨긴다.
    var preview = ul.querySelector('li:not([data-generated])');
    if (preview) preview.style.display = this.isLayoutMapEnabled() ? '' : 'none';

    var self = this;
    var currentId = currentRt && currentRt.id;
    // 그룹 안이면 그 그룹의 객실만 펼친다.
    // 헤더/미리보기 메뉴는 그룹명 하나로 접히고 클릭 시 그룹의 첫 객실로 들어가는데,
    // 이 탭까지 접혀 있으면 2번째 객실부터는 UI 로 도달할 방법이 없다.
    // 멤버가 1실인 그룹은 펼치지 않는다(항목이 하나뿐이라 의미가 없다).
    var activeGroup = null;
    roomItems.forEach(function (it) {
      var members = (it && it.roomtypes) || [];
      if (members.length > 1 && self.isRoomMenuItemActive(it, currentId)) activeGroup = it;
    });
    if (activeGroup) {
      roomItems = activeGroup.roomtypes.map(function (rt) {
        return { label: self.getRoomtypeName(rt), roomtype: rt, roomtypes: [rt] };
      });
    }
    roomItems.forEach(function (item) {
      var roomLabel = self.getRoomMenuLabel(item);
      if (!String(roomLabel).trim()) return;
      var li = document.createElement('li');
      li.setAttribute('data-generated', 'nav');
      if (self.isRoomMenuItemActive(item, currentId)) li.className = 'on';
      var a = document.createElement('a');
      a.href = self.getRoomMenuLink(item);
      a.textContent = roomLabel;
      li.appendChild(a);
      ul.appendChild(li);
    });
  };

  RoomMapper.prototype.mapRoomSlides = function () {
    var roomtypes = this.getRoomtypes();
    var rooms = (this.data && this.data.rooms) || [];
    var wrapper = document.querySelector('[data-room-list-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';
    if (!roomtypes.length) return;

    var self = this;
    // Room Preview 카드는 groupName 과 무관하게 **항상 전체 객실**을 깐다.
    // 그룹으로 접히는 곳은 헤더 ROOMS 메뉴와 객실 상세 탭뿐이고,
    // 카드는 저마다 자기 객실 상세로 연결한다.
    roomtypes.forEach(function (rt) {
      var roomLabel = self.getRoomtypeName(rt);
      if (!String(roomLabel).trim() || !rt) return;
      var thumbs = (rt.images || []).filter(function (img) {
        return img.category === 'roomtype_thumbnail';
      });
      var thumbUrl = self.getFirstSelectedImage(thumbs) || (thumbs[0] && thumbs[0].url) || '';

      var matched = rooms.filter(function (r) {
        return r.id === rt.id;
      })[0];

      var div = document.createElement('div');
      div.className = 'swiper-slide';

      var link = document.createElement('a');
      link.href = self.getRoomMenuLink(rt);
      link.className = 'link';

      var imgBox = document.createElement('div');
      imgBox.className = 'img';
      var img = document.createElement('img');
      if (thumbUrl) {
        img.src = thumbUrl;
        img.alt = roomLabel || '객실 썸네일';
      } else {
        ImageHelpers.applyPlaceholder(img);
      }
      imgBox.appendChild(img);

      var strong = document.createElement('strong');
      strong.textContent = roomLabel;

      var p = document.createElement('p');
      p.textContent = buildRoomStructure(matched);

      div.appendChild(link);
      div.appendChild(imgBox);
      div.appendChild(strong);
      div.appendChild(p);
      wrapper.appendChild(div);
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new RoomMapper();
    mapper.initialize();
    global.roomMapperInstance = mapper;
  });

  global.RoomMapper = RoomMapper;
})(window);
