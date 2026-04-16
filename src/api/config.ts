import { MMKV } from "react-native-mmkv";

const storage = new MMKV({ id: "bitstrum-config" });

const SERVER_URL_KEY = "server-url";
const SERVER_PASS_KEY = "server-pass";

export function getServerUrl(): string {
  return storage.getString(SERVER_URL_KEY) ?? "";
}

export function setServerUrl(url: string): void {
  storage.set(SERVER_URL_KEY, url.replace(/\/+$/, ""));
}

export function getServerPass(): string {
  return storage.getString(SERVER_PASS_KEY) ?? "";
}

export function setServerPass(pass: string): void {
  storage.set(SERVER_PASS_KEY, pass);
}

export function isConfigured(): boolean {
  return getServerUrl().length > 0;
}
