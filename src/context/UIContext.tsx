
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

interface ModalProps {
  title: string;
  children: ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary';
}

interface UIContextType {
  showNotification: (type: NotificationType, title: string, message?: string) => void;
  showModal: (props: ModalProps) => void;
  hideModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modal, setModal] = useState<ModalProps | null>(null);

  const showNotification = useCallback((type: NotificationType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const showModal = useCallback((props: ModalProps) => {
    setModal(props);
  }, []);

  const hideModal = useCallback(() => {
    setModal(null);
  }, []);

  return (
    <UIContext.Provider value={{ showNotification, showModal, hideModal }}>
      {children}
      
      {/* Notifications Portal */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="pointer-events-auto w-80 glass-card p-5 border border-white/10 rounded-2xl shadow-2xl flex items-start gap-4"
            >
              <div className={`mt-1 ${
                n.type === 'success' ? 'text-primary' : 
                n.type === 'error' ? 'text-error' : 
                n.type === 'warning' ? 'text-secondary' : 'text-primary'
              }`}>
                {n.type === 'success' && <CheckCircle2 size={20} />}
                {n.type === 'error' && <AlertCircle size={20} />}
                {n.type === 'warning' && <AlertTriangle size={20} />}
                {n.type === 'info' && <Info size={20} />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-on-surface uppercase tracking-widest leading-none mb-1">{n.title}</p>
                {n.message && <p className="text-[10px] text-on-surface-variant leading-relaxed">{n.message}</p>}
              </div>
              <button 
                onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))}
                className="text-on-surface-variant hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal Portal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={hideModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <h3 className="text-xl font-display font-black text-on-surface uppercase tracking-tight mb-4">{modal.title}</h3>
                <div className="text-on-surface-variant font-display text-sm tracking-tight leading-relaxed">
                  {modal.children}
                </div>
                <div className="flex gap-4 mt-10">
                  {modal.onCancel && (
                    <button 
                      onClick={() => {
                        modal.onCancel?.();
                        hideModal();
                      }}
                      className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-white transition-all"
                    >
                      {modal.cancelText || 'Cancelar'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      modal.onConfirm?.();
                      hideModal();
                    }}
                    className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      modal.type === 'danger' ? 'bg-error text-on-surface' : 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                    } hover:scale-[1.02] active:scale-95`}
                  >
                    {modal.confirmText || 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
