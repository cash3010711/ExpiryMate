-- Migration: 20261114000000_initial_schema.sql
-- Description: ExpiryMate initial schema with RLS and Indexes

-- 1. Create Households Table
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invite_code VARCHAR(6) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Household Members Table
CREATE TABLE IF NOT EXISTS public.household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(household_id, user_id)
);

-- 3. Create Items Table
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('food', 'coupon')),
    title TEXT NOT NULL,
    category_or_location TEXT, -- For food: 'Freezer', 'Refrigerator', 'Pantry'. For coupon: Store / Category
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    is_opened BOOLEAN NOT NULL DEFAULT false,
    barcode_image_url TEXT,
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'consumed', 'discarded')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create LINE Bindings Table
CREATE TABLE IF NOT EXISTS public.line_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    line_group_id TEXT,
    bound_at TIMESTAMPTZ,
    temp_bind_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_households_invite_code ON public.households(invite_code);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_items_household_status ON public.items(household_id, status);
CREATE INDEX IF NOT EXISTS idx_items_expiry_date ON public.items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_line_bindings_household ON public.line_bindings(household_id);
CREATE INDEX IF NOT EXISTS idx_line_bindings_temp_code ON public.line_bindings(temp_bind_code);

-- Enable Row-Level Security
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_bindings ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if authenticated user belongs to household
CREATE OR REPLACE FUNCTION public.is_household_member(h_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.household_members
        WHERE household_id = h_id
          AND user_id = auth.uid()
    );
$$;

-- RLS Policies: Households
CREATE POLICY "Household members can view their household"
    ON public.households
    FOR SELECT
    USING (public.is_household_member(id));

CREATE POLICY "Authenticated users can create a household"
    ON public.households
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Household owners can update their household"
    ON public.households
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = public.households.id
              AND user_id = auth.uid()
              AND role = 'owner'
        )
    );

-- RLS Policies: Household Members
CREATE POLICY "Members can view other members in same household"
    ON public.household_members
    FOR SELECT
    USING (public.is_household_member(household_id));

CREATE POLICY "Users can join household via membership insertion"
    ON public.household_members
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can remove or update members"
    ON public.household_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.household_members m
            WHERE m.household_id = public.household_members.household_id
              AND m.user_id = auth.uid()
              AND m.role = 'owner'
        ) OR auth.uid() = user_id
    );

-- RLS Policies: Items
CREATE POLICY "Members can view items in their household"
    ON public.items
    FOR SELECT
    USING (public.is_household_member(household_id));

CREATE POLICY "Members can insert items into their household"
    ON public.items
    FOR INSERT
    WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can update items in their household"
    ON public.items
    FOR UPDATE
    USING (public.is_household_member(household_id))
    WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can delete items in their household"
    ON public.items
    FOR DELETE
    USING (public.is_household_member(household_id));

-- RLS Policies: Line Bindings
CREATE POLICY "Members can view household line bindings"
    ON public.line_bindings
    FOR SELECT
    USING (public.is_household_member(household_id));

CREATE POLICY "Members can manage household line bindings"
    ON public.line_bindings
    FOR ALL
    USING (public.is_household_member(household_id))
    WITH CHECK (public.is_household_member(household_id));
