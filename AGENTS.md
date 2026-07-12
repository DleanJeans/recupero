1. Only include one React component per file. However, multiple Stateless, or Pure, Components are allowed per file.

2. Never add package-lock.json to commit

3. Update pnpm-lock.yaml when there is change to package.json dependencies or devDependencies

4. Put util functions in src/utils instead of in component files

5. Make sure behaviorStore is compatible with logs from previous versions

6. Run `format:imports {touched-files-paths}` and format:changed after completing coding

7. Minimize prop drilling. Save and read directly from stores if possible.

When creating an icon Button, use variant="icon"