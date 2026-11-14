1. Only include one React component per file. However, multiple Stateless, or Pure, Components are allowed per file.

2. Never add package-lock.json to commit

3. Update pnpm-lock.yaml when there is change to package.json dependencies or devDependencies

4. Put util functions in src/utils instead of in component files

5. Make sure behaviorStore is compatible with logs from previous versions

6. Run `format:imports {touched-files-paths}` and format:changed after completing coding

7. Minimize prop drilling. Save and read directly from stores if possible.

8. The app draws edge to edge on Android, so the system nav bar overlaps the bottom of the screen. Anything pinned to the bottom (bottom sheets, modals, floating Save/Use buttons, scroll content ends) must add `useSafeAreaInsets().bottom` to its bottom padding, e.g. `paddingBottom: 16 + insets.bottom`. A `<Modal>` does not inherit the screen's safe area, so sheets inside one need this too.

9. Dialogs, sheets and modals that contain a text input must be docked to the TOP of the screen (overlay `justifyContent: 'flex-start'`, rounded bottom corners, max height about 55-60%, plus `useSafeAreaInsets().top` when the Modal uses `statusBarTranslucent`), never centered or bottom-docked, so the on-screen keyboard does not cover them. Apply this to every new dialog that needs the keyboard.

When creating an icon Button, use variant="icon"

See [REGRESSIONS.md](REGRESSIONS.md) for metadata regression contracts.
