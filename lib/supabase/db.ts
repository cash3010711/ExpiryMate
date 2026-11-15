import { getSupabaseBrowserClient } from "./client";
import { InventoryItem } from "../expiration/engine";

export interface DbHousehold {
  id: string;
  name: string;
  invite_code: string;
}

/**
 * Ensures a household exists for the given inviteCode.
 * Returns the household row.
 */
export async function getOrCreateHousehold(name: string, inviteCode: string): Promise<DbHousehold | null> {
  const supabase = getSupabaseBrowserClient() as any;
  const normalizedCode = inviteCode.toUpperCase().trim();

  try {
    // 1. Try to find existing household
    const { data: existing, error: findError } = await supabase
      .from("households")
      .select("id, name, invite_code")
      .eq("invite_code", normalizedCode)
      .maybeSingle();

    if (existing) {
      return existing as DbHousehold;
    }

    // 2. If not found, insert new household
    const { data: inserted, error: insertError } = await supabase
      .from("households")
      .insert({
        name: name || "溫馨一家",
        invite_code: normalizedCode,
      })
      .select("id, name, invite_code")
      .single();

    if (inserted) {
      return inserted as DbHousehold;
    }

    if (insertError) {
      console.warn("Could not create household in Supabase:", insertError.message);
    }
  } catch (err) {
    console.warn("Supabase household sync error:", err);
  }

  return null;
}

/**
 * Fetches all items for a given household ID from Supabase.
 */
export async function fetchHouseholdItems(householdId: string): Promise<InventoryItem[]> {
  const supabase = getSupabaseBrowserClient() as any;

  try {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Failed to fetch items from Supabase:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      household_id: row.household_id,
      type: row.type as "food" | "coupon",
      title: row.title,
      category_or_location: row.category_or_location || "",
      expiry_date: row.expiry_date,
      quantity: row.quantity,
      is_opened: row.is_opened,
      opened_date: row.opened_date || null,
      barcode_image_url: row.barcode_image_url,
      notes: row.notes,
      status: row.status as "active" | "consumed" | "discarded",
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.warn("Supabase fetch error:", err);
    return [];
  }
}

/**
 * Inserts a new item into Supabase.
 */
export async function insertItemToDb(item: Omit<InventoryItem, "id">): Promise<InventoryItem | null> {
  const supabase = getSupabaseBrowserClient() as any;

  try {
    const { data, error } = await supabase
      .from("items")
      .insert({
        household_id: item.household_id,
        type: item.type,
        title: item.title,
        category_or_location: item.category_or_location || null,
        expiry_date: item.expiry_date,
        quantity: item.quantity,
        is_opened: item.is_opened,
        opened_date: item.opened_date || null,
        barcode_image_url: item.barcode_image_url || null,
        notes: item.notes || null,
        status: item.status,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to insert item into Supabase:", error.message);
      return null;
    }

    return {
      id: data.id,
      household_id: data.household_id,
      type: data.type as "food" | "coupon",
      title: data.title,
      category_or_location: data.category_or_location || "",
      expiry_date: data.expiry_date,
      quantity: data.quantity,
      is_opened: data.is_opened,
      opened_date: data.opened_date || null,
      barcode_image_url: data.barcode_image_url,
      notes: data.notes,
      status: data.status as "active" | "consumed" | "discarded",
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error("Supabase insert error:", err);
    return null;
  }
}

/**
 * Updates an item's status or fields in Supabase.
 */
export async function updateItemInDb(id: string, updates: Partial<InventoryItem>): Promise<boolean> {
  const supabase = getSupabaseBrowserClient() as any;

  try {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.category_or_location !== undefined) payload.category_or_location = updates.category_or_location;
    if (updates.expiry_date !== undefined) payload.expiry_date = updates.expiry_date;
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.is_opened !== undefined) payload.is_opened = updates.is_opened;
    if (updates.opened_date !== undefined) payload.opened_date = updates.opened_date;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.barcode_image_url !== undefined) payload.barcode_image_url = updates.barcode_image_url;

    const { error } = await supabase.from("items").update(payload).eq("id", id);
    if (error) {
      console.warn("Failed to update item in Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase update error:", err);
    return false;
  }
}

/**
 * Deletes an item from Supabase permanently.
 */
export async function deleteItemFromDb(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient() as any;

  try {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      console.warn("Failed to delete item from Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase delete error:", err);
    return false;
  }
}
