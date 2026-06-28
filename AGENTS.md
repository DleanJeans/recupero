1. Never add package-lock.json to commit

2. Update pnpm-lock.yaml when there is change to package.json dependencies or devDependencies

3. Put util functions in src/utils instead of in component files

4. Make sure behaviorStore is compatible with logs from previous versions

5. Run `format:imports {touched-files-paths}` and format:changed after completing coding

6. New branch naming: {feat|bug}/issue{number}-{issue title or feature/fix content}

7. Minimize prop drilling. Save and read directly from stores if possible.
