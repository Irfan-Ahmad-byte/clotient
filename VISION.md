# Clotient Studio Project Vision

Clotient is a premium, developer-focused, open-source API client and testing sandbox. Our goal is to provide a fast, local-first alternative to bloated API testing utilities, built on top of Rust and Tauri.

## 🎯 Core Values

1. **Local-First & Private**: Your data belongs to you. Clotient operates entirely client-side, saving environment settings and collections to secure local files instead of requiring cloud accounts or remote servers.
2. **Speed & Efficiency**: Leveraging Rust's `reqwest` client, Clotient bypasses browser-native CORS limitations and executes queries with minimal CPU and memory usage.
3. **Rich Aesthetics**: The user experience should feel premium, sleek, and intuitive, utilizing a crafted dark mode, responsive layouts, and smooth animations.
4. **Isolated Sandbox Scripting**: Built-in Javascript pre-request and post-request scripting pads run in a safe virtual context to inspect request configurations and validate assertions without security risks.
5. **Open Source Core**: Built for the community. We maintain simple contribution guidelines, clean TypeScript components, and a modular architecture.

---

## 🗺️ Roadmap & Features

### Phase 1: REST Client (Current Release)
- Full REST API support (GET, POST, PUT, DELETE, etc.).
- Safe, file-based state persistence.
- Postman Collection (v2.1) import and export compatibilities.
- Custom Headers, URL params, and URL-encoded / Form-Data bodies.
- Lightweight JavaScript sandbox for assertions and console logs.
- Multi-language request code generation.

### Phase 2: Collaboration & Workspaces (Upcoming)
- Git-backed collection synchronization.
- Multi-tab query editor panel.
- Advanced Cookie management.
- Dynamic environment variable autocompletion.
- Quick-look variables popover widgets.

### Phase 3: Performance & Scale
- Collection runner for batch testing and performance benchmarking.
- gRPC, WebSocket, and GraphQL schema support.
- Custom CLI runner (`clotient-cli`) for CI/CD pipeline integration.
