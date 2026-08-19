import HokaCampaignShell from '../components/HokaCampaignShell';
import HokaConfetti from '../components/HokaConfetti';
import { isHokaWin, hokaPrizeImage } from '../campaigns/hokaCotswold';

const DEFAULT_SWEEPSTAKES =
  "You're not an instant winner this time. You've been automatically entered into the sweepstakes prize draw.";

export default function HokaResultView({ claim }) {
  const win = isHokaWin(claim?.result);
  const first = (claim?.customerName || '').trim().split(/\s+/)[0];
  const sweepstakes = claim?.sweepstakesMessage || DEFAULT_SWEEPSTAKES;

  return (
    <HokaCampaignShell
      artSrc="/campaigns/hoka/verify.jpg"
      heroClassName="hoka-hero--enter"
    >
      <HokaConfetti active={win} />
      <div className="hoka-form-panel">
      {win ? (
        <div className="hoka-result hoka-result--win">
          <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
          <p className="hoka-lede" style={{ fontSize: '1.15rem', color: '#dfff00' }}>
            You’re an instant winner
          </p>
          <div className="hoka-prize hoka-prize--reveal">
            <span>You’ve won</span>
            {hokaPrizeImage(claim?.prizeName) && (
              <img
                className="hoka-prize-art"
                src={hokaPrizeImage(claim.prizeName)}
                alt={claim.prizeName}
              />
            )}
            <strong>{claim?.prizeName || 'an instant prize'}</strong>
          </div>
          <p className="hoka-lede">
            We’ve sent your redemption instructions to your mobile.
            Show that message — and this code — to a staff member.
          </p>
          {claim?.redemptionCode && (
            <div className="hoka-code">{claim.redemptionCode}</div>
          )}
        </div>
      ) : (
        <div className="hoka-result">
          <h1>Not this time</h1>
          <p className="hoka-lede">{sweepstakes}</p>
          <div className="hoka-sweepstakes">
            Sweepstakes entry confirmed
          </div>
          <a
            className="hoka-cta"
            href="https://www.cotswoldoutdoor.com/"
            target="_blank"
            rel="noreferrer"
          >
            Visit Cotswold Outdoor
          </a>
        </div>
      )}

      <p className="hoka-legal">
        Instant-win outcomes are determined by a secure server-side prize manifest before this screen is shown.
      </p>
      </div>
    </HokaCampaignShell>
  );
}
