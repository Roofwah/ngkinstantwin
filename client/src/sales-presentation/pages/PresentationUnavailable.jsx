import '../styles/presentation.css';

/** Generic message — do not reveal why a presentation is unavailable. */
export default function PresentationUnavailable() {
  return (
    <div className="sp-unavailable">
      <p>This presentation is unavailable.</p>
    </div>
  );
}
