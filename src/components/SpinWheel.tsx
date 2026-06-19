/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, Shuffle, Trophy } from 'lucide-react';
import { LanguageCode, translations } from '../utils/translations';

interface SpinWheelProps {
  names: string[];
  logo?: string; // base64 logo string
  onSpinStart: () => void;
  onSpinComplete: (winnerName: string) => void;
  spinDuration?: number; // in seconds
  lang?: LanguageCode;
}

export default function SpinWheel({
  names,
  logo,
  onSpinStart,
  onSpinComplete,
  spinDuration = 5,
  lang = 'km',
}: SpinWheelProps) {
  const t = translations[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  // Keep track of parameters in state/refs
  const rotationAngleRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickSliceRef = useRef<number>(-1);

  // Load logo image helper
  useEffect(() => {
    if (logo) {
      const img = new Image();
      img.src = logo;
      img.onload = () => {
        setLogoImg(img);
      };
    } else {
      setLogoImg(null);
    }
  }, [logo]);

  // Premium Sophisticated Dark sleek alternating palette
  const colors = [
    '#161618', // Deep Charcoal Obsidian
    '#1E1E21', // Lighter Slate Metal
  ];

  // Helper to draw the wheel
  const drawWheel = (ctx: CanvasRenderingContext2D, size: number, currentAngle: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 15; // padding for pointer

    // Clear background
    ctx.clearRect(0, 0, size, size);

    // Draw outer glow ring using orange-500 light gradients (Sophisticated Dark signature)
    const outerGlow = ctx.createRadialGradient(cx, cy, radius - 2, cx, cy, radius + 15);
    outerGlow.addColorStop(0, 'rgba(249, 115, 22, 0.15)');
    outerGlow.addColorStop(0.5, 'rgba(234, 140, 8, 0.05)');
    outerGlow.addColorStop(1, 'rgba(10, 10, 11, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw outer premium dark/orange signature metallic border
    ctx.strokeStyle = '#F97316'; // Sophisticated premium orange
    ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(249, 115, 22, 0.5)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // If names list is empty, draw a placeholder
    const listNames = names.length > 0 ? names : ['សូមបញ្ចូលឈ្មោះ'];
    const numSlices = listNames.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    for (let i = 0; i < numSlices; i++) {
      const startAngle = i * sliceAngle + currentAngle;
      const endAngle = (i + 1) * sliceAngle + currentAngle;

      // Draw wedge sector
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius - 3, startAngle, endAngle);
      ctx.lineTo(cx, cy);
      ctx.fill();

      // Add a subtle white inner ray boundary
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + (radius - 3) * Math.cos(startAngle),
        cy + (radius - 3) * Math.sin(startAngle)
      );
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(cx, cy);
      const textAngle = startAngle + sliceAngle / 2;
      ctx.rotate(textAngle);

      // Setup text alignment and font styles
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      
      // Dynamic color: golden orange alternate for amazing readability!
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#E2E8F0';
      
      // Dynamic font size depending on list cardinality
      let fontSize = 15;
      if (numSlices > 30) fontSize = 10;
      else if (numSlices > 20) fontSize = 11;
      else if (numSlices > 10) fontSize = 13;

      ctx.font = `bold ${fontSize}px "Kantumruy Pro", sans-serif`;

      // Text shadow for high legibility on any background color
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Truncate name if too long
      let rawName = listNames[i];
      let displayName = rawName.length > 20 ? rawName.slice(0, 18) + '...' : rawName;

      // Draw text 30 pixels away from edge
      ctx.fillText(displayName, radius - 25, 0);
      ctx.restore();
    }

    // Draw central decorative hub with custom logo
    const hubRadius = size > 400 ? 55 : 45;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    
    // Core circle background - Deep obsidian color
    ctx.fillStyle = '#0A0A0B';
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing premium orange inner rim
    ctx.strokeStyle = '#F97316'; 
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius - 2, 0, Math.PI * 2);
    ctx.stroke();

    if (logoImg) {
      // Draw uploaded logo in center
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, hubRadius - 5, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        logoImg,
        cx - (hubRadius - 5),
        cy - (hubRadius - 5),
        (hubRadius - 5) * 2,
        (hubRadius - 5) * 2
      );
      ctx.restore();
    } else {
      // Draw lovely fallback crown or visual star
      ctx.fillStyle = '#F97316'; 
      ctx.font = 'bold 24px "Kantumruy Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎁', cx, cy - 2);
    }

    // Draw the indicator pointer pointing left from the absolute right edge
    ctx.save();
    ctx.translate(cx + radius - 5, cy);
    ctx.fillStyle = '#F97316'; // Premium Orange
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;

    ctx.shadowColor = 'rgba(249,115,22,0.4)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(5, -15);
    ctx.lineTo(-20, 0); // Point
    ctx.lineTo(5, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // Redraw whenever parameters change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI retina display support
    const size = 500;
    canvas.width = size;
    canvas.height = size;

    drawWheel(ctx, size, rotationAngleRef.current);
  }, [names, logo, logoImg]);

  // Handle Mute changing
  const toggleMute = () => {
    const currentMute = !isMuted;
    setIsMuted(currentMute);
    audio.setMute(currentMute);
  };

  // Launch Sparkles / Confetti
  const triggerSuccessConfetti = () => {
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#FBBF24', '#F59E0B', '#EF4444', '#3B82F6', '#10B981']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#FBBF24', '#F59E0B', '#EF4444', '#3B82F6', '#10B981']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  // Initiate Spin sequence
  const startSpin = () => {
    if (isSpinning || names.length === 0) return;

    setIsSpinning(true);
    onSpinStart();
    audio.playSwoosh();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const startRot = rotationAngleRef.current % (Math.PI * 2);
    rotationAngleRef.current = startRot;

    // Physics parameters for premium fluid ease-out curve
    const durationMs = spinDuration * 1000;
    const startTime = performance.now();

    // Randomize winning rotation: minimum 5 turns + random speed
    const totalRotationAngle = Math.PI * 2 * (6 + Math.random() * 5); 

    const numSlices = names.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Custom smooth power ease-out formula
      // f(t) = 1 - (1 - t)^4
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const currentWheelAngle = startRot + totalRotationAngle * easeProgress;
      rotationAngleRef.current = currentWheelAngle;

      // Audio ticks calculation based on boundaries of slices
      // Pointer is located on screen right (angle = 0)
      // The local angle of pointer in wheel's frame is:
      const absolutePointerLocalAngle = (Math.PI * 2 - (currentWheelAngle % (Math.PI * 2))) % (Math.PI * 2);
      const currentTickSlice = Math.floor(absolutePointerLocalAngle / sliceAngle);

      if (currentTickSlice !== lastTickSliceRef.current) {
        // Compute speed-dependent pitch or volume to feel reactive
        const speedRatio = 1 - progress;
        if (speedRatio > 0.05) {
          const pitch = 900 + speedRatio * 300;
          const volume = Math.max(0.05, speedRatio * 0.25);
          audio.playTick(pitch, volume);
        }
        lastTickSliceRef.current = currentTickSlice;
      }

      drawWheel(ctx, 500, currentWheelAngle);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Finished Spin! Determine winner
        setIsSpinning(false);
        audio.playWin();
        triggerSuccessConfetti();

        // Exact winner calculation relative to the selector point (Right side)
        const finalNormalizedAngle = (Math.PI * 2 - (rotationAngleRef.current % (Math.PI * 2))) % (Math.PI * 2);
        const winningIdx = Math.floor(finalNormalizedAngle / sliceAngle) % numSlices;
        const winner = names[winningIdx];

        onSpinComplete(winner);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Sound controller */}
      <div className="flex justify-end w-full max-w-[450px] px-4">
        <button
          onClick={toggleMute}
          className="flex items-center space-x-2 bg-[#161618] backdrop-blur border border-white/5 hover:border-white/10 duration-200 text-slate-300 hover:text-white py-1.5 px-3 rounded-full text-xs font-mono tracking-wider shadow-sm transition cursor-pointer"
          title={isMuted ? (lang === 'km' ? 'បើកសំឡេង' : 'Unmute') : (lang === 'km' ? 'បិទសំឡេង' : 'Mute')}
          id="btn-sound-toggle"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-orange-450" />}
          <span>{isMuted ? 'SOUND OFF' : 'SOUND ON'}</span>
        </button>
      </div>

      {/* Main Wheel Container with outer shadow and circular frame */}
      <div className="relative group select-none">
        {/* Glow behind the wheel */}
        <div className="absolute inset-0 bg-orange-500/5 rounded-full blur-3xl opacity-75 group-hover:opacity-100 transition duration-1000"></div>
        
        {/* Pointer Glow */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-400 rounded-full blur-md animate-pulse"></div>

        {/* Circular canvas element wraps */}
        <div className="relative border-4 border-white/5 bg-[#0A0A0B] p-2.5 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[440px] aspect-square rounded-full block cursor-pointer active:scale-95 transition-transform duration-300 ease-out"
            onClick={startSpin}
            id="lucky-spin-canvas"
          />

          {/* Central Overlay Button "Tap To Spin" */}
          <button
            disabled={isSpinning || names.length === 0}
            onClick={startSpin}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full flex flex-col items-center justify-center text-center text-[11px] font-bold tracking-tight text-white transition-all duration-300 z-10 
              ${isSpinning 
                ? 'bg-[#161618] border-2 border-white/5 scale-95 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 border border-white/10 uppercase pulse-gold-glow cursor-pointer scale-100 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
              }`}
            id="btn-center-spin"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            <Shuffle className={`w-5 h-5 mb-1 ${isSpinning ? 'animate-spin' : 'animate-bounce'}`} />
            <span>{isSpinning ? t.spinning : (lang === 'km' ? 'បង្វិល' : 'SPIN')}</span>
          </button>
        </div>
      </div>

      {/* Helper manual instructions hint */}
      <div className="text-center">
        <p className="text-slate-400 text-xs sm:text-sm font-sans flex items-center justify-center gap-1.5 bg-[#161618]/60 border border-white/5 py-2 px-4 rounded-xl">
          <Trophy className="w-4 h-4 text-orange-450 animate-pulse" />
          <span>{lang === 'km' ? 'ចុចលើប៊ូតុង « បង្វិល » នៅកណ្តាល ដើម្បីចងលទ្ធផលអ្នកឈ្នះ' : t.spinBtn}</span>
        </p>
      </div>
    </div>
  );
}
