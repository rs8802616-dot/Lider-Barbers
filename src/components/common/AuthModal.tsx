import React, { useState } from 'react';
import { Lock, ShieldCheck, UserCheck, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'barbeiro' | 'administrador';
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // PIN validation
    if (targetRole === 'administrador') {
      if (pin === 'admin123' || pin === '1234') {
        onSuccess();
        onClose();
        setPin('');
      } else {
        setError('Senha de Administrador incorreta. (Dica de teste: admin123 ou 1234)');
      }
    } else if (targetRole === 'barbeiro') {
      if (pin === 'barber123' || pin === '1234') {
        onSuccess();
        onClose();
        setPin('');
      } else {
        setError('Senha de Barbeiro incorreta. (Dica de teste: barber123 ou 1234)');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#D4AF37]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display tracking-wide">
                Acesso Restrito
              </h3>
              <p className="text-xs text-[#C5A059]">
                {targetRole === 'administrador' ? 'Painel Administrativo' : 'Painel do Barbeiro'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPin('');
              setError(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Esta área é restrita a membros autorizados da equipe para prevenir vazamento de dados de clientes e agendamentos. Digite a senha de acesso:
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Senha / PIN de Acesso
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={targetRole === 'administrador' ? 'Senha do Administrador' : 'Senha do Barbeiro'}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-[#D4AF37] focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Proteção e Sigilo de Dados</span>
            </div>
            <p className="text-zinc-500">
              Senhas padrão do sistema: <strong>admin123</strong> (Administrador) e <strong>barber123</strong> (Barbeiro).
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setPin('');
                setError(null);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-[#D4AF37]/20"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
