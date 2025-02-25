import { useState } from "react";
import "./App.css";

import { useAudioDeviceIdConstraints } from "./hooks/audio";
import {
  useMediaRecorder,
  useMediaInputStream,
  useElapsedTime,
} from "./hooks/media";
import { dowloadBlobs, useBlobUrls } from "./hooks/blob";

import { DeviceSelector } from "./components/DeviceSelector";
import { AudioRecorder } from "./components/AudioRecorder";

function App() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Get the audio stream
  const constraints = useAudioDeviceIdConstraints(deviceId);
  const { stream, audioDevices } = useMediaInputStream(constraints);

  // Recorder
  const [isRecording, setIsRecording] = useState(false);
  const result = useMediaRecorder(stream, isRecording);

  // Elapsed time
  const timeElapsed = useElapsedTime(result, isRecording);

  // Audio URLs
  const audioUrls = useBlobUrls(result.blobs);

  return (
    <>
      <AudioRecorder
        stream={stream}
        isRecording={isRecording}
        timeElapsed={timeElapsed}
        onRecord={() => {
          setIsRecording(true);
        }}
        onStop={() => {
          setIsRecording(false);
        }}
      />
      <hr />
      <DeviceSelector
        deviceId={deviceId}
        onChange={setDeviceId}
        devices={audioDevices}
      />
      <hr />
      {audioUrls.map((url) => (
        <audio controls key={url} src={url} />
      ))}
      {audioUrls.length ? (
        <>
          <hr />
          <button
            onClick={() => {
              dowloadBlobs(result.blobs);
            }}
          >
            Download
          </button>
        </>
      ) : null}
    </>
  );
}

export default App;
