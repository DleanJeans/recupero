1. Only include one React component per file. However, multiple Stateless, or Pure, Components are allowed per file.

2. Never add package-lock.json to commit

3. Update pnpm-lock.yaml when there is change to package.json dependencies or devDependencies

4. Put util functions in src/utils instead of in component files

5. Make sure behaviorStore is compatible with logs from previous versions

6. Run `format:imports {touched-files-paths}` and format:changed after completing coding

7. Minimize prop drilling. Save and read directly from stores if possible.

8. The app draws edge to edge on Android, so the system nav bar overlaps the bottom of the screen. Anything pinned to the bottom (bottom sheets, modals, floating Save/Use buttons, scroll content ends) must add `useSafeAreaInsets().bottom` to its bottom padding, e.g. `paddingBottom: 16 + insets.bottom`. A `<Modal>` does not inherit the screen's safe area, so sheets inside one need this too.

9. Dialogs, sheets and modals that contain a text input must dock to the TOP of the screen while the keyboard is showing, so the keyboard does not cover them. Use `useKeyboardVisible()` (src/hooks/use-keyboard-visible.ts): when true, set the overlay to `justifyContent: 'flex-start'` (and for a bottom sheet use rounded bottom corners and a max height of about 55-60%, plus `useSafeAreaInsets().top` when the Modal uses `statusBarTranslucent`). When the keyboard is hidden keep the dialog's normal position. Apply this to every new dialog that needs the keyboard. Needs sheets and pickers use FullScreenModal (src/components/full-screen-modal.tsx). Exception: the icon picker is full screen (its search box stays at the top; only the bottom Use button may sit under the keyboard).

10. Every user-facing change (new feature, visible fix, changed behavior) must append a plain-language bullet to the newest day in `src/data/patch-notes.ts` (add a new day at the top if today's is missing). Write for the app's user, not developers. Skip purely internal refactors and CI changes. Each bullet gets a checkbox in the app so DJ can tick it off while testing. When the change is on a screen that can be opened directly (any RootStackParamList route, e.g. 'NeedsSettings', 'Timer', 'CheckIn'), write the bullet as `{ text, screen: 'NeedsSettings', params?, linkLabel? }` instead of a plain string, so it shows an underlined link that navigates there. Use plain strings only when no screen fits (e.g. changes to a sheet or tab with no route).
11. Value/number text on a row (e.g. "0/30m" at the right of a need bar) must stay on ONE line: give it `numberOfLines={1}`, `flexShrink: 0` and a `minWidth` (never a fixed `width`), so the bar track shrinks instead of the unit wrapping onto a second line.

When creating an icon Button, use variant="icon"

See [REGRESSIONS.md](REGRESSIONS.md) for metadata regression contracts.
