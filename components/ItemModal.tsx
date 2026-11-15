"use client";

import React, { useState, useEffect } from "react";
import { InventoryItem, ItemType } from "@/lib/expiration/engine";
import { SmartCaptureModal } from "./SmartCaptureModal";
import { X, Sparkles, Plus, Check } from "lucide-react";

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<InventoryItem>) => void;
  initialType?: ItemType;
  editingItem?: InventoryItem | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialType = "food",
  editingItem = null,
}) => {
  const [type, setType] = useState<ItemType>(initialType);
  const [title, setTitle] = useState("");
  const [categoryOrLocation, setCategoryOrLocation] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isOpened, setIsOpened] = useState(false);
  const [openedDate, setOpenedDate] = useState("");
  const [barcodeImageUrl, setBarcodeImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type);
      setTitle(editingItem.title);
      setCategoryOrLocation(editingItem.category_or_location || "");
      setExpiryDate(editingItem.expiry_date);
      setQuantity(editingItem.quantity || 1);
      setIsOpened(editingItem.is_opened || false);
      setOpenedDate(
        editingItem.opened_date ||
          (editingItem.is_opened ? new Date().toISOString().split("T")[0] : "")
      );
      setBarcodeImageUrl(editingItem.barcode_image_url || "");
      setNotes(editingItem.notes || "");
    } else {
      setType(initialType);
      setTitle("");
      setCategoryOrLocation(initialType === "food" ? "冷藏室" : "便利商店");
      // Default expiry date: 7 days from now
      const defaultDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      setExpiryDate(defaultDate);
      setQuantity(1);
      setIsOpened(false);
      setOpenedDate(new Date().toISOString().split("T")[0]);
      setBarcodeImageUrl("");
      setNotes("");
    }
  }, [editingItem, initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !expiryDate) return;

    onSave({
      id: editingItem ? editingItem.id : undefined,
      type,
      title: title.trim(),
      category_or_location: categoryOrLocation.trim() || null,
      expiry_date: expiryDate,
      quantity,
      is_opened: isOpened,
      opened_date: isOpened ? (openedDate || new Date().toISOString().split("T")[0]) : null,
      barcode_image_url: barcodeImageUrl.trim() || null,
      notes: notes.trim() || null,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="font-bold text-slate-800 text-lg mb-4">
            {editingItem ? "編輯物品" : "新增到期物品"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            {!editingItem && (
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setType("food");
                    setCategoryOrLocation("冷藏室");
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    type === "food"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🍱 食品食材
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType("coupon");
                    setCategoryOrLocation("連鎖超商");
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    type === "coupon"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🎫 優惠券 / 兌換券
                </button>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {type === "food" ? "食品名稱" : "優惠券/票券名稱"} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "food" ? "例如: 全脂鮮奶 936ml" : "例如: 7-11 大杯拿鐵買一送一"}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Expiration Date with Smart Capture trigger */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  有效到期日 *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCaptureModal(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  智慧拍照辨識
                </button>
              </div>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Food specific fields */}
            {type === "food" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    存放位置
                  </label>
                  <select
                    value={categoryOrLocation}
                    onChange={(e) => setCategoryOrLocation(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="冷藏室">冷藏室 (Refrigerator)</option>
                    <option value="冷凍庫">冷凍庫 (Freezer)</option>
                    <option value="常溫儲物櫃">常溫儲物櫃 (Pantry)</option>
                    <option value="零食區">零食區</option>
                    <option value="其他">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    數量
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="col-span-2 space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_opened"
                      checked={isOpened}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsOpened(checked);
                        if (checked && !openedDate) {
                          setOpenedDate(new Date().toISOString().split("T")[0]);
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="is_opened" className="text-xs text-slate-700 font-medium cursor-pointer">
                      已開封 (提醒盡速食用)
                    </label>
                  </div>

                  {isOpened && (
                    <div className="pl-6 pt-1">
                      <label htmlFor="opened_date_input" className="block text-[11px] font-semibold text-slate-600 mb-1">
                        開封日期
                      </label>
                      <input
                        type="date"
                        id="opened_date_input"
                        value={openedDate}
                        onChange={(e) => setOpenedDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Coupon specific fields */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      品牌 / 通路
                    </label>
                    <input
                      type="text"
                      value={categoryOrLocation}
                      onChange={(e) => setCategoryOrLocation(e.target.value)}
                      placeholder="例如: 麥當勞, 全聯"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      數量 / 張數
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    條碼序號 / 兌換代碼
                  </label>
                  <input
                    type="text"
                    value={barcodeImageUrl}
                    onChange={(e) => setBarcodeImageUrl(e.target.value)}
                    placeholder="點擊智慧辨識掃描或輸入代碼"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                備註說明 (選填)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如: 買一送一限平日使用、開瓶後請3天內飲用完畢"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
              >
                {editingItem ? "儲存修改" : "新增物品"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SmartCaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        onDetected={(data) => {
          if (data.expiryDate) setExpiryDate(data.expiryDate);
          if (data.barcode) setBarcodeImageUrl(data.barcode);
        }}
      />
    </>
  );
};
