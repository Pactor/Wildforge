import { BLOCK, BLOCKS, isLiquidBlock } from './blocks.js';

const DIRECTIONS = Object.freeze([
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
]);
const RELAY_OFF = Object.freeze([BLOCK.SPARK_RELAY_N_OFF, BLOCK.SPARK_RELAY_E_OFF, BLOCK.SPARK_RELAY_S_OFF, BLOCK.SPARK_RELAY_W_OFF]);
const RELAY_ON = Object.freeze([BLOCK.SPARK_RELAY_N_ON, BLOCK.SPARK_RELAY_E_ON, BLOCK.SPARK_RELAY_S_ON, BLOCK.SPARK_RELAY_W_ON]);
const RAM_OFF = Object.freeze([BLOCK.FORGE_RAM_N_OFF, BLOCK.FORGE_RAM_E_OFF, BLOCK.FORGE_RAM_S_OFF, BLOCK.FORGE_RAM_W_OFF]);
const RAM_ON = Object.freeze([BLOCK.FORGE_RAM_N_ON, BLOCK.FORGE_RAM_E_ON, BLOCK.FORGE_RAM_S_ON, BLOCK.FORGE_RAM_W_ON]);
const BINDING_RAM_OFF = Object.freeze([BLOCK.BINDING_RAM_N_OFF, BLOCK.BINDING_RAM_E_OFF, BLOCK.BINDING_RAM_S_OFF, BLOCK.BINDING_RAM_W_OFF]);
const BINDING_RAM_ON = Object.freeze([BLOCK.BINDING_RAM_N_ON, BLOCK.BINDING_RAM_E_ON, BLOCK.BINDING_RAM_S_ON, BLOCK.BINDING_RAM_W_ON]);
const INVERTER_OFF = Object.freeze([BLOCK.SPARK_INVERTER_N_OFF, BLOCK.SPARK_INVERTER_E_OFF, BLOCK.SPARK_INVERTER_S_OFF, BLOCK.SPARK_INVERTER_W_OFF]);
const INVERTER_ON = Object.freeze([BLOCK.SPARK_INVERTER_N_ON, BLOCK.SPARK_INVERTER_E_ON, BLOCK.SPARK_INVERTER_S_ON, BLOCK.SPARK_INVERTER_W_ON]);
const COMPARATOR_COMPARE_OFF = Object.freeze([BLOCK.SPARK_COMPARATOR_N_COMPARE_OFF, BLOCK.SPARK_COMPARATOR_E_COMPARE_OFF, BLOCK.SPARK_COMPARATOR_S_COMPARE_OFF, BLOCK.SPARK_COMPARATOR_W_COMPARE_OFF]);
const COMPARATOR_COMPARE_ON = Object.freeze([BLOCK.SPARK_COMPARATOR_N_COMPARE_ON, BLOCK.SPARK_COMPARATOR_E_COMPARE_ON, BLOCK.SPARK_COMPARATOR_S_COMPARE_ON, BLOCK.SPARK_COMPARATOR_W_COMPARE_ON]);
const COMPARATOR_SUBTRACT_OFF = Object.freeze([BLOCK.SPARK_COMPARATOR_N_SUBTRACT_OFF, BLOCK.SPARK_COMPARATOR_E_SUBTRACT_OFF, BLOCK.SPARK_COMPARATOR_S_SUBTRACT_OFF, BLOCK.SPARK_COMPARATOR_W_SUBTRACT_OFF]);
const COMPARATOR_SUBTRACT_ON = Object.freeze([BLOCK.SPARK_COMPARATOR_N_SUBTRACT_ON, BLOCK.SPARK_COMPARATOR_E_SUBTRACT_ON, BLOCK.SPARK_COMPARATOR_S_SUBTRACT_ON, BLOCK.SPARK_COMPARATOR_W_SUBTRACT_ON]);
const SEQUENCER_OFF = Object.freeze([BLOCK.PULSE_SEQUENCER_N_OFF, BLOCK.PULSE_SEQUENCER_E_OFF, BLOCK.PULSE_SEQUENCER_S_OFF, BLOCK.PULSE_SEQUENCER_W_OFF]);
const SEQUENCER_ON = Object.freeze([BLOCK.PULSE_SEQUENCER_N_ON, BLOCK.PULSE_SEQUENCER_E_ON, BLOCK.PULSE_SEQUENCER_S_ON, BLOCK.PULSE_SEQUENCER_W_ON]);
const LOADER_OFF = Object.freeze([BLOCK.FREIGHT_LOADER_N_OFF, BLOCK.FREIGHT_LOADER_E_OFF, BLOCK.FREIGHT_LOADER_S_OFF, BLOCK.FREIGHT_LOADER_W_OFF]);
const LOADER_ON = Object.freeze([BLOCK.FREIGHT_LOADER_N_ON, BLOCK.FREIGHT_LOADER_E_ON, BLOCK.FREIGHT_LOADER_S_ON, BLOCK.FREIGHT_LOADER_W_ON]);
const UNLOADER_OFF = Object.freeze([BLOCK.FREIGHT_UNLOADER_N_OFF, BLOCK.FREIGHT_UNLOADER_E_OFF, BLOCK.FREIGHT_UNLOADER_S_OFF, BLOCK.FREIGHT_UNLOADER_W_OFF]);
const UNLOADER_ON = Object.freeze([BLOCK.FREIGHT_UNLOADER_N_ON, BLOCK.FREIGHT_UNLOADER_E_ON, BLOCK.FREIGHT_UNLOADER_S_ON, BLOCK.FREIGHT_UNLOADER_W_ON]);
const EJECTOR_OFF = Object.freeze([BLOCK.FORGE_EJECTOR_N_OFF, BLOCK.FORGE_EJECTOR_E_OFF, BLOCK.FORGE_EJECTOR_S_OFF, BLOCK.FORGE_EJECTOR_W_OFF, BLOCK.FORGE_EJECTOR_UP_OFF, BLOCK.FORGE_EJECTOR_DOWN_OFF]);
const EJECTOR_ON = Object.freeze([BLOCK.FORGE_EJECTOR_N_ON, BLOCK.FORGE_EJECTOR_E_ON, BLOCK.FORGE_EJECTOR_S_ON, BLOCK.FORGE_EJECTOR_W_ON, BLOCK.FORGE_EJECTOR_UP_ON, BLOCK.FORGE_EJECTOR_DOWN_ON]);
const DISPENSER_OFF = Object.freeze([BLOCK.RUNE_DISPENSER_N_OFF, BLOCK.RUNE_DISPENSER_E_OFF, BLOCK.RUNE_DISPENSER_S_OFF, BLOCK.RUNE_DISPENSER_W_OFF, BLOCK.RUNE_DISPENSER_UP_OFF, BLOCK.RUNE_DISPENSER_DOWN_OFF]);
const DISPENSER_ON = Object.freeze([BLOCK.RUNE_DISPENSER_N_ON, BLOCK.RUNE_DISPENSER_E_ON, BLOCK.RUNE_DISPENSER_S_ON, BLOCK.RUNE_DISPENSER_W_ON, BLOCK.RUNE_DISPENSER_UP_ON, BLOCK.RUNE_DISPENSER_DOWN_ON]);
const SENTRY_OFF = Object.freeze([BLOCK.CHANGE_SENTRY_N_OFF, BLOCK.CHANGE_SENTRY_E_OFF, BLOCK.CHANGE_SENTRY_S_OFF, BLOCK.CHANGE_SENTRY_W_OFF, BLOCK.CHANGE_SENTRY_UP_OFF, BLOCK.CHANGE_SENTRY_DOWN_OFF]);
const SENTRY_ON = Object.freeze([BLOCK.CHANGE_SENTRY_N_ON, BLOCK.CHANGE_SENTRY_E_ON, BLOCK.CHANGE_SENTRY_S_ON, BLOCK.CHANGE_SENTRY_W_ON, BLOCK.CHANGE_SENTRY_UP_ON, BLOCK.CHANGE_SENTRY_DOWN_ON]);
const RELAY_DELAYS = Object.freeze([0.2, 0.5, 1, 2]);
const PULSE_INTERVAL = 0.25;
export const INVERTER_DELAY = 0.1;
export const COMPARATOR_SAMPLE_INTERVAL = 0.1;
export const MAX_RAM_PUSH = 12;
const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const pointFor = (key) => key.split(',').map(Number);
const signalRole = (role) => ['switch', 'sensor', 'conduit'].includes(role);
const sinkRole = (role) => ['lamp', 'actuator', 'gate', 'poweredRail', 'freightStation', 'resonance', 'ejector', 'dispenser'].includes(role);

export function circuitRole(id) {
  return BLOCKS[id]?.circuitRole || null;
}

export function circuitItem(id) {
  return BLOCKS[id]?.circuitItem || id;
}

function familyVariant(id, off, on, powered) {
  let index = off.indexOf(id);
  if (index < 0) index = on.indexOf(id);
  return index < 0 ? null : (powered ? on : off)[index];
}

export function poweredVariant(id, powered) {
  if ([BLOCK.SPARK_SWITCH_OFF, BLOCK.SPARK_SWITCH_ON].includes(id)) return powered ? BLOCK.SPARK_SWITCH_ON : BLOCK.SPARK_SWITCH_OFF;
  if ([BLOCK.SUNWIRE_OFF, BLOCK.SUNWIRE_ON].includes(id)) return powered ? BLOCK.SUNWIRE_ON : BLOCK.SUNWIRE_OFF;
  if ([BLOCK.FORGE_LAMP_OFF, BLOCK.FORGE_LAMP_ON].includes(id)) return powered ? BLOCK.FORGE_LAMP_ON : BLOCK.FORGE_LAMP_OFF;
  if ([BLOCK.TRAIL_PLATE_OFF, BLOCK.TRAIL_PLATE_ON].includes(id)) return powered ? BLOCK.TRAIL_PLATE_ON : BLOCK.TRAIL_PLATE_OFF;
  if ([BLOCK.SUN_EYE_OFF, BLOCK.SUN_EYE_ON].includes(id)) return powered ? BLOCK.SUN_EYE_ON : BLOCK.SUN_EYE_OFF;
  if ([BLOCK.SUNSTEP_GATE_CLOSED, BLOCK.SUNSTEP_GATE_OPEN].includes(id)) return powered ? BLOCK.SUNSTEP_GATE_OPEN : BLOCK.SUNSTEP_GATE_CLOSED;
  if ([BLOCK.POWER_RAIL_NS_OFF, BLOCK.POWER_RAIL_NS_ON].includes(id)) return powered ? BLOCK.POWER_RAIL_NS_ON : BLOCK.POWER_RAIL_NS_OFF;
  if ([BLOCK.POWER_RAIL_EW_OFF, BLOCK.POWER_RAIL_EW_ON].includes(id)) return powered ? BLOCK.POWER_RAIL_EW_ON : BLOCK.POWER_RAIL_EW_OFF;
  return familyVariant(id, RELAY_OFF, RELAY_ON, powered) ?? familyVariant(id, RAM_OFF, RAM_ON, powered) ?? familyVariant(id, BINDING_RAM_OFF, BINDING_RAM_ON, powered) ?? familyVariant(id, INVERTER_OFF, INVERTER_ON, powered)
    ?? familyVariant(id, COMPARATOR_COMPARE_OFF, COMPARATOR_COMPARE_ON, powered) ?? familyVariant(id, COMPARATOR_SUBTRACT_OFF, COMPARATOR_SUBTRACT_ON, powered)
    ?? familyVariant(id, SEQUENCER_OFF, SEQUENCER_ON, powered) ?? familyVariant(id, LOADER_OFF, LOADER_ON, powered)
    ?? familyVariant(id, UNLOADER_OFF, UNLOADER_ON, powered) ?? familyVariant(id, EJECTOR_OFF, EJECTOR_ON, powered)
    ?? familyVariant(id, DISPENSER_OFF, DISPENSER_ON, powered) ?? familyVariant(id, SENTRY_OFF, SENTRY_ON, powered) ?? id;
}

function facingIndex(yaw) {
  const dx = -Math.sin(Number(yaw) || 0);
  const dz = -Math.cos(Number(yaw) || 0);
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 1 : 3;
  return dz > 0 ? 2 : 0;
}

export function directionalCircuitId(itemId, yaw, powered = false) {
  const index = facingIndex(yaw);
  if (itemId === 'spark_relay') return (powered ? RELAY_ON : RELAY_OFF)[index];
  if (itemId === 'forge_ram') return (powered ? RAM_ON : RAM_OFF)[index];
  if (itemId === 'binding_ram') return (powered ? BINDING_RAM_ON : BINDING_RAM_OFF)[index];
  if (itemId === 'spark_inverter') return (powered ? INVERTER_ON : INVERTER_OFF)[index];
  if (itemId === 'spark_comparator') return (powered ? COMPARATOR_COMPARE_ON : COMPARATOR_COMPARE_OFF)[index];
  if (itemId === 'pulse_sequencer') return (powered ? SEQUENCER_ON : SEQUENCER_OFF)[index];
  if (itemId === 'freight_loader') return (powered ? LOADER_ON : LOADER_OFF)[index];
  if (itemId === 'freight_unloader') return (powered ? UNLOADER_ON : UNLOADER_OFF)[index];
  return null;
}

export function comparatorModeVariant(id, mode) {
  const families = [COMPARATOR_COMPARE_OFF, COMPARATOR_COMPARE_ON, COMPARATOR_SUBTRACT_OFF, COMPARATOR_SUBTRACT_ON];
  for (const family of families) {
    const index = family.indexOf(id);
    if (index < 0) continue;
    const powered = Boolean(BLOCKS[id]?.powered);
    return (mode === 'subtract' ? (powered ? COMPARATOR_SUBTRACT_ON : COMPARATOR_SUBTRACT_OFF) : (powered ? COMPARATOR_COMPARE_ON : COMPARATOR_COMPARE_OFF))[index];
  }
  return id;
}

export function ramCanMoveBlock(id) {
  const definition = BLOCKS[id];
  if (definition?.ramMovable) return true;
  if (!definition?.solid || definition.placeable === false || definition.model || definition.transparent || definition.circuitRole) return false;
  if (definition.door || definition.gate || definition.bed || definition.sign || definition.composter || definition.campfire || definition.furnaceMode) return false;
  return ![BLOCK.CHEST, BLOCK.FURNACE, BLOCK.CRAFTING_TABLE, BLOCK.REPAIR_BENCH, BLOCK.RUNEFORGE].includes(id);
}

export class CircuitSystem {
  constructor(world, callbacks = {}) {
    this.world = world;
    this.onStateChange = callbacks.onStateChange || (() => {});
    this.onMove = callbacks.onMove || (() => {});
    this.onResonancePower = callbacks.onResonancePower || (() => {});
    this.readContainerSignal = callbacks.readContainerSignal || (() => 0);
    this.canMoveInto = callbacks.canMoveInto || (() => true);
    this.maximumNodes = Math.max(64, Math.floor(Number(callbacks.maximumNodes) || 2048));
    this.relays = new Map();
    this.sequencers = new Map();
    this.inverters = new Map();
    this.comparators = new Map();
    this.sensors = new Set();
    this.actuators = new Set();
    this.discovered = new Set(Array.isArray(callbacks.saved?.discovered) ? callbacks.saved.discovered.filter((key) => typeof key === 'string') : []);
    for (const [key, delayIndex] of callbacks.saved?.relays || []) {
      if (typeof key === 'string') this.relays.set(key, { delayIndex: Math.max(0, Math.min(3, Math.floor(Number(delayIndex) || 0))), desired: null, timer: 0 });
    }
    for (const [key, pulseCount, phase, timer, inputPowered, running] of callbacks.saved?.sequencers || []) {
      if (typeof key !== 'string') continue;
      this.sequencers.set(key, {
        pulseCount: Math.max(1, Math.min(4, Math.floor(Number(pulseCount) || 3))),
        phase: Math.max(0, Math.floor(Number(phase) || 0)),
        timer: Math.max(0, Math.min(PULSE_INTERVAL, Number(timer) || 0)),
        inputPowered: Boolean(inputPowered),
        running: Boolean(running),
      });
    }
    for (const [key, desired, timer, inputPowered] of callbacks.saved?.inverters || []) {
      if (typeof key !== 'string') continue;
      this.inverters.set(key, { desired: desired == null ? null : Boolean(desired), timer: Math.max(0, Math.min(INVERTER_DELAY, Number(timer) || 0)), inputPowered: Boolean(inputPowered) });
    }
    for (const [key, outputLevel, inputLevel, sideLevel, sampleTimer] of callbacks.saved?.comparators || []) {
      if (typeof key !== 'string') continue;
      this.comparators.set(key, {
        outputLevel: Math.max(0, Math.min(15, Math.floor(Number(outputLevel) || 0))),
        inputLevel: Math.max(0, Math.min(15, Math.floor(Number(inputLevel) || 0))),
        sideLevel: Math.max(0, Math.min(15, Math.floor(Number(sideLevel) || 0))),
        sampleTimer: Math.max(0, Math.min(COMPARATOR_SAMPLE_INTERVAL, Number(sampleTimer) || 0)),
      });
    }
    for (const key of callbacks.saved?.sensors || []) if (typeof key === 'string') this.sensors.add(key);
    for (const key of callbacks.saved?.actuators || []) if (typeof key === 'string') this.actuators.add(key);
  }

  neighbors(x, y, z) {
    return DIRECTIONS.map(([dx, dy, dz]) => [x + dx, y + dy, z + dz]);
  }

  relayTerminals(x, y, z, id = this.world.getBlock(x, y, z)) {
    const facing = BLOCKS[id]?.circuitFacing;
    if (!['relay', 'sequencer', 'inverter', 'comparator'].includes(circuitRole(id)) || !facing) return null;
    return {
      input: [x - facing[0], y - facing[1], z - facing[2]],
      output: [x + facing[0], y + facing[1], z + facing[2]],
    };
  }

  comparatorSides(x, y, z, id = this.world.getBlock(x, y, z)) {
    const facing = BLOCKS[id]?.circuitFacing;
    if (circuitRole(id) !== 'comparator' || !facing) return null;
    const side = [-facing[2], 0, facing[0]];
    return [[x + side[0], y, z + side[2]], [x - side[0], y, z - side[2]]];
  }

  sentryOutput(x, y, z, id = this.world.getBlock(x, y, z)) {
    const facing = BLOCKS[id]?.circuitFacing;
    if (circuitRole(id) !== 'sentry' || !facing) return null;
    return [x - facing[0], y - facing[1], z - facing[2]];
  }

  registerAt(x, y, z, id = this.world.getBlock(x, y, z)) {
    const key = keyFor(x, y, z);
    const role = circuitRole(id);
    if (role === 'relay' && !this.relays.has(key)) this.relays.set(key, { delayIndex: 1, desired: null, timer: 0 });
    if (role === 'sequencer' && !this.sequencers.has(key)) this.sequencers.set(key, { pulseCount: 3, phase: 0, timer: 0, inputPowered: false, running: false });
    if (role === 'inverter' && !this.inverters.has(key)) this.inverters.set(key, { desired: null, timer: 0, inputPowered: false });
    if (role === 'comparator' && !this.comparators.has(key)) this.comparators.set(key, { outputLevel: BLOCKS[id]?.powered ? 15 : 0, inputLevel: 0, sideLevel: 0, sampleTimer: 0 });
    if (role === 'sensor') this.sensors.add(key);
    if (role === 'actuator') this.actuators.add(key);
  }

  setState(x, y, z, id) {
    const previous = this.world.getBlock(x, y, z);
    if (previous === id) return false;
    this.world.setBlock(x, y, z, id);
    this.registerAt(x, y, z, id);
    this.onStateChange({ x, y, z }, previous, id);
    return true;
  }

  componentFrom(x, y, z) {
    const firstId = this.world.getBlock(x, y, z);
    const firstRole = circuitRole(firstId);
    let seeds = [[x, y, z]];
    if (sinkRole(firstRole)) seeds = this.neighbors(x, y, z).filter((point) => signalRole(circuitRole(this.world.getBlock(...point))));
    else if (firstRole === 'relay' || firstRole === 'inverter' || firstRole === 'comparator') seeds = [];
    const visited = new Set();
    const queue = [...seeds];
    const nodes = [];
    const lamps = new Map();
    const actuators = new Map();
    const gates = new Map();
    const poweredRails = new Map();
    const freightStations = new Map();
    const resonanceBoxes = new Map();
    const forgeEjectors = new Map();
    const runeDispensers = new Map();
    const relayInputs = new Map();
    const relayOutputs = new Map();
    const sequencerInputs = new Map();
    const sequencerOutputs = new Map();
    const sentryOutputs = new Map();
    const inverterInputs = new Map();
    const inverterOutputs = new Map();
    const comparatorOutputs = new Map();
    while (queue.length && visited.size < this.maximumNodes) {
      const point = queue.shift();
      const key = keyFor(...point);
      if (visited.has(key)) continue;
      const id = this.world.getBlock(...point);
      if (!signalRole(circuitRole(id))) continue;
      visited.add(key);
      nodes.push({ point, id });
      for (const neighbor of this.neighbors(...point)) {
        const neighborId = this.world.getBlock(...neighbor);
        const role = circuitRole(neighborId);
        const neighborKey = keyFor(...neighbor);
        if (role === 'lamp') lamps.set(neighborKey, { point: neighbor, id: neighborId });
        else if (role === 'actuator') actuators.set(neighborKey, { point: neighbor, id: neighborId });
        else if (role === 'gate') gates.set(neighborKey, { point: neighbor, id: neighborId });
        else if (role === 'poweredRail') poweredRails.set(neighborKey, { point: neighbor, id: neighborId });
        else if (role === 'freightStation') freightStations.set(neighborKey, { point: neighbor, id: neighborId });
        else if (role === 'resonance') resonanceBoxes.set(neighborKey, { point: neighbor, id: neighborId });
        else if (role === 'ejector') forgeEjectors.set(neighborKey, { point: neighbor, id: neighborId });
        else if (role === 'dispenser') runeDispensers.set(neighborKey, { point: neighbor, id: neighborId });
        else if (role === 'relay') {
          const terminals = this.relayTerminals(...neighbor, neighborId);
          if (terminals && keyFor(...terminals.input) === key) relayInputs.set(neighborKey, { point: neighbor, id: neighborId });
          if (terminals && keyFor(...terminals.output) === key) relayOutputs.set(neighborKey, { point: neighbor, id: neighborId });
        } else if (role === 'sequencer') {
          const terminals = this.relayTerminals(...neighbor, neighborId);
          if (terminals && keyFor(...terminals.input) === key) sequencerInputs.set(neighborKey, { point: neighbor, id: neighborId });
          if (terminals && keyFor(...terminals.output) === key) sequencerOutputs.set(neighborKey, { point: neighbor, id: neighborId });
        } else if (role === 'sentry') {
          const output = this.sentryOutput(...neighbor, neighborId);
          if (output && keyFor(...output) === key) sentryOutputs.set(neighborKey, { point: neighbor, id: neighborId });
        } else if (role === 'inverter') {
          const terminals = this.relayTerminals(...neighbor, neighborId);
          if (terminals && keyFor(...terminals.input) === key) inverterInputs.set(neighborKey, { point: neighbor, id: neighborId });
          if (terminals && keyFor(...terminals.output) === key) inverterOutputs.set(neighborKey, { point: neighbor, id: neighborId });
        } else if (role === 'comparator') {
          const terminals = this.relayTerminals(...neighbor, neighborId);
          if (terminals && keyFor(...terminals.output) === key) comparatorOutputs.set(neighborKey, { point: neighbor, id: neighborId });
        } else if (signalRole(role) && !visited.has(neighborKey)) queue.push(neighbor);
      }
    }
    return { nodes, lamps: [...lamps.values()], actuators: [...actuators.values()], gates: [...gates.values()], poweredRails: [...poweredRails.values()], freightStations: [...freightStations.values()], resonanceBoxes: [...resonanceBoxes.values()], forgeEjectors: [...forgeEjectors.values()], runeDispensers: [...runeDispensers.values()], relayInputs: [...relayInputs.values()], relayOutputs: [...relayOutputs.values()], sequencerInputs: [...sequencerInputs.values()], sequencerOutputs: [...sequencerOutputs.values()], sentryOutputs: [...sentryOutputs.values()], inverterInputs: [...inverterInputs.values()], inverterOutputs: [...inverterOutputs.values()], comparatorOutputs: [...comparatorOutputs.values()], truncated: queue.length > 0 };
  }

  scheduleRelay(point, desired) {
    const key = keyFor(...point);
    this.registerAt(...point);
    const record = this.relays.get(key);
    const current = Boolean(BLOCKS[this.world.getBlock(...point)]?.powered);
    if (current === desired) {
      record.desired = desired;
      record.timer = 0;
      return false;
    }
    if (record.desired !== desired || record.timer <= 0) {
      record.desired = desired;
      record.timer = RELAY_DELAYS[record.delayIndex];
    }
    return true;
  }

  componentSignalLevel(component) {
    let level = component.nodes.some(({ id }) => ['switch', 'sensor'].includes(circuitRole(id)) && BLOCKS[id].powered) ? 15 : 0;
    if (component.relayOutputs.some(({ id }) => BLOCKS[id].powered)) level = 15;
    if (component.sequencerOutputs.some(({ id }) => BLOCKS[id].powered)) level = 15;
    if (component.sentryOutputs.some(({ id }) => BLOCKS[id].powered)) level = 15;
    if (component.inverterOutputs.some(({ id }) => BLOCKS[id].powered)) level = 15;
    for (const { point, id } of component.comparatorOutputs || []) {
      if (!BLOCKS[id]?.powered) continue;
      level = Math.max(level, this.comparators.get(keyFor(...point))?.outputLevel || 0);
    }
    return Math.max(0, Math.min(15, level));
  }

  componentPowered(component) {
    return this.componentSignalLevel(component) > 0;
  }

  sinkPowered(point) {
    for (const neighbor of this.neighbors(...point)) {
      const id = this.world.getBlock(...neighbor);
      const role = circuitRole(id);
      if (signalRole(role) && this.componentPowered(this.componentFrom(...neighbor))) return true;
      if (role === 'relay' || role === 'sequencer' || role === 'inverter' || role === 'comparator') {
        const terminals = this.relayTerminals(...neighbor, id);
        if (terminals && keyFor(...terminals.output) === keyFor(...point) && BLOCKS[id].powered) {
          if (role !== 'comparator' || (this.comparators.get(keyFor(...neighbor))?.outputLevel || 0) > 0) return true;
        }
      } else if (role === 'sentry') {
        const output = this.sentryOutput(...neighbor, id);
        if (output && keyFor(...output) === keyFor(...point) && BLOCKS[id].powered) return true;
      }
    }
    return false;
  }

  inputSignalLevel(source, destination) {
    const id = this.world.getBlock(...source);
    const role = circuitRole(id);
    if (signalRole(role)) return this.componentSignalLevel(this.componentFrom(...source));
    if (['relay', 'sequencer', 'inverter', 'comparator'].includes(role)) {
      const terminals = this.relayTerminals(...source, id);
      if (terminals && keyFor(...terminals.output) === keyFor(...destination) && BLOCKS[id]?.powered) {
        return role === 'comparator' ? this.comparators.get(keyFor(...source))?.outputLevel || 0 : 15;
      }
    }
    if (role === 'sentry') {
      const output = this.sentryOutput(...source, id);
      if (output && keyFor(...output) === keyFor(...destination) && BLOCKS[id]?.powered) return 15;
    }
    return Math.max(0, Math.min(15, Math.floor(Number(this.readContainerSignal(...source)) || 0)));
  }

  evaluateComparator(point) {
    const id = this.world.getBlock(...point);
    if (circuitRole(id) !== 'comparator') return null;
    this.registerAt(...point, id);
    const key = keyFor(...point);
    const record = this.comparators.get(key);
    const terminals = this.relayTerminals(...point, id);
    const sides = this.comparatorSides(...point, id);
    if (!record || !terminals || !sides) return null;
    const inputLevel = this.inputSignalLevel(terminals.input, point);
    const sideLevel = Math.max(...sides.map((source) => this.inputSignalLevel(source, point)));
    const mode = BLOCKS[id]?.comparatorMode === 'subtract' ? 'subtract' : 'compare';
    const outputLevel = mode === 'subtract' ? Math.max(0, inputLevel - sideLevel) : (inputLevel > 0 && inputLevel >= sideLevel ? inputLevel : 0);
    const changed = outputLevel !== record.outputLevel;
    record.inputLevel = inputLevel;
    record.sideLevel = sideLevel;
    record.outputLevel = outputLevel;
    record.sampleTimer = COMPARATOR_SAMPLE_INTERVAL;
    if (this.setState(...point, poweredVariant(id, outputLevel > 0)) || changed) this.recomputeAround(...terminals.output);
    return { point, mode, inputLevel, sideLevel, outputLevel, changed };
  }

  setSequencerInput(point, powered) {
    const key = keyFor(...point);
    this.registerAt(...point);
    const record = this.sequencers.get(key);
    const rising = powered && !record.inputPowered;
    record.inputPowered = Boolean(powered);
    if (!rising || record.running) return false;
    record.running = true;
    record.phase = 0;
    record.timer = PULSE_INTERVAL;
    const id = this.world.getBlock(...point);
    this.setState(...point, poweredVariant(id, true));
    const terminals = this.relayTerminals(...point);
    if (terminals) this.recomputeAround(...terminals.output);
    return true;
  }

  setInverterInput(point, powered) {
    const key = keyFor(...point); this.registerAt(...point); const record = this.inverters.get(key);
    if (!record) return false;
    record.inputPowered = Boolean(powered); const desired = !record.inputPowered;
    const current = Boolean(BLOCKS[this.world.getBlock(...point)]?.powered);
    if (current === desired) { record.desired = desired; record.timer = 0; return false; }
    if (record.desired !== desired || record.timer <= 0) { record.desired = desired; record.timer = INVERTER_DELAY; }
    return true;
  }

  moveWithRam(point, id) {
    const facing = BLOCKS[id]?.circuitFacing;
    if (!facing) return null;
    const ahead = [point[0] + facing[0], point[1] + facing[1], point[2] + facing[2]];
    const blocks = [];
    let destination = null;
    for (let distance = 1; distance <= MAX_RAM_PUSH + 1; distance += 1) {
      const position = [point[0] + facing[0] * distance, point[1] + facing[1] * distance, point[2] + facing[2] * distance];
      const blockId = this.world.getBlock(...position);
      if (blockId === BLOCK.AIR || isLiquidBlock(blockId)) { destination = position; break; }
      if (blocks.length >= MAX_RAM_PUSH || !ramCanMoveBlock(blockId)) return null;
      blocks.push({ position, id: blockId });
    }
    if (!blocks.length || !destination) return null;
    const last = blocks.at(-1);
    if (!this.canMoveInto(destination, last.position, last.id)) return null;
    const changes = [...blocks].reverse().map(({ position, id: blockId }) => ({ x: position[0] + facing[0], y: position[1] + facing[1], z: position[2] + facing[2], id: blockId }));
    changes.push({ x: ahead[0], y: ahead[1], z: ahead[2], id: BLOCK.AIR });
    if (typeof this.world.setBlocks === 'function') this.world.setBlocks(changes);
    else {
      for (const change of changes) this.world.setBlock(change.x, change.y, change.z, change.id);
    }
    const detached = this.detachUnsupportedAbove(...ahead);
    const result = { from: ahead, to: destination, id: blocks[0].id, count: blocks.length, moved: blocks.map(({ position, id: blockId }) => ({ from: position, to: [position[0] + facing[0], position[1] + facing[1], position[2] + facing[2]], id: blockId })), detached };
    this.onMove(result);
    return result;
  }

  retractWithRam(point, id) {
    const definition = BLOCKS[id];
    const facing = definition?.circuitFacing;
    if (!definition?.ramSticky || !facing) return null;
    const ahead = [point[0] + facing[0], point[1] + facing[1], point[2] + facing[2]];
    const source = [ahead[0] + facing[0], ahead[1] + facing[1], ahead[2] + facing[2]];
    const sourceId = this.world.getBlock(...source);
    const aheadId = this.world.getBlock(...ahead);
    if (!ramCanMoveBlock(sourceId) || (aheadId !== BLOCK.AIR && !isLiquidBlock(aheadId)) || !this.canMoveInto(ahead, source, sourceId)) return null;
    const changes = [{ x: ahead[0], y: ahead[1], z: ahead[2], id: sourceId }, { x: source[0], y: source[1], z: source[2], id: BLOCK.AIR }];
    if (typeof this.world.setBlocks === 'function') this.world.setBlocks(changes);
    else { this.world.setBlock(...ahead, sourceId); this.world.setBlock(...source, BLOCK.AIR); }
    const detached = this.detachUnsupportedAbove(...source);
    const result = { from: source, to: ahead, id: sourceId, detached, retracted: true };
    this.onMove(result);
    return result;
  }

  recomputeFrom(x, y, z) {
    const component = this.componentFrom(x, y, z);
    if (!component.nodes.length) {
      const id = this.world.getBlock(x, y, z);
      const directRelayPower = sinkRole(circuitRole(id)) && this.sinkPowered([x, y, z]);
      if (sinkRole(circuitRole(id))) {
        if (directRelayPower && circuitRole(id) === 'actuator' && !BLOCKS[id].powered) this.moveWithRam([x, y, z], id);
        else if (!directRelayPower && circuitRole(id) === 'actuator' && BLOCKS[id].powered && BLOCKS[id].ramSticky) this.retractWithRam([x, y, z], id);
        if (circuitRole(id) === 'resonance') this.onResonancePower([x, y, z], directRelayPower);
        this.setState(x, y, z, poweredVariant(id, directRelayPower));
      }
      return { powered: directRelayPower, nodes: 0, lamps: circuitRole(id) === 'lamp' ? 1 : 0, actuators: circuitRole(id) === 'actuator' ? 1 : 0, gates: circuitRole(id) === 'gate' ? 1 : 0, poweredRails: circuitRole(id) === 'poweredRail' ? 1 : 0, freightStations: circuitRole(id) === 'freightStation' ? 1 : 0, resonanceBoxes: circuitRole(id) === 'resonance' ? 1 : 0, forgeEjectors: circuitRole(id) === 'ejector' ? 1 : 0, runeDispensers: circuitRole(id) === 'dispenser' ? 1 : 0, relays: directRelayPower ? 1 : 0, sequencers: 0, sentries: 0, inverters: 0, comparators: circuitRole(id) === 'comparator' ? 1 : 0, truncated: false };
    }
    const powered = this.componentPowered(component);
    for (const { point, id } of component.nodes) if (circuitRole(id) === 'conduit') this.setState(...point, poweredVariant(id, powered));
    for (const { point, id } of component.lamps) this.setState(...point, poweredVariant(id, this.sinkPowered(point)));
    for (const { point, id } of component.actuators) {
      const sinkPower = this.sinkPowered(point);
      if (sinkPower && !BLOCKS[id].powered) this.moveWithRam(point, id);
      else if (!sinkPower && BLOCKS[id].powered && BLOCKS[id].ramSticky) this.retractWithRam(point, id);
      this.setState(...point, poweredVariant(id, sinkPower));
    }
    for (const { point, id } of component.gates) this.setState(...point, poweredVariant(id, this.sinkPowered(point)));
    for (const { point, id } of component.poweredRails) this.setState(...point, poweredVariant(id, this.sinkPowered(point)));
    for (const { point, id } of component.freightStations) this.setState(...point, poweredVariant(id, this.sinkPowered(point)));
    for (const { point } of component.resonanceBoxes) this.onResonancePower(point, this.sinkPowered(point));
    for (const { point, id } of component.forgeEjectors) this.setState(...point, poweredVariant(id, this.sinkPowered(point)));
    for (const { point, id } of component.runeDispensers) this.setState(...point, poweredVariant(id, this.sinkPowered(point)));
    for (const { point } of component.relayInputs) this.scheduleRelay(point, powered);
    for (const { point } of component.sequencerInputs) this.setSequencerInput(point, powered);
    for (const { point } of component.inverterInputs) this.setInverterInput(point, powered);
    return { powered, nodes: component.nodes.length, lamps: component.lamps.length, actuators: component.actuators.length, gates: component.gates.length, poweredRails: component.poweredRails.length, freightStations: component.freightStations.length, resonanceBoxes: component.resonanceBoxes.length, forgeEjectors: component.forgeEjectors.length, runeDispensers: component.runeDispensers.length, relays: component.relayInputs.length + component.relayOutputs.length, sequencers: component.sequencerInputs.length + component.sequencerOutputs.length, sentries: component.sentryOutputs.length, inverters: component.inverterInputs.length + component.inverterOutputs.length, comparators: component.comparatorOutputs.length, truncated: component.truncated };
  }

  recomputeAround(x, y, z) {
    const seeds = [[x, y, z], ...this.neighbors(x, y, z)];
    const id = this.world.getBlock(x, y, z);
    if (circuitRole(id) === 'relay' || circuitRole(id) === 'sequencer' || circuitRole(id) === 'inverter' || circuitRole(id) === 'comparator') {
      const terminals = this.relayTerminals(x, y, z, id);
      if (terminals) seeds.push(terminals.input, terminals.output);
      if (circuitRole(id) === 'comparator') seeds.push(...(this.comparatorSides(x, y, z, id) || []));
    } else if (circuitRole(id) === 'sentry') {
      const output = this.sentryOutput(x, y, z, id);
      if (output) seeds.push(output);
    }
    const handled = new Set();
    const results = [];
    for (const point of seeds) {
      const role = circuitRole(this.world.getBlock(...point));
      if (!role) continue;
      const component = this.componentFrom(...point);
      const signature = component.nodes.map(({ point: node }) => keyFor(...node)).sort()[0] || keyFor(...point);
      if (handled.has(signature)) continue;
      handled.add(signature);
      results.push(this.recomputeFrom(...point));
    }
    return results;
  }

  toggleSwitch(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (circuitRole(id) !== 'switch') return null;
    const powered = !BLOCKS[id].powered;
    this.setState(x, y, z, poweredVariant(id, powered));
    const results = this.recomputeAround(x, y, z);
    return { powered, affected: results.reduce((sum, result) => sum + result.nodes + result.lamps + result.actuators + result.gates + result.poweredRails + result.freightStations + result.resonanceBoxes + result.forgeEjectors + result.runeDispensers + result.relays + result.sequencers + result.sentries + result.inverters + result.comparators, 0) };
  }

  cycleRelay(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (circuitRole(id) !== 'relay') return null;
    this.registerAt(x, y, z, id);
    const record = this.relays.get(keyFor(x, y, z));
    record.delayIndex = (record.delayIndex + 1) % RELAY_DELAYS.length;
    if (record.timer > 0) record.timer = RELAY_DELAYS[record.delayIndex];
    return { delay: RELAY_DELAYS[record.delayIndex], step: record.delayIndex + 1 };
  }

  cycleSequencer(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (circuitRole(id) !== 'sequencer') return null;
    this.registerAt(x, y, z, id);
    const record = this.sequencers.get(keyFor(x, y, z));
    record.pulseCount = record.pulseCount % 4 + 1;
    return { pulses: record.pulseCount, interval: PULSE_INTERVAL, duration: record.pulseCount * PULSE_INTERVAL * 2 };
  }

  toggleComparator(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (circuitRole(id) !== 'comparator') return null;
    const mode = BLOCKS[id]?.comparatorMode === 'subtract' ? 'compare' : 'subtract';
    this.setState(x, y, z, comparatorModeVariant(id, mode));
    const result = this.evaluateComparator([x, y, z]);
    return result ? { ...result, mode } : null;
  }

  setSensor(x, y, z, powered) {
    const id = this.world.getBlock(x, y, z);
    if (circuitRole(id) !== 'sensor' || Boolean(BLOCKS[id].powered) === Boolean(powered)) return false;
    this.setState(x, y, z, poweredVariant(id, powered));
    this.recomputeAround(x, y, z);
    return true;
  }

  discover(points) {
    const fresh = [];
    for (const point of points || []) {
      if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) continue;
      const key = keyFor(point.x, point.y, point.z);
      if (this.discovered.has(key)) continue;
      this.discovered.add(key);
      const id = this.world.getBlock(point.x, point.y, point.z);
      if (!circuitRole(id)) continue;
      this.registerAt(point.x, point.y, point.z, id);
      if (circuitRole(id) === 'relay' && Number.isFinite(point.delayIndex)) {
        const record = this.relays.get(key);
        if (record) record.delayIndex = Math.max(0, Math.min(RELAY_DELAYS.length - 1, Math.floor(point.delayIndex)));
      }
      if (circuitRole(id) === 'sequencer' && Number.isFinite(point.pulseCount)) {
        const record = this.sequencers.get(key);
        if (record) record.pulseCount = Math.max(1, Math.min(4, Math.floor(point.pulseCount)));
      }
      if (circuitRole(id) === 'inverter') this.setInverterInput([point.x, point.y, point.z], false);
      if (circuitRole(id) === 'comparator') {
        const record = this.comparators.get(key);
        if (record) record.sampleTimer = 0;
      }
      fresh.push([Math.floor(point.x), Math.floor(point.y), Math.floor(point.z)]);
    }
    for (const point of fresh) this.recomputeAround(...point);
    return fresh.length;
  }

  update(dt, context = {}) {
    const events = [];
    const actors = Array.isArray(context.actors) ? context.actors : [];
    for (const key of [...this.sensors]) {
      const point = pointFor(key);
      const id = this.world.getBlock(...point);
      const definition = BLOCKS[id];
      if (circuitRole(id) !== 'sensor') {
        this.sensors.delete(key);
        continue;
      }
      let powered = false;
      if (definition.sensorKind === 'pressure') {
        powered = actors.some((actor) => actor && Math.floor(actor.x) === point[0] && Math.floor(actor.z) === point[2]
          && actor.y >= point[1] - 0.05 && actor.y <= point[1] + 1.6);
      } else if (definition.sensorKind === 'daylight') {
        const sky = typeof this.world.skyLightAt === 'function' ? this.world.skyLightAt(point[0], point[1] + 1, point[2]) : 15;
        powered = (Number(context.daylight) || 0) >= 0.42 && sky >= 12;
      }
      if (this.setSensor(...point, powered)) events.push({ type: 'sensor', point, powered });
    }
    for (const [key, record] of this.relays) {
      if (record.timer <= 0) continue;
      record.timer = Math.max(0, record.timer - Math.max(0, Number(dt) || 0));
      if (record.timer > 0) continue;
      const point = pointFor(key);
      const id = this.world.getBlock(...point);
      if (circuitRole(id) !== 'relay') continue;
      const powered = Boolean(record.desired);
      if (this.setState(...point, poweredVariant(id, powered))) {
        this.recomputeAround(...point);
        events.push({ type: 'relay', point, powered, delay: RELAY_DELAYS[record.delayIndex] });
      }
    }
    for (const [key, record] of this.sequencers) {
      if (!record.running || record.timer <= 0) continue;
      let remaining = Math.max(0, Number(dt) || 0);
      while (record.running && remaining + 1e-9 >= record.timer) {
        remaining -= record.timer;
        record.phase += 1;
        const point = pointFor(key);
        const id = this.world.getBlock(...point);
        if (circuitRole(id) !== 'sequencer') {
          record.running = false;
          break;
        }
        const done = record.phase >= record.pulseCount * 2;
        const powered = !done && record.phase % 2 === 0;
        record.running = !done;
        record.timer = done ? 0 : PULSE_INTERVAL;
        if (this.setState(...point, poweredVariant(id, powered))) {
          const terminals = this.relayTerminals(...point);
          if (terminals) this.recomputeAround(...terminals.output);
          events.push({ type: 'sequencer', point, powered, phase: record.phase, pulses: record.pulseCount });
        }
      }
      if (record.running) record.timer = Math.max(0.000001, record.timer - remaining);
    }
    for (const [key, record] of this.inverters) {
      if (record.timer <= 0 || record.desired == null) continue;
      record.timer = Math.max(0, record.timer - Math.max(0, Number(dt) || 0)); if (record.timer > 0) continue;
      const point = pointFor(key); const id = this.world.getBlock(...point);
      if (circuitRole(id) !== 'inverter') { this.inverters.delete(key); continue; }
      const powered = Boolean(record.desired);
      if (this.setState(...point, poweredVariant(id, powered))) {
        const terminals = this.relayTerminals(...point); if (terminals) this.recomputeAround(...terminals.output);
        events.push({ type: 'inverter', point, powered });
      }
    }
    for (const [key, record] of [...this.comparators]) {
      const point = pointFor(key);
      const id = this.world.getBlock(...point);
      if (circuitRole(id) !== 'comparator') { this.comparators.delete(key); continue; }
      record.sampleTimer = Math.max(0, record.sampleTimer - Math.max(0, Number(dt) || 0));
      if (record.sampleTimer > 0) continue;
      const result = this.evaluateComparator(point);
      if (result?.changed) events.push({ type: 'comparator', ...result });
    }
    return events;
  }

  blockChanged(x, y, z, oldId, newId) {
    const key = keyFor(x, y, z);
    const oldRole = circuitRole(oldId);
    const newRole = circuitRole(newId);
    if (oldRole === 'relay' && newRole !== 'relay') this.relays.delete(key);
    if (oldRole === 'sequencer' && newRole !== 'sequencer') this.sequencers.delete(key);
    if (oldRole === 'inverter' && newRole !== 'inverter') this.inverters.delete(key);
    if (oldRole === 'comparator' && newRole !== 'comparator') this.comparators.delete(key);
    if (oldRole === 'sensor' && newRole !== 'sensor') this.sensors.delete(key);
    if (oldRole === 'actuator' && newRole !== 'actuator') this.actuators.delete(key);
    if (newRole) this.registerAt(x, y, z, newId);
    if (newRole === 'inverter' && oldRole !== 'inverter') this.setInverterInput([x, y, z], false);
    if (newRole === 'comparator') {
      const record = this.comparators.get(key);
      if (record) record.sampleTimer = 0;
    }
    if (!oldRole && !newRole) return [];
    return this.recomputeAround(x, y, z);
  }

  detachUnsupportedAbove(x, y, z) {
    const above = [Math.floor(x), Math.floor(y) + 1, Math.floor(z)];
    const id = this.world.getBlock(...above);
    if (!circuitRole(id) || !BLOCKS[id]?.requiresSupport || BLOCKS[this.world.getBlock(above[0], above[1] - 1, above[2])]?.solid) return null;
    this.setState(...above, BLOCK.AIR);
    this.blockChanged(...above, id, BLOCK.AIR);
    return { id: circuitItem(id), x: above[0], y: above[1], z: above[2] };
  }

  serialize() {
    return {
      relays: [...this.relays].map(([key, record]) => [key, record.delayIndex]),
      sequencers: [...this.sequencers].map(([key, record]) => [key, record.pulseCount, record.phase, record.timer, record.inputPowered, record.running]),
      inverters: [...this.inverters].map(([key, record]) => [key, record.desired, record.timer, record.inputPowered]),
      comparators: [...this.comparators].map(([key, record]) => [key, record.outputLevel, record.inputLevel, record.sideLevel, record.sampleTimer]),
      sensors: [...this.sensors],
      actuators: [...this.actuators],
      discovered: [...this.discovered],
    };
  }
}
