"use client";

import React from "react";
import { Users, Bell, Sparkles } from "lucide-react";

interface NavbarProps {
  householdName: string;
  inviteCode: string;
  onOpenHousehold: () => void;
  onOpenLineBinding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  householdName,
  inviteCode,
  onOpenHousehold,
  onOpenLineBinding,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            E
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">ExpiryMate</h1>
            <button
              onClick={onOpenHousehold}
              className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1"
            >
              <Users className="w-3 h-3" />
              <span>{householdName}</span>
              <span className="font-mono bg-slate-100 px-1 rounded text-[10px]">#{inviteCode}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLineBinding}
            aria-label="LINE 群組設定"
            className="p-2 rounded-full text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition"
          >
            <Bell className="w-5 h-5 text-[#06C755]" />
          </button>
        </div>
      </div>
    </header>
  );
};
