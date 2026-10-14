'use client';

import React from 'react';

interface AppBannerProps {
  className?: string;
  compact?: boolean;
}

export function AppBanner({ className = '', compact = false }: AppBannerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-[#00050f] via-[#000814] to-[#000308] text-white border border-blue-950/80 ${
        compact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'
      } ${className}`}
    >
      {/* Background Graphic Lines & Glowing Accents (matching uploaded image design) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gold diagonal vector cuts */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-amber-500/10 via-amber-400/5 to-transparent transform -skew-x-12 translate-x-1/4" />
        <div className="absolute -top-12 -right-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-400/15 rounded-full blur-2xl" />
        
        {/* Metallic gold accent border lines */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
        <div className="absolute top-3 right-8 w-40 h-[1px] bg-gradient-to-r from-transparent via-amber-300 to-transparent transform rotate-12" />
        <div className="absolute bottom-4 left-6 w-52 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent transform -rotate-6" />

        {/* Center lens flare star sparkle */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-1 h-12 bg-amber-200/80 rounded-full blur-[1px] transform rotate-45" />
          <div className="w-12 h-1 bg-amber-200/80 rounded-full blur-[1px] transform rotate-45 -translate-x-5 -translate-y-6" />
        </div>
      </div>

      {/* Banner Content Container */}
      <div className="relative z-10 flex flex-col gap-4">
        {/* Top-Left Lufthansa Group White Badge */}
        <div className="bg-white text-[#05164d] rounded-tr-2xl rounded-bl-lg rounded-tl-xl rounded-br-md px-3.5 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2.5 shadow-md w-fit border border-slate-200">
          {/* Lufthansa Crane Logo Icon */}
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-[#05164d] flex items-center justify-center p-0.5 shrink-0 bg-[#05164d]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
              <path d="M15,50 A35,35 0 1,0 85,50 A35,35 0 1,0 15,50 Z" fill="none" stroke="currentColor" strokeWidth="7" />
              <path d="M25,52 C38,45 56,32 76,25 C66,36 53,46 42,56 C56,56 70,54 83,52 C68,61 48,67 30,67 C24,67 21,60 25,52 Z M48,32 C55,36 62,42 68,48 C60,50 52,48 48,32 Z" />
            </svg>
          </div>
          <span className="font-black text-[#05164d] text-xs sm:text-sm tracking-tight font-sans">
            Lufthansa Group
          </span>
        </div>

        {/* Title & Subtitle Stack */}
        <div className="space-y-1 sm:space-y-1.5">
          <h1
            className={`font-black text-white tracking-tight leading-none drop-shadow-md ${
              compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'
            }`}
          >
            Read X Compliance
          </h1>
          <p
            className={`font-extrabold text-amber-400 tracking-wide uppercase drop-shadow-sm ${
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg md:text-xl'
            }`}
          >
            DELSM - Lufthansa Group Delhi
          </p>
        </div>
      </div>
    </div>
  );
}
