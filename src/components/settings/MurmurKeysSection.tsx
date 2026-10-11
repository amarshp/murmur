import { useTranslation } from "react-i18next";
import ApiKeyInput from "../ui/ApiKeyInput";
import { GetApiKeyLink } from "../ui/GetApiKeyLink";
import LanguageSelector from "../ui/LanguageSelector";
import { SettingsPanel, SettingsPanelRow, SettingsRow } from "../ui/SettingsSection";
import { Toggle } from "../ui/toggle";
import { useSettingsStore } from "../../stores/settingsStore";

interface KeyRow {
  id: "deepgram" | "groq";
  url: string;
}

const KEY_ROWS: KeyRow[] = [
  { id: "deepgram", url: "https://console.deepgram.com/signup" },
  { id: "groq", url: "https://console.groq.com/keys" },
];

/**
 * Murmur's whole "AI models" surface: the two provider keys, the dictation
 * language, and whether Groq cleans up the text. Everything else a provider
 * list would offer is deliberately absent.
 */
export default function MurmurKeysSection() {
  const { t } = useTranslation();
  const deepgramApiKey = useSettingsStore((s) => s.deepgramApiKey);
  const groqApiKey = useSettingsStore((s) => s.groqApiKey);
  const setDeepgramApiKey = useSettingsStore((s) => s.setDeepgramApiKey);
  const setGroqApiKey = useSettingsStore((s) => s.setGroqApiKey);
  const preferredLanguage = useSettingsStore((s) => s.preferredLanguage);
  const setPreferredLanguage = useSettingsStore((s) => s.setPreferredLanguage);
  const useCleanupModel = useSettingsStore((s) => s.useCleanupModel);
  const setUseCleanupModel = useSettingsStore((s) => s.setUseCleanupModel);

  const values = { deepgram: deepgramApiKey, groq: groqApiKey };
  const setters = {
    deepgram: setDeepgramApiKey,
    groq: setGroqApiKey,
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3">
          <h3 className="text-xs font-semibold tracking-tight text-foreground">
            {t("murmurKeys.keysTitle")}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground/80">
            {t("murmurKeys.keysDescription")}
          </p>
        </div>
        <SettingsPanel>
          {KEY_ROWS.map((row) => (
            <SettingsPanelRow key={row.id}>
              <ApiKeyInput
                apiKey={values[row.id]}
                setApiKey={setters[row.id]}
                label={t(`murmurSetup.${row.id}.label`)}
                helpText={
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    {t(`murmurSetup.${row.id}.help`)}
                    <GetApiKeyLink url={row.url} labelKey="murmurSetup.getKey" />
                  </span>
                }
              />
            </SettingsPanelRow>
          ))}
        </SettingsPanel>
      </section>

      <section>
        <SettingsPanel>
          <SettingsPanelRow>
            <SettingsRow
              label={t("murmurKeys.language")}
              description={t("murmurKeys.languageDescription")}
            >
              <LanguageSelector value={preferredLanguage} onChange={setPreferredLanguage} />
            </SettingsRow>
          </SettingsPanelRow>
          <SettingsPanelRow>
            <SettingsRow
              label={t("murmurKeys.cleanup")}
              description={
                groqApiKey ? t("murmurKeys.cleanupDescription") : t("murmurKeys.cleanupNeedsKey")
              }
            >
              <Toggle
                checked={useCleanupModel && Boolean(groqApiKey)}
                onChange={setUseCleanupModel}
                disabled={!groqApiKey}
              />
            </SettingsRow>
          </SettingsPanelRow>
        </SettingsPanel>
      </section>
    </div>
  );
}
