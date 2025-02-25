import { useEffect, useState } from "react";
import { useAudioContext, useAudioLevel, useAudioSource } from "../hooks/audio";

const NUM_BARS = 60;

function useBars(
  level: number,
  timestamp: number,
  disabled = false,
  numBars = NUM_BARS,
  gain = 4.5
) {
  // The bars are the audio level history
  const [bars, setBars] = useState(Array.from({ length: numBars }, () => 0));

  // Give it a boost because it's often too low
  const boostedLevel = Math.min(1, Math.log(1 + level * gain));

  // Update the bars with the new audio level
  // each time the timestamp changes
  useEffect(() => {
    if (disabled) return;

    setBars((bars) => {
      const newBars = [...bars];
      newBars.shift();
      newBars.push(boostedLevel);
      return newBars;
    });
  }, [boostedLevel, timestamp, disabled]);

  // Reset the bars when disabled (only do this if disabled changes)
  useEffect(() => {
    // N.B. this needs to be an effect because we want to the
    // bars to be reset when it's enabled again
    if (disabled) {
      setBars(Array.from({ length: NUM_BARS }, () => 0));
    }
  }, [disabled]);

  return bars;
}

export function AudioScroller({
  audioStream,
  disabled,
}: {
  audioStream: MediaStream | null;
  disabled: boolean;
}) {
  // Global audio context
  const audioContext = useAudioContext();

  // Create the audio source on the audio context, from the stream
  const audioSource = useAudioSource(audioContext, audioStream);

  // audio level is between 0 and 1
  const { level, timestamp } = useAudioLevel(audioContext, audioSource);

  const bars = useBars(level, timestamp, disabled);

  const height = 20;
  const maxLevelHeight = disabled ? 1 : height;
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: `${height}px`,
        }}
      >
        {bars.map((value, i) => (
          <div
            key={i}
            style={{
              width: "3px",
              height: `${Math.max(1, Math.floor(maxLevelHeight * value))}px`,
              marginRight: "1px",
              borderRadius: "3px",
              backgroundColor: disabled ? `grey` : `white`,
            }}
          />
        ))}
      </div>
    </>
  );
}
