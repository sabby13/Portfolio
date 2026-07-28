/* =====================================================
   Hero butterflies
   A small flock of GLB butterflies that drift across the
   hero on wandering paths, wings flapping, dipping in and
   out of depth so they blur through the frosted glass card
   as they pass behind it. Pauses when the hero scrolls out
   of view; collapses to a single still butterfly under
   reduced-motion.

   Tunables live in CONFIG below.
   ===================================================== */

(function () {

    const hero   = document.getElementById("hero");
    const canvas = document.getElementById("butterfly-canvas");
    if (!hero || !canvas || typeof THREE === "undefined" || !THREE.GLTFLoader) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const CONFIG = {
        count:     2,                // two butterflies, one low one high
        scale:     1.08,             // base size (~1.5× the previous)
        baseRotX:  1.35,             // pitch so the dorsal wings face us
        baseRotZ:  Math.PI           // 180° in-plane flip so the head points up
    };

    /* ---- renderer / scene ---- */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);
    camera.position.set(0, 0, 640);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const key = new THREE.DirectionalLight(0xfff3e2, 1.15); key.position.set(1, 2, 3);  scene.add(key);
    const rim = new THREE.DirectionalLight(0x9dc0ff, 0.55); rim.position.set(-2, 1, -2); scene.add(rim);

    let W = 0, H = 0, halfW = 0, halfH = 0;
    function resize() {
        const r = hero.getBoundingClientRect();
        W = r.width; H = r.height;
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        const vfov = THREE.MathUtils.degToRad(camera.fov);
        halfH = Math.tan(vfov / 2) * camera.position.z;
        halfW = halfH * camera.aspect;
    }
    resize();
    window.addEventListener("resize", resize);

    /* ---- flock ---- */
    const clock  = new THREE.Clock();
    const flyers = [];
    const rand = (a, b) => a + Math.random() * (b - a);

    // hover distance around the anchor (world units) — small, so they
    // never leave their spot
    const HOVER_X = 26, HOVER_Y = 18, HOVER_Z = 16;

    // fractional anchor per lane, kept screen-relative so it survives resize.
    // band -1 => lower-left, band +1 => upper-right (matches the composition)
    function makeFlyer(obj, mixer, band) {
        return {
            obj, mixer, band,
            fx: band < 0 ? -0.70 :  0.70,     // fraction of halfW
            fy: band < 0 ? -0.42 :  0.46,     // fraction of halfH
            // independent hover phases/speeds so the two feel alive, not synced
            hxF: rand(0.28, 0.42), hxP: rand(0, 6.28),
            hyF: rand(0.34, 0.5),  hyP: rand(0, 6.28),
            hzF: rand(0.16, 0.26), hzP: rand(0, 6.28),
            t:   rand(0, 100)
        };
    }

    function place(f, dt) {
        f.t += dt;

        // anchor recomputed each frame from current viewport → stays put on resize
        const ax = f.fx * halfW;
        const ay = f.fy * halfH;

        // small hover around the anchor
        const x = ax + Math.sin(f.t * f.hxF + f.hxP) * HOVER_X;
        const y = ay + Math.sin(f.t * f.hyF + f.hyP) * HOVER_Y;
        const z =      Math.sin(f.t * f.hzF + f.hzP) * HOVER_Z;

        const o = f.obj;
        o.position.set(x, y, z);

        // in-plane flip (head up) + light flutter; dorsal pitch is on the model
        o.rotation.x = Math.sin(f.t * 0.9) * 0.07;
        o.rotation.y = Math.sin(f.t * 0.6 + f.hxP) * 0.08;
        o.rotation.z = CONFIG.baseRotZ + Math.sin(f.t * 1.1 + f.hyP) * 0.08;
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
        "assets/butterfly.glb",
        (gltf) => {
            const src   = gltf.scene;
            const clips = gltf.animations || [];

            // enable the wing-texture transparency so no dark plane shows
            // behind the butterfly (materials are shared with the clones)
            src.traverse((o) => {
                if (!o.isMesh || !o.material) return;
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                mats.forEach((m) => {
                    m.transparent = true;
                    m.alphaTest   = 0.35;   // clean cutout of the wing shape
                    m.side        = THREE.DoubleSide;
                    m.depthWrite  = true;
                    m.needsUpdate = true;
                });
            });

            for (let i = 0; i < CONFIG.count; i++) {
                const model = THREE.SkeletonUtils
                    ? THREE.SkeletonUtils.clone(src)
                    : src.clone(true);

                // recentre the model on its own bounding-box centre so it
                // rotates/positions around its middle, not its feet
                const box = new THREE.Box3().setFromObject(model);
                const c = box.getCenter(new THREE.Vector3());
                model.position.sub(c);

                // fixed pitch on the model so the dorsal wings face the camera
                model.rotation.x = CONFIG.baseRotX;

                // pivot carries scale + flight transform; model sits centred inside
                const pivot = new THREE.Group();
                pivot.add(model);
                pivot.scale.setScalar(CONFIG.scale);
                scene.add(pivot);

                const mixer = new THREE.AnimationMixer(model);
                if (clips.length) {
                    const act = mixer.clipAction(clips[i % clips.length]);
                    act.timeScale = rand(0.8, 1.35);
                    act.play();
                }
                // alternate lanes: first low (-1), second high (+1)
                flyers.push(makeFlyer(pivot, mixer, i === 0 ? -1 : 1));
            }

            // warm up placement so nothing pops in at the origin
            flyers.forEach(f => place(f, 0));

            if (reduce) { renderer.render(scene, camera); }
            else { running = true; loop(); }
        },
        undefined,
        (err) => console.error(
            "butterfly.glb failed to load. If you opened index.html directly " +
            "(file://), browsers block loading 3D models — serve the folder over " +
            "http (e.g. `python -m http.server`) and open http://localhost:8000.",
            err
        )
    );

    /* ---- loop (paused when hero off-screen) ---- */
    let running = false, raf = 0;

    function loop() {
        const dt = Math.min(clock.getDelta(), 0.05);
        for (const f of flyers) {
            f.mixer.update(dt);
            place(f, dt);
        }
        renderer.render(scene, camera);
        if (running) raf = requestAnimationFrame(loop);
    }

    if (!reduce && "IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting && flyers.length && !running) {
                    running = true; clock.getDelta(); loop();
                } else if (!e.isIntersecting) {
                    running = false; cancelAnimationFrame(raf);
                }
            });
        }, { threshold: 0 }).observe(hero);
    }

})();
