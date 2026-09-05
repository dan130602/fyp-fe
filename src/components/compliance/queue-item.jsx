import Badge from "../shared/badge.jsx";

/** One flagged call in the priority review queue. */
export default function QueueItem({ id, text, tone, onClick }) {
  return (
    <button className="queue-item" onClick={onClick}>
      <i className={tone} />
      <span>
        <b>{id}</b>
        <small>{text}</small>
      </span>
      <Badge tone={tone}>{tone === "risk" ? "High risk" : "Review"}</Badge>
    </button>
  );
}
