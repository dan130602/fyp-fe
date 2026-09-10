import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { formatClock } from "../../lib/audio.ts";

/**
 * The call recording, played against the transcript below it.
 *
 * The <audio> element is owned here but reached through `audioRef`, so the
 * workspace can seek it when the officer clicks a cited passage. When no
 * recording came back with the analysis — or the file will not load — the player
 * renders disabled rather than disappearing, so the officer can tell the
 * difference between "no audio for this call" and a broken screen.
 */
export interface AudioPlayerProps {
  src: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onTime?: (time: number) => void;
  onDuration?: (duration: number) => void;
}

export default function AudioPlayer({ src, audioRef, onTime, onDuration }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [failed, setFailed] = useState(false);
  const ready = Boolean(src) && !failed && Number.isFinite(duration);

  // A new recording is a new player: drop whatever the previous one was doing.
  // biome-ignore lint/correctness/useExhaustiveDependencies: src is the reset trigger, not a read value
  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(NaN);
    setFailed(false);
  }, [src]);

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration)) return;
    audio.currentTime = Math.min(Math.max(seconds, 0), duration);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    if (audio.paused) audio.play().catch(() => setFailed(true));
    else audio.pause();
  };

  const progress = ready && duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className={`player ${ready ? "" : "off"}`}>
      <button
        type="button"
        className="play"
        onClick={toggle}
        disabled={!ready}
        aria-label={playing ? "Pause recording" : "Play recording"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="track">
        <input
          type="range"
          min="0"
          max={Number.isFinite(duration) ? duration : 0}
          step="0.1"
          value={ready ? time : 0}
          disabled={!ready}
          aria-label="Seek recording"
          onChange={(e) => seek(Number(e.target.value))}
        />
        <i style={{ width: `${progress}%` }} />
      </div>
      <small>
        {formatClock(ready ? time : NaN)} / {formatClock(duration)}
      </small>
      {!src && <span className="note">No recording attached</span>}
      {src && failed && <span className="note">Recording unavailable</span>}
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            onDuration?.(e.currentTarget.duration);
          }}
          onTimeUpdate={(e) => {
            setTime(e.currentTarget.currentTime);
            onTime?.(e.currentTarget.currentTime);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setFailed(true)}
        >
          {/* No caption file exists for call recordings; the transcript pane is the text alternative. */}
          <track kind="captions" />
        </audio>
      )}
    </div>
  );
}
