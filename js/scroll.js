/* =====================================================
   Scroll reveal
   Fades + rises any [data-reveal] element into view the
   first time it enters the viewport. Elements stay put
   once shown (no re-trigger on scroll-up).
   ===================================================== */

(function () {

    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // No IntersectionObserver support, or user prefers no motion:
    // just show everything.
    if (reduce || !("IntersectionObserver" in window)) {
        items.forEach((el) => el.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);   // reveal once
            });
        },
        {
            threshold: 0.15,
            rootMargin: "0px 0px -8% 0px"
        }
    );

    items.forEach((el) => observer.observe(el));

})();
