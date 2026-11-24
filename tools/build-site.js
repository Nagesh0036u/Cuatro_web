'use strict';

/**
 * Generates the Cuatro Tech Solutions pages from the Ostech template structure.
 * - Markup, class names, vendor scripts and CSS are the original template's, so the visual design is unchanged.
 * - Run with:  npm run build:site
 * - Original, untouched template pages are kept in /_template_reference for comparison.
 */

const fs = require('fs');
const path = require('path');
const { company, reasons, steps, services, faqs } = require('./site-content');

const ROOT = path.resolve(__dirname, '..');
const LOGO = 'assets/images/brand/cuatro-logo.png';
const ICON = 'assets/images/brand/cuatro-icon.png';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ------------------------------------------------------------------------------------------------
// shared chrome
// ------------------------------------------------------------------------------------------------
function head({ title, desc, p, noindex }) {
  return `<!DOCTYPE html>
<!-- language -->
<html lang="en">

<head>
    <!-- ========== Meta Tags ========== -->
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="${company.name}">
    <meta name="description" content="${esc(desc)}">${noindex ? '\n    <meta name="robots" content="noindex, nofollow">' : ''}

    <!-- ======== Page title ============ -->
    <title>${esc(title)} || ${company.name}</title>

    <!-- ========== Favicon Icon ========== -->
    <link rel="shortcut icon" href="${p}${ICON}" type="image/png">
    <link rel="apple-touch-icon" sizes="180x180" href="${p}${ICON}">
    <link rel="icon" type="image/png" sizes="32x32" href="${p}${ICON}">
    <link rel="icon" type="image/png" sizes="16x16" href="${p}${ICON}">

    <!-- fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com/">
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&amp;display=swap" rel="stylesheet">
    <!-- ===========  All Stylesheet ================= -->
    <link rel="stylesheet" href="${p}assets/vendors/bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet" href="${p}assets/vendors/bootstrap-select/bootstrap-select.min.css">
    <link rel="stylesheet" href="${p}assets/vendors/animate/animate.min.css">
    <link rel="stylesheet" href="${p}assets/vendors/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="${p}assets/vendors/jquery-ui/jquery-ui.css">
    <link rel="stylesheet" href="${p}assets/vendors/jarallax/jarallax.css">
    <link rel="stylesheet" href="${p}assets/vendors/jquery-magnific-popup/jquery.magnific-popup.css">
    <link rel="stylesheet" href="${p}assets/vendors/nouislider/nouislider.min.css">
    <link rel="stylesheet" href="${p}assets/vendors/nouislider/nouislider.pips.css">
    <link rel="stylesheet" href="${p}assets/vendors/ostech-icons/style.css">
    <link rel="stylesheet" href="${p}assets/vendors/owl-carousel/css/owl.carousel.min.css">
    <link rel="stylesheet" href="${p}assets/vendors/owl-carousel/css/owl.theme.default.min.css">

    <!-- template styles -->
    <link rel="stylesheet" href="${p}assets/css/ostech.css">
    <!-- Cuatro additions (careers, portals, forms). Uses the template's design tokens. -->
    <link rel="stylesheet" href="${p}assets/css/cuatro.css">
</head>
`;
}

function navMenu(p) {
  return `<ul class="main-menu__list">
                            <li><a href="${p}index.html">Home</a></li>
                            <li><a href="${p}about.html">About</a></li>
                            <li class="dropdown">
                                <a href="${p}services.html">Services</a>
                                <ul class="sub-menu">
                                    <li><a href="${p}services.html">All Services</a></li>
${services.map((s) => `                                    <li><a href="${p}${s.slug}">${s.title}</a></li>`).join('\n')}
                                </ul>
                            </li>
                            <li class="dropdown">
                                <a href="${p}careers.html">Careers at Cuatro</a>
                                <ul class="sub-menu">
                                    <li><a href="${p}careers.html">Open Positions</a></li>
                                    <li><a href="${p}student-portal/login">Student Login</a></li>
                                    <li><a href="${p}student-portal/register">Student Registration</a></li>
                                </ul>
                            </li>
                            <li><a href="${p}faq.html">FAQ</a></li>
                            <li><a href="${p}contact.html">Contact</a></li>
                        </ul>`;
}

function header(p) {
  return `        <header class="main-header main-header--one sticky-header sticky-header--normal">
            <div class="container-fluid">
                <div class="main-header__inner">
                    <div class="main-header__logo logo-ostech">
                        <a href="${p}index.html">
                            <img src="${p}${LOGO}" alt="${company.name}" width="140">
                        </a>
                    </div>

                    <nav class="main-header__nav main-menu">
                        ${navMenu(p)}
                    </nav>
                    <div class="main-header__right">
                        <a href="tel:${company.tel1}" class="main-header__right__call">
                            <div class="main-header__right__icon">
                                <i class="icon-call"></i>
                            </div>
                            <div class="main-header__right__content">
                                <span class="main-header__right__text">Call to Anytime</span>
                                <h6 class="main-header__right__number">${company.phone1}</h6>
                            </div>
                        </a>
                        <div class="main-header__right__info">
                            <a href="#" class="search-toggler main-header__right__info__item"><i class="icon-search" aria-hidden="true"></i><span class="sr-only">Search jobs</span></a>
                            <a href="${p}student-portal/dashboard" class="main-header__right__info__item"><i class="fas fa-user" aria-hidden="true"></i><span class="sr-only">Student Portal</span></a>
                        </div>
                        <div class="mobile-nav__btn mobile-nav__toggler">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
`;
}

function footer(p) {
  return `        <footer class="main-footer">

            <div class="main-footer__top">
                <div class="container">
                    <div class="main-footer__top__inner">
                        <div class="main-footer__top__logo">
                            <a href="${p}index.html" class="footer__logo ostech-logo">
                                <img src="${p}${LOGO}" width="125" alt="${company.name}">
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="main-footer__middle">
                <div class="container">
                    <div class="row">
                        <div class="col-md-6 col-xl-4">
                            <div class="footer-widget footer-widget--about">
                                <h2 class="footer-widget__title">about</h2>
                                <p class="footer-widget__text">${company.tagline}<br> A technology and business solutions company bringing together people, data and digital innovation.</p>
                            </div>
                        </div>
                        <div class="col-md-6 col-xl-2">
                            <div class="footer-widget footer-widget--links">
                                <h2 class="footer-widget__title">Links</h2>
                                <ul class="list-unstyled footer-widget__links">
                                    <li class="footer-widget__links__item"><a href="${p}about.html">About Us</a></li>
                                    <li class="footer-widget__links__item"><a href="${p}careers.html">Careers at Cuatro</a></li>
                                    <li class="footer-widget__links__item"><a href="${p}student-portal/login">Student Portal</a></li>
                                    <li class="footer-widget__links__item"><a href="${p}faq.html">FAQ</a></li>
                                    <li class="footer-widget__links__item"><a href="${p}contact.html">Contact</a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-6 col-xl-3">
                            <div class="footer-widget footer-widget--links">
                                <h2 class="footer-widget__title">Services</h2>
                                <ul class="list-unstyled footer-widget__links">
${services.map((s) => `                                    <li class="footer-widget__links__item"><a href="${p}${s.slug}">${s.title}</a></li>`).join('\n')}
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-6 col-xl-3">
                            <div class="footer-widget footer-widget--contact">
                                <h2 class="footer-widget__title">contact</h2>
                                <ul class="list-unstyled footer-widget__contact">
                                    <li class="footer-widget__contact__item">
                                        <div class="footer-widget__contact__icon">
                                            <i class="icon-call"></i>
                                        </div>
                                        <div class="footer-widget__contact__inner">
                                            <a href="tel:${company.tel1}" class="footer-widget__contact__text">${company.phone1}</a>
                                            <a href="tel:${company.tel2}" class="footer-widget__contact__text">${company.phone2}</a>
                                        </div>
                                    </li>
                                    <li class="footer-widget__contact__item">
                                        <div class="footer-widget__contact__icon">
                                            <i class="icon-Earth"></i>
                                        </div>
                                        <div class="footer-widget__contact__inner">
                                            <a href="mailto:${company.email}" class="footer-widget__contact__text">${company.email}</a>
                                            <a href="${company.url}" class="footer-widget__contact__text">${company.website}</a>
                                        </div>
                                    </li>
                                </ul>
                                <div class="footer-widget__thumb">
                                    <img src="${p}assets/images/resources/footer-1-1.png" alt="${company.name}">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="main-footer__bottom">
                <div class="container">
                    <div class="main-footer__bottom__inner">
                        <p class="main-footer__copyright"> &copy; Copyright <span class="dynamic-year"></span> by ${company.name}. All rights reserved.</p>
                    </div>
                </div>
            </div>
            <div class="main-footer__shape">
                <img src="${p}assets/images/shapes/footer-shape.png" alt>
            </div>
            <div class="main-footer__earth">
                <img src="${p}assets/images/shapes/earth-footer.png" alt>
            </div>
        </footer>

    </div>
`;
}

function tail(p, scripts) {
  return `
    <div class="mobile-nav__wrapper">
        <div class="mobile-nav__overlay mobile-nav__toggler"></div>
        <!-- /.mobile-nav__overlay -->
        <div class="mobile-nav__content">
            <span class="mobile-nav__close mobile-nav__toggler"><i class="fa fa-times"></i></span>

            <div class="logo-box">
                <a href="${p}index.html" aria-label="logo image">
                    <img src="${p}${LOGO}" width="161" alt="${company.name}">
                </a>
            </div>
            <!-- /.logo-box -->
            <div class="mobile-nav__container"></div>
            <!-- /.mobile-nav__container -->

            <ul class="mobile-nav__contact list-unstyled">
                <li>
                    <i class="fa fa-envelope"></i>
                    <a href="mailto:${company.email}">${company.email}</a>
                </li>
                <li>
                    <i class="fa fa-phone-alt"></i>
                    <a href="tel:${company.tel1}">${company.phone1}</a>
                </li>
                <li>
                    <i class="fa fa-phone-alt"></i>
                    <a href="tel:${company.tel2}">${company.phone2}</a>
                </li>
            </ul><!-- /.mobile-nav__contact -->
        </div>
        <!-- /.mobile-nav__content -->
    </div>
    <!-- /.mobile-nav__wrapper -->
    <div class="search-popup">
        <div class="search-popup__overlay search-toggler"></div>
        <div class="search-popup__content">
            <form role="search" method="get" class="search-popup__form" action="${p}careers.html">
                <input type="text" id="search" name="keyword" placeholder="Search jobs at Cuatro...">
                <button type="submit" aria-label="search submit" class="ostech-btn">
                    <span><i class="icon-search"></i></span>
                </button>
            </form>
        </div>
    </div>

    <a href="#" data-target="html" class="scroll-to-target scroll-to-top">
        <span class="scroll-to-top__text">back top</span>
        <span class="scroll-to-top__wrapper"><span class="scroll-to-top__inner"></span></span>
    </a>

    <!--  ALl JS Plugins ===================== -->
    <script src="${p}assets/vendors/jquery/jquery-3.7.0.min.js"></script>
    <script src="${p}assets/vendors/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="${p}assets/vendors/bootstrap-select/bootstrap-select.min.js"></script>
    <script src="${p}assets/vendors/jarallax/jarallax.min.js"></script>
    <script src="${p}assets/vendors/jquery-ui/jquery-ui.js"></script>
    <script src="${p}assets/vendors/jquery-ajaxchimp/jquery.ajaxchimp.min.js"></script>
    <script src="${p}assets/vendors/jquery-appear/jquery.appear.min.js"></script>
    <script src="${p}assets/vendors/jquery-circle-progress/jquery.circle-progress.min.js"></script>
    <script src="${p}assets/vendors/jquery-magnific-popup/jquery.magnific-popup.min.js"></script>
    <script src="${p}assets/vendors/jquery-validate/jquery.validate.min.js"></script>
    <script src="${p}assets/vendors/nouislider/nouislider.min.js"></script>
    <script src="${p}assets/vendors/wnumb/wNumb.min.js"></script>
    <script src="${p}assets/vendors/owl-carousel/js/owl.carousel.min.js"></script>
    <script src="${p}assets/vendors/wow/wow.js"></script>
    <script src="${p}assets/vendors/imagesloaded/imagesloaded.min.js"></script>
    <script src="${p}assets/vendors/isotope/isotope.js"></script>
    <script src="${p}assets/vendors/jquery-circleType/jquery.circleType.js"></script>
    <script src="${p}assets/vendors/jquery-lettering/jquery.lettering.min.js"></script>
    <!-- template js -->
    <script src="${p}assets/js/ostech.js"></script>
    <!-- Cuatro js -->
    <script src="${p}assets/js/cuatro-core.js"></script>
${scripts.map((s) => `    <script src="${p}assets/js/${s}"></script>`).join('\n')}
</body>

</html>
`;
}

const BANNERS = { "About us": "about", Services: "services", "HR Services": "hr", "Database Management": "database", "Digital Marketing": "marketing", "UI/UX Design": "uiux", "Product Development": "product", "Careers at Cuatro": "careers", "Job Details": "job", Contact: "contact", "our faqs": "faq" };
function bannerFor(title, crumbs) {
  if (BANNERS[title]) return `assets/images/backgrounds/banners/banner-${BANNERS[title]}.jpg`;
  const first = crumbs[0] && crumbs[0].label;
  if (first === "Student Portal") return "assets/images/backgrounds/banners/banner-student.jpg";
  if (first === "Admin Portal") return "assets/images/backgrounds/banners/banner-admin.jpg";
  return "assets/images/backgrounds/page-header-bg-1-1.jpg";
}

function pageHeader(title, crumbs, p) {
  return `        <section class="page-header">
            <div class="page-header__bg" style="background-image: url(${p}${bannerFor(title, crumbs)});"></div>
            <div class="container">
                <h2 class="page-header__title">${title}</h2>
                <ul class="ostech-breadcrumb list-unstyled">
                    <li><a href="${p}index.html">Home</a></li>
${crumbs.map((c) => (c.href ? `                    <li><a href="${c.href}">${c.label}</a></li>` : `                    <li><span>${c.label}</span></li>`)).join('\n')}
                </ul>
            </div>
        </section>
`;
}

function page({ file, title, desc, body, p = '', scripts = [], dataPage = '', noindex = false, cursor = true }) {
  const html = `${head({ title, desc: desc || company.tagline, p, noindex })}
<body class="${cursor ? 'custom-cursor' : ''}"${dataPage ? ` data-page="${dataPage}"` : ''}>
${cursor ? `
    <!-- Custom Cursor -->
    <div class="custom-cursor__cursor"></div>
    <div class="custom-cursor__cursor-two"></div>
` : ''}
    <!-- Preloader Start-->
    <div class="preloader">
        <div class="preloader__image" style="background-image: url(${p}${ICON});"></div>
    </div>
    <!-- Preloader End-->

    <div class="page-wrapper">
${header(p)}
${body}
${footer(p)}${tail(p, scripts)}`;
  const out = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

// ------------------------------------------------------------------------------------------------
// reusable fragments
// ------------------------------------------------------------------------------------------------
function secTitle(tagline, title, { center = false, two = false, p = '', delay = '000ms' } = {}) {
  return `<div class="sec-title${center ? ' text-center' : ''}${two ? ' sec-title--two' : ''} wow fadeInUp" data-wow-duration='1500ms' data-wow-delay='${delay}'>
                            <div class="d-flex align-items-center ${center ? 'justify-content-center' : 'justify-content-start'}">
                                <img src="${p}assets/images/shapes/sec-title-s-1.png" alt="${esc(tagline)}" class="sec-title__img">
                                <h6 class="sec-title__tagline">${tagline}</h6>
                            </div>
                            <h3 class="sec-title__title">${title}</h3>
                        </div>`;
}

function serviceCards(p, { cols = 'col-md-6 col-lg-4' } = {}) {
  return services.map((s, i) => `                    <div class="${cols}">
                        <div class="service-card-two  wow fadeInUp" data-wow-duration='1500ms' data-wow-delay='${500 + i * 200}ms'>
                            <div class="service-card-two__inner">
                                <div class="service-card-two__content">
                                    <h4 class="service-card-two__title"><a href="${p}${s.slug}">${s.short}</a></h4>
                                    <div class="service-card-two__icon">
                                        <i class="${s.icon}"></i>
                                    </div>
                                </div>
                                <div class="service-card-two__thumb">
                                    <img src="${p}assets/images/service/${s.cardImg}" alt="${s.title}">
                                </div>
                            </div>
                        </div>
                    </div>`).join('\n');
}

function cta(p) {
  return `        <section class="cta-two">
            <div class="container">
                <div class="row gutter-y-30">
                    <div class="col-lg-6">
                        <div class="cta-two__item wow fadeInUp" data-wow-delay="300ms">
                            <div class="cta-two__item__icon">
                                <i class="icon-team-2"></i>
                            </div>
                            <div class="cta-two__item__content">
                                <h3 class="cta-two__item__title">Explore Careers <br> at Cuatro</h3>
                                <a href="${p}careers.html" class="cta-two__item__btn ostech-btn">View Careers</a>
                            </div>
                            <div class="cta-two__item__shape">
                                <img src="${p}assets/images/shapes/cta-shape.png" alt="${company.name}">
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="cta-two__item wow fadeInUp" data-wow-delay="600ms">
                            <div class="cta-two__item__icon">
                                <i class="icon-quality-2"></i>
                            </div>
                            <div class="cta-two__item__content">
                                <h3 class="cta-two__item__title">Talk to Our <br> Team</h3>
                                <a href="${p}contact.html" class="cta-two__item__btn ostech-btn">Contact Us</a>
                            </div>
                            <div class="cta-two__item__shape">
                                <img src="${p}assets/images/shapes/cta-shape.png" alt="${company.name}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
}

function accordion(items, activeIndex = 1) {
  return `<div class="faq-page__accordion ostech-accrodion" data-grp-name="ostech-accrodion">
${items.map(([q, a], i) => `                            <div class="accrodion${i === activeIndex ? ' active' : ''}">
                                <div class="accrodion-title">
                                    <h4 class="accrodion-title__text">${esc(q)}<span class="accrodion-title__icon"></span></h4>
                                </div>
                                <div class="accrodion-content">
                                    <div class="inner">
                                        <p class="inner__text">${esc(a)}</p>
                                    </div>
                                </div>
                            </div>`).join('\n')}
                        </div>`;
}

// ------------------------------------------------------------------------------------------------
// public pages
// ------------------------------------------------------------------------------------------------
function buildHome() {
  const p = '';
  const slides = [
    ['slider-1-1.jpg', 'People, Data & Digital Innovation'],
    ['slider-1-2.jpg', 'Practical Solutions for Business Growth'],
    ['slider-1-3.jpg', 'Technology & Business Solutions Partner']
  ];
  const slider = slides.map(([img, title]) => `                <div class="item">
                    <div class="main-slider-one__item">
                        <div class="main-slider-one__bg" style="background-image: url(assets/images/backgrounds/${img});"></div>
                        <div class="container">
                            <div class="row">
                                <div class="col-12">
                                    <div class="main-slider-one__content">
                                        <h5 class="main-slider-one__sub-title"><span>Empowering Growth Through People, Data &amp; Digital Innovation</span></h5>
                                        <h2 class="main-slider-one__title">
                                            ${title}
                                            <span class="main-slider-one__title__overlay-group">
                                                <span class="main-slider-one__title__overlay"></span>
                                                <span class="main-slider-one__title__overlay"></span>
                                                <span class="main-slider-one__title__overlay"></span>
                                                <span class="main-slider-one__title__overlay"></span>
                                                <span class="main-slider-one__title__overlay"></span>
                                                <span class="main-slider-one__title__overlay"></span>
                                            </span>
                                        </h2>
                                        <div class="main-slider-one__link">
                                            <a href="services.html" class="main-slider-one__link__btn ostech-btn">Discover More</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="main-slider-one__shape main-slider-one__shape--one">
                            <img src="assets/images/shapes/slider-shape-1-1.png" alt>
                        </div>
                        <div class="main-slider-one__shape main-slider-one__shape--two">
                            <img src="assets/images/shapes/slider-shape-1-2.png" alt>
                        </div>
                    </div>
                </div>`).join('\n');

  const focus = [
    { s: services[0], img: 'service-2-1.png', icon: 'icon-team-2', label: 'People', text: 'Recruitment, HR operations and workforce support.' },
    { s: services[1], img: 'service-2-2.png', icon: 'icon-infrastructure-1', label: 'Data', text: 'Organised, secure and reliable data systems.' },
    { s: services[2], img: 'service-2-3.png', icon: 'icon-digital-marketing-1', label: 'Digital', text: 'Online visibility and audience reach.' }
  ];
  const focusCards = focus.map((f, i) => `                    <div class="col-lg-4 col-md-6">
                        <div class="service-one__item wow fadeInUp" data-wow-delay="${500 + i * 200}ms">
                            <div class="service-one__item__icon">
                                <i class="${f.icon}"></i>
                            </div>
                            <div class="service-one__item__thumb">
                                <img src="assets/images/service/${f.img}" alt="${f.s.title}">
                            </div>
                            <div class="service-one__item__content">
                                <h4 class="service-one__item__title"><a href="${f.s.slug}">${f.s.title}</a></h4>
                                <p class="service-one__item__text">${f.text}</p>
                            </div>
                        </div>
                    </div>`).join('\n');

  const body = `        <!-- main-slider-start -->
        <section class="main-slider-one">
            <div class="main-slider-one__carousel ostech-owl__carousel owl-carousel" data-owl-options='{
		"loop": true,
		"animateOut": "fadeOut",
		"animateIn": "fadeIn",
		"items": 1,
		"autoplay": true,
		"autoplayTimeout": 7000,
		"smartSpeed": 1000,
		"nav": false,
		"dots": true,
		"margin": 0
	    }'>
${slider}
            </div>
        </section>
        <!-- main-slider-end -->

        <!-- Focus section Start -->
        <section class="service-one">
            <div class="container">
                <div class="row gutter-y-40">
${focusCards}
                </div>
            </div>
        </section>

        <!-- About section Start -->
        <section class="about-one">
            <div class="container">
                <div class="row gutter-y-30">
                    <div class="col-lg-6">
                        <div class="about-one__left wow fadeInLeft" data-wow-delay="500ms">
                            <div class="about-one__thumb">
                                <div class="about-one__thumb__item">
                                    <img src="assets/images/about/about-1-1.png" alt="${company.name}">
                                </div>
                                <div class="about-one__thumb__item about-one__thumb__item--two">
                                    <img src="assets/images/about/about-1-2.png" alt="${company.name}">
                                </div>
                            </div>

                            <div class="about-one__funfact__item count-box">
                                <div class="about-one__funfact__item__icon">
                                    <i class="icon-project-management-1"></i>
                                </div>
                                <h2 class="about-one__funfact__item__count">
                                    <span class="count-text" data-stop="5" data-speed="1500"></span>
                                </h2>
                                <p class="about-one__funfact__item__text">Core services</p>
                            </div>

                            <div class="about-one__shape-two">
                                <img src="assets/images/shapes/about-shape-1-2.png" alt>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="about-one__right">
                            <div class="about-one__top wow fadeInUp" data-wow-delay="500ms">
                                ${secTitle('About Us', 'Practical Technology and Business Solutions')}
                                <p class="about-one__top__text">${company.intro[0]} ${company.intro[1]}</p>
                            </div>
                            <div class="about-one__feature">
                                <div class="about-one__feature__item wow fadeInUp" data-wow-delay="500ms">
                                    <div class="about-one__feature__inner">
                                        <div class="about-one__feature__item__icon">
                                            <div class="about-one__feature__item__icon__item">
                                                <i class="icon-solution-1"></i>
                                            </div>
                                        </div>
                                        <div class="about-one__feature__item__content">
                                            <h4 class="about-one__feature__item__title"><a href="about.html">Our Mission</a></h4>
                                            <p class="about-one__feature__item__text">Intelligent technology and practical solutions that drive growth.</p>
                                        </div>
                                        <div class="about-one__feature__item__thumb">
                                            <img src="assets/images/about/about-s-1-1.png" alt="Our Mission">
                                        </div>
                                    </div>
                                </div>
                                <div class="about-one__feature__item wow fadeInUp" data-wow-delay="500ms">
                                    <div class="about-one__feature__inner">
                                        <div class="about-one__feature__item__icon">
                                            <div class="about-one__feature__item__icon__item">
                                                <i class="icon-future-1"></i>
                                            </div>
                                        </div>
                                        <div class="about-one__feature__item__content">
                                            <h4 class="about-one__feature__item__title"><a href="about.html">Our Vision</a></h4>
                                            <p class="about-one__feature__item__text">A trusted digital transformation partner for businesses.</p>
                                        </div>
                                        <div class="about-one__feature__item__thumb">
                                            <img src="assets/images/about/about-s-1-2.png" alt="Our Vision">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <ul class="about-one__list list-unstyled wow fadeInUp" data-wow-delay="500ms">
                                <li class="about-one__list__item"><i class="fas fa-check-circle"></i>Integrity, innovation and collaboration</li>
                                <li class="about-one__list__item"><i class="fas fa-check-circle"></i>Customer commitment and excellence</li>
                                <li class="about-one__list__item"><i class="fas fa-check-circle"></i>Continuous improvement</li>
                            </ul>
                            <div class="about-one__link wow fadeInUp" data-wow-delay="500ms">
                                <a href="about.html" class="about-one__link__btn ostech-btn ostech-btn--secondary">Discover More</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="about-one__shape">
                <img src="assets/images/shapes/about-shape-1-1.png" alt>
            </div>
        </section>
        <!-- About section End -->

        <!-- Services section Start -->
        <section class="service-page service-page--page">
            <div class="service-page__bg" style="background-image: url(assets/images/shapes/service-2-1.png);"></div>
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        ${secTitle('Our Services', 'Five Services Built Around <br> Your Business Needs', { center: true, delay: '300ms' })}
                    </div>
                </div>
                <div class="row gutter-y-30 justify-content-center">
${serviceCards(p)}
                </div>
            </div>
        </section>
        <!-- Services section End -->

        <!-- why-choose-two section Start -->
        <section class="why-choose-two">
            <div class="why-choose-two__bg jarallax" data-jarallax data-speed="0.3" data-imgPosition="50% -100%" style="background-image: url(assets/images/backgrounds/why-choose-bg-1-1.png);"></div>
            <div class="container">
                <div class="row">
${[['icon-expertise-1', 5, 'Core <br> Services'], ['icon-verified-2', 19, 'Job <br> Categories'], ['icon-rating-2', 6, 'Company <br> Values'], ['icon-team-2', 6, 'Stages of <br> How We Work']].map(([icon, n, label], i) => `                    <div class="col-lg-3 col-md-6 col-sm-6">
                        <div class="why-choose-two__funfact__item count-box wow fadeInUp" data-wow-delay="${300 + i * 300}ms">
                            <div class="why-choose-two__funfact__item__icon">
                                <i class="${icon}"></i>
                            </div>
                            <h2 class="why-choose-two__funfact__item__count">
                                <span class="count-text" data-stop="${n}" data-speed="1500"></span>
                            </h2>
                            <p class="why-choose-two__funfact__item__text">${label}</p>
                            <div class="why-choose-two__funfact__item__shape">
                                <img src="assets/images/shapes/funfact-1-1.png" alt>
                            </div>
                        </div>
                    </div>`).join('\n')}
                </div>
                <div class="why-choose-two__inner">
                    <div class="row align-items-center">
                        <div class="col-lg-6">
                            <div class="why-choose-two__top__left">
                                ${secTitle('Why Choose Us', 'Why Choose Cuatro Tech Solutions?', { two: true })}
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="why-choose-two__top__right wow fadeInUp" data-wow-delay="900ms">
                                <p class="about-two__top__text">${company.whoWeAre[2]}</p>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="why-choose-two__inner__left">
                                <div class="why-choose-two__inner__item wow fadeInUp" data-wow-delay="300ms">
                                    <div class="why-choose-two__inner__item__content">
                                        <div class="why-choose-two__inner__item__icon">
                                            <i class="icon-it-1"></i>
                                        </div>
                                        <h4 class="why-choose-two__inner__item__text">Expert Team focused on your business requirements</h4>
                                    </div>
                                    <div class="why-choose-two__inner__item__link">
                                        <a href="about.html" class="why-choose-two__inner__item__link__btn">
                                            <i class="icon-arrow-left"></i>
                                        </a>
                                    </div>
                                </div>
                                <div class="why-choose-two__inner__item wow fadeInUp" data-wow-delay="600ms">
                                    <div class="why-choose-two__inner__item__content">
                                        <div class="why-choose-two__inner__item__icon">
                                            <i class="icon-future-1"></i>
                                        </div>
                                        <h4 class="why-choose-two__inner__item__text">Reliable Delivery and Dedicated Support</h4>
                                    </div>
                                    <div class="why-choose-two__inner__item__link">
                                        <a href="about.html" class="why-choose-two__inner__item__link__btn">
                                            <i class="icon-arrow-left"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="why-choose-two__inner__right wow fadeInRight" data-wow-delay="900ms">
                                <div class="why-choose-two__inner__thumb ostech-stretch-element-inside-column">
                                    <img src="assets/images/resources/why-choos-us-2-1.png" alt="${company.name}">
                                </div>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="why-choose-two__cta wow fadeInUp" data-wow-delay="900ms">
                                <div class="why-choose-two__cta__bg" style="background-image: url(assets/images/shapes/cta-2-1.png);"></div>
                                <h3 class="why-choose-two__cta__title">Looking for the Right People, Data or Digital Solution?</h3>
                                <div class="why-choose-two__cta__link">
                                    <a href="contact.html" class="why-choose-two__cta__link__btn ostech-btn ostech-btn--secondary">Get In Touch</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <!-- why-choose-two section End -->

        <!-- Benefit section Start -->
        <section class="benefit-one">
            <div class="container">
                <div class="row">
                    <div class="col-lg-6">
                        <div class="benefit-one__left">
                            <div class="benefit-one__thumb  wow fadeInLeft" data-wow-delay="700ms">
                                <img src="assets/images/resources/benefit-1-1.png" alt="${company.name}">
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="benefit-one__right">
                            <div class="benefit-one__top">
                                ${secTitle('Our Approach', 'Solutions Planned Around Every Client', { two: true })}
                            </div>
                            <div class="benefit-one__feature">
                                <div class="benefit-one__feature__item  wow fadeInUp" data-wow-delay="500ms">
                                    <div class="benefit-one__feature__item__bg" style="background-image: url(assets/images/resources/benefit-s-1-1.png);"></div>
                                    <div class=" benefit-one__feature__item__content">
                                        <div class="benefit-one__feature__icon">
                                            <i class="icon-solution-1"></i>
                                        </div>
                                        <h4 class="benefit-one__feature__item__title"><a href="about.html">Customized Approach</a></h4>
                                        <p class="benefit-one__feature__item__text">Planned around your objectives and resources.</p>
                                    </div>
                                </div>
                                <div class="benefit-one__feature__item  wow fadeInUp" data-wow-delay="700ms">
                                    <div class="benefit-one__feature__item__bg" style="background-image: url(assets/images/resources/benefit-s-1-2.png);"></div>
                                    <div class=" benefit-one__feature__item__content">
                                        <div class="benefit-one__feature__icon">
                                            <i class="icon-interactive-1"></i>
                                        </div>
                                        <h4 class="benefit-one__feature__item__title"><a href="about.html">Innovative Solutions</a></h4>
                                        <p class="benefit-one__feature__item__text">Modern technology and practical methods.</p>
                                    </div>
                                </div>
                            </div>
                            <ul class="list-unstyled benefit-one__list  wow fadeInUp" data-wow-delay="500ms">
                                <li class="benefit-one__list__item"><i class="fas fa-check-circle"></i> Transparent, value-oriented pricing</li>
                                <li class="benefit-one__list__item"><i class="fas fa-check-circle"></i> Structured, organised delivery</li>
                                <li class="benefit-one__list__item"><i class="fas fa-check-circle"></i> Continued support after delivery</li>
                            </ul>
                        </div>
                        <div class="benefit-one__bottom  wow fadeInUp" data-wow-delay="500ms">
                            <div class="benefit-one__bottom__content">
                                <h3 class="benefit-one__bottom__content__text">Your Trusted Technology Partner</h3>
                                <a href="contact.html" class="ostech-btn">Get In Touch</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="benefit-one__shape">
                <img src="assets/images/shapes/benefit-shape-1-1.png" alt>
            </div>
        </section>
        <!-- Benefit section End -->

        <!-- Sliding section Start -->
        <div class="text-slider  wow fadeInUp" data-wow-delay="500ms">
            <div class="text-slider__inner">
                <div class="text-slider__carousel">
                    <div class="text-slider__carousel__item">
${[...services.map((s) => s.title), ...services.map((s) => s.title)].concat(['Careers at Cuatro', 'People, Data & Digital Innovation', 'Careers at Cuatro', 'People, Data & Digital Innovation']).map((t) => `                        <div class="text-slider__item"><img src="assets/images/shapes/star.png" alt> ${t.replace(/&/g, '&amp;')}</div>`).join('\n')}
                    </div>
                </div>
            </div>
        </div>
        <!-- Sliding section End -->

${cta(p)}`;
  page({ file: 'index.html', title: 'Home', desc: `${company.name}. ${company.tagline}`, body });
}

function buildAbout() {
  const p = '';
  const body = `${pageHeader('About us', [{ label: 'About' }], p)}
        <!-- About section Start -->
        <section class="about-two">
            <div class="container">
                <div class="row ">
                    <div class="col-lg-6">
                        <div class="about-two__left wow fadeInLeft" data-wow-delay="300ms">
                            <div class="about-two__thumb">
                                <div class="about-two__thumb__item about-two__thumb__item--one">
                                    <img src="assets/images/about/about-2-1.png" alt="${company.name}">
                                </div>
                                <div class="about-two__thumb__item about-two__thumb__item--two">
                                    <img src="assets/images/about/about-2-2.png" alt="${company.name}">
                                </div>
                                <div class="about-two__thumb__award">
                                    <i class="icon-innovation-1"></i>
                                </div>
                                <div class="about-two__thumb__icon">
                                    <div class="about-two__thumb__icon__box">
                                        <img src="${ICON}" width="52" alt="${company.name}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6 wow fadeInRight" data-wow-delay="300ms">
                        <div class="about-two__right">
                            <div class="about-two__top">
                                ${secTitle('Who We Are', 'Empowering Growth Through People, Data &amp; Digital Innovation')}
                                <p class="about-two__top__text">${company.whoWeAre[0]} ${company.whoWeAre[1]}</p>
                                <p class="about-two__top__text">${company.whoWeAre[2]}</p>
                            </div>
                            <div class="about-two__ostech__item" style="background-image: url(assets/images/about/about-bg-2-1.png);">
                                <div class="about-two__ostech__item__inner">
                                    <div class="about-two__ostech__item__icon">
                                        <i class="icon-solution-1"></i>
                                    </div>
                                    <div class="about-two__ostech__item__content">
                                        <h4 class="about-two__ostech__item__title"><a href="about.html">Our Mission</a></h4>
                                        <p class="about-two__ostech__item__text">${company.mission}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="about-two__ostech__item" style="background-image: url(assets/images/about/about-bg-2-1.png);">
                                <div class="about-two__ostech__item__inner">
                                    <div class="about-two__ostech__item__icon">
                                        <i class="icon-future-1"></i>
                                    </div>
                                    <div class="about-two__ostech__item__content">
                                        <h4 class="about-two__ostech__item__title"><a href="about.html">Our Vision</a></h4>
                                        <p class="about-two__ostech__item__text">${company.vision}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="about-two__btn">
                                <a href="contact.html" class="ostech-btn">Contact Us</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <!-- About section End -->

        <!-- Company introduction + values -->
        <section class="cuatro-section">
            <div class="container">
                <div class="row gutter-y-30 align-items-center">
                    <div class="col-lg-6">
                        ${secTitle('Company Introduction', 'Technology and Business Solutions')}
                        <p class="cuatro-lead">${company.intro[0]}</p>
                        <p class="cuatro-lead">${company.intro[1]}</p>
                        <p class="cuatro-lead">${company.intro[2]}</p>
                        <p class="cuatro-lead">${company.intro[3]}</p>
                    </div>
                    <div class="col-lg-6">
                        <div class="cuatro-panel wow fadeInUp" data-wow-delay="300ms">
                            <h3 class="cuatro-panel__title">Our Values</h3>
                            <ul class="list-unstyled cuatro-checklist">
${company.values.map((v) => `                                <li><i class="fas fa-check-circle"></i> ${v}</li>`).join('\n')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Why choose Cuatro -->
        <section class="cuatro-section cuatro-section--gray">
            <div class="container">
                ${secTitle('Why Choose Us', 'Why Choose Cuatro Tech Solutions?', { center: true })}
                <div class="row gutter-y-30">
${reasons.map((r, i) => `                    <div class="col-md-6 col-lg-4">
                        <div class="cuatro-card wow fadeInUp" data-wow-delay="${(i % 3) * 200 + 200}ms">
                            <div class="cuatro-card__icon"><i class="${r.icon}"></i></div>
                            <h4 class="cuatro-card__title">${r.title}</h4>
                            <p class="cuatro-card__text">${r.text}</p>
                        </div>
                    </div>`).join('\n')}
                </div>
            </div>
        </section>

        <!-- How we work -->
        <section class="cuatro-section">
            <div class="container">
                ${secTitle('How We Work', 'Our Six-Stage Approach', { center: true })}
                <div class="row gutter-y-30">
${steps.map((s, i) => `                    <div class="col-md-6 col-lg-4">
                        <div class="cuatro-step wow fadeInUp" data-wow-delay="${(i % 3) * 200 + 200}ms">
                            <span class="cuatro-step__no">${String(i + 1).padStart(2, '0')}</span>
                            <h4 class="cuatro-step__title">${s.title}</h4>
                            <p class="cuatro-step__text">${s.text}</p>
                        </div>
                    </div>`).join('\n')}
                </div>
            </div>
        </section>

${cta(p)}`;
  page({ file: 'about.html', title: 'About', desc: company.intro[0], body });
}

function buildServices() {
  const p = '';
  const body = `${pageHeader('Services', [{ label: 'Services' }], p)}
        <section class="service-page service-page--page">
            <div class="service-page__bg" style="background-image: url(assets/images/shapes/service-2-1.png);"></div>
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        ${secTitle('Our Services', 'Five Services to Support <br> Your Business', { center: true, delay: '300ms' })}
                    </div>
                </div>
                <div class="row gutter-y-30 justify-content-center">
${serviceCards(p)}
                </div>
            </div>
        </section>

${cta(p)}`;
  page({ file: 'services.html', title: 'Services', desc: 'HR Services, Database Management, Digital Marketing, UI/UX Design and Product Development.', body });
}

function buildServiceDetails() {
  const p = '';
  services.forEach((s) => {
    const why = s.why.map((i) => reasons[i]);
    const body = `${pageHeader(s.title, [{ href: 'services.html', label: 'Services' }, { label: s.title }], p)}
        <section class="service-details">
            <div class="container">
                <div class="row gutter-y-30">
                    <div class="col-md-12 col-lg-4">
                        <div class="service-sidebar">

                            <div class="service-sidebar__single  wow fadeInUp" data-wow-delay='500ms'>
                                <h3 class="service-sidebar__title">All Services</h3>
                                <ul class="list-unstyled service-sidebar__nav">
${services.map((x) => `                                    <li><a href="${x.slug}">${x.title} <i class="icon-arrow-left"></i></a></li>`).join('\n')}
                                </ul>
                            </div>

                            <div class="service-sidebar__single  wow fadeInUp" data-wow-delay='500ms'>
                                <div class="service-sidebar__contact">
                                    <h3 class="service-sidebar__contact-title">Enquire About ${s.title}</h3>
                                    <div class="service-sidebar__contact-btn">
                                        <a href="contact.html?service=${encodeURIComponent(s.title)}" class="ostech-btn ostech-btn--submite">Contact</a>
                                    </div>
                                    <div class="service-sidebar__contact-image">
                                        <img src="assets/images/service/service-men-1-1.png" alt>
                                    </div>
                                    <div class="service-sidebar__contact-angle">
                                        <img src="assets/images/shapes/service-shape.png" alt>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-12 col-lg-8">
                        <div class="service-details__content">
                            <div class="service-details__single">
                                <div class="service-details__thumbnail wow fadeInUp" data-wow-delay='300ms'>
                                    <img src="assets/images/service/${s.heroImg}" alt="${s.title}">
                                </div>

                                <h3 class="service-details__title wow fadeInUp" data-wow-delay='300ms'>${s.title}</h3>
                                <p class="service-details__text wow fadeInUp" data-wow-delay='350ms'>${s.description}</p>

                                <h3 class="service-details__sub-title wow fadeInUp" data-wow-delay='300ms'>${s.message}</h3>

                                <h4 class="cuatro-subhead wow fadeInUp" data-wow-delay='300ms'>What we offer</h4>
                                <ul class="list-unstyled service-details__list cuatro-offerings wow fadeInUp" data-wow-delay='350ms'>
${s.offerings.map((o) => `                                    <li class="service-details__list__item"><i class="fas fa-check-circle"></i> ${o}</li>`).join('\n')}
                                </ul>
                            </div>

                            <div class="service-details__single">
                                <div class="service-details__single-inner">
                                    <h3 class="service-details__title">Why Choose Cuatro?</h3>
                                    <div class="row gutter-y-30">
${why.map((r) => `                                        <div class="col-md-6">
                                            <div class="service-details__inner-item wow fadeInUp " data-wow-delay="300ms">
                                                <div class="item-icon">
                                                    <div class="icon">
                                                        <i class="${r.icon}"></i>
                                                    </div>
                                                </div>
                                                <div class="item-content">
                                                    <h4 class="item__title"><a href="about.html">${r.title}</a></h4>
                                                    <p class="item__dec">${r.text}</p>
                                                </div>
                                            </div>
                                        </div>`).join('\n')}
                                    </div>
                                </div>
                            </div>
                            <div class="service-details__single wow fadeInUp" data-wow-delay='300ms'>
                                <div class="row align-items-center">
                                    <div class="col-md-5">
                                        <div class="service-details__image__item">
                                            <img src="assets/images/service/service-s-1-1.png" alt="${s.title}">
                                        </div>
                                    </div>
                                    <div class="col-md-7">
                                        <div class="service-details__benefit">
                                            <h3 class="service-details__benefit__title">Benefits</h3>
                                            <p class="service-details__benefit__text">${s.benefitText}</p>
                                            <ul class="list-unstyled service-details__list">
${s.benefits.map((b) => `                                                <li class="service-details__list__item"><i class="fas fa-check-circle"></i> ${b}</li>`).join('\n')}
                                            </ul>
                                            <a href="contact.html?service=${encodeURIComponent(s.title)}" class="ostech-btn cuatro-mt">Send an Enquiry</a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="service-details__single">
                                ${accordion(s.faqs, 0)}
                            </div>

                            <div class="service-details__single">
                                <h3 class="service-details__title">Explore Other Services</h3>
                                <div class="cuatro-chips">
${services.filter((x) => x !== s).map((x) => `                                    <a class="cuatro-chip" href="${x.slug}">${x.title}</a>`).join('\n')}
                                    <a class="cuatro-chip" href="careers.html">Careers at Cuatro</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
`;
    page({ file: s.slug, title: s.title, desc: s.description, body });
  });
}

function buildContact() {
  const p = '';
  const body = `${pageHeader('Contact', [{ label: 'Contact' }], p)}
        <section class="contact-one">
            <div class="container">
                <div class="row gutter-y-30">
                    <div class="col-lg-4">
                        <div class="contact-one__left">
                            <ul class="contact-one__list list-unstyled">
                                <li class="contact-one__list__item">
                                    <div class="contact-one__list__icon">
                                        <i class="icon-telephone"></i>
                                    </div>
                                    <div class="contact-one__list__content">
                                        <span class="contact-one__list__subtitle">Have any question?</span>
                                        <p class="contact-one__list__action"><a href="tel:${company.tel1}">${company.phone1}</a></p>
                                        <p class="contact-one__list__action"><a href="tel:${company.tel2}">${company.phone2}</a></p>
                                    </div>
                                </li>
                                <li class="contact-one__list__item">
                                    <div class="contact-one__list__icon">
                                        <i class="icon-email2"></i>
                                    </div>
                                    <div class="contact-one__list__content">
                                        <span class="contact-one__list__subtitle">Send Email</span>
                                        <p class="contact-one__list__action"><a href="mailto:${company.email}">${company.email}</a></p>
                                    </div>
                                </li>
                                <li class="contact-one__list__item">
                                    <div class="contact-one__list__icon">
                                        <i class="icon-Earth"></i>
                                    </div>
                                    <div class="contact-one__list__content">
                                        <span class="contact-one__list__subtitle">Website</span>
                                        <p class="contact-one__list__action"><a href="${company.url}">${company.website}</a></p>
                                    </div>
                                </li>
                            </ul>
                            <div class="contact-one__thumb">
                                <img src="assets/images/resources/contact-1-1.png" alt="Contact ${company.name}">
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-8">
                        <div class="contact-one__right">
                            <div class="contact-one__top">
                                ${secTitle('Contact with us', 'Feel Free to Write us Anytime')}
                            </div>
                            <form class="contact-one__form form-one background-base wow fadeInUp" data-wow-duration="1500ms" id="contact-form" novalidate>
                                <div class="form-one__group">
                                    <div class="form-one__control">
                                        <input type="text" name="name" placeholder="Your Name" aria-label="Your Name" autocomplete="name" maxlength="100" required>
                                        <div class="cf-error" data-error-for="name"></div>
                                    </div>
                                    <div class="form-one__control">
                                        <input type="email" name="email" placeholder="Email Address" aria-label="Email Address" autocomplete="email" maxlength="254" required>
                                        <div class="cf-error" data-error-for="email"></div>
                                    </div>
                                    <div class="form-one__control">
                                        <input type="tel" name="contact_number" placeholder="Contact Number" aria-label="Contact Number" autocomplete="tel" maxlength="20" required>
                                        <div class="cf-error" data-error-for="contact_number"></div>
                                    </div>
                                    <div class="form-one__control">
                                        <input type="text" name="subject" placeholder="Subject" aria-label="Subject" maxlength="150" required>
                                        <div class="cf-error" data-error-for="subject"></div>
                                    </div>
                                    <div class="form-one__control form-one__control--full">
                                        <textarea name="message" placeholder="Write a Message" aria-label="Message" maxlength="4000" required></textarea>
                                        <div class="cf-error" data-error-for="message"></div>
                                    </div>
                                    <div class="form-one__control form-one__control--full cf-hp" aria-hidden="true">
                                        <input type="text" name="website" tabindex="-1" autocomplete="off" placeholder="Leave this field empty">
                                    </div>
                                    <div class="form-one__control form-one__control--full">
                                        <label class="cf-check"><input type="checkbox" name="consent" value="true"> <span>I consent to Cuatro Tech Solutions processing the information I provide so that it can respond to my enquiry.</span></label>
                                        <div class="cf-error" data-error-for="consent"></div>
                                    </div>
                                    <div class="form-one__control form-one__control--full">
                                        <button type="submit" class="ostech-btn">Send a Message</button>
                                    </div>
                                    <div class="form-one__control form-one__control--full">
                                        <div class="cf-status" role="status" aria-live="polite"></div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
`;
  page({ file: 'contact.html', title: 'Contact', desc: `Contact ${company.name}: ${company.email}, ${company.phone1}`, body, scripts: ['cuatro-public.js'], dataPage: 'contact' });
}

function buildFaq() {
  const p = '';
  const body = `${pageHeader('our faqs', [{ label: 'FAQ' }], p)}
        <section class="faq-page">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col-lg-7 col-md-7">
                        ${secTitle('FAQS', 'Frequently Asked Questions &amp; Answers')}
                    </div>
                    <div class="col-lg-5 col-md-5">
                        <div class="faq-page__search">
                            <form action="#" class="faq-page__search__item" id="faq-search">
                                <button type="submit" aria-label="search submit">
                                    <span><i class="icon-search"></i></span>
                                </button>
                                <input type="text" placeholder="Search Here Anything" aria-label="Search the FAQ">
                            </form>
                        </div>
                    </div>
                </div>
                <div class="row align-items-center gutter-y-30">
                    <div class="col-lg-7">
                        ${accordion(faqs, 0)}
                    </div>
                    <div class="col-lg-5">
                        <div class="faq-page__thumb">
                            <img src="assets/images/resources/faq-1-1.png" alt="${company.name}">
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <div class="faq-contact">
            <div class="container">
                <div class="faq-contact__inner">
                    <div class="faq-contact__inner__item">
                        <div class="faq-contact__inner__item__icon">
                            <i class="icon-email2"></i>
                        </div>
                        <div class="faq-contact__inner__item__content">
                            <span class="faq-contact__inner__item__subtitle">Ask us anything. Write to us!</span>
                            <div class="faq-contact__inner__item__contact"><span>Quick </span><a href="mailto:${company.email}"> ${company.email}</a></div>
                        </div>
                    </div>
                    <div class="faq-contact__inner__item">
                        <div class="faq-contact__inner__item__icon">
                            <i class=" icon-telephone"></i>
                        </div>
                        <div class="faq-contact__inner__item__content">
                            <span class="faq-contact__inner__item__subtitle">Still have Questions? Call Now!</span>
                            <div class="faq-contact__inner__item__contact"><a href="tel:${company.tel1}">${company.phone1}</a></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
`;
  page({ file: 'faq.html', title: 'FAQ', desc: 'Frequently asked questions about Cuatro Tech Solutions, services and careers.', body, scripts: ['cuatro-public.js'], dataPage: 'faq' });
}

function build404() {
  const src = fs.readFileSync(path.join(ROOT, '_template_reference', '404.html'), 'utf8');
  const m = src.match(/<section class="error-404">[\s\S]*?<\/section>/);
  let section = m ? m[0] : '<section class="error-404"><div class="container"><h2>Page not found</h2></div></section>';
  section = section.replace(/index\.html/g, 'index.html');
  const body = `${pageHeader('404 Error', [{ label: '404' }], '')}
        ${section}
`;
  page({ file: '404.html', title: 'Page not found', desc: 'Page not found', body });
}

// ------------------------------------------------------------------------------------------------
// careers
// ------------------------------------------------------------------------------------------------
function buildCareers() {
  const p = '';
  const sel = (id, label, extra = '') => `<div class="cf-group"><label for="${id}">${label}</label><select id="${id}" name="${id}" ${extra}><option value="">Any</option></select></div>`;
  const body = `${pageHeader('Careers at Cuatro', [{ label: 'Careers at Cuatro' }], p)}
        <section class="cuatro-section cuatro-careers">
            <div class="container">
                <div class="row align-items-end gutter-y-30">
                    <div class="col-lg-8">
                        ${secTitle('Join Our Team', 'Find a Role That Fits Your Skills')}
                        <p class="cuatro-lead">Browse open positions across 19 job categories. Create a free Student Portal account, upload your resume and receive job recommendations matched to your skills.</p>
                    </div>
                    <div class="col-lg-4">
                        <div class="cuatro-actions">
                        <a href="student-portal/register" class="ostech-btn">Create Student Account</a>
                        <a href="student-portal/login" class="ostech-btn ostech-btn--secondary">Student Login</a>
                        </div>
                    </div>
                </div>

                <form class="cuatro-filter" id="job-filter" autocomplete="off" role="search">
                    <div class="cuatro-filter__grid">
                        <div class="cf-group"><label for="title">Job title</label><input type="text" id="title" name="title" placeholder="e.g. Python Developer"></div>
                        <div class="cf-group"><label for="keyword">Keyword</label><input type="text" id="keyword" name="keyword" placeholder="Skill, tool or keyword"></div>
                        ${sel('category', 'Category')}
                        <div class="cf-group"><label for="location">Location</label><input type="text" id="location" name="location" placeholder="City or region"></div>
                        ${sel('type', 'Employment type')}
                        ${sel('experience', 'Experience level')}
                        ${sel('mode', 'Remote / Hybrid / On-site')}
                        <div class="cf-group"><label for="salaryMin">Minimum salary</label>
                            <select id="salaryMin" name="salaryMin">
                                <option value="">Any</option>
                                <option value="200000">&#8377;2 LPA and above</option>
                                <option value="400000">&#8377;4 LPA and above</option>
                                <option value="600000">&#8377;6 LPA and above</option>
                                <option value="1000000">&#8377;10 LPA and above</option>
                                <option value="1500000">&#8377;15 LPA and above</option>
                            </select></div>
                    </div>
                    <div class="cuatro-filter__actions">
                        <button type="submit" class="ostech-btn">Search Jobs</button>
                        <button type="reset" class="ostech-btn ostech-btn--secondary" id="filter-reset">Reset</button>
                    </div>
                </form>

                <div class="cuatro-catbar">
                    <h4 class="cuatro-subhead">Browse by category</h4>
                    <div class="cuatro-chips" id="category-chips" aria-label="Job categories"></div>
                </div>

                <div class="cuatro-results-head">
                    <p id="job-count" class="cuatro-muted" aria-live="polite">Loading jobs...</p>
                </div>
                <div class="row gutter-y-30" id="job-list"></div>
                <nav class="cuatro-pagination" id="job-pagination" aria-label="Job pages"></nav>
            </div>
        </section>
`;
  page({ file: 'careers.html', title: 'Careers at Cuatro', desc: 'Browse jobs, search by category and apply at Cuatro Tech Solutions.', body, scripts: ['cuatro-careers.js'], dataPage: 'careers' });

  const detailBody = `${pageHeader('Job Details', [{ href: 'careers.html', label: 'Careers at Cuatro' }, { label: 'Job Details' }], p)}
        <section class="cuatro-section">
            <div class="container">
                <div id="job-detail" aria-live="polite"><p class="cuatro-muted">Loading job...</p></div>
            </div>
        </section>
`;
  page({ file: 'job-details.html', title: 'Job Details', desc: 'Job details at Cuatro Tech Solutions.', body: detailBody, scripts: ['cuatro-careers.js'], dataPage: 'job-details' });
}

// ------------------------------------------------------------------------------------------------
// portals
// ------------------------------------------------------------------------------------------------
const studentNav = [
  ['dashboard', 'Dashboard', 'fa-th-large'],
  ['profile', 'My Profile', 'fa-user'],
  ['resume', 'My Resume', 'fa-file-alt'],
  ['find-jobs', 'Find Jobs', 'fa-search'],
  ['find-jobs?tab=recommended', 'Recommended Jobs', 'fa-star'],
  ['applications', 'My Applications', 'fa-briefcase'],
  ['notifications', 'Notifications', 'fa-bell'],
  ['settings', 'Account Settings', 'fa-cog']
];
const adminNav = [
  ['dashboard', 'Overview', 'fa-th-large'],
  ['applications', 'Applications', 'fa-briefcase'],
  ['jobs', 'Jobs', 'fa-list'],
  ['candidates', 'Candidates', 'fa-users'],
  ['messages', 'Contact Messages', 'fa-envelope'],
  ['audit', 'Audit Log', 'fa-clipboard-list'],
  ['settings', 'Account Settings', 'fa-cog']
];

function sidebar(prefix, items, current, label) {
  return `<aside class="cuatro-sidebar" aria-label="${label}">
                            <div class="cuatro-sidebar__user"><span class="cuatro-sidebar__label">${label}</span><strong id="side-name">&nbsp;</strong></div>
                            <ul class="list-unstyled cuatro-sidebar__nav">
${items.map(([slug, text, icon]) => `                                <li><a href="${prefix}/${slug}"${slug === current ? ' class="active" aria-current="page"' : ''}><i class="fas ${icon}" aria-hidden="true"></i> ${text}${slug === 'notifications' ? ' <span class="cuatro-count" id="nav-unread" hidden></span>' : ''}</a></li>`).join('\n')}
                                <li><a href="#" data-action="logout"><i class="fas fa-sign-out-alt" aria-hidden="true"></i> Log out</a></li>
                            </ul>
                        </aside>`;
}

function portalPage({ area, file, title, current, dataPage, crumb }) {
  const isAdmin = area === 'admin';
  const prefix = isAdmin ? '/admin-portal' : '/student-portal';
  const label = isAdmin ? 'Administrator' : 'Student Portal';
  const body = `${pageHeader(title, [{ href: `${prefix}/dashboard`, label: isAdmin ? 'Admin Portal' : 'Student Portal' }, { label: crumb || title }], '/')}
        <section class="cuatro-portal">
            <div class="container">
                <div class="row gutter-y-30">
                    <div class="col-lg-3">
                        ${sidebar(prefix, isAdmin ? adminNav : studentNav, current, label)}
                    </div>
                    <div class="col-lg-9">
                        <div id="app" class="cuatro-app" aria-live="polite"><p class="cuatro-muted">Loading...</p></div>
                    </div>
                </div>
            </div>
        </section>
`;
  page({
    file: `${isAdmin ? 'admin-portal' : 'student-portal'}/${file}.html`, title: `${title}`, desc: `${label} - ${company.name}`, body, p: '/',
    scripts: [isAdmin ? 'cuatro-admin.js' : 'cuatro-student.js'], dataPage: `${area}-${dataPage}`, noindex: true, cursor: !isAdmin
  });
}

function field({ name, label, type = 'text', required = false, autocomplete = '', placeholder = '', col = 'cf-col-12', attrs = '', help = '' }) {
  return `<div class="cf-group ${col}"><label for="f-${name}">${label}${required ? ' <span class="cf-req" aria-hidden="true">*</span>' : ''}</label>
                                    <input id="f-${name}" name="${name}" type="${type}" ${required ? 'required' : ''} ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${placeholder ? `placeholder="${placeholder}"` : ''} ${attrs}>${help ? `<small class="cf-help">${help}</small>` : ''}
                                    <div class="cf-error" data-error-for="${name}"></div></div>`;
}

function authPage({ area, file, title, intro, form, dataPage, footerLinks }) {
  const isAdmin = area === 'admin';
  const prefix = isAdmin ? '/admin-portal' : '/student-portal';
  const body = `${pageHeader(title, [{ label: isAdmin ? 'Admin Portal' : 'Student Portal' }, { label: title }], '/')}
        <section class="login-page cuatro-auth">
            <div class="container">
                <div class="login-page__inner">
                    <div class="row justify-content-center">
                        <div class="col-lg-${form.wide ? 8 : 6} wow fadeInUp animated" data-wow-delay="300ms">
                            <div class="login-page__wrap">
                                <div class="cuatro-auth__brand"><img src="/assets/images/brand/cuatro-logo-navy.png" alt="${company.name}" width="180"></div>
                                <h3 class="login-page__wrap__title">${title}</h3>
                                <p class="cuatro-muted">${intro}</p>
                                <form class="cuatro-form" id="${form.id}" novalidate>
                                    <div class="cf-row">
${form.fields}
                                    </div>
                                    ${form.extra || ''}
                                    <div class="cf-status" role="status" aria-live="polite"></div>
                                    <div class="login-page__form-btn-box">
                                        <button type="submit" class="ostech-btn"><span>${form.button}</span></button>
                                    </div>
                                </form>
                                <div class="cuatro-auth__links">${footerLinks}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
`;
  page({
    file: `${isAdmin ? 'admin-portal' : 'student-portal'}/${file}.html`, title, desc: `${title} - ${company.name}`, body, p: '/',
    scripts: [isAdmin ? 'cuatro-admin.js' : 'cuatro-student.js'], dataPage: `${area}-${dataPage}`, noindex: true, cursor: !isAdmin
  });
}

function buildPortals() {
  // ---- student: auth pages
  authPage({
    area: 'student', file: 'login', title: 'Student Login', dataPage: 'login',
    intro: 'Sign in to manage your profile, resume and job applications.',
    form: {
      id: 'login-form', button: 'Login',
      fields: `${field({ name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email' })}
${field({ name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password' })}`
    },
    footerLinks: '<a href="/student-portal/forgot-password">Forgot password?</a> <span>&middot;</span> <a href="/student-portal/register">Create a student account</a>'
  });
  authPage({
    area: 'student', file: 'register', title: 'Student Registration', dataPage: 'register',
    intro: 'Create your candidate account. You can complete the remaining profile details later.',
    form: {
      id: 'register-form', button: 'Create Account', wide: true,
      fields: `${field({ name: 'full_name', label: 'Full name', required: true, autocomplete: 'name', col: 'cf-col-6' })}
${field({ name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email', col: 'cf-col-6' })}
${field({ name: 'contact_number', label: 'Contact number', type: 'tel', required: true, autocomplete: 'tel', col: 'cf-col-6' })}
${field({ name: 'location', label: 'Location', autocomplete: 'address-level2', col: 'cf-col-6' })}
${field({ name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'new-password', col: 'cf-col-6', help: 'At least 8 characters with a letter and a number.' })}
${field({ name: 'confirm_password', label: 'Confirm password', type: 'password', required: true, autocomplete: 'new-password', col: 'cf-col-6' })}
${field({ name: 'college', label: 'College / University', col: 'cf-col-6' })}
${field({ name: 'degree', label: 'Degree', col: 'cf-col-6', placeholder: "e.g. Bachelor's degree" })}
${field({ name: 'specialisation', label: 'Course / Specialisation', col: 'cf-col-6' })}
${field({ name: 'graduation_year', label: 'Graduation year', type: 'number', required: true, col: 'cf-col-6', attrs: 'min="1970" max="2100"' })}
${field({ name: 'skills', label: 'Skills', col: 'cf-col-12', placeholder: 'Comma separated, e.g. Python, SQL, Figma' })}
<div class="cf-group cf-col-12"><label for="f-experience">Experience (if applicable)</label><textarea id="f-experience" name="experience" rows="3" maxlength="2000"></textarea><div class="cf-error" data-error-for="experience"></div></div>`,
      extra: '<label class="cf-check"><input type="checkbox" name="terms" required> <span>I agree that Cuatro Tech Solutions may store and process my details and resume for recruitment purposes.</span></label><div class="cf-error" data-error-for="terms"></div>'
    },
    footerLinks: 'Already registered? <a href="/student-portal/login">Log in</a>'
  });
  authPage({
    area: 'student', file: 'forgot-password', title: 'Forgot Password', dataPage: 'forgot',
    intro: 'Enter your account email and we will send a password reset link if the account exists.',
    form: { id: 'forgot-form', button: 'Send Reset Link', fields: field({ name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email' }) },
    footerLinks: '<a href="/student-portal/login">Back to login</a>'
  });
  authPage({
    area: 'student', file: 'reset-password', title: 'Reset Password', dataPage: 'reset',
    intro: 'Choose a new password for your account.',
    form: {
      id: 'reset-form', button: 'Update Password',
      fields: `${field({ name: 'password', label: 'New password', type: 'password', required: true, autocomplete: 'new-password', help: 'At least 8 characters with a letter and a number.' })}
${field({ name: 'confirm_password', label: 'Confirm new password', type: 'password', required: true, autocomplete: 'new-password' })}`
    },
    footerLinks: '<a href="/student-portal/login">Back to login</a>'
  });

  // ---- student: portal pages (content is rendered by cuatro-student.js)
  const sp = [
    ['dashboard', 'Dashboard', 'dashboard', 'dashboard'],
    ['profile', 'My Profile', 'profile', 'profile'],
    ['resume', 'My Resume', 'resume', 'resume'],
    ['find-jobs', 'Find Jobs', 'find-jobs', 'find-jobs'],
    ['job-match', 'Job Match Details', 'find-jobs', 'job-match'],
    ['apply', 'Apply for Job', 'find-jobs', 'apply'],
    ['applications', 'My Applications', 'applications', 'applications'],
    ['application-details', 'Application Details', 'applications', 'application-details'],
    ['notifications', 'Notifications', 'notifications', 'notifications'],
    ['settings', 'Account Settings', 'settings', 'settings']
  ];
  sp.forEach(([file, title, current, dataPage]) => portalPage({ area: 'student', file, title, current, dataPage }));

  // ---- admin
  authPage({
    area: 'admin', file: 'login', title: 'Admin Login', dataPage: 'login',
    intro: 'Authorised Cuatro recruitment administrators only.',
    form: {
      id: 'login-form', button: 'Login',
      fields: `${field({ name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'username' })}
${field({ name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password' })}`
    },
    footerLinks: '<a href="/index.html">Back to website</a>'
  });
  const ap = [
    ['dashboard', 'Recruitment Overview', 'dashboard', 'dashboard'],
    ['applications', 'Applications', 'applications', 'applications'],
    ['application', 'Application Review', 'applications', 'application'],
    ['jobs', 'Job Management', 'jobs', 'jobs'],
    ['job-edit', 'Job Editor', 'jobs', 'job-edit'],
    ['candidates', 'Candidates', 'candidates', 'candidates'],
    ['candidate', 'Candidate Profile', 'candidates', 'candidate'],
    ['messages', 'Contact Messages', 'messages', 'messages'],
    ['audit', 'Audit Log', 'audit', 'audit'],
    ['settings', 'Account Settings', 'settings', 'settings']
  ];
  ap.forEach(([file, title, current, dataPage]) => portalPage({ area: 'admin', file, title, current, dataPage }));
}

// ------------------------------------------------------------------------------------------------
buildHome();
buildAbout();
buildServices();
buildServiceDetails();
buildContact();
buildFaq();
build404();
buildCareers();
buildPortals();
console.log('Site pages generated.');
