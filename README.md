# Example Audio Recorder and Media Hooks with React / MediaDevices / WebAudio APIs

## Hooks

### Audio

Hooks for dealing with WebAudio

#### useAudioContext

```typescript
useAudioContext(): AudioContext | null
```

A global audio context is used. As per MDN:

> It's recommended to create one AudioContext and reuse it instead of initializing a new one each time, and it's OK to use a single AudioContext for several different audio sources and pipeline concurrently.

Browser vendors decided that Web Audio contexts should not be allowed to automatically play audio; they should instead be started by a user. As such, the `useAudioContext` hook waits for any user interaction before initializing the `AudioContext` so that the context does not get created in suspended mode.

The context is stored as component state so component renders will be triggered when the context initializes and changes from `null` to the initialized `AudioContext` object.

#### useAudioSource

```typescript
useAudioSource(
    audioContext: AudioContext | null,
    stream: MediaStream | null
): MediaStreamAudioSourceNode`
```

Given an AudioContext and a MediaStream, creates a MediaStreamSourceNode using `audioContext.createMediaStreamSource(stream)` when both `audioContext` and `stream` become initialized.

The returned source node is stored as component state so component renders will be triggered when the audio source node becomes available.

#### useAnalyser

```typescript
useAnalyser(
  audioContext: AudioContext | null,
  source: MediaStreamAudioSourceNode | null,
  fftSize = 256
): AnalyserNode | null
```

Given an AudioContext and MediaStreamAudioSourceNode, returns an AnalyserNode. When the `source` changes, the old source will disconnect the analyser (if it exists), and the new source will be connected to the analyser.

#### useAudioLevel

```typescript
useAudioLevel(
  audioContext: AudioContext | null,
  source: MediaStreamAudioSourceNode | null,
  updateInterval: number | null = 1000 / 60
): {
    level: number,
    timestamp: number
}
```

Given an AudioContext and MediaStreamAudioSourceNode, returns the current volume level and the timestamp that the volume was last sampled (uses `Date.now()`).

The `updateInterval` controls how frequently the volume level is sampled, and can be set to `null` to pause updates.

#### useAudioDeviceIdConstraints

```typescript
useAudioDeviceIdConstraints(
  deviceId: string | null
): MediaStreamConstraints
```

Given a device ID, returns a memoized object representing the MediaStreamConstraints for this device (exact match). This object's reference changes when `deviceId` changes.

If the `deviceId` is `null` then the constraints will be set to use the default audio device.

### Media

Hooks for dealing with MediaDevices

#### useMediaInputStreamDeviceInfo

```typescript
useMediaInputStreamDeviceInfo(
    constraints: MediaStreamConstraints | null
): {
    stream: MediaStream | null,
    audioDevices: MediaDeviceInfo[],
    videoDevices: MediaDeviceInfo[]
}
```

Given MediaStreamConstraints, returns a MediaStream and two lists of device info for audio and video respectively. When the constraints change (either the object reference, the value of its `audio` or `video` properties, or their respective `deviceId` properties), then the stream will be replaced with a new MediaStream for that set of constraints.

`useMediaInputStreamDeviceInfo` will request permission to use the available devices and update the stream and device lists when permission is granted.

Setting `constraints` to `null` will stop the stream.

#### useMediaInputDeviceInfo

```typescript
useMediaInputDeviceInfo(requestConstraints?: {
    audio: boolean;
    video: boolean;
}): {
    audioDevices: MediaDeviceInfo[];
    videoDevices: MediaDeviceInfo[];,
    setConstraints: React.Dispatch<React.SetStateAction<{
        audio: boolean;
        video: boolean;
    } | null>>;
}
```

Checks whether permissions have already been given, and if not it opens a stream only momentarily, enough to trigger a permissions request and enumerate audio and video devices. The stream is then closed.

Use `setConstraints` to re-request the devices.

#### useMediaPermissionsQuery

```
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

#### useMediaStream

```typescript
useMediaStream(
    constraints: MediaStreamConstraints | null
): MediaStream
```

`useMediaStream` can be used to initialize the media stream (or request permissions) for a set of constraints, separately.

Setting `constraints` to `null` will stop the stream.

#### useMediaInputDevices

```typescript
useMediaInputDevices(
    isPermissionGranted: boolean
): readonly [MediaDeviceInfo[], MediaDeviceInfo[]]
```

Given a flag for if permission has been granted, returns two lists of media devices: audio and video.

Changing the `isPermissionGranted` flag will re-initialize the lists.

#### useBlobMediaRecorder

```typescript
useBlobMediaRecorder(
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
