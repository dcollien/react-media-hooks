import { useState } from "react";
import "./App.css";

import {
  useMediaBlobRecorder,
  useElapsedTime,
  useMediaStream,
  useMediaInputDevicesRequest,
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
  const { audioDevices, videoDevices } = useMediaInputDevicesRequest();

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
    : { audio: true };

  const stream = useMediaStream(constraints);
  const recording = useMediaBlobRecorder(stream, isRecording);
  const timeElapsed = useElapsedTime(recording, isRecording);
  const blobUrls = useBlobUrls(recording.blobs);

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
      : {
          audio: true,
          video: true,
        };

  const stream = useMediaStream(constraints);
  const recording = useMediaBlobRecorder(stream, isRecording);
  const timeElapsed = useElapsedTime(recording, isRecording);
  const blobUrls = useBlobUrls(recording.blobs);

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
  const [step, setStep] = useState(1);
  const [audioDeviceId, setAudioDeviceId] = useState<string | null>(null);
  const [videoDeviceId, setVideoDeviceId] = useState<string | null>(null);

  if (step === 1) {
    return (
      <div>
        <h1>Step 1: Select your device</h1>
        <p>
          Notice that the recording icon only activates momentarily if
          permissions are not yet given. It then disappears. The stream is no
          longer open.
        </p>
        <p>Connecting a new device will automatically update this list.</p>
        <pre>
          const {"{"}(audioDevices, videoDevices){"}"} =
          useMediaInputDevicesRequest();
        </pre>
        <DeviceSelectionStep
          audioDeviceId={audioDeviceId}
          videoDeviceId={videoDeviceId}
          onAudioDeviceIdChange={(id) => setAudioDeviceId(id)}
          onVideoDeviceIdChange={(id) => setVideoDeviceId(id)}
        />
        <button onClick={() => setStep(2)}>Next</button>
      </div>
    );
  } else if (step === 2) {
    return (
      <div>
        <h1>Step 3: Record your audio</h1>
        <p>Stream is open and awaiting recording.</p>
        <p>This uses the following hooks:</p>
        <ul>
          <li>
            <pre>const stream = useMediaStream(constraints);</pre>
          </li>
          <li>
            <pre>
              const recording = useMediaBlobRecorder(stream, isRecording);
            </pre>
          </li>
          <li>
            <pre>
              const {"{"}(elapsed, minutes, seconds, millis){"}"} =
              useElapsedTime(recording, isRecording);
            </pre>
          </li>
          <li>
            <pre>const urls = useBlobUrls(recording.blobs);</pre>
          </li>
          <li>
            <pre>const source = useAudioStreamSource(stream);</pre>
          </li>
          <li>
            <pre>
              const {"{"}(level, timestamp){"}"} = useAudioLevel(source);
            </pre>
          </li>
        </ul>
        <AudioRecorderStep audioDeviceId={audioDeviceId} />
        <button onClick={() => setStep(3)}>Next</button>
        <button onClick={() => setStep(1)}>Back</button>
      </div>
    );
  } else if (step === 3) {
    return (
      <div>
        <h1>Step 4: Stream Closed</h1>
        <p>
          The stream is once again closed. The recording status should
          disappear.
        </p>
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
