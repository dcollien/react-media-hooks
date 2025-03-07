# React Hooks for media and audio

A React hook library for media and audio utilities

```
npm install react-media-hooks
```

```typescript
import { useMediaRecorder, useAudioContext } from "react-media-hooks";

// or
import { useMediaRecorder } from "react-media-hooks/use-media";
import { useAudioContext } from "react-media-hooks/use-audio";
```

## Example Usage

```tsx
import { useCallback, useState } from "react";

import {
  useAudioContext,
  useAudioLevel,
  useAudioStreamSource,
} from "react-media-hooks/use-audio";

import {
  useMediaBlobRecorder,
  useElapsedTime,
  useMediaStream,
} from "react-media-hooks/use-media";

import { useBlobUrls } from "react-media-hooks/use-blob";

export function AudioRecorder({
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

  // Create the media stream from the constraints
  const stream = useMediaStream(constraints);

  // Create the media recorder from the stream
  const result = useMediaBlobRecorder(stream, isRecording);

  // Calculate the time elapsed from the result
  const timeElapsed = useElapsedTime(result, isRecording);

  // Create the blob urls from the blobs in the result
  const blobUrls = useBlobUrls(result.blobs);

  // Create the audio source on the audio context, from the stream
  const audioSource = useAudioStreamSource(stream);

  // Update the audio level (between 0 and 1) from the audio source
  // 60 times per second
  const { level, timestamp } = useAudioLevel(
    audioSource,
    1000 / 60 // update 60 times per second
  );

  // Create the video ref to attach the stream to the video element
  const videoRef = useCallback(
    (node: HTMLVideoElement) => {
      if (node) node.srcObject = stream;
    },
    [stream]
  );

  const minutes = timeElapsed.minutes.toFixed(0).padStart(2, "0");
  const seconds = timeElapsed.seconds.toFixed(0).padStart(2, "0");
  const milliseconds = timeElapsed.millis.toFixed(0).padStart(3, "0");

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted></video>
      <button onClick={() => setIsRecording(true)}>Record</button>
      <button onClick={() => setIsRecording(false)}>Stop</button>
      <hr />
      <p>Audio level:</p>
      <div>
        <div
          style={{
            width: `${200 * level}px`,
            height: "10px",
            background: "black",
          }}
        ></div>
      </div>
      <pre>
        {minutes}:{seconds}.{milliseconds}
      </pre>

      <p>
        Changing the audioDeviceId or videoDeviceId will create a new file
        below. Stopping/Starting the recording will clear all files and start a
        new recording.
      </p>
      {blobUrls.map((url) => (
        <div key={url}>
          <audio controls src={url}></audio>
        </div>
      ))}
    </div>
  );
}
```

## Demo App

```
pnpm run dev
```

## Hooks

### Audio

Hooks for WebAudio

```typescript
import {...} from 'react-media-hooks/use-audio`
```

#### useAudioContext

```typescript
useAudioContext(): AudioContext | null
```

A global audio context is used by default. As per MDN:

> It's recommended to create one AudioContext and reuse it instead of initializing a new one each time, and it's OK to use a single AudioContext for several different audio sources and pipeline concurrently.

Browser vendors decided that Web Audio contexts should not be allowed to automatically play audio; they should instead be started by a user. As such, the `useAudioContext` hook waits for any user interaction before initializing the `AudioContext` so that the context does not get created in suspended mode.

The context is stored as component state so component renders will be triggered when the context initializes and changes from `null` to the initialized `AudioContext` object.

e.g.

```tsx
import { useAudioContext } from "react-media-hooks/use-audio";

function Component() {
  const context = useAudioContext(); // will use the global audio context

  return <></>;
}
```

Optionally, a React Context Provider can be used to create separate audio contexts. e.g.

```tsx
import { useAudioContext } from "react-media-hooks/use-audio";
import { AudioContextProvider } from "react-media-hooks/audio-context";

function SubComponent() {
  const context = useAudioContext(); // will use the context provider's context

  return <></>;
}

function Component() {
  // Create a new AudioContext and initialize it on user interaction
  return (
    <AudioContextProvider>
      <SubComponent />
    </AudioContextProvider>
  );
}
```

Optionally, your own audio context can be given:

```tsx
function Component() {
  // Create a new AudioContext and initialize it on user interaction
  return (
    <AudioContextProvider audioContext={myAudioContext}>
      <SubComponent />
    </AudioContextProvider>
  );
}
```

If the given context is suspended, it will be automatically woken up on next user interaction.

#### useAudioStreamSource

```typescript
useAudioStreamSource(
    stream: MediaStream | null
): MediaStreamAudioSourceNode`
```

Given a MediaStream, creates a MediaStreamSourceNode using `audioContext.createMediaStreamSource(stream)` when both `audioContext` and `stream` become initialized.

The returned source node is stored as component state so component renders will be triggered when the audio source node becomes available.

#### useAudioAnalyser

```typescript
useAudioAnalyser(
    source: MediaStreamAudioSourceNode | null,
    fftSize = 256
): AnalyserNode | null
```

Given a MediaStreamAudioSourceNode, returns an AnalyserNode. When the `source` changes, the old source will disconnect the analyser (if it exists), and the new source will be connected to the analyser.

#### useAudioLevel

```typescript
useAudioLevel(
    source: MediaStreamAudioSourceNode | null,
    updateInterval: number | null = 1000 / 60
): {
    level: number,
    timestamp: number
}
```

Given a MediaStreamAudioSourceNode, returns the current volume level and the timestamp that the volume was last sampled (uses `Date.now()`).

The `updateInterval` controls how frequently the volume level is sampled, and can be set to `null` to pause updates.

#### useAudioDataSource

```typescript
useAudioDataSource(
    data: ArrayBuffer | AudioBuffer | Blob | null,
    detune?: number,
    loop?: boolean,
    loopStart?: number,
    loopEnd?: number,
    playbackRate?: number
): AudioBufferSourceNode | null
```

Returns a AudioBufferSourceNode (when one has initialized) from given audio data: either ArrayBuffer, AudioBuffer, or Blob.

#### useAudioDataPlayback

```typescript
useAudioDataPlayback(
    data: ArrayBuffer | AudioBuffer | Blob | null,
    detune?: number,
    loop?: boolean,
    loopStart?: number,
    loopEnd?: number,
    playbackRate?: number
): (when?: number, offset?: number, duration?: number) => Promise<void>
```

Given audio data (ArrayBuffer, AudioBuffer, or Blob), returns a `start` function. When called this function will start playing the audio.

### Media

Hooks for dealing with MediaDevices

```typescript
import {...} from 'react-media-hooks/use-media`
```

#### useMediaStreamInputDevices

```typescript
useMediaStreamInputDevices(
    constraints: MediaStreamConstraints | null
): {
    stream: MediaStream | null,
    audioDevices: MediaDeviceInfo[],
    videoDevices: MediaDeviceInfo[]
}
```

Given MediaStreamConstraints, returns a MediaStream and two lists of device info for audio and video respectively. When the constraints change (either the object reference, the value of its `audio` or `video` properties, or their respective `deviceId` properties), then the stream will be replaced with a new MediaStream for that set of constraints.

`useMediaStreamInputDevices` will request permission to use the available devices and update the stream and device lists when permission is granted. If a new device is connected, the lists will update.

Setting `constraints` to `null` will stop the stream.

#### useMediaInputDevicesRequest

```typescript
useMediaInputDevicesRequest(constraints?: {
    audio: boolean;
    video: boolean;
}): {
    audioDevices: MediaDeviceInfo[];
    videoDevices: MediaDeviceInfo[];
}
```

Checks whether permissions have already been given, and if not it opens a stream only momentarily, enough to trigger a permissions request and enumerate audio and video devices. The stream is then closed.

Changing the constraints will re-request the devices. If a new device is connected, the lists will update.

#### useMediaPermissionsQuery

```typescript
useMediaPermissionsQuery(): {
    microphone: PermissionState | "unsupported" | null;
    camera: PermissionState | "unsupported" | null;
}
```

`microphone` and `camera` will switch from `null` to one of:

- "granted": Permission has already been given
- "denied": Permission was explicitly denied
- "prompt": Permission has not been requested
- "unsupported": The browser doesn't support querying for permissions

#### useMediaDevices

```typescript
useMediaDevices(isPermissionGranted: boolean): {
    readonly audioInput: MediaDeviceInfo[];
    readonly videoInput: MediaDeviceInfo[];
    readonly audioOutput: MediaDeviceInfo[];
}
```

Given a flag for if permission has been granted, returns three lists of media devices: audio inputs, video inputs, and audio outputs.

Changing the `isPermissionGranted` flag will re-initialize the lists.

#### useMediaInputDevices

```typescript
useMediaInputDevices(
    isPermissionGranted: boolean
): readonly [MediaDeviceInfo[], MediaDeviceInfo[]]
```

Given a flag for if permission has been granted, returns two lists of media input devices: audio and video (in order).

Changing the `isPermissionGranted` flag will re-initialize the lists.

#### useMediaStream

```typescript
useMediaStream(
    constraints: MediaStreamConstraints | null
): MediaStream
```

`useMediaStream` can be used to initialize the media stream (or request permissions) for a set of constraints, separately.

Setting `constraints` to `null` will stop the stream.

#### useMediaBlobRecorder

```typescript
useMediaBlobRecorder(
    stream: MediaStream | null,
    isRecording: boolean,
    options?: MediaRecorderOptions
): {
    startTime: number | null;
    blobs: Blob[];
} as RecordedMediaResult
```

Start recording on a stream. Toggle `isRecording` to start/stop recording. Starting a new recording will re-initialize the `blobs` array. Stopping recording will populate the `blobs` array with new data.

If a stream changes during recording, a new audio file Blob will be added to the `blobs` output array.

The `startTime` is the ms since the `timeOrigin`, i.e. compare against `performance.now()`.

```typescript
useElapsedTime(
    result: RecordedMediaResult,
    isRecording: boolean,
    updateInterval?: number | null
): {
    elapsed: number;
    minutes: number;
    seconds: number;
    millis: number;
}
```

Can be used as a shortcut to retrieve the elapsed time since a result was created, updating every `updateInterval`.

### useMediaRecorder

```typescript
useMediaRecorder(
    stream: MediaStream | null,
    isRecording: boolean,
    onDataAvailable?: (event: BlobEvent) => void,
    onStart?: (event: MediaRecorderEvent) => void,
    onResume?: (event: MediaRecorderEvent) => void,
    onStop?: (event: MediaRecorderEvent) => void,
    options?: UseMediaRecorderOptions
): void
```

Start recording on a stream. Toggle `isRecording` to start/stop recording. If a stream is changed mid-recording, `onStop` will be called followed by `onResume` when a new stream starts.

`onDataAvailable` sends `event.data` that can be combined into an audio file `onStop` using:

```typescript
const blob = new Blob([data0, data1, ...], {
    type: event.recorder.mimeType,
});
```

`UseMediaRecorderOptions` has a `timeSlice` property which controls how many ms are recorded until `onDataAvailable` is called.

### Utility Hooks used in the Demo App

#### useInterval

```typescript
import { useInterval } from "react-media-hooks/use-interval";
```

```typescript
useInterval(callback: () => void, delay: number | null): void
```

Calls `callback` every `delay` ms.

Setting `delay` to `null` will stop it.

#### useBlobUrls

```typescript
import { useBlobUrls, downloadBlobs } from "react-media-hooks/use-blob";
```

```typescript
useBlobUrls(blobs: Blob[]): string[]
```

Create blob urls for each blob whenever the `blobs` array changes. Revokes old URLs.

Also utility function:

```typescript
downloadBlobs(blobs: Blob[], filePrefix?: string): void
```

Which triggers downloads of an array of blobs.
