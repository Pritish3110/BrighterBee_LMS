-- Create events table for calendar system
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'event', -- 'class', 'meeting', 'holiday', 'event', 'deadline'
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  is_system_wide BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#F5C000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table for admin financial tracking
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  student_id UUID,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  receipt_number TEXT,
  payment_method TEXT DEFAULT 'cash',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Events RLS Policies
CREATE POLICY "Teachers can view own events and system-wide events"
ON public.events
FOR SELECT
USING (
  created_by = auth.uid() 
  OR is_system_wide = true 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers can create own events"
ON public.events
FOR INSERT
WITH CHECK (
  created_by = auth.uid() 
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers can update own events"
ON public.events
FOR UPDATE
USING (
  created_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers can delete own events"
ON public.events
FOR DELETE
USING (
  created_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Transactions RLS Policies (Admin only)
CREATE POLICY "Only admins can view transactions"
ON public.transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can create transactions"
ON public.transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update transactions"
ON public.transactions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete transactions"
ON public.transactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on events
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();