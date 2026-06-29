/**
 * Hexomel — About Page Scroll Reveal Animations
 * Inspired by landonorris.com's smooth scroll-triggered reveals.
 * Uses IntersectionObserver for performant, GPU-accelerated animations.
 */
(function () {
  "use strict";

  // --- Scroll Reveal Observer ---
  const revealElements = document.querySelectorAll(".scroll-reveal");

  if (!revealElements.length) return;

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("scroll-revealed");
        } else {
          entry.target.classList.remove("scroll-revealed");
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -60px 0px",
    }
  );

  revealElements.forEach((el) => {
    revealObserver.observe(el);
  });

  // --- Parallax-like Hero Effect ---
  const hero = document.querySelector(".about-hero-premium");
  if (hero) {
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const scrollY = window.scrollY;
            const heroH = hero.offsetHeight;
            if (scrollY < heroH * 1.5) {
              const progress = scrollY / heroH;
              hero.style.setProperty("--parallax-y", `${scrollY * 0.35}px`);
              hero.style.setProperty(
                "--parallax-opacity",
                `${1 - progress * 0.5}`
              );
            }
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  // --- Section divider lines animate on scroll ---
  const sectionBadges = document.querySelectorAll(".about-badge-gold");
  const badgeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("badge-animate");
        } else {
          entry.target.classList.remove("badge-animate");
        }
      });
    },
    { threshold: 0.5 }
  );

  sectionBadges.forEach((badge) => badgeObserver.observe(badge));
})();
