-- Adicionar campo para identificar walk-ins
ALTER TABLE public.appointments 
ADD COLUMN is_walk_in boolean NOT NULL DEFAULT false;