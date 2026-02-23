/**
 * Bee Animation System
 * Handles smooth floating and mouse parallax for bee elements.
 */

class BeeSystem {
  constructor() {
    this.bees = document.querySelectorAll(".bee-decoration");
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.windowCenterX = window.innerWidth / 2;
    this.windowCenterY = window.innerHeight / 2;

    this.init();
  }

  init() {
    if (this.bees.length === 0) return;

    // Distribute bees based on their type (normal vs inverse)
    this.bees.forEach((bee, index) => {
      const isInverse = bee.src.includes("abelha_inverso.webp");

      // Initial random position based on side
      const yPos = 10 + Math.random() * 80; // 10% to 90%
      let xPos;

      if (isInverse) {
        // Right side
        xPos = 60 + Math.random() * 35; // 60% to 95%
        bee.style.right = `${100 - xPos}%`;
        bee.style.left = "auto";
      } else {
        // Left side
        xPos = 5 + Math.random() * 35; // 5% to 40%
        bee.style.left = `${xPos}%`;
        bee.style.right = "auto";
      }

      bee.style.top = `${yPos}%`;

      // Store initial positions for parallax base
      bee.dataset.baseX = xPos;
      bee.dataset.baseY = yPos;
    });

    // Mouse Event
    document.addEventListener("mousemove", (e) => {
      this.mouseX = (e.clientX - this.windowCenterX) / this.windowCenterX;
      this.mouseY = (e.clientY - this.windowCenterY) / this.windowCenterY;
    });

    // Resize Event
    window.addEventListener("resize", () => {
      this.windowCenterX = window.innerWidth / 2;
      this.windowCenterY = window.innerHeight / 2;
    });

    // Start Loop
    this.animate();
    console.log("Bee System Initialized 🐝 - Side Optimized");
  }

  animate() {
    const time = Date.now() * 0.0008; // Slower time for more elegance

    // Smooth Lerp for Mouse (lower factor for smoother movement)
    this.targetX += (this.mouseX - this.targetX) * 0.03;
    this.targetY += (this.mouseY - this.targetY) * 0.03;

    this.bees.forEach((bee, index) => {
      const offset = index * 1.5;

      // 1. Expansive Floating (Reduced for calmer feel)
      const floatX =
        Math.sin(time + offset) * 20 + Math.cos(time * 0.5 + offset) * 10;
      const floatY =
        Math.cos(time * 0.7 + offset) * 25 + Math.sin(time * 0.3 + offset) * 10;
      const rotate = Math.sin(time * 0.4 + offset) * 15;

      // 2. Pronounced Parallax
      const depth = 50 + (index % 3) * 25; // Broadened range: 50, 75, or 100px
      const parallaxX = this.targetX * depth;
      const parallaxY = this.targetY * depth;

      // Apply transform with smooth transitions
      bee.style.transform = `translate(${floatX + parallaxX}px, ${floatY + parallaxY}px) rotate(${rotate}deg)`;
    });

    requestAnimationFrame(() => this.animate());
  }
}

// Auto-start
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new BeeSystem());
} else {
  new BeeSystem();
}
