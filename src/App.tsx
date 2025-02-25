import { useState } from "react";
import "./App.css";

import { useAudioDeviceIdConstraints } from "./hooks/audio";
import {
  useMediaRecorder,
  useMediaStreamDeviceInfo,
  useElapsedTime,
  useMediaStream,
} from "./hooks/media";
import { dowloadBlobs, useBlobUrls } from "./hooks/blob";

import { DeviceSelector } from "./components/DeviceSelector";
import { AudioRecorder } from "./components/AudioRecorder";

function DeviceSelectionStep({
  audioDeviceId,
  videoDeviceId,
  onAudioDeviceIdChange,
  onVideoDeviceIdChange,
  next,
}: {
  audioDeviceId: string | null;
  videoDeviceId: string | null;
  onAudioDeviceIdChange: (deviceId: string | null) => void;
  onVideoDeviceIdChange: (deviceId: string | null) => void;
  next: () => void;
}) {
  const constraints = {
    audio: true,
    video: true,
  };

  const { audioDevices, videoDevices } = useMediaStreamDeviceInfo(constraints);

  return (
    <div>
      <DeviceSelector
        deviceId={audioDeviceId}
        devices={audioDevices}
        onChange={onAudioDeviceIdChange}
      />
      <DeviceSelector
        deviceId={videoDeviceId}
        devices={videoDevices}
        onChange={onVideoDeviceIdChange}
      />
      <button onClick={() => next()}>Next</button>
    </div>
  );
}

function AudioRecorderStep({
  audioDeviceId,
  next,
}: {
  audioDeviceId: string | null;
  next: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);

  const constraints = audioDeviceId
    ? { audio: { deviceId: { exact: audioDeviceId } } }
    : null;

  const stream = useMediaStream(constraints);
  const result = useMediaRecorder(stream, isRecording);
  const timeElapsed = useElapsedTime(result, isRecording);
  const blobUrls = useBlobUrls(result.blobs);

  return (
    <div>
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
      {blobUrls.map((url, i) => (
        <div key={i}>
          <audio controls src={url}></audio>
        </div>
      ))}
      <button onClick={() => next()}>Next</button>
    </div>
  );
}

function App() {
  const [step, setStep] = useState(0);
  const [audioDeviceId, setAudioDeviceId] = useState<string | null>(null);
  const [videoDeviceId, setVideoDeviceId] = useState<string | null>(null);

  if (step === 0) {
    return (
      <div>
        <h1>Step 1: Select your device</h1>
        <DeviceSelectionStep
          audioDeviceId={audioDeviceId}
          videoDeviceId={videoDeviceId}
          onAudioDeviceIdChange={(id) => setAudioDeviceId(id)}
          onVideoDeviceIdChange={(id) => setVideoDeviceId(id)}
          next={() => setStep(1)}
        />
      </div>
    );
  } else if (step == 1) {
    return (
      <div>
        <h1>Step 2: Take a breath</h1>
        <button onClick={() => setStep(2)}>Next</button>
      </div>
    );
  } else if (step === 2) {
    return (
      <div>
        <h1>Step 3: Record your audio</h1>
        <AudioRecorderStep
          audioDeviceId={audioDeviceId}
          next={() => setStep(3)}
        />
      </div>
    );
  } else if (step === 3) {
    return (
      <div>
        <h1>Step 4: Take a breath</h1>
      </div>
    );
  } else if (step === 4) {
    return (
      <div>
        <h1>Step 5: Record your video</h1>
      </div>
    );
  }
}

export default App;
