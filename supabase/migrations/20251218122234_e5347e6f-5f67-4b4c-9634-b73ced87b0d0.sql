-- Recriar política de INSERT para salons como PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create a salon during signup" ON public.salons;
CREATE POLICY "Anyone can create a salon during signup"
  ON public.salons FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recriar política de gerenciamento para user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), salon_id, 'admin'::app_role));

-- Nova política para permitir auto-atribuição de role durante signup
CREATE POLICY "Users can create their initial role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());