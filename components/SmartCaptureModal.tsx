"use client";

import React, { useState } from "react";
import { Camera, QrCode, FileText, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { extractExpirationDate } from "@/lib/ocr/date-parser";

interface SmartCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (data: { expiryDate?: string; barcode?: string }) => void;
}

export const SmartCaptureModal: React.FC<SmartCaptureModalProps> = ({
  isOpen,
  onClose,
  onDetected,
}) => {
  const [inputText, setInputText] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleParseOCR = (sample?: string) => {
    const textToParse = sample || inputText;
    const res = extractExpirationDate(textToParse);
    if (res.success && res.formattedDate) {
      setFeedback({
        type: "success",
        msg: `成功辨識效期: ${res.formattedDate} (原文字: "${res.rawMatch}")`,
      });
      onDetected({ expiryDate: res.formattedDate });
    } else {
      setFeedback({
        type: "error",
        msg: res.error || "未偵測到清晰效期，請手動確認或調整拍照角度",
      });
    }
  };

  const handleSimulateBarcode = (code: string) => {
    setBarcodeInput(code);
    setFeedback({
      type: "success",
      msg: `已讀取條碼憑證: ${code}`,
    });
    onDetected({ barcode: code });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">智慧辨識 (OCR / 條碼)</h3>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          支援食品外包裝效期照片辨識 (OCR) 與優惠券條碼/QR Code 快速掃描。
        </p>

        {/* Quick OCR Samples */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            效期辨識測試或文字輸入:
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="例如: EXP 2025/12/31 或 113.10.25"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleParseOCR()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg font-medium transition"
            >
              解析
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-400 py-0.5">範例:</span>
            <button
              onClick={() => {
                setInputText("有效日期: 2025/11/20");
                handleParseOCR("有效日期: 2025/11/20");
              }}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded"
            >
              2025/11/20
            </button>
            <button
              onClick={() => {
                setInputText("民國 113.12.31");
                handleParseOCR("民國 113.12.31");
              }}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded"
            >
              民國 113.12.31
            </button>
            <button
              onClick={() => {
                setInputText("EXP: 2026.06.15");
                handleParseOCR("EXP: 2026.06.15");
              }}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded"
            >
              EXP: 2026.06.15
            </button>
          </div>
        </div>

        {/* Barcode section */}
        <div className="mb-4 pt-3 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            優惠券條碼快速填入:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleSimulateBarcode("CPN-" + Math.floor(100000 + Math.random() * 900000))}
              className="w-full flex items-center justify-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-medium transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              掃描 / 產生隨機條碼代號
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-start gap-2 mb-4 ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-xl text-xs transition"
        >
          完成並返回表單
        </button>
      </div>
    </div>
  );
};
