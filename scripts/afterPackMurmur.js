// electron-builder afterPack hook for the Murmur Windows build.
//
// Fails the build when something is missing that dictation cannot work
// without, or when something that must never ship is present: a `.env`
// (API keys) anywhere in the package, or a runtime for features Murmur does
// not have.

const fs = require("fs");
const path = require("path");

const REQUIRED_BIN = [
  "windows-key-listener.exe",
  "windows-fast-paste.exe",
  "windows-text-monitor.exe",
];
const FORBIDDEN_BIN_FRAGMENTS = [
  "qdrant",
  "llama-server",
  "whisper-server",
  "sherpa-onnx",
  "yt-dlp",
  "meeting-aec",
  "ow-onnxrt",
];

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

exports.default = async function afterPackMurmur(context) {
  if (context.electronPlatformName !== "win32") {
    throw new Error("afterPackMurmur: Murmur only builds for Windows");
  }
  const resources = path.join(context.appOutDir, "resources");
  const binDir = path.join(resources, "bin");

  for (const name of REQUIRED_BIN) {
    if (!fs.existsSync(path.join(binDir, name))) {
      throw new Error(`afterPackMurmur: missing ${name} in ${binDir}`);
    }
  }

  const present = fs.existsSync(binDir) ? fs.readdirSync(binDir) : [];
  const stray = present.filter((file) => FORBIDDEN_BIN_FRAGMENTS.some((f) => file.includes(f)));
  if (stray.length > 0) {
    throw new Error(`afterPackMurmur: unwanted binaries shipped: ${stray.join(", ")}`);
  }

  const envFiles = listFiles(resources).filter((file) => path.basename(file).startsWith(".env"));
  if (envFiles.length > 0) {
    throw new Error(`afterPackMurmur: an env file would ship: ${envFiles.join(", ")}`);
  }

  const unpacked = path.join(resources, "app.asar.unpacked", "node_modules");
  const ffmpeg = path.join(unpacked, "ffmpeg-static", "ffmpeg.exe");
  if (!fs.existsSync(ffmpeg)) {
    throw new Error(`afterPackMurmur: missing ${ffmpeg}`);
  }
  console.log("  afterPackMurmur: required binaries present, no env file, no unused runtimes");
};
