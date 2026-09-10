import { useState } from "react";
import ReviewList from "./review-list.tsx";
import ReviewWorkspace from "./review-workspace.tsx";
import UploadZone from "./upload-zone.tsx";

/**
 * The officer's review section: the queue of analysed calls, and the workspace
 * for whichever call is open. Selection lives here so returning to the queue
 * discards the open call's transient review state rather than preserving it.
 */
export default function ReviewQueue() {
  const [callId, setCallId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  if (callId) return <ReviewWorkspace callId={callId} onBack={() => setCallId(null)} />;

  return (
    <>
      <section className="heading">
        <div>
          <h1>Human review queue</h1>
          <p>
            Calls analysed by the compliance pipeline. Open one to validate its checklist against
            the transcript.
          </p>
        </div>
      </section>
      <UploadZone onUpload={() => setUploaded(true)} />
      {uploaded && (
        <p className="upload-note">
          Audio recorded for secure ingestion. The analysis job will appear in this queue when
          processing is complete.
        </p>
      )}
      <ReviewList onOpen={setCallId} />
    </>
  );
}
