// "Is there a newer Murmur?" - the unsigned build has no auto-update, so the app
// asks GitHub's public releases API once and links to the release page.
// No account, no identifiers: a plain GET of a public URL.

const REPO = "amarshp/murmur";
const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;
const TIMEOUT_MS = 8000;

function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(value || "").trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** True when `latest` is a strictly higher x.y.z than `current`; false for anything unparsable. */
function isNewerVersion(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

async function checkForNewRelease(currentVersion, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(LATEST_URL, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Murmur" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { available: false };
    const release = await response.json();
    if (release?.draft || release?.prerelease) return { available: false };
    const version = String(release?.tag_name || "").replace(/^v/, "");
    if (!isNewerVersion(version, currentVersion)) return { available: false };
    return { available: true, version, url: RELEASES_PAGE };
  } catch {
    // Offline or rate limited: a missed notice is not worth an error.
    return { available: false };
  }
}

module.exports = { checkForNewRelease, isNewerVersion, RELEASES_PAGE };
