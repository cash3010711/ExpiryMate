"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { ItemCard } from "@/components/ItemCard";
import { ItemModal } from "@/components/ItemModal";
import { HouseholdModal } from "@/components/HouseholdModal";
import { LineBindingModal } from "@/components/LineBindingModal";
import { PullToRefresh } from "@/components/PullToRefresh";
import {
  InventoryItem,
  ItemType,
  ItemStatus,
  sortItemsByUrgency,
  getUrgencyStatus,
} from "@/lib/expiration/engine";
import {
  getOrCreateHousehold,
  fetchHouseholdItems,
  insertItemToDb,
  updateItemInDb,
  deleteItemFromDb,
} from "@/lib/supabase/db";
import { Plus, Search, Utensils, Ticket, History, Cloud, Check, Loader2 } from "lucide-react";

// Initial seed items for fallback or initial setup
const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: "init-1",
    household_id: "hh-demo",
    type: "food",
    title: "鮮乳坊 豐香鮮乳 936ml",
    category_or_location: "冷藏室",
    expiry_date: new Date().toISOString().split("T")[0],
    quantity: 1,
    is_opened: true,
    opened_date: new Date().toISOString().split("T")[0],
    status: "active",
  },
  {
    id: "init-2",
    household_id: "hh-demo",
    type: "food",
    title: "有機特級生菜沙拉盒",
    category_or_location: "冷藏室",
    expiry_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    quantity: 2,
    is_opened: false,
    status: "active",
  },
  {
    id: "init-3",
    household_id: "hh-demo",
    type: "food",
    title: "安格斯牛五花火鍋肉片",
    category_or_location: "冷凍庫",
    expiry_date: new Date(Date.now() + 86400000 * 14).toISOString().split("T")[0],
    quantity: 3,
    is_opened: false,
    status: "active",
  },
  {
    id: "init-4",
    household_id: "hh-demo",
    type: "coupon",
    title: "全家 Let's Café 大杯經典拿鐵買一送一",
    category_or_location: "全家便利商店",
    expiry_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    quantity: 1,
    is_opened: false,
    barcode_image_url: "CPN-FAMI-882941",
    notes: "全台全家門市臨櫃出示條碼折抵，限平日兌換",
    status: "active",
  },
  {
    id: "init-5",
    household_id: "hh-demo",
    type: "coupon",
    title: "星巴克 飲料第二杯半價券",
    category_or_location: "星巴克",
    expiry_date: new Date(Date.now() + 86400000 * 20).toISOString().split("T")[0],
    quantity: 1,
    is_opened: false,
    barcode_image_url: "CPN-SBUX-994821",
    status: "active",
  },
];

export default function HomePage() {
  const [household, setHousehold] = useState(() => {
    if (typeof window !== "undefined") {
      const savedHh = localStorage.getItem("expirymate_household");
      if (savedHh) {
        try {
          return JSON.parse(savedHh);
        } catch {}
      }
    }
    return {
      name: "溫馨一家",
      inviteCode: "7K9A2M",
    };
  });

  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"syncing" | "synced" | "offline">("syncing");

  const [activeTab, setActiveTab] = useState<ItemType>("food");
  const [viewHistory, setViewHistory] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<InventoryItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("expirymate_items");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_ITEMS;
  });

  // Modal controls
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);

  // Sync state to local storage as fallback
  useEffect(() => {
    try {
      localStorage.setItem("expirymate_items", JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem("expirymate_household", JSON.stringify(household));
    } catch {}
  }, [household]);

  // Synchronize with Supabase Cloud Database
  const syncWithCloud = useCallback(async () => {
    setSyncStatus("syncing");
    try {
      const hh = await getOrCreateHousehold(household.name, household.inviteCode);
      if (hh && hh.id) {
        setHouseholdId(hh.id);
        const cloudItems = await fetchHouseholdItems(hh.id);
        if (cloudItems.length > 0) {
          setItems(cloudItems);
        } else {
          // If cloud has no items for this household yet, upload local items to cloud
          for (const item of items) {
            await insertItemToDb({
              household_id: hh.id,
              type: item.type,
              title: item.title,
              category_or_location: item.category_or_location,
              expiry_date: item.expiry_date,
              quantity: item.quantity,
              is_opened: item.is_opened,
              opened_date: item.opened_date || null,
              barcode_image_url: item.barcode_image_url || null,
              notes: item.notes || null,
              status: item.status,
            });
          }
          const fresh = await fetchHouseholdItems(hh.id);
          if (fresh.length > 0) {
            setItems(fresh);
          }
        }
        setSyncStatus("synced");
        return;
      }
    } catch (err) {
      console.warn("Cloud sync failed, continuing offline/local:", err);
    }
    setSyncStatus("offline");
  }, [household.name, household.inviteCode]);

  useEffect(() => {
    syncWithCloud();
  }, [syncWithCloud]);

  // Handle status update (Active, Consumed, Discarded, Restore)
  const handleStatusChange = async (id: string, newStatus: ItemStatus) => {
    // 1. Optimistic local update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );

    // 2. Sync to Supabase
    await updateItemInDb(id, { status: newStatus });
  };

  // Handle quantity update (Quick [-1] decrement or stepper)
  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    // 1. Optimistic local update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
    );

    // 2. Sync to Supabase
    await updateItemInDb(id, { quantity: newQuantity });
  };

  // Handle quick mark opened from card
  const handleMarkOpened = async (id: string, openedDate?: string) => {
    const targetDate = openedDate || new Date().toISOString().split("T")[0];

    // 1. Optimistic local update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_opened: true, opened_date: targetDate } : item
      )
    );

    // 2. Sync to Supabase
    await updateItemInDb(id, { is_opened: true, opened_date: targetDate });
  };

  // Handle Item Save (Add or Edit)
  const handleSaveItem = async (itemData: Partial<InventoryItem>) => {
    if (itemData.id) {
      // Edit existing
      setItems((prev) =>
        prev.map((i) => (i.id === itemData.id ? ({ ...i, ...itemData } as InventoryItem) : i))
      );
      await updateItemInDb(itemData.id, itemData);
    } else {
      // Add new
      const targetHhId = householdId || "hh-demo";
      const newItemDraft = {
        household_id: targetHhId,
        type: itemData.type || activeTab,
        title: itemData.title || "未命名物品",
        category_or_location: itemData.category_or_location || "",
        expiry_date: itemData.expiry_date || new Date().toISOString().split("T")[0],
        quantity: itemData.quantity || 1,
        is_opened: itemData.is_opened || false,
        opened_date: itemData.is_opened
          ? itemData.opened_date || new Date().toISOString().split("T")[0]
          : null,
        barcode_image_url: itemData.barcode_image_url || null,
        notes: itemData.notes || null,
        status: "active" as const,
      };

      // Optimistic update with temporary ID
      const tempId = `temp-${Date.now()}`;
      const tempItem: InventoryItem = {
        ...newItemDraft,
        id: tempId,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [tempItem, ...prev]);

      // Cloud Insert
      setSyncStatus("syncing");
      const dbItem = await insertItemToDb(newItemDraft);
      if (dbItem) {
        setItems((prev) => prev.map((item) => (item.id === tempId ? dbItem : item)));
        setSyncStatus("synced");
      } else {
        setSyncStatus("offline");
      }
    }
    setEditingItem(null);
  };

  // Filtered and sorted items
  const displayedItems = useMemo(() => {
    const targetStatusList: ItemStatus[] = viewHistory
      ? ["consumed", "discarded"]
      : ["active"];

    return sortItemsByUrgency(
      items.filter((item) => {
        const matchesType = item.type === activeTab;
        const matchesStatus = targetStatusList.includes(item.status);
        const matchesSearch =
          searchQuery.trim() === "" ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.category_or_location &&
            item.category_or_location.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesType && matchesStatus && matchesSearch;
      })
    );
  }, [items, activeTab, viewHistory, searchQuery]);

  // Statistics for current tab active items
  const stats = useMemo(() => {
    const tabActiveItems = items.filter((i) => i.type === activeTab && i.status === "active");
    let red = 0;
    let yellow = 0;
    let green = 0;

    for (const item of tabActiveItems) {
      const u = getUrgencyStatus(item.expiry_date);
      if (u.status === "red") red++;
      else if (u.status === "yellow") yellow++;
      else green++;
    }

    return { total: tabActiveItems.length, red, yellow, green };
  }, [items, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Top Navbar */}
      <Navbar
        householdName={household.name}
        inviteCode={household.inviteCode}
        onOpenHousehold={() => setIsHouseholdModalOpen(true)}
        onOpenLineBinding={() => setIsLineModalOpen(true)}
      />

      <main className="max-w-md w-full mx-auto px-4 pt-4 flex-1">
        <PullToRefresh onRefresh={syncWithCloud}>
          {/* Cloud Sync Status Indicator */}
        <div className="flex items-center justify-between text-[11px] px-2 py-1 mb-2 text-slate-500 bg-white rounded-lg border border-slate-200/60 shadow-xs">
          <span className="flex items-center gap-1.5 font-medium">
            {syncStatus === "syncing" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>雲端同步中...</span>
              </>
            )}
            {syncStatus === "synced" && (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Supabase 雲端已即時同步</span>
              </>
            )}
            {syncStatus === "offline" && (
              <>
                <Cloud className="w-3.5 h-3.5 text-amber-500" />
                <span>本機離線模式 (待雲端連線)</span>
              </>
            )}
          </span>
          <span className="text-slate-400">家庭代碼: #{household.inviteCode}</span>
        </div>

        {/* Dual-Tab Navigation: Food vs Coupons */}
        <div className="grid grid-cols-2 bg-slate-200/80 p-1 rounded-2xl mb-4 shadow-inner">
          <button
            onClick={() => {
              setActiveTab("food");
              setViewHistory(false);
            }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              activeTab === "food"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>🍎 食物冰箱</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("coupon");
              setViewHistory(false);
            }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              activeTab === "coupon"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>🎫 優惠券 / 票券</span>
          </button>
        </div>

        {/* Urgency Summary Bar */}
        {!viewHistory && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-center">
              <span className="block text-[11px] font-medium text-red-600">已過期</span>
              <span className="text-lg font-extrabold text-red-700">{stats.red}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
              <span className="block text-[11px] font-medium text-amber-700">3天內到期</span>
              <span className="text-lg font-extrabold text-amber-800">{stats.yellow}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
              <span className="block text-[11px] font-medium text-emerald-700">充裕安全</span>
              <span className="text-lg font-extrabold text-emerald-800">{stats.green}</span>
            </div>
          </div>
        )}

        {/* Search & History Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`搜尋${activeTab === "food" ? "食品名稱、冷藏冷凍..." : "優惠券、品牌通路..."}`}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => setViewHistory(!viewHistory)}
            className={`px-3 py-2.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition ${
              viewHistory
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{viewHistory ? "返回在席" : "歷史紀錄"}</span>
          </button>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {viewHistory
              ? `歷史封存 (${displayedItems.length} 項)`
              : `在席清單 (依即期程度排序 · 共 ${displayedItems.length} 項)`}
          </h2>
          <span className="text-[11px] text-slate-400">
            {activeTab === "food" ? "自動優先顯示紅/黃標" : "點擊可放大條碼"}
          </span>
        </div>

        {/* Items List */}
        {displayedItems.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 my-6">
            <p className="text-sm font-medium mb-1">
              {viewHistory ? "目前沒有歷史封存項目" : `目前沒有任何${activeTab === "food" ? "食物" : "優惠券"}`}
            </p>
            {!viewHistory && (
              <p className="text-xs text-slate-400">
                點擊右下角綠色「+」按鈕開始記錄吧！
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onStatusChange={handleStatusChange}
                onUpdateQuantity={handleUpdateQuantity}
                onMarkOpened={handleMarkOpened}
                onEdit={(target) => {
                  setEditingItem(target);
                  setIsItemModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
        </PullToRefresh>
      </main>

      {/* Floating Action Button (+) */}
      {!viewHistory && (
        <button
          onClick={() => {
            setEditingItem(null);
            setIsItemModalOpen(true);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all z-40"
          aria-label="新增項目"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Item Modal (Add / Edit) */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
        initialType={activeTab}
      />

      {/* Household Modal */}
      <HouseholdModal
        isOpen={isHouseholdModalOpen}
        onClose={() => setIsHouseholdModalOpen(false)}
        householdName={household.name}
        inviteCode={household.inviteCode}
        onSwitchHousehold={(newHh) => {
          setHousehold(newHh);
        }}
      />

      {/* LINE Binding Modal */}
      <LineBindingModal
        isOpen={isLineModalOpen}
        onClose={() => setIsLineModalOpen(false)}
        householdName={household.name}
      />
    </div>
  );
}
