import * as THREE from 'three';
import { BLOCKS } from './blocks.js';
import { WORLD_MIN_Y } from './worldBounds.js';

const THORN_GEOMETRY = new THREE.BoxGeometry(0.12, 0.12, 0.62);
const FORWARD = new THREE.Vector3(0, 0, -1);

export class HostileProjectileManager {
  constructor(scene, world, player, onHit = () => {}, onImpact = () => {}) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.onHit = onHit;
    this.onImpact = onImpact;
    this.root = new THREE.Group();
    this.root.name = 'Hostile Projectiles';
    scene.add(this.root);
    this.projectiles = [];
  }

  shoot(entity, stats) {
    if (!entity?.root || !stats || stats.speed <= 0 || stats.damage <= 0) return null;
    const origin = entity.root.position.clone().add(new THREE.Vector3(0, 1.25, 0));
    const target = this.player.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    if (this.player.velocity) target.addScaledVector(this.player.velocity, 0.1);
    const direction = target.sub(origin).normalize();
    const mesh = new THREE.Mesh(
      THORN_GEOMETRY,
      new THREE.MeshLambertMaterial({ color: stats.color || 0xa6b769, emissive: stats.color || 0x302e13, emissiveIntensity: stats.color ? 0.48 : 0.24, flatShading: true }),
    );
    if (Number(stats.projectileScale) > 0) mesh.scale.setScalar(Math.min(3, stats.projectileScale));
    mesh.position.copy(origin).addScaledVector(direction, 0.55);
    mesh.quaternion.setFromUnitVectors(FORWARD, direction);
    this.root.add(mesh);
    const projectile = {
      mesh,
      velocity: direction.multiplyScalar(stats.speed),
      damage: stats.damage,
      gravity: Math.max(0, Number(stats.gravity) || 0),
      source: entity.definition?.name || 'Ranged creature',
      life: 5,
    };
    this.projectiles.push(projectile);
    if (this.projectiles.length > 32) this.remove(this.projectiles[0]);
    return projectile;
  }

  remove(projectile) {
    this.root.remove(projectile.mesh);
    projectile.mesh.material.dispose();
    const index = this.projectiles.indexOf(projectile);
    if (index >= 0) this.projectiles.splice(index, 1);
  }

  clear() {
    for (const projectile of [...this.projectiles]) this.remove(projectile);
  }

  update(dt) {
    dt = Math.max(0, Math.min(0.05, Number(dt) || 0));
    for (const projectile of [...this.projectiles]) {
      projectile.life -= dt;
      projectile.velocity.y -= projectile.gravity * dt;
      const travel = projectile.velocity.length() * dt;
      const steps = Math.max(1, Math.ceil(travel / 0.16));
      let impacted = false;
      for (let step = 0; step < steps; step += 1) {
        projectile.mesh.position.addScaledVector(projectile.velocity, dt / steps);
        const playerCenter = this.player.position.clone().add(new THREE.Vector3(0, 0.9, 0));
        if (projectile.mesh.position.distanceTo(playerCenter) < 0.55) {
          this.onHit(projectile.damage, projectile.source, projectile.mesh.position.clone());
          impacted = true;
          break;
        }
        const id = this.world.getBlock(projectile.mesh.position.x, projectile.mesh.position.y, projectile.mesh.position.z);
        if (BLOCKS[id]?.solid) {
          this.onImpact(projectile.mesh.position.clone());
          impacted = true;
          break;
        }
      }
      if (impacted || projectile.life <= 0 || projectile.mesh.position.y < WORLD_MIN_Y - 5) {
        this.remove(projectile);
        continue;
      }
      projectile.mesh.quaternion.setFromUnitVectors(FORWARD, projectile.velocity.clone().normalize());
    }
  }
}
