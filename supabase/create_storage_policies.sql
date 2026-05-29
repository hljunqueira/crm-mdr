-- MDR Celulares - Storage Policies for Document Attachments (2026-05-29)
-- Execute este script no SQL Editor do Supabase para corrigir a falha de envio de anexos.

-- 1. Garante que o bucket 'customer-documents' existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remove políticas antigas (se houver) para evitar conflitos de nomes duplicados
DROP POLICY IF EXISTS "Permitir leitura publica de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload publico de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delecao publica de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to customer-documents" ON storage.objects;

-- 3. Cria política para permitir leitura pública de arquivos neste bucket
CREATE POLICY "Permitir leitura publica de documentos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'customer-documents');

-- 4. Cria política para permitir upload (inserção) de arquivos neste bucket
CREATE POLICY "Permitir upload publico de documentos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'customer-documents');

-- 5. Cria política para permitir exclusão/limpeza de arquivos neste bucket
CREATE POLICY "Permitir delecao publica de documentos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'customer-documents');
