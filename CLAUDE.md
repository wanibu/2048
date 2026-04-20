# 2048 Project

## Phaser 4 AI Skills Reference

When working on Phaser 4 code in this project, reference the skill documents in `.claude/skills/` for API guidance:

- **Migration**: `.claude/skills/v3-to-v4-migration/SKILL.md` - v3 to v4 breaking changes and migration checklist
- **New Features**: `.claude/skills/v4-new-features/SKILL.md` - New game objects, filters, render nodes
- **Game Setup**: `.claude/skills/game-setup-and-config/SKILL.md` - GameConfig, renderer, scaling
- **Scenes**: `.claude/skills/scenes/SKILL.md` - Scene lifecycle, transitions
- **Sprites/Images**: `.claude/skills/sprites-and-images/SKILL.md` - Sprite, Image, texture frames
- **Physics (Arcade)**: `.claude/skills/physics-arcade/SKILL.md` - Arcade physics, collisions
- **Input**: `.claude/skills/input-keyboard-mouse-touch/SKILL.md` - Keyboard, mouse, touch
- **Animations**: `.claude/skills/animations/SKILL.md` - Sprite animations
- **Tweens**: `.claude/skills/tweens/SKILL.md` - Tweens and easing
- **Groups/Containers**: `.claude/skills/groups-and-containers/SKILL.md` - Groups, containers
- **Scale/Responsive**: `.claude/skills/scale-and-responsive/SKILL.md` - ScaleManager, responsive layout
- **Loading Assets**: `.claude/skills/loading-assets/SKILL.md` - Asset loading
- **Text**: `.claude/skills/text-and-bitmaptext/SKILL.md` - Text, BitmapText
- **Audio**: `.claude/skills/audio-and-sound/SKILL.md` - Sound playback
- **Timers**: `.claude/skills/time-and-timers/SKILL.md` - Timer events
- **Particles**: `.claude/skills/particles/SKILL.md` - Particle emitters
- **Graphics/Shapes**: `.claude/skills/graphics-and-shapes/SKILL.md` - Graphics, shapes
- **Filters/PostFX**: `.claude/skills/filters-and-postfx/SKILL.md` - Filters (replacing v3 FX)
- **Cameras**: `.claude/skills/cameras/SKILL.md` - Camera system
- **Events**: `.claude/skills/events-system/SKILL.md` - Event system
- **Data Manager**: `.claude/skills/data-manager/SKILL.md` - Data storage
- **Render Textures**: `.claude/skills/render-textures/SKILL.md` - Dynamic/render textures
- **Tilemaps**: `.claude/skills/tilemaps/SKILL.md` - Tilemap layers
- **Geometry/Math**: `.claude/skills/geometry-and-math/SKILL.md` - Vector2, geometry
- **Game Object Components**: `.claude/skills/game-object-components/SKILL.md` - Components
- **Curves/Paths**: `.claude/skills/curves-and-paths/SKILL.md` - Curves, paths
- **Actions/Utilities**: `.claude/skills/actions-and-utilities/SKILL.md` - Actions, utilities

When writing or modifying Phaser code, always read the relevant skill file first for correct v4 API usage.

## Project Structure

```
2048/
├── apps/
│   ├── game/        — Phaser frontend game (Vite + TypeScript)
│   ├── admin/       — Admin React panel (Vite + React + Tailwind + shadcn-style)
│   └── workers/     — Cloudflare Workers backend API (Hono + D1)
├── reference/
│   ├── c3-original/ — Original Construct 3 game (read-only reference)
│   ├── phaser4-sdk/ — Phaser 4 SDK source (read-only reference)
│   ├── docs/        — Design documents, schemas, PUML flows
│   └── giant2048_original.zip — Original game zip backup
├── ANALYSIS.md      — Project analysis
└── CLAUDE.md
```

**Deployment targets** (3 independent Cloudflare projects):
- `apps/workers/` → Cloudflare Workers (`giant-2048-api`)
- `apps/game/` → Cloudflare Pages (`giant-2048`)
- `apps/admin/` → Cloudflare Pages (`giant-2048-admin`)
