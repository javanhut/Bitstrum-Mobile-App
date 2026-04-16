type RemoteEvent = "play" | "pause" | "next" | "prev" | "seek" | "stop";

type Payloads = {
  play: void;
  pause: void;
  next: void;
  prev: void;
  seek: number;
  stop: void;
};

type Listener<E extends RemoteEvent> = (payload: Payloads[E]) => void;

const buckets: { [E in RemoteEvent]: Set<Listener<E>> } = {
  play: new Set(),
  pause: new Set(),
  next: new Set(),
  prev: new Set(),
  seek: new Set(),
  stop: new Set(),
};

function on<E extends RemoteEvent>(event: E, fn: Listener<E>): () => void {
  buckets[event].add(fn as never);
  return () => {
    buckets[event].delete(fn as never);
  };
}

function emit<E extends RemoteEvent>(event: E, payload: Payloads[E]): void {
  for (const fn of buckets[event]) {
    (fn as Listener<E>)(payload);
  }
}

export const remoteEvents = { on, emit };
