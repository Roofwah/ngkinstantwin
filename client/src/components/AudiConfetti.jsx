import { useEffect, useRef, useState } from 'react';

const COLORS = ['#bb0a30', '#ffffff', '#c0c0c0', '#1a1a1a'];
const DURATION_MS = 3800;
const FADE_MS = 700;

export default function AudiConfetti({ active }) {
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let pieces = [];
    let frame = 0;
    let raf = 0;
    let running = true;
    const started = performance.now();

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function spawn(count, originX) {
      for (let i = 0; i < count; i += 1) {
        pieces.push({
          x: originX + (Math.random() - 0.5) * 100,
          y: -16 - Math.random() * 40,
          w: 5 + Math.random() * 6,
          h: 7 + Math.random() * 8,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.18,
          vy: 2.5 + Math.random() * 3.5,
          vx: (Math.random() - 0.5) * 1.8,
        });
      }
    }

    resize();
    window.addEventListener('resize', resize);
    spawn(60, canvas.width / 2);

    function tick(now) {
      if (!running) return;

      const elapsed = now - started;
      if (elapsed >= DURATION_MS) {
        running = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setVisible(false);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (elapsed > DURATION_MS - FADE_MS) {
        ctx.globalAlpha = 1 - (elapsed - (DURATION_MS - FADE_MS)) / FADE_MS;
      } else {
        ctx.globalAlpha = 1;
      }

      frame += 1;
      if (frame < 120 && frame % 10 === 0) {
        spawn(4, canvas.width * (0.25 + Math.random() * 0.5));
      }

      pieces = pieces.filter((p) => p.y < canvas.height + 30 && p.x > -30 && p.x < canvas.width + 30);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      pieces = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="audi-confetti"
      aria-hidden
    />
  );
}
