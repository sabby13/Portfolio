/* =====================================================
   Seam sparks
   A lightweight canvas ember-field that rises off the
   glowing torn seam, giving it life. Additive-blended
   warm-white dots drift up, sway and twinkle, then
   respawn at the seam. Pauses when off-screen and
   collapses to a faint static field for reduced-motion.
   ===================================================== */

(function () {

    const wrap = document.querySelector(".tear-divider");
    const canvas = wrap && wrap.querySelector(".tear-sparks");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, dpr = 1, particles = [], running = false, raf = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    function make() {
        const gold = Math.random() < 0.22;
        return {
            x: rand(0, W),
            y: rand(H * 0.74, H * 0.86),   // spawn along the seam band
            r: rand(0.6, 2.1),
            vy: rand(-0.5, -0.14),         // drift upward
            vx: rand(-0.1, 0.1),
            sway: rand(0.4, 1.3),
            phase: rand(0, Math.PI * 2),
            life: 0,
            ttl: rand(150, 380),
            max: rand(0.5, 1),
            gold
        };
    }

    function reset(p) {
        Object.assign(p, make());
        p.y = rand(H * 0.76, H * 0.88);
        p.life = 0;
    }

    function build() {
        const n = Math.min(70, Math.max(16, Math.round(W / 20)));
        particles = Array.from({ length: n }, () => {
            const p = make();
            p.life = Math.random() * p.ttl;   // stagger
            return p;
        });
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = canvas.getBoundingClientRect();
        W = r.width; H = r.height;
        canvas.width = Math.max(1, Math.round(W * dpr));
        canvas.height = Math.max(1, Math.round(H * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        build();
        if (reduce) drawStatic();
    }

    function dot(p, a) {
        const col = p.gold ? "255,224,160" : "255,251,238";
        const rad = p.r * 4;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, `rgba(${col},${a})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
    }

    function frame() {
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = "lighter";
        for (const p of particles) {
            p.life++;
            p.phase += 0.03;
            p.x += p.vx + Math.sin(p.phase) * p.sway * 0.15;
            p.y += p.vy;

            const t = p.life / p.ttl;
            let a = t < 0.2 ? t / 0.2 : t > 0.6 ? Math.max(0, (1 - t) / 0.4) : 1;
            a *= p.max * (0.7 + 0.3 * Math.sin(p.phase * 2));   // twinkle

            if (p.life >= p.ttl || p.y < -4) { reset(p); continue; }
            dot(p, a);
        }
        ctx.globalCompositeOperation = "source-over";
        raf = requestAnimationFrame(frame);
    }

    function drawStatic() {
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = "lighter";
        particles.forEach(p => dot(p, 0.45 * p.max));
        ctx.globalCompositeOperation = "source-over";
    }

    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop  = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    window.addEventListener("resize", resize);

    if (reduce) return;   // static field already drawn

    if ("IntersectionObserver" in window) {
        new IntersectionObserver(
            entries => entries.forEach(e => (e.isIntersecting ? start() : stop())),
            { threshold: 0 }
        ).observe(wrap);
    } else {
        start();
    }

})();
