/** One business-area completion bar on the officer dashboard. */
export default function ProgressRow({ label, value, note, tone }) {
  return (
    <div className="progress-row">
      <span>{label}</span>
      <div className="progress">
        <i className={tone} style={{ width: `${value}%` }} />
      </div>
      <b>
        {value}% · {note}
      </b>
    </div>
  );
}
