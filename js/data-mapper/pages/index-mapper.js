(function (global) {
  'use strict';

  // totalRoomCount 한글 변환 테이블 (값 1 이상인 항목만 나열)
  var ROOM_COUNT_LABELS = {
    bedroom: '침대룸',
    bathroom: '화장실',
    livingRoom: '거실',
    ondol: '온돌룸',
    kitchen: '주방'
  };

  // roomStructures[0] + "/ " + totalRoomCount 값≥1 항목 한글 나열
  // 예) "원룸형/ 침대룸 화장실 주방"
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

  function IndexMapper() {
    BaseDataMapper.call(this);
  }
  IndexMapper.prototype = Object.create(BaseDataMapper.prototype);
  IndexMapper.prototype.constructor = IndexMapper;

  IndexMapper.prototype.mapPage = function () {
    this.mapHeroSlides();
    this.mapPropertyNameEn();
    this.mapPropertyName();
    this.mapRoomPreview();
    this.mapSpecialPreview();
    this.mapFacilityTags();
    this.mapMenuImages();
    this.mapThemes();
    this.refreshSwipers();
  };

  // 동적 슬라이드 주입 후 Swiper 재초기화 (common.js가 빈 wrapper로 먼저 init하므로
  // loop/fade/autoplay가 깨짐 → destroy 후 재생성).
  IndexMapper.prototype.refreshSwipers = function () {
    if (typeof window.initMainSwipers === 'function') {
      window.initMainSwipers();
    }
  };

  // MAPPER: customFields.pages.index.sections[0].hero.images[isSelected]
  // → .main_visual .swiper-wrapper / 슬라이드는 background-image 방식
  IndexMapper.prototype.mapHeroSlides = function () {
    var pages = this.getPages();
    var hero =
      pages.index &&
      pages.index.sections &&
      pages.index.sections[0] &&
      pages.index.sections[0].hero;
    var wrapper = document.querySelector('[data-index-hero-slides]');
    if (!wrapper) return;

    var images = this.getSelectedImages((hero && hero.images) || []);
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
      if (img.url) {
        div.style.backgroundImage = 'url(' + img.url + ')';
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundPosition = 'center';
        div.style.backgroundSize = 'cover';
      } else {
        ImageHelpers.applyBackgroundPlaceholder(div);
      }
      wrapper.appendChild(div);
    });
  };

  // MAPPER: property.nameEn → [data-property-name-en] (영문 숙소명)
  IndexMapper.prototype.mapPropertyNameEn = function () {
    var nameEn = this.getPropertyNameEn();
    document.querySelectorAll('[data-property-name-en]').forEach(function (el) {
      el.textContent = nameEn;
    });
  };

  // MAPPER: property.name → [data-property-name] (한글 숙소명)
  IndexMapper.prototype.mapPropertyName = function () {
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
  };

  // MAPPER: customFields.roomtypes[] + rooms[] id 매칭
  // → .main_room .swiper-wrapper
  // 이름 없는 객실타입도 그대로 노출한다 (헤더/nav 메뉴는 빈 항목이 되므로 skip 하지만,
  // 여기는 썸네일이 보이는 슬라이드라 빠지면 개수가 줄어 화살표까지 사라진다)
  // 이미지: roomtypes[i].images(thumbnail) / strong: name / p: roomStructures + totalRoomCount
  IndexMapper.prototype.mapRoomPreview = function () {
    var roomtypes = this.getRoomtypes();
    var rooms = (this.data && this.data.rooms) || [];
    var wrapper = document.querySelector('[data-index-room-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';
    if (!roomtypes.length) return;

    var self = this;
    // Room Preview 카드는 groupName 과 무관하게 **항상 전체 객실**을 깐다.
    // 그룹으로 접히는 곳은 헤더 ROOMS 메뉴와 객실 상세 탭뿐이고,
    // 카드는 저마다 자기 객실 상세로 연결한다.
    roomtypes.forEach(function (rt) {
      // 원본이 내려둔 객실은 카드도 내지 않는다 — 그룹도 없고 사진도 없으면 보여줄 게 없다.
      // 크롤러가 이름·사진을 못 읽은 경우는 groupName 이 남아 있어 여기서 걸리지 않는다.
      if (rt && !self.getRoomGroupName(rt) && !(rt.images || []).length) return;
      var roomLabel = self.getRoomtypeName(rt);
      if (!String(roomLabel).trim() || !rt) return;
      var thumbs = (rt.images || []).filter(function (img) {
        return img.category === 'roomtype_thumbnail';
      });
      var thumbUrl = self.getFirstSelectedImage(thumbs) || (thumbs[0] && thumbs[0].url) || '';

      var matched = rooms.filter(function (r) {
        return r.id === rt.id;
      })[0];
      var structureText = buildRoomStructure(matched);

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
      p.textContent = structureText;

      div.appendChild(link);
      div.appendChild(imgBox);
      div.appendChild(strong);
      div.appendChild(p);
      wrapper.appendChild(div);
    });
  };

  IndexMapper.prototype.mapSpecialPreview = function () {
    var facilities = this.getProperty().facilities || [];
    var wrapper = document.querySelector('[data-index-facility-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';
    if (!facilities.length) return;

    var self = this;
    facilities.forEach(function (f) {
      var imgUrl =
        self.getFirstSelectedImage(f.images || []) ||
        (f.images && f.images[0] && f.images[0].url) ||
        '';

      var div = document.createElement('div');
      div.className = 'swiper-slide';

      var link = document.createElement('a');
      link.href = 'facility.html?id=' + f.id;
      link.className = 'link';

      var imgBox = document.createElement('div');
      imgBox.className = 'img';
      if (imgUrl) {
        imgBox.style.backgroundImage = 'url(' + imgUrl + ')';
        imgBox.style.backgroundRepeat = 'no-repeat';
        imgBox.style.backgroundPosition = 'center';
        imgBox.style.backgroundSize = 'cover';
      } else {
        ImageHelpers.applyBackgroundPlaceholder(imgBox);
      }

      var txtBox = document.createElement('div');
      txtBox.className = 'txt_box';
      var span = document.createElement('span');
      span.textContent = 'SPECIAL';
      var strong = document.createElement('strong');
      strong.textContent = f.name || '';
      var more = document.createElement('a');
      more.href = '#';
      more.textContent = 'VIEW MORE ▶';
      txtBox.appendChild(span);
      txtBox.appendChild(strong);
      txtBox.appendChild(more);

      div.appendChild(link);
      div.appendChild(imgBox);
      div.appendChild(txtBox);
      wrapper.appendChild(div);
    });
  };

  // MAPPER: property.facilities[].name → [data-index-facility-tags] (시설명에 # 붙여 나열)
  IndexMapper.prototype.mapFacilityTags = function () {
    var facilities = this.getProperty().facilities || [];
    var el = document.querySelector('[data-index-facility-tags]');
    if (!el) return;
    var tags = facilities
      .filter(function (f) {
        return f.name && f.name.trim();
      })
      .map(function (f) {
        return '#' + f.name.trim();
      });
    el.textContent = tags.join(' ');
  };

  // MAPPER: property.propertyThemes → [data-property-themes] (각 테마에 # 붙여 나열, room/room-list와 동일)
  IndexMapper.prototype.mapThemes = function () {
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

  // MAPPER: [data-index-menu-image] 값 → index.essence 안의 같은 이름 마커 이미지
  // 원본 .menu_li 3칸은 각 페이지 히어로와 다른, 손으로 고른 컷이다.
  // 크롤러가 index.essence.images 에 description 마커(menu_reservation 등)로 담는다.
  // 마커 이미지가 없으면 예전 동작대로 각 페이지 히어로 첫 장으로 떨어진다.
  IndexMapper.prototype.mapMenuImages = function () {
    var pages = this.getPages();
    var section = pages.index && pages.index.sections && pages.index.sections[0];
    var essence = (section && section.essence && section.essence.images) || [];

    var pickMenuImage = function (key) {
      var mark = 'menu_' + key;
      var hit = essence.find(function (im) {
        return im && im.description === mark && im.url;
      });
      if (hit) return hit.url;

      var page = pages[key];
      var hero = page && page.sections && page.sections[0] && page.sections[0].hero;
      var images = (hero && hero.images) || [];
      return (images[0] && images[0].url) || '';
    };

    document.querySelectorAll('[data-index-menu-image]').forEach(function (img) {
      var url = pickMenuImage(img.getAttribute('data-index-menu-image'));
      if (url) {
        img.src = url;
      } else {
        ImageHelpers.applyPlaceholder(img);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new IndexMapper();
    mapper.initialize();
    global.indexMapperInstance = mapper;
  });

  global.IndexMapper = IndexMapper;
})(window);
