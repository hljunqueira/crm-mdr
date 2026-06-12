DO $$
DECLARE
    arroio_id uuid := gen_random_uuid();
    gaivota_id uuid := gen_random_uuid();
    arroio_store_id uuid;
    gaivota_store_id uuid;
BEGIN
    -- Obter os IDs das lojas dinamicamente pelo nome
    SELECT id INTO arroio_store_id FROM public.stores WHERE name ILIKE '%arroio%' LIMIT 1;
    SELECT id INTO gaivota_store_id FROM public.stores WHERE name ILIKE '%gaivota%' LIMIT 1;

    -- Inserir usuários no auth.users do Supabase
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES
    (arroio_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lojaarroio@mdrinformaticaecelulares.com.br', crypt('lojaarroio123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    (gaivota_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lojagaivota@mdrinformaticaecelulares.com.br', crypt('lojagaivote123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

    -- Inserir identidades no auth.identities
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES
    (gen_random_uuid(), arroio_id, format('{"sub":"%s","email":"%s"}', arroio_id::text, 'lojaarroio@mdrinformaticaecelulares.com.br')::jsonb, 'email', arroio_id::text, now(), now(), now()),
    (gen_random_uuid(), gaivota_id, format('{"sub":"%s","email":"%s"}', gaivota_id::text, 'lojagaivota@mdrinformaticaecelulares.com.br')::jsonb, 'email', gaivota_id::text, now(), now(), now());

    -- Inserir perfis em public.profiles
    INSERT INTO public.profiles (id, store_id, full_name, role)
    VALUES
    (arroio_id, arroio_store_id, 'Terminal Arroio', 'attendant'),
    (gaivota_id, gaivota_store_id, 'Terminal Gaivota', 'attendant');
END $$;
