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

  // roomStructures[0] + "/ " + totalRoomCount 값≥1 항목 한글 나열 (예: "원룸형/ 침대룸 화장실 주방")
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

  function LayoutMapMapper() {
    BaseDataMapper.call(this);
  }
  LayoutMapMapper.prototype = Object.create(BaseDataMapper.prototype);
  LayoutMapMapper.prototype.constructor = LayoutMapMapper;

  // customFields.pages.layoutMap.sections[0]
  LayoutMapMapper.prototype.getSection = function () {
    var pages = this.getPages();
    return (pages.layoutMap && pages.layoutMap.sections && pages.layoutMap.sections[0]) || null;
  };

  LayoutMapMapper.prototype.mapPage = function () {
    // enabled=false(또는 섹션 없음) → 404 리다이렉트
    // 헤더 "미리보기" li 숨김, 대메뉴 ROOMS 이동처(첫 객실 상세), room.html 탭 "미리보기" 숨김도
    // 같은 기준(isLayoutMapEnabled)으로 정한다.
    if (!this.isLayoutMapEnabled()) {
      window.location.href = '404.html';
      return;
    }

    this.mapHeroBg();
    this.mapPropertyName();
    this.mapPropertyNameEn();
    this.mapRoomNav();
    this.mapRoomSlides();
    this.mapLayoutImage();
    this.mapThemes();

    // 동적 슬라이드 주입 후 Swiper 재초기화
    if (typeof window.initMainSwipers === 'function') window.initMainSwipers();
  };

  // MAPPER: property.propertyThemes → [data-property-themes] (각 테마에 # 붙여 나열)
  LayoutMapMapper.prototype.mapThemes = function () {
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

  // property.images[0] (thumbnail / exterior 등 카테고리 묶음)
  LayoutMapMapper.prototype.getPropertyImageSet = function () {
    var imgs = this.getProperty().images;
    return (imgs && imgs[0]) || {};
  };

  // MAPPER: pages.layoutMap.sections[0].hero.images[isSelected][0].url → .sub_visual 배경
  // 값이 없으면 숙소 대표 이미지(property.images[0].thumbnail)로 폴백
  LayoutMapMapper.prototype.mapHeroBg = function () {
    var section = this.getSection() || {};
    var hero = section.hero || {};
    var url =
      this.getFirstSelectedImage(hero.images || []) ||
      this.getFirstSelectedImage(this.getPropertyImageSet().thumbnail || []);
    setBackground(document.querySelector('[data-layout-map-hero-bg]'), url, true);
  };

  // MAPPER: property.name → [data-property-name]
  LayoutMapMapper.prototype.mapPropertyName = function () {
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
  };

  // MAPPER: property.nameEn → [data-property-name-en]
  LayoutMapMapper.prototype.mapPropertyNameEn = function () {
    var nameEn = this.getPropertyNameEn();
    document.querySelectorAll('[data-property-name-en]').forEach(function (el) {
      el.textContent = nameEn;
    });
  };

  // MAPPER: roomtypes[].name → [data-room-list-nav] (첫 번째 li 미리보기는 정적 유지)
  LayoutMapMapper.prototype.mapRoomNav = function () {
    var roomtypes = this.getRoomtypes();
    var roomItems = this.getRoomMenuItems(roomtypes);
    var ul = document.querySelector('[data-room-list-nav]');
    if (!ul) return;

    ul.querySelectorAll('[data-generated="nav"]').forEach(function (li) {
      li.remove();
    });

    var self = this;
    roomItems.forEach(function (item) {
      var roomLabel = self.getRoomMenuLabel(item);
      if (!String(roomLabel).trim()) return;
      var li = document.createElement('li');
      li.setAttribute('data-generated', 'nav');
      var a = document.createElement('a');
      a.href = self.getRoomMenuLink(item);
      a.textContent = roomLabel;
      li.appendChild(a);
      ul.appendChild(li);
    });
  };

  LayoutMapMapper.prototype.mapRoomSlides = function () {
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

  LayoutMapMapper.prototype.mapLayoutImage = function () {
    var img = document.querySelector('[data-layout-map-image]');
    if (!img) return;
    var section = this.getSection() || {};
    var about = section.about || {};
    var url =
      this.getFirstSelectedImage(about.images || []) ||
      ((this.getPropertyImageSet().exterior || [])[0] || {}).url;
    if (url) {
      img.src = url;
    } else {
      ImageHelpers.applyPlaceholder(img);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new LayoutMapMapper();
    mapper.initialize();
    global.layoutMapMapperInstance = mapper;
  });

  global.LayoutMapMapper = LayoutMapMapper;
})(window);
