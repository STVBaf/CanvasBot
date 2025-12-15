'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
}

export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];
    const numStars = 800;
    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;

    // Colors for galaxy effect
    const colors = ['#ffffff', '#ffe9c4', '#d4fbff', '#ffb5b5', '#b5baff'];

    const initStars = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: (Math.random() - 0.5) * width * 2,
          y: (Math.random() - 0.5) * height * 2,
          z: Math.random() * width,
          size: Math.random() * 1.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      cx = width / 2;
      cy = height / 2;
      initStars();
    };

    const draw = () => {
      // Dark background with slight trail effect
      ctx.fillStyle = 'rgba(5, 5, 15, 0.2)';
      ctx.fillRect(0, 0, width, height);

      stars.forEach((star) => {
        // Move star closer
        star.z -= 0.5; // Speed

        // Reset star if it passes the screen
        if (star.z <= 0) {
          star.z = width;
          star.x = (Math.random() - 0.5) * width * 2;
          star.y = (Math.random() - 0.5) * height * 2;
        }

        // Project 3D coordinates to 2D
        const x = (star.x / star.z) * width + cx;
        const y = (star.y / star.z) * height + cy;
        const size = (1 - star.z / width) * star.size * 2;

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const alpha = (1 - star.z / width);
          ctx.beginPath();
          ctx.fillStyle = star.color;
          ctx.globalAlpha = alpha;
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Add glow effect for larger stars
          if (size > 1.5) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = star.color;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
          ctx.globalAlpha = 1;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: '#05050f' }}
    />
  );
}
