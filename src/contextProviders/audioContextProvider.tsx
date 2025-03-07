import { useEffect, useState } from "react";
import { AudioReactContext, initAudioContext } from "../hooks/audioContext";

export function AudioContextProvider({
  audioContext,
  children,
}: {
  audioContext?: AudioContext;
  children?: React.ReactNode;
}) {
  const [chosenAudioContext, setChosenAudioContext] =
    useState<AudioContext | null>(audioContext || null);

  useEffect(() => {
    if (!chosenAudioContext) {
      initAudioContext(audioContext, (context) => {
        setChosenAudioContext(context);
      });
    }
  }, [audioContext, chosenAudioContext]);

  return (
    <AudioReactContext.Provider value={chosenAudioContext}>
      {children}
    </AudioReactContext.Provider>
  );
}
