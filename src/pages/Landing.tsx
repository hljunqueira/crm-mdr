import { useState } from 'react';
import {
  ArrowRight,
  Shield,
  Zap,
  Smartphone,
  Laptop,
  Battery,
  Monitor,
  Wrench,
  Clock,
  MessageCircle,
  Instagram,
  MapPin,
  ChevronRight,
  ClipboardList,
  Star,
  CheckCircle2,
  HardDrive,
  ShoppingBag,
  Sparkles,
  Loader2,
  ChevronDown,
  X,
  Menu
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useLeadStore } from '../store/useLeadStore';
import { useUI } from '../context/UIContext';
import { formatPhone, formatCPF, cn } from '../lib/utils';
import React from 'react';
import { supabase } from '../lib/supabase';

export default function Landing() {
  const { addLead } = useLeadStore();
  const { showNotification } = useUI();
  const [activeFaq, setActiveFaq] = React.useState<number | null>(null);
  const [formType, setFormType] = React.useState<'assistencia' | 'venda'>('assistencia');
  
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    device: '',
    message: '',
    unit: 'Arroio do Silva'
  });

  const [showcaseDevices, setShowcaseDevices] = React.useState<any[]>([]);
  const [currentShowcaseIdx, setCurrentShowcaseIdx] = React.useState(0);

  React.useEffect(() => {
    const fetchShowcase = async () => {
      try {
        // 1. Busca primeiro os itens destacados para a vitrine
        let { data, error } = await supabase
          .from('devices')
          .select('id, brand, model, condition, sale_price, stock_quantity, image_url, show_on_landing')
          .eq('status', 'available')
          .eq('show_on_landing', true)
          .order('created_at', { ascending: false })
          .limit(8);



        if (data && data.length > 0) {
          // Filtra itens com stock_quantity > 0 OU sem controle de estoque
          const available = data.filter((d: any) => Number(d.stock_quantity) > 0 || d.stock_quantity === null);
          const toShow = available.length > 0 ? available : data;

          const mapped = toShow.map((d: any) => {
            let img = d.image_url;
            if (!img) {
              const modelLower = (d.model || '').toLowerCase();
              const brandLower = (d.brand || '').toLowerCase();
              if (modelLower.includes('16 pro') || modelLower.includes('17')) img = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80&fit=crop';
              else if (modelLower.includes('15 pro') || modelLower.includes('15pro')) img = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80&fit=crop';
              else if (modelLower.includes('14 pro') || modelLower.includes('14pro')) img = 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=600&q=80&fit=crop';
              else if (modelLower.includes('13 pro') || modelLower.includes('13pro')) img = 'https://images.unsplash.com/photo-1636413289066-51d08e33bb97?w=600&q=80&fit=crop';
              else if (brandLower === 'apple' || brandLower === 'aplle') img = 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&q=80&fit=crop';
              else if (brandLower === 'samsung') img = 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80&fit=crop';
              else img = 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&q=80&fit=crop';
            }
            return {
              id: d.id,
              brand: d.brand,
              model: d.model,
              price: Number(d.sale_price) || 0,
              condition: d.condition || 'used',
              img
            };
          });
          setShowcaseDevices(mapped);
        }
      } catch (err) {
        console.error('Error fetching landing showcase:', err);
      }
    };
    fetchShowcase();
  }, []);

  React.useEffect(() => {
    if (showcaseDevices.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentShowcaseIdx(prev => (prev + 1) % showcaseDevices.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [showcaseDevices]);

  const [isNavDropdownOpen, setIsNavDropdownOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addLead({
        name: formData.name,
        phone: formData.phone,
        message: `[${formType.toUpperCase()}] Aparelho: ${formData.device} | Unidade: ${formData.unit} | Mensagem: ${formData.message}`,
        status: 'new'
      });
      showNotification('success', 'Solicitação Enviada', 'Em breve entraremos em contato via WhatsApp!');
      setFormData({ name: '', phone: '', device: '', message: '', unit: 'Arroio do Silva' });
    } catch (error) {
      showNotification('error', 'Erro ao Enviar', 'Tente novamente em instantes.');
    }
  };
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedUnitImage, setSelectedUnitImage] = useState<string | null>(null);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  const services = [
    {
      title: 'Vendas de Celulares',
      icon: ShoppingBag,
      desc: 'Os melhores lançamentos Apple e Android, novos e seminovos com garantia, procedência e as melhores condições do mercado.',
      gridSpan: 'md:col-span-2',
      color: 'text-logo-blue'
    },
    {
      title: 'Celulares & Tablets',
      icon: Smartphone,
      desc: 'Conserto especializado para todas as marcas e modelos, com peças de alta qualidade e rapidez no atendimento.',
      gridSpan: 'md:col-span-1',
      color: 'text-logo-green'
    },
    {
      title: 'Telas & Displays',
      icon: Monitor,
      desc: 'Troca de telas e displays com tecnologia de ponta, mantendo a sensibilidade e brilho original do seu aparelho.',
      gridSpan: 'md:col-span-1',
      color: 'text-logo-yellow'
    },
    {
      title: 'Notebooks',
      icon: Laptop,
      desc: 'Manutenção completa em hardware e software para Mac e Windows, incluindo reparos em placa-mãe.',
      gridSpan: 'md:col-span-1',
      color: 'text-logo-blue'
    },
    {
      title: 'Baterias Premium',
      icon: Battery,
      desc: 'Substituição de baterias com células de alta densidade para maior autonomia e segurança do seu dispositivo.',
      gridSpan: 'md:col-span-1',
      color: 'text-logo-red'
    },
    {
      title: 'Upgrades SSD',
      icon: HardDrive,
      desc: 'Potencialize seu computador com SSDs de última geração, garantindo inicialização rápida e fluidez total.',
      gridSpan: 'md:col-span-1',
      color: 'text-logo-green'
    }
  ];

  const units = [
    {
      name: 'MDR Informatica&Celulares - Arroio do Silva',
      address: 'Av. Salmi Paladini, 1541 - Sala 01 - Centro, Balneário Arroio do Silva - SC, 88914-000',
      img: '/Matriz.png',
      phone: '(48) 99936-2282',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Av.+Salmi+Paladini,+1541+-+Sala+01+-+Centro,+Balneário+Arroio+do+Silva+-+SC,+88914-000'
    },
    {
      name: 'MDR Informatica&Celulares - Gaivota',
      address: 'Esquina com Espírito Santo - Rod. Interpraias, Balneário Gaivota - SC, 88955-000',
      img: '/filial.png',
      phone: '(48) 99654-5259',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Esquina+com+Espírito+Santo+-+Rod.+Interpraias,+Balneário+Gaivota+-+SC,+88955-000'
    }
  ];

  return (
    <div className="landing-page min-h-screen bg-surface flex flex-col font-sans overflow-x-hidden selection:bg-primary selection:text-on-primary">
      <div className="fixed inset-0 tech-grid-pattern opacity-5 pointer-events-none z-0"></div>

      {/* Navigation */}
      <nav className="h-20 px-8 flex items-center justify-between border-b border-outline-variant/30 backdrop-blur-xl sticky top-0 z-[100]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 md:gap-3"
        >
          <img src="/logo-mdr.png" alt="MDR Informática & Celulares" className="h-10 md:h-16 w-auto object-contain" />
          <span className="font-display font-black text-on-surface text-base md:text-xl tracking-tighter uppercase leading-none">
            MDR <span className="hidden sm:inline text-primary italic">Informática & Celulares</span>
          </span>
        </motion.div>

        <div className="hidden md:flex items-center gap-10">
          {['Serviços', 'Unidades'].map((item, i) => (
            <motion.a
              key={item}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              href={`#${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}`}
              className="text-[11px] uppercase font-bold tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </motion.a>
          ))}

          <div className="h-6 w-px bg-outline-variant/30 mx-2"></div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4"
          >
            {/* Área do Cliente & Acesso Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNavDropdownOpen(!isNavDropdownOpen)}
                className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-widest text-on-surface-variant hover:text-white transition-colors cursor-pointer select-none"
              >
                Área do Cliente <ChevronDown size={14} className={cn("transition-transform", isNavDropdownOpen ? "rotate-180 text-primary" : "")} />
              </button>

              <AnimatePresence>
                {isNavDropdownOpen && (
                  <>
                    {/* Invisible Backdrop to close dropdown on outer clicks */}
                    <div 
                      onClick={() => setIsNavDropdownOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-72 glass-card border border-white/10 rounded-3xl p-5 shadow-2xl bg-[#121215]/95 backdrop-blur-xl z-50 text-left space-y-4"
                    >
                      {/* Option 1: Track Repair */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block leading-none">Clientes</span>
                        <Link
                          to="/consulta-os"
                          onClick={() => setIsNavDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-[10px] font-black uppercase tracking-wider text-white hover:text-primary transition-all"
                        >
                          Acompanhar Conserto <ChevronRight size={14} />
                        </Link>
                      </div>

                      <div className="h-px bg-white/5" />

                      {/* Option 2: Employee Portal */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest block leading-none">Colaboradores</span>
                        <Link
                          to="/login"
                          onClick={() => setIsNavDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-[10px] font-black uppercase tracking-wider text-white hover:text-primary transition-all"
                        >
                          Acesso Restrito (ERP) <ChevronRight size={14} />
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <Link to="/atendimento" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              Orçamento Online
            </Link>
          </motion.div>
        </div>

        {/* Hamburger Button for mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 md:hidden text-on-surface-variant hover:text-white rounded-xl bg-white/5 border border-white/10 transition-all z-50 cursor-pointer"
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-20 bg-[#0c0c0e]/95 backdrop-blur-2xl z-[90] flex flex-col p-6 space-y-6 md:hidden border-b border-white/10 shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              <a
                href="#servicos"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm uppercase font-black tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors py-3 border-b border-white/5"
              >
                Serviços
              </a>
              <a
                href="#unidades"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm uppercase font-black tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors py-3 border-b border-white/5"
              >
                Unidades
              </a>
            </div>

            <div className="space-y-4 pt-4">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest block leading-none">Área do Cliente</span>
              <Link
                to="/consulta-os"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-white hover:text-primary transition-all"
              >
                Acompanhar Conserto <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest block leading-none">Colaboradores</span>
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-white hover:text-primary transition-all"
              >
                Acesso Restrito (ERP) <ChevronRight size={14} />
              </Link>
            </div>

            <Link
              to="/atendimento"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-4 bg-primary text-on-primary rounded-2xl text-center text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all block"
            >
              Orçamento Online
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="inicio" className="relative pt-20 pb-20 md:pt-32 md:pb-40 px-6 md:px-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-logo-blue/5 blur-[180px] -z-10 rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-logo-green/3 blur-[180px] -z-10 rounded-full animate-pulse-slow"></div>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
          <div className="space-y-10">

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-8xl font-display font-black tracking-tighter leading-[0.9] uppercase"
            >
              <span className="whitespace-nowrap text-white">Assistência &</span> <br />
              <span className="bg-gradient-to-r from-logo-blue to-logo-green bg-clip-text text-transparent italic pr-2">Vendas</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-on-surface-variant font-display text-base sm:text-xl tracking-tight max-w-xl leading-relaxed opacity-80"
            >
              Venda de smartphones novos e seminovos, além de assistência a todos celulares. Tecnologia de ponta com a confiança que você já conhece.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-6">
                <Link to="/atendimento" className="w-full sm:w-auto px-10 py-5 bg-primary text-on-primary rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/40 flex items-center justify-center gap-4 hover:scale-105 transition-all group">
                  Solicitar Orçamento
                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <button 
                  onClick={() => setShowWhatsappModal(true)}
                  className="w-full sm:w-auto px-10 py-5 bg-surface-container-low border border-outline-variant/50 text-on-surface rounded-2xl text-lg font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-4 group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center shadow-[0_0_15px_rgba(37,211,102,0.4)]">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  WhatsApp
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-3 sm:gap-6 pt-8 border-t border-outline-variant/20"
            >
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black text-on-surface">15+</span>
                <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Anos de XP</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black text-on-surface">50k+</span>
                <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Reparos</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black text-on-surface">4.9</span>
                <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Google</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative"
          >
            <div className="relative flex items-center justify-center h-[600px]" style={{ perspective: 1200 }}>
              {/* Dynamic Showcase Item */}
              {showcaseDevices.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentShowcaseIdx}
                    initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
                    animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                    exit={{ opacity: 0, rotateY: 90, scale: 0.8 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    whileHover={{ scale: 1.03 }}
                    className="relative w-full max-w-[380px] aspect-[9/16] glass-card border border-white/10 rounded-[56px] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden bg-white/[0.01]"
                  >
                    {/* Glowing rotating card aura */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />
                    


                    {/* Middle Phone Body with 3D Y-Axis auto-spinning phone model */}
                    <div className="flex-1 flex items-center justify-center relative">
                      <motion.div
                        animate={{ 
                          rotateY: [0, 360]
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 16, 
                          ease: "linear"
                        }}
                        style={{ transformStyle: "preserve-3d" }}
                        className="w-[260px] h-[410px] relative cursor-pointer"
                      >
                        {/* Front Face */}
                        <div 
                          className="absolute inset-0 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-[#09090b]"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          <img 
                            src={showcaseDevices[currentShowcaseIdx].img} 
                            alt={showcaseDevices[currentShowcaseIdx].model} 
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />
                          {/* Glossy Reflection overlay */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
                        </div>
                        
                        {/* Back Face (spinning effect backface illustration) */}
                        <div 
                          className="absolute inset-0 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-b from-[#121214] to-[#09090b] flex flex-col items-center justify-center p-6"
                          style={{ 
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)" 
                          }}
                        >
                          <img src="/logo-mdr.png" alt="MDR Logo" className="w-14 h-auto opacity-10 mb-3" />
                          <Smartphone size={28} className="opacity-15 text-primary" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Footer Info */}
                    <div className="space-y-3.5 z-10 text-center">
                      <div>
                        <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest block opacity-50">
                          {showcaseDevices[currentShowcaseIdx].brand}
                        </span>
                        <h3 className="text-base font-black text-white uppercase truncate mt-0.5 leading-tight">
                          {showcaseDevices[currentShowcaseIdx].model}
                        </h3>
                      </div>
                      
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                        <div className="text-left">
                          <span className="text-[8px] text-on-surface-variant/40 uppercase tracking-widest block leading-none">À vista</span>
                          <span className="text-sm font-black text-white font-mono block mt-1">
                            R$ {(showcaseDevices[currentShowcaseIdx]?.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <a
                           href={`https://wa.me/5548999362282?text=Olá!%20Tenho%20interesse%20no%20${encodeURIComponent((showcaseDevices[currentShowcaseIdx]?.brand || '') + ' ' + (showcaseDevices[currentShowcaseIdx]?.model || ''))}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="px-4 py-2.5 bg-white hover:bg-[#25D366] text-black hover:text-white rounded-xl font-display text-[8px] font-black uppercase tracking-widest transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                         >
                           <ShoppingBag size={10} /> Tenho Interesse
                         </a>
                      </div>
                    </div>

                  </motion.div>
                </AnimatePresence>
              ) : null}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Bento Grid */}
      <section id="servicos" className="py-32 px-8 bg-surface-container-low/30 border-y border-outline-variant/30">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4">
              <span className="text-[11px] uppercase font-bold tracking-[0.3em] text-primary">Nossa Expertise</span>
              <h2 className="text-4xl md:text-5xl font-display font-black text-on-surface uppercase tracking-tight">Serviços Especializados</h2>
            </div>
            <p className="text-on-surface-variant font-display max-w-md text-right hidden md:block">
              Utilizamos ferramentas de precisão cirúrgica e bancadas anti-estáticas certificadas para garantir a integridade dos seus dados e equipamentos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className={cn(
                  "glass-card p-10 border border-outline-variant/30 rounded-[32px] transition-all group flex flex-col items-start",
                  service.title === 'Vendas de Celulares' && "hover:border-logo-blue/30",
                  service.title === 'Celulares & Tablets' && "hover:border-logo-green/30",
                  service.title === 'Telas & Displays' && "hover:border-logo-yellow/30",
                  service.title === 'Notebooks' && "hover:border-logo-blue/30",
                  service.title === 'Baterias Premium' && "hover:border-logo-red/30",
                  service.title === 'Upgrades SSD' && "hover:border-logo-green/30",
                  service.gridSpan
                )}
              >
                <div className={`w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center ${service.color} mb-8 group-hover:bg-primary group-hover:text-white transition-all shadow-inner border border-outline-variant/30`}>
                  <service.icon size={32} />
                </div>
                <h3 className="text-2xl font-display font-black text-on-surface mb-4 tracking-tight uppercase">{service.title}</h3>
                <p className="text-on-surface-variant text-base font-display leading-relaxed mb-6">{service.desc}</p>
                <button 
                  onClick={() => setSelectedService(service)}
                  className="mt-auto flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary group-hover:gap-4 transition-all group-hover:text-white"
                >
                  Ver Detalhes <ChevronRight size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Detail Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-surface/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative glass-card w-full max-w-4xl border border-outline-variant/40 rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedService(null)}
              className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-white/10 transition-all"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
            
            <div className="grid md:grid-cols-2">
              <div className="h-64 md:h-auto overflow-hidden">
                <img 
                  src={
                    selectedService.title.includes('Vendas') ? 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1780&auto=format&fit=crop' :
                    selectedService.title.includes('Celulares') ? 'https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?q=80&w=1887&auto=format&fit=crop' :
                    selectedService.title.includes('Telas') ? 'https://images.unsplash.com/photo-1551650975-87deedd944c3?q=80&w=1974&auto=format&fit=crop' :
                    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop'
                  } 
                  alt={selectedService.title} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-10 md:p-16 space-y-8">
                <div className={`w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center ${selectedService.color} border border-outline-variant/30`}>
                  <selectedService.icon size={32} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-display font-black text-on-surface uppercase tracking-tight leading-none">{selectedService.title}</h3>
                  <p className="text-on-surface-variant font-display text-lg leading-relaxed">{selectedService.desc}</p>
                </div>
                <div className="pt-6 border-t border-outline-variant/20">
                  <button 
                    onClick={() => { setSelectedService(null); setShowWhatsappModal(true); }}
                    className="w-full py-4 bg-primary text-on-primary rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-105 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg> Orçamento via WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Contact Modal - Número geral (sem vendas por unidade por enquanto) */}
      {showWhatsappModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-surface/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="relative glass-card w-full max-w-lg border border-outline-variant/40 rounded-[48px] p-10 md:p-14 space-y-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowWhatsappModal(false)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-white/10 transition-all"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-[#25D366] rounded-3xl flex items-center justify-center mx-auto shadow-[0_15px_40px_rgba(37,211,102,0.4)] mb-6">
                <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <h3 className="text-3xl font-display font-black text-on-surface uppercase tracking-tight">Fale Conosco</h3>
              <p className="text-on-surface-variant font-display">Entre em contato agora pelo WhatsApp com nossa equipe!</p>
            </div>

            <div className="grid gap-4">
              <a 
                href="https://wa.me/5548999362282?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es." 
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowWhatsappModal(false)}
                className="group flex items-center justify-between p-6 bg-[#25D366]/10 border border-[#25D366]/30 rounded-[28px] hover:bg-[#25D366]/20 hover:border-[#25D366]/60 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-[0_8px_24px_rgba(37,211,102,0.4)]">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#25D366] mb-1">WhatsApp MDR</p>
                    <p className="text-xl font-black text-on-surface uppercase tracking-tight">(48) 99936-2282</p>
                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5">Assistência • Vendas • Suporte</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-[#25D366] group-hover:translate-x-2 transition-all" />
              </a>

              <div className="grid grid-cols-2 gap-3">
                <a 
                  href="https://wa.me/5548999362282?text=Ol%C3%A1!%20Preciso%20de%20um%20or%C3%A7amento%20de%20assistência%20técnica." 
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowWhatsappModal(false)}
                  className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-[20px] hover:bg-white/10 hover:border-primary/40 transition-all text-center"
                >
                  <Wrench size={18} className="text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-on-surface">Assistência</span>
                </a>
                <a 
                  href="https://wa.me/5548999362282?text=Ol%C3%A1!%20Quero%20ver%20celulares%20à%20venda." 
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowWhatsappModal(false)}
                  className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-[20px] hover:bg-white/10 hover:border-secondary/40 transition-all text-center"
                >
                  <ShoppingBag size={18} className="text-secondary" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-on-surface">Comprar</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Units - Visual Cards */}
      <section id="unidades" className="py-32 px-8 bg-surface-container-low/50 border-t border-outline-variant/30 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(75,226,119,0.03)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto space-y-20 relative z-10">
          <div className="text-center space-y-4">
            <span className="text-[11px] uppercase font-bold tracking-[0.3em] text-primary">Presença Regional</span>
            <h2 className="text-4xl md:text-5xl font-display font-black text-on-surface uppercase tracking-tight">Onde nos Encontrar</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {units.map((unit, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.01 }}
                className="glass-card overflow-hidden border border-outline-variant/30 rounded-[40px] group flex flex-col shadow-2xl"
              >
                <div 
                  className="h-80 overflow-hidden relative cursor-pointer"
                  onClick={() => setSelectedUnitImage(unit.img)}
                >
                  <img src={unit.img} alt={unit.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                      <Zap size={24} />
                    </div>
                  </div>
                </div>
                <div className="p-10 space-y-10">
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black text-on-surface font-display uppercase tracking-tight">{unit.name}</h3>
                    <div className="flex items-start gap-3 text-on-surface-variant text-sm leading-relaxed">
                      <MapPin size={20} className="shrink-0 text-primary" />
                      <span>{unit.address}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <a 
                      href={unit.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-primary text-on-primary rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:brightness-110 transition-all"
                    >
                      <MapPin size={18} /> Rota no Maps
                    </a>
                    <button 
                      onClick={() => setShowWhatsappModal(true)}
                      className="w-full py-4 border border-outline-variant text-on-surface rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      Contato Direto
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Unit Image Modal */}
      {selectedUnitImage && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-surface/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl h-full max-h-[80vh] flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedUnitImage(null)}
              className="absolute -top-16 right-0 w-12 h-12 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-white/10 transition-all"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
            <div className="w-full h-full glass-card border border-outline-variant/40 rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
              <img 
                src={selectedUnitImage} 
                alt="Fachada Unidade" 
                className="w-full h-full object-contain bg-black/20"
              />
            </div>
            <div className="mt-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">Visualização da Unidade</p>
            </div>
          </div>
        </div>
      )}

      {/* Modern Contact Section */}
      <section id="contato" className="py-32 px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-5 gap-16 items-start">
          <div className="lg:col-span-2 space-y-10">
            <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-display font-black text-on-surface uppercase tracking-tight leading-[0.9]">
                Atendimento <br />
                <span className="text-white italic">Online.</span>
              </h2>
              <p className="text-on-surface-variant font-display text-lg tracking-tight leading-relaxed max-w-sm">
                Vamos resolver o seu problema. Preencha os dados básicos abaixo para receber uma prévia do orçamento.
              </p>
            </div>


          </div>

          <div className="lg:col-span-3">
            <div className="glass-card p-10 md:p-14 border border-outline-variant/40 rounded-[56px] relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)]">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/5 blur-[120px] -z-10"></div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service/Sale Choice - Dropdown */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">O que você precisa?</label>
                  <div className="relative">
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer text-white pr-12"
                    >
                      <option value="assistencia" className="bg-[#121214] text-white">Reparos e Assistência</option>
                      <option value="venda" className="bg-[#121214] text-white">Vendas em Geral</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface/60">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Identificação</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Como podemos te chamar?" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">WhatsApp / Telefone</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="(00) 00000-0000" 
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Ponto de Atendimento</label>
                    <div className="relative">
                      <select 
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer text-white pr-12"
                      >
                        <option value="Arroio do Silva" className="bg-[#121214] text-white">Balneário Arroio do Silva (Matriz)</option>
                        <option value="Gaivota" className="bg-[#121214] text-white">Balneário Gaivota (Filial)</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface/60">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Equipamento ou Produto</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: iPhone, MacBook, Carregador..."
                      value={formData.device}
                      onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                      className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Descrição / Relato</label>
                  <textarea 
                    rows={5} 
                    required
                    placeholder="Conte-nos detalhadamente o que você precisa..." 
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full py-6 bg-primary text-on-primary rounded-[24px] font-display font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(75,226,119,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-xl"
                >
                  Enviar Solicitação
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Minimalist Premium */}
      <footer className="py-24 px-8 border-t border-outline-variant/20 mt-auto bg-surface-container-lowest/20 relative">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
            <div className="col-span-1 md:col-span-2 space-y-8">
              <div className="flex items-center gap-4">
                <img src="/logo-mdr.png" alt="Logo" className="h-24 w-auto object-contain" />
                <span className="font-display font-black text-on-surface text-2xl tracking-tighter uppercase">
                  MDR <span className="text-primary italic">Informática & Celulares</span>
                </span>
              </div>
              <p className="text-on-surface-variant font-display text-lg leading-relaxed max-w-sm">
                Redefinindo o padrão de assistência técnica com tecnologia, precisão e respeito ao cliente.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <a href="https://www.instagram.com/mdr_informaticaarroiodosilvasc/" target="_blank" className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-primary hover:text-white transition-colors">
                    <Instagram size={14} /> Instagram Arroio
                  </a>
                  <a href="https://www.instagram.com/mdr_informatica_gaivota/" target="_blank" className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-secondary hover:text-white transition-colors">
                    <Instagram size={14} /> Instagram Gaivota
                  </a>
                </div>
                <div className="flex items-center gap-6">
                  <a href="https://wa.me/5548999362282" target="_blank" className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-on-surface-variant hover:text-[#25D366] transition-colors">
                    WhatsApp Matriz: (48) 99936-2282
                  </a>
                  <a href="https://wa.me/5548996545259" target="_blank" className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-on-surface-variant hover:text-[#25D366] transition-colors">
                    WhatsApp Filial: (48) 99654-5259
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] uppercase font-black tracking-[0.3em] text-on-surface opacity-40">Navegação</h5>
              <ul className="space-y-4">
                {['Início', 'Serviços', 'Unidades'].map(item => (
                  <li key={item}><a href={`#${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}`} className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

          </div>

          <div className="pt-12 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em]">
            <p>© 2026 MDR Informática & Celulares - Balneário Arroio do Silva / Balneário Gaivota</p>
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2">
                <Shield size={12} className="text-primary" />
                <span>SSL Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-primary" />
                <span>Certified Tech</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Buttons */}
      <div className="fixed bottom-10 right-10 z-[150] flex flex-col gap-6 items-end">
        {/* Arroio do Silva */}
        <div className="flex items-center gap-4 group">
          <div className="px-5 py-2.5 bg-surface-container-highest/90 backdrop-blur-md border border-outline-variant/30 rounded-2xl shadow-2xl transition-all">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">Unidade Matriz</p>
            <p className="text-[13px] font-bold text-on-surface">Arroio do Silva</p>
          </div>
          <a 
            href="https://wa.me/5548999362282" 
            target="_blank" 
            className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_15px_40px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all ring-4 ring-primary/10"
          >
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>

        {/* Balneário Gaivota */}
        <div className="flex items-center gap-4 group">
          <div className="px-5 py-2.5 bg-surface-container-highest/90 backdrop-blur-md border border-outline-variant/30 rounded-2xl shadow-2xl transition-all">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-0.5">Unidade Filial</p>
            <p className="text-[13px] font-bold text-on-surface">Balneário Gaivota</p>
          </div>
          <a 
            href="https://wa.me/5548996545259" 
            target="_blank" 
            className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_15px_40px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all ring-4 ring-secondary/10"
          >
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
