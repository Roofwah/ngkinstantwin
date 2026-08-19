import { useEffect, useRef } from 'react';

const COLORS = ['#dfff00', '#f7f4ee', '#ffffff', '#9cff57', '#071428'];

export default function HokaConfetti({ active }) {
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
          vx: (Math.random() - 0.5) * 3.2,
          vy: 0.8 + Math.random() * 1.6,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.08,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    function tick() {
      if (!running) return;
      frame += 1;
      if (frame === 1 || frame === 40 || frame === 90) {
        spawn(36, canvas.width * 0.5);
        spawn(14, canvas.width * 0.18);
        spawn(14, canvas.width * 0.82);
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces = pieces.filter((p) => p.y < canvas.height + 24);
      for (const p of pieces) {
        p.vy += 0.035;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (pieces.length || frame < 180) raf = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="hoka-confetti"
      aria-hidden="true"
    />
  );
}
