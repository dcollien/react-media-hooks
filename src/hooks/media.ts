import { useEffect, useRef, useState } from "react";
import { useInterval } from "./interval";

// The result of a recording
export interface RecordedMediaResult {
  // The time since the time origin (performance.timeOrigin) when recording started
  startTime: number | null;

  // Each recorded media as a Blob
  blobs: Blob[];
}

// Helper function to convert the elapsed time since the recording started as
// to an object with the elapsed time in component minutes, seconds, and milliseconds.
export function elapsedTime(result?: RecordedMediaResult) {
  if (!result || !result.startTime)
    return { elapsed: 0, minutes: 0, seconds: 0, millis: 0 };

  const now = performance.now();
  const elapsed = now - result.startTime;

  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const millis = elapsed % 1000;

  return {
    elapsed,
    minutes,
    seconds,
    millis,
  };
}

export type ElapsedTime = ReturnType<typeof elapsedTime>;

// Returns the elapsed time since the recording started.
// The elapsed time state is updated every updateInterval ms.
// Set updateInterval to null to pause updates.
export function useElapsedTime(
  result: RecordedMediaResult,
  isRecording: boolean,
  updateInterval: number | null = 1000 / 60
) {
  const [elapsed, setElapsed] = useState(elapsedTime(result));

  useInterval(
    () => {
      if (result.startTime) {
        setElapsed(elapsedTime(result));
      }
    },
    isRecording ? updateInterval : null
  );

  return elapsed;
}

export interface MediaRecorderEvent extends Event {
  recorder: MediaRecorder;
}

const toRecorderEvent = (event: Event, recorder: MediaRecorder) => {
  const newEvent = event as MediaRecorderEvent;

  Object.defineProperty(newEvent, "recorder", {
    value: recorder,
    writable: false, // Prevent reassignment
    enumerable: true, // Make it show up in console logs
  });

  return newEvent;
};

export interface UseMediaRecorderOptions extends MediaRecorderOptions {
  timeSlice?: number;
}

// Create the MediaRecorder when the stream is ready or the isRecording flag changes
export function useMediaRecorder(
  stream: MediaStream | null,
  isRecording: boolean,
  onDataAvailable?: (event: BlobEvent) => void,
  onStart?: (event: MediaRecorderEvent) => void,
  onResume?: (event: MediaRecorderEvent) => void,
  onStop?: (event: MediaRecorderEvent) => void,
  options?: UseMediaRecorderOptions
) {
  // Reference to the MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Also hold a reference to the previous MediaRecorder
  const previousMediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!stream) return;

    if (isRecording) {
      // Create a new recording
      previousMediaRecorderRef.current = mediaRecorderRef.current;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (onDataAvailable) {
          onDataAvailable(event);
        }
      });

      recorder.addEventListener("start", (event) => {
        const recorderEvent = toRecorderEvent(event, recorder);

        const isResuming = previousMediaRecorderRef.current !== null;

        if (isResuming) {
          // Resume recording after the stream changes
          if (onResume) {
            onResume(recorderEvent);
          }
        } else {
          // Start recording when isRecording becomes true
          if (onStart) {
            onStart(recorderEvent);
          }
        }
      });

      recorder.addEventListener("stop", (event) => {
        const recorderEvent = toRecorderEvent(event, recorder);

        if (onStop) {
          onStop(recorderEvent);
        }
      });

      // Start recording
      recorder.start(options?.timeSlice);
    } else if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;

      // Stop the recorder
      recorder.stop();

      // Reset the recorder
      mediaRecorderRef.current = null;
    }

    // Stop the recorder when the stream is removed, the component is unmounted, or the isRecording flag is changed to false
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state === "recording") {
        recorder.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, isRecording]);
}

export function useBlobMediaRecorder(
  stream: MediaStream | null,
  isRecording: boolean,
  options?: UseMediaRecorderOptions
) {
  // Returns: { result: RecordedMediaResult }
  // The result object contains the recorded media as Blobs and URLs
  // The URLs can be used to download the recorded media
  // The Blobs can be used to upload the recorded media to a server
  // If the stream changes mid-recording, a new blob/url will be created
  // If the isRecording flag changes mid-recording, the recording will be stopped
  // and a new array of blobs/urls will be created if the recording is started again

  // Reference to the chunks stored so far
  const chunksRef = useRef<Blob[]>([]);

  // Render-dependent state
  const [result, setResult] = useState<RecordedMediaResult>({
    startTime: null,
    blobs: [],
  });

  const onDataAvailable = (event: BlobEvent) => {
    // Store the recorded chunks in memory when available
    chunksRef.current.push(event.data);
  };

  const onStart = (event: MediaRecorderEvent) => {
    // Reset the chunks when recording starts
    chunksRef.current = [];

    // Set the start time and clear the completed blobs
    setResult({
      startTime: event.timeStamp,
      blobs: [],
    });
  };

  const onResume = () => {
    // Reset the chunks
    chunksRef.current = [];
  };

  const onStop = (event: MediaRecorderEvent) => {
    if (!event.recorder) return;

    // Combine the chunks into a single Blob
    const blob = new Blob(chunksRef.current, {
      type: event.recorder.mimeType,
    });

    // Create a URL for the Blob as well
    // and store the Blob and URL in the result
    setResult((result) => ({
      startTime: result.startTime,
      blobs: [...result.blobs, blob],
    }));
  };

  useMediaRecorder(
    stream,
    isRecording,
    onDataAvailable,
    onStart,
    onResume,
    onStop,
    options
  );

  return result;
}

export function useMediaInputDevices(isPermissionGranted: boolean) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const init = async () => {
    try {
      // Get a list of all media devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Set the devices list
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));

      // Get the default device ID
    } catch (error) {
      console.error("Error getting device", error);
    }
  };

  // Re-initialize the devices when permission is requested
  useEffect(() => {
    init();
  }, [isPermissionGranted]);

  return [audioDevices, videoDevices] as const;
}

const stopStream = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
};

const hashDeviceId = (deviceId: ConstrainDOMString | null) => {
  if (!deviceId) {
    return null;
  } else if (typeof deviceId === "string") {
    return deviceId;
  } else {
    return JSON.stringify(deviceId);
  }
};

const hashDeviceIds = (constraints: MediaStreamConstraints | null) => {
  let audioDeviceHash: string | null = null;
  let videoDeviceHash: string | null = null;

  if (constraints) {
    const audioConstraints: boolean | MediaTrackConstraints | null =
      constraints.audio || null;
    const videoConstraints: boolean | MediaTrackConstraints | null =
      constraints.video || null;

    if (audioConstraints) {
      const deviceId =
        typeof audioConstraints === "boolean"
          ? audioConstraints.toString()
          : audioConstraints.deviceId || null;

      audioDeviceHash = hashDeviceId(deviceId);
    }

    if (videoConstraints) {
      const deviceId =
        typeof videoConstraints === "boolean"
          ? videoConstraints.toString()
          : videoConstraints.deviceId || null;

      videoDeviceHash = hashDeviceId(deviceId);
    }
  }

  return {
    audioIdHash: audioDeviceHash,
    videoIdHash: videoDeviceHash,
  } as const;
};

export function useMediaStream(
  constraints: MediaStreamConstraints | null
): MediaStream | null {
  const { audioIdHash, videoIdHash } = hashDeviceIds(constraints);
  const streamRef = useRef<MediaStream | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, forceUpdate] = useState({});

  const lastInitTimestampRef = useRef<number | null>(null);

  const closeCurrentStream = () => {
    lastInitTimestampRef.current = null;

    if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (constraints) {
      // Constraints given, start a new stream

      // Store the timestamp of the current initialization
      const initTimestamp = Date.now();
      lastInitTimestampRef.current = initTimestamp;

      // Request the user media stream
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          // When the stream is ready
          if (lastInitTimestampRef.current === initTimestamp) {
            // This is the most recent stream

            if (streamRef.current) {
              // Stop the previous stream
              stopStream(streamRef.current);
            }

            // Store the stream
            streamRef.current = stream;
          } else {
            // Ignore this stream because it is not the most recent
            stopStream(stream);
          }

          // Force update to re-render the component when the stream changes
          forceUpdate({});
        })
        .catch((error) => {
          console.error("Error getting user media from device", error);
        });
    } else {
      closeCurrentStream();
    }

    return () => {
      closeCurrentStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioIdHash, videoIdHash]);

  return streamRef.current;
}

export function useMediaInputStreamDeviceInfo(
  constraints: MediaStreamConstraints | null
) {
  // A stream that combines tracks from the selected audio and video devices
  // This also requests permission to use the devices
  const stream = useMediaStream(constraints);

  const isPermissionGranted = stream !== null;

  // A list of all available media devices, separated by kind
  // This will also set the stream if it hasn't been initialized yet
  // As it needs to request permission to use the devices
  const [audioDevices, videoDevices] =
    useMediaInputDevices(isPermissionGranted);

  return {
    stream,
    audioDevices,
    videoDevices,
  };
}

const isValidMediaList = (list: MediaDeviceInfo[]) => {
  return list.length && list[0].deviceId !== "";
};

export function useMediaPermissionsQuery() {
  const [microphone, setMicrophone] = useState<
    PermissionState | "unsupported" | null
  >(null);
  const [camera, setCamera] = useState<PermissionState | "unsupported" | null>(
    null
  );

  useEffect(() => {
    navigator.permissions
      .query({
        name: "microphone" as PermissionName,
      })
      .then((micPerm) => {
        setMicrophone(micPerm.state);
      })
      .catch(() => {
        setMicrophone("unsupported");
      });
    navigator.permissions
      .query({
        name: "camera" as PermissionName,
      })
      .then((cameraPerm) => {
        setCamera(cameraPerm.state);
      })
      .catch(() => {
        setCamera("unsupported");
      });
  }, []);

  return { microphone, camera };
}

export function useMediaInputDeviceInfo(
  requestConstraints = {
    audio: true,
    video: true,
  }
) {
  // initialize the state with an empty array
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  // Initialize the constraints with the requested constraints
  const [constraints, setConstraints] = useState<{
    audio: boolean;
    video: boolean;
  } | null>(requestConstraints);

  const { microphone, camera } = useMediaPermissionsQuery();

  // Check if the permissions have been initialized yet
  const isPermissionsInitialized = microphone !== null && camera !== null;

  // Check if the permissions are granted and if the permission request is required
  const isAudioPermitted = microphone === "granted";
  const isVideoPermitted = camera === "granted";

  const isRequestRequired =
    (constraints?.audio && !isAudioPermitted) ||
    (constraints?.video && !isVideoPermitted);

  // If we've checked permissions and a request is still required, request it
  const stream = useMediaStream(
    isPermissionsInitialized && isRequestRequired ? constraints : null
  );

  // Check if the permission is granted by either means
  const isPermissionGranted = stream !== null || !isRequestRequired;

  // A list of all available media devices, separated by kind
  // This will also set the stream if it hasn't been initialized yet
  // As it needs to request permission to use the devices
  const [_audioList, _videoList] = useMediaInputDevices(isPermissionGranted);

  // Stop access to the streams once we have saved the devices
  useEffect(() => {
    if (!constraints) return;

    if (isValidMediaList(_audioList) || isValidMediaList(_videoList)) {
      setAudioDevices(_audioList);
      setVideoDevices(_videoList);
      setConstraints(null);
    }
  }, [
    _audioList,
    _videoList,
    _audioList.length,
    _videoList.length,
    constraints,
  ]);

  return { audioDevices, videoDevices, setConstraints };
}
