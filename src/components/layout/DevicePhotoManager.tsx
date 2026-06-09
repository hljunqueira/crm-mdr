import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Loader2, X, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUI } from '../../context/UIContext';

interface DevicePhotoManagerProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  title?: string;
}

export default function DevicePhotoManager({ photos, onChange, title = "Fotos do Dispositivo" }: DevicePhotoManagerProps) {
  const { showNotification } = useUI();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Iniciar Câmera
  const startCamera = async () => {
    setIsStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // câmera traseira por padrão se disponível
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Erro ao acessar webcam:', err);
      showNotification('error', 'Câmera indisponível ou permissão negada.');
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Parar Câmera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Bater Foto
  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Espelhar apenas se for a câmera frontal (default)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          await uploadFile(file);
        }
      }, 'image/jpeg', 0.85);
    }
    stopCamera();
  };

  // Upload convencional de arquivos
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i]);
    }
    
    // Limpar input
    e.target.value = '';
  };

  // Executar upload no Supabase
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `device-photo-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const filePath = `device-photos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(filePath);

      onChange([...photos, publicUrl]);
      showNotification('success', 'Foto anexada com sucesso!');
    } catch (err: any) {
      console.error('Upload error:', err);
      showNotification('error', `Falha ao fazer upload: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Remover foto da lista
  const deletePhoto = (urlToRemove: string) => {
    onChange(photos.filter(url => url !== urlToRemove));
    showNotification('success', 'Foto removida.');
    
    // Tenta remover do storage silenciosamente se for URL do nosso bucket
    try {
      if (urlToRemove.includes('customer-documents/device-photos/')) {
        const parts = urlToRemove.split('device-photos/');
        const fileName = parts[parts.length - 1];
        supabase.storage
          .from('customer-documents')
          .remove([`device-photos/${fileName}`]);
      }
    } catch (e) {
      console.warn('Erro ao deletar arquivo do storage:', e);
    }
  };

  return (
    <div className="space-y-4 w-full bg-white/[0.02] border border-white/5 rounded-3xl p-5">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-on-surface/60 uppercase tracking-widest pl-1">
          {title}
        </label>
        {isUploading && (
          <span className="text-[8px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
            <Loader2 className="animate-spin" size={10} /> Enviando...
          </span>
        )}
      </div>

      {/* Grid de thumbnails das fotos já adicionadas */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((url, idx) => (
            <div key={idx} className="group relative aspect-square bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-md">
              <img src={url} alt={`Aparelho ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => deletePhoto(url)}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-transform active:scale-90 shadow-lg cursor-pointer"
                  title="Excluir foto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 text-white">
          <Upload size={12} /> Selecionar Arquivo
          <input 
            type="file" 
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden" 
            disabled={isUploading}
          />
        </label>

        <button
          type="button"
          onClick={startCamera}
          disabled={isStartingCamera || isUploading}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white cursor-pointer"
        >
          {isStartingCamera ? (
            <Loader2 className="animate-spin" size={12} />
          ) : (
            <Camera size={12} />
          )}
          Tirar Foto
        </button>
      </div>

      {/* Modal / Overlay da Câmera em Tempo Real */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[32px] overflow-hidden p-6 space-y-4 flex flex-col items-center shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center w-full border-b border-white/5 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Câmera ao Vivo</span>
              <button
                type="button"
                onClick={stopCamera}
                className="text-on-surface-variant hover:text-white transition-colors cursor-pointer text-sm font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/5">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            </div>

            <div className="flex justify-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={stopCamera}
                className="py-3 px-6 bg-white/5 border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="py-3 px-6 bg-primary text-on-primary rounded-xl text-[9px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
              >
                <Camera size={12} /> Capturar Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
