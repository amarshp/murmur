# Murmur

Press a key, speak, and your words are typed wherever your cursor is.

Murmur is a small Windows dictation app.
It streams your voice to Deepgram while you speak, runs a second pass over the finished recording for accuracy, and optionally lets Groq clean up filler words and punctuation.
The pill on your screen glows and moves with your voice, so you can see it is listening.

## Install

1. Download `Murmur-Setup-<version>.exe` from the latest release.
2. Run it.
   Windows may say "Windows protected your PC" because the installer is not code signed yet.
   Choose **More info**, then **Run anyway**.
3. Compare the file's SHA-256 with the `.sha256` file next to it if you want to verify the download.

## Set up

Murmur is bring-your-own-key.
There is no account and no Murmur server.

| Key | Needed | What it does |
| --- | --- | --- |
| Deepgram | Yes | Turns your speech into text, live and again on the finished recording. |
| Groq | No | Cleans up filler words and punctuation, and transcribes if Deepgram cannot be reached. Without it, text is pasted as transcribed. |

Paste the keys on the first screen.
You can change them later in Settings.
Keys are stored encrypted on your computer.

## Use

Pick your own hotkey in Settings, Hotkeys.
Two ways to use it:

- **Press once** (default): press the hotkey to start, speak, press it again to stop.
- **Hold to talk**: hold the hotkey while you speak, let go to finish.

The default hotkey is Ctrl+Win.
The text is pasted at your cursor and also stays on the clipboard, so you can paste it by hand if the app you were in did not accept it.
If a transcription fails, the recording is kept in History and you can retry it.

## Privacy

Your audio and text go only to the providers whose keys you add, using your own account with each.
Murmur has no analytics, no account and no servers of its own.
Once per launch it asks GitHub's public releases page whether a newer version exists, and shows a notice with a link if so.
Nothing about you is sent, and you can turn the check off in Settings, System.
The installer does not update itself: download the new one and run it over the old one.

## Build from source

Requires Windows and Node 24.

```
npm ci
npm run compile:winkeys
npm run compile:winpaste
npm run compile:text-monitor
npm run download:nircmd
npm run build:renderer
node scripts/build-murmur.js
```

The installer is written to `dist-murmur/`.

## Credits and licence

Murmur is a fork of [OpenWhispr](https://github.com/OpenWhispr/openwhispr) and is released under the MIT licence.
See `LICENSE`.
