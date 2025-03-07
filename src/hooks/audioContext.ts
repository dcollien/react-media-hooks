import { createContext, useContext, useEffect, useState } from "react";

export const AudioReactContext = createContext<AudioContext | null | undefined>(
  undefined
);

const globalAudioContext: AudioContext = new AudioContext();

export function initAudioContext(
  audioContext?: AudioContext,
  onInit?: (context: AudioContext) => void
) {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }

  // AudioContext requires user interaction to start
  // otherwise it will be suspended / give a warning
  function onUserInteraction() {
    if (!audioContext) {
      return;
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    if (onInit) {
      onInit(audioContext);
    }

    // Remove event listeners after first interaction
    document.removeEventListener("click", onUserInteraction);
    document.removeEventListener("keydown", onUserInteraction);
    document.removeEventListener("mousedown", onUserInteraction);
    document.removeEventListener("touchstart", onUserInteraction);
    document.removeEventListener("pointerdown", onUserInteraction);
  }

  if (audioContext.state === "suspended") {
    document.addEventListener("click", onUserInteraction);
    document.addEventListener("keydown", onUserInteraction);
    document.addEventListener("mousedown", onUserInteraction);
    document.addEventListener("touchstart", onUserInteraction);
    document.addEventListener("pointerdown", onUserInteraction);
  } else if (onInit) {
    onInit(audioContext);
  }
}

export function useAudioContext() {
  const [contextState, setContextState] = useState<AudioContext | null>(null);

  const providedContext = useContext(AudioReactContext);

  useEffect(() => {
    if (providedContext === undefined) {
      initAudioContext(globalAudioContext, (context) => {
        setContextState(context);
      });
    }
  }, [providedContext]);

  return providedContext !== undefined ? providedContext : contextState;
}
