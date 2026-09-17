import React, { useState } from 'react';
import { Lock, ShieldCheck, UserCheck, X, AlertCircle, Eye, EyeOff, Crown } from 'lucide-react';
import { UserRole, Barbeiro } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'barbeiro' | 'administrador' | 'super_admin';
  onSuccess: (role: 'barbeiro' | 'administrador' | 'super_admin', matchedBarberId?: string) => void;
  barbeiros?: Barbeiro[];
  activeBarberId?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onSuccess,
  barbeiros = [],
  activeBarberId,
}) => {
  const [selectedRole, setSelectedRole] = useState<'barbeiro' | 'administrador' | 'super_admin'>(targetRole);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Sync state if opened with another role
  React.useEffect(() => {
    setSelectedRole(targetRole);
    setError(null);
    setPin('');
  }, [targetRole, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim();
    const cleanPinLower = cleanPin.toLowerCase();

    // PIN/Password validation
    if (selectedRole === 'super_admin') {
      const isMasterValid =
        ['master123', 'master', 'super123', 'superadmin', '1234', '123456', 'admin', 'admin123', 'dono', 'dono123'].includes(cleanPinLower) ||
        cleanPin === localStorage.getItem('lider_master_pin');

      if (isMasterValid) {
        onSuccess('super_admin');
        setPin('');
      } else {
        setError('Senha Master incorreta. A senha padrão de acesso é: master123 (ou 1234)');
      }
    } else if (selectedRole === 'administrador') {
      const isAdminValid =
        ['admin123', 'admin', '1234', '123456', 'master123'].includes(cleanPinLower) ||
        cleanPin === localStorage.getItem('lider_admin_pin');

      if (isAdminValid) {
        onSuccess('administrador');
        setPin('');
      } else {
        setError('Senha de Administrador incorreta. A senha padrão de acesso é: admin123 (ou 1234)');
      }
    } else if (selectedRole === 'barbeiro') {
      // Checar se o PIN bate com o barbeiro ativo ou algum barbeiro cadastrado
      const matchedByPin = barbeiros.find((b) => b.pin && b.pin === cleanPin);
      const activeBarb = barbeiros.find((b) => b.id === activeBarberId);
      const isCommonPin = ['barber123', 'barbeiro123', 'barber', '1234', '123456'].includes(cleanPinLower);

      if (isCommonPin) {
        onSuccess('barbeiro', activeBarberId || (barbeiros[0] ? barbeiros[0].id : undefined));
        setPin('');
      } else if (activeBarb && activeBarb.pin === cleanPin) {
        onSuccess('barbeiro', activeBarb.id);
        setPin('');
      } else if (matchedByPin) {
        onSuccess('barbeiro', matchedByPin.id);
        setPin('');
      } else {
        setError('Senha ou PIN de Barbeiro incorreta. A senha padrão de acesso é: barber123 (ou 1234)');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#D4AF37]">
              {selectedRole === 'super_admin' ? (
                <Crown className="w-5 h-5 text-amber-400" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold font-display tracking-wide">
                Acesso Restrito da Equipe
              </h3>
              <p className="text-xs text-[#C5A059]">
                {selectedRole === 'super_admin'
                  ? 'Painel Master (Super Admin)'
                  : selectedRole === 'administrador'
                  ? 'Admin da Barbearia'
                  : 'Painel do Barbeiro'}
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

        {/* Role Selector inside Modal for authorized staff */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-[11px]">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('barbeiro');
              setError(null);
            }}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
              selectedRole === 'barbeiro'
                ? 'bg-[#D4AF37] text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Barbeiro
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('administrador');
              setError(null);
            }}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
              selectedRole === 'administrador'
                ? 'bg-[#D4AF37] text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('super_admin');
              setError(null);
            }}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
              selectedRole === 'super_admin'
                ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Master
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          {selectedRole === 'super_admin'
            ? 'Acesso exclusivo para o Dono do App (Super Admin) gerenciar barbearias e administradores cadastrados.'
            : selectedRole === 'administrador'
            ? 'Área restrita ao administrador da unidade para controle de equipe, serviços e relatórios.'
            : 'Área restrita para o barbeiro visualizar sua própria agenda e seus ganhos individuais.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              {selectedRole === 'super_admin'
                ? 'Senha Master (Dono)'
                : selectedRole === 'administrador'
                ? 'Senha de Administrador'
                : 'Senha do Barbeiro'}
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Digite a senha de acesso..."
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
              <span>Proteção e Sigilo de Dados (RBAC)</span>
            </div>
            <p className="text-zinc-400">
              Senha deste painel:{' '}
              <button
                type="button"
                onClick={() => {
                  setPin(selectedRole === 'super_admin' ? 'master123' : selectedRole === 'administrador' ? 'admin123' : 'barber123');
                  setError(null);
                }}
                className="font-bold text-[#D4AF37] hover:underline bg-[#D4AF37]/10 px-1.5 py-0.5 rounded cursor-pointer"
                title="Clique para preencher"
              >
                {selectedRole === 'super_admin' ? 'master123' : selectedRole === 'administrador' ? 'admin123' : 'barber123'}
              </button>
              {' '}(ou <strong>1234</strong>)
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
              Acessar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
