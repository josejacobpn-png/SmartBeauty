-- Criar tabela de pagamentos com campos de comissão
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'pix')),
  commission_percentage numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),
  notes text,
  paid_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_payments_salon_id ON public.payments(salon_id);
CREATE INDEX idx_payments_professional_id ON public.payments(professional_id);
CREATE INDEX idx_payments_paid_at ON public.payments(paid_at);

-- Habilitar RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Política de visualização
CREATE POLICY "Users can view payments in their salon" 
  ON public.payments FOR SELECT 
  USING (user_belongs_to_salon(auth.uid(), salon_id));

-- Política de gerenciamento
CREATE POLICY "Admins and receptionists can manage payments" 
  ON public.payments FOR ALL 
  USING (has_role(auth.uid(), salon_id, 'admin') OR has_role(auth.uid(), salon_id, 'receptionist'));

-- Trigger para updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campo payment_status na tabela appointments
ALTER TABLE public.appointments 
ADD COLUMN payment_status text NOT NULL DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'paid', 'partial'));