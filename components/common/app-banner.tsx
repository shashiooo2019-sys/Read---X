'use client';

import React from 'react';

interface AppBannerProps {
  className?: string;
  compact?: boolean;
}

export function AppBanner({ className = '', compact = false }: AppBannerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-xl bg-[#05164d] text-white border border-blue-950/80 ${
        compact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'
      } ${className}`}
    >
      {/* Background Graphic Lines & Glowing Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Simplified background styling */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 via-white/2 to-transparent transform -skew-x-12 translate-x-1/4" />
      </div>

      {/* Banner Content Container */}
      <div className="relative z-10 flex flex-col gap-4">
        {/* Title & Subtitle Stack */}
        <div className="space-y-1 sm:space-y-1.5">
          <h1
            className={`font-bold text-white tracking-tight leading-none drop-shadow-md ${
              compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'
            }`}
          >
            READ X COMPLIANCE
          </h1>
          <p
            className={`font-bold text-[#ffcf00] tracking-wide uppercase drop-shadow-sm ${
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg md:text-xl'
            }`}
          >
            DELSM - LUFTHANSA GROUP DELHI
          </p>
        </div>
      </div>
    </div>
  );
}
