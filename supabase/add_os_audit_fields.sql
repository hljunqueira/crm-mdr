-- SQL para Adicionar Campos de Rastreabilidade e Auditoria em Ordens de Serviço (OS)

ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS finalized_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delivered_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índices para otimização de joins
CREATE INDEX IF NOT EXISTS idx_service_orders_created_by ON public.service_orders(created_by_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_finalized_by ON public.service_orders(finalized_by_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_delivered_by ON public.service_orders(delivered_by_id);
