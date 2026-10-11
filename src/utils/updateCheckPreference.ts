const CHECK_OFF_KEY = "murmurUpdateCheck";

export function isUpdateCheckEnabled(): boolean {
  try {
    return localStorage.getItem(CHECK_OFF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setUpdateCheckEnabled(enabled: boolean) {
  try {
    localStorage.setItem(CHECK_OFF_KEY, enabled ? "on" : "off");
  } catch {
    // Storage blocked: the preference just does not persist.
  }
}
