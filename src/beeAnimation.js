/**
 * Bee Animation System - Dynamic Distribution Version
 * Generates bees dynamically with orientation rules:
 * - Normal facing (bee.webp) on the left side (< 50% width)
 * - Inverted facing (bee_inverted.webp) on the right side (>= 50% width)
 */

class BeeAnimator {
  constructor() {
    this.bees = [];
    this.mouseX = 0;
    this.mouseY = 0;
    this.time = 0;
    this.beeCount = 3; // Reduced for cleaner design (was 6-8)

    this.init();
  }

  init() {
    this.createBees();
    this.setupInteractivity();
    this.animate();
  }

  createBees() {
    // Find a suitable container (hero section preferred, fallback to body)
    const container = document.querySelector(".hero") || document.body;

    for (let i = 0; i < this.beeCount; i++) {
      const beeElement = document.createElement("img");

      // Random position (avoiding absolute center for better aesthetics)
      const left =
        Math.random() < 0.5
          ? Math.random() * 40 // Left side (0-40%)
          : 60 + Math.random() * 35; // Right side (60-95%)

      const top = 15 + Math.random() * 75; // Top range (15-90%)

      // Orientation Rule
      const isRightSide = left >= 50;
      beeElement.src = isRightSide
        ? "/images/bee_inverted.webp"
        : "/images/bee.webp";

      beeElement.className = `bee-decoration bee-dynamic-${i}`;
      beeElement.style.position = "absolute";
      beeElement.style.left = `${left}%`;
      beeElement.style.top = `${top}%`;
      beeElement.style.transition = "none";
      beeElement.style.willChange = "transform";
      beeElement.style.pointerEvents = "none";
      beeElement.style.zIndex = "10";
      beeElement.style.width = `${40 + Math.random() * 25}px`; // Restored original size
      beeElement.style.height = "auto"; // Fix distortion

      container.appendChild(beeElement);

      this.bees.push({
        element: beeElement,
        index: i,
        speed: Math.random() * 0.05 + 0.02,
        phaseOffset: Math.random() * Math.PI * 2,
        rotationPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  setupInteractivity() {
    document.addEventListener("mousemove", (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.mouseX = (e.clientX - centerX) * 0.5;
      this.mouseY = (e.clientY - centerY) * 0.5;
    });
  }

  animate() {
    this.time = Date.now() * 0.001;

    this.bees.forEach((bee) => {
      const floatY = Math.sin(this.time + bee.phaseOffset) * 25;
      const floatX = Math.cos(this.time * 0.8 + bee.index) * 20;
      const floatRotation = Math.sin(this.time * 0.5 + bee.rotationPhase) * 12;

      const targetX = this.mouseX * -bee.speed;
      const targetY = this.mouseY * -bee.speed;

      bee.element.style.transform = `translate(${targetX + floatX}px, ${
        targetY + floatY
      }px) rotate(${floatRotation}deg)`;
    });

    requestAnimationFrame(() => this.animate());
  }
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new BeeAnimator());
} else {
  new BeeAnimator();
}

export default BeeAnimator;
