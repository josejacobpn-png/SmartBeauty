-- Atualizar a função handle_new_user para criar salão, profile e role atomicamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_salon_id uuid;
  salon_name text;
BEGIN
  -- Obter nome do salão dos metadados
  salon_name := NEW.raw_user_meta_data ->> 'salon_name';
  
  -- Se tem nome de salão, criar toda a estrutura
  IF salon_name IS NOT NULL AND salon_name != '' THEN
    -- Criar salão
    INSERT INTO public.salons (name)
    VALUES (salon_name)
    RETURNING id INTO new_salon_id;
    
    -- Criar profile com salon_id
    INSERT INTO public.profiles (user_id, full_name, salon_id)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', new_salon_id);
    
    -- Criar role de admin
    INSERT INTO public.user_roles (user_id, salon_id, role)
    VALUES (NEW.id, new_salon_id, 'admin');
  ELSE
    -- Criar apenas o profile (sem salão - para convites futuros)
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger para garantir que está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();