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

// Create the MediaRecorder when the stream is ready or the isRecording flag changes
function useMediaRecorderHelper(
  stream: MediaStream | null,
  isRecording: boolean,
  mediaRecorderRef: React.RefObject<MediaRecorder | null>,
  chunksRef: React.RefObject<Blob[]>,
  setResult: React.Dispatch<React.SetStateAction<RecordedMediaResult>>,
  options?: MediaRecorderOptions
) {
  useEffect(() => {
    if (!stream) return;

    if (isRecording) {
      // Create a new recording
      const previousRecorder = mediaRecorderRef.current;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        // Store the recorded chunks in memory when available
        chunksRef.current.push(event.data);
      });

      recorder.addEventListener("start", (event) => {
        chunksRef.current = [];

        if (!previousRecorder) {
          // No previous recording to be resumed
          setResult({
            startTime: event.timeStamp,
            blobs: [],
          });
        }
      });

      recorder.addEventListener("stop", () => {
        // Combine the chunks into a single Blob
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType,
        });

        // Create a URL for the Blob as well
        // and store the Blob and URL in the result
        setResult((result) => ({
          startTime: result.startTime,
          blobs: [...result.blobs, blob],
        }));
      });

      // Start recording
      recorder.start();
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

export function useMediaRecorder(
  stream: MediaStream | null,
  isRecording: boolean,
  options?: MediaRecorderOptions
) {
  // Returns: { result: RecordedMediaResult }
  // The result object contains the recorded media as Blobs and URLs
  // The URLs can be used to download the recorded media
  // The Blobs can be used to upload the recorded media to a server
  // If the stream changes mid-recording, a new blob/url will be created
  // If the isRecording flag changes mid-recording, the recording will be stopped
  // and a new array of blobs/urls will be created if the recording is started again

  // Reference to the MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Reference to the chunks stored so far
  const chunksRef = useRef<Blob[]>([]);

  // Render-dependent state
  const [result, setResult] = useState<RecordedMediaResult>({
    startTime: null,
    blobs: [],
  });

  useMediaRecorderHelper(
    stream,
    isRecording,
    mediaRecorderRef,
    chunksRef,
    setResult,
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

const startStream = async (
  streamsRef: React.RefObject<Record<string, MediaStream | "pending">>,
  timestamp: number,
  constraints: MediaStreamConstraints | null
) => {
  streamsRef.current[timestamp] = "pending";

  try {
    const newStream = constraints
      ? await navigator.mediaDevices.getUserMedia(constraints)
      : null;

    if (streamsRef.current[timestamp] === "pending") {
      if (newStream) {
        streamsRef.current[timestamp] = newStream;
      } else {
        delete streamsRef.current[timestamp];
      }
    } else {
      stopStream(newStream);
    }

    return newStream;
  } catch (error) {
    console.error("Error getting user media from device", error);
  }

  return null;
};

const stopOldStreams = (
  streamsRef: React.RefObject<Record<string, MediaStream | "pending">>,
  timestamp: number
) => {
  const oldStreamTimestamps = Object.keys(streamsRef.current);

  // stop all old streams
  oldStreamTimestamps.forEach((timestampKey) => {
    const streamTimestamp = parseInt(timestampKey, 10);

    // older than the current timestamp
    if (streamTimestamp < timestamp) {
      const stream = streamsRef.current[streamTimestamp];

      if (stream !== "pending") {
        stopStream(stream);
      }

      delete streamsRef.current[streamTimestamp];
    }
  });
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
  // A history of pending and open streams, so we can ensure we stop old streams
  const streamsRef = useRef<Record<string, MediaStream | "pending">>({});

  // The most recent stream timestamp, so we don't overwrite the current stream
  // with an older initiation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_mostRecentStreamTimestamp, setMostRecentTimestamp] = useState<
    number | null
  >(null);

  // The current stream, which is the most recently initiated stream
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);

  const { audioIdHash, videoIdHash } = hashDeviceIds(constraints);

  useEffect(() => {
    const timestamp = Date.now();
    stopOldStreams(streamsRef, timestamp);
    setMostRecentTimestamp(timestamp);

    // Streams are started asynchronously
    // We need to check the timestamp to check to see if the stream is still the most recent
    startStream(streamsRef, timestamp, constraints).then((stream) => {
      setMostRecentTimestamp((mostRecentTimestamp) => {
        if (mostRecentTimestamp === timestamp) {
          setCurrentStream(stream);
        }

        return mostRecentTimestamp;
      });
    });

    return () => {
      stopOldStreams(streamsRef, timestamp);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioIdHash, videoIdHash]);

  return currentStream;
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
  const [constraints, setConstraints] = useState<MediaStreamConstraints | null>(
    requestConstraints
  );

  // Get the devices, or stop the stream once we have them
  const { audioDevices: _audioList, videoDevices: _videoList } =
    useMediaInputStreamDeviceInfo(constraints);

  // Stop access to the streams once we have saved the devices
  useEffect(() => {
    if (_audioList.length || _videoList.length) {
      setAudioDevices(_audioList);
      setVideoDevices(_videoList);
      setConstraints(null);
    }
  }, [_audioList, _videoList, _audioList.length, _videoList.length]);

  return { audioDevices, videoDevices };
}
