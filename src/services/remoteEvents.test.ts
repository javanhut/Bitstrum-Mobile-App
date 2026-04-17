import { describe, expect, it } from "bun:test";
import { remoteEvents } from "./remoteEvents";

describe("remoteEvents", () => {
  it("invokes a listener when its event is emitted", () => {
    let calls = 0;
    const off = remoteEvents.on("play", () => {
      calls++;
    });
    remoteEvents.emit("play", undefined);
    expect(calls).toBe(1);
    off();
  });

  it("passes payloads to typed listeners", () => {
    const received: number[] = [];
    const off = remoteEvents.on("seek", (t) => {
      received.push(t);
    });
    remoteEvents.emit("seek", 42);
    expect(received).toEqual([42]);
    off();
  });

  it("supports multiple listeners for the same event", () => {
    let a = 0;
    let b = 0;
    const offA = remoteEvents.on("pause", () => {
      a++;
    });
    const offB = remoteEvents.on("pause", () => {
      b++;
    });
    remoteEvents.emit("pause", undefined);
    expect(a).toBe(1);
    expect(b).toBe(1);
    offA();
    offB();
  });

  it("stops invoking a listener after unsubscribe", () => {
    let calls = 0;
    const off = remoteEvents.on("stop", () => {
      calls++;
    });
    remoteEvents.emit("stop", undefined);
    off();
    remoteEvents.emit("stop", undefined);
    expect(calls).toBe(1);
  });

  it("does not cross-fire listeners across events", () => {
    let nexts = 0;
    let prevs = 0;
    const offN = remoteEvents.on("next", () => {
      nexts++;
    });
    const offP = remoteEvents.on("prev", () => {
      prevs++;
    });
    remoteEvents.emit("next", undefined);
    expect(nexts).toBe(1);
    expect(prevs).toBe(0);
    offN();
    offP();
  });

  it("emit with no listeners is a no-op", () => {
    expect(() => remoteEvents.emit("play", undefined)).not.toThrow();
  });
});
