/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Winner, Prize } from '../types';
import { Camera, Trophy, Upload, User, Trash2 } from 'lucide-react';
import { LanguageCode, translations } from '../utils/translations';

interface WinnersPanelProps {
  winners: Record<number, Winner | null>; // keyed by place (1, 2, 3)
  prizes: Record<number, Prize>; // keyed by place (1, 2, 3)
  activeDrawPlace: 1 | 2 | 3;
  setActiveDrawPlace: (place: 1 | 2 | 3) => void;
  onUpdateWinnerImage: (place: 1 | 2 | 3, base64Image: string) => void;
  onUpdatePrizeTitle: (place: 1 | 2 | 3, title: string) => void;
  onClearWinner: (place: 1 | 2 | 3) => void;
  lang?: LanguageCode;
}

export default function WinnersPanel({
  winners,
  prizes,
  activeDrawPlace,
  setActiveDrawPlace,
  onUpdateWinnerImage,
  onUpdatePrizeTitle,
  onClearWinner,
  lang = 'km',
}: WinnersPanelProps) {
  const t = translations[lang];
  
  // Create refs for hidden file input triggers to upload winner photos
  const fileInputRefs = {
    1: useRef<HTMLInputElement>(null),
    2: useRef<HTMLInputElement>(null),
    3: useRef<HTMLInputElement>(null),
  };

  const handleImageFileChange = (place: 1 | 2 | 3, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateWinnerImage(place, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper styles depending on physical rank place
  const getRankConfig = (place: 1 | 2 | 3) => {
    switch (place) {
      case 1:
        return {
          rankLabel: t.goldPrize,
          medalEmoji: '🥇',
          badgeColor: 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-550 text-white',
          borderColor: 'border-orange-500/80',
          textColor: 'text-orange-500',
          glowClass: 'shadow-[0_0_25px_rgba(249,115,22,0.12)] bg-[#161618] border-white/5',
          badgeText: '1st PLACE'
        };
      case 2:
        return {
          rankLabel: t.silverPrize,
          medalEmoji: '🥈',
          badgeColor: 'bg-[#2A2A2E] text-slate-200 border border-white/10',
          borderColor: 'border-slate-500/50',
          textColor: 'text-slate-300',
          glowClass: 'shadow-[0_0_15px_rgba(255,255,255,0.02)] bg-[#161618] border-white/5',
          badgeText: '2nd PLACE'
        };
      case 3:
        return {
          rankLabel: t.bronzePrize,
          medalEmoji: '🥉',
          badgeColor: 'bg-gradient-to-r from-amber-850 via-amber-750 to-amber-650 text-white',
          borderColor: 'border-amber-700/50',
          textColor: 'text-amber-500',
          glowClass: 'shadow-[0_0_15px_rgba(217,119,6,0.02)] bg-[#161618] border-white/5',
          badgeText: '3rd PLACE'
        };
    }
  };

  const renderWinnerCard = (place: 1 | 2 | 3) => {
    const winner = winners[place];
    const prize = prizes[place];
    const cfg = getRankConfig(place);
    const isActive = activeDrawPlace === place;

    return (
      <div
        key={place}
        className={`relative flex flex-col md:flex-row items-center md:items-stretch gap-5 p-5 rounded-2xl border transition-all duration-300 ${cfg.glowClass} ${
          isActive 
            ? 'ring-2 ring-orange-500/60 scale-[1.01] border-orange-500/50 bg-[#1D1D20]' 
            : 'hover:border-white/10'
        }`}
        id={`winner-card-slot-${place}`}
      >
        {/* Active Target Banner */}
        {isActive && (
          <div className="absolute -top-3 left-4 bg-gradient-to-r from-orange-650 to-amber-550 text-white text-[10px] font-bold tracking-widest px-2.5 py-0.5 rounded-full uppercase font-sans animate-bounce shadow">
            កំពុងជ្រើសរើស (Active Target)
          </div>
        )}

        {/* Winner Portrait Area (ហើយត្រូវមានកន្លែង រក្សារូបទុកសម្រាប់អ្នក ឈ្នះ) */}
        <div className="relative group/avatar flex-shrink-0 flex flex-col items-center justify-center">
          <div className={`w-24 h-24 rounded-full border-2 ${winner?.avatar ? cfg.borderColor : 'border-white/5'} bg-[#0A0A0B] flex items-center justify-center overflow-hidden transition-all duration-300 shadow-inner relative`}>
            {winner?.avatar ? (
              <img
                src={winner.avatar}
                alt={winner.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-600">
                <User className="w-10 h-10 mb-1 text-slate-700" />
                <span className="text-[9px] font-sans text-slate-500">{lang === 'km' ? 'គ្មានរូបភាព' : 'No Image'}</span>
              </div>
            )}

            {/* Click to upload portrait hover layer */}
            <button
              onClick={() => fileInputRefs[place].current?.click()}
              className="absolute inset-0 bg-[#0A0A0B]/90 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white text-[10px] transition-opacity duration-200 cursor-pointer"
              title={lang === 'km' ? 'បញ្ចូលរូបភាពអ្នកឈ្នះ' : 'Upload winner avatar'}
              id={`btn-upload-avatar-${place}`}
            >
              <Camera className="w-5 h-5 mb-1 text-orange-450" />
              <span>{lang === 'km' ? 'បញ្ចូលរូប' : 'Upload'}</span>
            </button>
          </div>

          <input
            ref={fileInputRefs[place]}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageFileChange(place, e)}
            id={`file-input-${place}`}
          />

          {/* Quick upload button outside image context */}
          <button
            onClick={() => fileInputRefs[place].current?.click()}
            className="mt-2.5 text-[10px] font-sans text-slate-400 hover:text-orange-450 flex items-center gap-1 bg-[#1E1E21] py-1 px-2.5 rounded-md hover:bg-[#2A2A2E] border border-white/5 transition"
          >
            <Upload className="w-3 h-3" />
            <span>{t.uploadPhoto}</span>
          </button>
        </div>

        {/* Winner Rank, Name & Prize Details */}
        <div className="flex-grow flex flex-col justify-between text-center md:text-left space-y-4">
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
              <span className={`self-center md:self-auto px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest ${cfg.badgeColor}`}>
                {cfg.medalEmoji} {cfg.badgeText}
              </span>
              <span className="text-slate-500 font-mono text-xs">{cfg.rankLabel}</span>
            </div>

            {winner ? (
              <div className="flex items-center justify-center md:justify-between gap-2 group/winner">
                <h3 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-wide">
                  {winner.name}
                </h3>
                {/* Clear winner button */}
                <button
                  onClick={() => onClearWinner(place)}
                  className="p-1 text-slate-500 hover:text-rose-400 bg-[#1E1E21] hover:bg-rose-950/40 rounded-md transition opacity-0 group-hover/winner:opacity-100 focus:opacity-100 cursor-pointer"
                  title={t.clearWinner}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-9 flex items-center justify-center md:justify-start">
                <span className="text-slate-500 text-sm font-sans italic animate-pulse">
                  - {t.waitingForSpin} -
                </span>
              </div>
            )}
          </div>

          {/* Prize Config input line */}
          <div className="bg-[#0A0A0B]/80 p-2.5 rounded-xl border border-white/5">
            <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1">
              {lang === 'km' ? '🎉 កំណត់រង្វាន់សម្រាប់អ្នកឈ្នះ៖' : '🎉 Set Winner Prize Name:'}
            </label>
            <input
              type="text"
              value={prize.title}
              onChange={(e) => onUpdatePrizeTitle(place, e.target.value)}
              className="w-full bg-[#161618] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-orange-450 font-sans focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-slate-700 transition"
              placeholder={lang === 'km' ? 'ឧទاهرណ៍៖ អាវកីឡា/លុយរង្វាន់...' : 'e.g. Jersey, Tech, Prize cash...'}
              id={`prize-input-${place}`}
            />
          </div>
        </div>

        {/* Action button to manually point our spinner at this place target */}
        <div className="flex flex-col justify-center items-center md:items-end border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-4">
          <button
            onClick={() => setActiveDrawPlace(place)}
            className={`w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-sans font-medium transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer
              ${isActive
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/20 hover:from-orange-500 hover:to-amber-400'
                : 'bg-[#1E1E21] hover:bg-[#2A2A2E] text-slate-300 hover:text-white border border-white/5'
              }`}
            id={`btn-target-${place}`}
          >
            <Trophy className="w-4 h-4" />
            <span>{lang === 'km' ? 'ចង់បង្វិលរង្វាន់នេះ' : 'Select Target'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-3 gap-2">
        <h2 className="text-lg font-bold font-sans text-white flex items-center gap-2">
          <span className="text-orange-500">🔥</span> 
          <span>{t.winnersTitle}</span>
        </h2>
        <span className="text-slate-500 text-xs font-mono bg-[#161618] py-1 px-2.5 rounded-md border border-white/5">
          SPIN ONCE FOR EACH SLOT
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Draw 1st place, then 2nd, then 3rd based on standard list order */}
        {renderWinnerCard(1)}
        {renderWinnerCard(2)}
        {renderWinnerCard(3)}
      </div>
    </div>
  );
}
