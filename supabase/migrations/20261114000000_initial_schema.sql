-- ExpiryMate Initial PostgreSQL Schema
-- Supports Households, Members, Items (Food & Coupons), and LINE Group Bindings

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Households Table
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on invite_code for fast joining
CREATE INDEX IF NOT EXISTS idx_households_invite_code ON public.households(invite_code);

-- 3. Household Members Table
CREATE TABLE IF NOT EXISTS public.household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_hh ON public.household_members(household_id);

-- 4. Inventory Items (Food and Coupons)
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('food', 'coupon')),
    title VARCHAR(150) NOT NULL,
    category_or_location VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    is_opened BOOLEAN DEFAULT false NOT NULL,
    barcode_image_url TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'discarded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_household ON public.items(household_id);
CREATE INDEX IF NOT EXISTS idx_items_expiry ON public.items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);

-- 5. LINE Group Bindings
CREATE TABLE IF NOT EXISTS public.line_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    line_group_id VARCHAR(100) UNIQUE,
    temp_bind_code VARCHAR(20) UNIQUE,
    code_expires_at TIMESTAMP WITH TIME ZONE,
    bound_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_line_bindings_code ON public.line_bindings(temp_bind_code);
CREATE INDEX IF NOT EXISTS idx_line_bindings_group ON public.line_bindings(line_group_id);

-- 6. Row-Level Security (RLS) Setup
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
DROP POLICY IF EXISTS "Household members can view their household" ON public.households;
CREATE POLICY "Household members can view their household"
    ON public.households
    FOR SELECT
    USING (public.is_household_member(id));

DROP POLICY IF EXISTS "Authenticated users can create a household" ON public.households;
CREATE POLICY "Authenticated users can create a household"
    ON public.households
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Household owners can update their household" ON public.households;
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
DROP POLICY IF EXISTS "Members can view other members in same household" ON public.household_members;
CREATE POLICY "Members can view other members in same household"
    ON public.household_members
    FOR SELECT
    USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Users can join household via membership insertion" ON public.household_members;
CREATE POLICY "Users can join household via membership insertion"
    ON public.household_members
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can remove or update members" ON public.household_members;
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
DROP POLICY IF EXISTS "Members can view items in their household" ON public.items;
CREATE POLICY "Members can view items in their household"
    ON public.items
    FOR SELECT
    USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can insert items into their household" ON public.items;
CREATE POLICY "Members can insert items into their household"
    ON public.items
    FOR INSERT
    WITH CHECK (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can update items in their household" ON public.items;
CREATE POLICY "Members can update items in their household"
    ON public.items
    FOR UPDATE
    USING (public.is_household_member(household_id))
    WITH CHECK (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can delete items in their household" ON public.items;
CREATE POLICY "Members can delete items in their household"
    ON public.items
    FOR DELETE
    USING (public.is_household_member(household_id));

-- RLS Policies: Line Bindings
DROP POLICY IF EXISTS "Members can view household line bindings" ON public.line_bindings;
CREATE POLICY "Members can view household line bindings"
    ON public.line_bindings
    FOR SELECT
    USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Members can manage household line bindings" ON public.line_bindings;
CREATE POLICY "Members can manage household line bindings"
    ON public.line_bindings
    FOR ALL
    USING (public.is_household_member(household_id))
    WITH CHECK (public.is_household_member(household_id));
