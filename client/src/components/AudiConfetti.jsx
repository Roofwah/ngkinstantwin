import { useEffect, useRef } from 'react';

const COLORS = ['#bb0a30', '#ffffff', '#c0c0c0', '#1a1a1a', '#e31837'];

export default function AudiConfetti({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let pieces = [];
    let frame = 0;
    let raf = 0;
    let running = true;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function spawn(count, originX) {
      for (let i = 0; i < count; i += 1) {
        pieces.push({
          x: originX + (Math.random() - 0.5) * 80,
          y: -12,
          w: 6 + Math.random() * 8,
          h: 8 + Math.random() * 10,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.2,
          vy: 2 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 2,
        });
      }
    }

    resize();
    window.addEventListener('resize', resize);
    spawn(80, canvas.width / 2);

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame += 1;
      if (frame % 8 === 0) spawn(6, canvas.width * (0.3 + Math.random() * 0.4));

      pieces = pieces.filter((p) => p.y < canvas.height + 20);
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

      if (frame < 240) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      pieces = [];
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="audi-confetti"
      aria-hidden
    />
  );
}
