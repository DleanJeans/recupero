# Maestro Testing for Recupero

This directory contains Maestro test flows for the Recupero mobile app.

## Prerequisites

1. **Install Maestro CLI**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Verify installation**:
   ```bash
   maestro --version
   ```

3. **Build and install the app on an emulator**:
   ```bash
   npx expo run:android
   ```

## Running Tests

Tests require a running Metro bundler since they use the Expo dev client deep link to connect.

### 1. Start Metro bundler
```bash
pnpm start
```

### 2. Run tests (in another terminal)
```bash
# Run all tests
pnpm test:maestro

# Run a specific test
maestro test .maestro/issues/01-home-screen.yaml

# Interactive mode (debugging)
maestro studio
```

## Test Organization

Tests are organized in `.maestro/issues/` by GitHub issue number:
```
.maestro/
  00-launch-app.yaml    # Reusable launch flow
  config.yaml           # Maestro configuration
  issues/               # Test flows by issue
```

## Troubleshooting

- **App launches to Expo launcher**: Ensure Metro bundler is running (`pnpm start`)
- **Tests timing out**: First load is slower due to Metro bundling
- **Element not found**: Use `maestro studio` to inspect elements interactively
