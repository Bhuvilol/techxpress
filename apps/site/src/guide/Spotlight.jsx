// Dims everything except `rect`. Four panels around a hole (not an SVG mask)
// so the hole is genuinely click-through: the person can press the
// highlighted ticket or type in the highlighted field.
export default function Spotlight({ rect }) {
  if (!rect) return <div className="gs-dim gs-dim--all" aria-hidden="true" />;
  const top = Math.max(0, rect.top);
  const left = Math.max(0, rect.left);
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const midH = Math.max(0, bottom - top);
  return (
    <div className="gs-spot" aria-hidden="true">
      <div className="gs-dim" style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className="gs-dim" style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className="gs-dim" style={{ top, left: 0, width: left, height: midH }} />
      <div className="gs-dim" style={{ top, left: right, right: 0, height: midH }} />
      <div className="gs-ring" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
    </div>
  );
}
