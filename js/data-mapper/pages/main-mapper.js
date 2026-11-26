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

  // 배경 이미지 적용 (url 있으면 배경, 없으면 No-Image placeholder)
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

  function MainMapper() {
    BaseDataMapper.call(this);
  }
  MainMapper.prototype = Object.create(BaseDataMapper.prototype);
  MainMapper.prototype.constructor = MainMapper;

  MainMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapPropertyName();
    this.mapPropertyNameEn();
    this.mapHeroText();
    this.mapHeroImages();
    this.mapAboutBanner();
    this.mapClosingBanner();

    // 동적 슬라이드 주입 후 Swiper 재초기화
    if (typeof window.initMainSwipers === 'function') window.initMainSwipers();
  };

  // customFields.pages.main.sections[0]
  MainMapper.prototype.getMainSection = function () {
    var pages = this.getPages();
    return (pages.main && pages.main.sections && pages.main.sections[0]) || {};
  };

  // customFields.pages.index.sections[0] (closing 배너용)
  MainMapper.prototype.getIndexSection = function () {
    var pages = this.getPages();
    return (pages.index && pages.index.sections && pages.index.sections[0]) || {};
  };

  // hero.images 하나에 두 영역이 들어온다 (크롤러 규약).
  //   마커 없음            → 히어로 슬라이더 (원본 view.html)
  //   description:'about_img' → 글 아래 3칸 줄 (원본 about.html)
  // 배열 위치로 나누지 않는 이유: 어드민이 이미지 배열을 화면 상태로 재조립하면서
  // 순서를 바꾼다. description 은 보존된다.
  var ABOUT_IMG_MARK = 'about_img';

  function isAboutImg(img) {
    return !!img && img.description === ABOUT_IMG_MARK;
  }

  MainMapper.prototype.pickAboutImg = function (images) {
    return (images || []).filter(isAboutImg);
  };

  MainMapper.prototype.excludeAboutImg = function (images) {
    return (images || []).filter(function (img) {
      return !isAboutImg(img);
    });
  };

  // MAPPER: pages.main.sections[0].hero.images[isSelected] → 히어로 슬라이더
  //
  // 원본은 펜션소개(about)와 외부풍경(view) 두 페이지고, 히어로 슬라이더는 view.html 것이다.
  // 두 페이지를 main 하나로 합치면서 글은 about, 히어로 슬라이더는 view 를 쓴다.
  // 단일 배경(.sub_visual)이 아니라 room.html 과 같은 .sub_wide_visual 슬라이더다.
  // (구버전 마크업 호환: [data-main-hero-bg] 가 남아 있으면 첫 장을 배경으로 준다)
  MainMapper.prototype.mapHero = function () {
    var hero = this.getMainSection().hero || {};
    var images = this.excludeAboutImg(this.getSelectedImages(hero.images || []));

    var legacyBg = document.querySelector('[data-main-hero-bg]');
    if (legacyBg) setBackground(legacyBg, this.getFirstSelectedImage(hero.images || []), true);

    var wrapper = document.querySelector('[data-main-hero-slides]');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    if (!images.length) {
      var ph = document.createElement('div');
      ph.className = 'swiper-slide';
      ImageHelpers.applyBackgroundPlaceholder(ph);
      wrapper.appendChild(ph);
      return;
    }

    images.forEach(function (image) {
      var div = document.createElement('div');
      div.className = 'swiper-slide';
      setBackground(div, image.url, true);
      wrapper.appendChild(div);
    });
  };

  // MAPPER: property.name → [data-property-name]
  MainMapper.prototype.mapPropertyName = function () {
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
  };

  // MAPPER: property.nameEn → [data-property-name-en]
  MainMapper.prototype.mapPropertyNameEn = function () {
    var nameEn = this.getPropertyNameEn();
    document.querySelectorAll('[data-property-name-en]').forEach(function (el) {
      el.textContent = nameEn;
    });
  };

  // MAPPER: 소개 섹션(hero).title → [data-main-hero-title],
  //         hero.description → [data-main-hero-description]
  MainMapper.prototype.mapHeroText = function () {
    var hero = this.getMainSection().hero || {};
    var titleEl = document.querySelector('[data-main-hero-title]');
    if (titleEl) titleEl.textContent = hero.title || '';
    var descEl = document.querySelector('[data-main-hero-description]');
    if (descEl) descEl.innerHTML = hero.description ? nl2br(hero.description) : '';
  };

  // MAPPER: 소개 섹션(hero).images[isSelected] → [data-main-hero-images] (li>img 동적 생성)
  //
  // 원본 2페이지(about=펜션소개 글, view=외경 히어로)를 main 하나로 합친 자리다.
  // 글은 about.html, 이 이미지들은 view.html 히어로 슬라이더(원본 9장)에서 온다.
  // 원본이 3장이 아니므로 개수를 자르지 않는다.
  MainMapper.prototype.mapHeroImages = function () {
    var hero = this.getMainSection().hero || {};
    var ul = document.querySelector('[data-main-hero-images]');
    if (!ul) return;

    // 마커가 붙은 것만 쓴다. 없으면(마커 이전 데이터) 종전처럼 앞에서부터 채운다
    var all = this.getSelectedImages(hero.images || []);
    var marked = this.pickAboutImg(all);
    var images = marked.length ? marked : all;
    ul.innerHTML = '';

    if (!images.length) {
      var liPh = document.createElement('li');
      var imgPh = document.createElement('img');
      ImageHelpers.applyPlaceholder(imgPh);
      liPh.appendChild(imgPh);
      ul.appendChild(liPh);
      return;
    }

    images.forEach(function (imgData) {
      var li = document.createElement('li');
      var img = document.createElement('img');
      if (imgData.url) {
        img.src = imgData.url;
      } else {
        ImageHelpers.applyPlaceholder(img);
      }
      img.alt = '';
      li.appendChild(img);
      ul.appendChild(li);
    });
  };

  // MAPPER: main.about[0..] → [data-main-about-bnr] 교차 배너 (블록당 li 1개, 좌 img+txt / 우 txt+img)
  // 위쪽 title/description/about_img 는 hero 를 쓰므로 about 은 블록 영역 전용이다 (about[0]부터 순회).
  // li 내부: strong = about[i].title, p = about[i].description
  MainMapper.prototype.mapAboutBanner = function () {
    var ul = document.querySelector('[data-main-about-bnr]');
    if (!ul) return;

    var blocks = this.getMainSection().about || [];
    var self = this;

    // 소개 블록이 없으면 매핑 위치를 알 수 있도록 라벨 li 1개를 남긴다
    if (!blocks.length) {
      blocks = [{ title: '소개섹션1 타이틀', description: '소개섹션1 설명', images: [] }];
    }

    ul.innerHTML = '';
    blocks.forEach(function (block, index) {
      var li = document.createElement('li');

      var imgDiv = document.createElement('div');
      imgDiv.className = 'img';
      setBackground(imgDiv, self.getFirstSelectedImage(block.images || []), true);

      var txtDiv = document.createElement('div');
      txtDiv.className = 'txt';
      var inner = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = block.title || '';
      var p = document.createElement('p');
      p.innerHTML = block.description ? nl2br(block.description) : '';
      inner.appendChild(strong);
      inner.appendChild(p);
      txtDiv.appendChild(inner);

      // 교차: 짝수 index → img 먼저, 홀수 index → txt 먼저
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

  // MAPPER: index.sections[0].closing → 와이드 배너 (배경 images[isSelected][0].url, title, description)
  // main에는 closing이 없어 index의 closing 데이터를 사용
  MainMapper.prototype.mapClosingBanner = function () {
    var closing = this.getIndexSection().closing || {};
    // .about_wide_bnr는 CSS에서 repeat/position/size(cover) 처리 → background-image만 주입
    setBackground(
      document.querySelector('[data-main-closing-bg]'),
      this.getFirstSelectedImage(closing.images || []),
      false
    );
    // 값이 없으면 기본 문구로 fallback
    var titleEl = document.querySelector('[data-main-closing-title]');
    if (titleEl) {
      titleEl.textContent =
        closing.title && closing.title.trim() ? closing.title : 'Welcome To Pension';
    }
    var descEl = document.querySelector('[data-main-closing-description]');
    if (descEl) {
      descEl.textContent =
        closing.description && closing.description.trim()
          ? closing.description
          : '잊지 못할 추억을 선물합니다.';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new MainMapper();
    mapper.initialize();
    global.mainMapperInstance = mapper;
  });

  global.MainMapper = MainMapper;
})(window);
