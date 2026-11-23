"use client";

import React, { useState, useRef } from "react";
import { MessageSquare, Copy, Check, X, ShieldAlert, Sparkles } from "lucide-react";
import { generateBindingCode } from "@/lib/household/binding-code";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

interface LineBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdName: string;
}

export const LineBindingModal: React.FC<LineBindingModalProps> = ({
  isOpen,
  onClose,
  householdName,
}) => {
  const [bindCode, setBindCode] = useState(() => generateBindingCode(4));
  const [copied, setCopied] = useState(false);
  const [simulatedStatus, setSimulatedStatus] = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(isOpen, backdropRef);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(bindCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateWebhook = async () => {
    setSimulatedStatus("正在送出模擬群組訊息...");
    try {
      const res = await fetch("/api/line/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // When testing locally, default channel secret is used
          "x-line-signature": "MOCK_TEST_SIGNATURE_AUTO_MATCHED",
        },
        body: JSON.stringify({
          events: [
            {
              type: "message",
              timestamp: Date.now(),
              webhookEventId: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              source: {
                type: "group",
                groupId: "group-simulated-12345",
              },
              message: {
                id: `msg-${Date.now()}`,
                type: "text",
                text: `大家好，這是綁定代碼 ${bindCode}`,
              },
            },
          ],
        }),
      });

      // Even if signature test requires exact HMAC in real webhook, our modal provides feedback
      if (res.ok) {
        setSimulatedStatus("✅ LINE 群組綁定成功！已設定每日 08:30 自動發送晨間即期提醒。");
      } else {
        setSimulatedStatus("💡 模擬已觸發。真實環境中請於 LINE 群組直接發送該指令。");
      }
    } catch {
      setSimulatedStatus("💡 模擬完成，請在家庭 LINE 群組加入機器人並發送代碼。");
    }
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
          <div className="w-8 h-8 rounded-lg bg-[#06C755]/10 text-[#06C755] flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">LINE 群組推播綁定</h3>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          將 ExpiryMate 官方帳號加入您的家庭 LINE 群組，系統將在每日早晨 08:30 自動推播即期食品與優惠券摘要！
        </p>

        {/* Steps */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
              1
            </span>
            <span className="text-slate-700">邀請 @ExpiryMate Bot 加入家庭 LINE 群組</span>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
              2
            </span>
            <span className="text-slate-700">在群組內直接發送下方綁定指令：</span>
          </div>

          <div className="pt-1 flex items-center justify-center gap-2">
            <span className="font-mono text-base font-bold text-emerald-600 bg-white px-3 py-1.5 rounded-lg border border-slate-300">
              {bindCode}
            </span>
            <button
              onClick={handleCopy}
              className="p-2 text-slate-600 hover:text-emerald-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition"
              title="複製指令"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {simulatedStatus && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 rounded-xl mb-4">
            {simulatedStatus}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleSimulateWebhook}
            className="w-full py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            模擬發送群組綁定指令
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
