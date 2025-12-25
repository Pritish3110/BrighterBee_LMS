-- Create study_kits table
CREATE TABLE public.study_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  thumbnail_url text,
  recommended_grade text,
  recommended_level text,
  branch_availability text[] DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create kit_orders table
CREATE TABLE public.kit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  pincode text,
  branch text,
  grade text,
  bee_level text,
  kit_id uuid NOT NULL REFERENCES public.study_kits(id) ON DELETE RESTRICT,
  kit_name text NOT NULL,
  price numeric NOT NULL,
  status text NOT NULL DEFAULT 'placed',
  order_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_kits
CREATE POLICY "Anyone can view enabled kits"
  ON public.study_kits FOR SELECT
  USING (is_enabled = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage kits"
  ON public.study_kits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for kit_orders
CREATE POLICY "Students can view own orders"
  ON public.kit_orders FOR SELECT
  USING (student_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can create own orders"
  ON public.kit_orders FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Only admins can update orders"
  ON public.kit_orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete orders"
  ON public.kit_orders FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_study_kits_updated_at
  BEFORE UPDATE ON public.study_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kit_orders_updated_at
  BEFORE UPDATE ON public.kit_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();