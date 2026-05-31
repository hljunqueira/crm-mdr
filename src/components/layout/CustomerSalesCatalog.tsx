import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  ShoppingBag, 
  Sparkles, 
  MessageCircle, 
  Check, 
  Loader2 
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface CustomerSalesCatalogProps {
  osNumber?: number;
  unitId?: string;
}

interface DeviceItem {
  id: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  image_url?: string;
  category?: string;
}

const unsplashAccessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

export default function CustomerSalesCatalog({ osNumber, unitId }: CustomerSalesCatalogProps) {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesMap, setImagesMap] = useState<Record<string, string>>({});
  const [storeInfo, setStoreInfo] = useState<{ name: string; phone: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('Todos');

  // 1. Buscar loja vinculada à OS para direcionar o WhatsApp
  useEffect(() => {
    const fetchStore = async () => {
      if (!unitId) return;
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('name, phone')
          .eq('id', unitId)
          .maybeSingle();

        if (!error && data) {
          setStoreInfo(data);
        }
      } catch (err) {
        console.error('Error fetching store details:', err);
      }
    };
    fetchStore();
  }, [unitId]);

  // 2. Buscar aparelhos disponíveis no estoque
  useEffect(() => {
    const fetchAvailableDevices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('id, brand, model, condition, sale_price, image_url, category')
          .eq('status', 'available')
          .gt('stock_quantity', 0)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((item: any) => ({
          id: item.id,
          brand: item.brand,
          model: item.model,
          condition: item.condition || 'used',
          price: Number(item.sale_price) || 0,
          image_url: item.image_url || '',
          category: item.category || 'smartphone'
        }));

        setDevices(formatted);
        
        // Carrega imagens para os aparelhos
        loadImages(formatted);
      } catch (err) {
        console.error('Error fetching devices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailableDevices();
  }, []);

  // 3. Carregar fotos reais ou buscar da API Unsplash
  const loadImages = async (items: DeviceItem[]) => {
    const newImagesMap: Record<string, string> = {};

    for (const item of items) {
      if (item.image_url) {
        newImagesMap[item.id] = item.image_url;
        continue;
      }

      // Fallback estático de alta fidelidade
      const modelLower = item.model.toLowerCase();
      const brandLower = item.brand.toLowerCase();

      if (modelLower.includes('15 pro') || modelLower.includes('15pro')) {
        newImagesMap[item.id] = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80&fit=crop';
        continue;
      }
      if (modelLower.includes('14 pro') || modelLower.includes('14pro')) {
        newImagesMap[item.id] = 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=600&q=80&fit=crop';
        continue;
      }
      if (modelLower.includes('13 pro') || modelLower.includes('13pro')) {
        newImagesMap[item.id] = 'https://images.unsplash.com/photo-1636413289066-51d08e33bb97?w=600&q=80&fit=crop';
        continue;
      }
      if (brandLower === 'apple' || modelLower.includes('iphone')) {
        newImagesMap[item.id] = 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&q=80&fit=crop';
        continue;
      }
      if (brandLower === 'samsung' || modelLower.includes('galaxy') || modelLower.includes('s23') || modelLower.includes('s24')) {
        newImagesMap[item.id] = 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80&fit=crop';
        continue;
      }
      if (brandLower === 'xiaomi' || brandLower === 'redmi' || modelLower.includes('mi')) {
        newImagesMap[item.id] = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80&fit=crop';
        continue;
      }

      // Se tiver chave Unsplash, busca na API dinamicamente
      if (unsplashAccessKey) {
        try {
          const query = `${item.brand} ${item.model} phone`;
          const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${unsplashAccessKey}&per_page=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              newImagesMap[item.id] = data.results[0].urls.regular;
              continue;
            }
          }
        } catch (err) {
          console.error(`Error querying Unsplash image for ${item.model}:`, err);
        }
      }

      // Fallback genérico final de alta resolução
      newImagesMap[item.id] = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80&fit=crop';
    }

    setImagesMap(newImagesMap);
  };

  const handleBuy = (device: DeviceItem) => {
    // Pegar telefone formatado da loja (ou fallback)
    const phone = storeInfo?.phone || '5548999999999';
    const cleanPhone = phone.replace(/\D/g, '');
    
    const osNumberStr = osNumber ? String(osNumber).padStart(4, '0') : '';
    const conditionStr = 
      device.condition === 'new' ? 'Novo' : 
      device.condition === 'vitrine' ? 'Vitrine' : 'Seminovo';

    const text = `Olá! Estou acompanhando meu aparelho na assistência${osNumberStr ? ` (OS #${osNumberStr})` : ''} e fiquei muito interessado no *${device.brand} ${device.model} (${conditionStr})* por R$ ${device.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} que vi na vitrine do portal. Gostaria de saber se está disponível para reserva!`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 glass-card bg-white/[0.01] border border-white/5 rounded-[32px]">
        <Loader2 className="animate-spin text-primary" size={24} />
        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Carregando vitrine...</span>
      </div>
    );
  }

  if (devices.length === 0) {
    return null; // Don't show anything if no in-stock devices
  }

  // Obter marcas exclusivas para filtros
  const brands = ['Todos', ...Array.from(new Set(devices.map(d => d.brand)))];

  const filteredDevices = activeFilter === 'Todos' 
    ? devices 
    : devices.filter(d => d.brand === activeFilter);

  return (
    <div className="space-y-6 mt-8 animate-in fade-in duration-700">
      
      {/* Visual Title Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">Oportunidades em Destaque</h3>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-1">Aproveite descontos exclusivos enquanto conserta seu celular!</p>
          </div>
        </div>
      </div>

      {/* Brand Filters */}
      {brands.length > 2 && (
        <div className="flex flex-wrap gap-2 py-1">
          {brands.map(brand => (
            <button
              key={brand}
              onClick={() => setActiveFilter(brand)}
              className={cn(
                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                activeFilter === brand 
                  ? "bg-white text-black border-white shadow-lg" 
                  : "bg-white/[0.02] text-on-surface-variant border-white/5 hover:bg-white/5"
              )}
            >
              {brand}
            </button>
          ))}
        </div>
      )}

      {/* Showcase Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {filteredDevices.map((device) => {
          const imageSrc = imagesMap[device.id] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80&fit=crop';
          const conditionLabel = 
            device.condition === 'new' ? 'Novo' : 
            device.condition === 'vitrine' ? 'Vitrine' : 'Seminovo';
            
          return (
            <motion.div 
              key={device.id}
              whileHover={{ y: -4 }}
              className="glass-card bg-white/[0.01] border border-white/5 rounded-[32px] overflow-hidden flex flex-col h-full group relative hover:border-white/20 transition-all shadow-xl"
            >
              {/* Product Visual Container */}
              <div className="h-44 relative bg-gradient-to-b from-white/[0.02] to-transparent flex items-center justify-center p-4 overflow-hidden border-b border-white/5">
                <img 
                  src={imageSrc} 
                  alt={`${device.brand} ${device.model}`}
                  className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                
                {/* Condition Tag */}
                <div className={cn(
                  "absolute top-3 left-3 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border",
                  device.condition === 'new' 
                    ? "bg-primary-container/80 border-primary/20 text-on-primary-container"
                    : device.condition === 'vitrine'
                    ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                    : "bg-blue-500/20 border-blue-500/30 text-blue-300"
                )}>
                  {conditionLabel}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">{device.brand}</span>
                  <h4 className="text-sm font-black text-white uppercase truncate mt-0.5 leading-tight">{device.model}</h4>
                  
                  {/* Prices block */}
                  <div className="mt-3">
                    <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest block leading-none">À vista</span>
                    <span className="text-lg font-black text-white font-mono block mt-1">
                      R$ {device.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-on-surface-variant/60 block mt-0.5 font-medium">
                      ou até 12x de R$ {(device.price / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem juros
                    </span>
                  </div>
                </div>

                {/* Call To Action Buy Button */}
                <button
                  onClick={() => handleBuy(device)}
                  className="w-full py-3.5 bg-white hover:bg-primary text-black hover:text-white rounded-2xl font-display text-[9px] font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 group-hover:shadow-primary/5 cursor-pointer"
                >
                  <ShoppingBag size={12} />
                  Tenho Interesse
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
