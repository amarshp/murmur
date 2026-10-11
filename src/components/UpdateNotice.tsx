import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, X } from "./icons";
import { BIDI_VALUE_TOKEN, BidiInterpolatedText } from "./ui/BidiInterpolatedText";
import { isUpdateCheckEnabled } from "../utils/updateCheckPreference";

const DISMISSED_KEY = "murmurDismissedVersion";
const CHECK_DELAY_MS = 8000;

/**
 * The installer is unsigned and does not update itself, so a newer release is
 * announced here with a link to its page. One public GET per launch, off in
 * Settings, dismissed per version.
 */
export default function UpdateNotice() {
  const { t } = useTranslation();
  const [release, setRelease] = useState<{ version: string; url: string } | null>(null);

  useEffect(() => {
    if (!isUpdateCheckEnabled()) return;
    const timer = setTimeout(async () => {
      const result = await window.electronAPI?.checkMurmurRelease?.();
      if (!result?.available || !result.version || !result.url) return;
      let dismissed = null;
      try {
        dismissed = localStorage.getItem(DISMISSED_KEY);
      } catch {
        // Treated as not dismissed.
      }
      if (dismissed !== result.version) setRelease({ version: result.version, url: result.url });
    }, CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!release) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 px-3.5 py-2.5 dark:bg-primary/12">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <p className="min-w-0 flex-1 text-xs text-foreground">
        <BidiInterpolatedText
          text={t("murmurUpdate.available", { version: BIDI_VALUE_TOKEN })}
          value={release.version}
        />
      </p>
      <button
        onClick={() => void window.electronAPI?.openExternal?.(release.url)}
        className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-transform hover:brightness-110 active:scale-[0.97]"
      >
        {t("murmurUpdate.download")}
        <ExternalLink size={12} />
      </button>
      <button
        onClick={() => {
          try {
            localStorage.setItem(DISMISSED_KEY, release.version);
          } catch {
            // Dismissal lasts for this session only.
          }
          setRelease(null);
        }}
        aria-label={t("common.close")}
        className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X size={13} />
      </button>
    </div>
  );
}
