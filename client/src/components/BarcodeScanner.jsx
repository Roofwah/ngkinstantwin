import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BrowserCodeReader } from '@zxing/browser';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    startScanning();
    return () => {
      controlsRef.current?.stop();
      readerRef.current?.reset();
    };
  }, []);

  async function startScanning() {
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Find rear camera
      let deviceId;
      try {
        const devices = await BrowserCodeReader.listVideoInputDevices();
        const rear = devices.find(d => /back|rear|environment/i.test(d.label));
        deviceId = rear?.deviceId ?? devices[devices.length - 1]?.deviceId;
      } catch { /* use default */ }

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            controls?.stop();
            onScan(result.getText());
          }
        }
      );
      controlsRef.current = controls;
    } catch {
      setError('Camera access denied. Please allow camera access and try again.');
    }
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
        onClick={() => { controlsRef.current?.stop(); readerRef.current?.reset(); onClose(); }}
      >
        Cancel
      </button>
    </div>
  );
}
