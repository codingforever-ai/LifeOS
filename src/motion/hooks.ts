import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   LifeOS Motion Hooks
   ───────────────────────────────────────────────────────────────────
   Lightweight React hooks that complement the CSS motion system.
   No animation library — just IntersectionObserver + rAF + state.
   ═══════════════════════════════════════════════════════════════════ */

/** Detect prefers-reduced-motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/**
 * Scroll reveal — elements enter as they scroll into view.
 * Returns a ref to attach and the visibility state.
 * Usage: const ref = useReveal(); <div ref={ref} data-reveal={ref.visible ? 'visible' : ''} />
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: { threshold?: number; rootMargin?: string; once?: boolean }) {
  const { threshold = 0.12, rootMargin = '0px 0px -8% 0px', once = true } = options ?? {};
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, visible };
}

/**
 * Batch reveal — observe a container and reveal children sequentially
 * as they enter the viewport. Attaches data-reveal-state to children.
 * Usage: const ref = useStaggerReveal(); <div ref={ref}>...</div>
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>(selector = '[data-reveal]') {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const children = container.querySelectorAll<HTMLElement>(selector);
    if (children.length === 0) return;
    if (typeof IntersectionObserver === 'undefined') {
      children.forEach((c) => c.setAttribute('data-reveal-state', 'visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal-state', 'visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
    );
    children.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [selector]);

  return ref;
}

/**
 * Page transition direction — determines spatial direction based on
 * navigation order. Returns 'forward' | 'back' | 'up' | 'default'.
 */
const NAV_ORDER = [
  '/', '/tasks', '/calendar', '/goals', '/projects', '/milestones',
  '/habits', '/focus', '/progress', '/capacity', '/compass',
  '/patterns', '/agent', '/capture', '/create', '/search',
  '/deadlines', '/review', '/timeline', '/memory', '/decisions',
  '/experiments', '/accomplishments', '/alerts', '/connect', '/domains', '/settings', '/map',
];

export function usePageDirection(): 'forward' | 'back' | 'up' | 'default' {
  const [dir, setDir] = useState<'forward' | 'back' | 'up' | 'default'>('default');
  const prevIndex = useRef<number>(0);

  useEffect(() => {
    const path = window.location.pathname;
    const idx = NAV_ORDER.indexOf(path);
    if (idx === -1) { setDir('default'); return; }
    if (idx > prevIndex.current) setDir('forward');
    else if (idx < prevIndex.current) setDir('back');
    else setDir('default');
    prevIndex.current = idx;
  }, []);

  return dir;
}

/**
 * Animated number — smoothly interpolates between values using rAF.
 * Respects reduced motion (instant jump).
 */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const reduced = useReducedMotion();
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduced) { setDisplay(target); return; }
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      setDisplay(from + (to - from) * ease(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, reduced]);

  return display;
}

/**
 * View transition direction for Calendar-style navigation.
 * Tracks whether the user moved forward or backward in time.
 */
export function useNavDirection(): [string, (dir: 'forward' | 'back') => void] {
  const [dir, setDir] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(0);
  const set = useCallback((d: 'forward' | 'back') => {
    setDir(d);
    // Reset after animation completes so re-renders don't replay
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDir(''), 400);
  }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return [dir, set];
}
