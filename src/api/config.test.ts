import { beforeEach, describe, expect, it } from "bun:test";
import {
  getServerPass,
  getServerUrl,
  isConfigured,
  setServerPass,
  setServerUrl,
} from "./config";

describe("config storage", () => {
  beforeEach(() => {
    setServerUrl("");
    setServerPass("");
  });

  it("returns empty strings before anything is stored", () => {
    expect(getServerUrl()).toBe("");
    expect(getServerPass()).toBe("");
    expect(isConfigured()).toBe(false);
  });

  it("persists the server URL", () => {
    setServerUrl("https://example.com");
    expect(getServerUrl()).toBe("https://example.com");
    expect(isConfigured()).toBe(true);
  });

  it("strips trailing slashes from the stored URL", () => {
    setServerUrl("https://example.com///");
    expect(getServerUrl()).toBe("https://example.com");
  });

  it("persists the server pass", () => {
    setServerPass("s3cret");
    expect(getServerPass()).toBe("s3cret");
  });

  it("isConfigured reflects URL presence only", () => {
    setServerPass("s3cret");
    expect(isConfigured()).toBe(false);
    setServerUrl("https://example.com");
    expect(isConfigured()).toBe(true);
    setServerUrl("");
    expect(isConfigured()).toBe(false);
  });
});
