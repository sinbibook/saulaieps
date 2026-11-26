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

  function DirectionsMapper() {
    BaseDataMapper.call(this);
  }
  DirectionsMapper.prototype = Object.create(BaseDataMapper.prototype);
  DirectionsMapper.prototype.constructor = DirectionsMapper;

  // Kakao Map 설정 상수
  DirectionsMapper.KAKAO_MAP_ZOOM_LEVEL = 5;
  DirectionsMapper.SDK_WAIT_INTERVAL = 100; // ms

  DirectionsMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapPropertyName();
    this.mapPropertyNameEn();
    this.mapAddress();
    this.mapNotice();
    this.mapDaumMap();
  };

  // customFields.pages.directions.sections[0]
  DirectionsMapper.prototype.getSection = function () {
    var pages = this.getPages();
    return (pages.directions && pages.directions.sections && pages.directions.sections[0]) || {};
  };

  // MAPPER: hero.images[isSelected][0].url → .sub_visual 배경
  DirectionsMapper.prototype.mapHero = function () {
    var hero = this.getSection().hero || {};
    setBackground(
      document.querySelector('[data-directions-hero-image]'),
      this.getFirstSelectedImage(hero.images || []),
      true
    );
  };

  // MAPPER: property.name → [data-property-name]
  DirectionsMapper.prototype.mapPropertyName = function () {
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
  };

  // MAPPER: property.nameEn → [data-property-name-en]
  DirectionsMapper.prototype.mapPropertyNameEn = function () {
    var nameEn = this.getPropertyNameEn();
    document.querySelectorAll('[data-property-name-en]').forEach(function (el) {
      el.textContent = nameEn;
    });
  };

  // MAPPER: property.address → [data-property-address] ("주소 : " 정적 + address)
  DirectionsMapper.prototype.mapAddress = function () {
    var address = this.getProperty().address || '';
    var el = document.querySelector('[data-property-address]');
    if (el) el.textContent = '주소 : ' + address;
  };

  // MAPPER: directions.sections[0].notice → [data-directions-notice-title] / [data-directions-notice-content]
  DirectionsMapper.prototype.mapNotice = function () {
    var section = this.getSection();
    var notice = section.notice || (section.notices && section.notices[0]) || {};

    var titleEl = document.querySelector('[data-directions-notice-title]');
    if (titleEl) titleEl.textContent = notice.title || '';

    var contentEl = document.querySelector('[data-directions-notice-content]');
    if (contentEl) contentEl.innerHTML = notice.description ? nl2br(notice.description) : '';
  };

  // MAPPER: property.latitude, property.longitude → 카카오 지도 + 마커
  DirectionsMapper.prototype.mapDaumMap = function () {
    var property = this.getProperty();
    if (!property.latitude || !property.longitude) return;

    var container = document.getElementById('kakao-map');
    if (!container) return;

    var createMap = function () {
      try {
        var options = {
          center: new kakao.maps.LatLng(property.latitude, property.longitude),
          level: DirectionsMapper.KAKAO_MAP_ZOOM_LEVEL,
          scrollwheel: false,
          draggable: false
        };
        var map = new kakao.maps.Map(container, options);
        var markerPosition = new kakao.maps.LatLng(property.latitude, property.longitude);
        var marker = new kakao.maps.Marker({ position: markerPosition });
        marker.setMap(map);
      } catch (error) {
        console.error('Failed to create Kakao Map:', error);
      }
    };

    // SDK 로드 확인 및 재시도
    var checkSdkAndLoad = function (retryCount) {
      retryCount = retryCount || 0;
      var MAX_RETRIES = 20; // 20 * 100ms = 2초
      if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
        window.kakao.maps.load(createMap);
      } else if (retryCount < MAX_RETRIES) {
        setTimeout(function () {
          checkSdkAndLoad(retryCount + 1);
        }, DirectionsMapper.SDK_WAIT_INTERVAL);
      } else {
        console.error('Failed to load Kakao Map SDK after multiple retries.');
      }
    };

    checkSdkAndLoad();
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new DirectionsMapper();
    mapper.initialize();
    global.directionsMapperInstance = mapper;
  });

  global.DirectionsMapper = DirectionsMapper;
})(window);
