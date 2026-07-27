/* =====================================================
   Typewriter
   Types out any [data-typewriter] element the first time
   it scrolls into view, with a blinking caret. The full
   text stays in the DOM as a no-JS / screen-reader
   fallback, and motion is skipped for reduced-motion.
   ===================================================== */

(function () {

    const els = document.querySelectorAll("[data-typewriter]");
    if (!els.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    els.forEach((el) => {

        const full = el.textContent.trim();

        // rebuild: an accessible label + separate text / caret spans
        el.setAttribute("aria-label", full);
        el.textContent = "";

        const text = document.createElement("span");
        text.className = "tw-text";

        const caret = document.createElement("span");
        caret.className = "tw-caret";
        caret.setAttribute("aria-hidden", "true");

        el.append(text, caret);

        // no motion / no observer support → show it all at once
        if (reduce || !("IntersectionObserver" in window)) {
            text.textContent = full;
            el.classList.add("tw-done");
            return;
        }

        let started = false;
        const speed = 85; // ms per character

        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting || started) return;
                started = true;
                obs.disconnect();

                let i = 0;
                (function type() {
                    text.textContent = full.slice(0, i);
                    if (i++ <= full.length) {
                        setTimeout(type, speed);
                    } else {
                        el.classList.add("tw-done");
                    }
                })();
            });
        }, { threshold: 0.6 });

        io.observe(el);
    });

})();
