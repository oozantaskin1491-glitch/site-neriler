/**
 * React Bits - StarBorder (Pure Vanilla JS Version)
 * Original React Component: @react-bits/StarBorder-JS-CSS
 */

(function() {
  const BLEED = 48;
  const LAP = 0.9;
  const TAU = Math.PI * 2;
  const WHITE = [255, 255, 255];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wrap = (value, total) => ((value % total) + total) % total;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (2 - 2 * t) ** 3 / 2);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (rgb, alpha) =>
    `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${clamp(alpha, 0, 1).toFixed(3)})`;

  let colorContext = null;
  const toRgb = color => {
    colorContext = colorContext ?? document.createElement('canvas').getContext('2d');
    if (!colorContext) return WHITE;
    colorContext.fillStyle = '#000000';
    colorContext.fillStyle = color;
    const value = String(colorContext.fillStyle);
    if (value.startsWith('#')) {
      const hex = parseInt(value.slice(1, 7), 16);
      return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
    }
    const parts = value.match(/[\d.]+/g)?.map(Number) ?? WHITE;
    return [parts[0], parts[1], parts[2]];
  };

  const outline = (width, height, radius) => {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    const arc = (Math.PI * r) / 2;
    const across = Math.max(0, width - 2 * r);
    const down = Math.max(0, height - 2 * r);
    const segments = [
      { length: across, x: r, y: 0, dx: 1, dy: 0, angle: null },
      { length: arc, x: width - r, y: r, dx: 0, dy: 0, angle: -Math.PI / 2 },
      { length: down, x: width, y: r, dx: 0, dy: 1, angle: null },
      { length: arc, x: width - r, y: height - r, dx: 0, dy: 0, angle: 0 },
      { length: across, x: width - r, y: height, dx: -1, dy: 0, angle: null },
      { length: arc, x: r, y: height - r, dx: 0, dy: 0, angle: Math.PI / 2 },
      { length: down, x: 0, y: height - r, dx: 0, dy: -1, angle: null },
      { length: arc, x: r, y: r, dx: 0, dy: 0, angle: Math.PI }
    ];
    return {
      r,
      segments,
      total: Math.max(
        1,
        segments.reduce((sum, segment) => sum + segment.length, 0)
      )
    };
  };

  const pointAt = (shape, distance, point) => {
    let s = wrap(distance, shape.total);
    for (const segment of shape.segments) {
      if (segment.length > 0 && s <= segment.length) {
        if (segment.angle === null) {
          point.x = segment.x + segment.dx * s;
          point.y = segment.y + segment.dy * s;
          point.nx = segment.dy;
          point.ny = -segment.dx;
        } else {
          const angle = segment.angle + s / shape.r;
          point.nx = Math.cos(angle);
          point.ny = Math.sin(angle);
          point.x = segment.x + point.nx * shape.r;
          point.y = segment.y + point.ny * shape.r;
        }
        return point;
      }
      s -= segment.length;
    }
    return point;
  };

  const project = (shape, px, py) => {
    let best = Infinity;
    let found = 0;
    let offset = 0;
    shape.segments.forEach(segment => {
      if (segment.length > 0) {
        let s = 0;
        let x = 0;
        let y = 0;
        if (segment.angle === null) {
          s = clamp((px - segment.x) * segment.dx + (py - segment.y) * segment.dy, 0, segment.length);
          x = segment.x + segment.dx * s;
          y = segment.y + segment.dy * s;
        } else {
          let angle = wrap(Math.atan2(py - segment.y, px - segment.x) - segment.angle, TAU);
          if (angle > Math.PI / 2) angle = angle > Math.PI * 1.25 ? 0 : Math.PI / 2;
          s = angle * shape.r;
          x = segment.x + Math.cos(segment.angle + angle) * shape.r;
          y = segment.y + Math.sin(segment.angle + angle) * shape.r;
        }
        const distance = (px - x) ** 2 + (py - y) ** 2;
        if (distance < best) {
          best = distance;
          found = offset + s;
        }
      }
      offset += segment.length;
    });
    return found;
  };

  function applyStarBorder(root, userOptions = {}) {
    if (!root) return null;
    const computedStyle = window.getComputedStyle(root);
    const parsedRadius = parseFloat(computedStyle.borderRadius) || 12;

    const s = Object.assign({
      color: '#ffffff',
      trailColor: '#ffffff',
      duration: 4,
      direction: 1, // clockwise
      stars: 1,
      trailLength: 0.3,
      thickness: 1,
      radius: parsedRadius,
      glow: 0.6,
      hover: 'lap',
      sparkle: false,
      clickPulse: true,
      light: false
    }, userOptions);

    root.classList.add('star-border');
    root.style.setProperty('--star-border-radius', `${s.radius}px`);
    root.style.setProperty('--star-border-thickness', `${s.thickness}px`);

    let canvas = root.querySelector('.star-border__light');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'star-border__light';
      canvas.setAttribute('aria-hidden', 'true');
      root.insertBefore(canvas, root.firstChild);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const point = { x: 0, y: 0, nx: 0, ny: -1 };
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      phase: 0,
      velocity: 0,
      motion: 0,
      lap: -1,
      time: 0,
      reveal: 1,
      boost: 0,
      flash: 0,
      hovered: false,
      visible: true
    };
    const pulses = [];
    const colors = {
      head: toRgb(s.color),
      tail: toRgb(s.trailColor)
    };
    let raf = 0;
    let last = performance.now();
    let alive = true;

    const measure = () => {
      state.width = root.offsetWidth;
      state.height = root.offsetHeight;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round((state.width + BLEED * 2) * state.dpr));
      canvas.height = Math.max(1, Math.round((state.height + BLEED * 2) * state.dpr));
      wake();
    };

    const local = event => {
      const rect = root.getBoundingClientRect();
      const scaleX = rect.width ? state.width / rect.width : 1;
      const scaleY = rect.height ? state.height / rect.height : 1;
      return [(event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY];
    };

    const shapeFor = () =>
      outline(
        Math.max(1, state.width - s.thickness),
        Math.max(1, state.height - s.thickness),
        s.radius - s.thickness / 2
      );

    const stroke = (x1, y1, x2, y2, width, style) => {
      ctx.lineWidth = width;
      ctx.strokeStyle = style;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const drawTrail = (shape, head, length, sign, intensity, tip = true) => {
      if (length < 0.5 || intensity <= 0) return;
      const steps = clamp(Math.ceil(length / 2), 2, 90);
      pointAt(shape, head, point);
      let px = point.x;
      let py = point.y;
      for (let i = 1; i <= steps; i++) {
        pointAt(shape, head - sign * length * (i / steps), point);
        const u = 1 - (i - 0.5) / steps;
        const fade = u * u * intensity;
        let tone = mix(colors.tail, colors.head, u);
        if (!s.light) tone = mix(tone, WHITE, u ** 6 * 0.65);
        ctx.lineCap = tip && i === 1 ? 'round' : 'butt';
        stroke(px, py, point.x, point.y, 2 + 6 * s.glow, rgba(tone, fade * 0.25 * s.glow));
        stroke(px, py, point.x, point.y, s.thickness, rgba(tone, fade));
        px = point.x;
        py = point.y;
      }
    };

    const drawHead = (x, y, intensity) => {
      if (intensity <= 0) return;
      const tone = colors.head;
      const reach = (12 + 35 * s.glow);
      const bloom = ctx.createRadialGradient(x, y, 0, x, y, reach);
      const strength = 0.45 * s.glow * intensity;
      bloom.addColorStop(0, rgba(tone, strength));
      bloom.addColorStop(0.2, rgba(tone, strength * 0.4));
      bloom.addColorStop(0.5, rgba(tone, strength * 0.1));
      bloom.addColorStop(1, rgba(tone, 0));
      ctx.fillStyle = bloom;
      ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);
    };

    const draw = (shape) => {
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      ctx.clearRect(0, 0, state.width + BLEED * 2, state.height + BLEED * 2);
      ctx.translate(BLEED + s.thickness / 2, BLEED + s.thickness / 2);

      const total = shape.total;
      const length = total * s.trailLength;
      const spacing = total / s.stars;
      const intensity = state.reveal * (1 + state.boost * 0.8 + state.flash * 1.2);
      const sign = s.direction;

      for (let i = 0; i < s.stars; i++) {
        const head = state.phase + i * spacing;
        drawTrail(shape, head, length, sign, Math.min(1.4, intensity));
      }

      pulses.forEach(pulse => {
        const progress = pulse.age / 0.65;
        const fade = (1 - progress) ** 2;
        const travel = (total / 2) * (1 - (1 - Math.min(1, pulse.age / 0.5)) ** 2);
        const tail = Math.min(travel, total * 0.16);
        [1, -1].forEach(way => {
          const front = pulse.origin + way * travel;
          drawTrail(shape, front, tail, way, fade);
          pointAt(shape, front, point);
          drawHead(point.x, point.y, fade * 0.9);
        });
      });

      for (let i = 0; i < s.stars; i++) {
        pointAt(shape, state.phase + i * spacing, point);
        drawHead(point.x, point.y, Math.min(1.4, intensity));
      }
    };

    const frame = now => {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      state.time += dt;

      const shape = shapeFor();
      const total = shape.total;
      const cruise = reduce ? 0 : (s.direction * total) / s.duration;

      state.flash *= Math.exp(-dt / 0.22);
      state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / 0.45));

      let extra = 0;
      if (state.lap >= 0) {
        const before = ease(Math.min(1, state.lap / LAP));
        state.lap += dt;
        extra = (ease(Math.min(1, state.lap / LAP)) - before) * total * s.direction;
        if (state.lap >= LAP) state.lap = -1;
      }
      state.motion = state.velocity + extra / dt;
      state.phase = wrap(state.phase + state.velocity * dt + extra, total);

      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].age += dt;
        if (pulses[i].age >= 0.65) pulses.splice(i, 1);
      }

      draw(shape);

      if (state.visible && (Math.abs(state.motion) > 0.05 || pulses.length > 0 || state.lap >= 0 || state.hovered)) {
        raf = requestAnimationFrame(frame);
      }
    };

    const wake = () => {
      if (raf || !alive || !state.visible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onEnter = () => {
      state.hovered = true;
      if (s.hover === 'lap' && state.lap < 0 && !reduce) state.lap = 0;
      wake();
    };

    const onLeave = () => {
      state.hovered = false;
      wake();
    };

    const pulse = origin => {
      if (!s.clickPulse) return;
      pulses.push({ origin, age: 0 });
      if (pulses.length > 4) pulses.shift();
      state.flash = 1;
      wake();
    };

    const onDown = event => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      const [x, y] = local(event);
      pulse(project(shapeFor(), x - s.thickness / 2, y - s.thickness / 2));
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);
    const visibility = new IntersectionObserver(entries => {
      state.visible = entries.some(entry => entry.isIntersecting);
      if (state.visible) wake();
    });
    visibility.observe(root);

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerdown', onDown);
    measure();

    return {
      wake,
      destroy: () => {
        alive = false;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        visibility.disconnect();
        root.removeEventListener('pointerenter', onEnter);
        root.removeEventListener('pointerleave', onLeave);
        root.removeEventListener('pointerdown', onDown);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  function initStarBorders(selectorOrElements, options = {}) {
    const elements = typeof selectorOrElements === 'string'
      ? document.querySelectorAll(selectorOrElements)
      : (selectorOrElements.length ? selectorOrElements : [selectorOrElements]);

    const instances = [];
    elements.forEach(el => {
      const inst = applyStarBorder(el, options);
      if (inst) instances.push(inst);
    });
    return instances;
  }

  window.initStarBorders = initStarBorders;
  window.applyStarBorder = applyStarBorder;
})();
