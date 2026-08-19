export default function TurnstyleComponents({ components, activeId }) {
  return (
    <div className="lab-components">
      {components.map((component) => (
        <div
          key={component.id}
          className={`lab-component${component.id === activeId ? ' lab-component--active' : ''}`}
        >
          <div className="lab-component__name">{component.label}</div>
          <div className="lab-component__desc">{component.description}</div>
        </div>
      ))}
    </div>
  );
}
