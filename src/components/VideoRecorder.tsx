import { useCallback } from "react";
import { AudioRecorder } from "./AudioRecorder";
import { ElapsedTime } from "../hooks/media";

export function VideoRecorder({
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
  const videoRef = useCallback(
    (node: HTMLVideoElement) => {
      if (node) node.srcObject = stream;
    },
    [stream]
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <video ref={videoRef} autoPlay playsInline muted></video>
      <AudioRecorder
        stream={stream}
        isRecording={isRecording}
        timeElapsed={timeElapsed}
        onRecord={onRecord}
        onStop={onStop}
      />
    </div>
  );
}
