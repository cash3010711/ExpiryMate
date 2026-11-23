"use client";

import React, { useState, useRef } from "react";
import { Users, Copy, Check, UserPlus, Home, X } from "lucide-react";
import { validateInviteCode, normalizeInviteCode, generateInviteCode } from "@/lib/household/invite-code";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

interface HouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdName: string;
  inviteCode: string;
  onSwitchHousehold: (newHousehold: { name: string; inviteCode: string }) => void;
}

export const HouseholdModal: React.FC<HouseholdModalProps> = ({
  isOpen,
  onClose,
  householdName,
  inviteCode,
  onSwitchHousehold,
}) => {
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [mode, setMode] = useState<"view" | "join" | "create">("view");

  const backdropRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(isOpen, backdropRef);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeInviteCode(joinCode);
    if (!validateInviteCode(normalized)) {
      setErrorMsg("請輸入有效的 6 位英數字邀請碼 (不分大小寫)");
      return;
    }

    onSwitchHousehold({
      name: `共享家庭 (${normalized})`,
      inviteCode: normalized,
    });
    setErrorMsg("");
    onClose();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;

    // Generate fresh cryptographically-safe 6-char code
    const generated = generateInviteCode();
    onSwitchHousehold({
      name: newHouseholdName.trim(),
      inviteCode: generated,
    });
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overscroll-contain"
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overscroll-contain">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">家庭共享設定</h3>
        </div>

        {mode === "view" && (
          <div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-center">
              <span className="text-xs text-slate-500 block mb-1">當前家庭名稱</span>
              <span className="font-bold text-slate-800 text-base block mb-3">{householdName}</span>

              <span className="text-xs text-slate-500 block mb-1">6 位數家庭邀請碼</span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xl font-bold tracking-widest text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-lg border border-emerald-200">
                  {inviteCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                  title="複製邀請碼"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                家人下載或開啟 ExpiryMate 輸入此代碼即可共同管理效期清單。
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMode("join")}
                className="flex-1 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition flex items-center justify-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                加入其他家庭
              </button>
              <button
                onClick={() => setMode("create")}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-1"
              >
                <Home className="w-3.5 h-3.5" />
                建立新家庭
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                請輸入 6 位數邀請碼
              </label>
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setErrorMsg("");
                }}
                placeholder="例如: 8K9B2A"
                className="w-full text-center font-mono text-lg tracking-widest uppercase border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              />
              {errorMsg && <p className="text-xs text-red-500 mt-1">{errorMsg}</p>}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("view")}
                className="w-1/3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
              >
                返回
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                確認加入
              </button>
            </div>
          </form>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                新家庭名稱
              </label>
              <input
                type="text"
                required
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                placeholder="例如: 快樂小家庭"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("view")}
                className="w-1/3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
              >
                返回
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                立即建立
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
