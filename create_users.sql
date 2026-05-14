DO $$
DECLARE
    admin_id uuid := gen_random_uuid();
    attendant_id uuid := gen_random_uuid();
BEGIN
    -- Insert users
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@mdrinformatica.com.br', crypt('Admin@Mdr@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    (attendant_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atendente@mdrinformaticaecelulares.com.br', crypt('Mdr@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

    -- Insert identities
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES
    (gen_random_uuid(), admin_id, format('{"sub":"%s","email":"%s"}', admin_id::text, 'admin@mdrinformatica.com.br')::jsonb, 'email', admin_id::text, now(), now(), now()),
    (gen_random_uuid(), attendant_id, format('{"sub":"%s","email":"%s"}', attendant_id::text, 'atendente@mdrinformaticaecelulares.com.br')::jsonb, 'email', attendant_id::text, now(), now(), now());

    -- Insert profiles
    INSERT INTO public.profiles (id, full_name, role)
    VALUES
    (admin_id, 'Administrador', 'admin'),
    (attendant_id, 'Atendente', 'attendant');
END $$;
