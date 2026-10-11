import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";
import { formatHotkeyLabel, parseHotkeyList } from "../../utils/hotkeys";
import { useSettingsStore } from "../../stores/settingsStore";
import { BIDI_VALUE_TOKEN, BidiInterpolatedText } from "./BidiInterpolatedText";

/** "Press <hotkey> and start speaking." (or "Hold ..." in hold-to-talk mode), each hotkey drawn as a key cap. */
export default function DictationHotkeyHint({
  hotkey,
  className,
}: {
  hotkey: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const holdToTalk = useSettingsStore((s) => s.activationMode === "push");
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
    >
      <BidiInterpolatedText
        text={t(
          holdToTalk
            ? "controlPanel.history.shortcutHintHold"
            : "controlPanel.history.shortcutHint",
          { shortcut: BIDI_VALUE_TOKEN }
        )}
        value={
          <span className="inline-flex items-center gap-1">
            {parseHotkeyList(hotkey).map((hk, index) => (
              <Fragment key={hk}>
                {index > 0 && <span className="text-foreground/45">/</span>}
                <kbd className="rounded-md bg-background px-1.5 py-px font-sans text-[11px] font-medium text-foreground/80 shadow-sm dark:bg-surface-2">
                  {formatHotkeyLabel(hk)}
                </kbd>
              </Fragment>
            ))}
          </span>
        }
      />
    </span>
  );
}
