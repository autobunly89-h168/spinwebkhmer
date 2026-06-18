/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Participant, Prize, Winner, AppSettings } from './types';
import SpinWheel from './components/SpinWheel';
import WinnersPanel from './components/WinnersPanel';
import PosterGenerator from './components/PosterGenerator';
import { 
  Users, 
  Settings, 
  Trophy, 
  Plus, 
  Sparkles, 
  Upload, 
  RotateCcw, 
  Trash2, 
  Eye, 
  FileCheck, 
  Info,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const INITIAL_NAMES_PRESET = [
  'SENG Mouytieng',
  'Edward Iszumi',
  'V.run',
  'Reach',
  'SokSok Heng',
  'Asnavy',
  'Koeun Davit',
  'OUCH Phally',
  'Ryyyy',
  'Sivmeng Deth',
  'KONAMI',
  'Proeung Bun Rong',
  'Chea GK',
  'PONLEO',
  'Thin RathaNak',
  'Sokmes',
  'Kim Laiseng',
  'Khim Chhhorn',
  'Kem Monyden',
  'Leap Heng',
  'Spider',
  'XING',
  'Kuon Oudom',
  'Vaj9kix'
];

export default function App() {
  // State 1: Active list of names in the wheel
  const [namesText, setNamesText] = useState<string>('');
  const [namesList, setNamesList] = useState<string[]>([]);
  const [singleNameInput, setSingleNameInput] = useState<string>('');

  // State 2: Uploaded Logo (Base64)
  const [logo, setLogo] = useState<string>('');

  // State 3: Winners keyed by 1, 2, 3
  const [winners, setWinners] = useState<Record<number, Winner | null>>({
    1: null,
    2: null,
    3: null,
  });

  // State 4: Prize names keyed by 1, 2, 3
  const [prizes, setPrizes] = useState<Record<number, Prize>>({
    1: { id: 'p1', place: 1, type: '1st', title: 'រង្វាន់ទី ១៖ អាវកីឡា FIFA GRADE A' },
    2: { id: 'p2', place: 2, type: '2nd', title: 'រង្វាន់ទី ២៖ FREE CREDIT $38' },
    3: { id: 'p3', place: 3, type: '3rd', title: 'រង្វាន់ទី ៣៖ បាល់ទាត់ស៊េរី FIFA' },
  });

  // State 5: Active Drawing Target
  const [activeDrawPlace, setActiveDrawPlace] = useState<1 | 2 | 3>(3); // Standard: start drawing 3rd place!

  // State 6: General settings
  const [settings, setSettings] = useState<AppSettings>({
    congratulationsText: 'អបអរសាទរអ្នកឈ្នះក្នុងការទស្សន៍ទាយ Polls ត្រឹមត្រូវ!',
    spinDuration: 5,
    themeColor: '#EAB308',
    removeWinnersAfterSpin: true,
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // Initialize and load state from localStorage (durable client data persistence)
  useEffect(() => {
    try {
      const cachedNames = localStorage.getItem('lucky_draw_names');
      if (cachedNames) {
        const parsed = JSON.parse(cachedNames);
        setNamesList(parsed);
        setNamesText(parsed.join('\n'));
      } else {
        // Fallback default state
        setNamesList(INITIAL_NAMES_PRESET);
        setNamesText(INITIAL_NAMES_PRESET.join('\n'));
      }

      const cachedLogo = localStorage.getItem('lucky_draw_logo');
      if (cachedLogo) {
        setLogo(cachedLogo);
      }

      const cachedWinners = localStorage.getItem('lucky_draw_winners');
      if (cachedWinners) {
        setWinners(JSON.parse(cachedWinners));
      }

      const cachedPrizes = localStorage.getItem('lucky_draw_prizes');
      if (cachedPrizes) {
        setPrizes(JSON.parse(cachedPrizes));
      }

      const cachedCongrats = localStorage.getItem('lucky_draw_congrats');
      if (cachedCongrats) {
        setSettings((prev) => ({ ...prev, congratulationsText: cachedCongrats }));
      }

      const cachedRemoveWinner = localStorage.getItem('lucky_draw_remove_winner');
      if (cachedRemoveWinner) {
        setSettings((prev) => ({ ...prev, removeWinnersAfterSpin: cachedRemoveWinner === 'true' }));
      }
    } catch (e) {
      console.error('Error loading config cache', e);
    }
  }, []);

  // Sync to localStorge helper
  const saveNamesToStorage = (list: string[]) => {
    localStorage.setItem('lucky_draw_names', JSON.stringify(list));
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Convert textarea input to final clean array
  const handleNamesTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const txt = e.target.value;
    setNamesText(txt);
    const splitArr = txt
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n !== '');
    setNamesList(splitArr);
    saveNamesToStorage(splitArr);
  };

  // Add individual name
  const handleAddSingleName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = singleNameInput.trim();
    if (!clean) return;

    if (namesList.includes(clean)) {
      showNotification('ឈ្មោះនេះមានរួចហើយ! (Name already in list)', 'warn');
      return;
    }

    const updated = [...namesList, clean];
    setNamesList(updated);
    setNamesText(updated.join('\n'));
    setSingleNameInput('');
    saveNamesToStorage(updated);
    showNotification(`បានបន្ថែម « ${clean} » ទៅក្នុងបញ្ជីបង្វិល`);
  };

  // Handle Logo uploading (Logo Upland point)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogo(reader.result);
          localStorage.setItem('lucky_draw_logo', reader.result);
          showNotification('បានបញ្ចូល Logo ក្រុមហ៊ុនជោគជ័យ! (Logo updated)');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove Logo
  const handleRemoveLogo = () => {
    setLogo('');
    localStorage.removeItem('lucky_draw_logo');
    showNotification('បានលុប Logo ចេញ', 'info');
  };

  // Reset names back to preset template
  const handleResetToPreset = () => {
    setNamesList(INITIAL_NAMES_PRESET);
    setNamesText(INITIAL_NAMES_PRESET.join('\n'));
    saveNamesToStorage(INITIAL_NAMES_PRESET);
    showNotification('បានកំណត់បញ្ជីឈ្មោះសាកល្បងលំនាំដើមឡើងវិញ!');
  };

  // Completely empty list
  const handleClearAllNames = () => {
    setNamesList([]);
    setNamesText('');
    saveNamesToStorage([]);
    showNotification('បានសំអាតបញ្ជីឈ្មោះទាំងអស់រួចរាល់', 'info');
  };

  // Update specific place prize title
  const handleUpdatePrizeTitle = (place: 1 | 2 | 3, title: string) => {
    const updated = {
      ...prizes,
      [place]: {
        ...prizes[place],
        title,
      },
    };
    setPrizes(updated);
    localStorage.setItem('lucky_draw_prizes', JSON.stringify(updated));
  };

  // Update specific winner photo avatar
  const handleUpdateWinnerImage = (place: 1 | 2 | 3, base64Image: string) => {
    if (!winners[place]) {
      // If no winner is currently drawn, we pre-assign a mockup winner template so they can still upload photos!
      const tempWinner: Winner = {
        id: `temp-${place}`,
        name: `ម្ចាស់រង្វាន់ទី ${place}`,
        place,
        prizeTitle: prizes[place].title,
        avatar: base64Image,
        drawnAt: new Date().toISOString(),
      };
      const updated = { ...winners, [place]: tempWinner };
      setWinners(updated);
      localStorage.setItem('lucky_draw_winners', JSON.stringify(updated));
    } else {
      const updated = {
        ...winners,
        [place]: {
          ...winners[place]!,
          avatar: base64Image,
        },
      };
      setWinners(updated);
      localStorage.setItem('lucky_draw_winners', JSON.stringify(updated));
    }
    showNotification(`បានរក្សាទុករូបថតសម្រាប់អ្នកឈ្នះលេខ ${place} រួចរាល់!`);
  };

  // Clear specific place winner
  const handleClearWinnerRow = (place: 1 | 2 | 3) => {
    const updated = { ...winners, [place]: null };
    setWinners(updated);
    localStorage.setItem('lucky_draw_winners', JSON.stringify(updated));
    showNotification(`បានលុបអ្នកឈ្នះលេខ ${place} រួចរាល់`, 'info');
  };

  // Complete reset of whole draw database
  const handleResetFullDraw = () => {
    if (confirm('តើអ្នកពិតជាចង់សំអាតទិន្នន័យអ្នកឈ្នះទាំង ៣ នាក់ និងរូបភាពទាំងអស់មែនទេ?')) {
      const clearWinners = { 1: null, 2: null, 3: null };
      setWinners(clearWinners);
      localStorage.setItem('lucky_draw_winners', JSON.stringify(clearWinners));
      
      // Reset targets back to 3rd place
      setActiveDrawPlace(3);
      showNotification('បានចាប់ផ្តើមការប្រកួតថ្មី និងសំអាតតារាងអ្នកឈ្នះទាំងអស់!');
    }
  };

  // This trigger executes when the spin wheel completes its animation
  const handleWheelSpinComplete = (winnerName: string) => {
    // Generate new Winner record
    const targetPrize = prizes[activeDrawPlace];
    const newWinner: Winner = {
      id: `w-${activeDrawPlace}-${Date.now()}`,
      name: winnerName,
      place: activeDrawPlace,
      prizeTitle: targetPrize.title,
      drawnAt: new Date().toLocaleTimeString('kh-KH'),
    };

    // Store in our winners structure
    const updatedWinners = {
      ...winners,
      [activeDrawPlace]: newWinner,
    };
    setWinners(updatedWinners);
    localStorage.setItem('lucky_draw_winners', JSON.stringify(updatedWinners));

    showNotification(`🎉 អបអរសាទរ! ${winnerName} ឈ្នះរង្វាន់លេខ ${activeDrawPlace}!`, 'success');

    // Auto removal feature
    if (settings.removeWinnersAfterSpin) {
      const filtered = namesList.filter((n) => n !== winnerName);
      setNamesList(filtered);
      setNamesText(filtered.join('\n'));
      saveNamesToStorage(filtered);
    }

    // Smart automatic transition of drawing target
    // If we just drew 3rd place, move up to 2nd. If 2nd, move to 1st.
    if (activeDrawPlace === 3 && !winners[2]) {
      setActiveDrawPlace(2);
    } else if (activeDrawPlace === 2 && !winners[1]) {
      setActiveDrawPlace(1);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-slate-950">
      
      {/* Dynamic Floating Toast Notification banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-fade-in transition duration-300
          ${notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
            : notification.type === 'warn'
              ? 'bg-orange-950/90 border-orange-500/50 text-orange-300'
              : 'bg-slate-900/90 border-[#161618] text-slate-300'
          }`}
          id="system-toast-banner"
        >
          <Sparkles className="w-4 h-4 animate-spin text-orange-500" />
          <span className="text-xs sm:text-sm font-sans font-medium">{notification.message}</span>
        </div>
      )}

      {/* HEADER SECTION WITH SPORTS HIGHLIGHT BLUE BAR */}
      <header className="border-b border-white/5 bg-[#0A0A0B]/85 backdrop-blur sticky top-0 z-40 select-none">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Application title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Trophy className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-sans tracking-wide text-white flex items-center gap-1.5 leading-none mb-1">
                <span>កង់បង្វិលផ្សងសំណាង</span>
                <span className="text-orange-500">LUCKY SPIN</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                Khmer Sports & Giveaway Tournament System
              </p>
            </div>
          </div>

          {/* Quick Stats & Controls header bar */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Logo Uploading field (upland logo point) */}
            <div className="flex items-center gap-2 bg-[#161618] border border-white/5 py-1.5 px-3 rounded-xl">
              {logo ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-orange-500">
                    <img src={logo} className="w-full h-full object-cover" alt="Custom Logo" referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-[11px] font-sans text-slate-300">Logo បញ្ចូលរួច</span>
                  <button onClick={handleRemoveLogo} className="text-[10px] text-rose-400 hover:underline hover:text-rose-300 cursor-pointer" title="Remove custom organization logo">
                    លុប
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-orange-450 cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>បញ្ចូល Logo ក្រុមហ៊ុន</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              )}
            </div>

            <div className="text-xs font-mono text-slate-400 bg-[#161618] border border-white/5 px-3 py-1.5 rounded-xl">
              អ្នកចូលរួម៖ <strong className="text-orange-500">{namesList.length} នាក់</strong>
            </div>

            {/* Clear all state to restart layout */}
            <button
              onClick={handleResetFullDraw}
              className="flex items-center gap-1 bg-[#161618] hover:bg-[#202023] text-rose-450 hover:text-rose-400 text-xs py-1.5 px-3 rounded-xl border border-white/5 cursor-pointer transition duration-150"
              id="btn-global-reset"
              title="សំអាតអ្នកឈ្នះ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>លុបលទ្ធផល</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN LAYOUT DASHBOARD */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* TOP INTRO CARD */}
        <div className="bg-[#161618] p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-wider font-sans border border-orange-500/20">
                PRO VERSION 4.2
              </span>
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
              <span className="text-slate-500 text-xs font-mono">STADIUM HOST ONLINE</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-sans">
              កម្មវិធីចាប់រង្វាន់សំណាងរៀបចំ Poster និង នាំចេញលទ្ធផលគំរូ ៣ នាក់
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-sans leading-relaxed">
              ប្រព័ន្ធកង់បង្វិលយករង្វាន់ស្វ័យប្រវត្តិនេះជួយលោកអ្នកក្នុងការបង្កើតផ្ទាំងរូបភាពលទ្ធផល giveaway (ដូចជាការទស្សន៍ទាយ Poll ត្រឹមត្រូវ ឬចាប់ឆ្នោតផ្សងសំណាង) ទៅជាឯកសារ <strong className="text-orange-450">PDF ឬ រូបភាព PNG</strong> ភ្លាមៗជាមួយទម្រង់រង្វាន់លេខ ១, ២, ៣ យ៉ាងប្រណិត!
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResetToPreset}
              className="bg-[#1E1E21] hover:bg-[#2A2A2E] text-slate-300 hover:text-white border border-white/5 text-xs font-sans py-2.5 px-4 rounded-xl transition duration-150 flex items-center gap-1 cursor-pointer shadow-md"
              id="btn-load-preset-names"
            >
              <span>🔄 ផ្ទុកបញ្ជីឈ្មោះគំរូ</span>
            </button>
          </div>
        </div>

        {/* ROW 1: SPIN WHEEL (Left) & SETTINGS/PARTICIPANTS (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN LEFT: CHUBBY WHEEL STAGE (7 Slots) */}
          <div className="lg:col-span-7 bg-[#161618] border border-white/5 p-6 rounded-3xl flex flex-col items-center justify-center space-y-6 shadow-[0_15px_35px_rgba(0,0,0,0.6)]" id="wheel-card-container">
            
            {/* Header with active target selection */}
            <div className="w-full flex items-center justify-between border-b border-white/5 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest text-[#94a3b8]">
                  លំហូរកង់បង្វិលសកម្ម (Active Spin Objective)
                </span>
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  <span>🎯 កំពុងបង្វិលសម្រាប់៖ </span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-sans uppercase 
                    ${activeDrawPlace === 1 ? 'bg-[#2A2A2E] text-orange-450 border border-orange-500/30' : ''}
                    ${activeDrawPlace === 2 ? 'bg-[#2A2A2E] text-slate-300 border border-white/5' : ''}
                    ${activeDrawPlace === 3 ? 'bg-[#2A2A2E] text-amber-500 border border-amber-600/30' : ''}
                  `}>
                    រង្វាន់លេខ {activeDrawPlace} 🏅
                  </span>
                </h3>
              </div>

              {/* Mute icon indication or active wheel metadata */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-xs font-mono text-slate-400">READY</span>
              </div>
            </div>

            {/* SPIN WHEEL CANVAS DRAW STAGE */}
            <SpinWheel
              names={namesList}
              logo={logo}
              onSpinStart={() => {
                showNotification('កំពុងបង្វិលកង់សំណាង... សូមរង់ចាំលទ្ធផល!', 'info');
              }}
              onSpinComplete={handleWheelSpinComplete}
              spinDuration={settings.spinDuration}
            />

            {/* Draw Priority Shortcuts Selector */}
            <div className="w-full bg-[#0A0A0B]/80 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-400 font-sans">ជ្រើសរើសរង្វាន់ដើម្បីបង្វិលបន្តបន្ទាប់ (Select drawing row target)៖</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveDrawPlace(3)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-sans font-medium transition duration-150 cursor-pointer
                    ${activeDrawPlace === 3 
                      ? 'bg-amber-600/10 border border-amber-500/80 text-amber-400' 
                      : 'bg-[#1E1E21] border border-white/5 text-slate-400 hover:text-white'
                    }`}
                >
                  🥉 រង្វាន់ទី ៣
                </button>
                <button
                  onClick={() => setActiveDrawPlace(2)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-sans font-medium transition duration-150 cursor-pointer
                    ${activeDrawPlace === 2 
                      ? 'bg-slate-500/10 border border-slate-400/80 text-slate-300' 
                      : 'bg-[#1E1E21] border border-white/5 text-slate-400 hover:text-white'
                    }`}
                >
                  🥈 រង្វាន់ទី ២
                </button>
                <button
                  onClick={() => setActiveDrawPlace(1)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-sans font-medium transition duration-150 cursor-pointer
                    ${activeDrawPlace === 1 
                      ? 'bg-orange-500/10 border border-orange-400/80 text-orange-450' 
                      : 'bg-[#1E1E21] border border-white/5 text-slate-400 hover:text-white'
                    }`}
                >
                  🥇 រង្វាន់ទី ១
                </button>
              </div>
            </div>

          </div>

          {/* COLUMN RIGHT: PARTICIPANTS CONFIG / SETTINGS (5 Slots) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD A: NAMES PORTAL */}
            <div className="bg-[#161618] border border-white/5 p-5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-450" />
                  <span>បញ្ជីឈ្មោះអ្នកចូលរួមបង្វិល ({namesList.length})</span>
                </h3>
                <button
                  onClick={handleClearAllNames}
                  className="text-[11px] text-rose-400 hover:text-rose-350 flex items-center gap-1 cursor-pointer"
                  title="លុបឈ្មោះទាំងអស់"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>លុបទាំងអស់</span>
                </button>
              </div>

              {/* Form to insert single name quickly */}
              <form onSubmit={handleAddSingleName} className="flex gap-2">
                <input
                  type="text"
                  value={singleNameInput}
                  onChange={(e) => setSingleNameInput(e.target.value)}
                  placeholder="បញ្ចូលលឈ្មោះទីនេះ..."
                  className="flex-grow bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2 text-xs font-sans text-slate-200 placeholder-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  id="input-single-name"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-sans px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition duration-150 active:scale-95 cursor-pointer shrink-0 shadow-lg shadow-orange-950/25"
                  id="btn-add-name"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>បន្ថែម</span>
                </button>
              </form>

              {/* Bulk Textarea editor */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5 font-sans">
                  បញ្ចូល ឬកែសម្រួលឈ្មោះច្រើនក្នុងពេលតែមួយ (មួយជួរ មួយឈ្មោះ)៖
                </label>
                <textarea
                  value={namesText}
                  onChange={handleNamesTextChange}
                  rows={8}
                  className="w-full bg-[#0A0A0B] text-slate-300 font-sans border border-white/5 rounded-xl p-3.5 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-slate-800 tracking-wide leading-relaxed resize-y"
                  placeholder="សេង មុយទៀង&#10;សុខ ហេង&#10;Edward..."
                  id="textarea-bulk-names"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans bg-[#0A0A0B]/40 p-2.5 rounded-xl border border-white/5">
                <span>💡 គន្លឹះ៖ លោកអ្នកអាចកូពីបញ្ជីឈ្មោះពី Excel ឬ Telegram យកមកផាសបាន!</span>
              </div>
            </div>

            {/* CARD B: GENERAL SETTINGS */}
            <div className="bg-[#161618] border border-white/5 p-5 rounded-2xl space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-white font-sans flex items-center gap-1.5 border-b border-white/5 pb-2.5">
                <Settings className="w-4 h-4 text-orange-450" />
                <span>ការកំណត់បន្ថែម (Configuration Settings)</span>
              </h3>

              {/* Spin duration settings slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-slate-400">រយៈពេលវិលកង់ (Spin Duration)៖</span>
                  <span className="text-orange-450 font-mono font-bold">{settings.spinDuration} វិនាទី</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={settings.spinDuration}
                  onChange={(e) => setSettings({ ...settings, spinDuration: parseInt(e.target.value) })}
                  className="w-full accent-orange-500 bg-[#0A0A0B] h-2 rounded-lg cursor-pointer"
                  id="slider-spin-duration"
                />
              </div>

              {/* Remove winner checkbox */}
              <label className="flex items-start gap-2.5 text-xs font-sans text-slate-300 select-none cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={settings.removeWinnersAfterSpin}
                  onChange={(e) => {
                    setSettings({ ...settings, removeWinnersAfterSpin: e.target.checked });
                    localStorage.setItem('lucky_draw_remove_winner', String(e.target.checked));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-white/5 bg-[#0A0A0B] text-orange-500 focus:ring-orange-500 focus:ring-offset-[#0A0A0B]"
                  id="checkbox-remove-winner"
                />
                <div className="space-y-0.5">
                  <span className="block font-medium">លុបឈ្មោះអ្នកឈ្នះចេញពីកង់បង្វិល (Auto-Exclude Winner)</span>
                  <span className="block text-[11px] text-slate-500 leading-normal">
                     នៅពេលបង្វិលរកឃើញអ្នកឈ្នះ ឈ្មោះនោះនឹងត្រូវលុបចេញពីកង់បង្វិលដោយស្វ័យប្រវត្តិ ដើម្បីកុំឱ្យជាន់គ្នាជាមួយរង្វាន់បន្ទាប់។
                  </span>
                </div>
              </label>

              {/* Congratulations text customizable config */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="block text-xs font-medium text-slate-300 font-sans">
                  សារអបអរសាទរនៅខាងក្រោមបង្អស់នៃ Poster៖
                </label>
                <input
                  type="text"
                  value={settings.congratulationsText}
                  onChange={(e) => {
                    setSettings({ ...settings, congratulationsText: e.target.value });
                    localStorage.setItem('lucky_draw_congrats', e.target.value);
                  }}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2 text-xs font-sans text-slate-300 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder="សារអបអរសាទរ..."
                  id="input-congrats-text"
                />
              </div>

            </div>

          </div>

        </div>

        {/* ROW 2: DETAILED WINNERS TILES (Gold, Silver, Bronze) */}
        <div className="bg-[#161618]/30 border border-white/5 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]" id="winners-dashboard-section">
          <WinnersPanel
            winners={winners}
            prizes={prizes}
            activeDrawPlace={activeDrawPlace}
            setActiveDrawPlace={setActiveDrawPlace}
            onUpdateWinnerImage={handleUpdateWinnerImage}
            onUpdatePrizeTitle={handleUpdatePrizeTitle}
            onClearWinner={handleClearWinnerRow}
          />
        </div>

        {/* ROW 3: ANNOUNCEMENT POSTER & EXPORTER */}
        <div className="bg-[#161618]/30 border border-white/5 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]" id="export-poster-section">
          <PosterGenerator
            winners={winners}
            prizes={prizes}
            settings={settings}
            logo={logo}
          />
        </div>

      </main>

      {/* REGIONAL KHMER FOOTER WITH HUMBLE LABELS */}
      <footer className="mt-12 border-t border-white/5 bg-[#0A0A0B] py-8 text-center text-slate-500 text-xs font-sans">
        <div className="w-full max-w-7xl mx-auto px-4 space-y-3.5 select-none">
          <p className="font-medium tracking-wide">
            © ២០២៦ កង់បង្វិលផ្សងសំណាង - បង្កើតឡើងដោយការយកចិត្តទុកដាក់ខ្ពស់សម្រាប់សហគមន៍កីឡា និងសកម្មភាពកម្សាន្ត។
          </p>
          <p className="text-slate-650 flex items-center justify-center gap-1.5">
            <span>ស្ថានភាពម៉ាស៊ីនបម្រើ៖ ● កំពុងដំណើរការធម្មតា។</span>
            <span className="text-slate-700">|</span>
            <span>សម្រួល visual ជាមួយរចនាបថ stadium និង confetti effect។</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
