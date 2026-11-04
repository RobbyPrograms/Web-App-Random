"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

export function Confetti({ fire }: { fire: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!fire || reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? window.innerWidth;
    const height = parent?.clientHeight ?? window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const colors = ["#FF5A1F", "#22D3EE", "#22C55E", "#F4F4F5", "#FACC15"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: width * 0.5,
      y: height * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -8 - 2,
      g: 0.18 + Math.random() * 0.08,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#fff",
      life: 90,
    }));
    let frame = 0;
    let raf = 0;
    const draw = () => {
      context.clearRect(0, 0, width, height);
      pieces.forEach((piece) => {
        piece.vy += piece.g;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.life -= 1;
        context.globalAlpha = Math.max(piece.life / 90, 0);
        context.fillStyle = piece.color;
        context.fillRect(piece.x, piece.y, piece.size, piece.size * 0.6);
      });
      frame += 1;
      if (frame < 110) raf = requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [fire, reduced]);

  if (!fire || reduced) return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-30" aria-hidden />;
}
