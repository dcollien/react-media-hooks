import { ElapsedTime } from "../hooks/media";
import { AudioScroller } from "./AudioScroller";

export function AudioRecorder({
  stream,
  isRecording,
  timeElapsed,
  onRecord,
  onStop,
}: {
  stream: MediaStream | null;
  isRecording: boolean;
  timeElapsed: ElapsedTime;
  onRecord: () => void;
  onStop: () => void;
}) {
  const minutes = timeElapsed.minutes.toFixed(0).padStart(2, "0");
  const seconds = timeElapsed.seconds.toFixed(0).padStart(2, "0");
  const milliseconds = timeElapsed.millis.toFixed(0).padStart(3, "0");
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ padding: "10px" }}>
        {isRecording ? (
          <button
            onClick={onStop}
            disabled={!isRecording || !stream}
            className="stop"
            title="Stop"
          >
            ⏹
          </button>
        ) : (
          <button
            onClick={onRecord}
            disabled={isRecording || !stream}
            className="record"
            title="Record"
          >
            ⏺
          </button>
        )}
      </div>
      {!stream ? (
        <p>No audio input device found</p>
      ) : (
        <AudioScroller audioStream={stream} disabled={!isRecording} />
      )}
      <pre style={{ margin: "0 10px" }}>
        {minutes}:{seconds}:{milliseconds}
      </pre>
    </div>
  );
}
