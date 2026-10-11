import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "./icons";
import { Button } from "./ui/button";
import { GetApiKeyLink } from "./ui/GetApiKeyLink";
import { useSettingsStore } from "../stores/settingsStore";
import { formatHotkeyLabel } from "../utils/hotkeys";
import { PillEmber } from "./dictation/PillEmber";
import logoMark from "../assets/logo.svg";

type Provider = "deepgram" | "groq" | "openai";
type CheckState = "idle" | "checking" | "ok" | "rejected" | "network";

interface KeyRow {
  provider: Provider;
  required: boolean;
  url: string;
}

const KEY_ROWS: KeyRow[] = [
  { provider: "deepgram", required: true, url: "https://console.deepgram.com/signup" },
  { provider: "groq", required: false, url: "https://console.groq.com/keys" },
  { provider: "openai", required: false, url: "https://platform.openai.com/api-keys" },
];

interface MurmurSetupProps {
  onComplete: () => void;
}

// A slow synthetic "voice" so the backdrop breathes like the pill does while
// listening, without ever touching the microphone on the setup screen.
function breathingLevel(): number {
  const t = performance.now() / 1000;
  const swell = 0.5 + 0.5 * Math.sin(t * 0.9);
  const drift = 0.6 + 0.4 * Math.sin(t * 0.37 + 1.3);
  return 0.003 + 0.022 * swell * drift;
}

export default function MurmurSetup({ onComplete }: MurmurSetupProps) {
  const { t } = useTranslation();
  const dictationKey = useSettingsStore((s) => s.dictationKey);
  const setDeepgramApiKey = useSettingsStore((s) => s.setDeepgramApiKey);
  const setGroqApiKey = useSettingsStore((s) => s.setGroqApiKey);
  const setOpenaiApiKey = useSettingsStore((s) => s.setOpenaiApiKey);

  const [keys, setKeys] = useState<Record<Provider, string>>({
    deepgram: "",
    groq: "",
    openai: "",
  });
  const [checks, setChecks] = useState<Record<Provider, CheckState>>({
    deepgram: "idle",
    groq: "idle",
    openai: "idle",
  });
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const getBackdropLevel = useRef(breathingLevel).current;

  const updateKey = (provider: Provider, value: string) => {
    setKeys((current) => ({ ...current, [provider]: value }));
    setChecks((current) => ({ ...current, [provider]: "idle" }));
  };

  const check = async (provider: Provider) => {
    const key = keys[provider].trim();
    if (!key) return;
    setChecks((current) => ({ ...current, [provider]: "checking" }));
    const result = await window.electronAPI?.testProviderKey?.({ provider, key });
    const state: CheckState = result?.success
      ? "ok"
      : result?.error === "rejected"
        ? "rejected"
        : "network";
    setChecks((current) => ({ ...current, [provider]: state }));
  };

  const canStart = keys.deepgram.trim().length > 0 && checks.deepgram !== "rejected" && !saving;

  const start = async () => {
    setSaving(true);
    const groqKey = keys.groq.trim();
    setDeepgramApiKey(keys.deepgram.trim());
    if (groqKey) setGroqApiKey(groqKey);
    if (keys.openai.trim()) setOpenaiApiKey(keys.openai.trim());
    // Without a Groq key there is no cleanup model to call: text is pasted as
    // transcribed instead of failing on every dictation.
    useSettingsStore.setState({ useCleanupModel: groqKey.length > 0 });
    try {
      localStorage.setItem("useCleanupModel", groqKey ? "true" : "false");
      localStorage.setItem("authenticationSkipped", "true");
      localStorage.setItem("skipAuth", "true");
    } catch {
      // Storage can be unavailable; the defaults already skip the account.
    }
    if (launchAtLogin) await window.electronAPI?.setAutoStartEnabled?.(true);
    onComplete();
  };

  const statusLabel = (state: CheckState) => {
    if (state === "checking") return <Loader2 className="size-4 animate-spin" aria-hidden="true" />;
    if (state === "ok") {
      return (
        <span className="flex items-center gap-1 text-xs text-success">
          <Check className="size-3.5" aria-hidden="true" />
          {t("murmurSetup.keyOk")}
        </span>
      );
    }
    if (state === "rejected") {
      return <span className="text-xs text-destructive">{t("murmurSetup.keyRejected")}</span>;
    }
    if (state === "network") {
      return <span className="text-xs text-muted-foreground">{t("murmurSetup.keyUnchecked")}</span>;
    }
    return null;
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      >
        <PillEmber
          getLevel={getBackdropLevel}
          recording
          thinking={false}
          unavailable={false}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="relative flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-3">
          <img
            src={logoMark}
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            draggable={false}
            className="size-16 rounded-2xl shadow-[0_8px_32px_rgba(255,106,26,0.35)]"
          />
          <h1 className="bg-gradient-to-r from-[#ffd23f] via-[#ff8a1f] to-[#ff3d6e] bg-clip-text font-display text-3xl font-semibold text-transparent">
            {t("murmurSetup.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("murmurSetup.subtitle", { hotkey: formatHotkeyLabel(dictationKey) })}
          </p>
        </header>

        <div className="flex flex-col gap-4">
          {KEY_ROWS.map((row) => (
            <div key={row.provider} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`murmur-key-${row.provider}`} className="text-sm font-medium">
                  {t(`murmurSetup.${row.provider}.label`)}
                  {!row.required && (
                    <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                      {t("murmurSetup.optional")}
                    </span>
                  )}
                </label>
                <span className="flex items-center gap-3">
                  {statusLabel(checks[row.provider])}
                  <GetApiKeyLink url={row.url} labelKey="murmurSetup.getKey" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={`murmur-key-${row.provider}`}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={keys[row.provider]}
                  onChange={(event) => updateKey(row.provider, event.target.value)}
                  onBlur={() => void check(row.provider)}
                  className="h-9 w-full min-w-0 rounded-md border border-border bg-surface-1 px-3 text-sm outline-none focus:border-border-hover"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t(`murmurSetup.${row.provider}.help`)}
              </p>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={launchAtLogin}
            onChange={(event) => setLaunchAtLogin(event.target.checked)}
          />
          {t("murmurSetup.launchAtLogin")}
        </label>

        <Button onClick={() => void start()} disabled={!canStart} className="h-10">
          {t("murmurSetup.start")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("murmurSetup.privacy")}</p>
      </div>
    </div>
  );
}
