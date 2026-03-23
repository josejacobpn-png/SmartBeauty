-- Criar tabela de especialidades
CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(salon_id, name)
);

-- Habilitar RLS
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar especialidades
CREATE POLICY "Admins can manage specialties" ON public.specialties
  FOR ALL USING (has_role(auth.uid(), salon_id, 'admin'::app_role));

-- Usuários podem ver especialidades do seu salão
CREATE POLICY "Users can view specialties" ON public.specialties
  FOR SELECT USING (user_belongs_to_salon(auth.uid(), salon_id));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_specialties_updated_at
  BEFORE UPDATE ON public.specialties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();