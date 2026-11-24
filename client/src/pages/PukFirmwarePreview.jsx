import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './puk-firmware-preview.css';

/**
 * Browser twin of the PUK2 firmware screens in puk-firmware/main/display.c.
 * The web mockup at /demo/device is a separate page and is not used here.
 */

const DEVICE_LABEL = '26-DEV4';
const VERSION = 'Vers: 0.0.1g';
const ADMIN_PIN = '4321';
const QR_SECONDS = 30;
const NAV_IDLE_MS = 10000;
const SERVER = 'https://pukqr.com';

const BOOT = [
  { text: 'INITIALISING...', step: 1, ms: 900 },
  { text: 'Loading Campaign', step: 2, ms: 900 },
  { text: 'Verifying Device Location', step: 3, ms: 900 },
  { text: 'Loading Campaign Assets', step: 4, ms: 1100 },
  { text: 'Ready', step: 5, ms: 700 },
];

const CAMPAIGNS = [
  { id: 'audi-2026', name: 'Audi Instant Win', video: '/campaigns/audi/audi.mp4', bg: '/dev/puk/audi-2026/bg.jpg', enter: '/enter/audi-instant-win' },
  { id: 'ford-2026', name: 'Ford Display Lab', video: '/campaigns/ford/ford.mp4', bg: '/dev/puk/ford-2026/bg.jpg', enter: '/enter/ford' },
  { id: 'niterra-ngk-2026', name: 'Niterra', video: '/campaigns/niterra/ngk.mp4', bg: '', enter: '/enter/repco' },
  { id: 'hoka-2026', name: 'HOKA', video: '/campaigns/hoka/hoka.mp4', bg: '/dev/puk/hoka-2026/bg.jpg', enter: '/enter/hoka' },
  { id: 'castrol-2026', name: 'Castrol', video: '', bg: '/dev/puk/castrol-2026/bg.jpg', enter: '/enter/castrol' },
  { id: 'hankook-2026', name: 'Hankook', video: '', bg: '/dev/puk/hankook-2026/bg.jpg', enter: '/enter/hankook' },
];

const TERMS = 'Summary only. Full terms and conditions apply.\n\nEnter using this PUK as directed in store. Eligibility and the promotion period are set out in the full terms.\n\nScan the QR code below for the complete terms and conditions.';
const PRIVACY = 'Summary only. Full privacy statement applies.\n\nWe collect details you provide when you enter to run the promotion, verify eligibility and contact winners.\n\nScan the QR code below for the complete privacy statement.';

function qrUrl(campaign) {
  if (campaign.id === 'castrol-2026') {
    return `${SERVER}/enter/castrol?device=PR-PUK2-004`;
  }
  return `${SERVER}${campaign.enter}`;
}

function Close({ onClose }) {
  return (
    <button className="fw-close" type="button" aria-label="Close" onClick={onClose}>×</button>
  );
}

function MenuRow({ y, label, onClick }) {
  return (
    <button className="fw-row" type="button" style={{ top: y }} onClick={onClick}>
      {label}
      <span>»</span>
    </button>
  );
}

export default function PukFirmwarePreview() {
  const [boot, setBoot] = useState(BOOT[0]);
  const [booting, setBooting] = useState(true);
  const [bootRun, setBootRun] = useState(0);
  const [screen, setScreen] = useState('idle');
  const [campaignId, setCampaignId] = useState('hoka-2026');
  const [secs, setSecs] = useState(QR_SECONDS);
  const [pin, setPin] = useState('');
  const [pinBad, setPinBad] = useState(false);
  const [scale, setScale] = useState(1.4);
  const down = useRef(null);
  const lastTap = useRef(0);

  const campaign = CAMPAIGNS.find((c) => c.id === campaignId) || CAMPAIGNS[3];

  useEffect(() => {
    function fit() {
      const next = Math.min(1.7, Math.max(1, (window.innerHeight - 140) / 480));
      setScale(Number(next.toFixed(2)));
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBooting(true);
    setScreen('idle');
    setBoot(BOOT[0]);
    (async () => {
      for (const step of BOOT) {
        if (cancelled) return;
        setBoot(step);
        await new Promise((resolve) => setTimeout(resolve, step.ms));
      }
      if (!cancelled) setBooting(false);
    })();
    return () => { cancelled = true; };
  }, [bootRun]);

  useEffect(() => {
    const timed = screen === 'menu' || screen === 'terms' || screen === 'privacy'
      || screen === 'about' || screen === 'pin' || screen === 'admin' || screen === 'device';
    if (!timed || booting) return undefined;
    const id = setTimeout(() => setScreen('idle'), NAV_IDLE_MS);
    return () => clearTimeout(id);
  }, [screen, booting, pin]);

  useEffect(() => {
    if (screen !== 'qr') return undefined;
    setSecs(QR_SECONDS);
    const id = setInterval(() => {
      setSecs((n) => {
        if (n <= 1) {
          setScreen('idle');
          return QR_SECONDS;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen]);

  function closeMenu() {
    setScreen('idle');
    setPin('');
    setPinBad(false);
  }

  function onPointerDown(event) {
    if (booting || screen !== 'idle') return;
    down.current = { y: event.clientY, t: Date.now() };
  }

  function onPointerUp(event) {
    if (booting || screen !== 'idle' || !down.current) return;
    const dy = down.current.y - event.clientY;
    down.current = null;
    if (dy > 36) {
      setScreen('menu');
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 350) {
      lastTap.current = 0;
      setScreen('qr');
      return;
    }
    lastTap.current = now;
  }

  function pressPin(key) {
    setPinBad(false);
    if (key === 'b') {
      setPin((value) => value.slice(0, -1));
      return;
    }
    setPin((value) => {
      if (value.length >= 4) return value;
      const next = value + key;
      if (next.length === 4) {
        if (next === ADMIN_PIN) {
          setScreen('admin');
          return '';
        }
        setPinBad(true);
        return '';
      }
      return next;
    });
  }

  const adminScreen = screen === 'pin' || screen === 'admin' || screen === 'device' || screen === 'campaigns';
  const overlay = !booting && (screen === 'menu' || screen === 'terms' || screen === 'privacy' || screen === 'about');

  return (
    <div className="fw-page">
      <p className="fw-note">
        Firmware screen for PUK2, from the code on the desk unit. Swipe up for the menu. Double-click for the QR.
        The mockup stays at <a href="/demo/device">/demo/device</a>.
      </p>
      <div className="fw-stage" style={{ '--fw-scale': scale }}>
        <div
          className={`fw-panel${overlay ? ' fw-on-photo' : ''}`}
          style={{ '--fw-scale': scale }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {booting && (
            <div className="fw-boot">
              <div className="fw-glow" />
              <img className="fw-logo" src="/dev/puk/logo.png" alt="" />
              <div className="fw-center" style={{ top: 258, color: '#8b8b96', fontSize: 14 }}>
                PUK by Turnstyle Promotions
              </div>
              <div className="fw-center" style={{ top: 286, fontSize: 18 }}>
                Device ID: {DEVICE_LABEL}
              </div>
              <div className="fw-center" style={{ top: 312, color: '#8b8b96', fontSize: 14 }}>
                {VERSION}
              </div>
              <div className={`fw-status${boot.step >= 5 ? ' fw-status--ready' : ''}`}>{boot.text}</div>
              <div className="fw-bar"><span style={{ width: `${(boot.step / 5) * 100}%` }} /></div>
            </div>
          )}

          {!booting && campaign.video && (
            <video className="fw-video" src={campaign.video} autoPlay muted loop playsInline />
          )}

          {!booting && screen === 'qr' && (
            <div className="fw-qr">
              {campaign.bg
                ? <img className="fw-bg" src={campaign.bg} alt="" />
                : <div className="fw-full" style={{ background: '#000' }} />}
              <div className="fw-scan-label">SCAN to PLAY</div>
              <div className="fw-play-pad">
                <QRCodeSVG
                  value={qrUrl(campaign)}
                  size={232}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin
                  level="M"
                />
              </div>
              <div className="fw-cd">
                Expires: {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
              </div>
            </div>
          )}

          {!booting && adminScreen && <div className="fw-full" style={{ background: '#000' }} />}

          {overlay && (
            campaign.bg
              ? <img className="fw-bg" src={campaign.bg} alt="" />
              : <div className="fw-full" style={{ background: '#000' }} />
          )}

          {screen === 'menu' && (
            <>
              <Close onClose={closeMenu} />
              <div className="fw-title" style={{ top: 112 }}>Menu</div>
              <MenuRow y={164} label="Terms & Conditions" onClick={() => setScreen('terms')} />
              <MenuRow y={216} label="Privacy Statement" onClick={() => setScreen('privacy')} />
              <MenuRow y={268} label="About" onClick={() => setScreen('about')} />
              <MenuRow y={320} label="Admin" onClick={() => { setPin(''); setPinBad(false); setScreen('pin'); }} />
            </>
          )}

          {screen === 'terms' && (
            <>
              <Close onClose={closeMenu} />
              <div className="fw-title" style={{ top: 112 }}>Terms & Conditions</div>
              <div className="fw-legal-box" style={{ top: 156, height: 170 }}>{TERMS}</div>
              <div className="fw-qr-pad" style={{ left: 116, top: 340, width: 88, height: 88 }}>
                <QRCodeSVG value={`${SERVER}/legal/niterra-ngk-2026/terms`} size={76} />
              </div>
              <div className="fw-center" style={{ bottom: 10, color: '#5c5c66', fontSize: 14 }}>
                Scan for full terms
              </div>
            </>
          )}

          {screen === 'privacy' && (
            <>
              <Close onClose={closeMenu} />
              <div className="fw-title" style={{ top: 112 }}>Privacy Statement</div>
              <div className="fw-legal-box" style={{ top: 156, height: 170 }}>{PRIVACY}</div>
              <div className="fw-qr-pad" style={{ left: 116, top: 340, width: 88, height: 88 }}>
                <QRCodeSVG value={`${SERVER}/legal/niterra-ngk-2026/privacy`} size={76} />
              </div>
              <div className="fw-center" style={{ bottom: 10, color: '#5c5c66', fontSize: 14 }}>
                Scan for full privacy statement
              </div>
            </>
          )}

          {screen === 'about' && (
            <>
              <Close onClose={closeMenu} />
              <div className="fw-title" style={{ top: 112 }}>About</div>
              <div className="fw-legal-box" style={{ top: 156, height: 200 }}>
                {`${campaign.name}\n\nThe video on the home screen is the offer. Scan the code to play.`}
              </div>
            </>
          )}

          {screen === 'pin' && (
            <>
              <Close onClose={closeMenu} />
              <div className="fw-title" style={{ top: 48 }}>Admin</div>
              <div className="fw-center" style={{ top: 82, color: '#5c5c66', fontSize: 14 }}>
                Enter 4-digit code
              </div>
              <div className="fw-dots">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`fw-dot${pinBad ? ' fw-dot--bad' : ''}${i < pin.length && !pinBad ? ' fw-dot--on' : ''}`} />
                ))}
              </div>
              <div className="fw-center" style={{ top: 152, color: '#ff3333', fontSize: 16 }}>
                {pinBad ? 'Incorrect code' : ''}
              </div>
              <div className="fw-keys">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                  <button key={key} className="fw-key" type="button" onClick={() => pressPin(key)}>{key}</button>
                ))}
                <span />
                <button className="fw-key" type="button" onClick={() => pressPin('0')}>0</button>
                <button className="fw-key" type="button" onClick={() => pressPin('b')}>⌫</button>
              </div>
            </>
          )}

          {screen === 'admin' && (
            <>
              <Close onClose={closeMenu} />
              <div className="fw-title" style={{ top: 44 }}>Admin</div>
              <MenuRow y={96} label="Device" onClick={() => setScreen('device')} />
              <MenuRow y={148} label="Statistics" onClick={() => setScreen('device')} />
              <MenuRow y={200} label="Change campaign" onClick={() => setScreen('campaigns')} />
            </>
          )}

          {screen === 'device' && (
            <>
              <Close onClose={closeMenu} />
              <div className="fw-title" style={{ top: 48 }}>Device</div>
              <div className="fw-body" style={{ top: 180, left: 20, width: 280, textAlign: 'center', fontSize: 18 }}>
                {`${DEVICE_LABEL}\n\nCampaign: ${campaign.name}\nWi-Fi: Not connected\nMode: Offline demo`}
              </div>
            </>
          )}

          {screen === 'campaigns' && (
            <div className="fw-full" style={{ background: '#000' }}>
              <div className="fw-center" style={{ top: 16, color: '#00c8ff', fontSize: 24 }}>Campaign</div>
              <div className="fw-center" style={{ top: 52, color: '#8b8b96', fontSize: 18 }}>
                Tap to switch — * = active
              </div>
              <div className="fw-list">
                {CAMPAIGNS.map((item) => (
                  <button
                    key={item.id}
                    className={`fw-old-btn${item.id === campaignId ? ' fw-old-btn--on' : ''}`}
                    type="button"
                    onClick={() => { setCampaignId(item.id); setScreen('idle'); }}
                  >
                    {item.name}{item.id === campaignId ? '  *' : ''}
                  </button>
                ))}
              </div>
              <button className="fw-old-btn" type="button" style={{ position: 'absolute', left: 20, top: 396, width: 280 }} onClick={() => setScreen('menu')}>
                {'< Menu'}
              </button>
              <div className="fw-hint">Swipe down to close</div>
            </div>
          )}
        </div>
      </div>
      <button className="fw-replay" type="button" onClick={() => setBootRun((n) => n + 1)}>
        Replay boot
      </button>
    </div>
  );
}
