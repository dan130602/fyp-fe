/** Titled card with a checked bullet list, used by the checklist and report pages. */
export default function InfoCard({ title, text, items }) {
  return (
    <article className="card info-card">
      <div className="symbol">☑</div>
      <h2>{title}</h2>
      <p>{text}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
