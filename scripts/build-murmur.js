#!/usr/bin/env node
// Builds the Murmur Windows installer.
//
// The base is electron-builder.json, narrowed in code so there is one source of
// truth for packaging rules: Windows only, no signing, no update feed, no
// bundled `.env`, and only the native helpers dictation uses.
//
// Usage: node scripts/build-murmur.js [--dir]

const fs = require("fs");
const path = require("path");
const builder = require("electron-builder");

const root = path.join(__dirname, "..");
const base = JSON.parse(fs.readFileSync(path.join(root, "electron-builder.json"), "utf8"));

// Everything dictation needs from resources/bin, and nothing else.
const WINDOWS_BIN_FILTER = [
  "windows-key-listener*",
  "windows-text-monitor*",
  "windows-fast-paste*",
  "vcruntime140*.dll",
  "msvcp140.dll",
];

// Murmur has no local embeddings or speaker models, and the ONNX runtime ships
// every platform's binaries (about 260 MB unpacked), so none of it is packaged.
const EXCLUDED_MODULES = [
  "!**/node_modules/onnxruntime-node/**",
  "!**/node_modules/onnxruntime-common/**",
  "!**/node_modules/onnxruntime-web/**",
];

const srcAssets = base.extraResources.find((r) => r && r.from === "src/assets");

const config = {
  ...base,
  appId: "app.murmur.dictation",
  productName: "Murmur",
  afterPack: "scripts/afterPackMurmur.js",
  directories: { output: "dist-murmur" },
  files: [...base.files, ...EXCLUDED_MODULES],
  asarUnpack: base.asarUnpack.filter((entry) => !entry.includes("onnxruntime-node")),
  extraMetadata: { windowsTrayIdentity: false },
  protocols: undefined,
  publish: null,
  mac: undefined,
  linux: undefined,
  flatpak: undefined,
  deb: undefined,
  rpm: undefined,
  dmg: undefined,
  extraResources: [
    srcAssets,
    { from: "resources/bin/", to: "bin/", filter: WINDOWS_BIN_FILTER },
    { from: "resources/bin/nircmd.exe", to: "bin/nircmd.exe" },
  ],
  win: {
    target: ["nsis"],
    icon: "src/assets/icon.ico",
    azureSignOptions: null,
    forceCodeSigning: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    include: "resources/nsis/murmur-installer.nsh",
    artifactName: "Murmur-Setup-${version}.${ext}",
  },
};

// Passed as a file: with an object electron-builder still loads and merges
// electron-builder.json from the project root, which would bring back the
// binaries and the `.env` this config leaves out.
const configPath = path.join(root, "electron-builder.murmur.generated.json");
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

const dirOnly = process.argv.includes("--dir");

builder
  .build({
    projectDir: root,
    targets: builder.Platform.WINDOWS.createTarget(dirOnly ? "dir" : "nsis", builder.Arch.x64),
    config: configPath,
    publish: "never",
  })
  .then((artifacts) => {
    for (const artifact of artifacts) console.log(`built ${artifact}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
