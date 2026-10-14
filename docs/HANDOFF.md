# Wildforge Handoff

Updated: 2026-08-29

## Resume after reboot

Wildforge is the project at `D:\GameProjects\Wildforge`. It must use port **7000** only; ports **6000** and **5173** belong to the user's other Three.js projects and must not be touched.

The easiest Windows workflow is to double-click `Start-Wildforge.bat` in the project root. Double-click `Stop-Wildforge.bat` when finished. The stop script refuses to terminate a port-7000 listener unless it is a Node process whose command line belongs to this exact Wildforge directory.

From PowerShell:

```powershell
Set-Location -LiteralPath 'D:\GameProjects\Wildforge'
npm run dev
```

The script already enforces `--host 0.0.0.0 --port 7000 --strictPort`. After startup, verify `http://127.0.0.1:7000/` responds and open the boosted isolated test world:

`http://localhost:7000/?seed=wildforge&playtest=1`

Do not start Python for this project. Do not terminate unrelated Node processes; identify the process owning port 7000 if cleanup is ever required.

## Current state

- Completed through milestone **148** in `docs/GAME_DESIGN.md`.
- Last full automated suite: **581/581 passing**.
- Latest focused input/storage suite: **15/15 passing** after the context-menu and E-key fallback changes.
- Latest production build: passing with Vite 7.3.6; the existing large-chunk warning is non-fatal.
- Runtime before reboot: Vite responding on port 7000. A reboot will stop it normally.
- This is currently a **single-player browser-local game**, not multiplayer.
- Normal and playtest saves are isolated. Browser-local saves should survive restarting Node and rebooting the computer as long as browser site data is retained.

## Most recent implementation

- The Overworld now spans Y=-128 through Y=63 (192 blocks high) without moving the existing surface or invalidating its coordinates.
- Deep cave networks, aquifers, Rootbound/Lumen/Abyssal strata, bottom lava basins, and ore bands fill the added underground. Diamond-tier Voidglass begins at Y=-48; Emberite spans Y=-103 through Y=7.
- Echo Vault rooms are now genuinely deep—72 to 109 blocks below their visible surface wells—and retain their water route.
- Negative-Y play is supported by mining, lighting, saves, drops, creatures, fluids, explosions, fire, scaffolds, falling blocks, projectiles, realm travel, death/respawn bounds, and chunk integrity.
- Live target labels identify blocks before mining and show preferred tools and harvest tiers.
- Storage labels display `RIGHT-CLICK / E TO OPEN`.
- Wooden Chests and remaining crafted functional cube holdouts now use authored multi-part voxel silhouettes. Intentional construction materials remain cubes.
- Animals and Wayfarers gained finer voxel parts and now travel face-first through one shared visual-yaw convention.
- The game installs canvas, document-capture, early-page, and body-level context-menu suppression.
- Because the Codex in-app browser may still intercept native right-click before the webpage receives it, aiming at a Chest/Trailbarrel/Wayvault/Funnel/Ejector/Dispenser and pressing **E** opens that storage. E elsewhere opens normal inventory.
- The complete manual checklist is `docs/PLAYTEST_GUIDE.md`.

## Next playtest priorities

1. Hard-refresh the port-7000 tab after restart and enter Playtest Mode.
2. Aim at a Wooden Chest. Confirm the target name and `RIGHT-CLICK / E TO OPEN` instruction.
3. Confirm E opens targeted storage and E closes it; confirm E away from storage opens normal inventory.
4. Check whether right-click still opens the in-app browser navigation menu. If it does, treat E as the reliable embedded-browser control rather than repeatedly changing ordinary DOM suppression.
5. Inspect Chest, Crafting Table, Stone Furnace, Forge Kiln, Hearth Smoker, Blast Keg, Hearthguard Core, and Forge Lamp silhouettes and their placement previews/collision.
6. Watch animals, hostile creatures, Sandstriders, and Wayfarers move; verify faces lead and smaller details read clearly.
7. Press **F8** whenever a visible problem occurs, then inspect `playtest-logs\playtest.ndjson` alongside the user's description.

## Important files

- `docs/GAME_DESIGN.md` — completed roadmap and implementation status
- `docs/PLAYTEST_GUIDE.md` — comprehensive ordered manual test plan
- `src/main.js` — runtime interaction routing and E-targeted-storage fallback
- `src/gameInput.js` — browser context-menu suppression guard
- `src/targetLabels.js` — crosshair block/tool/interaction labels
- `src/entities.js` — creature models and shared visual-facing convention
- `src/world.js` and `src/placementPreview.js` — authored world and preview geometry

## Browser-control limitation

The local browser-control bridge most recently failed to initialize because its trusted dependency path was rejected. The game itself and HTTP server were healthy. Prefer manual inspection in the open port-7000 tab until that bridge reconnects; do not substitute another port or touch the user's other projects.
