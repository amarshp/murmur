!macro customHeader
  ManifestDPIAware true
!macroend

; Electron writes the launch-at-login entry itself, so the generated
; uninstaller does not know to remove it and Windows would keep listing a
; startup item that points at a deleted executable. The Run value is named
; after the AppUserModelId main.js sets (BASE_WINDOWS_APP_ID); disabling an item
; leaves a second value under StartupApproved, so both go.
!define MURMUR_RUN_KEY "Software\Microsoft\Windows\CurrentVersion\Run"
!define MURMUR_STARTUP_APPROVED_KEY "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"

!macro customUnInstall
  ; An in-place update must not turn launch at login off for someone who set it.
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "${MURMUR_RUN_KEY}" "app.murmur.dictation"
    DeleteRegValue HKCU "${MURMUR_STARTUP_APPROVED_KEY}" "app.murmur.dictation"
  ${endIf}
!macroend
