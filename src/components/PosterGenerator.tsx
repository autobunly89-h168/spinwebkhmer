/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Winner, Prize, AppSettings } from '../types';
import { jsPDF } from 'jspdf';
import { Download, FileDown, Image as ImageIcon, CheckCircle, RefreshCw, Move, RotateCcw, Sliders, Crop, Palette, Sparkles } from 'lucide-react';

interface PosterGeneratorProps {
  winners: Record<number, Winner | null>;
  prizes: Record<number, Prize>;
  settings: AppSettings;
  logo?: string;
}

// Helper to convert hex to RGBA with specific opacity
const hexToRgba = (hex: string, alpha: number): string => {
  let r = 249, g = 115, b = 22;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else if (cleanHex.length === 3) {
    r = parseInt(cleanHex.substring(0, 1) + cleanHex.substring(0, 1), 16);
    g = parseInt(cleanHex.substring(1, 2) + cleanHex.substring(1, 2), 16);
    b = parseInt(cleanHex.substring(2, 3) + cleanHex.substring(2, 3), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Simple utility to find a dominant colorful accent from the image
const getDominantColor = (img: HTMLImageElement): string => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#F97316';
    canvas.width = 40;
    canvas.height = 40;
    ctx.drawImage(img, 0, 0, 40, 40);
    const imgData = ctx.getImageData(0, 0, 40, 40).data;
    
    let bestR = 249;
    let bestG = 115;
    let bestB = 22;
    let maxSaturation = 0;
    let sumR = 0, sumG = 0, sumB = 0, validCount = 0;
    
    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i+1];
      const b = imgData[i+2];
      const a = imgData[i+3];
      
      if (a > 180) {
        sumR += r;
        sumG += g;
        sumB += b;
        validCount++;
        
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);
        const saturation = maxVal - minVal;
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;
        
        // Target rich color that is neither too close to black nor white
        if (saturation > maxSaturation && brightness > 45 && brightness < 215) {
          maxSaturation = saturation;
          bestR = r;
          bestG = g;
          bestB = b;
        }
      }
    }
    
    if (maxSaturation > 25) {
      const toHex = (c: number) => c.toString(16).padStart(2, '0');
      return `#${toHex(bestR)}${toHex(bestG)}${toHex(bestB)}`;
    } else if (validCount > 0) {
      const rAvg = Math.round(sumR / validCount);
      const gAvg = Math.round(sumG / validCount);
      const bAvg = Math.round(sumB / validCount);
      const brightness = rAvg * 0.299 + gAvg * 0.587 + bAvg * 0.114;
      if (brightness < 40) return '#F97316'; // Fallback if too dark
      const toHex = (c: number) => c.toString(16).padStart(2, '0');
      return `#${toHex(rAvg)}${toHex(gAvg)}${toHex(bAvg)}`;
    }
  } catch (err) {
    console.error('Error drawing logo for color detection:', err);
  }
  return '#F97316';
};

// Helper to preload image URLs safely
const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
};

// List of beautiful presets for customizable backgrounds
const BACKGROUND_PRESETS = [
  {
    id: 'luxury-gold',
    name: 'ខ្មៅមាសប្រណីត',
    enName: 'Elite Black Gold',
    desc: 'ពណ៌ខ្មៅស៊ីវីល័យ រំលេចរលកបន្ទាត់ពណ៌មាសលាតសន្ធឹង',
    gradient: 'from-[#0A0A0B] via-[#1B1B1E] to-[#020202]',
    badgeColor: '#D97706',
    isDark: true
  },
  {
    id: 'brand-neon',
    name: 'ណេអុងម៉ាកយីហោ',
    enName: 'Brand Neon Spotlight',
    desc: 'រំលេចពន្លឺពណ៌ម៉ាកយីហោ (Brand Accent Color) ជាមួយក្តារធរណីមាត្រ',
    gradient: 'from-[#030712] via-[#0B0F19] to-[#02040A]',
    badgeColor: '#F97316',
    isDark: true
  },
  {
    id: 'modern-geo',
    name: 'ធរណីមាត្រច្នៃប្រឌិត',
    enName: 'Geometric Cyber Tech',
    desc: 'គ្រោងឆ្អឹងវិមាត្រ បច្ចេកវិទ្យាទំនើប រចនាសម្ព័ន្ឋហាយថិក',
    gradient: 'from-[#0E0818] via-[#171126] to-[#050209]',
    badgeColor: '#A855F7',
    isDark: true
  },
  {
    id: 'organic-waves',
    name: 'រលកធម្មជាតិខ្ពស់',
    enName: 'Organic Scandinavian',
    desc: 'ពណ៌ក្រែម-កាហ្វេដោះគោ ទន់ភ្លន់ បែបស្កង់ឌីណាវ (Scandinavian Wave)',
    gradient: 'from-[#FAF6F0] via-[#F3EAE0] to-[#EAE1D4]',
    badgeColor: '#C2B29F',
    isDark: false
  },
  {
    id: 'floral-watercolor',
    name: 'ផ្កាព្រៃមនោសញ្ចេតនា',
    enName: 'Botanical Blush',
    desc: 'ម៉ូដគំនូរពណ៌ទឹកផ្កាកុលាប និងស្លឹកឈើស្រទន់ បែបធម្មជាតិមនោសញ្ចេតនា',
    gradient: 'from-[#FFF5F6] via-[#FEE2E2] to-[#E0F2FE]',
    badgeColor: '#DB2777',
    isDark: false
  },
  {
    id: 'bokeh-glow',
    name: 'ពន្លឺព្រិលមន្តអាគម',
    enName: 'Dreamy Aurora Bokeh',
    desc: 'ពន្លឺព្រិលមូលៗ Bokeh ចាំងឆ្លុះលើផ្ទៃមេឃរាត្រីពណ៌ខៀវបៃតង',
    gradient: 'from-[#02241E] via-[#0B1320] to-[#02050A]',
    badgeColor: '#0D9488',
    isDark: true
  }
];

export default function PosterGenerator({
  winners,
  prizes,
  settings,
  logo,
}: PosterGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlayingSuccessAnim, setIsPlayingSuccessAnim] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // Orientation template state: 'portrait' (ឈរ) or 'landscape' (ដេក)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [bgPreset, setBgPreset] = useState<string>('luxury-gold');
  const [logoAccentColor, setLogoAccentColor] = useState<string>('#F97316'); // Smart detected accent
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // Logo calibration adjustments (ទំហំ, ទីតាំងលើក្រោម, ទាញឆ្វេងស្ដាំ)
  const [logoScale, setLogoScale] = useState<number>(1.0);
  const [logoOffsetX, setLogoOffsetX] = useState<number>(0);
  const [logoOffsetY, setLogoOffsetY] = useState<number>(0);
  const [logoUseOriginalShape, setLogoUseOriginalShape] = useState<boolean>(true);

  // Drag interaction states
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });

  // Caching HTMLImageElements to prevent constant async downloads and re-renders
  const cachedLogoImg = useRef<HTMLImageElement | null>(null);
  const cachedAvatars = useRef<Record<number, HTMLImageElement | null>>({ 1: null, 2: null, 3: null });
  const [imagesLoadedToggle, setImagesLoadedToggle] = useState<boolean>(false);

  // 1. CACHE LOGO IMAGE & DETECT ACCENT COLOR ONCE
  useEffect(() => {
    let isCurrent = true;
    if (logo) {
      preloadImage(logo)
        .then((img) => {
          if (isCurrent) {
            cachedLogoImg.current = img;
            const detected = getDominantColor(img);
            setLogoAccentColor(detected);
            setImagesLoadedToggle(prev => !prev);
          }
        })
        .catch((e) => {
          console.warn("Logo failed to load/cache", e);
          if (isCurrent) {
            cachedLogoImg.current = null;
            setLogoAccentColor('#F97316');
            setImagesLoadedToggle(prev => !prev);
          }
        });
    } else {
      cachedLogoImg.current = null;
      setLogoAccentColor('#F97316');
      setImagesLoadedToggle(prev => !prev);
    }
    return () => {
      isCurrent = false;
    };
  }, [logo]);

  // 2. CACHE WINNER AVATARS ONCE
  useEffect(() => {
    let isCurrent = true;
    const places = [1, 2, 3];
    
    // Clear cached avatars first
    cachedAvatars.current = { 1: null, 2: null, 3: null };

    const preloads = places.map(async (place) => {
      const winner = winners[place];
      if (winner?.avatar) {
        try {
          const img = await preloadImage(winner.avatar);
          if (isCurrent) {
            cachedAvatars.current[place] = img;
          }
        } catch (e) {
          console.warn(`Failed to cache avatar for place ${place}`, e);
        }
      }
    });

    Promise.all(preloads).then(() => {
      if (isCurrent) {
        setImagesLoadedToggle(prev => !prev);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [winners]);

  // Drag handlers on the preview wrapper
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!logo) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = { x: logoOffsetX, y: logoOffsetY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    const rect = e.currentTarget.getBoundingClientRect();
    const canvasWidth = orientation === 'portrait' ? 800 : 1000;
    const ratio = canvasWidth / rect.width;

    setLogoOffsetX(dragStartOffset.current.x + dx * ratio);
    setLogoOffsetY(dragStartOffset.current.y + dy * ratio);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!logo || e.touches.length === 0) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    dragStartOffset.current = { x: logoOffsetX, y: logoOffsetY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPos.current.x;
    const dy = touch.clientY - dragStartPos.current.y;

    const rect = e.currentTarget.getBoundingClientRect();
    const canvasWidth = orientation === 'portrait' ? 800 : 1000;
    const ratio = canvasWidth / rect.width;

    setLogoOffsetX(dragStartOffset.current.x + dx * ratio);
    setLogoOffsetY(dragStartOffset.current.y + dy * ratio);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!logo) return;
    const zoomIntensity = 0.05;
    
    // Zoom scale clamps safely
    setLogoScale(prev => {
      const dy = e.deltaY;
      let nextScale = prev - (dy > 0 ? 1 : -1) * zoomIntensity;
      nextScale = Math.max(0.2, Math.min(4.0, nextScale));
      return Math.round(nextScale * 100) / 100;
    });
  };

  // Re-generate poster preview state smoothly
  useEffect(() => {
    generatePosterCode();
  }, [
    winners, 
    prizes, 
    settings, 
    logo, 
    orientation, 
    logoAccentColor, 
    logoScale, 
    logoOffsetX, 
    logoOffsetY, 
    logoUseOriginalShape, 
    imagesLoadedToggle,
    bgPreset
  ]);

  const generatePosterCode = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    // Dynamic scale depending on the selected orientation template
    const width = orientation === 'portrait' ? 800 : 1000;
    const height = orientation === 'portrait' ? 1000 : 650;

    canvas.width = width;
    canvas.height = height;

    const logoImgEl = cachedLogoImg.current;
    const winnerAvatars = cachedAvatars.current;

    // Use smart theme accent
    const finalAccent = logoAccentColor;
    const secondaryAccent = '#94A3B8'; // Silver Slate
    const tertiaryAccent = '#D97706'; // Warm Bronze
    
    const isDark = bgPreset !== 'organic-waves' && bgPreset !== 'floral-watercolor';
    const textColor = isDark ? '#FFFFFF' : '#1E293B';
    const textSecColor = isDark ? '#94A3B8' : '#57534E';
    const cardBgColor = isDark ? '#161618' : '#FFFFFF';
    const accentTextColor = isDark ? '#FFFFFF' : finalAccent;
    
    // 2. DRAW SELECTED PROCEDURAL BACKGROUND PRESET
    if (bgPreset === 'luxury-gold') {
      // Preset A: Luxury Black Gold (Obsidian elegance plus flowing gold vectors)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0A0A0B');
      bgGrad.addColorStop(0.5, '#161618');
      bgGrad.addColorStop(1, '#020202');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Gold warm radial glow spotlight
      const glowCenterX = width / 2;
      const glowCenterY = orientation === 'portrait' ? 250 : 200;
      const spotlight = ctx.createRadialGradient(
        glowCenterX, glowCenterY, 30, 
        glowCenterX, glowCenterY, orientation === 'portrait' ? 520 : 450
      );
      spotlight.addColorStop(0, 'rgba(217, 119, 6, 0.22)'); 
      spotlight.addColorStop(0.5, 'rgba(180, 83, 9, 0.05)');
      spotlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotlight;
      ctx.beginPath();
      ctx.arc(glowCenterX, glowCenterY, orientation === 'portrait' ? 520 : 450, 0, Math.PI * 2);
      ctx.fill();

      // Flowing pure luxury sine wave curves
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.06)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 15) {
          const y = (orientation === 'portrait' ? 450 : 320) + Math.sin(x * 0.005 + i * 0.8) * 55 + i * 22;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Pure gold particles
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      for (let i = 0; i < 45; i++) {
        const px = (Math.sin(i * 3532.2) * 0.5 + 0.5) * width;
        const py = (Math.cos(i * 1234.5) * 0.5 + 0.5) * height;
        const radius = (Math.sin(i * 987.6) * 0.5 + 0.5) * 2.5 + 0.5;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (bgPreset === 'brand-neon') {
      // Preset B: Brand Neon Spotlight (Highly reactive to uploaded brand logo colors)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#030712'); 
      bgGrad.addColorStop(0.5, '#0B0F19');
      bgGrad.addColorStop(1, '#02040A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Radial spotlight utilizing brand accent color
      const glowCenterX = width / 2;
      const glowCenterY = orientation === 'portrait' ? 250 : 200;
      const spotlight = ctx.createRadialGradient(
        glowCenterX, glowCenterY, 20, 
        glowCenterX, glowCenterY, orientation === 'portrait' ? 500 : 430
      );
      spotlight.addColorStop(0, hexToRgba(finalAccent, 0.28)); 
      spotlight.addColorStop(0.5, hexToRgba(finalAccent, 0.05));
      spotlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotlight;
      ctx.beginPath();
      ctx.arc(glowCenterX, glowCenterY, orientation === 'portrait' ? 500 : 430, 0, Math.PI * 2);
      ctx.fill();

      // Cyber space grid structure
      ctx.strokeStyle = hexToRgba(finalAccent, 0.04);
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Neon active sparks matching brand accent
      ctx.fillStyle = hexToRgba(finalAccent, 0.40);
      for (let i = 0; i < 40; i++) {
        const px = (Math.sin(i * 4423.2) * 0.5 + 0.5) * width;
        const py = (Math.cos(i * 2132.5) * 0.5 + 0.5) * height;
        const radius = (Math.sin(i * 852.1) * 0.5 + 0.5) * 2 + 0.5;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (bgPreset === 'modern-geo') {
      // Preset C: Modern Geometric Cyber (Angled abstract polygon vectors, sci-fi)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0E0818'); 
      bgGrad.addColorStop(0.5, '#171126');
      bgGrad.addColorStop(1, '#050209');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Violet cyberpunk spotlights
      const glowCenterX = width / 2;
      const glowCenterY = orientation === 'portrait' ? 250 : 200;
      const spotlight = ctx.createRadialGradient(
        glowCenterX, glowCenterY, 30, 
        glowCenterX, glowCenterY, 480
      );
      spotlight.addColorStop(0, 'rgba(168, 85, 247, 0.24)'); 
      spotlight.addColorStop(0.5, 'rgba(139, 92, 246, 0.04)');
      spotlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotlight;
      ctx.beginPath();
      ctx.arc(glowCenterX, glowCenterY, 480, 0, Math.PI * 2);
      ctx.fill();

      // Overlapping translucent triangles
      ctx.fillStyle = 'rgba(168, 85, 247, 0.02)';
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.12)';
      ctx.lineWidth = 1;

      const polyCoords = [
        [50, 80, 200, 30, 150, 220],
        [width - 150, 100, width - 40, 20, width - 60, 250],
        [100, height - 100, 320, height - 50, 180, height - 250],
        [width - 250, height - 120, width - 50, height - 200, width - 80, height - 40]
      ];

      polyCoords.forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        ctx.lineTo(pts[2], pts[3]);
        ctx.lineTo(pts[4], pts[5]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // Micro digital dots
      ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
      for (let i = 0; i < 30; i++) {
        const px = (Math.sin(i * 1245.5) * 0.5 + 0.5) * width;
        const py = (Math.cos(i * 5432.1) * 0.5 + 0.5) * height;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (bgPreset === 'organic-waves') {
      // Preset D: Organic Scandinavian (Creamy light beige minimalist waves)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#FAF6F0'); 
      bgGrad.addColorStop(0.6, '#F3EAE0');
      bgGrad.addColorStop(1, '#EAE1D4');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Warm solar radial glow in upper right corner
      const sunGrad = ctx.createRadialGradient(width - 120, 120, 20, width - 120, 120, 320);
      sunGrad.addColorStop(0, 'rgba(255, 237, 213, 0.85)'); 
      sunGrad.addColorStop(0.5, 'rgba(254, 215, 170, 0.25)');
      sunGrad.addColorStop(1, 'rgba(254, 215, 170, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width - 120, 120, 320, 0, Math.PI * 2);
      ctx.fill();

      // Clay organic waves at the footer
      ctx.fillStyle = 'rgba(235, 226, 214, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, height - 50);
      ctx.quadraticCurveTo(width * 0.3, height - 160, width * 0.75, height - 70);
      ctx.quadraticCurveTo(width * 0.9, height - 40, width, height - 120);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(226, 213, 198, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.quadraticCurveTo(width * 0.4, height - 80, width * 0.8, height - 160);
      ctx.quadraticCurveTo(width * 0.95, height - 200, width, height - 180);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Decorative sand rings
      ctx.strokeStyle = 'rgba(180, 160, 140, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(100, 150, 180, 0, Math.PI * 0.82);
      ctx.stroke();

    } else if (bgPreset === 'floral-watercolor') {
      // Preset E: Soft Floral watercolor blush
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#FFF5F6'); 
      bgGrad.addColorStop(0.5, '#FEE2E2'); 
      bgGrad.addColorStop(1, '#E0F2FE'); 
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Watercolor bleeding blobs
      const watercolorCenters = [
        { x: 120, y: 150, r: 210, col: 'rgba(254, 205, 211, 0.42)' },
        { x: width - 150, y: height - 150, r: 280, col: 'rgba(186, 230, 253, 0.38)' },
        { x: width / 2 + 100, y: 180, r: 180, col: 'rgba(253, 244, 215, 0.45)' }
      ];
      watercolorCenters.forEach(b => {
        const radG = ctx.createRadialGradient(b.x, b.y, b.r * 0.1, b.x, b.y, b.r);
        radG.addColorStop(0, b.col);
        radG.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = radG;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stylized leaf illustration on background
      ctx.strokeStyle = 'rgba(236, 143, 161, 0.28)';
      ctx.lineWidth = 2;

      const drawLeafStem = (startX: number, startY: number, angle: number, len: number) => {
        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.quadraticCurveTo(20, -len/2, 10, -len);
        ctx.stroke();

        for (let j = 1; j <= 5; j++) {
          const ratio = j / 5;
          const leafY = -len * ratio;
          ctx.beginPath();
          ctx.ellipse(15, leafY, 8, 14, Math.PI/4, 0, Math.PI*2);
          ctx.stroke();
        }
        ctx.restore();
      };

      drawLeafStem(60, 220, Math.PI / 6, 120);
      drawLeafStem(width - 100, height - 120, -Math.PI / 4, 140);

    } else if (bgPreset === 'bokeh-glow') {
      // Preset F: Dreamy Aurora Bokeh (Deep green cyan night with ambient bokeh lamps)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#021F1A'); 
      bgGrad.addColorStop(0.5, '#0A1220'); 
      bgGrad.addColorStop(1, '#02050A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Glowing magical aurora flare
      const glowCenterX = width / 2;
      const spotlight = ctx.createRadialGradient(
        glowCenterX, 200, 40,
        glowCenterX, 200, orientation === 'portrait' ? 550 : 450
      );
      spotlight.addColorStop(0, 'rgba(20, 184, 166, 0.26)'); 
      spotlight.addColorStop(0.5, 'rgba(15, 118, 110, 0.05)');
      spotlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotlight;
      ctx.beginPath();
      ctx.arc(glowCenterX, 200, orientation === 'portrait' ? 550 : 450, 0, Math.PI * 2);
      ctx.fill();

      // Multi-sized overlapping blurry bokeh circles
      const bokehs = [
        { x: 120, y: 150, r: 65, col: 'rgba(20, 184, 166, 0.12)' },
        { x: width - 200, y: 220, r: 85, col: 'rgba(45, 212, 191, 0.09)' },
        { x: 180, y: height - 180, r: 70, col: 'rgba(56, 189, 248, 0.1)' },
        { x: width - 120, y: height - 140, r: 90, col: 'rgba(13, 148, 136, 0.13)' },
        { x: width / 2 - 100, y: height / 2 + 50, r: 50, col: 'rgba(34, 197, 94, 0.07)' }
      ];

      bokehs.forEach(b => {
        const bokehGrad = ctx.createRadialGradient(b.x, b.y, b.r * 0.2, b.x, b.y, b.r);
        bokehGrad.addColorStop(0, b.col);
        bokehGrad.addColorStop(0.8, b.col.substring(0, b.col.lastIndexOf(',')) + ', 0.02)');
        bokehGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = bokehGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Dreamy star background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let i = 0; i < 35; i++) {
        const px = (Math.sin(i * 3522.2) * 0.5 + 0.5) * width;
        const py = (Math.cos(i * 1234.5) * 0.5 + 0.5) * height;
        const radius = (Math.sin(i * 987.6) * 0.5 + 0.5) * 2 + 0.5;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. DRAW HEADER & LOGO (Drawn at the center)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    
    const headerTitleY = orientation === 'portrait' ? 122 : 100;
    const mainTitleY = orientation === 'portrait' ? 188 : 160;
    const subtitleY = orientation === 'portrait' ? 233 : 202;

    // Draw header logo centered above text with dynamic adjustments
    if (logoImgEl) {
      const origW = logoImgEl.width || 100;
      const origH = logoImgEl.height || 100;
      const aspect = origW / origH;

      const baseDiameter = orientation === 'portrait' ? 56 : 48;
      
      let drawW = baseDiameter;
      let drawH = baseDiameter;

      if (aspect > 1) {
        drawH = baseDiameter / aspect;
      } else {
        drawW = baseDiameter * aspect;
      }

      const finalW = drawW * logoScale;
      const finalH = drawH * logoScale;

      const baseLogoX = width / 2;
      const baseLogoY = orientation === 'portrait' ? 52 : 45;
      const finalX = baseLogoX + logoOffsetX;
      const finalY = baseLogoY + logoOffsetY;

      ctx.save();
      
      if (!logoUseOriginalShape) {
        // Draw standard clipped circle outline
        const clipRadius = Math.max(finalW, finalH) / 2;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(finalX, finalY, clipRadius + 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = finalAccent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(finalX, finalY, clipRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(finalX, finalY, clipRadius - 1.5, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.drawImage(logoImgEl, finalX - finalW / 2, finalY - finalH / 2, finalW, finalH);
      } else {
        // Draw natural shape with elegant brand glow backing card
        ctx.shadowBlur = 12;
        ctx.shadowColor = hexToRgba(finalAccent, 0.45);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(finalX - finalW / 2 - 4, finalY - finalH / 2 - 4, finalW + 8, finalH + 8, 8);
        ctx.fill();

        ctx.strokeStyle = finalAccent;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        ctx.drawImage(logoImgEl, finalX - finalW / 2, finalY - finalH / 2, finalW, finalH);
      }
      ctx.restore();
    }

    // Secondary Title
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Kantumruy Pro", "Inter", "Noto Sans Khmer", sans-serif';
    ctx.fillText('អបអរសាទរម្ចាស់រង្វាន់', width / 2, headerTitleY);

    // Giant Dynamic Brand Gradient Title 'GIVEAWAY WINNERS'
    ctx.shadowBlur = isDark ? 18 : 4;
    ctx.shadowColor = isDark ? hexToRgba(finalAccent, 0.5) : 'rgba(0, 0, 0, 0.15)';
    
    const titleGrad = ctx.createLinearGradient(0, mainTitleY - 45, 0, mainTitleY + 15);
    if (isDark) {
      titleGrad.addColorStop(0, '#FFFFFF'); // white gold start
      titleGrad.addColorStop(0.4, finalAccent); // Dynamic brand centerpiece
      titleGrad.addColorStop(1, '#FFF2CD'); // gold shine tint
    } else {
      titleGrad.addColorStop(0, '#1E293B'); // dark stone gray start
      titleGrad.addColorStop(0.5, finalAccent); // Brand centerpiece
      titleGrad.addColorStop(1, '#0F172A'); // deep slate finish
    }
    ctx.fillStyle = titleGrad;
    ctx.font = orientation === 'portrait' 
      ? '900 68px "Space Grotesk", "Kantumruy Pro", sans-serif'
      : '900 60px "Space Grotesk", "Kantumruy Pro", sans-serif';
    ctx.fillText('GIVEAWAY', width / 2, mainTitleY);

    // Small ribbon sub-header
    ctx.shadowBlur = isDark ? 4 : 0;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.fillStyle = accentTextColor;
    ctx.font = 'italic bold 28px "Kantumruy Pro", "Space Grotesk", sans-serif';
    ctx.fillText('🏆 WINNERS 🏆', width / 2, subtitleY);

    ctx.shadowBlur = 0; // Reset shadow

    // 5. DRAW THE 3 WINNERS TABLE
    const places: (1 | 2 | 3)[] = [1, 2, 3];

    if (orientation === 'portrait') {
      // VERTICAL (PORTRAIT) TEMPLATE - Classic gorgeous stacks
      const startY = 285;
      const rowHeight = 175;

      places.forEach((place, index) => {
        const winner = winners[place];
        const prize = prizes[place];
        const y = startY + index * rowHeight;

        let curAccent = finalAccent;
        let rankText = '1st PLACE GRAND';
        let medal = '🥇';
        let ringGradient = ctx.createLinearGradient(120, y, 680, y);

        if (place === 1) {
          curAccent = finalAccent;
          rankText = '1st PLACE GRAND';
          medal = '🥇';
          ringGradient.addColorStop(0, hexToRgba(finalAccent, 0.25)); // branded tint
          ringGradient.addColorStop(0.5, isDark ? '#1E1E22' : '#F8FAFC');
          ringGradient.addColorStop(1, cardBgColor);
        } else if (place === 2) {
          curAccent = secondaryAccent;
          rankText = '2nd PLACE';
          medal = '🥈';
          ringGradient.addColorStop(0, isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.08)'); // silver
          ringGradient.addColorStop(0.5, isDark ? '#1E1E22' : '#F8FAFC');
          ringGradient.addColorStop(1, cardBgColor);
        } else {
          curAccent = tertiaryAccent;
          rankText = '3rd PLACE';
          medal = '🥉';
          ringGradient.addColorStop(0, isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.08)'); // bronze
          ringGradient.addColorStop(0.5, isDark ? '#1E1E22' : '#F8FAFC');
          ringGradient.addColorStop(1, cardBgColor);
        }

        // Draw Row Card container
        ctx.fillStyle = cardBgColor;
        ctx.strokeStyle = curAccent + (isDark ? '30' : '55');
        ctx.lineWidth = 1.5;
        
        ctx.save();
        if (!isDark) {
          ctx.shadowColor = 'rgba(15, 23, 42, 0.05)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 4;
        }
        ctx.beginPath();
        ctx.roundRect(100, y, 600, 145, 16);
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.roundRect(100, y, 600, 145, 16);
        ctx.stroke();

        // Draw left side inner color gradient stripe
        ctx.fillStyle = ringGradient;
        ctx.beginPath();
        ctx.roundRect(101, y + 1, 350, 143, [16, 0, 0, 16]);
        ctx.fill();

        // Draw Medal Ring
        ctx.shadowBlur = isDark ? 8 : 2;
        ctx.shadowColor = curAccent;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(175, y + 72, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = curAccent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(175, y + 72, 38, 0, Math.PI * 2);
        ctx.stroke();

        // Medal Icon
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 36px "Kantumruy Pro", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(medal, 175, y + 70);

        // Name, Rank and Prize Text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Rank Badge Level
        ctx.fillStyle = curAccent;
        ctx.font = 'bold 15px "Space Grotesk", sans-serif';
        ctx.fillText(rankText, 245, y + 42);

        // Winner Name
        ctx.fillStyle = textColor;
        ctx.font = 'bold 26px "Kantumruy Pro", sans-serif';
        const nameStr = winner ? winner.name : 'រង់ចាំការបង្វិល';
        ctx.fillText(nameStr, 245, y + 74);

        // Prize Name
        ctx.fillStyle = textSecColor;
        ctx.font = '500 15px "Kantumruy Pro", sans-serif';
        ctx.fillText('រង្វាន់ឈ្នះ៖ ' + prize.title, 245, y + 107);

        // Draw Winner Custom Avatar on extreme right
        const avatarCX = 620;
        const avatarCY = y + 72;
        const avatarR = 43;

        ctx.fillStyle = isDark ? '#0A0A0B' : '#E2E8F0';
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = winner?.avatar ? curAccent : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(30, 41, 59, 0.1)');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
        ctx.stroke();

        if (winnerAvatars[place]) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarCX, avatarCY, avatarR - 1.5, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(
            winnerAvatars[place]!, 
            avatarCX - (avatarR - 1.5), 
            avatarCY - (avatarR - 1.5), 
            (avatarR - 1.5) * 2, 
            (avatarR - 1.5) * 2
          );
          ctx.restore();
        } else {
          ctx.font = 'bold 24px "Kantumruy Pro", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#555860';
          ctx.fillText('👤', avatarCX, avatarCY - 2);
        }
      });

    } else {
      // HORIZONTAL (LANDSCAPE) TEMPLATE - 3-column elegant layout
      const startY = 225;
      const cardWidth = 270;
      const xPositions = [80, 365, 650]; // Perfectly spaced: colX, gap 15
      
      places.forEach((place, index) => {
        const winner = winners[place];
        const prize = prizes[place];
        const x = xPositions[index];

        let curAccent = finalAccent;
        let rankText = '1st PLACE GRAND';
        let medal = '🥇';
        const cardGradient = ctx.createLinearGradient(x, startY + 1, x + cardWidth, startY + 80);

        if (place === 1) {
          curAccent = finalAccent;
          rankText = '1st PLACE GRAND';
          medal = '🥇';
          cardGradient.addColorStop(0, hexToRgba(finalAccent, 0.28));
          cardGradient.addColorStop(1, cardBgColor);
        } else if (place === 2) {
          curAccent = secondaryAccent;
          rankText = '2nd PLACE';
          medal = '🥈';
          cardGradient.addColorStop(0, isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.10)');
          cardGradient.addColorStop(1, cardBgColor);
        } else {
          curAccent = tertiaryAccent;
          rankText = '3rd PLACE';
          medal = '🥉';
          cardGradient.addColorStop(0, isDark ? 'rgba(217, 119, 6, 0.18)' : 'rgba(217, 119, 6, 0.10)');
          cardGradient.addColorStop(1, cardBgColor);
        }

        // Card Container Base
        ctx.fillStyle = cardBgColor;
        ctx.strokeStyle = curAccent + (isDark ? '30' : '55');
        ctx.lineWidth = 1.5;
        
        ctx.save();
        if (!isDark) {
          ctx.shadowColor = 'rgba(15, 23, 42, 0.05)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 4;
        }
        ctx.beginPath();
        ctx.roundRect(x, startY, cardWidth, 290, 16);
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.roundRect(x, startY, cardWidth, 290, 16);
        ctx.stroke();

        // Banner Header style strip inside top card
        ctx.fillStyle = cardGradient;
        ctx.beginPath();
        ctx.roundRect(x + 1, startY + 1, cardWidth - 2, 85, [16, 16, 0, 0]);
        ctx.fill();

        // 1. Large Circular Winner Avatar (centered inside header banner)
        const avatarCX = x + cardWidth / 2;
        const avatarCY = startY + 80;
        const avatarR = 45;

        ctx.fillStyle = isDark ? '#0A0A0B' : '#E2E8F0';
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = winner?.avatar ? curAccent : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(30, 41, 59, 0.12)');
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
        ctx.stroke();

        if (winnerAvatars[place]) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarCX, avatarCY, avatarR - 1.5, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(
            winnerAvatars[place]!, 
            avatarCX - (avatarR - 1.5), 
            avatarCY - (avatarR - 1.5), 
            (avatarR - 1.5) * 2, 
            (avatarR - 1.5) * 2
          );
          ctx.restore();
        } else {
          ctx.font = 'bold 26px "Kantumruy Pro", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#555860';
          ctx.fillText('👤', avatarCX, avatarCY - 2);
        }

        // 2. Elegant overlying Medal Badge Circle (overlapping the avatar)
        const badgeCX = avatarCX + 28;
        const badgeCY = avatarCY + 28;
        const badgeR = 17;

        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = curAccent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 15px "Kantumruy Pro", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(medal, badgeCX, badgeCY - 1);

        // 3. Typographic Information block (Below avatar)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Rank level designation tag
        ctx.fillStyle = curAccent;
        ctx.font = 'bold 13px "Space Grotesk", sans-serif';
        ctx.fillText(rankText, x + cardWidth / 2, startY + 155);

        // Winner Name
        ctx.fillStyle = textColor;
        ctx.font = 'bold 22px "Kantumruy Pro", sans-serif';
        const nameStr = winner ? winner.name : 'រង់ចាំការបង្វិល';
        ctx.fillText(nameStr, x + cardWidth / 2, startY + 192);

        // Prize Name
        ctx.fillStyle = textSecColor;
        ctx.font = '500 13px "Kantumruy Pro", sans-serif';
        ctx.fillText('រង្វាន់ឈ្នះ៖ ' + prize.title, x + cardWidth / 2, startY + 232);
      });
    }

    // 6. CONGRATULATIONS BOTTOM SECTION
    const bottomY = height - 120;
    
    // Bottom divider line using logo dynamic color
    ctx.strokeStyle = hexToRgba(finalAccent, 0.12);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 250, bottomY);
    ctx.lineTo(width / 2 + 250, bottomY);
    ctx.stroke();

    // Customizable Khmer congratulation message
    ctx.fillStyle = isDark ? '#e2e8f0' : '#334155'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = orientation === 'portrait' 
      ? '500 18px "Kantumruy Pro", "Inter", sans-serif'
      : '500 15px "Kantumruy Pro", "Inter", sans-serif';
    
    const finalCongrats = settings.congratulationsText.trim() !== ''
      ? settings.congratulationsText
      : 'អបអរសាទរអ្នកឈ្នះទាំងអស់គ្នា! ចែករំលែកសេចក្តីរីករាយ ជាមួយពួកយើងប្រកបដោយមោទនភាព។';

    ctx.fillText(finalCongrats, width / 2, bottomY + 45);

    // Branding signature footer
    ctx.fillStyle = '#475569'; 
    ctx.font = 'normal 11px "Space Grotesk", sans-serif';
    ctx.fillText('GENERATED BY KHMER LUCKY SPIN WHEEL PRO', width / 2, height - (orientation === 'portrait' ? 25 : 18));

    // Update state to render visually in the application screen
    try {
      setPreviewUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error("Canvas URL generation failure:", e);
    }

    setIsRendering(false);
  };

  const downloadPNG = () => {
    if (!previewUrl) return;
    setIsPlayingSuccessAnim(true);
    setTimeout(() => setIsPlayingSuccessAnim(false), 2000);

    const link = document.createElement('a');
    link.download = orientation === 'portrait' 
      ? 'giveaway-winners-portrait.png' 
      : 'giveaway-winners-landscape.png';
    link.href = previewUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    if (!previewUrl) return;
    setIsPlayingSuccessAnim(true);
    setTimeout(() => setIsPlayingSuccessAnim(false), 2000);

    const width = orientation === 'portrait' ? 800 : 1000;
    const height = orientation === 'portrait' ? 1000 : 650;

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'px',
      format: [width, height],
    });

    try {
      pdf.addImage(previewUrl, 'PNG', 0, 0, width, height);
      pdf.save(orientation === 'portrait' 
        ? 'giveaway-winners-poster-portrait.pdf' 
        : 'giveaway-winners-poster-landscape.pdf');
    } catch (err) {
      console.error('PDF Generation error:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH ADVANCED ORIENTATION SWITCH */}
      <div className="border-b border-white/5 pb-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <h2 className="text-lg font-bold font-sans text-white flex items-center gap-2">
          <span className="text-orange-500">📊</span>
          <span>ផ្ទាំងលទ្ធផលផ្សព្វផ្សាយ (Giveaway Poster)</span>
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Layout Switch Toggle Group (ហើយក្នុងត្រូវកំណត់បង្ហាញ សម្រាប់អ្នកឈ្នះជាទម្រង់ឈរនិងដេក) */}
          <div className="flex bg-[#121214] border border-white/5 p-1 rounded-xl select-none" id="orientation-toggle-group">
            <button
              onClick={() => setOrientation('portrait')}
              className={`py-1.5 px-3 rounded-lg text-[11px] font-sans font-medium transition duration-150 flex items-center gap-1.5 cursor-pointer
                ${orientation === 'portrait' 
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'}`}
              title="ទម្រង់ឈរ (Portrait Template)"
              id="btn-orientation-portrait"
            >
              <span>📱 ទម្រង់ឈរ (Portrait)</span>
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`py-1.5 px-3 rounded-lg text-[11px] font-sans font-medium transition duration-150 flex items-center gap-1.5 cursor-pointer
                ${orientation === 'landscape' 
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'}`}
              title="ទម្រង់ដេក (Landscape Template)"
              id="btn-orientation-landscape"
            >
              <span>🖥️ ទម្រង់ដេក (Landscape)</span>
            </button>
          </div>

          <button
            onClick={generatePosterCode}
            disabled={isRendering}
            className="flex items-center gap-1.5 bg-[#1E1E21] hover:bg-[#2A2A2E] text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-sans border border-white/5 transition duration-150 cursor-pointer disabled:opacity-50"
            title="បង្កើតឡើងវិញ"
            id="btn-re-render-poster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin' : ''}`} />
            <span>ផ្ទុកឡើងវិញ</span>
          </button>
        </div>
      </div>

      {/* Real canvas executing the pixel renders (hidden in UI) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main preview section */}
      <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start" id="poster-interactive-stage">
        
        {/* Left Side: Frame Simulation showing live canvas preview */}
        <div className="flex-shrink-0 w-full flex items-center justify-center lg:justify-start lg:w-auto">
          <div 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`relative w-full bg-[#0A0A0B] border border-white/5 rounded-2xl overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.8)] group transition-all duration-300 ease-out select-none
              ${orientation === 'portrait' ? 'max-w-[380px] aspect-[4/5]' : 'max-w-[520px] aspect-[10/6.5]'}
              ${logo ? 'cursor-move active:cursor-grabbing' : 'cursor-default'}`}
            style={{
              outline: `1px solid ${hexToRgba(logoAccentColor, 0.15)}`,
              boxShadow: `0 20px 45px rgba(0,0,0,0.8), 0 0 35px ${hexToRgba(logoAccentColor, 0.05)}`
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Winners giveaway poster template"
                className="w-full h-full object-cover select-none transition duration-300 group-hover:scale-[1.01]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 font-sans p-6 text-center">
                <ImageIcon className="w-12 h-12 mb-3 text-slate-700 animate-pulse" />
                <p className="text-sm">កំពុងបង្កើតផ្ទាំងរូបភាពលទ្ធផល...</p>
              </div>
            )}

            {/* Smart resolution and aspect-ratio metadata pills */}
            <div className="absolute top-3 right-3 bg-[#0a0a0b]/90 backdrop-blur border border-white/10 text-[9px] text-slate-400 font-mono py-1 px-2.5 rounded-full uppercase tracking-wider shadow pointer-events-none">
              {orientation === 'portrait' ? '📱 PORTRAIT • 800x1000' : '🖥️ LANDSCAPE • 1000x650'}
            </div>

            {/* Smart Brand Tone detection pill (ឆ្លាតវៃប្ដូរពណ៍ទៅតាមទម្រង់នៃពណ៍ logo) */}
            {logo && (
              <div className="absolute bottom-3 left-3 bg-[#0a0a0b]/90 backdrop-blur border border-white/10 text-[9px] text-slate-300 font-sans py-1 px-2.5 rounded-full flex items-center gap-1.5 shadow pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: logoAccentColor }} />
                <span>ពណ៍ម៉ាកយីហោ៖ <span className="font-mono text-[9px] uppercase font-bold text-white">{logoAccentColor}</span></span>
              </div>
            )}

            {/* Smart drag overlay help guide (pointer-events-none let mouse events pass down) */}
            {logo && (
              <div className="absolute inset-0 bg-black/65 opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                <div className="bg-[#0D0D0E]/95 border border-white/10 p-4 rounded-xl flex flex-col items-center max-w-[240px] shadow-2xl">
                  <Move className="w-6 h-6 text-orange-500 mb-2 animate-bounce" />
                  <span className="text-white text-xs font-sans font-bold">🖱️ អូស ដើម្បីផ្លាស់ទី Logo</span>
                  <span className="text-slate-400 text-[10px] font-sans mt-1 leading-relaxed">ឡូហ្គោនឹងរំកិលតាមទិសដៅម៉ៅ។ វិលកង់ម៉ៅ (Mouse Scroll) ដើម្បី Zoom ពង្រីក/បង្រួម។</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Exporter details, instructions and share buttons */}
        <div className="flex-grow w-full space-y-4">

          {/* BACKGROUND PRESET SELECTOR PANEL */}
          <div className="bg-[#161618] border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl animate-fade-in" id="background-presets-selector-panel">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Palette className="w-4 h-4 text-orange-500 animate-pulse" />
              <h3 className="text-white text-sm font-sans font-semibold">
                ជ្រើសរើសផ្ទៃខាងក្រោយរចនា (Select Poster Background Style)
              </h3>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              សូមជ្រើសរើសទម្រង់សិល្បៈ និងរូបភាពផ្ទៃខាងក្រោយដែលអ្នកពេញចិត្ត។ ប្រលងរៀបចំដោយម៉ាស៊ីនវិភាគពណ៌វៃឆ្លាត នឹងគូររូបភាពសោភណភាពដោយស្វ័យប្រវត្តិតាមជម្រើស៖
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {BACKGROUND_PRESETS.map((preset) => {
                const isActive = bgPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setBgPreset(preset.id)}
                    className={`text-left p-3 rounded-xl border transition-all duration-205 cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden group
                      ${isActive 
                        ? 'border-orange-500 bg-[#1E1E21] shadow-lg shadow-orange-500/10' 
                        : 'border-white/5 bg-[#111112] hover:border-white/10 hover:bg-[#1a1a1c]'}`}
                    id={`btn-preset-${preset.id}`}
                  >
                    {/* Visual representative backdrop gradient bulb */}
                    <div className={`absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-gradient-to-br ${preset.gradient} blur-[4px] opacity-65 group-hover:scale-125 transition-transform duration-300`} />
                    
                    <div className="space-y-1 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ 
                            backgroundColor: preset.id === 'brand-neon' ? logoAccentColor : preset.badgeColor,
                            boxShadow: `0 0 8px ${preset.id === 'brand-neon' ? logoAccentColor : preset.badgeColor}`
                          }} 
                        />
                        <span className="text-white text-xs font-sans font-bold">
                          {preset.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {preset.enName}
                      </span>
                    </div>

                    <p className="text-[10.5px] text-slate-400 font-sans line-clamp-2 leading-tight relative z-10">
                      {preset.desc}
                    </p>

                    {/* Checkmark when chosen */}
                    {isActive && (
                      <div className="absolute top-2.5 right-2.5 bg-orange-600 rounded-full p-0.5 text-white shadow shadow-orange-950/50">
                        <CheckCircle className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* LOGO CALIBRATION CONTROLS (Only visible when logo uploaded) */}
          {logo && (
            <div className="bg-[#161618] border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl" id="logo-calibration-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-500 animate-pulse" />
                  <h3 className="text-white text-sm font-sans font-semibold">
                    ការកំណត់តម្រឹម LOGO (Logo Calibration Panel)
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setLogoScale(1.0);
                    setLogoOffsetX(0);
                    setLogoOffsetY(0);
                    setLogoUseOriginalShape(true);
                  }}
                  className="text-[10px] text-slate-400 hover:text-orange-500 flex items-center gap-1 cursor-pointer hover:underline transition"
                  title="លុបការកំណត់ និងតម្រឹមឡើងវិញជាតម្លៃដើម"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset តម្លៃដើម</span>
                </button>
              </div>

              {/* Keep scale aspect / circle clip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#111112] p-3 rounded-xl border border-white/5 gap-2">
                <span className="text-xs text-slate-300 font-sans flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-orange-500" />
                  <span>ទម្រង់គែមរូបភាព Logo៖</span>
                </span>
                
                <div className="flex bg-[#1E1E21] p-0.5 rounded-lg border border-white/5 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setLogoUseOriginalShape(true)}
                    className={`px-3 py-1 rounded-md text-[10px] font-sans transition-all cursor-pointer ${logoUseOriginalShape ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'}`}
                  >
                    រក្សាទម្រង់ដើម (Aspect)
                  </button>
                  <button
                    onClick={() => setLogoUseOriginalShape(false)}
                    className={`px-3 py-1 rounded-md text-[10px] font-sans transition-all cursor-pointer ${!logoUseOriginalShape ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'}`}
                  >
                    កាត់ជារង្វង់មូល (Circular)
                  </button>
                </div>
              </div>

              {/* Adjust Scale Slider */}
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-sans text-slate-400">
                    <span>🔍 ទំហំ Logo (Zoom Scale)</span>
                    <span className="font-mono text-orange-450 font-bold">{Math.round(logoScale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setLogoScale(prev => Math.max(0.2, Math.round((prev - 0.1) * 10) / 10))}
                      className="w-7 h-7 bg-[#1E1E21] hover:bg-[#2A2A2E] text-white rounded-lg text-xs flex items-center justify-center cursor-pointer transition active:scale-90"
                    >-</button>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={logoScale}
                      onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                      className="flex-grow accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                    />
                    <button 
                      onClick={() => setLogoScale(prev => Math.min(3.0, Math.round((prev + 0.1) * 10) / 10))}
                      className="w-7 h-7 bg-[#1E1E21] hover:bg-[#2A2A2E] text-white rounded-lg text-xs flex items-center justify-center cursor-pointer transition active:scale-90"
                    >+</button>
                  </div>
                </div>

                {/* X and Y offsets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>↔️ ទីតាំង ឆ្វេង-ស្តាំ (X Offset)</span>
                      <span className="font-mono text-slate-300">{Math.round(logoOffsetX)}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        step="1"
                        value={logoOffsetX}
                        onChange={(e) => setLogoOffsetX(parseInt(e.target.value))}
                        className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                      />
                      <button 
                        onClick={() => setLogoOffsetX(0)}
                        className="text-[10px] text-slate-500 hover:text-white bg-[#1E1E21] hover:bg-[#2A2A2E] px-1.5 py-1 rounded cursor-pointer"
                      >Reset</button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>↕️ ទីតាំង លើ-ក្រោម (Y Offset)</span>
                      <span className="font-mono text-slate-300">{Math.round(logoOffsetY)}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-150"
                        max="250"
                        step="1"
                        value={logoOffsetY}
                        onChange={(e) => setLogoOffsetY(parseInt(e.target.value))}
                        className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                      />
                      <button 
                        onClick={() => setLogoOffsetY(0)}
                        className="text-[10px] text-slate-500 hover:text-white bg-[#1E1E21] hover:bg-[#2A2A2E] px-1.5 py-1 rounded cursor-pointer"
                      >Reset</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#161618] border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                Smart Export Hub
              </span>
              <h3 className="text-white text-base font-sans font-semibold mt-2.5">
                នាំចេញទិន្នន័យចែករំលែក (Export & Share Results)
              </h3>
            </div>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-sans">
              បន្ទាប់ពីរកឃើញអ្នកឈ្នះទាំង ៣ នាក់ និងបានកំណត់រង្វាន់រួចរាល់ លោកអ្នកអាចទាញយកផ្ទាំងរូបភាពលទ្ធផលខាងឆ្វេងនេះ ដើម្បីយកទៅបង្ហោះចែករំលែកបន្តនៅលើ <strong className="text-orange-450">Facebook, Telegram, Instagram</strong> បានយ៉ាងស្រស់ស្អាតបំផុត! ប្រព័ន្ធបច្ចេកវិទ្យាបាន <strong className="text-orange-450">ប្តូរពណ៌ដោយឆ្លាតវៃ</strong> ទៅតាមពណ៌របស់ Logo ក្រុមហ៊ុនរបស់លោកអ្នក។
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* BUTTON 1: Download PNG */}
              <button
                disabled={!previewUrl}
                onClick={downloadPNG}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-sans py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition duration-200 active:scale-95 cursor-pointer shadow-lg shadow-orange-950/20"
                id="btn-download-png"
              >
                <ImageIcon className="w-4 h-4" />
                <span>ទាញយករូបភាព (PNG)</span>
              </button>

              {/* BUTTON 2: Download PDF */}
              <button
                disabled={!previewUrl}
                onClick={downloadPDF}
                className="w-full bg-[#1E1E21] hover:bg-[#2A2A2E] border border-white/5 text-slate-100 font-sans py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition duration-200 active:scale-95 cursor-pointer"
                id="btn-download-pdf"
              >
                <FileDown className="w-4 h-4 text-orange-400" />
                <span>ទាញយកជាឯកសារ PDF</span>
              </button>
            </div>

            {isPlayingSuccessAnim && (
              <div className="text-center font-sans text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5 pt-0.5 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>ការទាញយកត្រូវបានចាប់ផ្តើមដោយជោគជ័យ!</span>
              </div>
            )}
          </div>

          {/* Quick tips table */}
          <div className="bg-[#161618]/50 border border-white/5 p-4 rounded-2xl">
            <h4 className="text-slate-300 text-xs font-sans font-bold mb-2 flex items-center gap-1.5">
              <span>💡</span>
              <span>ចំណាំបន្ថែមសម្រាប់ការរៀបចំ៖</span>
            </h4>
            <ul className="text-slate-400 text-[11px] sm:text-xs list-disc list-inside space-y-1.5 font-sans leading-relaxed">
              <li>ប្រព័ន្ធវិភាគ <strong className="text-orange-450 font-medium">Smart Palette Extraction</strong> នឹងជ្រើសរើសយកពណ៌ចម្បងនៃ Logo មកធ្វើការតុបតែងភ្លើង Spotlight, គ្រាប់ផ្កាយពន្លឺ, និងស៊ុមរង្វាន់លេខ ១ ដោយស្វ័យប្រវត្តិ។</li>
              <li>លោកអ្នកអាចផ្លាស់ប្តូរគ្រោងបង្ហាញ <strong className="text-orange-450 font-medium">ឈរ/ដេក</strong> តាមតម្រូវការទំហំរបស់បណ្តាញសង្គម ដើម្បីបង្កើនភាពទាក់ទាញនៃកម្មវិធីរបស់លោកអ្នក។</li>
              <li>ឈ្មោះអ្នកឈ្នះ និងប្រភេទទិន្នន័យរង្វាន់នឹងត្រូវបានស្រូបបញ្ចូលទៅក្នុងតារាងទម្រង់ផ្សព្វផ្សាយដោយស្វ័យប្រវត្តិតែម្តង។</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
