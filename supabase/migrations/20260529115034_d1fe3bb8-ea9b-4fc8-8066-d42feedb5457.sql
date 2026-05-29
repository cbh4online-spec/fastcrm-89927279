UPDATE public.profile_menu_permissions
SET visible = true, updated_at = now()
WHERE workspace_id = '0662fc16-6286-4156-a908-08c7dfec0fb7'
  AND menu_key = 'products'
  AND sales_function = 'gestor';