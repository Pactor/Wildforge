import * as THREE from 'three';

const PARTICLE_GEOMETRY = new THREE.BoxGeometry(0.1, 0.1, 0.1);

export class BlockParticles {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.randomState = 0x91e10da5;
    this.reducedMotion = false;
  }

  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
    return this.reducedMotion;
  }

  random() {
    let x = this.randomState;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.randomState = x >>> 0;
    return this.randomState / 4294967296;
  }

  burst(position, color, count = 12) {
    count = this.reducedMotion ? Math.min(2, count) : count;
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(
        PARTICLE_GEOMETRY,
        new THREE.MeshLambertMaterial({ color, flatShading: true }),
      );
      mesh.position.copy(position).add(new THREE.Vector3(
        (this.random() - 0.5) * 0.65,
        (this.random() - 0.3) * 0.65,
        (this.random() - 0.5) * 0.65,
      ));
      mesh.scale.setScalar(0.65 + this.random() * 1.3);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (this.random() - 0.5) * 2.6,
          1.2 + this.random() * 2.3,
          (this.random() - 0.5) * 2.6,
        ).multiplyScalar(this.reducedMotion ? 0.16 : 1),
        life: this.reducedMotion ? 0.2 : 0.45 + this.random() * 0.4,
        gravity: this.reducedMotion ? -1.4 : -9,
        growth: 0,
      });
    }
  }

  smoke(position, count = 2) {
    if (this.reducedMotion) return;
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(
        PARTICLE_GEOMETRY,
        new THREE.MeshLambertMaterial({ color: index % 3 === 0 ? 0xd87932 : 0x777873, flatShading: true, transparent: true, opacity: 0.7 }),
      );
      mesh.position.copy(position).add(new THREE.Vector3((this.random() - 0.5) * 0.28, this.random() * 0.18, (this.random() - 0.5) * 0.28));
      mesh.scale.setScalar(0.7 + this.random() * 0.6);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3((this.random() - 0.5) * 0.22, 0.65 + this.random() * 0.55, (this.random() - 0.5) * 0.22),
        life: 1.15 + this.random() * 0.65,
        gravity: 0.12,
        growth: 0.7,
      });
    }
  }

  update(dt) {
    for (const particle of [...this.particles]) {
      particle.life -= dt;
      particle.velocity.y += (particle.gravity ?? -9) * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += dt * 6;
      particle.mesh.rotation.y += dt * 4;
      particle.mesh.scale.multiplyScalar(particle.growth ? 1 + dt * particle.growth : Math.max(0.8, 1 - dt * 2.3));
      if (particle.mesh.material.transparent) particle.mesh.material.opacity = Math.max(0, Math.min(0.7, particle.life * 0.55));
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.material.dispose();
        this.particles.splice(this.particles.indexOf(particle), 1);
      }
    }
  }
}
