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
        count:      reduce ? 1 : 3,   // how many butterflies
        scale:      0.9,              // base size (× per-flyer variation)
        baseRotX:  -0.25,            // model tilt so we see the wings nicely
        depth:      150,             // how far they travel toward / past the card
        speed:      0.55             // overall wander speed
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

    function makeFlyer(obj, mixer) {
        return {
            obj, mixer,
            t:   rand(0, 100),
            // independent frequencies/phases so no two share a path
            ax:  rand(0.85, 1.05), px: rand(0, 6.28),
            ay:  rand(0.30, 0.42), py: rand(0, 6.28),
            az:  rand(0.22, 0.34), pz: rand(0, 6.28),
            spanX: rand(0.72, 1.02),
            spanY: rand(0.28, 0.42),
            prev: new THREE.Vector3()
        };
    }

    function place(f, dt) {
        f.t += dt * CONFIG.speed;
        const x = Math.sin(f.t * f.ax + f.px) * halfW * f.spanX
                + Math.sin(f.t * 1.9) * 14;
        const y = Math.sin(f.t * f.ay + f.py) * halfH * f.spanY
                + Math.cos(f.t * 1.3) * 12;
        const z = Math.sin(f.t * f.az + f.pz) * CONFIG.depth;

        const o = f.obj;
        // banking + heading from horizontal velocity
        const vx = x - f.prev.x;
        o.position.set(x, y, z);
        o.rotation.x = CONFIG.baseRotX + Math.sin(f.t * 0.8) * 0.12;
        o.rotation.y = Math.sin(f.t * f.ax + f.px) * 0.5;   // turn as it sweeps
        o.rotation.z = -vx * 0.06;                          // bank into the turn
        f.prev.set(x, y, z);
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
        "assets/butterfly.glb",
        (gltf) => {
            const src   = gltf.scene;
            const clips = gltf.animations || [];

            for (let i = 0; i < CONFIG.count; i++) {
                const model = THREE.SkeletonUtils
                    ? THREE.SkeletonUtils.clone(src)
                    : src.clone(true);

                // recentre the model on its own bounding-box centre so it
                // rotates/positions around its middle, not its feet
                const box = new THREE.Box3().setFromObject(model);
                const c = box.getCenter(new THREE.Vector3());
                model.position.sub(c);

                // pivot carries scale + flight transform; model sits centred inside
                const pivot = new THREE.Group();
                pivot.add(model);
                pivot.scale.setScalar(CONFIG.scale * rand(0.75, 1.2));
                scene.add(pivot);

                const mixer = new THREE.AnimationMixer(model);
                if (clips.length) {
                    const act = mixer.clipAction(clips[i % clips.length]);
                    act.timeScale = rand(0.8, 1.35);
                    act.play();
                }
                flyers.push(makeFlyer(pivot, mixer));
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
