-- ============================================================
-- Función pública para buscar empresas por nombre
-- Usada en el flujo de registro para que nuevos usuarios puedan
-- unirse a una empresa existente sin necesitar RLS bypass.
-- SECURITY DEFINER: corre con privilegios del dueño de la función,
-- no del usuario que la llama.
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_companies_by_name(search_term TEXT)
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, name
  FROM companies
  WHERE name ILIKE '%' || search_term || '%'
    AND is_active = TRUE
  ORDER BY name ASC
  LIMIT 10;
$$;

-- Permitir que cualquier usuario autenticado llame esta función
GRANT EXECUTE ON FUNCTION public.search_companies_by_name(TEXT) TO authenticated;
