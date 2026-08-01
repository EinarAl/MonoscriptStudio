# MonoscriptStudio

Turn images, SVG, and 3D models into ASCII art, animated ASCII GIFs, and terminal scripts. One upload, three modes, a shared filter and preset stack.

## Problem Statement

ASCII art tools tend to be either toys or narrow developer utilities. None of them take a real asset and produce all three outputs people actually want: a static image, an animated GIF, and a 3D render you can run in a terminal. MonoscriptStudio covers all three from a single upload, with the same filters and presets applied in every mode.

## System Architecture

Data flows through one pipeline regardless of mode. Uploads are normalized to `ImageData` (or a 3D geometry), pushed through the filter/preset stack, sampled into an ASCII grid, then rendered to whichever output the mode needs.

```
                 ┌────────────────────────────┐
  PNG / JPG ────►│                            │──► ImageData
  SVG ──────────►│   Upload + normalize       │──► ImageData (+ extrude → geometry)
  3D model ─────►│   (glb/gltf/obj/stl/ply)   │──► merged BufferGeometry
                 └─────────────┬──────────────┘
                               ▼
                 ┌────────────────────────────┐
                 │   Filter & preset stack    │
                 │   (filters.ts, shared)     │
                 └─────────────┬──────────────┘
                               ▼
                 ┌────────────────────────────┐
                 │   ASCII grid sampling      │
                 │   (imageToAscii / 3D pixel │
                 │    read at 640x480)        │
                 └─────────────┬──────────────┘
                               ▼
     ┌──────────────┬──────────┴─────────┬────────────────┐
     ▼              ▼                    ▼                ▼
  Static art     Animated GIF        3D ASCII        Terminal script
  (txt / html /  (gif.js worker)     (three.js +     (logo.js with
   svg / json /                       ascii filter)   baked point cloud)
   png)
```

Three modes share one sidebar (filters, presets) and a per-mode toolbar (sampling, tone, color, animation). The 3D mode reads the WebGL framebuffer each frame and converts it to an ASCII grid in real time.

## Component Choices

- **React 19 + Vite 8 + TypeScript 6** for the shell. Chosen for fast HMR and a zero-config static build. Rejected Next.js because there is no server logic; this is a pure client tool and a static `dist/` is the deployment target.
- **three.js 0.172** for the 3D mode. Mature loaders for GLB/GLTF/OBJ/STL/PLY and solid WebGL rendering. Tradeoff: it dominates the bundle at roughly 1MB minified (about 290KB gzip), which is acceptable for a tool site but heavy for a landing page.
- **gif.js** for animated GIF output. Simplest path from canvas frames to an encoded GIF via a worker. Tradeoff: a single worker means long exports run partially on the main thread and block input.
- **framer-motion** for UI motion (mode toggle springs, section expand/collapse). Chosen for the polished feel. Tradeoff: it pulls in a bundle cost that plain CSS transitions would avoid, but the spring behavior is what gives the toolbar its character.
- **No state library**. React state plus refs hold the shared options object and per-mode buffers. Rejected Redux and Zustand: cross-component state is a single tree and does not justify another dependency.
- **Custom `imageToAscii.ts` / `filters.ts`** instead of an existing ASCII library, because the filter and preset stack has to work identically on raster frames and 3D pixel reads. Off-the-shelf libs could not do both.

## What I'd Do Differently

- `ogl` is still in `package.json` but unused; it would be pruned.
- The warp frame cache in `gifAscii.ts` was bolted on after the GIF pipeline existed. The filter stack should have been structured cache-aware from day one so filter-only edits never re-run per-frame warp math.
- GIF encoding blocks the UI during long exports. I would move it to a dedicated worker pool with progress callbacks instead of a single worker.
- The 3D ASCII loop renders a fixed 640x480 offscreen buffer and reads pixels every frame. I would sample at the display resolution and reuse a single render target.

## Setup

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
pnpm preview
```

The build outputs a static site to `dist/` and deploys as-is to Vercel, Netlify, or any static host.

## License

GNU GPL v3. See [LICENSE](LICENSE).
