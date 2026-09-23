import React, { useEffect, useRef } from 'react';
import './AnimatedBackground.css';

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let nodes = [];
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create neural nodes
    const createNodes = () => {
      nodes = [];
      const count = Math.floor((canvas.width * canvas.height) / 40000);
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.3 + 0.1,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const createParticles = () => {
      particles = [];
      for (let i = 0; i < 15; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.15 + 0.05,
          hue: Math.random() > 0.5 ? 210 : 160,
        });
      }
    };

    createNodes();
    createParticles();

    const animate = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connection lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const opacity = (1 - dist / 150) * 0.08;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(74, 123, 247, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw and update nodes
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        node.phase += 0.01;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        const glow = Math.sin(node.phase) * 0.15 + 0.15;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 123, 247, ${node.opacity + glow})`;
        ctx.fill();
      });

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.opacity})`;
        ctx.fill();
      });

      // Draw faint circuit traces (low contrast, no harsh grids)
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.028)';
      ctx.lineWidth = 1;
      const circuitOffset = (time * 0.008) % 300;
      
      // Circuit trace line 1
      ctx.beginPath();
      ctx.moveTo(0, 180 + circuitOffset * 0.2);
      ctx.lineTo(canvas.width * 0.25, 180 + circuitOffset * 0.2);
      ctx.lineTo(canvas.width * 0.32, 240 + circuitOffset * 0.2);
      ctx.lineTo(canvas.width * 0.55, 240 + circuitOffset * 0.2);
      ctx.stroke();

      // Circuit trace line 2
      ctx.beginPath();
      ctx.moveTo(canvas.width, canvas.height * 0.7);
      ctx.lineTo(canvas.width * 0.75, canvas.height * 0.7);
      ctx.lineTo(canvas.width * 0.68, canvas.height * 0.7 - 60);
      ctx.lineTo(canvas.width * 0.45, canvas.height * 0.7 - 60);
      ctx.stroke();

      // Draw faint security shield watermark (very low contrast)
      const shieldCenterX = canvas.width * 0.88;
      const shieldCenterY = canvas.height * 0.78;
      const shieldScale = Math.min(canvas.width, canvas.height) * 0.18;
      if (shieldScale > 50) {
        ctx.save();
        ctx.strokeStyle = 'rgba(74, 123, 247, 0.025)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(shieldCenterX, shieldCenterY - shieldScale);
        ctx.lineTo(shieldCenterX + shieldScale * 0.8, shieldCenterY - shieldScale * 0.7);
        ctx.lineTo(shieldCenterX + shieldScale * 0.8, shieldCenterY + shieldScale * 0.1);
        ctx.quadraticCurveTo(
          shieldCenterX + shieldScale * 0.7,
          shieldCenterY + shieldScale * 0.8,
          shieldCenterX,
          shieldCenterY + shieldScale
        );
        ctx.quadraticCurveTo(
          shieldCenterX - shieldScale * 0.7,
          shieldCenterY + shieldScale * 0.8,
          shieldCenterX - shieldScale * 0.8,
          shieldCenterY + shieldScale * 0.1
        );
        ctx.lineTo(shieldCenterX - shieldScale * 0.8, shieldCenterY - shieldScale * 0.7);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="animated-background-wrapper" aria-hidden="true">
      <canvas ref={canvasRef} className="animated-background" />
    </div>
  );
}
