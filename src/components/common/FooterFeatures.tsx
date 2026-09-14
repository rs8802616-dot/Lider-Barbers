import React from 'react';
import { Calendar, Clock, Sliders, Smartphone, Crown } from 'lucide-react';

export const FooterFeatures: React.FC = () => {
  return (
    <footer className="w-full bg-[#0D0D0F] border-t border-zinc-800/80 mt-12 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#D4AF37]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Agendamento fácil e rápido</p>
              <p className="text-[11px] text-zinc-500">Reserve em segundos pelo celular</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#D4AF37]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Horários em tempo real</p>
              <p className="text-[11px] text-zinc-500">Disponibilidade atualizada</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#D4AF37]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Controle total da agenda</p>
              <p className="text-[11px] text-zinc-500">Gestão para barbeiro e admin</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#D4AF37]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Tudo em um só lugar</p>
              <p className="text-[11px] text-zinc-500">PWA compatível com iOS e Android</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-semibold text-zinc-300">Barbearia Liberdade</span>
            <span>—</span>
            <span>Tecnologia a favor do seu estilo.</span>
          </div>
          <p className="text-[11px]">
            &copy; {new Date().getFullYear()} Barbearia Liberdade. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
