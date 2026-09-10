import type { Tone } from "@/components/ui/badge.tsx";
import { Badge } from "@/components/ui/badge.tsx";

interface QueueItemProps {
  id: string;
  text: string;
  tone: Tone;
  onClick?: () => void;
}

/** One flagged call in the priority review queue. */
export default function QueueItem({ id, text, tone, onClick }: QueueItemProps) {
  return (
    <button type="button" className="queue-item" onClick={onClick}>
      <i className={tone} />
      <span>
        <b>{id}</b>
        <small>{text}</small>
      </span>
      <Badge variant={tone}>{tone === "risk" ? "High risk" : "Review"}</Badge>
    </button>
  );
}
