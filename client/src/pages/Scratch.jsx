import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClaim, revealClaim } from '../api';

const RESULT_CONFIG = {
  TIER_1_INSTANT_WIN:    { label: 'INSTANT PRIZE!',       color: '#00e676' },
  TIER_2_PROVISIONAL_WIN:{ label: 'PROVISIONAL WIN',      color: '#ffab00' },
  TIER_3_PROVISIONAL_WIN:{ label: 'PREMIUM WIN!',         color: '#ff5252' },
  NOT_WINNER:            { label: 'DRAW ENTRY CONFIRMED', color: '#448aff' },
};

export default function Scratch() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    getClaim(claimId)
      .then(data => { setClaim(data); setLoading(false); })
      .catch(() => navigate('/'));
  }, [claimId, navigate]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Silver scratch-off gradient
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0,   '#5a5a5a');
    g.addColorStop(0.2, '#8a8a8a');
    g.addColorStop(0.5, '#aaaaaa');
    g.addColorStop(0.8, '#7a7a7a');
    g.addColorStop(1,   '#4a4a4a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Subtle horizontal lines for metallic texture
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 3) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Holographic shimmer dots
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // "Scratch here" instruction
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = 'bold 17px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▽  SCRATCH TO REVEAL  ▽', W / 2, H / 2 - 10);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillText('Use your finger or mouse', W / 2, H / 2 + 16);
  }, []);

  useEffect(() => {
    if (claim && canvasRef.current && !revealed) initCanvas();
  }, [claim, revealed, initCanvas]);

  function getCanvasPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * sx,
      y: (src.clientY - rect.top) * sy,
    };
  }

  function scratchAt(x, y) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';

    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = 44;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    lastPos.current = { x, y };
    checkProgress();
  }

  function checkProgress() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    const total = data.length / 4;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 128) cleared++;
    }
    const pct = (cleared / total) * 100;
    setProgress(pct);
    if (pct > 60 && !revealed) doReveal();
  }

  async function doReveal() {
    if (revealed) return;
    setRevealed(true);

    // Fade out canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    try { await revealClaim(claimId); } catch (_) { /* best-effort */ }

    setNavigating(true);
    setTimeout(() => navigate(`/result/${claimId}`), 1800);
  }

  if (loading) {
    return (
      <div className="scratch-page">
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  const cfg = RESULT_CONFIG[claim?.result] || RESULT_CONFIG.NOT_WINNER;

  return (
    <div className="scratch-page">
      <div className="scratch-container">
        {/* Eyebrow */}
        <p style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
          Repco Rewards × NGK / NTK / KYB
        </p>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>
          Your Scratch Card
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 0 }}>
          Scratch the silver panel to reveal your result.
        </p>

        {/* The card */}
        <div className="scratch-card-wrap">
          {/* Prize content layer (always rendered under canvas) */}
          <div className="scratch-prize-bg">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: cfg.color, letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.2 }}>
              {cfg.label}
            </div>
            {claim?.prizeName && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', textAlign: 'center' }}>
                {claim.prizeName}
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 4 }}>
              Claim #{claimId?.slice(0, 8)}
            </div>
          </div>

          {/* Scratch canvas overlay */}
          {!revealed && (
            <canvas
              ref={canvasRef}
              width={320}
              height={220}
              className="scratch-canvas"
              onMouseDown={e => { isDrawing.current = true; lastPos.current = null; scratchAt(...Object.values(getCanvasPos(e, e.currentTarget))); }}
              onMouseMove={e => { if (isDrawing.current) scratchAt(...Object.values(getCanvasPos(e, e.currentTarget))); }}
              onMouseUp={() => { isDrawing.current = false; lastPos.current = null; }}
              onMouseLeave={() => { isDrawing.current = false; lastPos.current = null; }}
              onTouchStart={e => { e.preventDefault(); isDrawing.current = true; lastPos.current = null; scratchAt(...Object.values(getCanvasPos(e, e.currentTarget))); }}
              onTouchMove={e => { e.preventDefault(); if (isDrawing.current) scratchAt(...Object.values(getCanvasPos(e, e.currentTarget))); }}
              onTouchEnd={() => { isDrawing.current = false; lastPos.current = null; }}
            />
          )}
        </div>

        {/* Progress bar */}
        {!revealed && (
          <div className="scratch-progress-bar">
            <div className="scratch-progress-bar__fill" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        )}

        {/* Manual reveal button */}
        {!revealed && (
          <button
            className="btn btn--ghost btn--full mt-16"
            onClick={doReveal}
            style={{ fontSize: '0.85rem', padding: '10px' }}
          >
            Tap to Reveal Instead
          </button>
        )}

        {/* Navigating feedback */}
        {navigating && (
          <div className="alert alert--success mt-16">
            <span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />
            Revealing your result…
          </div>
        )}

        <p className="compliance-note mt-16">
          The scratch card is cosmetic only. Your prize outcome was determined server-side
          by the PureRandom prize manifest before this page loaded.
        </p>
      </div>
    </div>
  );
}
