/** Rounded tone pill. Tones: good, pass, watch, risk, info. */
export default function Badge({ tone, children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
