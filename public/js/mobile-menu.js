document.addEventListener('DOMContentLoaded', function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuClose = document.getElementById('mobile-menu-close');
  const menuIcon = document.getElementById('menu-icon');
  const closeIcon = document.getElementById('close-icon');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  const mobileMenuPanel = mobileMenu?.querySelector('.mobile-menu-panel');
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let previouslyFocusedElement = null;

  if (
    !(mobileMenuButton instanceof HTMLButtonElement) ||
    !(mobileMenu instanceof HTMLElement) ||
    !(mobileMenuClose instanceof HTMLButtonElement) ||
    !(menuIcon instanceof SVGElement) ||
    !(closeIcon instanceof SVGElement) ||
    !(mobileMenuPanel instanceof HTMLElement)
  ) {
    return;
  }

  function getFocusableElements() {
    return Array.from(mobileMenu.querySelectorAll(focusableSelector));
  }

  function openMobileMenu() {
    mobileMenu.classList.remove('translate-x-full', 'pointer-events-none');
    mobileMenu.classList.add('pointer-events-auto');
    mobileMenuPanel.classList.remove('translate-x-full');
    menuIcon.classList.add('hidden');
    closeIcon.classList.remove('hidden');
    mobileMenuButton.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    mobileMenu.inert = false;
    previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';

    const focusable = getFocusableElements();
    (focusable[0] || mobileMenuPanel).focus();
  }

  function closeMobileMenu(options) {
    const restoreFocus = !options || options.restoreFocus !== false;

    mobileMenu.classList.add('translate-x-full');
    mobileMenu.classList.remove('pointer-events-auto');
    mobileMenu.classList.add('pointer-events-none');
    mobileMenuPanel.classList.add('translate-x-full');
    menuIcon.classList.remove('hidden');
    closeIcon.classList.add('hidden');
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileMenu.inert = true;
    document.body.style.overflow = '';

    if (restoreFocus && previouslyFocusedElement instanceof HTMLElement) {
      previouslyFocusedElement.focus();
    }
  }

  function focusHashTarget(href) {
    const targetElement = document.querySelector(href);
    if (!(targetElement instanceof HTMLElement)) return;

    targetElement.scrollIntoView({
      behavior: scrollBehavior,
      block: 'start'
    });

    if (window.location.hash !== href) {
      window.history.pushState(null, '', href);
    }

    if (!targetElement.hasAttribute('tabindex')) {
      targetElement.setAttribute('tabindex', '-1');
    }
    targetElement.focus({ preventScroll: true });
  }

  mobileNavLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      // Own in-page navigation so site-interactions.js does not fight focus restore.
      e.preventDefault();
      e.stopImmediatePropagation();
      closeMobileMenu({ restoreFocus: false });

      setTimeout(function () {
        focusHashTarget(href);
      }, 180);
    });
  });

  mobileMenuButton.addEventListener('click', openMobileMenu);
  mobileMenuClose.addEventListener('click', closeMobileMenu);

  mobileMenu.addEventListener('click', function (e) {
    if (e.target === mobileMenu) {
      closeMobileMenu();
    }
  });

  document.addEventListener('keydown', function (e) {
    const menuOpen = !mobileMenu.classList.contains('translate-x-full');

    if (e.key === 'Escape' && menuOpen) {
      closeMobileMenu();
    }

    if (e.key === 'Tab' && menuOpen) {
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) {
      closeMobileMenu({ restoreFocus: false });
    }
  });
});
