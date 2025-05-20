import { useEffect, useRef, useState } from "react";
import { useInterval } from "./interval";
import useAsyncEffect from "./async";

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
  callbacks?: {
    // MediaRecorder events
    onStart?: (event: MediaRecorderEvent, isResuming: boolean) => void,
    onStop?: (event: MediaRecorderEvent) => void,
    onDataAvailable?: (event: BlobEvent) => void,
  },
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
        if (callbacks?.onDataAvailable) {
          callbacks.onDataAvailable(event);
        }
      });

      recorder.addEventListener("start", (event) => {
        const recorderEvent = toRecorderEvent(event, recorder);

        const isResuming = previousMediaRecorderRef.current !== null;

        if (callbacks?.onStart) {
          callbacks.onStart(recorderEvent, isResuming);
        }
      });

      recorder.addEventListener("stop", (event) => {
        const recorderEvent = toRecorderEvent(event, recorder);

        if (callbacks?.onStop) {
          callbacks.onStop(recorderEvent);
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

export function useMediaBlobRecorder(
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

  const onStart = (event: MediaRecorderEvent, isResuming: boolean) => {
    // Reset the chunks when recording starts
    chunksRef.current = [];

    if (!isResuming) {
      // Set the start time and clear the completed blobs
      setResult({
        startTime: event.timeStamp,
        blobs: [],
      });
    }
  };

  const onDataAvailable = (event: BlobEvent) => {
    // Store the recorded chunks in memory when available
    chunksRef.current.push(event.data);
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
    {
      onStart,
      onStop,
      onDataAvailable
    },
    options
  );

  return result;
}

export function useMediaInputDevices(isPermissionGranted: boolean) {
  const devices = useMediaDevices(isPermissionGranted);

  return [devices.audioInput, devices.videoInput] as const;
}

export function useMediaDevices(isPermissionGranted = false) {
  const [devices, setDevices] = useState<{
    audioInput: MediaDeviceInfo[];
    videoInput: MediaDeviceInfo[];
    audioOutput: MediaDeviceInfo[];
  }>({
    audioInput: [],
    videoInput: [],
    audioOutput: [],
  });

  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Re-initialize the devices when permission is requested
  useAsyncEffect(
    async () => {
      let deviceEnumerationData: {
        audioInput: MediaDeviceInfo[];
        videoInput: MediaDeviceInfo[];
        audioOutput: MediaDeviceInfo[];
      } = {
        audioInput: [],
        videoInput: [],
        audioOutput: [],
      };

      try {
        // Get a list of all media devices
        const devices = await navigator.mediaDevices.enumerateDevices();

        deviceEnumerationData = {
          audioInput: devices.filter((d) => d.kind === "audioinput"),
          videoInput: devices.filter((d) => d.kind === "videoinput"),
          audioOutput: devices.filter((d) => d.kind === "audiooutput"),
        };
      } catch (error) {
        console.error("Error getting device", error);
      }

      return deviceEnumerationData;
    },
    (devices) => {
      setDevices(devices);
    },
    [isPermissionGranted, lastUpdate]
  );

  const reload = () => {
    setLastUpdate(Date.now());
  };

  useEffect(() => {
    const changeHandler = () => {
      reload();
    };

    navigator.mediaDevices.addEventListener("devicechange", changeHandler);

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", changeHandler);
    };
  }, []);

  return { ...devices, reload } as const;
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

export function useMediaStream(constraints: MediaStreamConstraints | null) {
  const { stream } = useMediaStreamWithEvents(constraints);

  return stream;
}

function isAudioEnded(stream: MediaStream) {
  return stream.getAudioTracks().every((track) => track.readyState === "ended");
}

function isVideoEnded(stream: MediaStream) {
  return stream.getVideoTracks().every((track) => track.readyState === "ended");
}

function isAllTracksEnded(stream: MediaStream) {
  return stream.getTracks().every((track) => track.readyState === "ended");
}

export function useMediaStreamWithEvents(
  constraints: MediaStreamConstraints | null,
  onAddTrack?: (track: MediaStreamTrack) => void,
  onRemoveTrack?: (track: MediaStreamTrack) => void,
  onEnded?: () => void,
  onAudioEnded?: () => void,
  onVideoEnded?: () => void,
  onTrackMuted?: (
    track: MediaStreamTrack,
    mutedTracks: MediaStreamTrack[]
  ) => void,
  onTrackUnmuted?: (
    track: MediaStreamTrack,
    mutedTracks: MediaStreamTrack[]
  ) => void
) {
  const { audioIdHash, videoIdHash } = hashDeviceIds(constraints);
  const [updateTriggeredAt, setUpdateTriggeredAt] = useState(Date.now());

  // Don't store the stream in state, so we can garbage collect it
  const streamRef = useRef<MediaStream | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, forceUpdate] = useState({});

  useEffect(() => {
    let isCancelled = false;

    if (constraints) {
      // Constraints given, start a new stream

      // Request the user media stream
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          if (isCancelled) {
            // Invalidated before the stream was initialized
            stopStream(stream);
          } else {
            stream.addEventListener("addtrack", (event) => {
              if (onAddTrack) {
                onAddTrack(event.track);
              }
            });

            stream.addEventListener("removetrack", (event) => {
              if (onRemoveTrack) {
                onRemoveTrack(event.track);
              }
            });

            if (
              onAudioEnded ||
              onVideoEnded ||
              onEnded ||
              onTrackMuted ||
              onTrackUnmuted
            ) {
              stream.getTracks().forEach((track) => {
                if (onAudioEnded || onVideoEnded || onEnded) {
                  track.addEventListener("ended", () => {
                    if (onAudioEnded && isAudioEnded(stream)) {
                      onAudioEnded();
                    }

                    if (onVideoEnded && isVideoEnded(stream)) {
                      onVideoEnded();
                    }

                    if (onEnded && isAllTracksEnded(stream)) {
                      onEnded();
                    }
                  });
                }

                if (onTrackMuted || onTrackUnmuted) {
                  track.addEventListener("mute", () => {
                    if (onTrackMuted) {
                      const mutedTracks = stream
                        .getTracks()
                        .filter((t) => t.muted);
                      onTrackMuted(track, mutedTracks);
                    }
                  });

                  track.addEventListener("unmute", () => {
                    if (onTrackUnmuted) {
                      const mutedTracks = stream
                        .getTracks()
                        .filter((t) => t.muted);
                      onTrackUnmuted(track, mutedTracks);
                    }
                  });
                }
              });
            }

            // Store the stream
            streamRef.current = stream;

            // Force update to re-render the component when the stream changes
            // as components may need to re-render when the stream changes
            forceUpdate({});
          }
        })
        .catch((error) => {
          console.error("Error getting user media from device", error);
        });
    } else if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;

      // No render update required, this is a side effect
    }

    return () => {
      isCancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioIdHash, videoIdHash, updateTriggeredAt]);

  return {
    stream: streamRef.current,
    reload: () => {
      setUpdateTriggeredAt(Date.now());
    },
    stopAudio: () => {
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.stop();
        });
      }
    },
    stopVideo: () => {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => {
          track.stop();
        });
      }
    },
    stopTrack: (trackId: string) => {
      if (streamRef.current) {
        const track = streamRef.current.getTrackById(trackId);
        if (track) {
          track.stop();
        }
      }
    },
  };
}

export function useMediaStreamInputDevices(
  constraints: MediaStreamConstraints | null,
  onAddTrack?: (track: MediaStreamTrack) => void,
  onRemoveTrack?: (track: MediaStreamTrack) => void,
  onEnded?: () => void,
  onAudioEnded?: () => void,
  onVideoEnded?: () => void,
  onTrackMuted?: (
    track: MediaStreamTrack,
    mutedTracks: MediaStreamTrack[]
  ) => void,
  onTrackUnmuted?: (
    track: MediaStreamTrack,
    mutedTracks: MediaStreamTrack[]
  ) => void
) {
  // A stream that combines tracks from the selected audio and video devices
  // This also requests permission to use the devices
  const { stream, reload: reloadStream } = useMediaStreamWithEvents(
    constraints,
    onAddTrack,
    onRemoveTrack,
    onEnded,
    onAudioEnded,
    onVideoEnded,
    onTrackMuted,
    onTrackUnmuted
  );

  const isPermissionGranted = stream !== null;

  // A list of all available media devices, separated by kind
  // This will also set the stream if it hasn't been initialized yet
  // As it needs to request permission to use the devices
  const {
    audioInput,
    videoInput,
    reload: reloadDevices,
  } = useMediaDevices(isPermissionGranted);

  return {
    stream,
    audioDevices: audioInput,
    videoDevices: videoInput,
    reload: () => {
      reloadStream();
      reloadDevices();
    },
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

  useAsyncEffect(
    async (): Promise<{
      microphone: PermissionState | "unsupported";
      camera: PermissionState | "unsupported";
    }> => {
      const micPermPromise = navigator.permissions.query({
        name: "microphone" as PermissionName,
      });

      const cameraPermPromise = navigator.permissions.query({
        name: "camera" as PermissionName,
      });

      const [micPerm, cameraPerm] = await Promise.allSettled([
        micPermPromise,
        cameraPermPromise,
      ]);

      return {
        microphone:
          micPerm.status === "fulfilled" ? micPerm.value.state : "unsupported",
        camera:
          cameraPerm.status === "fulfilled"
            ? cameraPerm.value.state
            : "unsupported",
      };
    },
    ({ microphone, camera }) => {
      setMicrophone(microphone);
      setCamera(camera);
    },
    []
  );

  return { microphone, camera };
}

export function useMediaInputDevicesRequest(
  constraints: {
    audio: boolean;
    video: boolean;
  } = {
    audio: true,
    video: true,
  }
) {
  const { microphone, camera } = useMediaPermissionsQuery();
  const [isInitCompleted, setInitCompleted] = useState(false);

  // Check if the permissions have been initialized yet
  const isPermissionsInitialized = microphone !== null && camera !== null;

  // Check if the permissions are granted and if the permission request is required
  const isAudioPermitted = microphone === "granted";
  const isVideoPermitted = camera === "granted";

  const isRequestRequired =
    (constraints?.audio && !isAudioPermitted) ||
    (constraints?.video && !isVideoPermitted);

  // If we've checked permissions and a request is still required, request it
  let streamConstraints: typeof constraints | null = constraints;

  if (!isRequestRequired) {
    streamConstraints = null; // Permission is granted, no need to request it
  } else if (!isPermissionsInitialized) {
    streamConstraints = null; // Permissions not initialized yet, wait for this before requesting permission
  } else if (isInitCompleted) {
    streamConstraints = null; // Already initialized, no need to request permission
  }

  const stream = useMediaStream(streamConstraints);

  // Check if the permission is granted by either means
  const isPermissionGranted = stream !== null || !isRequestRequired;

  // A list of all available media devices, separated by kind
  // This will also set the stream if it hasn't been initialized yet
  // As it needs to request permission to use the devices
  const [audioDevices, videoDevices] =
    useMediaInputDevices(isPermissionGranted);

  // if initialized, set the init completed flag
  useEffect(() => {
    const isAudioInitialized =
      !constraints.audio || isValidMediaList(audioDevices);
    const isVideoInitialized =
      !constraints.video || isValidMediaList(videoDevices);

    const isInitialized = isAudioInitialized && isVideoInitialized;

    if (isInitialized && stream) {
      setInitCompleted(true);
    }
  }, [
    audioDevices,
    videoDevices,
    audioDevices.length,
    videoDevices.length,
    stream,
    constraints.audio,
    constraints.video,
  ]);

  return { audioDevices, videoDevices };
}
