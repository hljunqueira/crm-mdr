DO $$
DECLARE
    arroio_id uuid := gen_random_uuid();
    gaivota_id uuid := gen_random_uuid();
    arroio_store_id uuid;
    gaivota_store_id uuid;
BEGIN
    -- Obter os IDs das lojas de Arroio e Gaivota dinamicamente
    SELECT id INTO arroio_store_id FROM public.stores WHERE name ILIKE '%arroio%' LIMIT 1;
    SELECT id INTO gaivota_store_id FROM public.stores WHERE name ILIKE '%gaivota%' LIMIT 1;

    -- Inserir Terminal Arroio se não existir
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lojaarroio@mdrinformaticaecelulares.com.br') THEN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES (arroio_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lojaarroio@mdrinformaticaecelulares.com.br', crypt('lojaarroio123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), arroio_id, format('{"sub":"%s","email":"%s"}', arroio_id::text, 'lojaarroio@mdrinformaticaecelulares.com.br')::jsonb, 'email', arroio_id::text, now(), now(), now());

        INSERT INTO public.profiles (id, full_name, role, store_id)
        VALUES (arroio_id, 'Terminal Arroio', 'attendant', arroio_store_id)
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, store_id = EXCLUDED.store_id;
    END IF;

    -- Inserir Terminal Gaivota se não existir
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lojagaivota@mdrinformaticaecelulares.com.br') THEN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES (gaivota_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lojagaivota@mdrinformaticaecelulares.com.br', crypt('lojagaivote123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), gaivota_id, format('{"sub":"%s","email":"%s"}', gaivota_id::text, 'lojagaivota@mdrinformaticaecelulares.com.br')::jsonb, 'email', gaivota_id::text, now(), now(), now());

        INSERT INTO public.profiles (id, full_name, role, store_id)
        VALUES (gaivota_id, 'Terminal Gaivota', 'attendant', gaivota_store_id)
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, store_id = EXCLUDED.store_id;
    END IF;
END $$;
