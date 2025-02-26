import { useEffect, useMemo, useRef, useState } from "react";
import { useInterval } from "./interval";

let globalAudioContext: AudioContext | null = null;

// Returns the global audio context and triggers render when it's ready
export function useAudioContext() {
  const [context, setContext] = useState<AudioContext | null>(null);

  // AudioContext requires user interaction to start
  // otherwise it will be suspended / give a warning
  function onUserInteraction() {
    if (!context) {
      if (!globalAudioContext) {
        globalAudioContext = new AudioContext();
      }
      setContext(globalAudioContext);
    }

    // Remove event listeners after first interaction
    document.removeEventListener("click", onUserInteraction);
    document.removeEventListener("keydown", onUserInteraction);
    document.removeEventListener("mousedown", onUserInteraction);
    document.removeEventListener("touchstart", onUserInteraction);
    document.removeEventListener("pointerdown", onUserInteraction);
  }

  useEffect(() => {
    // Add event listeners
    document.addEventListener("click", onUserInteraction);
    document.addEventListener("keydown", onUserInteraction);
    document.addEventListener("mousedown", onUserInteraction);
    document.addEventListener("touchstart", onUserInteraction);
    document.addEventListener("pointerdown", onUserInteraction);
  }, []);

  return context;
}

// Returns the audio source node from the audio context and stream
export function useAudioSource(
  audioContext: AudioContext | null,
  stream: MediaStream | null
) {
  const [streamSource, setStreamSource] =
    useState<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioContext || !stream) return;

    const source = audioContext.createMediaStreamSource(stream);
    setStreamSource(source);
  }, [audioContext, stream]);

  return streamSource;
}

// Returns the connected analyser node from the audio context and source
export function useAnalyser(
  audioContext: AudioContext | null,
  source: MediaStreamAudioSourceNode | null,
  fftSize = 256
) {
  const ref = useRef<AnalyserNode | null>(null);

  if (!ref.current && audioContext) {
    ref.current = audioContext.createAnalyser();
    ref.current.fftSize = fftSize;
  }

  useEffect(() => {
    if (!source || !ref.current) return;
    source.connect(ref.current);
    return () => {
      if (!ref.current) return;
      source.disconnect(ref.current);
    };

    // ref.current will change if the audioContext initializes
  }, [audioContext, source]);

  return ref.current;
}

// Helper function to get the volume from the analyser node
const getVolume = (analyser: AnalyserNode) => {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  return average;
};

// Returns the audio level from the audio source
// and triggers updates every updateInterval ms.
// Set updateInterval to null to pause updates
export function useAudioLevel(
  audioContext: AudioContext | null,
  source: MediaStreamAudioSourceNode | null,
  updateInterval: number | null = 1000 / 60
) {
  // returns the volume level of the audio source
  const [audioLevel, setAudioLevel] = useState({
    level: 0,
    timestamp: Date.now(),
  });

  const analyser = useAnalyser(audioContext, source);

  // Update the audio level every updateInterval
  useInterval(() => {
    const timestamp = Date.now();
    if (!analyser) {
      setAudioLevel({ level: 0, timestamp });
    } else {
      setAudioLevel({
        level: getVolume(analyser) / 255,
        timestamp,
      });
    }
  }, updateInterval);

  return audioLevel;
}

// Returns the stream constraints for the audio device,
// or the default audio constraints if no deviceId is provided
// This is memoized so it only triggers updates when the deviceId changes
export function useAudioDeviceIdConstraints(
  deviceId: string | null
): MediaStreamConstraints {
  return useMemo<MediaStreamConstraints>(() => {
    return {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    };
  }, [deviceId]);
}
