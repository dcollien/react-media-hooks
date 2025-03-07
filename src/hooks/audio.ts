import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInterval } from "./interval";
import useAsyncEffect from "./async";
import { useAudioContext } from "./audioContext";
export { useAudioContext, initAudioContext } from "./audioContext";

// Returns the audio source node from the audio context and stream
export function useAudioStreamSource(stream: MediaStream | null) {
  const audioContext = useAudioContext();

  return useMemo(() => {
    if (!audioContext || !stream) return null;

    return audioContext.createMediaStreamSource(stream);
  }, [audioContext, stream]);
}

// Returns the connected analyser node from the audio context and source
export function useAudioAnalyser(
  source: MediaStreamAudioSourceNode | null,
  fftSize = 256
) {
  const audioContext = useAudioContext();
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
  source: MediaStreamAudioSourceNode | null,
  updateInterval: number | null = 1000 / 60
) {
  // returns the volume level of the audio source
  const [audioLevel, setAudioLevel] = useState({
    level: 0,
    timestamp: Date.now(),
  });

  const analyser = useAudioAnalyser(source);

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

export async function createSource(
  audioContext: AudioContext | null,
  data: ArrayBuffer | AudioBuffer | Blob | null,
  detune?: number,
  loop?: boolean,
  loopStart?: number,
  loopEnd?: number,
  playbackRate?: number
) {
  if (!data || audioContext === null) return null;

  const source = audioContext.createBufferSource();

  let buffer = data;

  if (buffer instanceof Blob) {
    buffer = await buffer.arrayBuffer();
  }

  if (buffer instanceof ArrayBuffer) {
    buffer = await audioContext.decodeAudioData(buffer);
  }

  source.buffer = buffer;

  if (detune !== undefined) {
    source.detune.value = detune;
  }

  if (loop !== undefined) {
    source.loop = loop;
  }

  if (loopStart !== undefined) {
    source.loopStart = loopStart;
  }

  if (loopEnd !== undefined) {
    source.loopEnd = loopEnd;
  }

  if (playbackRate !== undefined) {
    source.playbackRate.value = playbackRate;
  }

  return source;
}

export function useAudioDataSource(
  data: ArrayBuffer | AudioBuffer | Blob | null,
  detune?: number,
  loop?: boolean,
  loopStart?: number,
  loopEnd?: number,
  playbackRate?: number
) {
  const audioContext = useAudioContext();

  const [source, setSource] = useState<AudioBufferSourceNode | null>(null);

  useAsyncEffect(
    () =>
      createSource(
        audioContext,
        data,
        detune,
        loop,
        loopStart,
        loopEnd,
        playbackRate
      ),
    (newSource) => {
      setSource(newSource);
    },
    [data, audioContext, detune, loop, loopStart, loopEnd, playbackRate]
  );

  return source;
}

export function useAudioDataPlayback(
  data: ArrayBuffer | AudioBuffer | Blob | null,
  detune?: number,
  loop?: boolean,
  loopStart?: number,
  loopEnd?: number,
  playbackRate?: number
) {
  const audioContext = useAudioContext();

  const start = useCallback(
    async (when?: number, offset?: number, duration?: number) => {
      const source = await createSource(
        audioContext,
        data,
        detune,
        loop,
        loopStart,
        loopEnd,
        playbackRate
      );
      if (source && audioContext) {
        source.connect(audioContext.destination);
        source.start(when, offset, duration);
      }
    },
    [audioContext, data, detune, loop, loopStart, loopEnd, playbackRate]
  );

  return start;
}
