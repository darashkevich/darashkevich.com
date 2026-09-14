document.documentElement.classList.add("js");

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReduced && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
}
