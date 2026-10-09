export function StatCard({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: string }) {
  return <section className="statCard"><div className="statTop"><span className="statLabel">{label}</span><span className={"statGlyph " + (accent || "")} aria-hidden="true">↗</span></div>
    <div className="statValue">{value}</div>{hint ? <div className="statHint">{hint}</div> : null}</section>;
}