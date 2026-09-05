# Manticore Visual Editor

Desktop visual editor for the Manticore 2.0 engine.

## Development

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev
```

`npm run dev` starts three coordinated processes:

- Vite serves the React renderer with hot-module replacement.
- Rollup watches and rebuilds Electron's main and preload processes.
- Electronmon restarts Electron whenever that main-process bundle changes.

## Build and checks

```bash
npm run build
npm run check
npm run dist --workspace @manticore/desktop
```

Turbo runs workspace tasks; the desktop build writes the renderer and Electron bundles to `apps/desktop/dist`.
`npm run dist --workspace @manticore/desktop` creates a Linux x64 AppImage in `apps/desktop/release`.
