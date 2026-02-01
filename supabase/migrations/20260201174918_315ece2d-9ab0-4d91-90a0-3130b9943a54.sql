-- Adicionar coluna client_number às empresas (UNIQUE para garantir unicidade)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS client_number TEXT UNIQUE;

-- Adicionar coluna client_number aos contactos
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS client_number TEXT;

-- Índices para pesquisa rápida
CREATE INDEX IF NOT EXISTS idx_companies_client_number ON public.companies(client_number);
CREATE INDEX IF NOT EXISTS idx_contacts_client_number ON public.contacts(client_number);

-- Função: Sincronizar client_number quando contacto é associado a empresa
CREATE OR REPLACE FUNCTION public.sync_contact_client_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o contacto tem company_id, herda o client_number da empresa
  IF NEW.company_id IS NOT NULL THEN
    SELECT client_number INTO NEW.client_number
    FROM public.companies WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger ao inserir/atualizar contacto (drop se existir para recriar)
DROP TRIGGER IF EXISTS trigger_sync_contact_client_number ON public.contacts;
CREATE TRIGGER trigger_sync_contact_client_number
BEFORE INSERT OR UPDATE OF company_id ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.sync_contact_client_number();

-- Função: Propagar client_number da empresa para todos os seus contactos
CREATE OR REPLACE FUNCTION public.propagate_company_client_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_number IS DISTINCT FROM OLD.client_number THEN
    UPDATE public.contacts 
    SET client_number = NEW.client_number
    WHERE company_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger quando empresa atualiza client_number
DROP TRIGGER IF EXISTS trigger_propagate_company_client_number ON public.companies;
CREATE TRIGGER trigger_propagate_company_client_number
AFTER UPDATE OF client_number ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.propagate_company_client_number();

-- Sincronizar contactos existentes que já têm empresa
UPDATE public.contacts c
SET client_number = co.client_number
FROM public.companies co
WHERE c.company_id = co.id 
  AND c.client_number IS DISTINCT FROM co.client_number;