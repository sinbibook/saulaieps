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

  function ReservationMapper() {
    BaseDataMapper.call(this);
  }
  ReservationMapper.prototype = Object.create(BaseDataMapper.prototype);
  ReservationMapper.prototype.constructor = ReservationMapper;

  ReservationMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapPropertyName();
    this.mapPropertyNameEn();
    this.mapBookingUrl();
    this.mapAboutImages();
    this.mapCheckinInfo();
    this.mapUsageGuide();
    this.mapRefundPolicies();
  };

  // customFields.pages.reservation.sections[0]
  ReservationMapper.prototype.getSection = function () {
    var pages = this.getPages();
    return (pages.reservation && pages.reservation.sections && pages.reservation.sections[0]) || {};
  };

  // MAPPER: hero.images[isSelected][0].url → .sub_visual 배경
  ReservationMapper.prototype.mapHero = function () {
    var hero = this.getSection().hero || {};
    setBackground(
      document.querySelector('[data-reservation-hero-image]'),
      this.getFirstSelectedImage(hero.images || []),
      true
    );
  };

  // MAPPER: property.name → [data-property-name]
  ReservationMapper.prototype.mapPropertyName = function () {
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
  };

  // MAPPER: property.nameEn → [data-property-name-en]
  ReservationMapper.prototype.mapPropertyNameEn = function () {
    var nameEn = this.getPropertyNameEn();
    document.querySelectorAll('[data-property-name-en]').forEach(function (el) {
      el.textContent = nameEn;
    });
  };

  // MAPPER: property.realtimeBookingId → [data-booking-url] href 직접 주입
  ReservationMapper.prototype.mapBookingUrl = function () {
    var url = this.getBookingUrl();
    document.querySelectorAll('[data-booking-url]').forEach(function (el) {
      if (url && url !== '#!') {
        el.href = url;
        el.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: about.images[isSelected][0] → 정보 이미지, [1] → 환불 이미지
  ReservationMapper.prototype.mapAboutImages = function () {
    var about = this.getSection().about || {};
    var images = this.getSelectedImages(about.images || []);

    var infoEl = document.querySelector('[data-reservation-info-image]');
    if (infoEl) {
      if (images[0] && images[0].url) infoEl.src = images[0].url;
      else ImageHelpers.applyPlaceholder(infoEl);
    }

    var refundEl = document.querySelector('[data-reservation-refund-image]');
    if (refundEl) {
      if (images[1] && images[1].url) refundEl.src = images[1].url;
      else ImageHelpers.applyPlaceholder(refundEl);
    }
  };

  // MAPPER: property.checkInOutInfo → [data-reservation-checkin-info] ([입퇴실안내] 정적 + 내용 동적)
  ReservationMapper.prototype.mapCheckinInfo = function () {
    var el = document.querySelector('[data-reservation-checkin-info]');
    if (!el) return;
    var info = this.getProperty().checkInOutInfo || '';
    el.innerHTML = '[입퇴실안내]' + (info ? '<br />' + nl2br(info) : '');
  };

  // MAPPER: property.usageGuide → [data-reservation-usage-guide]
  ReservationMapper.prototype.mapUsageGuide = function () {
    var el = document.querySelector('[data-reservation-usage-guide]');
    if (!el) return;
    var guide = this.getProperty().usageGuide || '';
    el.innerHTML = guide ? nl2br(guide) : '';
  };

  // MAPPER: property.refundPolicies → [data-reservation-refund-policies] (동적 생성)
  // 형식: "* 이용일 {days}일 이전 취소시 {rate}% 환불" (당일은 "* 당일 취소시 {rate}% 환불")
  ReservationMapper.prototype.mapRefundPolicies = function () {
    var el = document.querySelector('[data-reservation-refund-policies]');
    if (!el) return;
    var policies = this.getProperty().refundPolicies || [];
    if (!policies.length) {
      el.innerHTML = '';
      return;
    }
    var lines = policies.map(function (p) {
      var days = p.refundProcessingDays;
      var rate = p.refundRate;
      var when = days > 0 ? '이용일 ' + days + '일 이전 취소시' : '당일 취소시';
      return '* ' + when + ' ' + rate + '% 환불';
    });
    el.innerHTML = lines.join('<br />');
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new ReservationMapper();
    mapper.initialize();
    global.reservationMapperInstance = mapper;
  });

  global.ReservationMapper = ReservationMapper;
})(window);
