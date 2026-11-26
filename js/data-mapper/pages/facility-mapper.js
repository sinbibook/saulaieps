(function (global) {
  'use strict';

  // 줄바꿈(\n) → <br>, HTML 이스케이프
  function nl2br(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');
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

  function FacilityMapper() {
    BaseDataMapper.call(this);
  }
  FacilityMapper.prototype = Object.create(BaseDataMapper.prototype);
  FacilityMapper.prototype.constructor = FacilityMapper;

  FacilityMapper.prototype.mapPage = function () {
    var fac = this.getCurrentFacility();

    this.mapPropertyNameEn();
    this.mapFacilityName(fac);
    this.mapDescription(fac);
    this.mapHeroSlides(fac);
    this.mapBnr(fac);
    this.mapNav(fac);
    this.mapSpecialSlides();
    this.mapFacilityTags();

    if (typeof window.initMainSwipers === 'function') window.initMainSwipers();
  };

  FacilityMapper.prototype.getFacilities = function () {
    return this.getProperty().facilities || [];
  };

  // URL ?id= 로 시설 선택, 없으면 첫 번째
  FacilityMapper.prototype.getCurrentFacility = function () {
    var facilities = this.getFacilities();
    var id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      var found = facilities.filter(function (f) {
        return String(f.id) === id;
      })[0];
      if (found) return found;
    }
    return facilities[0] || null;
  };

  // MAPPER: property.nameEn → [data-property-name-en]
  FacilityMapper.prototype.mapPropertyNameEn = function () {
    setAllText('[data-property-name-en]', this.getPropertyNameEn());
  };

  // MAPPER: facilities[current].name → [data-facility-name]
  FacilityMapper.prototype.mapFacilityName = function (fac) {
    setAllText('[data-facility-name]', (fac && fac.name) || '');
  };

  // MAPPER: facilities[current].description → [data-facility-description] (\n→<br>)
  // description 이 비어 오는 경우가 많아 usageGuide(이용안내)로 폴백한다.
  FacilityMapper.prototype.mapDescription = function (fac) {
    var el = document.querySelector('[data-facility-description]');
    if (!el) return;
    // description(소개문)과 usageGuide(이용안내)를 한 줄 띄워 **둘 다** 보여준다.
    // 예전에는 폴백이라 description 이 있으면 usageGuide 가 통째로 묻혔다 —
    // 이용 요금·시간·제약이 화면에서 사라졌다. 둘 다 비면 슬롯을 숨긴다.
    // (t-template-H · I · J 와 같은 방식)
    var body = ((fac && fac.description) || '').trim();
    var guide = ((fac && fac.usageGuide) || '').trim();
    var desc = body + (body && guide ? '\n\n' : '') + guide;
    el.innerHTML = desc ? nl2br(desc) : '';
    // 둘 다 비면 슬롯을 숨긴다 — 빈 줄만 남기 때문이다.
    el.style.display = desc ? '' : 'none';
  };

  // MAPPER: facilities[current].images[isSelected] → 히어로 배경 슬라이드 (cover, 다른 페이지와 통일)
  FacilityMapper.prototype.mapHeroSlides = function (fac) {
    var wrapper = document.querySelector('[data-facility-hero-slides]');
    if (!wrapper) return;

    var images = this.getSelectedImages((fac && fac.images) || []);
    wrapper.innerHTML = '';

    if (!images.length) {
      var ph = document.createElement('div');
      ph.className = 'swiper-slide';
      ImageHelpers.applyBackgroundPlaceholder(ph);
      wrapper.appendChild(ph);
      return;
    }

    images.forEach(function (imgData) {
      var div = document.createElement('div');
      div.className = 'swiper-slide';
      setBackground(div, imgData.url, true);
      wrapper.appendChild(div);
    });
  };

  // MAPPER: facilities[current].images → [data-facility-bnr] (교차 레이아웃)
  // 원본 레이아웃이 li 2개 고정(좌 img+txt / 우 txt+img)이라 앞 2장만 사용한다.
  // 나머지 이미지는 히어로 슬라이더([data-facility-hero-slides])에서 전부 노출된다.
  // li 내부 문구는 데이터 우선, 비어 있으면 폴백:
  //   strong : facilities[current].nameEn → name → "Special Intro"
  //   p      : image.description → "Stay with your beloved companion …"
  FacilityMapper.prototype.mapBnr = function (fac) {
    var ul = document.querySelector('[data-facility-bnr]');
    if (!ul) return;

    var images = this.getSelectedImages((fac && fac.images) || []).slice(0, this.BNR_MAX);
    var titleHtml = fac && fac.nameEn ? nl2br(fac.nameEn) : '';
    if (!titleHtml && fac && fac.name) titleHtml = nl2br(fac.name);
    if (!titleHtml) titleHtml = 'Special Intro';
    var descFallback = this.BNR_FALLBACK_DESC_HTML;

    if (!images.length) images = [{ url: '', description: '' }];

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
      strong.innerHTML = titleHtml;
      var p = document.createElement('p');
      p.innerHTML = imgData.description ? nl2br(imgData.description) : descFallback;
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

  // MAPPER: facilities[].name → [data-facility-nav] (현재 시설 on, 이름 없는 것 skip)
  FacilityMapper.prototype.mapNav = function (current) {
    var ul = document.querySelector('[data-facility-nav]');
    if (!ul) return;

    var facilities = this.getFacilities();
    var currentId = current && current.id;
    ul.innerHTML = '';

    facilities.forEach(function (f) {
      if (!f.name || !f.name.trim()) return;
      var li = document.createElement('li');
      if (f.id === currentId) li.className = 'on';
      var a = document.createElement('a');
      a.href = 'facility.html?id=' + f.id;
      a.textContent = f.name;
      li.appendChild(a);
      ul.appendChild(li);
    });
  };

  // MAPPER: facilities[] → [data-index-facility-slides] (index Special For You와 동일)
  FacilityMapper.prototype.mapSpecialSlides = function () {
    var facilities = this.getFacilities();
    var wrapper = document.querySelector('[data-index-facility-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';
    if (!facilities.length) return;

    var self = this;
    facilities.forEach(function (f) {
      if (!f.name || !f.name.trim()) return;
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
      strong.textContent = f.name;
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

  // MAPPER: facilities[].name → [data-index-facility-tags] (각 시설명에 # 붙여 나열, index와 동일)
  FacilityMapper.prototype.mapFacilityTags = function () {
    var el = document.querySelector('[data-index-facility-tags]');
    if (!el) return;
    var facilities = this.getFacilities();
    el.textContent = facilities
      .filter(function (f) {
        return f.name && f.name.trim();
      })
      .map(function (f) {
        return '#' + f.name.trim();
      })
      .join(' ');
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new FacilityMapper();
    mapper.initialize();
    global.facilityMapperInstance = mapper;
  });

  global.FacilityMapper = FacilityMapper;
})(window);
