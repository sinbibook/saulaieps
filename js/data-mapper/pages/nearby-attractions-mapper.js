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

  function NearbyAttractionsMapper() {
    BaseDataMapper.call(this);
  }
  NearbyAttractionsMapper.prototype = Object.create(BaseDataMapper.prototype);
  NearbyAttractionsMapper.prototype.constructor = NearbyAttractionsMapper;

  // customFields.pages.nearbyAttractions.sections[0]
  NearbyAttractionsMapper.prototype.getSection = function () {
    var pages = this.getPages();
    return (
      (pages.nearbyAttractions &&
        pages.nearbyAttractions.sections &&
        pages.nearbyAttractions.sections[0]) ||
      null
    );
  };

  NearbyAttractionsMapper.prototype.mapPage = function () {
    var section = this.getSection();
    // enabled=false(또는 섹션 없음) → 404 리다이렉트 (layout-map과 동일)
    if (!section || section.enabled === false) {
      window.location.href = '404.html';
      return;
    }

    this.mapHero(section);
    this.mapPropertyName();
    this.mapPropertyNameEn();
    this.mapAttractionsList(section);
  };

  // MAPPER: hero.images[isSelected][0].url → .sub_visual 배경
  NearbyAttractionsMapper.prototype.mapHero = function (section) {
    var hero = section.hero || {};
    setBackground(
      document.querySelector('[data-nearby-hero-image]'),
      this.getFirstSelectedImage(hero.images || []),
      true
    );
  };

  // MAPPER: property.name → [data-property-name]
  NearbyAttractionsMapper.prototype.mapPropertyName = function () {
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
  };

  // MAPPER: property.nameEn → [data-property-name-en]
  NearbyAttractionsMapper.prototype.mapPropertyNameEn = function () {
    var nameEn = this.getPropertyNameEn();
    document.querySelectorAll('[data-property-name-en]').forEach(function (el) {
      el.textContent = nameEn;
    });
  };

  // MAPPER: about[] → [data-nearby-attractions-list] (li 동적 생성)
  // li 내부: img=images[isSelected][0].url, strong=title, p=description, em=image.description
  NearbyAttractionsMapper.prototype.mapAttractionsList = function (section) {
    var about = section.about || [];
    var ul = document.querySelector('[data-nearby-attractions-list]');
    if (!ul) return;

    ul.innerHTML = '';
    var self = this;
    about.forEach(function (item) {
      var images = self.getSelectedImages(item.images || []);
      var img0 = images[0];

      var li = document.createElement('li');

      var img = document.createElement('img');
      if (img0 && img0.url) {
        img.src = img0.url;
      } else {
        ImageHelpers.applyPlaceholder(img);
      }
      img.alt = item.title || '';

      var strong = document.createElement('strong');
      strong.textContent = item.title || '';

      var p = document.createElement('p');
      p.innerHTML = nl2br(item.description || '');
      // em은 항상 생성. image description 없으면 매핑 위치 안내 라벨 표시
      var em = document.createElement('em');
      em.textContent = img0 && img0.description ? '→ ' + img0.description : '이미지1 이미지설명';
      p.appendChild(em);

      li.appendChild(img);
      li.appendChild(strong);
      li.appendChild(p);
      ul.appendChild(li);
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new NearbyAttractionsMapper();
    mapper.initialize();
    global.nearbyAttractionsMapperInstance = mapper;
  });

  global.NearbyAttractionsMapper = NearbyAttractionsMapper;
})(window);
