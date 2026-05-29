UPDATE auth.users
SET encrypted_password = crypt('Qwert.123!!!', gen_salt('bf')),
    updated_at = now()
WHERE email = 'karinaalmeida@pharliss.pt';