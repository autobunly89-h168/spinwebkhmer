/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Winner, Prize, AppSettings } from '../types';
import { jsPDF } from 'jspdf';
import { Download, FileDown, Image as ImageIcon, CheckCircle, RefreshCw, Move, RotateCcw, Sliders, Crop, Palette, Sparkles, Plus, Trash2, Bold, Type, Upload, ChevronRight, Layers, Bookmark, Trophy, Eye, EyeOff, PlusCircle, Check, Gift } from 'lucide-react';
import { LanguageCode, translations } from '../utils/translations';

interface PosterGeneratorProps {
  winners: Record<number, Winner | null>;
  prizes: Record<number, Prize>;
  settings: AppSettings;
  logo?: string;
  lang?: LanguageCode;
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
    id: 'football-turf',
    name: 'តារាងបាល់ទាត់ និងកីឡា',
    enName: 'Football Pitch Arena',
    desc: 'ផ្ទៃខាងក្រោយវាលស្មៅបៃតង គំនូសបន្ទាត់តារាងបាល់ទាត់ និងពន្លឺភ្លើងកីឡាប្រណីត',
    gradient: 'from-[#14532D] via-[#166534] to-[#052E16]',
    badgeColor: '#22C55E',
    isDark: true
  },
  {
    id: 'gaming-cyber',
    name: 'ណេអុងហ្គេមបាញ់គ្នា',
    enName: 'Pro Cyber E-Sports',
    desc: 'ក្តារហ្គេមបច្ចេកវិទ្យាណេអុងខៀវស្រងាត់ រួមជាមួយរ៉ាដាកម្រិតខ្ពស់ និងគ្រោង Cyber',
    gradient: 'from-[#020617] via-[#0F172A] to-[#040D21]',
    badgeColor: '#06B6D4',
    isDark: true
  },
  {
    id: 'casino-slots',
    name: 'កាស៊ីណូរ៉ូយ៉ាល់មាសក្រហម',
    enName: 'Casino Vegas Slots',
    desc: 'ពណ៌ក្រហមវល្លិ៍ប្រណីត បញ្ចូលពន្លឺចាំងផ្លេក ផ្កាភ្លើង និងការកំណត់សំណាង Vegas',
    gradient: 'from-[#7F1D1D] via-[#991B1B] to-[#450A0A]',
    badgeColor: '#EF4444',
    isDark: true
  },
  {
    id: 'entertainment-glow',
    name: 'ឆាកកំសាន្ត និងតន្ត្រីញាក់',
    enName: 'Vibrant Concert Lights',
    desc: 'ពន្លឺភ្លើងតាមឆាកមហោស្រព ពណ៌ស្វាយផ្កាឈូក រំញ័រតន្ត្រីកំសាន្តពេញទំហឹង',
    gradient: 'from-[#2E1065] via-[#3B0764] to-[#1E1B4B]',
    badgeColor: '#EC4899',
    isDark: true
  },
  {
    id: 'corporate-pro',
    name: 'ក្រុមហ៊ុន និងសមាគមអាជីវកម្ម',
    enName: 'Official Corporate Grid',
    desc: 'ពណ៌ខៀវក្រម៉ៅសោភណភាពស្អាតបាត ស័ក្តិសមសម្រាប់ក្រុមហ៊ុន ឬស្ថាប័នផ្លូវការ',
    gradient: 'from-[#0A1931] via-[#15305B] to-[#050C1A]',
    badgeColor: '#3B82F6',
    isDark: true
  },
  {
    id: 'retail-boutique',
    name: 'ហាងលក់ទំនិញ និងហាងកាហ្វេ',
    enName: 'Cozy Retail Store Amber',
    desc: 'ពណ៌លឿងទុំចាំងៗ កក់ក្តៅ បែបទាន់សម័យ សម្រាប់កាហ្វេដី ឬហាងអាជីវកម្មទំនើប',
    gradient: 'from-[#7C2D12] via-[#F97316] to-[#431407]',
    badgeColor: '#F59E0B',
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
  lang = 'km',
}: PosterGeneratorProps) {
  const t = translations[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlayingSuccessAnim, setIsPlayingSuccessAnim] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // Custom Text Customizations (Zoom sizes & Custom Content)
  const [headerText, setHeaderText] = useState<string>('');
  const [mainTitleText, setMainTitleText] = useState<string>('GIVEAWAY');
  const [subTitleText, setSubTitleText] = useState<string>('🏆 WINNERS 🏆');
  const [congratsText, setCongratsText] = useState<string>('');

  // Sizing scale / zoom factors
  const [headerScale, setHeaderScale] = useState<number>(1.0);
  const [mainTitleScale, setMainTitleScale] = useState<number>(1.0);
  const [subTitleScale, setSubTitleScale] = useState<number>(1.0);
  const [congratsScale, setCongratsScale] = useState<number>(1.0);

  // Custom Colors
  const [headerColor, setHeaderColor] = useState<string>('');
  const [isMainTitleGradient, setIsMainTitleGradient] = useState<boolean>(true);
  const [mainTitleColor1, setMainTitleColor1] = useState<string>('#FFFFFF');
  const [mainTitleColor2, setMainTitleColor2] = useState<string>('#FFF2CD');
  const [subTitleColor, setSubTitleColor] = useState<string>('');
  const [congratsColor, setCongratsColor] = useState<string>('');

  // Advanced Gradient Text Color mixing expansions
  const [isHeaderGradient, setIsHeaderGradient] = useState<boolean>(false);
  const [headerColor2, setHeaderColor2] = useState<string>('#94A3B8');
  const [isCongratsGradient, setIsCongratsGradient] = useState<boolean>(false);
  const [congratsColor2, setCongratsColor2] = useState<string>('#94A3B8');

  // Layer Visibility Toggles (ស្រទាប់ទាំងបង្អស់)
  const [showLayerLogo, setShowLayerLogo] = useState<boolean>(true);
  const [showLayerHeader, setShowLayerHeader] = useState<boolean>(true);
  const [showLayerMainTitle, setShowLayerMainTitle] = useState<boolean>(true);
  const [showLayerRibbon, setShowLayerRibbon] = useState<boolean>(true);
  const [showLayerWinners, setShowLayerWinners] = useState<boolean>(true);
  const [showLayerCongrats, setShowLayerCongrats] = useState<boolean>(true);

  // Offset states for drag and adjust
  const [headerOffsetX, setHeaderOffsetX] = useState<number>(0);
  const [headerOffsetY, setHeaderOffsetY] = useState<number>(0);
  const [mainTitleOffsetX, setMainTitleOffsetX] = useState<number>(0);
  const [mainTitleOffsetY, setMainTitleOffsetY] = useState<number>(0);
  const [subTitleOffsetX, setSubTitleOffsetX] = useState<number>(0);
  const [subTitleOffsetY, setSubTitleOffsetY] = useState<number>(0);
  const [winnersOffsetX, setWinnersOffsetX] = useState<number>(0);
  const [winnersOffsetY, setWinnersOffsetY] = useState<number>(0);
  const [congratsOffsetX, setCongratsOffsetX] = useState<number>(0);
  const [congratsOffsetY, setCongratsOffsetY] = useState<number>(0);

  // Which layer is selected as active for mouse/touch/arrow-key dragging ('logo', 'header', 'main-title', 'sub-title', 'winners', 'congrats')
  const [activeDraggableLayer, setActiveDraggableLayer] = useState<string>('logo');

  // Active highlighted expanded layer ID ('background', 'logo', 'header', 'main-title', 'ribbon', 'winners', 'congrats', 'extra')
  const [activeLayer, setActiveLayer] = useState<string>('main-title');

  // Extra custom texts adding state
  const [extraTexts, setExtraTexts] = useState<any[]>([]);

  // User-uploaded custom background state
  const [customBgImage, setCustomBgImage] = useState<string>('');
  const cachedCustomBgImg = useRef<HTMLImageElement | null>(null);
  
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

  // Prizes color and zoom (scale) customization
  const [prize1Scale, setPrize1Scale] = useState<number>(1.0);
  const [prize2Scale, setPrize2Scale] = useState<number>(1.0);
  const [prize3Scale, setPrize3Scale] = useState<number>(1.0);
  const [prize1Color, setPrize1Color] = useState<string>('');
  const [prize2Color, setPrize2Color] = useState<string>('');
  const [prize3Color, setPrize3Color] = useState<string>('');

  // Drag interaction states
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });

  // Caching HTMLImageElements to prevent constant async downloads and re-renders
  const cachedLogoImg = useRef<HTMLImageElement | null>(null);
  const cachedAvatars = useRef<Record<number, HTMLImageElement | null>>({ 1: null, 2: null, 3: null });
  const [imagesLoadedToggle, setImagesLoadedToggle] = useState<boolean>(false);

  // Synchronise default values whenever lang, t, or selected language changes
  useEffect(() => {
    setHeaderText(t.welcomeText);
    setMainTitleText(t.mainText);
    setSubTitleText(t.subText);
    setCongratsText(t.congratsText);
  }, [lang]);

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

  // 1.5 CACHE USER BACKGROUND IMAGE ONCE OCCURS
  useEffect(() => {
    let isCurrent = true;
    if (customBgImage) {
      preloadImage(customBgImage)
        .then((img) => {
          if (isCurrent) {
            cachedCustomBgImg.current = img;
            setImagesLoadedToggle(prev => !prev);
          }
         })
        .catch((e) => {
          console.warn("Custom background image failure cache load", e);
          if (isCurrent) {
            cachedCustomBgImg.current = null;
            setImagesLoadedToggle(prev => !prev);
          }
        });
    } else {
      cachedCustomBgImg.current = null;
      setImagesLoadedToggle(prev => !prev);
    }
    return () => {
      isCurrent = false;
    };
  }, [customBgImage]);

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
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    let currentX = 0;
    let currentY = 0;
    switch (activeDraggableLayer) {
      case 'logo':
        currentX = logoOffsetX;
        currentY = logoOffsetY;
        break;
      case 'header':
        currentX = headerOffsetX;
        currentY = headerOffsetY;
        break;
      case 'main-title':
        currentX = mainTitleOffsetX;
        currentY = mainTitleOffsetY;
        break;
      case 'sub-title':
        currentX = subTitleOffsetX;
        currentY = subTitleOffsetY;
        break;
      case 'winners':
        currentX = winnersOffsetX;
        currentY = winnersOffsetY;
        break;
      case 'congrats':
        currentX = congratsOffsetX;
        currentY = congratsOffsetY;
        break;
    }
    dragStartOffset.current = { x: currentX, y: currentY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    const rect = e.currentTarget.getBoundingClientRect();
    const canvasWidth = orientation === 'portrait' ? 800 : 1000;
    const ratio = canvasWidth / rect.width;

    const targetX = dragStartOffset.current.x + dx * ratio;
    const targetY = dragStartOffset.current.y + dy * ratio;

    switch (activeDraggableLayer) {
      case 'logo':
        setLogoOffsetX(targetX);
        setLogoOffsetY(targetY);
        break;
      case 'header':
        setHeaderOffsetX(targetX);
        setHeaderOffsetY(targetY);
        break;
      case 'main-title':
        setMainTitleOffsetX(targetX);
        setMainTitleOffsetY(targetY);
        break;
      case 'sub-title':
        setSubTitleOffsetX(targetX);
        setSubTitleOffsetY(targetY);
        break;
      case 'winners':
        setWinnersOffsetX(targetX);
        setWinnersOffsetY(targetY);
        break;
      case 'congrats':
        setCongratsOffsetX(targetX);
        setCongratsOffsetY(targetY);
        break;
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };

    let currentX = 0;
    let currentY = 0;
    switch (activeDraggableLayer) {
      case 'logo':
        currentX = logoOffsetX;
        currentY = logoOffsetY;
        break;
      case 'header':
        currentX = headerOffsetX;
        currentY = headerOffsetY;
        break;
      case 'main-title':
        currentX = mainTitleOffsetX;
        currentY = mainTitleOffsetY;
        break;
      case 'sub-title':
        currentX = subTitleOffsetX;
        currentY = subTitleOffsetY;
        break;
      case 'winners':
        currentX = winnersOffsetX;
        currentY = winnersOffsetY;
        break;
      case 'congrats':
        currentX = congratsOffsetX;
        currentY = congratsOffsetY;
        break;
    }
    dragStartOffset.current = { x: currentX, y: currentY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPos.current.x;
    const dy = touch.clientY - dragStartPos.current.y;

    const rect = e.currentTarget.getBoundingClientRect();
    const canvasWidth = orientation === 'portrait' ? 800 : 1000;
    const ratio = canvasWidth / rect.width;

    const targetX = dragStartOffset.current.x + dx * ratio;
    const targetY = dragStartOffset.current.y + dy * ratio;

    switch (activeDraggableLayer) {
      case 'logo':
        setLogoOffsetX(targetX);
        setLogoOffsetY(targetY);
        break;
      case 'header':
        setHeaderOffsetX(targetX);
        setHeaderOffsetY(targetY);
        break;
      case 'main-title':
        setMainTitleOffsetX(targetX);
        setMainTitleOffsetY(targetY);
        break;
      case 'sub-title':
        setSubTitleOffsetX(targetX);
        setSubTitleOffsetY(targetY);
        break;
      case 'winners':
        setWinnersOffsetX(targetX);
        setWinnersOffsetY(targetY);
        break;
      case 'congrats':
        setCongratsOffsetX(targetX);
        setCongratsOffsetY(targetY);
        break;
    }
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
    bgPreset,
    headerText,
    mainTitleText,
    subTitleText,
    congratsText,
    headerScale,
    mainTitleScale,
    subTitleScale,
    congratsScale,
    headerColor,
    isMainTitleGradient,
    mainTitleColor1,
    mainTitleColor2,
    subTitleColor,
    congratsColor,
    extraTexts,
    customBgImage,
    prize1Scale,
    prize2Scale,
    prize3Scale,
    prize1Color,
    prize2Color,
    prize3Color,
    showLayerLogo,
    showLayerHeader,
    showLayerMainTitle,
    showLayerRibbon,
    showLayerWinners,
    showLayerCongrats,
    headerOffsetX,
    headerOffsetY,
    mainTitleOffsetX,
    mainTitleOffsetY,
    subTitleOffsetX,
    subTitleOffsetY,
    winnersOffsetX,
    winnersOffsetY,
    congratsOffsetX,
    congratsOffsetY
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
    } else if (bgPreset === 'football-turf') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#14532D'); 
      bgGrad.addColorStop(0.5, '#166534'); 
      bgGrad.addColorStop(1, '#052E16'); 
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 120, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(width / 2 - 180, 0, 360, 100, [0, 0, 40, 40]);
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(width / 2 - 180, height - 100, 360, 100, [40, 40, 0, 0]);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 180, 0);
        ctx.lineTo(i * 180 + 250, height);
        ctx.lineTo(i * 180 - 250, height);
        ctx.closePath();
        ctx.fill();
      }
    } else if (bgPreset === 'gaming-cyber') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#020617'); 
      bgGrad.addColorStop(0.5, '#0F172A'); 
      bgGrad.addColorStop(1, '#040D21'); 
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)'; 
      ctx.lineWidth = 1;
      const step = 45;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)'; 
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 200, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 100, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width / 2 - 250, height / 2);
      ctx.lineTo(width / 2 + 250, height / 2);
      ctx.moveTo(width / 2, height / 2 - 250);
      ctx.lineTo(width / 2, height / 2 + 250);
      ctx.stroke();
    } else if (bgPreset === 'casino-slots') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#7F1D1D'); 
      bgGrad.addColorStop(0.5, '#991B1B'); 
      bgGrad.addColorStop(1, '#450A0A'); 
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(234, 179, 8, 0.04)';
      ctx.lineWidth = 15;
      for (let i = 0; i < 36; i++) {
        const angle = (i * Math.PI) / 18;
        ctx.beginPath();
        ctx.moveTo(width / 2, height / 2);
        ctx.lineTo(width / 2 + Math.cos(angle) * width * 1.5, height / 2 + Math.sin(angle) * height * 1.5);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(30 + i * (width / 20), 30, 4, 0, Math.PI * 2);
        ctx.arc(30 + i * (width / 20), height - 30, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (bgPreset === 'entertainment-glow') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#2E1065'); 
      bgGrad.addColorStop(0.5, '#3B0764'); 
      bgGrad.addColorStop(1, '#1E1B4B'); 
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(236, 72, 153, 0.06)'; 
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.7, height);
      ctx.lineTo(width * 0.3, height);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(168, 85, 247, 0.06)'; 
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width * 0.8, height);
      ctx.lineTo(width * 0.4, height);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(236, 72, 153, 0.1)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 35) {
        const barH = 40 + Math.sin(x * 0.06) * 25;
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - barH);
      }
      ctx.stroke();
    } else if (bgPreset === 'corporate-pro') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0A1931'); 
      bgGrad.addColorStop(0.5, '#15305B'); 
      bgGrad.addColorStop(1, '#050C1A'); 
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(200, 50);
      ctx.moveTo(width - 50, height - 50);
      ctx.lineTo(width - 200, height - 50);
      ctx.stroke();
    } else if (bgPreset === 'retail-boutique') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#7C2D12'); 
      bgGrad.addColorStop(0.6, '#F97316'); 
      bgGrad.addColorStop(1, '#431407'); 
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(width / 3, -50, 150, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc((width / 3) * 2, -50, 150, 0, Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#FBBF24';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#FBBF24';
      const bulbXs = [width / 6, width / 3, width / 2, (width * 2) / 3, (width * 5) / 6];
      bulbXs.forEach(bx => {
        ctx.beginPath();
        ctx.arc(bx, 35, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    } else if (bgPreset === 'custom-upload' && cachedCustomBgImg.current) {
      const bgImg = cachedCustomBgImg.current;
      const imgRatio = bgImg.width / bgImg.height;
      const canvasRatio = width / height;
      let drawW, drawH, drawX, drawY;
      
      if (imgRatio > canvasRatio) {
        drawH = height;
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = width;
        drawH = width / imgRatio;
        drawX = 0;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
    }

  // 4. DRAW HEADER & LOGO (Drawn at the center)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    
    const headerTitleY = orientation === 'portrait' ? 122 : 100;
    const mainTitleY = orientation === 'portrait' ? 188 : 160;
    const subtitleY = orientation === 'portrait' ? 233 : 202;

    // Draw header logo centered above text with dynamic adjustments
    if (logoImgEl && showLayerLogo) {
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
    if (showLayerHeader) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.round(22 * headerScale)}px "Kantumruy Pro", "Inter", sans-serif`;
      
      const headerX = width / 2 + headerOffsetX;
      const headerY = headerTitleY + headerOffsetY;

      if (isHeaderGradient) {
        const headerGrad = ctx.createLinearGradient(headerX, headerY - 15, headerX, headerY + 10);
        headerGrad.addColorStop(0, headerColor || '#FFFFFF');
        headerGrad.addColorStop(1, headerColor2 || '#94A3B8');
        ctx.fillStyle = headerGrad;
      } else {
        ctx.fillStyle = headerColor || textColor;
      }
      ctx.fillText(headerText || (lang === 'km' ? 'អបអរសាទរម្ចាស់រង្វាន់' : 'Congratulations Winners!'), headerX, headerY);
      ctx.restore();
    }

    // Giant Dynamic Brand Gradient Title 'GIVEAWAY WINNERS'
    if (showLayerMainTitle) {
      ctx.save();
      ctx.shadowBlur = isDark ? 18 : 4;
      ctx.shadowColor = isDark ? hexToRgba(finalAccent, 0.5) : 'rgba(0, 0, 0, 0.15)';
      
      const titleX = width / 2 + mainTitleOffsetX;
      const titleY = mainTitleY + mainTitleOffsetY;

      // Gradient mixer colors
      if (isMainTitleGradient) {
        const titleGrad = ctx.createLinearGradient(titleX, titleY - 45, titleX, titleY + 15);
        titleGrad.addColorStop(0, mainTitleColor1); 
        titleGrad.addColorStop(1, mainTitleColor2); 
        ctx.fillStyle = titleGrad;
      } else {
        ctx.fillStyle = mainTitleColor1;
      }

      const baseTitleSize = orientation === 'portrait' ? 68 : 60;
      ctx.font = `900 ${Math.round(baseTitleSize * mainTitleScale)}px "Space Grotesk", "Kantumruy Pro", sans-serif`;
      ctx.fillText(mainTitleText || 'GIVEAWAY', titleX, titleY);
      ctx.restore();
    }

    // Small ribbon sub-header
    if (showLayerRibbon) {
      ctx.save();
      ctx.shadowBlur = isDark ? 4 : 0;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.fillStyle = subTitleColor || accentTextColor;
      ctx.font = `italic bold ${Math.round(28 * subTitleScale)}px "Kantumruy Pro", "Space Grotesk", sans-serif`;
      
      const subX = width / 2 + subTitleOffsetX;
      const subY = subtitleY + subTitleOffsetY;
      ctx.fillText(subTitleText || '🏆 WINNERS 🏆', subX, subY);
      ctx.restore();
    }

    ctx.shadowBlur = 0; // Reset shadow

    // 5. DRAW THE 3 WINNERS TABLE
    const places: (1 | 2 | 3)[] = [1, 2, 3];

    if (showLayerWinners) {
      if (orientation === 'portrait') {
        // VERTICAL (PORTRAIT) TEMPLATE - Classic gorgeous stacks
        const startY = 285 + winnersOffsetY;
        const rowHeight = 175;

        places.forEach((place, index) => {
          const winner = winners[place];
          const prize = prizes[place];
          const y = startY + index * rowHeight;
          const cardX = 100 + winnersOffsetX;

          let curAccent = finalAccent;
          let rankText = '1st PLACE GRAND';
          let medal = '🥇';
          let ringGradient = ctx.createLinearGradient(cardX + 20, y, cardX + 580, y);

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
          ctx.roundRect(cardX, y, 600, 145, 16);
          ctx.fill();
          ctx.restore();

          ctx.beginPath();
          ctx.roundRect(cardX, y, 600, 145, 16);
          ctx.stroke();

          // Draw left side inner color gradient stripe
          ctx.fillStyle = ringGradient;
          ctx.beginPath();
          ctx.roundRect(cardX + 1, y + 1, 350, 143, [16, 0, 0, 16]);
          ctx.fill();

          // Draw Medal Ring
          ctx.shadowBlur = isDark ? 8 : 2;
          ctx.shadowColor = curAccent;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cardX + 75, y + 72, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = curAccent;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cardX + 75, y + 72, 38, 0, Math.PI * 2);
          ctx.stroke();

          // Medal Icon
          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 36px "Kantumruy Pro", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(medal, cardX + 75, y + 70);

          // Name, Rank and Prize Text
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          // Rank Badge Level
          ctx.fillStyle = curAccent;
          ctx.font = 'bold 15px "Space Grotesk", sans-serif';
          ctx.fillText(rankText, cardX + 145, y + 42);

          // Winner Name
          ctx.fillStyle = textColor;
          ctx.font = 'bold 26px "Kantumruy Pro", sans-serif';
          const nameStr = winner ? winner.name : 'រង់ចាំការបង្វិល';
          ctx.fillText(nameStr, cardX + 145, y + 74);

          // Prize Name
          ctx.save();
          const activePrizeColor = place === 1 ? (prize1Color || textSecColor) : place === 2 ? (prize2Color || textSecColor) : (prize3Color || textSecColor);
          const activePrizeScale = place === 1 ? prize1Scale : place === 2 ? prize2Scale : prize3Scale;
          ctx.fillStyle = activePrizeColor;
          ctx.font = `500 ${Math.round(15 * activePrizeScale)}px "Kantumruy Pro", sans-serif`;
          ctx.fillText('រង្វាន់ឈ្នះ៖ ' + prize.title, cardX + 145, y + 107);
          ctx.restore();

          // Draw Winner Custom Avatar on extreme right
          const avatarCX = cardX + 520;
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
        const startY = 225 + winnersOffsetY;
        const cardWidth = 270;
        const xPositions = [80, 365, 650]; // Perfectly spaced: colX, gap 15
        
        places.forEach((place, index) => {
          const winner = winners[place];
          const prize = prizes[place];
          const x = xPositions[index] + winnersOffsetX;

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
          ctx.save();
          const activePrizeColor = place === 1 ? (prize1Color || textSecColor) : place === 2 ? (prize2Color || textSecColor) : (prize3Color || textSecColor);
          const activePrizeScale = place === 1 ? prize1Scale : place === 2 ? prize2Scale : prize3Scale;
          ctx.fillStyle = activePrizeColor;
          ctx.font = `500 ${Math.round(13 * activePrizeScale)}px "Kantumruy Pro", sans-serif`;
          ctx.fillText('រង្វាន់ឈ្នះ៖ ' + prize.title, x + cardWidth / 2, startY + 232);
          ctx.restore();
        });
      }
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
    if (showLayerCongrats) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const baseCongratsSize = orientation === 'portrait' ? 18 : 15;
      ctx.font = `500 ${Math.round(baseCongratsSize * congratsScale)}px "Kantumruy Pro", "Inter", sans-serif`;
      
      const finalCongrats = congratsText || settings.congratulationsText || 'អបអរសាទរអ្នកឈ្នះទាំងអស់គ្នា! ចែករំលែកសេចក្តីរីករាយ ជាមួយពួកយើងប្រកបដោយមោទនភាព។';

      const congratsX = width / 2 + congratsOffsetX;
      const congratsY = bottomY + 45 + congratsOffsetY;

      if (isCongratsGradient) {
        const congratsGrad = ctx.createLinearGradient(congratsX, congratsY - 20, congratsX, congratsY + 20);
        congratsGrad.addColorStop(0, congratsColor || '#FFFFFF');
        congratsGrad.addColorStop(1, congratsColor2 || '#94A3B8');
        ctx.fillStyle = congratsGrad;
      } else {
        ctx.fillStyle = congratsColor || (isDark ? '#e2e8f0' : '#334155'); 
      }
      ctx.fillText(finalCongrats, congratsX, congratsY);
      ctx.restore();
    }

    // Draw multiple customizable extra texts on top
    extraTexts.forEach((layer) => {
      ctx.fillStyle = layer.color || '#FFFFFF';
      ctx.textAlign = 'center';
      
      const layerSize = layer.size || 20;
      ctx.font = `${layer.bold ? 'bold' : 'normal'} ${layerSize}px "Kantumruy Pro", "Space Grotesk", sans-serif`;
      
      if (layer.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 6;
      }
      ctx.fillText(layer.text, (layer.x / 100) * width, (layer.y / 100) * height);
      ctx.shadowBlur = 0; // reset
    });

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

          {/* PLAYGROUND STYLE INTERACTIVE LAYERS MANAGER PANEL */}
          <div className="bg-[#161618] border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl" id="poster-interactive-layers-manager">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Layers className="w-4 h-4 text-orange-500 animate-pulse" />
              <h3 className="text-white text-sm font-sans font-semibold">
                {lang === 'km' ? 'ស្រទាប់រចនាកែសម្រួលផ្ទាំងគំនូរ (Poster Design Layers Mode)' : 'Poster Interactive Design Layers'}
              </h3>
            </div>
            
            <p className="text-slate-400 text-xs leading-relaxed font-sans mb-3">
              {lang === 'km' 
                ? 'កែប្រែពណ៌ មាត្រដ្ឋាន ទំហំអក្សរ និងការលាយពណ៌ដោយសេរីតាមស្រទាប់នីមួយៗ (Figma & photoshop Layers Accordion Control)៖' 
                : 'Control rendering colors, sizes, content, visibility and advanced mixing gradients step-by-step for each layer component:'}
            </p>

            <div className="space-y-3">
              
              {/* LAYER 1: BACKGROUND STYLE */}
              <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${activeLayer === 'background' ? 'border-orange-500/55 bg-[#111112]' : 'border-white/5 bg-[#121213]'}`}>
                <div 
                  onClick={() => setActiveLayer(activeLayer === 'background' ? '' : 'background')}
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/[0.02] select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <Palette className={`w-4 h-4 ${activeLayer === 'background' ? 'text-orange-500' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <span className="text-xs font-sans font-bold text-slate-200 block">
                        {lang === 'km' ? 'ស្រទាប់ផ្ទៃខាងក្រោយ (Background Style)' : '1. Background Style Layer'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans block">
                        {lang === 'km' ? 'ផ្ទៃខាងក្រោយប្រភេទកីឡា បាល់ទាត់ កម្សាន្ត ហ្គេម តែងនិពន្ធ' : 'Choose preloaded sport templates or upload custom backdrop'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${activeLayer === 'background' ? 'rotate-90 text-orange-500' : ''}`} />
                </div>

                {activeLayer === 'background' && (
                  <div className="p-4 border-t border-white/5 bg-[#0e0e10]/95 space-y-4 animate-fade-in text-xs">
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {lang === 'km' ? 'សូមជ្រើសរើសទម្រង់សិល្បៈ និងរូបភាពផ្ទៃខាងក្រោយដែលអ្នកពេញចិត្ត៖' : 'Choose professional sports/victory backdrops matching your company preset style:'}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {BACKGROUND_PRESETS.map((preset) => {
                        const isActive = bgPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => setBgPreset(preset.id)}
                            className={`text-left p-2.5 rounded-xl border transition-all duration-205 cursor-pointer flex flex-col justify-between h-24 relative overflow-hidden group
                              ${isActive 
                                ? 'border-orange-500 bg-[#1e1e21] shadow-lg shadow-orange-500/10' 
                                : 'border-white/5 bg-[#131315] hover:border-white/10 hover:bg-[#19191b]'}`}
                          >
                            <div className={`absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-gradient-to-br ${preset.gradient} blur-[4px] opacity-60 group-hover:scale-125 transition-transform duration-350`} />
                            
                            <div className="space-y-0.5 relative z-14">
                              <div className="flex items-center gap-1.5">
                                <span 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ 
                                    backgroundColor: preset.id === 'brand-neon' ? logoAccentColor : preset.badgeColor,
                                    boxShadow: `0 0 6px ${preset.id === 'brand-neon' ? logoAccentColor : preset.badgeColor}`
                                  }} 
                                />
                                <span className="text-white text-[11px] font-sans font-bold">
                                  {preset.name}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono block">
                                {preset.enName}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-400 font-sans line-clamp-1 leading-tight relative z-10">
                              {preset.desc}
                            </p>

                            {isActive && (
                              <div className="absolute top-2 right-2 bg-orange-600 rounded-full p-0.5 text-white">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-white/5 pt-3.5 mt-2">
                      <label className="block text-xs text-slate-355 font-sans font-bold mb-2 flex items-center gap-1.5 animate-pulse">
                        <span>📁</span>
                        <span>{lang === 'km' ? 'ឬផ្ទុកឡើងផ្ទៃខាងក្រោយផ្ទាល់ខ្លួន (Upload Backdrop)៖' : 'Or upload custom background backdrop image:'}</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          id="custom-backdrop-uploader"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setCustomBgImage(event.target.result as string);
                                  setBgPreset('custom-upload');
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />

                        <button
                          onClick={() => document.getElementById('custom-backdrop-uploader')?.click()}
                          className="bg-[#1E1E21] hover:bg-[#2A2A2E] text-slate-200 border border-white/5 hover:border-orange-500 rounded-xl px-3.5 py-2 text-xs font-sans font-medium flex items-center gap-2 transition duration-200 active:scale-95 cursor-pointer shadow-md"
                        >
                          <Upload className="w-3.5 h-3.5 text-orange-400" />
                          <span>{lang === 'km' ? 'ជ្រើសរើសរូបថតផ្ទៃក្រោយ' : 'Choose image'}</span>
                        </button>

                        {customBgImage && (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <button
                              onClick={() => {
                                setBgPreset('luxury-gold');
                                setCustomBgImage('');
                              }}
                              className="text-xs font-sans text-rose-455 hover:text-rose-400 bg-rose-950/10 hover:bg-rose-950/30 border border-rose-950/20 px-2.5 py-2 rounded-xl transition cursor-pointer"
                            >
                              {lang === 'km' ? 'លុបចេញ' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* LOGO CALIBRATION CONTROLS REMOVED - INTEGRATED INTO THE PHOTOSHOP LAYER EDITOR */}

          {/* UNIFIED PHOTOSHOP-STYLE LAYER PROPERTIES EDITOR */}
          <div className="bg-[#161618] border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl" id="unified-photoshop-layer-editor">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500 animate-pulse" />
                <h3 className="text-white text-sm font-sans font-semibold">
                  {lang === 'km' ? 'ផ្ទាំងគ្រប់គ្រងស្រទាប់ប្លង់ឌីហ្សាញ (Photoshop Layer Properties)' : 'Photoshop-Style Layer Properties'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setHeaderOffsetX(0); setHeaderOffsetY(0);
                  setMainTitleOffsetX(0); setMainTitleOffsetY(0);
                  setSubTitleOffsetX(0); setSubTitleOffsetY(0);
                  setWinnersOffsetX(0); setWinnersOffsetY(0);
                  setCongratsOffsetX(0); setCongratsOffsetY(0);
                  setLogoOffsetX(0); setLogoOffsetY(0);
                }}
                className="text-[10px] text-slate-400 hover:text-orange-500 flex items-center gap-1 cursor-pointer transition hover:underline font-sans"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset ទីតាំងទាំងអស់ (Reset Offsets)</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              {lang === 'km' 
                ? 'មុខងារគ្រប់គ្រងទីតាំង សរសេរអក្សរ ប្តូរពណ៌ និងទំហំបង្រួមពង្រីក ត្រូវបានកំណត់រួមគ្នាតែមួយ (Photoshop Palette)។ ចុចលើស្រទាប់ឌីហ្សាញណាមួយខាងក្រោម ដើម្បីកកែប្រែដោយសេរី៖' 
                : 'Unified editor for text values, custom colors, sizing (zoom), and 4-way drag nudging. Selecting any layer opens its corresponding toolset instantly:'}
            </p>

            {/* List of Layers, Styled beautifully like layers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#0E0E10] p-2 rounded-xl border border-white/5">
              
              {/* Logo Layer */}
              <div 
                onClick={() => setActiveDraggableLayer('logo')}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                  activeDraggableLayer === 'logo' 
                    ? 'bg-orange-500/10 border-orange-500/50 text-white font-bold shadow-md shadow-orange-500/5' 
                    : 'bg-[#141416] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-xs shrink-0">{logo ? '🏷️' : '⚠️'}</span>
                  <div className="text-[11px] font-sans truncate pr-1">
                    <span className="block font-medium">{lang === 'km' ? 'ឡូហ្គោម៉ាក' : 'Brand Logo'}</span>
                    <span className="text-[9px] text-slate-500 font-mono">X: {Math.round(logoOffsetX)}px, Y: {Math.round(logoOffsetY)}px</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLayerLogo(!showLayerLogo);
                  }}
                  className={`p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition ${!showLayerLogo ? 'opacity-40' : ''}`}
                >
                  {showLayerLogo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Secondary Header Layer */}
              <div 
                onClick={() => setActiveDraggableLayer('header')}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                  activeDraggableLayer === 'header' 
                    ? 'bg-orange-500/10 border-orange-500/50 text-white font-bold shadow-md shadow-orange-500/5' 
                    : 'bg-[#141416] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-xs shrink-0">✍️</span>
                  <div className="text-[11px] font-sans truncate pr-1">
                    <span className="block font-medium">{lang === 'km' ? 'អក្សរលើក្បាល' : 'Header Greeting'}</span>
                    <span className="text-[9px] text-slate-500 font-mono">X: {Math.round(headerOffsetX)}px, Y: {Math.round(headerOffsetY)}px</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLayerHeader(!showLayerHeader);
                  }}
                  className={`p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition ${!showLayerHeader ? 'opacity-40' : ''}`}
                >
                  {showLayerHeader ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Main Title Layer */}
              <div 
                onClick={() => setActiveDraggableLayer('main-title')}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                  activeDraggableLayer === 'main-title' 
                    ? 'bg-orange-500/10 border-orange-500/50 text-white font-bold shadow-md shadow-orange-500/5' 
                    : 'bg-[#141416] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-xs shrink-0">🔠</span>
                  <div className="text-[11px] font-sans truncate pr-1">
                    <span className="block font-medium">{lang === 'km' ? 'ចំណងជើងធំ' : 'Main Headline'}</span>
                    <span className="text-[9px] text-slate-500 font-mono">X: {Math.round(mainTitleOffsetX)}px, Y: {Math.round(mainTitleOffsetY)}px</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLayerMainTitle(!showLayerMainTitle);
                  }}
                  className={`p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition ${!showLayerMainTitle ? 'opacity-40' : ''}`}
                >
                  {showLayerMainTitle ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Subtitle Ribbon */}
              <div 
                onClick={() => setActiveDraggableLayer('sub-title')}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                  activeDraggableLayer === 'sub-title' 
                    ? 'bg-orange-500/10 border-orange-500/50 text-white font-bold shadow-md shadow-orange-500/5' 
                    : 'bg-[#141416] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-xs shrink-0">🎗️</span>
                  <div className="text-[11px] font-sans truncate pr-1">
                    <span className="block font-medium">{lang === 'km' ? 'បូរចំណងជើងរង' : 'Ribbon Banner'}</span>
                    <span className="text-[9px] text-slate-500 font-mono">X: {Math.round(subTitleOffsetX)}px, Y: {Math.round(subTitleOffsetY)}px</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLayerRibbon(!showLayerRibbon);
                  }}
                  className={`p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition ${!showLayerRibbon ? 'opacity-40' : ''}`}
                >
                  {showLayerRibbon ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Winners Row Cards */}
              <div 
                onClick={() => setActiveDraggableLayer('winners')}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                  activeDraggableLayer === 'winners' 
                    ? 'bg-orange-500/10 border-orange-500/50 text-white font-bold shadow-md shadow-orange-500/5' 
                    : 'bg-[#141416] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-xs shrink-0">🏆</span>
                  <div className="text-[11px] font-sans truncate pr-1">
                    <span className="block font-medium">{lang === 'km' ? 'កាតម្ចាស់រង្វាន់' : 'Winners Cards Grid'}</span>
                    <span className="text-[9px] text-slate-500 font-mono">X: {Math.round(winnersOffsetX)}px, Y: {Math.round(winnersOffsetY)}px</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLayerWinners(!showLayerWinners);
                  }}
                  className={`p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition ${!showLayerWinners ? 'opacity-40' : ''}`}
                >
                  {showLayerWinners ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Bottom Congrats text */}
              <div 
                onClick={() => setActiveDraggableLayer('congrats')}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                  activeDraggableLayer === 'congrats' 
                    ? 'bg-orange-500/10 border-orange-500/50 text-white font-bold shadow-md shadow-orange-500/5' 
                    : 'bg-[#141416] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-xs shrink-0">💬</span>
                  <div className="text-[11px] font-sans truncate pr-1">
                    <span className="block font-medium">{lang === 'km' ? 'សារខាងក្រោម' : 'Wishes Message'}</span>
                    <span className="text-[9px] text-slate-500 font-mono">X: {Math.round(congratsOffsetX)}px, Y: {Math.round(congratsOffsetY)}px</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLayerCongrats(!showLayerCongrats);
                  }}
                  className={`p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition ${!showLayerCongrats ? 'opacity-40' : ''}`}
                >
                  {showLayerCongrats ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

            </div>

            {/* Selected Active Layer Customizer D-Pad & Precise Manual adjustment */}
            <div className="bg-[#111112] p-4.5 rounded-xl border border-white/5 space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-xs font-sans text-slate-300 font-bold uppercase flex flex-wrap items-center gap-1.5 font-sans">
                  <Move className="w-3.5 h-3.5 text-orange-500" />
                  <span>
                    {lang === 'km' ? 'កែសម្រួលលក្ខណសម្បត្តិរបស់ស្រទាប់ (Layer Properties)៖' : 'Live Layer Properties:'}
                  </span>
                  <span className="text-orange-500 font-extrabold ml-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 text-[10px]">
                    {activeDraggableLayer === 'logo' ? (lang === 'km' ? 'ឡូហ្គោម៉ាក' : 'Brand Logo') :
                     activeDraggableLayer === 'header' ? (lang === 'km' ? 'អក្សរលើក្បាល' : 'Secondary Header') :
                     activeDraggableLayer === 'main-title' ? (lang === 'km' ? 'ចំណងជើងធំ' : 'Main Host Headline') :
                     activeDraggableLayer === 'sub-title' ? (lang === 'km' ? 'បូរចំណងជើងរង' : 'Ribbon Subtitle') :
                     activeDraggableLayer === 'winners' ? (lang === 'km' ? 'កាតម្ចាស់រង្វាន់' : 'Winners Grid Block') :
                     (lang === 'km' ? 'សារអបអរសាទរខាងក្រោម' : 'Bottom Wishes Banner')}
                  </span>
                </span>
                <button
                  onClick={() => {
                    if (activeDraggableLayer === 'logo') { setLogoOffsetX(0); setLogoOffsetY(0); setLogoScale(1.0); setLogoUseOriginalShape(true); }
                    else if (activeDraggableLayer === 'header') { setHeaderOffsetX(0); setHeaderOffsetY(0); setHeaderScale(1.0); setHeaderColor(''); setIsHeaderGradient(false); }
                    else if (activeDraggableLayer === 'main-title') { setMainTitleOffsetX(0); setMainTitleOffsetY(0); setMainTitleScale(1.0); setMainTitleColor1('#FFFFFF'); setMainTitleColor2('#FFF2CD'); setIsMainTitleGradient(true); }
                    else if (activeDraggableLayer === 'sub-title') { setSubTitleOffsetX(0); setSubTitleOffsetY(0); setSubTitleScale(1.0); setSubTitleColor(''); }
                    else if (activeDraggableLayer === 'winners') { setWinnersOffsetX(0); setWinnersOffsetY(0); setPrize1Scale(1.0); setPrize2Scale(1.0); setPrize3Scale(1.0); setPrize1Color(''); setPrize2Color(''); setPrize3Color(''); }
                    else if (activeDraggableLayer === 'congrats') { setCongratsOffsetX(0); setCongratsOffsetY(0); setCongratsScale(1.0); setCongratsColor(''); setIsCongratsGradient(false); }
                  }}
                  className="bg-white/5 hover:bg-white/10 hover:text-white text-slate-400 active:scale-95 py-1 px-2 rounded text-[10.5px] cursor-pointer transition flex items-center gap-1 font-sans font-medium"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset ស្រទាប់រៀងៗខ្លួន</span>
                </button>
              </div>

              {/* Dynamic properties view based on active selected layer */}
              {activeDraggableLayer === 'logo' && (
                <div className="space-y-4 animate-fade-in">
                  {!logo ? (
                    <div className="text-center py-5 bg-[#161618] border border-white/5 rounded-xl p-4 space-y-2">
                      <p className="text-xs text-slate-400 font-sans">
                        {lang === 'km' ? '⚠️ សូមស្វែងរក និងផ្ទុកឡើង Logo ក្រុមហ៊ុនខាងលើជាមុនសិន ដើម្បីដំណើរការគ្រប់គ្រងទីតាំង និងទំហំ។' : '⚠️ Please search or upload a corporate logo above first to configure its positioning & size.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Logo Aspect mode toggle */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#161618] p-3 rounded-lg border border-white/5 gap-2">
                        <span className="text-xs text-slate-300 font-sans flex items-center gap-1.5">
                          <Crop className="w-3.5 h-3.5 text-orange-500" />
                          <span>{lang === 'km' ? 'ទម្រង់គែមរូបភាព Logo៖' : 'Logo Border Shapes:'}</span>
                        </span>
                        <div className="flex bg-[#1E1E21] p-0.5 rounded-lg border border-white/5 shrink-0 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setLogoUseOriginalShape(true)}
                            className={`px-3 py-1 rounded-md text-[10px] font-sans transition-all cursor-pointer ${logoUseOriginalShape ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'}`}
                          >
                            {lang === 'km' ? 'រក្សាទម្រង់ដើម (Aspect)' : 'Aspect Ratio'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogoUseOriginalShape(false)}
                            className={`px-3 py-1 rounded-md text-[10px] font-sans transition-all cursor-pointer ${!logoUseOriginalShape ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'}`}
                          >
                            {lang === 'km' ? 'កាត់ជារង្វង់មូល (Circular)' : 'Circular Clip'}
                          </button>
                        </div>
                      </div>

                      {/* Logo Zoom slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-sans text-slate-400">
                          <span>🔍 {lang === 'km' ? 'ទំហំពង្រីក-បង្រួម (Logo Zoom Scale)' : 'Logo Zoom Scale'}</span>
                          <span className="font-mono text-orange-500 font-bold">{Math.round(logoScale * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="3.0"
                          step="0.05"
                          value={logoScale}
                          onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                          className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeDraggableLayer === 'header' && (
                <div className="space-y-4 animate-fade-in text-slate-300 font-sans">
                  {/* Text value */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-sans font-bold block">{lang === 'km' ? 'កែអក្សរផ្ទាល់ខ្លួន (Header Greeting Content)៖' : 'Edit Header Greeting Content:'}</label>
                    <input
                      type="text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                      placeholder={lang === 'km' ? 'អបអរសាទរម្ចាស់រង្វាន់' : 'Congratulations Winners!'}
                    />
                  </div>

                  {/* Colors & Gradient Mixers */}
                  <div className="bg-[#161618] p-3 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-sans">{lang === 'km' ? 'លាយពណ៌ផ្ទៃអក្សរ (Header Colors Solid/Gradient)៖' : 'Header Colors Solid/Gradient:'}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={isHeaderGradient}
                          onChange={(e) => setIsHeaderGradient(e.target.checked)}
                          className="accent-orange-500 rounded"
                        />
                        <span>Gradient (លាយពីរពណ៌)</span>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-sans uppercase block">Color 1 (Solid)</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={headerColor || '#FFFFFF'}
                            onChange={(e) => setHeaderColor(e.target.value)}
                            className="w-full bg-[#18181A] border border-white/5 rounded-lg h-8 cursor-pointer p-0"
                          />
                          <button onClick={() => setHeaderColor('')} className="text-[9px] text-slate-400 hover:text-white bg-white/5 px-2 py-1 rounded">Reset</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-sans uppercase block">Color 2</span>
                        <input
                          type="color"
                          value={headerColor2}
                          disabled={!isHeaderGradient}
                          onChange={(e) => setHeaderColor2(e.target.value)}
                          className={`w-full bg-[#18181A] border border-white/5 rounded-lg h-8 cursor-pointer p-0 ${!isHeaderGradient ? 'opacity-30 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Zoom field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>🔍 {lang === 'km' ? 'ទំហំពង្រីក-បង្រួមក្បាលអក្សរ (Header Zoom)' : 'Header Text Scale'}</span>
                      <span className="font-mono text-orange-500 font-bold">{Math.round(headerScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={headerScale}
                      onChange={(e) => setHeaderScale(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              )}

              {activeDraggableLayer === 'main-title' && (
                <div className="space-y-4 animate-fade-in text-slate-300 font-sans">
                  {/* Title text */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-sans font-bold block">{lang === 'km' ? 'ចំណងជើងធំចម្បង (Main Title headline Text)៖' : 'Main Title Headline Text:'}</label>
                    <input
                      type="text"
                      value={mainTitleText}
                      onChange={(e) => setMainTitleText(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                      placeholder="GIVEAWAY"
                    />
                  </div>

                  {/* Color settings */}
                  <div className="bg-[#161618] p-3 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-sans">{lang === 'km' ? 'លាយពណ៌ផ្ទៃអក្សរធំ (Grand Title Colors Mix)៖' : 'Grand Title Colors Mix:'}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={isMainTitleGradient}
                          onChange={(e) => setIsMainTitleGradient(e.target.checked)}
                          className="accent-orange-500 rounded"
                        />
                        <span>Gradient (លាយពីរពណ៌)</span>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-sans uppercase block">Color 1 (Solid)</span>
                        <input
                          type="color"
                          value={mainTitleColor1}
                          onChange={(e) => setMainTitleColor1(e.target.value)}
                          className="w-full bg-[#18181A] border border-white/5 rounded-lg h-8 cursor-pointer p-0"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-sans uppercase block">Color 2</span>
                        <input
                          type="color"
                          value={mainTitleColor2}
                          disabled={!isMainTitleGradient}
                          onChange={(e) => setMainTitleColor2(e.target.value)}
                          className={`w-full bg-[#18181A] border border-white/5 rounded-lg h-8 cursor-pointer p-0 ${!isMainTitleGradient ? 'opacity-30 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sizing scale */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>🔍 {lang === 'km' ? 'ទំហំពង្រីក-បង្រួមចំណងជើង (Title Scale)' : 'Title Text Scale'}</span>
                      <span className="font-mono text-orange-500 font-bold">{Math.round(mainTitleScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={mainTitleScale}
                      onChange={(e) => setMainTitleScale(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              )}

              {activeDraggableLayer === 'sub-title' && (
                <div className="space-y-4 animate-fade-in text-slate-300 font-sans">
                  {/* Ribbon text */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-sans font-bold block">{lang === 'km' ? 'សរសេរអក្សរលើបូរ (Ribbon Content text)៖' : 'Ribbon Content Text:'}</label>
                    <input
                      type="text"
                      value={subTitleText}
                      onChange={(e) => setSubTitleText(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-[#f97316]"
                      placeholder="🏆 WINNERS 🏆"
                    />
                  </div>

                  {/* Ribbon Color customization */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block">{lang === 'km' ? 'ពណ៌អក្សរលើយបូរ (Ribbon Text Color Override)៖' : 'Ribbon Text Color Override:'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={subTitleColor || '#F97316'}
                        onChange={(e) => setSubTitleColor(e.target.value)}
                        className="w-[60px] bg-[#18181A] border border-white/5 rounded h-8 cursor-pointer p-0"
                      />
                      <button 
                        onClick={() => setSubTitleColor('')} 
                        className="text-[10px] bg-[#1E1E21] hover:bg-[#2A2A2E] text-slate-400 hover:text-white px-2.5 py-1.5 rounded transition cursor-pointer font-sans"
                      >
                        Reset Override
                      </button>
                    </div>
                  </div>

                  {/* Sizing Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>🔍 {lang === 'km' ? 'ទំហំបូរចំណងជើងរង (Ribbon Scale)' : 'Ribbon Sizing scale'}</span>
                      <span className="font-mono text-orange-500 font-bold">{Math.round(subTitleScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={subTitleScale}
                      onChange={(e) => setSubTitleScale(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              )}

              {activeDraggableLayer === 'congrats' && (
                <div className="space-y-4 animate-fade-in text-slate-300 font-sans">
                  {/* Wishes content text area */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 font-sans font-bold block">{lang === 'km' ? 'សំណេរអបអរសាទរខាងក្រោម (Congrats Wishes Message)៖' : 'Bottom Wishes Message:'}</label>
                    <textarea
                      value={congratsText}
                      onChange={(e) => setCongratsText(e.target.value)}
                      className="w-full bg-[#18181A] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-white min-h-[50px] focus:outline-[#f97316] resize-none font-sans"
                      placeholder="អបអរសាទរអ្នកឈ្នះទាំងអស់គ្នា!..."
                    />
                  </div>

                  {/* Colors override */}
                  <div className="bg-[#161618] p-3 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-sans">{lang === 'km' ? 'ពណ៌សំណេរសារខាងក្រោម (Bottom Wishes Colors Mix)៖' : 'Bottom Wishes Colors Mix:'}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={isCongratsGradient}
                          onChange={(e) => setIsCongratsGradient(e.target.checked)}
                          className="accent-orange-500 rounded"
                        />
                        <span>Gradient (លាយពីរពណ៌)</span>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-sans uppercase block">Color 1 (Solid)</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={congratsColor || '#FFFFFF'}
                            onChange={(e) => setCongratsColor(e.target.value)}
                            className="w-full bg-[#18181A] border border-white/5 rounded-lg h-8 cursor-pointer p-0"
                          />
                          <button onClick={() => setCongratsColor('')} className="text-[9px] text-slate-400 hover:text-white bg-white/5 px-2 py-1 rounded font-sans">Reset</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-sans uppercase block">Color 2</span>
                        <input
                          type="color"
                          value={congratsColor2}
                          disabled={!isCongratsGradient}
                          onChange={(e) => setCongratsColor2(e.target.value)}
                          className={`w-full bg-[#18181A] border border-white/5 rounded-lg h-8 cursor-pointer p-0 ${!isCongratsGradient ? 'opacity-30 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Wishes message scale */}
                  <div className="space-y-1.5 font-sans">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>🔍 {lang === 'km' ? 'ទំហំអក្សរសារខាងក្រោម (Wishes Zoom)' : 'Wishes Text Zoom'}</span>
                      <span className="font-mono text-orange-500 font-bold">{Math.round(congratsScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={congratsScale}
                      onChange={(e) => setCongratsScale(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              )}

              {activeDraggableLayer === 'winners' && (
                <div className="space-y-4 animate-fade-in text-slate-300">
                  <div className="bg-[#161618] p-3 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <Gift className="w-3.5 h-3.5 text-orange-500 animate-bounce" />
                      <span className="text-xs font-sans text-slate-300 font-bold">
                        {lang === 'km' ? 'ពង្រីក-បង្រួម & ដូរពណ៌ពានរង្វាន់ជាពិសេស (Prizes Individual Style Editor)៖' : 'Prizes Sizing & Color Editor:'}
                      </span>
                    </div>

                    {/* Prize 🥇 */}
                    <div className="space-y-1.5 pb-2.5 border-b border-white/5 font-sans">
                      <div className="flex justify-between text-[11px] font-sans">
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <span>🥇</span>
                          <span>{lang === 'km' ? 'រង្វាន់ទី ១' : 'Prize 1'} ({prizes[1]?.title || '...'})</span>
                        </span>
                        <span className="text-orange-500 font-bold font-mono text-[10px]">{Math.round(prize1Scale * 100)}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 items-center font-sans">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={prize1Color || '#94A3B8'}
                            onChange={(e) => setPrize1Color(e.target.value)}
                            className="w-9 h-7 bg-transparent cursor-pointer p-0 shrink-0"
                          />
                          <button onClick={() => setPrize1Color('')} className="text-[9.5px] bg-[#1E1E21] hover:bg-[#2A2A2E] text-slate-400 rounded px-1.5 py-1">Reset</button>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.05"
                          value={prize1Scale}
                          onChange={(e) => setPrize1Scale(parseFloat(e.target.value))}
                          className="accent-orange-500 h-1 bg-white/10 rounded-lg appearance-none w-full cursor-ew-resize"
                        />
                      </div>
                    </div>

                    {/* Prize 🥈 */}
                    <div className="space-y-1.5 pb-2.5 border-b border-white/5 font-sans">
                      <div className="flex justify-between text-[11px] font-sans">
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <span>🥈</span>
                          <span>{lang === 'km' ? 'រង្វាន់ទី ២' : 'Prize 2'} ({prizes[2]?.title || '...'})</span>
                        </span>
                        <span className="text-orange-500 font-bold font-mono text-[10px]">{Math.round(prize2Scale * 100)}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 items-center font-sans">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={prize2Color || '#94A3B8'}
                            onChange={(e) => setPrize2Color(e.target.value)}
                            className="w-9 h-7 bg-transparent cursor-pointer p-0 shrink-0"
                          />
                          <button onClick={() => setPrize2Color('')} className="text-[9.5px] bg-[#1E1E21] hover:bg-[#2A2A2E] text-slate-400 rounded px-1.5 py-1">Reset</button>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.05"
                          value={prize2Scale}
                          onChange={(e) => setPrize2Scale(parseFloat(e.target.value))}
                          className="accent-orange-500 h-1 bg-white/10 rounded-lg appearance-none w-full cursor-ew-resize"
                        />
                      </div>
                    </div>

                    {/* Prize 🥉 */}
                    <div className="space-y-1.5 font-sans">
                      <div className="flex justify-between text-[11px] font-sans">
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <span>🥉</span>
                          <span>{lang === 'km' ? 'រង្វាន់ទី ៣' : 'Prize 3'} ({prizes[3]?.title || '...'})</span>
                        </span>
                        <span className="text-orange-500 font-bold font-mono text-[10px]">{Math.round(prize3Scale * 100)}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 items-center font-sans">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={prize3Color || '#94A3B8'}
                            onChange={(e) => setPrize3Color(e.target.value)}
                            className="w-9 h-7 bg-transparent cursor-pointer p-0 shrink-0"
                          />
                          <button onClick={() => setPrize3Color('')} className="text-[9.5px] bg-[#1E1E21] hover:bg-[#2A2A2E] text-slate-400 rounded px-1.5 py-1 font-sans">Reset</button>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.05"
                          value={prize3Scale}
                          onChange={(e) => setPrize3Scale(parseFloat(e.target.value))}
                          className="accent-orange-500 h-1 bg-white/10 rounded-lg appearance-none w-full cursor-ew-resize"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* D-Pad controls & coordinates details */}
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 bg-[#0A0A0C] p-3 rounded-xl border border-white/5">
                
                {/* Visual D-Pad Layout */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <div className="absolute w-[112px] h-[112px] rounded-full border border-white/5 bg-[#121214] pointer-events-none"></div>
                  
                  {/* UP BUTTON */}
                  <button
                    onClick={() => {
                      const step = 5;
                      if (activeDraggableLayer === 'logo') setLogoOffsetY(prev => prev - step);
                      else if (activeDraggableLayer === 'header') setHeaderOffsetY(prev => prev - step);
                      else if (activeDraggableLayer === 'main-title') setMainTitleOffsetY(prev => prev - step);
                      else if (activeDraggableLayer === 'sub-title') setSubTitleOffsetY(prev => prev - step);
                      else if (activeDraggableLayer === 'winners') setWinnersOffsetY(prev => prev - step);
                      else if (activeDraggableLayer === 'congrats') setCongratsOffsetY(prev => prev - step);
                    }}
                    className="absolute top-1.5 w-8 h-8 rounded-lg bg-[#1D1D20] hover:bg-orange-600 hover:text-white border border-white/5 shadow-md flex items-center justify-center text-xs text-slate-300 cursor-pointer transition active:scale-90"
                    title={lang === 'km' ? 'រំកិលឡើងលើ' : 'Nudge Up (-5px)'}
                  >
                    ▲
                  </button>

                  {/* LEFT BUTTON */}
                  <button
                    onClick={() => {
                      const step = 5;
                      if (activeDraggableLayer === 'logo') setLogoOffsetX(prev => prev - step);
                      else if (activeDraggableLayer === 'header') setHeaderOffsetX(prev => prev - step);
                      else if (activeDraggableLayer === 'main-title') setMainTitleOffsetX(prev => prev - step);
                      else if (activeDraggableLayer === 'sub-title') setSubTitleOffsetX(prev => prev - step);
                      else if (activeDraggableLayer === 'winners') setWinnersOffsetX(prev => prev - step);
                      else if (activeDraggableLayer === 'congrats') setCongratsOffsetX(prev => prev - step);
                    }}
                    className="absolute left-1.5 w-8 h-8 rounded-lg bg-[#1D1D20] hover:bg-orange-600 hover:text-white border border-white/5 shadow-md flex items-center justify-center text-xs text-slate-300 cursor-pointer transition active:scale-95"
                    title={lang === 'km' ? 'រំកិលទៅឆ្វេង' : 'Nudge Left (-5px)'}
                  >
                    ◀
                  </button>

                  {/* CENTER ICON */}
                  <div className="absolute w-7 h-7 rounded-full bg-[#141416] border border-orange-500/20 flex items-center justify-center text-orange-500 pointer-events-none">
                    <Move className="w-3.5 h-3.5" />
                  </div>

                  {/* RIGHT BUTTON */}
                  <button
                    onClick={() => {
                      const step = 5;
                      if (activeDraggableLayer === 'logo') setLogoOffsetX(prev => prev + step);
                      else if (activeDraggableLayer === 'header') setHeaderOffsetX(prev => prev + step);
                      else if (activeDraggableLayer === 'main-title') setMainTitleOffsetX(prev => prev + step);
                      else if (activeDraggableLayer === 'sub-title') setSubTitleOffsetX(prev => prev + step);
                      else if (activeDraggableLayer === 'winners') setWinnersOffsetX(prev => prev + step);
                      else if (activeDraggableLayer === 'congrats') setCongratsOffsetX(prev => prev + step);
                    }}
                    className="absolute right-1.5 w-8 h-8 rounded-lg bg-[#1D1D20] hover:bg-orange-600 hover:text-white border border-white/5 shadow-md flex items-center justify-center text-xs text-slate-300 cursor-pointer transition active:scale-95"
                    title={lang === 'km' ? 'រំកិលទៅស្តាំ' : 'Nudge Right (+5px)'}
                  >
                    ▶
                  </button>

                  {/* DOWN BUTTON */}
                  <button
                    onClick={() => {
                      const step = 5;
                      if (activeDraggableLayer === 'logo') setLogoOffsetY(prev => prev + step);
                      else if (activeDraggableLayer === 'header') setHeaderOffsetY(prev => prev + step);
                      else if (activeDraggableLayer === 'main-title') setMainTitleOffsetY(prev => prev + step);
                      else if (activeDraggableLayer === 'sub-title') setSubTitleOffsetY(prev => prev + step);
                      else if (activeDraggableLayer === 'winners') setWinnersOffsetY(prev => prev + step);
                      else if (activeDraggableLayer === 'congrats') setCongratsOffsetY(prev => prev + step);
                    }}
                    className="absolute bottom-1.5 w-8 h-8 rounded-lg bg-[#1D1D20] hover:bg-orange-600 hover:text-white border border-white/5 shadow-md flex items-center justify-center text-xs text-slate-300 cursor-pointer transition active:scale-90"
                    title={lang === 'km' ? 'រំកិលចុះក្រោម' : 'Nudge Down (+5px)'}
                  >
                    ▼
                  </button>
                </div>

                {/* Range Sliders for Precision tuning */}
                <div className="flex-grow space-y-3.5 w-full">
                  
                  {/* Slider X */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-sans">
                      <span>↔️ {lang === 'km' ? 'កូអរដោនេឆ្វេងស្តាំ (Offset X)' : 'Manual Offset X'}</span>
                      <span className="font-mono text-orange-500 font-bold font-mono">
                        {activeDraggableLayer === 'logo' ? logoOffsetX :
                         activeDraggableLayer === 'header' ? headerOffsetX :
                         activeDraggableLayer === 'main-title' ? mainTitleOffsetX :
                         activeDraggableLayer === 'sub-title' ? subTitleOffsetX :
                         activeDraggableLayer === 'winners' ? winnersOffsetX :
                         congratsOffsetX}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-400"
                      max="400"
                      step="1"
                      value={
                        activeDraggableLayer === 'logo' ? logoOffsetX :
                        activeDraggableLayer === 'header' ? headerOffsetX :
                        activeDraggableLayer === 'main-title' ? mainTitleOffsetX :
                        activeDraggableLayer === 'sub-title' ? subTitleOffsetX :
                        activeDraggableLayer === 'winners' ? winnersOffsetX :
                        congratsOffsetX
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (activeDraggableLayer === 'logo') setLogoOffsetX(val);
                        else if (activeDraggableLayer === 'header') setHeaderOffsetX(val);
                        else if (activeDraggableLayer === 'main-title') setMainTitleOffsetX(val);
                        else if (activeDraggableLayer === 'sub-title') setSubTitleOffsetX(val);
                        else if (activeDraggableLayer === 'winners') setWinnersOffsetX(val);
                        else if (activeDraggableLayer === 'congrats') setCongratsOffsetX(val);
                      }}
                      className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Slider Y */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-sans">
                      <span>↕️ {lang === 'km' ? 'កូអរដោនេលើក្រោម (Offset Y)' : 'Manual Offset Y'}</span>
                      <span className="font-mono text-orange-500 font-bold font-mono">
                        {activeDraggableLayer === 'logo' ? logoOffsetY :
                         activeDraggableLayer === 'header' ? headerOffsetY :
                         activeDraggableLayer === 'main-title' ? mainTitleOffsetY :
                         activeDraggableLayer === 'sub-title' ? subTitleOffsetY :
                         activeDraggableLayer === 'winners' ? winnersOffsetY :
                         congratsOffsetY}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-450"
                      max="450"
                      step="1"
                      value={
                        activeDraggableLayer === 'logo' ? logoOffsetY :
                        activeDraggableLayer === 'header' ? headerOffsetY :
                        activeDraggableLayer === 'main-title' ? mainTitleOffsetY :
                        activeDraggableLayer === 'sub-title' ? subTitleOffsetY :
                        activeDraggableLayer === 'winners' ? winnersOffsetY :
                        congratsOffsetY
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (activeDraggableLayer === 'logo') setLogoOffsetY(val);
                        else if (activeDraggableLayer === 'header') setHeaderOffsetY(val);
                        else if (activeDraggableLayer === 'main-title') setMainTitleOffsetY(val);
                        else if (activeDraggableLayer === 'sub-title') setSubTitleOffsetY(val);
                        else if (activeDraggableLayer === 'winners') setWinnersOffsetY(val);
                        else if (activeDraggableLayer === 'congrats') setCongratsOffsetY(val);
                      }}
                      className="w-full accent-orange-500 cursor-ew-resize h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* 5. ADD CUSTOM LABELS / TEXT LAYERS */}
          <div className="space-y-4 bg-[#111112] p-3.5 rounded-xl border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-sans text-slate-300 font-bold flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-orange-500" />
                  <span>{lang === 'km' ? 'ថែមសំណេរអក្សរសេរដោយខ្លួនឯង (Add Custom Text)' : 'Add Custom Label Layer'}</span>
                </span>
                
                <button
                  onClick={() => {
                    setExtraTexts(prev => [
                      ...prev,
                      {
                        id: Date.now(),
                        text: lang === 'km' ? 'សំណេរថ្មី' : 'New Label',
                        size: 20,
                        color: '#FFFFFF',
                        x: 50, // horizontal percentage (0-100)
                        y: 80, // vertical percentage (0-100)
                        bold: false,
                        shadow: true
                      }
                    ]);
                  }}
                  className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'km' ? 'បន្ថែម' : 'Add'}</span>
                </button>
              </div>

              {extraTexts.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic text-center py-2">
                  {lang === 'km' ? 'គ្មានអក្សរបន្ថែម។ ចុច « បន្ថែម » ដើម្បីសរសេរទិន្នន័យថ្មីដោយសេរី។' : 'No extra text layers yet. Click « Add » to write custom content.'}
                </p>
              ) : (
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                  {extraTexts.map((layer) => (
                    <div key={layer.id} className="bg-[#18181A] p-2.5 rounded-lg border border-white/5 space-y-2 relative group/extra">
                      <button
                        onClick={() => setExtraTexts(prev => prev.filter(l => l.id !== layer.id))}
                        className="absolute top-2 right-2 p-1 bg-red-950/20 text-rose-500 border border-rose-950/35 rounded hover:bg-rose-950/40 transition cursor-pointer"
                        title={lang === 'km' ? 'លុបជួរនេះ' : 'Delete'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={layer.text}
                          onChange={(e) => {
                            const newText = e.target.value;
                            setExtraTexts(prev => prev.map(l => l.id === layer.id ? { ...l, text: newText } : l));
                          }}
                          className="w-full bg-[#111112] border border-white/5 rounded px-2 py-1 text-xs text-white"
                          placeholder="Text text..."
                        />
                        <input
                          type="color"
                          value={layer.color}
                          onChange={(e) => {
                            const newCol = e.target.value;
                            setExtraTexts(prev => prev.map(l => l.id === layer.id ? { ...l, color: newCol } : l));
                          }}
                          className="w-full bg-[#111112] border border-white/5 rounded cursor-pointer h-7 p-0"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-500 mb-0.5">
                            <span>↕️ {lang === 'km' ? 'ទីតាំងលើក្រោម (Y)' : 'Y Pos'}</span>
                            <span className="font-mono text-slate-300">{layer.y}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={layer.y}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setExtraTexts(prev => prev.map(l => l.id === layer.id ? { ...l, y: val } : l));
                            }}
                            className="w-full accent-orange-500 h-1 bg-white/5 rounded appearance-none cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-500 mb-0.5">
                            <span>↔️ {lang === 'km' ? 'ឆ្វេងស្ដាំ (X)' : 'X Pos'}</span>
                            <span className="font-mono text-slate-300">{layer.x}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={layer.x}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setExtraTexts(prev => prev.map(l => l.id === layer.id ? { ...l, x: val } : l));
                            }}
                            className="w-full accent-orange-500 h-1 bg-white/5 rounded appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[9.5px]/none items-center">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Size: <span className="font-mono font-bold text-slate-300">{layer.size}px</span></span>
                          <div className="flex gap-1 shrink-0 ml-1">
                            <button
                              onClick={() => {
                                setExtraTexts(prev => prev.map(l => l.id === layer.id ? { ...l, size: Math.max(10, l.size - 2) } : l));
                              }}
                              className="w-4 h-4 bg-white/5 rounded text-white flex items-center justify-center text-xs"
                            >-</button>
                            <button
                              onClick={() => {
                                setExtraTexts(prev => prev.map(l => l.id === layer.id ? { ...l, size: Math.min(100, l.size + 2) } : l));
                              }}
                              className="w-4 h-4 bg-white/5 rounded text-white flex items-center justify-center text-xs"
                            >+</button>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 shrink-0">
                          <label className="flex items-center gap-1 cursor-pointer text-slate-400">
                            <input
                              type="checkbox"
                              checked={layer.bold}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setExtraTexts(prev => prev.map(l => l.id === layer.id ? { ...l, bold: checked } : l));
                              }}
                              className="accent-orange-500 rounded"
                            />
                            <span>Bold</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-slate-400">
                            <input
                              type="checkbox"
                              checked={layer.shadow}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setExtraTexts(prev => prev.map(l => l.id === layer.id ? { ...l, shadow: checked } : l));
                              }}
                              className="accent-orange-500 rounded"
                            />
                            <span>Shadow</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
