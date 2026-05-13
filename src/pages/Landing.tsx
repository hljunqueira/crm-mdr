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
      name: 'MDR Celulares - Matriz',
      address: 'Av. Salmi Paladini, 1541 - Sala 01 - Centro, Balneário Arroio do Silva - SC, 88914-000',
      img: '/Matriz.png',
      phone: '(48) 99936-2282'
    },
    {
      name: 'MDR Celulares - Filial',
      address: 'Esquina com Espírito Santo - Rod. Interpraias, Balneário Gaivota - SC, 88955-000',
      img: '/filial.png',
      phone: '(48) 99654-5259'
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant/40 text-[10px] font-black text-primary tracking-[0.2em] uppercase"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              Sua tecnologia em boas mãos
            </motion.div>

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
              className="flex flex-col sm:flex-row items-center gap-5 pt-6"
            >
              <a href="#contato" className="w-full sm:w-auto px-10 py-5 bg-primary text-on-primary rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/40 flex items-center justify-center gap-4 hover:scale-105 transition-all group">
                Solicitar Orçamento
                <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <button className="w-full sm:w-auto px-10 py-5 bg-surface-container-low border border-outline-variant/50 text-on-surface rounded-2xl text-lg font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-4 group">
                <MessageCircle size={24} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                WhatsApp
              </button>
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
                <button className="mt-auto flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary group-hover:gap-4 transition-all group-hover:text-white">
                  Ver Detalhes <ChevronRight size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
                <div className="h-80 overflow-hidden relative">
                  <img src={unit.img} alt={unit.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
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
                    <button className="w-full py-4 bg-primary text-on-primary rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:brightness-110 transition-all">
                      <MapPin size={18} /> Rota no Maps
                    </button>
                    <button className="w-full py-4 border border-outline-variant text-on-surface rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-3">
                      <MessageCircle size={18} className="text-[#25D366]" /> Contato Direto
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
    </div>
  );
}
