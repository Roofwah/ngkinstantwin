import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, []);

  async function startCamera() {
    if (!window.BarcodeDetector) {
      setError('Barcode scanning is not supported on this browser. Please type the invoice number manually.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scan();
      }
    } catch {
      setError('Camera access denied. Please allow camera access and try again.');
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  function scan() {
    const detector = new window.BarcodeDetector({
      formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'itf'],
    });

    async function tick() {
      const vid = videoRef.current;
      if (!vid || vid.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        const results = await detector.detect(vid);
        if (results.length > 0) {
          stopCamera();
          onScan(results[0].rawValue);
          return;
        }
      } catch { /* keep scanning */ }
      rafRef.current = requestAnimationFrame(tick);
    }
    tick();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      {error ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', maxWidth: 320 }}>
          <p style={{ marginBottom: 20 }}>{error}</p>
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 16, textTransform: 'uppercase' }}>
            Point barcode at the box
          </p>

          <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
            <video
              ref={videoRef}
              style={{ width: '100%', display: 'block', borderRadius: 8 }}
              playsInline
              muted
            />
            {/* Targeting window */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: '85%', height: 72,
                border: '2px solid var(--green)',
                borderRadius: 6,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              }} />
            </div>
          </div>
        </>
      )}

      <button
        className="btn btn--ghost"
        style={{ marginTop: 28 }}
        onClick={() => { stopCamera(); onClose(); }}
      >
        Cancel
      </button>
    </div>
  );
}
