import * as THREE from 'three';
import { BLOCKS } from './blocks.js';
import { WORLD_MIN_Y } from './worldBounds.js';

const ARROW_GEOMETRY = new THREE.BoxGeometry(0.07, 0.07, 0.7);
const FORWARD = new THREE.Vector3(0, 0, -1);

export function bowShot(charge) {
  const held = Math.max(0, Math.min(1, Number(charge) || 0));
  if (held < 0.12) return null;
  const power = Math.min(1, (held * held + held * 2) / 3);
  return {
    power,
    damage: 2 + Math.round(power * 5),
    speed: 16 + power * 18,
    knockback: 2 + power * 2,
    gravity: 5.5,
  };
}

export class ProjectileManager {
  constructor(scene, world, entities, onImpact = () => {}) {
    this.scene = scene;
    this.world = world;
    this.entities = entities;
    this.onImpact = onImpact;
    this.root = new THREE.Group();
    this.root.name = 'Player Projectiles';
    this.scene.add(this.root);
    this.projectiles = [];
  }

  shoot(camera, stats) {
    if (!stats || stats.speed <= 0) return null;
    const direction = camera.getWorldDirection(new THREE.Vector3()).normalize();
    return this.shootFrom(camera.position, direction, stats);
  }

  shootFrom(origin, direction, stats) {
    if (!origin || !direction || !stats || stats.speed <= 0) return null;
    direction = direction.clone?.() || new THREE.Vector3(Number(direction.x) || 0, Number(direction.y) || 0, Number(direction.z) || 0);
    if (direction.lengthSq() <= 0) return null;
    direction.normalize();
    const mesh = new THREE.Mesh(
      ARROW_GEOMETRY,
      new THREE.MeshLambertMaterial({ color: 0xc9b07a, flatShading: true }),
    );
    mesh.position.copy(origin).addScaledVector(direction, 0.65);
    mesh.quaternion.setFromUnitVectors(FORWARD, direction);
    this.root.add(mesh);
    const projectile = {
      mesh,
      velocity: direction.multiplyScalar(stats.speed),
      damage: stats.damage,
      knockback: stats.knockback,
      gravity: stats.gravity ?? 5.5,
      life: 10,
    };
    this.projectiles.push(projectile);
    return projectile;
  }

  remove(projectile) {
    this.root.remove(projectile.mesh);
    projectile.mesh.material.dispose();
    const index = this.projectiles.indexOf(projectile);
    if (index >= 0) this.projectiles.splice(index, 1);
  }

  update(dt) {
    for (const projectile of [...this.projectiles]) {
      projectile.life -= dt;
      projectile.velocity.y -= projectile.gravity * dt;
      const travel = projectile.velocity.length() * dt;
      const steps = Math.max(1, Math.ceil(travel / 0.18));
      let impacted = false;
      for (let index = 0; index < steps; index += 1) {
        projectile.mesh.position.addScaledVector(projectile.velocity, dt / steps);
        const entity = this.entities.entityAtPoint?.(projectile.mesh.position, 0.34);
        if (entity) {
          const damaged = this.entities.attack(entity, projectile.damage, projectile.knockback);
          this.onImpact(entity, projectile.mesh.position.clone(), damaged);
          impacted = true;
          break;
        }
        const id = this.world.getBlock(projectile.mesh.position.x, projectile.mesh.position.y, projectile.mesh.position.z);
        if (BLOCKS[id]?.solid) {
          this.onImpact(null, projectile.mesh.position.clone(), false);
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
