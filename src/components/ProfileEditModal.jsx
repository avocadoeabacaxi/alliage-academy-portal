import React, { useState, useRef } from 'react';
import { X, Upload, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProfileEditModal({ isOpen, onClose, user, onUpdateUser }) {
  const [name, setName] = useState(user?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(user?.photo_url || null);
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      let photoUrl = user?.photo_url;
      
      if (photoFile) {
        const uploadRes = await base44.integrations.Core.UploadFile({ file: photoFile });
        photoUrl = uploadRes.file_url;
      }
      
      await base44.auth.updateMe({ full_name: name, photo_url: photoUrl });
      const updatedUser = await base44.auth.me();
      onUpdateUser({ ...user, ...updatedUser, photo_url: photoUrl });
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Editar Perfil</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00A6D6] to-[#0088B0] flex items-center justify-center text-2xl font-bold text-white">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.full_name?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#00A6D6] border border-[#00A6D6] rounded-full hover:bg-[#00A6D6]/5 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Mudar Foto
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A6D6]/20 focus:border-[#00A6D6] transition-all"
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <div className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 text-slate-600">
              {user?.email}
            </div>
          </div>

          {/* Settings Link */}
          <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Settings className="w-4 h-4" />
            Configurações de Conta
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-lg hover:bg-[#0094BD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}