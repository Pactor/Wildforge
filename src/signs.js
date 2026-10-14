import * as THREE from 'three';
import { BLOCK, BLOCKS } from './blocks.js';

const IDS = Object.freeze({ n: BLOCK.SIGN_N, e: BLOCK.SIGN_E, s: BLOCK.SIGN_S, w: BLOCK.SIGN_W });
const keyFor = (x, y, z) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

export function isSign(id) {
  return Boolean(BLOCKS[id]?.sign);
}

export function signInfo(id) {
  const definition = BLOCKS[id];
  return definition?.sign ? { orientation: definition.signOrientation } : null;
}

export function signIdFor(yaw) {
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  const orientation = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');
  return IDS[orientation];
}

export function normalizeSignText(value) {
  return String(value ?? '')
    .replace(/[^\x20-\x7e\n]/g, '')
    .split('\n')
    .slice(0, 4)
    .map((line) => line.slice(0, 18))
    .join('\n');
}

export class SignState {
  constructor(serialized = null) {
    this.records = new Map();
    if (Array.isArray(serialized)) {
      for (const record of serialized.slice(0, 256)) {
        if (!record || ![record.x, record.y, record.z].every(Number.isFinite)) continue;
        this.set(record.x, record.y, record.z, record.text);
      }
    }
  }

  set(x, y, z, text = '') {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const record = { x, y, z, text: normalizeSignText(text) };
    this.records.set(keyFor(x, y, z), record);
    return record;
  }

  get(x, y, z) {
    return this.records.get(keyFor(x, y, z)) || null;
  }

  remove(x, y, z) {
    return this.records.delete(keyFor(x, y, z));
  }

  entries() {
    return [...this.records.values()];
  }

  serialize() {
    return this.entries().map((record) => ({ ...record }));
  }
}

export class SignTextRenderer {
  constructor(scene, world, state) {
    this.world = world;
    this.state = state;
    this.root = new THREE.Group();
    this.root.name = 'Sign lettering';
    this.meshes = new Map();
    scene.add(this.root);
    this.sync();
  }

  disposeMesh(mesh) {
    mesh.material.map?.dispose();
    mesh.material.dispose();
    mesh.geometry.dispose();
    this.root.remove(mesh);
  }

  createMesh(record, orientation) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#2e2418';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '700 25px monospace';
    const lines = record.text.split('\n');
    const firstY = 64 - (lines.length - 1) * 15;
    lines.forEach((line, index) => context.fillText(line, 128, firstY + index * 30, 238));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 0.4),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.08, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    mesh.position.set(record.x + 0.5, record.y + 0.73, record.z + 0.5);
    if (orientation === 'n') mesh.position.z += 0.061;
    if (orientation === 's') { mesh.position.z -= 0.061; mesh.rotation.y = Math.PI; }
    if (orientation === 'e') { mesh.position.x -= 0.061; mesh.rotation.y = -Math.PI / 2; }
    if (orientation === 'w') { mesh.position.x += 0.061; mesh.rotation.y = Math.PI / 2; }
    return mesh;
  }

  sync() {
    const wanted = new Set();
    for (const record of this.state.entries()) {
      const info = signInfo(this.world.getBlock(record.x, record.y, record.z));
      if (!info) continue;
      const key = keyFor(record.x, record.y, record.z);
      wanted.add(key);
      const existing = this.meshes.get(key);
      if (existing) this.disposeMesh(existing);
      const mesh = this.createMesh(record, info.orientation);
      this.root.add(mesh);
      this.meshes.set(key, mesh);
    }
    for (const [key, mesh] of [...this.meshes]) {
      if (wanted.has(key)) continue;
      this.disposeMesh(mesh);
      this.meshes.delete(key);
    }
  }
}
