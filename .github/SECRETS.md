# GitHub Actions — Secrets & Setup

## Required secrets

| Secret | Required | Notes |
|--------|----------|-------|
| `GITHUB_TOKEN` | Auto-provided | Used for tagging and publishing releases. No manual setup. |

No other secrets are required for unsigned builds and GitHub Pages deployment.

## Optional secrets (signed macOS distribution only)

| Secret | Purpose |
|--------|---------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` signing certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` file |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Name (TEAMID)` |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

## One-time repository settings

1. **GitHub Pages:** Settings → Pages → Build and deployment → Source: **GitHub Actions**
2. **New release:** Bump `version` in `package.json` before pushing to `master` (CI skips release if the tag already exists)
