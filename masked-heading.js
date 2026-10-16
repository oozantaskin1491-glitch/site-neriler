/**
 * React Bits - MaskedHeading (Pure Vanilla JS Version)
 * Original React Component: @react-bits/MaskedHeading-JS-CSS
 */

(function() {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const SPOT_MASK = `radial-gradient(circle var(--mh-spot-r, 180px) at var(--mh-spot-x, 50%) var(--mh-spot-y, 50%), ${Array.from(
    { length: 9 },
    (_, i) => {
      const t = i / 8;
      const u = clamp((t - 0.1) / 0.9, 0, 1);
      return `rgba(0, 0, 0, ${(u * u * u * (u * (u * 6 - 15) + 10)).toFixed(3)}) ${(t * 100).toFixed(1)}%`;
    }
  ).join(', ')})`;

  function initMaskedHeading(targetElement, userOptions = {}) {
    const root = typeof targetElement === 'string' ? document.querySelector(targetElement) : targetElement;
    if (!root) return null;

    const options = Object.assign({
      text: root.textContent.trim() || "Xentora Digital'e Hoş Geldiniz!",
      mediaType: 'video',
      src: 'reel.mp4',
      poster: 'bg.jpg',
      fillScale: 1.3,
      parallax: 34,
      drift: 18,
      hoverZoom: 0.05,
      brightness: 1.1,
      saturation: 1.2,
      spotlight: true,
      spotlightRadius: 180,
      outline: true,
      outlineColor: 'rgba(56, 189, 248, 0.4)',
      outlineWidth: 1.5,
      reveal: 'scale',
      duration: 1.1,
      stagger: 0.04,
      trigger: 'view'
    }, userOptions);

    const clipId = `mh-${Math.random().toString(36).slice(2, 9)}`;
    const words = String(options.text).split(/\s+/).filter(Boolean);
    const glyphs = words.flatMap((word, w) => Array.from(word).map(char => ({ char, w })));

    root.classList.add('masked-heading');
    root.innerHTML = `
      <span class="masked-heading__measure">
        ${words.map(w => `<span class="masked-heading__word">${w}<i class="masked-heading__baseline"></i></span>`).join('')}
      </span>
      <svg class="masked-heading__defs" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">
            ${glyphs.map(g => `<text>${g.char}</text>`).join('')}
          </clipPath>
        </defs>
      </svg>
      <span class="masked-heading__reveal">
        <span class="masked-heading__clip" style="clip-path: url(#${clipId}); --mh-spot-r: ${options.spotlightRadius}px;">
          <span class="masked-heading__media">
            ${options.mediaType === 'video' ? `
              <video class="masked-heading__source" src="${options.src || ''}" poster="${options.poster || ''}" autoPlay muted loop playsInline></video>
            ` : `
              <img class="masked-heading__source" src="${options.src || options.poster || ''}" alt="" draggable="false" />
            `}
          </span>
          ${options.spotlight ? `
            <span class="masked-heading__spot masked-heading__spot--tone"></span>
            <span class="masked-heading__spot masked-heading__spot--shade"></span>
          ` : ''}
        </span>
      </span>
      ${options.outline ? `
        <svg class="masked-heading__outline" aria-hidden="true" focusable="false" style="stroke: ${options.outlineColor}; stroke-width: ${options.outlineWidth}px;">
          ${glyphs.map(g => `<text>${g.char}</text>`).join('')}
        </svg>
      ` : ''}
    `;

    const measure = root.querySelector('.masked-heading__measure');
    const clip = root.querySelector('.masked-heading__clip');
    const media = root.querySelector('.masked-heading__media');
    const wordEls = Array.from(root.querySelectorAll('.masked-heading__word'));
    const baseEls = Array.from(root.querySelectorAll('.masked-heading__baseline'));
    const glyphEls = Array.from(root.querySelectorAll(`#${clipId} text`));
    const lineEls = Array.from(root.querySelectorAll('.masked-heading__outline text'));

    const spotTone = root.querySelector('.masked-heading__spot--tone');
    const spotShade = root.querySelector('.masked-heading__spot--shade');
    if (spotTone) {
      spotTone.style.maskImage = SPOT_MASK;
      spotTone.style.webkitMaskImage = SPOT_MASK;
    }
    if (spotShade) {
      spotShade.style.maskImage = SPOT_MASK;
      spotShade.style.webkitMaskImage = SPOT_MASK;
    }

    const boxes = [];
    const states = glyphs.map(() => ({ x: 0, y: 0, s: 1 }));
    const offset = { x: 0, y: 0, tx: 0, ty: 0, zoom: 0, px: 0, py: 0, sx: 0, sy: 0, lit: false };

    function sync() {
      if (!root || !measure) return;
      const cs = window.getComputedStyle(measure);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const rootRect = root.getBoundingClientRect();
      const range = document.createRange();
      boxes.length = 0;

      let glyphIndex = 0;
      wordEls.forEach((box, w) => {
        const base = baseEls[w];
        const node = box?.firstChild;
        if (!box || !base || !node || node.nodeType !== 3) return;
        const baseline = base.offsetTop;

        let charOffset = 0;
        for (const char of Array.from(node.data)) {
          range.setStart(node, charOffset);
          range.setEnd(node, charOffset + char.length);
          const rect = range.getBoundingClientRect();
          const left = rect.left - rootRect.left;
          const top = rect.top - rootRect.top;
          const width = rect.width;
          const height = rect.height;

          const cx = left + width / 2;
          const cy = top + height / 2;
          boxes.push({ cx, cy, lc: left });

          const glyph = glyphEls[glyphIndex];
          const line = lineEls[glyphIndex];
          [glyph, line].forEach(el => {
            if (!el) return;
            el.setAttribute('x', left.toFixed(2));
            el.setAttribute('y', baseline.toFixed(2));
            el.style.font = font;
          });

          glyphIndex++;
          charOffset += char.length;
        }
      });
      renderGlyphs();
    }

    function renderGlyphs() {
      for (let i = 0; i < glyphEls.length; i++) {
        const glyph = glyphEls[i];
        const line = lineEls[i];
        const box = boxes[i];
        const st = states[i];
        if (!box || !st) continue;

        if (st.x === 0 && st.y === 0 && st.s === 1) {
          if (glyph?.hasAttribute('transform')) glyph.removeAttribute('transform');
          if (line?.hasAttribute('transform')) line.removeAttribute('transform');
          continue;
        }

        const s = Math.max(st.s, 0.0001);
        const tx = box.cx * (1 - s) + st.x * (box.cx - box.lc);
        const ty = box.cy * (1 - s) + st.y;
        const transform = `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})`;

        if (glyph) glyph.setAttribute('transform', transform);
        if (line) line.setAttribute('transform', transform);
      }
    }

    function place() {
      if (!root || !media) return;
      const scale = options.fillScale * (1 + Math.max(0, offset.zoom));
      const maxX = Math.max(0, ((scale - 1) / 2) * root.clientWidth);
      const maxY = Math.max(0, ((scale - 1) / 2) * root.clientHeight);

      const transform = `translate3d(${clamp(offset.x, -maxX, maxX).toFixed(2)}px, ${clamp(offset.y, -maxY, maxY).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      media.style.transform = transform;

      if (clip && options.spotlight) {
        clip.style.setProperty('--mh-spot-x', `${offset.sx.toFixed(1)}px`);
        clip.style.setProperty('--mh-spot-y', `${offset.sy.toFixed(1)}px`);
      }
    }

    let raf = 0;
    let last = 0;
    let clock = 0;
    let hovering = false;
    let visible = true;

    function frame(now) {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;

      clock += dt;
      const dx = Math.sin(clock * 0.21) * options.drift;
      const dy = Math.cos(clock * 0.17) * options.drift * 0.6;
      const ease = 1 - Math.exp(-dt / 0.18);
      offset.x += (offset.tx + dx - offset.x) * ease;
      offset.y += (offset.ty + dy - offset.y) * ease;
      offset.zoom += ((hovering ? options.hoverZoom : 0) - offset.zoom) * (1 - Math.exp(-dt / 0.35));

      if (options.spotlight) {
        const w = root.clientWidth;
        const h = root.clientHeight;
        let gx = w / 2;
        let gy = h / 2;
        if (hovering) {
          gx = offset.px;
          gy = offset.py;
        } else {
          gx = w * (0.5 + 0.36 * Math.sin(clock * 0.37));
          gy = h * (0.5 + 0.22 * Math.sin(clock * 0.61 + 0.9));
        }
        if (!offset.lit) {
          offset.sx = gx;
          offset.sy = gy;
          offset.lit = true;
        } else {
          const follow = 1 - Math.exp(-dt / (hovering ? 0.12 : 0.6));
          offset.sx += (gx - offset.sx) * follow;
          offset.sy += (gy - offset.sy) * follow;
        }
      }

      place();
      if (visible) raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (raf || !visible) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / (r.width || 1)) * 2 - 1;
      const ny = ((e.clientY - r.top) / (r.height || 1)) * 2 - 1;
      offset.tx = clamp(nx, -1, 1) * -Math.max(0, options.parallax);
      offset.ty = clamp(ny, -1, 1) * -Math.max(0, options.parallax);
      offset.px = ((e.clientX - r.left) / (r.width || 1)) * root.clientWidth;
      offset.py = ((e.clientY - r.top) / (r.height || 1)) * root.clientHeight;
      wake();
    });

    root.addEventListener('pointerenter', (e) => {
      hovering = e.pointerType !== 'touch';
      wake();
    });

    root.addEventListener('pointerleave', () => {
      hovering = false;
      offset.tx = 0;
      offset.ty = 0;
      wake();
    });

    function playReveal() {
      if (typeof window.gsap !== 'undefined') {
        states.forEach(st => { st.s = 0; st.y = 20; });
        renderGlyphs();
        window.gsap.to(states, {
          y: 0,
          s: 1,
          duration: options.duration,
          stagger: options.stagger,
          ease: 'expo.out',
          onUpdate: renderGlyphs
        });
      } else {
        // Fallback smooth native scale reveal
        const startTime = performance.now();
        const duration = options.duration * 1000;
        function step(now) {
          const elapsed = now - startTime;
          let allDone = true;
          states.forEach((st, i) => {
            const delay = i * (options.stagger * 1000);
            const p = clamp((elapsed - delay) / (duration * 0.7), 0, 1);
            if (p < 1) allDone = false;
            // Expo out curve: 1 - 2^(-10 * p)
            const easeVal = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            st.s = easeVal;
            st.y = (1 - easeVal) * 20;
          });
          renderGlyphs();
          if (!allDone) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
    }

    const ro = new ResizeObserver(() => sync());
    ro.observe(root);
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => sync());
    }
    sync();

    if (options.trigger === 'view') {
      const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          playReveal();
          io.disconnect();
        }
      }, { threshold: 0.2 });
      io.observe(root);
    } else {
      playReveal();
    }

    wake();

    return {
      sync,
      wake,
      destroy: () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
      }
    };
  }

  window.initMaskedHeading = initMaskedHeading;
})();
