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
  MapPin,
  ChevronRight,
  ClipboardList,
  Star,
  CheckCircle2,
  HardDrive,
  ShoppingBag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Landing() {
  const [formType, setFormType] = useState<'assistencia' | 'venda'>('assistencia');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedUnitImage, setSelectedUnitImage] = useState<string | null>(null);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  const services = [
    {
      title: 'Vendas de Celulares',
      icon: ShoppingBag,
      desc: 'Os melhores lançamentos Apple e Android, novos e seminovos com garantia, procedência e as melhores condições do mercado.',
      gridSpan: 'md:col-span-2',
      color: 'text-white'
    },
    {
      title: 'Celulares & Tablets',
      icon: Smartphone,
      desc: 'Conserto especializado para todas as marcas e modelos, com peças de alta qualidade e rapidez no atendimento.',
      gridSpan: 'md:col-span-1',
      color: 'text-primary'
    },
    {
      title: 'Telas & Displays',
      icon: Monitor,
      desc: 'Troca de telas e displays com tecnologia de ponta, mantendo a sensibilidade e brilho original do seu aparelho.',
      gridSpan: 'md:col-span-1',
      color: 'text-secondary'
    },
    {
      title: 'Notebooks',
      icon: Laptop,
      desc: 'Manutenção completa em hardware e software para Mac e Windows, incluindo reparos em placa-mãe.',
      gridSpan: 'md:col-span-1',
      color: 'text-tertiary'
    },
    {
      title: 'Baterias Premium',
      icon: Battery,
      desc: 'Substituição de baterias com células de alta densidade para maior autonomia e segurança do seu dispositivo.',
      gridSpan: 'md:col-span-1',
      color: 'text-primary'
    },
    {
      title: 'Upgrades SSD',
      icon: HardDrive,
      desc: 'Potencialize seu computador com SSDs de última geração, garantindo inicialização rápida e fluidez total.',
      gridSpan: 'md:col-span-1',
      color: 'text-secondary'
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
    <div className="min-h-screen bg-surface flex flex-col font-sans overflow-x-hidden selection:bg-primary selection:text-on-primary">
      <div className="fixed inset-0 tech-grid-pattern opacity-5 pointer-events-none z-0"></div>

      {/* Navigation */}
      <nav className="h-20 px-8 flex items-center justify-between border-b border-outline-variant/30 backdrop-blur-xl sticky top-0 z-[100]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <img src="/logo-mdr.png" alt="MDR Informática & Celulares" className="h-16 w-auto object-contain" />
          <span className="font-display font-black text-on-surface text-xl tracking-tighter uppercase">
            MDR <span className="text-primary italic">Informática & Celulares</span>
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
            <Link to="/login" className="text-[11px] uppercase font-bold tracking-widest text-on-surface-variant hover:text-on-surface">
              Acesso Restrito
            </Link>
            <a href="#contato" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              Orçamento Online
            </a>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="relative pt-32 pb-40 px-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 blur-[180px] -z-10 rounded-full animate-pulse-slow"></div>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
          <div className="space-y-10">

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-8xl font-display font-black text-on-surface tracking-tight leading-[0.85] uppercase"
            >
              Vendas & <br />
              <span className="text-primary italic">Assistência</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-on-surface-variant font-display text-xl tracking-tight max-w-xl leading-relaxed"
            >
              Venda de smartphones novos e seminovos, além de assistência a todos celulares. Tecnologia de ponta com a confiança que você já conhece.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-6">
                <a href="#contato" className="w-full sm:w-auto px-10 py-5 bg-primary text-on-primary rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/40 flex items-center justify-center gap-4 hover:scale-105 transition-all group">
                  Solicitar Orçamento
                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </a>
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
              className="flex items-center gap-8 pt-8 border-t border-outline-variant/20"
            >
              <div className="flex flex-col">
                <span className="text-2xl font-black text-on-surface">15+</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Anos de XP</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-on-surface">50k+</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Reparos Realizados</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-on-surface">4.9</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Google Rating</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative"
          >
            <div className="relative glass-card border border-outline-variant/40 rounded-[48px] overflow-hidden aspect-square shadow-[0_32px_80px_rgba(0,0,0,0.4)] group">
              <img
                src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop"
                alt="Reparo iPhone"
                className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-60"></div>

              {/* Status Bar UI */}
              <div className="absolute bottom-10 left-10 right-10 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  transition={{ delay: 1, duration: 2 }}
                  className="h-full bg-primary shadow-[0_0_15px_rgba(75,226,119,0.5)]"
                ></motion.div>
              </div>
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
                className={`glass-card p-10 border border-outline-variant/30 rounded-[32px] hover:border-primary/50 transition-all group flex flex-col items-start ${service.gridSpan}`}
              >
                <div className={`w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center ${service.color} mb-8 group-hover:bg-primary group-hover:text-on-primary transition-all shadow-inner border border-outline-variant/30`}>
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
            >
              <Zap size={20} className="rotate-45" />
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

      {/* WhatsApp Unit Selector Modal */}
      {showWhatsappModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-surface/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="relative glass-card w-full max-w-lg border border-outline-variant/40 rounded-[48px] p-10 md:p-14 space-y-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowWhatsappModal(false)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-white/10 transition-all"
            >
              <Zap size={20} className="rotate-45" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-[#25D366] rounded-3xl flex items-center justify-center mx-auto shadow-[0_15px_40px_rgba(37,211,102,0.4)] mb-6">
                <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <h3 className="text-3xl font-display font-black text-on-surface uppercase tracking-tight">Fale Conosco</h3>
              <p className="text-on-surface-variant font-display">Escolha a unidade que deseja falar agora pelo WhatsApp:</p>
            </div>

            <div className="grid gap-4">
              <a 
                href="https://wa.me/5548999362282" 
                target="_blank" 
                className="group flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[28px] hover:bg-white/10 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary border border-outline-variant/30">
                    <MapPin size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Unidade Matriz</p>
                    <p className="text-lg font-black text-on-surface uppercase tracking-tight">Arroio do Silva</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-on-surface-variant group-hover:text-white group-hover:translate-x-2 transition-all" />
              </a>

              <a 
                href="https://wa.me/5548996545259" 
                target="_blank" 
                className="group flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[28px] hover:bg-white/10 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-secondary border border-outline-variant/30">
                    <MapPin size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">Unidade Filial</p>
                    <p className="text-lg font-black text-on-surface uppercase tracking-tight">Balneário Gaivota</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-on-surface-variant group-hover:text-white group-hover:translate-x-2 transition-all" />
              </a>
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
            >
              <Zap size={20} className="rotate-45" />
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

              <div className="space-y-4 mb-10">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] pl-1">Escolha o serviço desejado:</p>
                <div className="flex p-1 bg-white/5 rounded-[24px] gap-1 border border-white/5">
                  <button
                    onClick={() => setFormType('assistencia')}
                    className={`flex-1 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${formType === 'assistencia' ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-on-surface-variant hover:text-white'}`}
                  >
                    Reparos e Assistência
                  </button>
                  <button
                    onClick={() => setFormType('venda')}
                    className={`flex-1 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${formType === 'venda' ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-on-surface-variant hover:text-white'}`}
                  >
                    Venda de Celular
                  </button>
                </div>
                <p className="text-[10px] text-on-surface-variant/60 font-medium italic pl-1">
                  {formType === 'assistencia' ? '* Preencha os detalhes do seu aparelho para conserto.' : '* Consulte modelos disponíveis e condições de parcelamento.'}
                </p>
              </div>

              <form className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Identificação</label>
                    <input type="text" placeholder="Como podemos te chamar?" className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">WhatsApp / Telefone</label>
                    <input type="tel" placeholder="(00) 00000-0000" className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Ponto de Atendimento</label>
                    <select className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer">
                      <option>Escolha a melhor unidade</option>
                      <option>Balneário Arroio do Silva (Matriz)</option>
                      <option>Balneário Gaivota (Filial)</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">
                      {formType === 'assistencia' ? 'Equipamento' : 'Preferência de Modelo'}
                    </label>
                    <input
                      type="text"
                      placeholder={formType === 'assistencia' ? 'Ex: Macbook Pro 2020' : 'Ex: iPhone 14 Pro Max'}
                      className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                  </div>
                </div>

                {formType === 'assistencia' ? (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Relato Técnico</label>
                    <textarea rows={5} placeholder="O que está acontecendo com seu dispositivo?" className="w-full bg-surface/50 border border-outline-variant/50 rounded-2xl px-6 py-5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"></textarea>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-[0.2em] pl-1">Estado de Interesse</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button type="button" className="py-4 border border-outline-variant/50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all">Novo Lacrado</button>
                        <button type="button" className="py-4 border border-outline-variant/50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all">Seminovo Premium</button>
                      </div>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                      <p className="text-[11px] font-black text-white uppercase tracking-widest mb-2">Consulta Automática</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Ao solicitar o catálogo, enviaremos as fotos reais e a saúde da bateria dos modelos disponíveis em estoque no momento.
                      </p>
                    </div>
                  </div>
                )}

                <button className="w-full py-6 bg-primary text-on-primary rounded-[24px] font-display font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(75,226,119,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-xl">
                  {formType === 'assistencia' ? 'Iniciar Diagnóstico' : 'Receber Catálogo'}
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
              <div className="flex items-center gap-6">
                {['Instagram', 'Facebook', 'WhatsApp'].map(social => (
                  <a key={social} href="#" className="text-[10px] uppercase font-black tracking-widest text-primary hover:text-white transition-colors">{social}</a>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] uppercase font-black tracking-[0.3em] text-on-surface opacity-40">Navegação</h5>
              <ul className="space-y-4">
                {['Início', 'Serviços', 'Unidades', 'Garantia', 'Sobre Nós'].map(item => (
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
      <div className="fixed bottom-10 right-10 z-[150] flex flex-col gap-6">
        {/* Arroio do Silva */}
        <div className="group relative flex items-center justify-end">
          <div className="absolute right-full mr-4 px-5 py-2.5 bg-surface-container-highest/80 backdrop-blur-md border border-outline-variant/30 rounded-2xl opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">Unidade Matriz</p>
            <p className="text-[13px] font-bold text-on-surface">Arroio do Silva</p>
          </div>
          <a 
            href="https://wa.me/5548999362282" 
            target="_blank" 
            className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_15px_40px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all group/btn ring-4 ring-primary/10"
          >
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>

        {/* Balneário Gaivota */}
        <div className="group relative flex items-center justify-end">
          <div className="absolute right-full mr-4 px-5 py-2.5 bg-surface-container-highest/80 backdrop-blur-md border border-outline-variant/30 rounded-2xl opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-xl">
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
