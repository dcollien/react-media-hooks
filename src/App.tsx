import { useState } from "react";
import "./App.css";

import {
  useBlobMediaRecorder,
  useElapsedTime,
  useMediaStream,
  useMediaInputDeviceInfo,
} from "./hooks/media";
import { useBlobUrls } from "./hooks/blob";

import { DeviceSelector } from "./components/DeviceSelector";
import { AudioRecorder } from "./components/AudioRecorder";
import { VideoRecorder } from "./components/VideoRecorder";

function DeviceSelectionStep({
  audioDeviceId,
  videoDeviceId,
  onAudioDeviceIdChange,
  onVideoDeviceIdChange,
}: {
  audioDeviceId: string | null;
  videoDeviceId: string | null;
  onAudioDeviceIdChange: (deviceId: string | null) => void;
  onVideoDeviceIdChange: (deviceId: string | null) => void;
}) {
  const { audioDevices, videoDevices } = useMediaInputDeviceInfo();

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
    </div>
  );
}

function AudioRecorderStep({
  audioDeviceId,
}: {
  audioDeviceId: string | null;
}) {
  const [isRecording, setIsRecording] = useState(false);

  const constraints = audioDeviceId
    ? { audio: { deviceId: { exact: audioDeviceId } } }
    : null;

  const stream = useMediaStream(constraints);
  const result = useBlobMediaRecorder(stream, isRecording);
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
    </div>
  );
}

function VideoRecorderStep({
  audioDeviceId,
  videoDeviceId,
}: {
  audioDeviceId: string | null;
  videoDeviceId: string | null;
}) {
  const [isRecording, setIsRecording] = useState(false);

  const constraints =
    audioDeviceId && videoDeviceId
      ? {
          audio: { deviceId: { exact: audioDeviceId } },
          video: { deviceId: { exact: videoDeviceId } },
        }
      : null;

  const stream = useMediaStream(constraints);
  const result = useBlobMediaRecorder(stream, isRecording);
  const timeElapsed = useElapsedTime(result, isRecording);
  const blobUrls = useBlobUrls(result.blobs);

  return (
    <div>
      <VideoRecorder
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
          <video controls src={url}></video>
        </div>
      ))}
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
        />
        <button onClick={() => setStep(1)}>Next</button>
      </div>
    );
  } else if (step == 1) {
    return (
      <div>
        <h1>Step 2: Take a breath</h1>
        <button onClick={() => setStep(2)}>Next</button>
        <button onClick={() => setStep(0)}>Back</button>
      </div>
    );
  } else if (step === 2) {
    return (
      <div>
        <h1>Step 3: Record your audio</h1>
        <AudioRecorderStep audioDeviceId={audioDeviceId} />
        <button onClick={() => setStep(3)}>Next</button>
        <button onClick={() => setStep(1)}>Back</button>
      </div>
    );
  } else if (step === 3) {
    return (
      <div>
        <h1>Step 4: Take a breath</h1>
        <button onClick={() => setStep(4)}>Next</button>
        <button onClick={() => setStep(2)}>Back</button>
      </div>
    );
  } else if (step === 4) {
    return (
      <div>
        <h1>Step 5: Record your video</h1>
        <VideoRecorderStep
          audioDeviceId={audioDeviceId}
          videoDeviceId={videoDeviceId}
        />
        <button onClick={() => setStep(3)}>Back</button>
      </div>
    );
  }
}

export default App;
