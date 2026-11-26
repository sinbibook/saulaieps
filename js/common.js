$(function () {
  // 헤더 inject 완료 후 실행 (프록시 페이지는 loaderReady 없이 즉시 실행)
  (window.loaderReady || Promise.resolve()).then(function () {
    // 상단 lnb 배경 높이 (동적 메뉴 길이에 맞춰 늘이고, 최대 높이 초과 시 depth_box 스크롤)
    function updateLnbBg() {
      if ($('.hd_lnb').css('display') !== 'block') return;
      var contentH = 0;
      $('.depth_box').each(function () {
        if (contentH < this.scrollHeight) contentH = this.scrollHeight;
      });
      var cap = Math.max(200, $(window).height() - 140);
      $('.hd_lnb_bg').css({ height: Math.min(contentH, cap) + 40 });
    }

    // 상단 여백
    if ($(window).width() < 1024) {
      $('#container').css({ 'padding-top': $('#header .hd_cont').outerHeight() });
    }

    // aside on/off (event delegation)
    $(document).on('click', '.btn_menu, .btn_close', function () {
      if ($('.aside').hasClass('on')) {
        $('.aside').removeClass('on');
        $('html, body').css({ height: 'inherit', overflow: 'inherit' });
      } else {
        $('.aside').addClass('on');
        $('html, body').css({ height: '100%', overflow: 'hidden' });
      }
    });

    // aside 아코디언 (event delegation)
    $(document).on('click', '.aside .depth1', function () {
      $('.depth_list').not($(this).next()).slideUp();
      $(this).next().slideToggle();
    });

    // 상단 lnb 배경 높이 초기 계산
    updateLnbBg();

    // 헤더 hover (PC)
    if ($(window).width() > 1024) {
      $('#header').hover(
        function () {
          updateLnbBg();
          $(this).addClass('on');
        },
        function () {
          $(this).removeClass('on');
        }
      );
    }

    // resize
    $(window).on('resize', function () {
      if ($(window).width() < 1024) {
        $('#container').css({ 'padding-top': $('#header .hd_cont').outerHeight() });
      } else {
        $('#container').css({ 'padding-top': '0' });
      }

      updateLnbBg();

      if ($(window).width() > 1024) {
        $('#header').hover(
          function () {
            $(this).addClass('on');
          },
          function () {
            $(this).removeClass('on');
          }
        );
      } else {
        $('#header').removeClass('on');
      }
    });
  });

  // 페이지별 초기화 (헤더 불필요)

  // 비주얼 scroll
  var visual_h = $('.visual').height();
  function swing() {
    $('.scroll_down').animate({ bottom: '50px' }, 900).animate({ bottom: '60px' }, 900, swing);
  }
  swing();
  $('.scroll_down').on('click', function (e) {
    e.preventDefault();
    $('html, body').animate({ scrollTop: visual_h }, 600);
  });

  // 슬라이더 생성 헬퍼: 기존 인스턴스가 있으면 파괴 후 재생성 (동적 슬라이드 주입 대응)
  function makeSwiper(selector, options) {
    var el = document.querySelector(selector);
    if (!el) return null;
    if (el.swiper) el.swiper.destroy(true, true);
    return new Swiper(selector, options);
  }

  // 슬라이드 개수 (loop 복제본은 제외 — 재초기화 시 개수가 부풀지 않도록)
  function slideCount(selector) {
    var el = document.querySelector(selector);
    if (!el) return 0;
    return el.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)').length;
  }

  // 슬라이드 개수가 max보다 적으면 그 개수를 slidesPerView 로 (최소 1)
  function perView(count, max) {
    return Math.max(1, Math.min(count || max, max));
  }

  // 메인/콘텐츠 슬라이더 초기화 (index 등 동적 매핑 페이지에서 슬라이드 주입 후 재호출)
  window.initMainSwipers = function () {
    // 메인 비주얼 sld
    makeSwiper('.visual .swiper-container', {
      loop: slideCount('.visual .swiper-container') > 1,
      paginationClickable: true,
      spaceBetween: 0,
      navigation: {
        nextEl: '.visual .swiper-button-next',
        prevEl: '.visual .swiper-button-prev'
      },
      effect: 'fade',
      fadeEffect: { crossFade: true },
      autoplay: { delay: 4000, disableOnInteraction: false }
    });

    // preview sld
    // 객실 수가 보이는 칸 수보다 적으면 그만큼만 노출 (남는 칸에 빈 여백이 생기지 않도록)
    // 화살표는 원본(saulaieps.kr)처럼 항상 노출한다.
    // Swiper 는 슬라이드가 화면에 다 들어가면 화살표에 .swiper-button-lock(display:none)을
    // 붙이므로 watchOverflow 를 끄고, loop 로 언제 눌러도 넘어가게 한다.
    var roomCount = slideCount('.room_list .swiper-container');

    // 1개일 땐 슬라이더 없이 원+텍스트 가로 배치 단독 카드로 노출 (.is-single)
    var roomList = document.querySelector('.room_list');
    if (roomList) roomList.classList.toggle('is-single', roomCount === 1);

    if (roomCount === 1) {
      var roomContainer = document.querySelector('.room_list .swiper-container');
      if (roomContainer && roomContainer.swiper) roomContainer.swiper.destroy(true, true);
    } else {
      makeSwiper('.room_list .swiper-container', {
        loop: roomCount > 1,
        loopedSlides: roomCount,
        watchOverflow: false,
        slidesPerView: perView(roomCount, 4),
        spaceBetween: 0,
        navigation: {
          nextEl: '.main_room .swiper-button-next',
          prevEl: '.main_room .swiper-button-prev'
        },
        paginationClickable: true,
        grabCursor: true,
        breakpoints: {
          280: { slidesPerView: perView(roomCount, 2), spaceBetween: 15 },
          641: { slidesPerView: perView(roomCount, 3), spaceBetween: 15 },
          1180: { slidesPerView: perView(roomCount, 4), spaceBetween: 20 },
          1201: { slidesPerView: perView(roomCount, 4), spaceBetween: 0 }
        }
      });
    }

    // 메인 special sld
    // 한 화면 최대 2칸(≤1250) / 3칸(1251~). 시설이 그보다 적으면 그 개수만큼 — 남는 칸에 빈 여백이 생기지 않도록
    var facilityCount = slideCount('.special_list .swiper-container');
    makeSwiper('.special_list .swiper-container', {
      loop: facilityCount > 3,
      paginationClickable: true,
      slidesPerView: perView(facilityCount, 2),
      spaceBetween: 0,
      navigation: {
        nextEl: '.special_list .swiper-button-next',
        prevEl: '.special_list .swiper-button-prev'
      },
      breakpoints: {
        861: { slidesPerView: perView(facilityCount, 2), spaceBetween: 0 },
        1251: { slidesPerView: perView(facilityCount, 3), spaceBetween: 0 }
      }
    });
  };

  window.initMainSwipers();

  // 서브 이미지 sld (서브 페이지)
  makeSwiper('.sub_img_sld .swiper-container', {
    loop: true,
    paginationClickable: true,
    spaceBetween: 0,
    navigation: {
      nextEl: '.sub_img_sld .swiper-button-next',
      prevEl: '.sub_img_sld .swiper-button-prev'
    },
    autoplay: { delay: 4000, disableOnInteraction: false }
  });

  // top btn
  $('.btn_top').on('click', function (e) {
    e.preventDefault();
    $('html, body')
      .stop()
      .animate({ scrollTop: $('body').offset().top }, 300);
  });
});
