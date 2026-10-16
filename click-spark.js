/**
 * React Bits - ClickSpark (Pure Vanilla JS Version)
 * Original React Component: @react-bits/ClickSpark-JS-CSS
 */

(function() {
  const EASINGS = {
    linear: t => t,
    'ease-in': t => t * t,
    'ease-out': t => 1 - Math.pow(1 - t, 3),
    'ease-in-out': t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    spring: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2)
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function initClickSpark(userOptions = {}) {
    const options = Object.assign({
      sparkColor: '#fff',
      shape: 'line',
      sparkCount: 8,
      sparkSize: 14,
      sparkRadius: 30,
      sparkWidth: 2,
      duration: 500,
      easing: 'ease-out',
      randomness: 0.2,
      glow: 0.2
    }, userOptions);

    const canvas = document.createElement('canvas');
    canvas.className = 'click-spark-canvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const bursts = [];
    let raf = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    const easeFn = EASINGS[options.easing] || EASINGS['ease-out'];

    function createBurst(x, y) {
      const sparks = [];
      const count = clamp(Math.round(options.sparkCount), 1, 64);
      const spreadRad = Math.PI * 2;
      const color = options.sparkColor || '#ffffff';

      for (let i = 0; i < count; i++) {
        const fraction = count > 1 ? i / (count - 1) : 0.5;
        const offset = (fraction - 0.5) * spreadRad;
        const jitter = (Math.random() - 0.5) * spreadRad * options.randomness;
        const angle = offset + jitter;
        const speed = 1 - options.randomness * 0.5 + Math.random() * options.randomness;
        sparks.push({
          angle,
          color,
          scale: 1,
          reach: speed,
          life: 0.85 + Math.random() * 0.3
        });
      }

      bursts.push({
        x,
        y,
        startTime: performance.now(),
        duration: Math.max(60, options.duration),
        radius: Math.max(0, options.sparkRadius),
        size: Math.max(0, options.sparkSize),
        width: Math.max(0.5, options.sparkWidth),
        glow: options.glow || 0,
        sparks
      });

      if (!raf) raf = requestAnimationFrame(animate);
    }

    function animate(now) {
      raf = 0;
      ctx.clearRect(0, 0, width, height);

      for (let bIndex = bursts.length - 1; bIndex >= 0; bIndex--) {
        const burst = bursts[bIndex];
        const elapsed = now - burst.startTime;
        let anyActive = false;

        for (let sIndex = 0; sIndex < burst.sparks.length; sIndex++) {
          const spark = burst.sparks[sIndex];
          const life = burst.duration * spark.life;
          const p = elapsed / life;
          if (p >= 1) continue;

          anyActive = true;
          const e = easeFn(clamp(p, 0, 1));
          const distance = burst.radius * spark.reach * e;
          const strokeWidth = burst.width * spark.scale;
          const fade = 1 - smoothstep(0.55, 1, p);
          if (fade <= 0) continue;

          const length = burst.size * spark.scale * Math.pow(1 - p, 1.6);
          const x1 = burst.x + Math.cos(spark.angle) * distance;
          const y1 = burst.y + Math.sin(spark.angle) * distance;
          const x2 = burst.x + Math.cos(spark.angle) * (distance + Math.max(0.01, length));
          const y2 = burst.y + Math.sin(spark.angle) * (distance + Math.max(0.01, length));

          ctx.save();
          ctx.strokeStyle = spark.color;
          ctx.lineCap = 'round';

          if (burst.glow > 0) {
            ctx.globalAlpha = fade * 0.25 * burst.glow;
            ctx.lineWidth = strokeWidth * 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }

          ctx.globalAlpha = fade;
          ctx.lineWidth = strokeWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.restore();
        }

        if (!anyActive) {
          bursts.splice(bIndex, 1);
        }
      }

      if (bursts.length > 0) {
        raf = requestAnimationFrame(animate);
      }
    }

    window.addEventListener('pointerdown', (e) => {
      createBurst(e.clientX, e.clientY);
    }, { passive: true });

    return {
      burst: createBurst,
      destroy: () => {
        window.removeEventListener('resize', resize);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        cancelAnimationFrame(raf);
      }
    };
  }

  window.initClickSpark = initClickSpark;
})();
