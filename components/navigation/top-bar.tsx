'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { UserCheck, Shield, LogOut, ChevronDown, RefreshCw, User as UserIcon } from 'lucide-react';

interface TopBarProps {
  currentUser: User;
  activeTab: 'my-compliance' | 'admin-console' | 'staff-roster' | 'reports';
  onTabChange: (tab: 'my-compliance' | 'admin-console' | 'staff-roster' | 'reports') => void;
  onLogout: () => void;
  onSwitchUser?: (user: User) => void;
  allUsers?: User[];
}

export function TopBar({
  currentUser,
  activeTab,
  onTabChange,
  onLogout,
}: TopBarProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const targetTagsLabel = [
    'ALL',
    currentUser.isAls ? 'ALS' : null,
    currentUser.isLead ? 'Lead' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single-element Brand Zone */}
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-0.5 w-5 h-5 shrink-0" aria-label="Microsoft M365">
              <div className="bg-[#F25022] w-2.5 h-2.5"></div>
              <div className="bg-[#7FBA00] w-2.5 h-2.5"></div>
              <div className="bg-[#00A4EF] w-2.5 h-2.5"></div>
              <div className="bg-[#FFB900] w-2.5 h-2.5"></div>
            </div>
            <button
              onClick={() => onTabChange(currentUser.isAdmin ? 'admin-console' : 'my-compliance')}
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-[#0078D4] transition-colors whitespace-nowrap text-left"
            >
              Read &amp; Sign Compliance
            </button>
          </div>

          {/* Zone 2: 4-6 Clean Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {!currentUser.isAdmin && (
              <button
                onClick={() => onTabChange('my-compliance')}
                className={`py-1 transition-colors whitespace-nowrap relative ${
                  activeTab === 'my-compliance'
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Compliance
                {activeTab === 'my-compliance' && (
                  <span className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-[#0078D4]" />
                )}
              </button>
            )}

            {currentUser.isAdmin && (
              <button
                onClick={() => onTabChange('admin-console')}
                className={`py-1 transition-colors whitespace-nowrap relative flex items-center gap-1.5 ${
                  activeTab === 'admin-console'
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#0078D4]" />
                Admin Console
                {activeTab === 'admin-console' && (
                  <span className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-[#0078D4]" />
                )}
              </button>
            )}

            {currentUser.isAdmin && (
              <button
                onClick={() => onTabChange('staff-roster')}
                className={`py-1 transition-colors whitespace-nowrap relative ${
                  activeTab === 'staff-roster'
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff Roster
                {activeTab === 'staff-roster' && (
                  <span className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-[#0078D4]" />
                )}
              </button>
            )}

            {currentUser.isAdmin && (
              <button
                onClick={() => onTabChange('reports')}
                className={`py-1 transition-colors whitespace-nowrap relative ${
                  activeTab === 'reports'
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Exports & Reports
                {activeTab === 'reports' && (
                  <span className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-[#0078D4]" />
                )}
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Actions & User Identity */}
          <div className="flex items-center gap-3">
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition"
              >
                <div className="w-7 h-7 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {currentUser.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div className="hidden sm:block text-left max-w-[130px] truncate">
                  <div className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{currentUser.uNumber} · {targetTagsLabel}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
                    <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Staff ID: <span className="font-mono">{currentUser.uNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-600">
                      <span>Assigned Tags:</span>
                      <span className="font-semibold">{targetTagsLabel}</span>
                    </div>
                    {currentUser.isAdmin && (
                      <div className="mt-1 text-[11px] text-purple-700 font-medium">
                        ✓ Station Administrator Access Granted
                      </div>
                    )}
                  </div>

                  {/* Locked Identity Card (Enforcing No Account Switching) */}
                  <div className="p-3 mx-2 my-2 bg-slate-50 border border-slate-200 rounded-md space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Permanently Verified Identity</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      This application session is permanently bound to <strong className="text-slate-800 font-mono">{currentUser.email}</strong>.
                      To protect compliance integrity, switching accounts is prohibited.
                    </p>
                    <div className="text-[10px] text-slate-400 border-t border-slate-200/80 pt-1 flex items-center gap-1">
                      <span>Email reassignment:</span>
                      <strong className="text-slate-600">Administrator Controlled</strong>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-100 px-3 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out (Session Invalidate)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav links */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-2 px-4 bg-slate-50 text-xs">
        {!currentUser.isAdmin && (
          <button
            onClick={() => onTabChange('my-compliance')}
            className={`py-1 px-2 rounded ${activeTab === 'my-compliance' ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            My Compliance
          </button>
        )}
        {currentUser.isAdmin && (
          <button
            onClick={() => onTabChange('admin-console')}
            className={`py-1 px-2 rounded ${activeTab === 'admin-console' ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Admin Console
          </button>
        )}
        {currentUser.isAdmin && (
          <button
            onClick={() => onTabChange('staff-roster')}
            className={`py-1 px-2 rounded ${activeTab === 'staff-roster' ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Staff Roster
          </button>
        )}
        {currentUser.isAdmin && (
          <button
            onClick={() => onTabChange('reports')}
            className={`py-1 px-2 rounded ${activeTab === 'reports' ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Reports
          </button>
        )}
      </div>
    </header>
  );
}
