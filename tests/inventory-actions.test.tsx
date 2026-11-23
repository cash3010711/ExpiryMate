import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ItemCard } from "@/components/ItemCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ItemModal } from "@/components/ItemModal";
import { InventoryItem } from "@/lib/expiration/engine";

describe("Inventory Card Quick Actions & Badges", () => {
  const baseItem: InventoryItem = {
    id: "item-1",
    household_id: "hh-1",
    type: "food",
    title: "鮮乳坊鮮奶",
    category_or_location: "冷藏室",
    expiry_date: "2026-11-20",
    quantity: 4,
    is_opened: false,
    status: "active",
  };

  it("renders [-1] button when active and quantity > 1, and clicking it calls onUpdateQuantity", () => {
    const handleUpdateQuantity = vi.fn();
    const handleStatusChange = vi.fn();

    render(
      <ItemCard
        item={baseItem}
        onStatusChange={handleStatusChange}
        onUpdateQuantity={handleUpdateQuantity}
      />
    );

    // Quantity badge shows x4
    expect(screen.getByText("x4")).toBeDefined();

    // [-1] button is visible
    const decButton = screen.getByRole("button", { name: "快速扣減 1" });
    expect(decButton).toBeDefined();

    fireEvent.click(decButton);
    expect(handleUpdateQuantity).toHaveBeenCalledTimes(1);
    expect(handleUpdateQuantity).toHaveBeenCalledWith("item-1", 3);
  });

  it("hides [-1] button and quantity badge when quantity is 1", () => {
    const itemQty1: InventoryItem = { ...baseItem, quantity: 1 };
    const handleUpdateQuantity = vi.fn();

    render(
      <ItemCard
        item={itemQty1}
        onStatusChange={vi.fn()}
        onUpdateQuantity={handleUpdateQuantity}
      />
    );

    // No x1 badge
    expect(screen.queryByText("x1")).toBeNull();
    // No [-1] button
    expect(screen.queryByRole("button", { name: "快速扣減 1" })).toBeNull();
  });

  it("hides [-1] button when item status is not active (e.g. consumed)", () => {
    const consumedItem: InventoryItem = { ...baseItem, status: "consumed", quantity: 3 };

    render(
      <ItemCard
        item={consumedItem}
        onStatusChange={vi.fn()}
        onUpdateQuantity={vi.fn()}
      />
    );

    // Shows x3
    expect(screen.getByText("x3")).toBeDefined();
    // But hides [-1] button
    expect(screen.queryByRole("button", { name: "快速扣減 1" })).toBeNull();
  });

  it("renders '標記開封' button for active unopened food and triggers onMarkOpened", () => {
    const handleMarkOpened = vi.fn();

    render(
      <ItemCard
        item={baseItem}
        onStatusChange={vi.fn()}
        onMarkOpened={handleMarkOpened}
      />
    );

    const markBtn = screen.getByRole("button", { name: "一鍵標記已開封" });
    expect(markBtn).toBeDefined();
    expect(markBtn.textContent).toContain("標記開封");

    fireEvent.click(markBtn);
    expect(handleMarkOpened).toHaveBeenCalledTimes(1);
    expect(handleMarkOpened).toHaveBeenCalledWith("item-1", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("displays formatted opened badge when item is already opened", () => {
    const openedItem: InventoryItem = {
      ...baseItem,
      is_opened: true,
      opened_date: "2026-11-14",
    };

    render(
      <ItemCard
        item={openedItem}
        onStatusChange={vi.fn()}
      />
    );

    // Should display opened badge instead of "標記開封" button
    expect(screen.queryByRole("button", { name: "一鍵標記已開封" })).toBeNull();
    const badge = screen.getByText(/已開封/);
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("已開封 (11/14");
  });

  it("does not show '標記開封' for coupons", () => {
    const couponItem: InventoryItem = {
      ...baseItem,
      type: "coupon",
      is_opened: false,
    };

    render(
      <ItemCard
        item={couponItem}
        onStatusChange={vi.fn()}
        onMarkOpened={vi.fn()}
      />
    );

    expect(screen.queryByText("標記開封")).toBeNull();
  });
});

describe("ItemModal Opened Date Support", () => {
  it("toggles opened date input when '已開封' checkbox is checked", () => {
    const handleSave = vi.fn();

    render(
      <ItemModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        initialType="food"
      />
    );

    const checkbox = screen.getByLabelText(/已開封 \(提醒盡速食用\)/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(screen.queryByLabelText("開封日期")).toBeNull();

    // Check the box
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    const dateInput = screen.getByLabelText("開封日期") as HTMLInputElement;
    expect(dateInput).toBeDefined();
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("locks body scroll when isOpen is true and restores it when unmounted", () => {
    document.body.style.overflow = "auto";

    const { unmount } = render(
      <ItemModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });
});

describe("PullToRefresh Gesture & States", () => {
  beforeEach(() => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, "vibrate", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  it("renders children and defaults to idle state with zero indicator height", () => {
    const { container } = render(
      <PullToRefresh onRefresh={vi.fn()}>
        <div data-testid="feed-content">Feed Content</div>
      </PullToRefresh>
    );

    expect(screen.getByTestId("feed-content")).toBeDefined();
    const indicator = screen.getByTestId("pull-to-refresh-indicator");
    expect(indicator.getAttribute("data-status")).toBe("idle");
    expect(indicator.style.height).toBe("0px");
  });

  it("handles touch gestures: pulling, reaching threshold to ready, vibration and executing onRefresh", async () => {
    const onRefresh = vi.fn().mockImplementation(() => Promise.resolve());

    const { container } = render(
      <PullToRefresh onRefresh={onRefresh} threshold={50} maxPull={80}>
        <div data-testid="feed-content">List Content</div>
      </PullToRefresh>
    );

    const touchArea = container.firstChild as HTMLElement;
    const indicator = screen.getByTestId("pull-to-refresh-indicator");

    // 1. Touch Start at top
    fireEvent.touchStart(touchArea, {
      touches: [{ clientY: 100 }],
    });

    // 2. Touch Move down 50px (damped distance: 50 * 0.45 = 22.5px < 50 threshold) -> 'pulling'
    fireEvent.touchMove(touchArea, {
      touches: [{ clientY: 150 }],
    });
    expect(indicator.getAttribute("data-status")).toBe("pulling");
    expect(screen.getByText("下拉刷新")).toBeDefined();

    // 3. Touch Move down further (diff = 150px * 0.45 = 67.5px >= 50 threshold) -> 'ready'
    fireEvent.touchMove(touchArea, {
      touches: [{ clientY: 250 }],
    });
    expect(indicator.getAttribute("data-status")).toBe("ready");
    expect(screen.getByText("放開立即更新")).toBeDefined();

    // 4. Touch End -> enters 'refreshing', triggers vibration and onRefresh
    fireEvent.touchEnd(touchArea);
    expect(indicator.getAttribute("data-status")).toBe("refreshing");
    expect(screen.getByText("正在同步...")).toBeDefined();
    expect(navigator.vibrate).toHaveBeenCalledWith(12);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    // After refresh completes, resets to idle
    await waitFor(() => {
      expect(indicator.getAttribute("data-status")).toBe("idle");
    });
  });

  it("cancels pull when user releases before threshold", () => {
    const onRefresh = vi.fn();

    const { container } = render(
      <PullToRefresh onRefresh={onRefresh} threshold={65}>
        <div>Feed</div>
      </PullToRefresh>
    );

    const touchArea = container.firstChild as HTMLElement;
    const indicator = screen.getByTestId("pull-to-refresh-indicator");

    fireEvent.touchStart(touchArea, { touches: [{ clientY: 100 }] });
    // Pull lightly: diff 40px * 0.45 = 18px < 65
    fireEvent.touchMove(touchArea, { touches: [{ clientY: 140 }] });
    expect(indicator.getAttribute("data-status")).toBe("pulling");

    // Release before threshold
    fireEvent.touchEnd(touchArea);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(indicator.getAttribute("data-status")).toBe("idle");
  });
});
