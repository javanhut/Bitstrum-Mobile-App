import { createContext, useContext, type ReactNode } from "react";

type Ctx = {
  position: number;
  duration: number;
};

const defaultCtx: Ctx = { position: 0, duration: 0 };
const AudioStatusContext = createContext<Ctx>(defaultCtx);

export function AudioStatusProvider({
  position,
  duration,
  children,
}: {
  position: number;
  duration: number;
  children: ReactNode;
}) {
  return (
    <AudioStatusContext.Provider value={{ position, duration }}>
      {children}
    </AudioStatusContext.Provider>
  );
}

export function useProgress(): Ctx {
  return useContext(AudioStatusContext);
}
