"use client";

import React, { useState } from "react";
import { InventoryItem, getUrgencyStatus, formatOpenedBadge } from "@/lib/expiration/engine";
import { Check, Trash2, RotateCcw, QrCode, AlertCircle, Clock } from "lucide-react";

interface ItemCardProps {
  item: InventoryItem;
  onStatusChange: (id: string, newStatus: "active" | "consumed" | "discarded") => void;
  onEdit?: (item: InventoryItem) => void;
  onUpdateQuantity?: (id: string, newQuantity: number) => void;
  onMarkOpened?: (id: string, openedDate?: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onStatusChange,
  onEdit,
  onUpdateQuantity,
  onMarkOpened,
}) => {
  const [showBarcode, setShowBarcode] = useState(false);
  const urgency = getUrgencyStatus(item.expiry_date);

  const isFood = item.type === "food";
  const isHistory = item.status !== "active";

  return (
    <div
      className={`relative bg-white rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
        urgency.status === "red"
          ? "border-red-200 bg-red-50/20"
          : urgency.status === "yellow"
          ? "border-amber-200 bg-amber-50/20"
          : "border-slate-200"
      }`}
    >
      {/* Top row: Urgency badge and title */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${urgency.badgeColor}`}
            >
              <Clock className="w-3 h-3" />
              {urgency.label}
            </span>
            {isFood && item.is_opened && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                {formatOpenedBadge(item.opened_date)}
              </span>
            )}
            {isFood && !item.is_opened && item.status === "active" && onMarkOpened && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const today = new Date().toISOString().split("T")[0];
                  onMarkOpened(item.id, today);
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium transition cursor-pointer"
                title="一鍵標記已開封"
                aria-label="一鍵標記已開封"
              >
                標記開封
              </button>
            )}
            <span className="text-[11px] text-slate-400">
              到期日: {item.expiry_date}
            </span>
          </div>

          <h3
            onClick={() => onEdit && onEdit(item)}
            className={`font-semibold text-slate-800 text-base cursor-pointer hover:text-emerald-600 ${
              isHistory ? "line-through text-slate-400" : ""
            }`}
          >
            {item.title}
          </h3>
        </div>

        {/* Quantity & Decrement */}
        {item.quantity > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-1 rounded-md">
              x{item.quantity}
            </span>
            {item.status === "active" && onUpdateQuantity && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(item.id, item.quantity - 1);
                }}
                className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-1 rounded-md transition active:scale-95 cursor-pointer shadow-xs"
                title="快速扣減 1"
                aria-label="快速扣減 1"
              >
                -1
              </button>
            )}
          </div>
        )}
      </div>

      {/* Attributes row */}
      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {item.category_or_location && (
          <span className="inline-flex items-center gap-1">
            <span className="text-slate-400">{isFood ? "存放處:" : "品牌/通路:"}</span>
            <span className="font-medium text-slate-700">{item.category_or_location}</span>
          </span>
        )}
        {item.notes && (
          <span className="text-slate-500 italic max-w-full truncate">
            {item.notes}
          </span>
        )}
      </div>

      {/* Barcode button if coupon has barcode or image */}
      {item.barcode_image_url && (
        <div className="mb-3">
          <button
            onClick={() => setShowBarcode(true)}
            className="text-xs inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg font-medium transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            查看條碼 / 兌換憑證
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        {item.status === "active" ? (
          <>
            <button
              onClick={() => onStatusChange(item.id, "discarded")}
              className="text-xs text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition flex items-center gap-1"
              title="標記已丟棄"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>丟棄</span>
            </button>
            <button
              onClick={() => onStatusChange(item.id, "consumed")}
              className="text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isFood ? "已食用" : "已兌換"}</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => onStatusChange(item.id, "active")}
            className="text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>復原至清單</span>
          </button>
        )}
      </div>

      {/* Barcode Modal Dialog */}
      {showBarcode && (
        <div
          role="dialog"
          aria-label="條碼憑證"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowBarcode(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-bold text-slate-800 text-lg mb-1">{item.title}</h4>
            <p className="text-xs text-slate-500 mb-4">請向店員出示此條碼進行折抵</p>
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center mb-4">
              <QrCode className="w-36 h-36 text-slate-800" />
              <span className="font-mono text-sm tracking-widest text-slate-700 mt-2">
                {item.barcode_image_url}
              </span>
            </div>
            <button
              onClick={() => setShowBarcode(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-xl text-sm transition"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
