# Wildforge Playtest Handbook

This is the manual test plan for the current playable build. It is intentionally broader than a single session: start with the short smoke pass, then choose one or two specialist sections per session. Checkboxes are reusable; copy the relevant section into a bug report or personal notes.

## Start here

Run the dedicated Wildforge server and use one of these URLs:

- Boosted testing: `http://localhost:7000/?seed=wildforge&playtest=1`
- Normal survival: `http://localhost:7000/?seed=wildforge`
- Reproducible new terrain: replace `wildforge` with any seed text.

Playtest mode is visibly labeled in the upper-right HUD. It uses separate player and world-edit saves, starts with full health/hunger/saturation, equips Voidglass armor and a shield, reduces all damage to 25%, reduces exhaustion to 10%, and refills a curated kit to minimum quantities whenever the page loads. Remove `&playtest=1` to return to the untouched normal save.

While Playtest Mode is active, the game writes local telemetry to `playtest-logs/playtest.ndjson`. It records periodic position/world-integrity snapshots, non-text input codes, selected items/targets, and runtime errors; it never records sign text or other typed content. Press **F8 whenever a problem is visible** to add an immediate bug marker with the exact location and nearby state. This lets the development agent correlate your description with what the simulation was doing.

Normal new worlds now start with an empty hotbar. Existing normal worlds retain their already-saved hotbar assignments. Press E, select an item, and use **TO SLOT #** to assign the selected hotbar slot.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move; steer while mounted or driving |
| Mouse | Look |
| Space | Jump; mount leap where supported |
| Shift | Sprint; dismount; modifier for alternate interactions |
| C or Ctrl | Sneak |
| Left click / hold | Attack, mine, charge some actions, recover vehicle |
| Right click | Use, place, eat, board, tame, cast, ignite, or interact |
| F | Raise/lower the offhand shield |
| R | Rotate directional placement preview |
| 1–9 / wheel | Select hotbar slot |
| E | Open/close inventory and nearby workstation UI |
| M | Open/close Trailchart |
| Esc | Pause or close the active screen |
| F8 | Mark the current problem in the local playtest log |

## 15-minute critical smoke pass

- [ ] The title screen loads without a blank canvas or console-visible fatal error.
- [ ] The Playtest Mode label appears only with `playtest=1`.
- [ ] Enter World captures the mouse; Esc reliably releases it.
- [ ] Walk, sprint, sneak, jump, swim, and climb back onto a one-block shore.
- [ ] No terrain holes, missing chunk slabs, floating cutaways, or unloaded collision appear while crossing several chunk borders.
- [ ] Mine Dirt, Stone, and Wood; each gives the expected item once.
- [ ] Assign an inventory item to the hotbar, place it, then mine it again.
- [ ] Place a Crafting Table and open it; craft one simple recipe.
- [ ] Fight one hostile using the Voidglass Sword and shield; damage is survivable and clearly reflected in the HUD.
- [ ] Eat after losing hunger; food is consumed only when useful.
- [ ] Enter water, watch air appear, surface, and verify air recovers.
- [ ] Reload the page; position, inventory, equipment, blocks, and time/weather restore.
- [ ] Open a second seed; confirm it does not inherit the first seed's edits.
- [ ] Return to the first seed; confirm its edits remain.
- [ ] Open Settings, export the world, and confirm a JSON file downloads.

## How to report a useful bug

Record:

1. Exact URL and seed.
2. Whether Playtest Mode was active.
3. What you expected and what happened.
4. Minimal steps that reproduce it after a refresh.
5. Approximate XYZ, biome, realm, weather, and time shown by the debug line.
6. Screenshot or short video if visual or movement-related.
7. Whether reload fixes it and whether the issue reproduces on a new seed.

Severity guide: **Blocker** prevents loading or corrupts a save; **Critical** causes unavoidable death, major duplication/loss, or broken terrain; **Major** breaks a system but allows continued play; **Minor** is visual, audio, text, or a limited edge case.

## World generation, chunks, and biomes

- [ ] The same seed produces the same terrain, structures, biome borders, and starting area.
- [ ] Different seeds visibly differ.
- [ ] Plains, Forest, Desert, and Snowy Highlands have recognizable ground, plants, trees, weather response, and resources.
- [ ] Coasts meet the sea without long dry seams, vertical water curtains, or submerged air walls.
- [ ] Caves have roofs/floors, navigable chambers, ores, and the intended underground biome decoration.
- [ ] Lumen Grottos and Rootbound Hollows appear underground without leaking decorations onto the surface.
- [ ] Walk quickly in one direction for five minutes. Chunks appear before reaching them and old chunks unload without leaving collision behind.
- [ ] Turn around and return. Previously visited chunks and edits rebuild correctly.
- [ ] Look across chunk borders from above and below; faces and lighting join cleanly.
- [ ] Dig on a chunk border, reload, and verify every changed block restores exactly once.
- [ ] Generated structures have floors, entrances, loot, inhabitants, and no terrain cutting through critical rooms.
- [ ] Newly loaded terrain never traps the player inside a solid block.

## Deep mining and Voidglass expedition

The surface coordinates are unchanged, but the world now continues to **Y=-128**. The debug line at the top displays XYZ. Wildforge's diamond-tier material is **Voidglass**.

- [ ] Dig a safe staircase or shaft below Y=0; the player must remain alive and controllable rather than being treated as below the world.
- [ ] Verify Coal appears primarily above Y=-48, Iron between roughly Y=-72 and Y=26, and Emberite between Y=-103 and Y=7.
- [ ] Search at **Y=-48 or lower** for rare purple/cyan Voidglass Ore. Confirm its target label identifies it and states the required pickaxe tier.
- [ ] Find traversable deep caves, including Deep Lumen Grottos and the Abyssal Depths below Y=-96.
- [ ] Check aquifers around Y=-30 and confirm water flows, items persist, and swimming controls still work below zero.
- [ ] Approach the bottom carefully: deterministic lava basins occupy the lowest cave band near Y=-112, while Y=-128 remains an unbreakable floor.
- [ ] Place and recover blocks, torches, scaffolds, ladders, water, a dropped item, and a Blast Keg below Y=0.
- [ ] Reload while underground. Position, inventory, light, edits, dropped items, creatures, and fluids should restore at the same negative Y.
- [ ] Follow a discovered Echo Vault clue to its surface rune well and descend its water shaft; the room should be 72–109 blocks below the surface, intact, lit, sealed, and lootable.
- [ ] Return to the old surface and confirm terrain, structures, and pre-expansion edits did not shift vertically.

## Movement, collision, camera, and water escape

- [ ] Walking speed is stable in all compass directions and does not depend on frame rate.
- [ ] Sprint is faster and consumes more hunger than walking in normal survival.
- [ ] Sneaking lowers the camera, slows movement, and prevents accidental ledge movement where intended.
- [ ] Jump reaches a normal one-block ledge from land and from shallow water.
- [ ] Repeated Space strokes let the player surface and climb from water onto adjacent land.
- [ ] The camera never enters the ground during swimming, crouching, mounting, or respawn.
- [ ] Full blocks, slabs, stairs, fences, panes, doors, trapdoors, ladders, scaffolds, workstations, and vehicles match their visible collision.
- [ ] Moving diagonally into corners does not clip through or become permanently stuck.
- [ ] Falling damage scales plausibly; Ashglide prevents/reduces it as advertised.
- [ ] Respawn selects safe non-solid ground and does not loop into another death.

## Mining, placement, building, and block integrity

- [ ] Each tool is fastest against its intended material and required harvest tiers matter.
- [ ] Looking at a mineable block names it before mining and shows its preferred tool/tier when relevant.
- [ ] Tool durability falls, displays correctly, persists, and breaks only at zero.
- [ ] Placement preview matches the final shape, facing, support, and collision.
- [ ] Crafted functional objects have recognizable multi-part silhouettes; construction materials remain intentional cubes.
- [ ] Invalid placement turns red and cannot overlap the player or required interaction space.
- [ ] R rotates stairs, doors, gates, trapdoors, signs, and directional machines consistently.
- [ ] Doors and beds place/remove atomically with no duplicate half.
- [ ] Unsupported torches, ladders, carpets, banners, pots, frames, and scaffolds detach once and return the correct item.
- [ ] Glass panes and Forged Lattice connect/retract on all four sides.
- [ ] Sand and Gravel fall after generation, placement, mining beneath them, fluid edits, and reload; they do not entomb the player.
- [ ] Blast Kegs damage terrain/entities, chain-react, preserve protected stateful blocks, and do not duplicate drops.
- [ ] Emberfire spreads only to valid fuel, extinguishes in water/exposed rain, and restores safely after reload.

## Inventory, hotbar, drops, and death

- [ ] A fresh normal seed has nine empty hotbar slots.
- [ ] A fresh playtest seed has the documented focused hotbar and kit.
- [ ] The kit refills consumed test supplies on reload but does not increase already-full quantities.
- [ ] Stack counts increase/decrease exactly and respect non-stackable items.
- [ ] Assigning any carried item to each slot works; empty/missing items cannot be used.
- [ ] Worn durability and runes remain attached to individual tool copies through hotbar use and storage.
- [ ] Dropped items can be collected once, persist through reload where expected, and expire on schedule.
- [ ] Death drops inventory/equipment once; respawning does not duplicate it.
- [ ] Recovering the death pile restores exact counts, wear, and enchantments.
- [ ] Playtest and normal saves remain separate even with the same seed.

## Survival, climate, weather, and status effects

- [ ] Health, hunger, saturation, air, armor, experience, and effects update legibly.
- [ ] In normal mode, movement drains saturation before hunger; starvation damages at zero hunger.
- [ ] Natural regeneration needs sufficient hunger and adds exhaustion.
- [ ] Drowning and lava cause periodic damage; surfacing/leaving lava resets their timers.
- [ ] Playtest damage is approximately one-quarter normal and exhaustion is one-tenth normal.
- [ ] Desert heat grows in exposed daylight and eases in shade, water, night, other biomes, or with Cinderward.
- [ ] Frostveil cold grows faster when dark, wet, raining/storming and eases in shelter or near valid warmth.
- [ ] Each Tough Hide armor piece adds one-quarter insulation; ordinary Lumen light gives no warmth.
- [ ] Climate warns before damage, damages slowly only near maximum exposure, persists on reload, and resets on death.
- [ ] Rain, storms, snow, clouds, lightning, day/night lighting, wetness, and captions match the visible weather.
- [ ] Every tonic applies its named effect, duration, HUD entry, bottle return, save behavior, and expiration.

## Crafting and processing stations

- [ ] Hand recipes reject wrong shapes/materials and consume/return exact amounts.
- [ ] Crafting Table exposes table recipes and closes cleanly when walking away.
- [ ] Furnace accepts valid fuel/input, advances in and out of UI, saves progress, and returns output/XP once.
- [ ] Forge Kiln accepts minerals but rejects food; Hearth Smoker accepts food but rejects minerals; both run at intended speed.
- [ ] Hearthfire cooks valid recipes, handles fuel, lights/extinguishes, and provides warmth.
- [ ] Drying Rack processes every listed food without duplication.
- [ ] Infusion Still validates flasks, reagent, catalyst charges, batch time, output, save, and recovery.
- [ ] Forgeheart Anvil upgrades Iron → Emberite → Voidglass while preserving wear percentage and runes.
- [ ] Runegrind removes runes from exactly one instance and returns bounded XP.
- [ ] Stonewright Cutter returns each listed masonry output and exact efficient quantity.
- [ ] Repair Bench consumes the correct material and never exceeds maximum durability.
- [ ] Runeforge offers remain deterministic, charge level/materials correctly, and respond to valid Archive Shelf rings.

## Farming, plants, food, and husbandry

- [ ] Hoeing/planting requires valid substrate and consumes one seed.
- [ ] Wheat, Amberroot, Rimepod, and Emberbulb progress through growth stages and harvest correctly.
- [ ] Growth, moisture/weather effects, compost, and reload do not skip or duplicate harvests.
- [ ] Trees grow only with sufficient space and recover the intended wood/leaves/sapling resources.
- [ ] Hearthpots accept only supported plants, display the right plant, and return pot plus contents on removal.
- [ ] Bramblehens lay renewable eggs; Mossbacks provide wool/milk; Sunmoths/Sunhives pollinate and produce resources.
- [ ] Breeding/taming feeds only valid creatures and advances only once per interaction.
- [ ] Trail Tethers attach/detach animals and recover safely if support is removed.
- [ ] Food values, saturation, cooking, drying, pail/flask returns, and full-hunger refusal are correct.
- [ ] Hearthcake supplies exactly seven servings and cannot duplicate after partial save/reload.

## Creatures, combat, equipment, and bosses

- [ ] Passive, neutral, and hostile creatures spawn in appropriate biomes/times and respect population bounds.
- [ ] Animals and Wayfarers visibly travel face-first; eyes, snouts, paws/hooves, ears, tails, and other small parts identify their front and species.
- [ ] Hostiles detect, pursue, attack, lose targets, and navigate without walking through solid walls.
- [ ] Melee recovery meter prevents impossible attack speed; weapons apply intended damage/knockback.
- [ ] Windbow charges, consumes one Arrow, launches correctly, damages once, and wears durability.
- [ ] Shield blocks only while raised, reduces damage, wears down, breaks safely, and persists.
- [ ] Each armor tier changes armor points; individual pieces wear, break, swap, repair, store, and persist.
- [ ] Regalia changes appearance only and never changes armor math.
- [ ] Creature drops occur once and match source/progression expectations.
- [ ] Companions never attack forbidden friendly targets and recover their state on reload.
- [ ] Hollow Warden and Echo Sentinel rituals, arenas, phases, projectiles, rewards, death/reset, and persistence work without soft locks.

## Structures, settlements, trade, and social systems

- [ ] Hearthsteads, Outposts, Vaults, Gauntlets, Shrines, Cinderwatches, and other clues match their navigation markers.
- [ ] Loot containers open independently and cannot be collected twice after reload.
- [ ] Traders show stable identity/profession/stock and complete buys/sells atomically.
- [ ] Hearthmark balance, reputation tiers, discounts, daily/stock refresh, and persistence are exact.
- [ ] Shift-use gifts affect only the intended resident; Favor and friendship persist.
- [ ] Resident schedules move between sensible targets and conversations do not overlap unnaturally.
- [ ] Building/upgrading/removing Outposts changes resident count and infrastructure only once.
- [ ] Hearthguards awaken only under valid conditions, defend the settlement, obey caps, and persist.

## Storage and automation

- [ ] Single/Double Chests, Trailbarrels, Wayvaults, carts, funnels, ejectors, and dispensers preserve exact stack and gear instance data.
- [ ] Looking at a Chest identifies it and says Right-click to open; its lid, body, bands, and latch are visually distinct from terrain.
- [ ] Right-clicking a Chest opens storage without also opening the browser Back/Forward context menu; aiming at it and pressing E is an equivalent fallback.
- [ ] Adjacent ordinary Chests join correctly; Trailbarrels never join; all Wayvaults share the same personal reserve.
- [ ] Sorting/labels persist and never merge unrelated coordinate namespaces.
- [ ] Mining a container returns contents exactly once; protected loaded containers resist invalid blasts/Ram moves.
- [ ] Forge Funnels move only valid items toward the selected face with no loss or duplication.
- [ ] Forge Ejectors launch the expected item/direction per pulse.
- [ ] Rune Dispensers shoot, pour, prime, or ignite based on their loaded item and consume exactly one action cost.
- [ ] Freight loaders/unloaders transfer correctly to Cargo Carts at stops and remain bounded.

## Spark circuits

- [ ] Switches power and unpower adjacent Sunwire with visible state changes.
- [ ] Signal propagation stops at its range and updates after placement/removal/reload.
- [ ] Relays, repeaters/sequencers, inverters, comparators, and sentries have correct facing and timing.
- [ ] Comparator Compare/Subtract modes read containers and expose 0–15 strength correctly.
- [ ] Change Sentry watches the selected face and pulses only for a real change.
- [ ] Rams push legal lines, reject protected/immovable/overlong lines, and never overwrite blocks.
- [ ] Binding Rams pull the nearest legal block when power releases.
- [ ] Powered doors, gates, rails, machines, dispensers, ejectors, and loaders respond once per intended edge/pulse.
- [ ] A circuit spanning chunk borders works before and after unloading/reloading those chunks.

## Boats, mounts, carts, and rails

- [ ] Oak Skiff places only on valid water, boards/exits safely, steers, collides, and recovers as an item.
- [ ] Tamed/saddled Sandstrider mounting, steering, leap, slope/water limits, Shift dismount, death, and persistence work.
- [ ] Forge/Cargo Carts place on rails, accelerate/brake, follow slopes/curves/switches, collide, and recover.
- [ ] Drive Rails respond to circuit power and alter cart propulsion correctly.
- [ ] Couplers link/unlink legal carts; linked consists preserve spacing and survive turns/slopes/reload.
- [ ] Riders never remain attached to destroyed/unloaded vehicles.

## Navigation, maps, realms, and progression

- [ ] Wayfinder cycles unlocked targets and points toward the selected target across movement.
- [ ] Shift-use Trailmarks save, display, cycle, and remove without affecting other seeds.
- [ ] Carrying/opening Trailchart reveals nearby terrain and retains explored cells.
- [ ] Structure clues unlock only at intended discovery distance and persist.
- [ ] Experience gains once from mining/smelting/combat and levels/costs remain bounded.
- [ ] Realm gates validate their full frame, transfer safely, retain return location, and cannot strand the player.
- [ ] Cinderreach terrain, fauna, resources, heat, structures, navigation, and return travel remain separate from surface rules.

## Presentation, audio, settings, and accessibility

- [ ] Block/item held models match their inventory identity and animate for walking, mining, attacking, charging, blocking, and eating.
- [ ] Transparent blocks sort acceptably; water/lava/light do not create black or missing chunk surfaces.
- [ ] Footsteps, mining, placement, hits, creatures, weather, music, vehicles, stations, and ambient loops trigger without rapid overlap.
- [ ] Directional captions name important sounds and direction when enabled.
- [ ] Mouse sensitivity, FOV, view distance, render scale, brightness, master/music volume, crosshair size, and text scale apply and persist.
- [ ] Performance presets change the intended values and adaptive mode remains stable under load.
- [ ] Reduced Motion removes dangerous flashing/pulsing; Reduce Lightning Flashes limits storm flashes.
- [ ] High-Contrast HUD and enlarged text remain legible without overlapping critical controls.
- [ ] Resize the window and test a narrow viewport; menus remain reachable and scrollable.

## Save, export/import, and recovery

- [ ] Normal autosave restores position, spawn, inventory, hotbar, survival, experience, equipment, world time, weather, entities, machines, containers, maps, and edits.
- [ ] Export produces one JSON bundle containing both player state and edits for the active mode/seed.
- [ ] Importing that bundle into the matching active seed restores it after reload.
- [ ] A rejected wrong-seed, future-version, malformed, or truncated import leaves the current world unchanged.
- [ ] Backup recovery reports a visible recovery message and restores last-known-good state.
- [ ] Import failure never partially commits player state without matching edits (or vice versa).
- [ ] Test normal and playtest exports separately; neither should overwrite the other's browser save.
- [ ] Before destructive browser-storage testing, export any world you care about.

## Long-session and regression pass

- [ ] Play continuously for 30–60 minutes while traveling, building, fighting, opening UIs, and crossing chunks; note stutter growth or memory symptoms.
- [ ] Leave furnaces, crops, weather, fires, machines, carts, and dropped items active while far away; return and verify bounded catch-up.
- [ ] Save/reload during rain, combat recovery, a processing batch, vehicle use, climate exposure, and partial construction.
- [ ] Rapidly alternate E/Esc/M and pointer lock; no screen becomes permanently stuck or accepts hidden input.
- [ ] Spam legal and illegal interactions against one target; each click changes state at most once.
- [ ] Repeat a suspected bug on the same seed, a new seed, normal mode, and playtest mode to isolate world/save/profile causes.

## Exit criteria for a test build

A build is ready for broader play when the critical smoke pass is clean, there are no Blocker/Critical save or terrain-integrity issues, water escape and respawn are reliable, normal/playtest saves remain isolated, and all automated tests plus the production build pass. Major issues should have a reproducible seed and steps before new feature work resumes.
