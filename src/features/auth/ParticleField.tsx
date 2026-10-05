import { useEffect, useRef } from 'react';

interface Props { cursor: React.MutableRefObject<{ x: number; y: number }>; }

/** Drifting particle field — subtle, GPU-friendly canvas, cleans up on unmount. */
export default function ParticleField({ cursor }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPerf = (navigator.hardwareConcurrency ?? 4) <= 4;
    const count = reduced ? 0 : lowPerf ? 22 : 42;

    let w = 0, h = 0, dpr = 1;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.4 + 0.4, a: Math.random() * 0.5 + 0.15,
      });
    }

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = cursor.current.x, cy = cursor.current.y;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        const dx = (p.x / w - 0.5) - cx * 0.3;
        const dy = (p.y / h - 0.5) - cy * 0.3;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const glow = Math.max(0, 1 - dist * 2.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + glow * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${p.a + glow * 0.3})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    if (count > 0) raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [cursor]);

  return <canvas ref={ref} className="ax-bg-canvas ax-bg-particles" aria-hidden="true" />;
}
