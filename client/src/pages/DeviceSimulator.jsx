import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { issueToken, pollTokenStatus, getDeviceConfig, setDemoCampaign } from '../api';
import { getPukHardware, listPukHardware, pukHardwarePath } from '../config/pukHardware';

// ─── Device states ────────────────────────────────────────────────
const STATE = {
  IDLE:       'IDLE',
  GENERATING: 'GENERATING',
  READY:      'READY',
  SCANNED:    'SCANNED',
  REDEEMED:   'REDEEMED',
  EXPIRED:    'EXPIRED',
  ERROR:      'ERROR',
};

// Slideshow / FAQ presentation keyed by backend campaign id
const CAMPAIGN_UI = {
  'niterra-ngk-2026': {
    sub: 'NGK / NTK / KYB',
    color: '#e86600',
    slides: [
      { headline: 'INSTANT WIN', sub: 'Buy NGK · NTK · KYB', src: '/campaigns/niterra/slide1.jpg' },
      { headline: 'SCAN & WIN', sub: 'Prize drawn instantly', src: '/campaigns/niterra/slide2.jpg' },
      { headline: 'UP TO $500', sub: 'In prizes to be won',  src: '/campaigns/niterra/slide3.jpg' },
      { headline: 'EVERY PURCHASE', sub: 'Earns a scan',     src: '/campaigns/niterra/slide4.jpg' },
    ],
    faq: [
      { q: 'Campaign', a: 'Niterra Instant Win — NGK, NTK & KYB products at participating stores.' },
      { q: 'Start date', a: '1 July 2026' },
      { q: 'End date', a: '31 August 2026' },
      { q: 'How to enter', a: 'Purchase any eligible NGK, NTK or KYB product from a participating store. Ask staff to issue a QR code on this device, then scan with your phone.' },
      { q: 'Prizes', a: 'Tier 1: $50 gift card (1 in 5 chance). Tier 2: $200 gift card (1 in 12). Tier 3: $500 tool kit (1 in 30). All other valid entries receive a weekly draw entry.' },
    ],
  },
  'cocacola-2026': {
    sub: 'Refresh & Win',
    color: '#E8112D',
    slides: [
      { headline: 'REFRESH & WIN', sub: 'Coca-Cola Promotion' },
      { headline: 'SCAN TO PLAY', sub: 'Instant prizes await' },
      { headline: 'WIN DAILY', sub: 'New prizes every day' },
      { headline: 'BUY & SCAN', sub: 'Every Coke counts' },
    ],
    faq: [
      { q: 'Campaign', a: 'Coca-Cola Refresh & Win — participating convenience and grocery stores.' },
      { q: 'How to enter', a: 'Purchase any participating Coca-Cola product and ask staff for an instant win QR code.' },
    ],
  },
  'castrol-2026': {
    sub: 'Power Up & Win',
    color: '#00a84a',
    slides: [
      { headline: 'POWER UP', sub: 'Castrol Motor Oil',   src: '/campaigns/castrol/1.jpg' },
      { headline: 'WIN INSTANTLY', sub: 'On every purchase', src: '/campaigns/castrol/2.jpg' },
      { headline: 'PROTECT & WIN', sub: 'Premium engine care', src: '/campaigns/castrol/3.jpg' },
      { headline: 'SCAN TO PLAY', sub: 'Your prize awaits',  src: '/campaigns/castrol/4.jpg' },
    ],
    faq: [
      { q: 'Campaign', a: 'Castrol Power Up & Win — participating auto parts and service stores.' },
      { q: 'How to enter', a: 'Buy any participating Castrol product and ask for your instant win scan.' },
    ],
  },
  'vb-2026': {
    sub: 'Hard Earned Wins',
    color: '#C9A84C',
    slides: [
      { headline: 'HARD EARNED', sub: 'Victoria Bitter' },
      { headline: 'WIN PRIZES', sub: 'A reward for effort' },
      { headline: 'SCAN & WIN', sub: 'Every purchase counts' },
      { headline: 'COLD & GOLDEN', sub: 'Just like your prize' },
    ],
    faq: [
      { q: 'Campaign', a: 'VB Hard Earned Wins — participating bottle shops and venues nationally.' },
      { q: 'How to enter', a: 'Purchase participating VB products and receive your instant win scan at the counter. Must be 18+.' },
    ],
  },
  'redbull-2026': {
    sub: 'Gives You Wings',
    color: '#003087',
    slides: [
      { headline: 'WINGS', sub: 'Red Bull Instant Win' },
      { headline: 'SCAN TO PLAY', sub: 'Instant prizes await' },
      { headline: 'FUEL UP', sub: 'Every can counts' },
      { headline: 'WIN NOW', sub: 'Your moment starts here' },
    ],
    faq: [
      { q: 'Campaign', a: 'Red Bull Instant Win — participating convenience and grocery stores.' },
      { q: 'How to enter', a: 'Purchase participating Red Bull products and ask staff for your QR code.' },
    ],
  },
  'hoka-2026': {
    sub: 'Cotswold Outdoor × HOKA',
    color: '#dfff00',
    slides: [
      { headline: 'WIN YOUR PURCHASE BACK', sub: 'HOKA Instant Win', src: '/campaigns/hoka/slide1.jpg' },
      { headline: 'SCAN TO PLAY', sub: 'Spend $50 on HOKA', src: '/campaigns/hoka/slide2.jpg' },
      { headline: 'INSTANT PRIZES', sub: 'Up to $200 back', src: '/campaigns/hoka/slide3.jpg' },
      { headline: 'COTSWOLD BIRMINGHAM', sub: 'Ask staff for a scan', src: '/campaigns/hoka/slide5.jpg' },
    ],
    faq: [
      { q: 'Campaign', a: 'HOKA Scan to Win at Cotswold Outdoor — spend $50 or more on qualifying HOKA products in one transaction.' },
      { q: 'Start date', a: '1 August 2026' },
      { q: 'End date', a: '31 August 2026' },
      { q: 'How to enter', a: 'Ask staff to issue a QR on this PUK, scan with your phone, verify your mobile, and instantly see what you won.' },
      { q: 'Prizes', a: 'Qualifying HOKA spend back, up to $200, plus instant prizes.' },
    ],
  },
};

function mergeCampaign(apiCampaign) {
  const ui = CAMPAIGN_UI[apiCampaign.id] || {};
  return {
    id: apiCampaign.id,
    name: apiCampaign.name,
    sub: apiCampaign.brand || ui.sub || '',
    color: apiCampaign.config?.themeColor || ui.color || '#888',
    slides: ui.slides || [{ headline: apiCampaign.name, sub: apiCampaign.tagline || '' }],
    faq: ui.faq || [{ q: 'Campaign', a: apiCampaign.mechanic || apiCampaign.tagline || '' }],
  };
}

const DEFAULT_CAMPAIGN = mergeCampaign({
  id: 'niterra-ngk-2026',
  name: 'Niterra',
  brand: 'NGK / NTK / KYB',
  tagline: '',
  config: { themeColor: '#e86600' },
});

export default function DeviceSimulator() {
  const { hwId } = useParams();
  const navigate = useNavigate();
  const hw = getPukHardware(hwId);
  const SCREEN = hw.screen;
  const DEVICE_CODE = hw.deviceCode;

  const [campaign, setCampaign]       = useState(DEFAULT_CAMPAIGN);
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [deviceState, setDeviceState] = useState(STATE.IDLE);
  const [tokenData, setTokenData]     = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const [timeLeft, setTimeLeft]       = useState(null);
  const [ledColor, setLedColor]       = useState(null);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [tapPending, setTapPending]     = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [hardwareModalOpen, setHardwareModalOpen] = useState(false);
  const [deviceScale, setDeviceScale] = useState(1);

  const pollRef      = useRef(null);
  const timerRef     = useRef(null);
  const stateRef     = useRef(deviceState);
  const lastTapRef   = useRef(0);
  const tapTimerRef  = useRef(null);
  const ptrDownY     = useRef(null);
  const ptrDownTime  = useRef(null);
  stateRef.current   = deviceState;

  const stopAll = useCallback(() => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  useEffect(() => {
    let cancelled = false;
    getDeviceConfig(DEVICE_CODE)
      .then((data) => {
        if (cancelled) return;
        setCampaign(mergeCampaign(data.campaign));
        setCampaignOptions((data.availableCampaigns || []).map((c) => mergeCampaign(c)));
      })
      .catch((err) => console.warn('Device config load failed:', err.message));
    return () => { cancelled = true; };
  }, [DEVICE_CODE]);

  useEffect(() => {
    const prevTitle = document.title;
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.title = 'PureRandom PUK Simulator';

    let appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const createdMeta = !appTitleMeta;
    const prevAppTitle = appTitleMeta?.getAttribute('content') ?? '';
    if (!appTitleMeta) {
      appTitleMeta = document.createElement('meta');
      appTitleMeta.setAttribute('name', 'apple-mobile-web-app-title');
      document.head.appendChild(appTitleMeta);
    }
    appTitleMeta.setAttribute('content', 'PUK Simulator');

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.title = prevTitle;
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      if (createdMeta && appTitleMeta?.parentNode) {
        appTitleMeta.parentNode.removeChild(appTitleMeta);
      } else if (appTitleMeta) {
        appTitleMeta.setAttribute('content', prevAppTitle);
      }
    };
  }, []);

  useEffect(() => {
    function updateScale() {
      const headerH = 52;
      const footerH = tokenData && deviceState !== STATE.IDLE ? 36 : 0;
      const pad = 16;
      const availW = window.innerWidth - pad * 2;
      const availH = window.innerHeight - headerH - footerH - pad;
      setDeviceScale(Math.min(1, availW / hw.bodyW, availH / hw.bodyH));
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [tokenData, deviceState, hw.bodyW, hw.bodyH]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'g' || e.key === 'G') handleGenerate();
      if (e.key === 'm' || e.key === 'M') handleReset();
      if (e.key === 'Escape') {
        setCampaignModalOpen(false);
        setHardwareModalOpen(false);
        setMenuOpen(false);
        setActivePanel(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function blinkLed(color) {
    setLedColor(color);
    setTimeout(() => setLedColor(null), 2500);
  }

  async function handleGenerate() {
    if (deviceState === STATE.GENERATING) return;
    setMenuOpen(false);
    setActivePanel(null);
    setTapPending(false);
    stopAll();
    setTokenData(null);
    setTimeLeft(null);
    setDeviceState(STATE.GENERATING);
    setErrorMsg('');

    try {
      const data = await issueToken(DEVICE_CODE);
      setTokenData(data);
      setDeviceState(STATE.READY);
      blinkLed('#00e676');

      // 60-second display countdown — screen returns home when it hits 0
      // Token itself stays valid server-side for 10 minutes
      const DISPLAY_MS = 60 * 1000;
      const displayEnd = Date.now() + DISPLAY_MS;

      timerRef.current = setInterval(() => {
        const rem = Math.max(0, displayEnd - Date.now());
        setTimeLeft(rem);
        if (rem === 0) {
          clearInterval(timerRef.current);
          if (stateRef.current === STATE.READY || stateRef.current === STATE.SCANNED) {
            // Return home silently — token stays valid, customer may still scan
            stopAll();
            setDeviceState(STATE.IDLE);
            setTokenData(null);
            setTimeLeft(null);
          }
        }
      }, 1000);

      pollRef.current = setInterval(async () => {
        const s = stateRef.current;
        if (s !== STATE.READY && s !== STATE.SCANNED) { clearInterval(pollRef.current); return; }
        try {
          const { status } = await pollTokenStatus(data.token);
          if (status === 'scanned' && stateRef.current === STATE.READY) {
            setDeviceState(STATE.SCANNED);
            blinkLed('#ffab00');
          } else if (status === 'redeemed') {
            setDeviceState(STATE.REDEEMED);
            stopAll();
            blinkLed('#00e676');
          } else if (status === 'expired') {
            // Server says expired — return home quietly
            stopAll();
            setDeviceState(STATE.IDLE);
            setTokenData(null);
            setTimeLeft(null);
          }
        } catch { /* retry next tick */ }
      }, 3000);

    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate token');
      setDeviceState(STATE.ERROR);
      blinkLed('#ff5252');
    }
  }

  function handleReset() {
    if (deviceState === STATE.GENERATING) return;
    stopAll();
    setTokenData(null);
    setTimeLeft(null);
    setErrorMsg('');
    setDeviceState(STATE.IDLE);
    setLedColor(null);
    setMenuOpen(false);
    setActivePanel(null);
    setTapPending(false);
    clearTimeout(tapTimerRef.current);
    lastTapRef.current = 0;
  }

  // Unified pointer handler for swipe-up and double-tap
  function handlePtrDown(e) {
    ptrDownY.current   = e.clientY ?? e.touches?.[0]?.clientY;
    ptrDownTime.current = Date.now();
  }

  function handlePtrUp(e) {
    if (ptrDownY.current === null) return;
    const endY   = e.clientY ?? e.changedTouches?.[0]?.clientY;
    const deltaY = ptrDownY.current - endY;
    const deltaT = Date.now() - ptrDownTime.current;
    ptrDownY.current = null;
    ptrDownTime.current = null;

    if (Math.abs(deltaY) > 40) {
      // Swipe gesture
      if (deltaY > 0 && !menuOpen) {
        setMenuOpen(true);
        setActivePanel(null);
      } else if (deltaY < 0 && menuOpen) {
        setMenuOpen(false);
        setActivePanel(null);
      }
      return;
    }

    // Short tap
    if (deltaT < 400 && Math.abs(deltaY) < 12) {
      if (menuOpen || activePanel) return;

      if (deviceState === STATE.IDLE) {
        // Double-tap to generate
        const now = Date.now();
        if (now - lastTapRef.current < 380) {
          clearTimeout(tapTimerRef.current);
          setTapPending(false);
          lastTapRef.current = 0;
          handleGenerate();
        } else {
          lastTapRef.current = now;
          setTapPending(true);
          tapTimerRef.current = setTimeout(() => setTapPending(false), 450);
        }
      } else if (deviceState === STATE.READY || deviceState === STATE.SCANNED) {
        // Single tap → return home; token stays valid server-side
        handleReset();
      } else if (deviceState === STATE.REDEEMED || deviceState === STATE.EXPIRED || deviceState === STATE.ERROR) {
        // Token is done — go straight back
        handleReset();
      }
    }
  }

  function formatTime(ms) {
    if (ms === null) return '--:--';
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  const tokenUrl   = tokenData
    ? (tokenData.url || `${window.location.origin}/t/${tokenData.token}`)
    : '';
  const isExpiring = timeLeft !== null && timeLeft < 90000;

  async function selectCampaign(c) {
    try {
      const data = await setDemoCampaign(c.id);
      const next = data.config?.campaign ? mergeCampaign(data.config.campaign) : c;
      setCampaign(next);
      setCampaignModalOpen(false);
      handleReset();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to switch campaign');
      setDeviceState(STATE.ERROR);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      height: '100dvh',
      maxHeight: '100dvh',
      overflow: 'hidden',
      touchAction: 'none',
      background: 'radial-gradient(ellipse 120% 80% at 50% 40%, #2e2e48 0%, #1a1a2e 50%, #0d0d18 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'var(--font-body)',
    }}>

      {/* Header */}
      <header style={{
        flexShrink: 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        boxSizing: 'border-box',
      }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#888',
            margin: 0,
            letterSpacing: '0.04em',
          }}>
            PureRandom PUK Simulator
          </p>
          <p style={{ fontSize: '0.62rem', color: '#3a3a3a', letterSpacing: '0.08em', margin: '2px 0 0' }}>
            {hw.shortLabel} &middot; {DEVICE_CODE} &middot; {campaign.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setHardwareModalOpen(true)}
            style={{
              padding: '8px 12px',
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              color: '#888',
              fontFamily: 'monospace',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Hardware
          </button>
          <button
            type="button"
            onClick={() => setCampaignModalOpen(true)}
            style={{
              padding: '8px 12px',
              background: '#111',
              border: `1px solid ${campaign.color}44`,
              borderRadius: 8,
              color: campaign.color,
              fontFamily: 'monospace',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Campaign
          </button>
        </div>
      </header>

      {/* Device — scaled to fit viewport */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        overflow: 'hidden',
      }}>
      <div style={{
        position: 'relative',
        width: hw.bodyW,
        height: hw.bodyH,
        transform: `scale(${deviceScale})`,
        transformOrigin: 'center center',
        filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.35))',
      }}>

        {/* Layer 1: CSS chassis when no body PNG */}
        {!hw.bodySrc && (
          <PanelChassis hw={hw} />
        )}

        {/* Layer 2: Live screen */}
        <div
          style={{
            position: 'absolute',
            top: SCREEN.top, left: SCREEN.left,
            width: SCREEN.width, height: SCREEN.height,
            borderRadius: SCREEN.radius,
            background: '#000',
            overflow: 'hidden',
            zIndex: 1,
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onMouseDown={handlePtrDown}
          onMouseUp={handlePtrUp}
          onTouchStart={handlePtrDown}
          onTouchEnd={handlePtrUp}
        >
          <ScreenContent
            state={deviceState}
            campaign={campaign}
            tokenData={tokenData}
            tokenUrl={tokenUrl}
            timeLeft={timeLeft}
            errorMsg={errorMsg}
            formatTime={formatTime}
            isExpiring={isExpiring}
            screenW={SCREEN.width}
            screenH={SCREEN.height}
            qrScale={hw.qrScale}
            tapPending={tapPending}
            menuOpen={menuOpen}
            activePanel={activePanel}
            onOpenMenu={() => { setMenuOpen(true); setActivePanel(null); }}
            onCloseMenu={() => { setMenuOpen(false); setActivePanel(null); }}
            onOpenPanel={p => setActivePanel(p)}
            onClosePanel={() => setActivePanel(null)}
          />
          {/* Screen glass sheen */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '30%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
            borderRadius: `${SCREEN.radius}px ${SCREEN.radius}px 0 0`,
            pointerEvents: 'none',
          }} />
        </div>

        {/* Layer 3: Body PNG */}
        {hw.bodySrc && (
          <img
            src={hw.bodySrc}
            width={hw.bodyW} height={hw.bodyH}
            draggable={false} alt=""
            style={{
              position: 'absolute', inset: 0, zIndex: 2,
              width: '100%', height: '100%',
              display: 'block',
              userSelect: 'none', pointerEvents: 'none',
              filter: 'brightness(0.40) contrast(1.1)',
            }}
          />
        )}

        {/* Layer 4: Glass overlay */}
        {hw.glassSrc && (
          <img
            src={hw.glassSrc}
            width={hw.bodyW} height={hw.bodyH}
            draggable={false} alt=""
            style={{
              position: 'absolute', inset: 0, zIndex: 3,
              width: '100%', height: '100%',
              display: 'block',
              pointerEvents: 'none', userSelect: 'none',
              opacity: 0.5,
            }}
          />
        )}

        {/* LED */}
        {hw.hasLed && (
          <div style={{
            position: 'absolute', zIndex: 4,
            top: 17, left: '50%',
            transform: 'translateX(-50%)',
            width: 6, height: 6, borderRadius: '50%',
            background: ledColor || 'transparent',
            boxShadow: ledColor ? `0 0 6px ${ledColor}, 0 0 16px ${ledColor}80` : 'none',
            transition: 'background 0.2s ease, box-shadow 0.2s ease',
            pointerEvents: 'none',
          }} />
        )}

        {/* PWR button hit area */}
        {hw.btnPwr && (
          <div
            title="PWR — generate token"
            onMouseDown={() => { if (deviceState !== STATE.GENERATING) handleGenerate(); }}
            onTouchEnd={e => { e.preventDefault(); if (deviceState !== STATE.GENERATING) handleGenerate(); }}
            style={{
              position: 'absolute', zIndex: 5,
              top: SCREEN.top + hw.btnPwr.topOffset, right: hw.btnPwr.right,
              width: hw.btnPwr.w, height: hw.btnPwr.h,
              cursor: deviceState === STATE.GENERATING ? 'not-allowed' : 'pointer',
            }}
          />
        )}
      </div>
      </div>

      {/* Customer link — fixed footer when token active */}
      {tokenData && deviceState !== STATE.IDLE && (
        <div style={{
          flexShrink: 0,
          width: '100%',
          padding: '8px 16px 12px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}>
          <a
            href={tokenUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.68rem',
              color: 'var(--green)',
              fontFamily: 'monospace',
              textDecoration: 'none',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tokenUrl.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}

      {campaignModalOpen && (
        <CampaignModal
          campaign={campaign}
          options={campaignOptions.length ? campaignOptions : [campaign]}
          onSelect={selectCampaign}
          onClose={() => setCampaignModalOpen(false)}
        />
      )}

      {hardwareModalOpen && (
        <HardwareModal
          current={hw}
          options={listPukHardware()}
          onSelect={(next) => {
            setHardwareModalOpen(false);
            if (next.id === hw.id) return;
            stopAll();
            setTokenData(null);
            setTimeLeft(null);
            setErrorMsg('');
            setDeviceState(STATE.IDLE);
            setLedColor(null);
            setMenuOpen(false);
            setActivePanel(null);
            navigate(pukHardwarePath(next.id));
          }}
          onClose={() => setHardwareModalOpen(false)}
        />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Campaign picker modal
// ─────────────────────────────────────────────────────────────────
function CampaignModal({ campaign, options, onSelect, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Switch campaign"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 340,
          background: '#0a0a0a',
          border: '1px solid #1c1c1c',
          borderRadius: 14,
          padding: '20px 18px 18px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#666',
          }}>
            Switch Campaign
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#1a1a1a',
              border: 'none',
              borderRadius: 8,
              color: '#888',
              fontSize: 20,
              lineHeight: 1,
              width: 36,
              height: 36,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map(c => {
            const active = campaign.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c)}
                style={{
                  padding: '12px 14px',
                  background: active ? c.color : '#111',
                  color: active ? '#000' : '#aaa',
                  border: `1px solid ${active ? c.color : '#222'}`,
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  textAlign: 'left',
                }}
              >
                {c.name}
                <span style={{
                  display: 'block',
                  fontSize: '0.6rem',
                  fontWeight: 400,
                  opacity: 0.75,
                  marginTop: 2,
                  letterSpacing: '0.06em',
                }}>
                  {c.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HardwareModal({ current, options, onSelect, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Switch PUK hardware"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)',
          background: '#0c0c12',
          border: '1px solid #222',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.16em', color: '#888' }}>
            PUK HARDWARE
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#555',
              fontSize: 22, lineHeight: 1, cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map(h => {
            const active = current.id === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => onSelect(h)}
                style={{
                  padding: '12px 14px',
                  background: active ? '#1a1a28' : '#111',
                  color: active ? '#fff' : '#aaa',
                  border: `1px solid ${active ? '#3a3a55' : '#222'}`,
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {h.label}
                <span style={{
                  display: 'block',
                  fontSize: '0.6rem',
                  fontWeight: 400,
                  opacity: 0.75,
                  marginTop: 2,
                  letterSpacing: '0.06em',
                }}>
                  {h.display} · {h.deviceCode}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PanelChassis({ hw }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      borderRadius: hw.bodyR,
      background: 'linear-gradient(180deg, #2a2d33 0%, #16181c 42%, #0c0d10 100%)',
      border: '1px solid #3a3d44',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    }}>
      <div style={{
        position: 'absolute',
        top: 6, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: 7,
        letterSpacing: '0.18em',
        color: '#5a5e66',
        pointerEvents: 'none',
      }}>
        {hw.shortLabel.toUpperCase()}
      </div>
      <div style={{
        position: 'absolute',
        bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 38, height: 6, borderRadius: 3,
        background: '#08090b',
        boxShadow: 'inset 0 0 0 1px #2a2d33',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Screen content router
// ─────────────────────────────────────────────────────────────────
function ScreenContent({
  state, campaign, tokenData, tokenUrl, timeLeft, errorMsg,
  formatTime, isExpiring, screenW, screenH, qrScale = 0.82,
  tapPending, menuOpen, activePanel,
  onOpenMenu, onCloseMenu, onOpenPanel, onClosePanel,
}) {
  // Menu and panels render as full-screen overlays on the AMOLED
  if (menuOpen && !activePanel) {
    return <MenuOverlay campaign={campaign} onClose={onCloseMenu} onOpenPanel={onOpenPanel} />;
  }
  if (activePanel === 'about') {
    return <AboutPanel campaign={campaign} onBack={onClosePanel} />;
  }
  if (activePanel === 'data') {
    return <DataPanel campaign={campaign} onBack={onClosePanel} />;
  }
  if (activePanel === 'settings') {
    return <SettingsPanel onBack={onClosePanel} />;
  }

  const base = {
    width: '100%', height: '100%',
    background: '#000',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  };

  // ── IDLE — looping campaign slideshow ─────────────────
  if (state === STATE.IDLE) {
    return <IdleSlideshow campaign={campaign} tapPending={tapPending} />;
  }

  // ── GENERATING ────────────────────────────────────────
  if (state === STATE.GENERATING) {
    return (
      <div style={{ ...base, gap: 18 }}>
        <div style={{
          width: 40, height: 40,
          border: '2px solid #1a1a1a',
          borderTopColor: campaign.color,
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.16em', color: '#2a2a2a' }}>
          GENERATING...
        </div>
      </div>
    );
  }

  // ── READY / SCANNED ───────────────────────────────────
  if (state === STATE.READY || state === STATE.SCANNED) {
    const isScanned = state === STATE.SCANNED;
    const qrSize    = Math.round(screenW * qrScale);

    return (
      <div style={{ ...base, justifyContent: 'space-between', padding: '16px 0 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isScanned ? '#ffab00' : campaign.color,
            boxShadow: `0 0 10px ${isScanned ? '#ffab0080' : campaign.color + '80'}`,
          }} />
          <span style={{
            fontFamily: 'monospace', fontSize: 8.5, letterSpacing: '0.18em',
            color: isScanned ? '#ffab00' : campaign.color,
          }}>
            {isScanned ? 'SCANNED' : 'SCAN TO PLAY'}
          </span>
        </div>

        <div style={{
          background: isScanned ? '#040d04' : '#fff',
          borderRadius: 14, padding: 10,
          boxShadow: isScanned
            ? '0 0 0 2px #00c85380, 0 0 24px rgba(0,200,83,0.12)'
            : '0 0 40px rgba(255,255,255,0.14)',
          position: 'relative',
          transition: 'all 0.35s ease',
        }}>
          <QRCodeSVG
            value={tokenUrl || 'https://purerandom.io'}
            size={qrSize} level="M"
            bgColor={isScanned ? '#040d04' : '#ffffff'}
            fgColor={isScanned ? '#00c853' : '#000000'}
          />
          {isScanned && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 14,
              background: 'rgba(0,6,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="25" stroke="#00c853" strokeWidth="2" fill="none" />
                <polyline points="16,28 24,37 40,19" stroke="#00c853" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 8.5, color: '#252525', letterSpacing: '0.1em', marginBottom: 8 }}>
            {tokenData?.token}
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: 26, fontWeight: 700, letterSpacing: '0.06em',
            color: isExpiring ? '#ff5252' : (isScanned ? '#ffab00' : campaign.color),
            textShadow: `0 0 24px ${isExpiring ? 'rgba(255,82,82,0.35)' : 'rgba(232,102,0,0.25)'}`,
          }}>
            {formatTime(timeLeft)}
          </div>
          {isScanned && (
            <div style={{ fontFamily: 'monospace', fontSize: 7, color: '#ffab0088', letterSpacing: '0.12em', marginTop: 6 }}>
              AWAITING CUSTOMER
            </div>
          )}
        </div>

      </div>
    );
  }

  // ── REDEEMED ──────────────────────────────────────────
  if (state === STATE.REDEEMED) {
    return (
      <div style={{ ...base }}>
        <svg width="76" height="76" viewBox="0 0 76 76" style={{ marginBottom: 18 }}>
          <circle cx="38" cy="38" r="34" stroke="#00c853" strokeWidth="2.5" fill="none" />
          <polyline points="22,38 33,49 54,27" stroke="#00c853" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.2em', color: '#00c853', marginBottom: 6 }}>COMPLETE</div>
        <div style={{ fontFamily: 'monospace', fontSize: 7, color: '#1a1a1a', letterSpacing: '0.1em', marginTop: 28 }}>PRESS G FOR NEW TOKEN</div>
      </div>
    );
  }

  // ── EXPIRED ───────────────────────────────────────────
  if (state === STATE.EXPIRED) {
    return (
      <div style={{ ...base }}>
        <svg width="68" height="68" viewBox="0 0 68 68" style={{ marginBottom: 16 }}>
          <circle cx="34" cy="34" r="30" stroke="#ff5252" strokeWidth="2.5" fill="none" />
          <line x1="34" y1="16" x2="34" y2="36" stroke="#ff5252" strokeWidth="3" strokeLinecap="round" />
          <line x1="34" y1="36" x2="46" y2="36" stroke="#ff5252" strokeWidth="3" strokeLinecap="round" />
          <circle cx="34" cy="52" r="2.5" fill="#ff5252" />
        </svg>
        <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.2em', color: '#ff5252', marginBottom: 6 }}>EXPIRED</div>
        <div style={{ fontFamily: 'monospace', fontSize: 7, color: '#1a1a1a', letterSpacing: '0.1em', marginTop: 28 }}>PRESS G TO REGENERATE</div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────
  if (state === STATE.ERROR) {
    return (
      <div style={{ ...base, padding: '0 22px' }}>
        <svg width="60" height="60" viewBox="0 0 60 60" style={{ marginBottom: 14 }}>
          <circle cx="30" cy="30" r="26" stroke="#ff5252" strokeWidth="2.5" fill="none" />
          <line x1="30" y1="16" x2="30" y2="36" stroke="#ff5252" strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="44" r="2.5" fill="#ff5252" />
        </svg>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.16em', color: '#ff5252', marginBottom: 12 }}>ERROR</div>
        <div style={{ fontFamily: 'monospace', fontSize: 7.5, color: '#242424', textAlign: 'center', lineHeight: 1.8 }}>
          {(errorMsg || '').slice(0, 50)}
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────
// IDLE — looping campaign slideshow
// ─────────────────────────────────────────────────────────────────
function IdleSlideshow({ campaign, tapPending }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [fading,   setFading]   = useState(false);

  useEffect(() => {
    setSlideIdx(0);
  }, [campaign]);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlideIdx(i => (i + 1) % campaign.slides.length);
        setFading(false);
      }, 300);
    }, 3200);
    return () => clearInterval(t);
  }, [campaign]);

  const slide = campaign.slides[slideIdx];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 0 14px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background: image if available, else dot grid */}
      {slide.src ? (
        <img
          src={slide.src}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.35s ease',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          pointerEvents: 'none',
        }} />
      )}

      {/* Dark scrim so text stays readable over images */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Slide text — only shown when no image, or as caption overlay */}
      {!slide.src && (
        <div style={{
          zIndex: 2, textAlign: 'center', padding: '0 16px',
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(6px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', marginBottom: 10 }}>
            {slide.headline}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 8.5, color: '#383838', letterSpacing: '0.12em' }}>
            {slide.sub}
          </div>
        </div>
      )}

      {/* Double-tap hint */}
      <div style={{ zIndex: 2, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 7.5, letterSpacing: '0.1em',
          color: tapPending ? campaign.color : 'rgba(255,255,255,0.2)',
          transition: 'color 0.15s ease',
        }}>
          {tapPending ? 'TAP AGAIN TO ISSUE' : 'DOUBLE TAP TO ISSUE QR'}
        </div>
      </div>

      {/* Swipe-up arrow */}
      <div style={{
        position: 'absolute', bottom: 7, left: '50%',
        transform: 'translateX(-50%)',
        opacity: 0.25, pointerEvents: 'none', zIndex: 2,
        animation: 'swipeHint 2s ease-in-out infinite',
      }}>
        <svg width="14" height="9" viewBox="0 0 14 9">
          <polyline points="1,8 7,1 13,8" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <style>{`
        @keyframes swipeHint {
          0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.18; }
          50%       { transform: translateX(-50%) translateY(-4px); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Menu overlay (swipe-up panel)
// ─────────────────────────────────────────────────────────────────
function MenuOverlay({ campaign, onClose, onOpenPanel }) {
  const items = [
    {
      id: 'about', label: 'ABOUT', sub: 'Campaign FAQ & info',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="11" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'data', label: 'DATA', sub: 'Tokens issued this campaign',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3"  y="13" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="10" y="8"  width="4" height="13" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="17" y="3"  width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      id: 'settings', label: 'SETTINGS', sub: 'Device configuration',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#030303',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px 10px 28px',
        borderBottom: '1px solid #0f0f0f',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.22em', color: campaign.color }}>
          MENU
        </span>
        <button
          onClick={onClose}
          style={{
            background: '#1a1a1a', border: 'none', cursor: 'pointer',
            color: '#888', fontSize: 22, lineHeight: 1,
            width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10, fontFamily: 'monospace',
          }}
        >
          ×
        </button>
      </div>

      {/* Menu items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 10px', gap: 8 }}>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onOpenPanel(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 14px',
              background: '#080808',
              border: '1px solid #141414',
              borderRadius: 10,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <div style={{ color: campaign.color, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#bbb', marginBottom: 3 }}>
                {item.label}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: '#2e2e2e', letterSpacing: '0.06em' }}>
                {item.sub}
              </div>
            </div>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: '#1e1e1e', flexShrink: 0 }}>
              <polyline points="3,1 7,5 3,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>

      {/* Swipe-down hint */}
      <div style={{ textAlign: 'center', paddingBottom: 12, opacity: 0.15, flexShrink: 0 }}>
        <svg width="14" height="9" viewBox="0 0 14 9">
          <polyline points="1,1 7,8 13,1" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// About panel — scrollable campaign FAQ
// ─────────────────────────────────────────────────────────────────
function AboutPanel({ campaign, onBack }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PanelHeader label="ABOUT" color={campaign.color} onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#ddd', letterSpacing: '0.08em', marginBottom: 16 }}>
          {campaign.name}
        </div>
        {campaign.faq.map((item, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: campaign.color, fontFamily: 'monospace', marginBottom: 6, textTransform: 'uppercase' }}>
              {item.q}
            </div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace', lineHeight: 1.7, letterSpacing: '0.02em' }}>
              {item.a}
            </div>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Data panel — token stats
// ─────────────────────────────────────────────────────────────────
function DataPanel({ campaign, onBack }) {
  const [stats, setStats] = useState(null);

  const rows = [
    { label: 'ISSUED', value: 10 },
    { label: 'PLAYED', value: 8 },
    { label: 'WON',    value: 3 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PanelHeader label="DATA" color={campaign.color} onBack={onBack} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 28px', gap: 10 }}>
        {rows.map(row => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px',
            background: '#060606',
            border: '1px solid #111',
            borderRadius: 9,
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555', letterSpacing: '0.14em' }}>{row.label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 700, color: campaign.color }}>{row.value}</span>
          </div>
        ))}
        <div style={{ fontFamily: 'monospace', fontSize: 6.5, color: '#141414', letterSpacing: '0.08em', textAlign: 'center', marginTop: 4 }}>
          {campaign.name} &middot; DEMO-001 &middot; ALL TIME
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Settings panel — placeholder
// ─────────────────────────────────────────────────────────────────
function SettingsPanel({ onBack }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PanelHeader label="SETTINGS" color="#333" onBack={onBack} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#1a1a1a', letterSpacing: '0.16em' }}>DEMO MODE ACTIVE</div>
        <div style={{ fontFamily: 'monospace', fontSize: 7, color: '#111', letterSpacing: '0.08em' }}>Settings not available</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shared panel header
// ─────────────────────────────────────────────────────────────────
function PanelHeader({ label, color, onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px 10px 28px',
      borderBottom: '1px solid #111',
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'monospace', fontSize: 8.5, letterSpacing: '0.2em', color }}>{label}</span>
      <button
        onClick={onBack}
        style={{
          background: '#1a1a1a', border: 'none', cursor: 'pointer',
          color: '#888', fontSize: 22, lineHeight: 1,
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 10, fontFamily: 'monospace',
        }}
      >
        ‹
      </button>
    </div>
  );
}
