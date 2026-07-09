document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    if (window.location.hash !== href) {
      window.history.pushState(null, '', href);
    }
  });
});

const observerOptions = {
  threshold: 0,
  rootMargin: '0px 0px -40px 0px'
};

const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
    }
  });
}, observerOptions);

function revealSectionsInView() {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  document.querySelectorAll('main section[data-reveal]').forEach(function (section) {
    const rect = section.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < viewportHeight) {
      section.classList.add('is-visible');
    }
  });
}

document.querySelectorAll('main section').forEach(function (section) {
  if (section.querySelector('section')) return;
  section.setAttribute('data-reveal', '');
  observer.observe(section);
});

revealSectionsInView();
window.addEventListener('load', revealSectionsInView);
