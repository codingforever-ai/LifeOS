import { useEffect, useRef } from 'react';

interface Props {
  cursor: React.MutableRefObject<{ x: number; y: number }>;
  /** 'idle' | 'authenticating' | 'success' | 'error' */
  state: string;
}

interface Node { x: number; y: number; vx: number; vy: number; pulse: number; }

/** Abstract LifeOS intelligence visualization — nodes, faint connections, subtle activity.
 *  Responds to cursor and auth state. Restrained, never dominant. */
export default function NeuralField({ cursor, state }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPerf = (navigator.hardwareConcurrency ?? 4) <= 4;
    const nodeCount = reduced ? 8 : lowPerf ? 14 : 22;

    let w = 0, h = 0, dpr = 1;
    let nodes: Node[] = [];
    let disturb = 0; // error flash timer

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.08, vy: (Math.random() - 0.5) * 0.08,
      pulse: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let prevState = 'idle';
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const s = stateRef.current;
      if (s !== prevState) {
        if (s === 'error') disturb = 1;
        prevState = s;
      }
      disturb *= 0.94;
      const cx = cursor.current.x, cy = cursor.current.y;
      const authBoost = s === 'authenticating' ? 1.5 : s === 'success' ? 2 : 1;

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.01 + (authBoost - 1) * 0.008;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      // connections
      const maxDist = Math.min(w, h) * 0.28;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) {
            const op = (1 - d / maxDist) * 0.12 * authBoost;
            const hue = disturb > 0.05 ? `rgba(224,133,133,${op})` : `rgba(139,92,246,${op})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = hue; ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      // nodes
      for (const n of nodes) {
        const nx = (n.x / w - 0.5), ny = (n.y / h - 0.5);
        const cDist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);
        const focus = Math.max(0, 1 - cDist * 2.2);
        const r = 1.4 + Math.sin(n.pulse) * 0.5 + focus * 1.5 + (s === 'success' ? 1.5 : 0);
        const op = 0.25 + focus * 0.4 + (s === 'success' ? 0.3 : 0);
        const col = disturb > 0.05
          ? `rgba(224,133,133,${op})`
          : s === 'success'
            ? `rgba(205,190,252,${op})`
            : `rgba(167,139,250,${op})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [cursor]);

  return <canvas ref={ref} className="ax-bg-canvas ax-bg-neural" aria-hidden="true" />;
}
