-- Create a trigger function to automatically create a company for ENI contacts
CREATE OR REPLACE FUNCTION public.auto_create_company_for_eni()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- Only process if entity_type is 'eni' and there's no company_id yet
  IF NEW.entity_type = 'eni' AND NEW.company_id IS NULL THEN
    -- Check if a company with the same name already exists in the workspace
    SELECT id INTO new_company_id
    FROM public.companies
    WHERE workspace_id = NEW.workspace_id
      AND name = NEW.name
    LIMIT 1;
    
    -- If no company exists, create one
    IF new_company_id IS NULL THEN
      INSERT INTO public.companies (
        workspace_id,
        created_by,
        name,
        entity_type,
        tax_id,
        email,
        phone,
        address,
        city,
        postal_code
      ) VALUES (
        NEW.workspace_id,
        NEW.created_by,
        COALESCE(NEW.commercial_name, NEW.name),
        'sole_proprietor',
        NEW.tax_id,
        NEW.email,
        NEW.phone,
        NEW.address,
        NEW.city,
        NEW.postal_code
      )
      RETURNING id INTO new_company_id;
    END IF;
    
    -- Link the contact to the company
    NEW.company_id := new_company_id;
    NEW.company := COALESCE(NEW.commercial_name, NEW.name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trg_auto_create_company_for_eni_insert ON public.contacts;
CREATE TRIGGER trg_auto_create_company_for_eni_insert
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_company_for_eni();

-- Create trigger for UPDATE (when entity_type changes to eni)
DROP TRIGGER IF EXISTS trg_auto_create_company_for_eni_update ON public.contacts;
CREATE TRIGGER trg_auto_create_company_for_eni_update
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  WHEN (
    NEW.entity_type = 'eni' 
    AND (OLD.entity_type IS DISTINCT FROM 'eni' OR OLD.company_id IS NULL)
    AND NEW.company_id IS NULL
  )
  EXECUTE FUNCTION public.auto_create_company_for_eni();

-- Now let's fix the existing ENI contacts that don't have companies
DO $$
DECLARE
  contact_record RECORD;
  new_company_id uuid;
BEGIN
  FOR contact_record IN 
    SELECT id, workspace_id, created_by, name, commercial_name, tax_id, email, phone, address, city, postal_code
    FROM public.contacts
    WHERE entity_type = 'eni' AND company_id IS NULL
  LOOP
    -- Check if a company with the same name already exists
    SELECT id INTO new_company_id
    FROM public.companies
    WHERE workspace_id = contact_record.workspace_id
      AND name = contact_record.name
    LIMIT 1;
    
    -- If no company exists, create one
    IF new_company_id IS NULL THEN
      INSERT INTO public.companies (
        workspace_id,
        created_by,
        name,
        entity_type,
        tax_id,
        email,
        phone,
        address,
        city,
        postal_code
      ) VALUES (
        contact_record.workspace_id,
        contact_record.created_by,
        COALESCE(contact_record.commercial_name, contact_record.name),
        'sole_proprietor',
        contact_record.tax_id,
        contact_record.email,
        contact_record.phone,
        contact_record.address,
        contact_record.city,
        contact_record.postal_code
      )
      RETURNING id INTO new_company_id;
    END IF;
    
    -- Update the contact with the company reference
    UPDATE public.contacts
    SET company_id = new_company_id,
        company = COALESCE(contact_record.commercial_name, contact_record.name)
    WHERE id = contact_record.id;
  END LOOP;
END $$;