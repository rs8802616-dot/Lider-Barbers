import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Clock,
  Scissors,
  Settings,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  XCircle,
  UserCheck,
  Save,
  Check,
} from 'lucide-react';
import {
  Barbeiro,
  Agendamento,
  Disponibilidade,
  AppointmentStatus,
  Servico,
} from '../../types';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendNotification } from '../../services/notificationService';

interface BarberModuleProps {
  currentBarber: Barbeiro;
  agendamentos: Agendamento[];
  servicos: Servico[];
  disponibilidade?: Disponibilidade;
  onRefreshData: () => void;
}

export const BarberModule: React.FC<BarberModuleProps> = ({
  currentBarber,
  agendamentos,
  servicos,
  disponibilidade,
  onRefreshData,
}) => {
  // Navigation: 'agenda' | 'clientes' | 'disponibilidade' | 'servicos' | 'config'
  const [activeScreen, setActiveScreen] = useState<'agenda' | 'clientes' | 'disponibilidade' | 'servicos'>('agenda');

  // Agenda view mode: 'diaria' | 'semanal' | 'mensal'
  const [agendaMode, setAgendaMode] = useState<'diaria' | 'semanal' | 'mensal'>('diaria');

  // Active date for agenda
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Selected appointment for detail modal
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);

  // Availability form state
  const [workingDays, setWorkingDays] = useState<number[]>(disponibilidade?.diasSemana || [1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState<string>(disponibilidade?.horarioInicio || '08:00');
  const [endTime, setEndTime] = useState<string>(disponibilidade?.horarioFim || '18:00');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(disponibilidade?.intervaloMinutos ?? 10);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (disponibilidade) {
      setWorkingDays(disponibilidade.diasSemana || [1, 2, 3, 4, 5, 6]);
      setStartTime(disponibilidade.horarioInicio || '08:00');
      setEndTime(disponibilidade.horarioFim || '18:00');
      setIntervalMinutes(disponibilidade.intervaloMinutos ?? 10);
    }
  }, [disponibilidade]);

  // Filter appointments for this barber
  const barberAgendamentos = agendamentos.filter((a) => a.barbeiroId === currentBarber.id);

  // Day's appointments
  const dailyAppointments = barberAgendamentos.filter((a) => a.data === selectedDate);

  // Update appointment status
  const handleUpdateStatus = async (agendamentoId: string, newStatus: AppointmentStatus) => {
    try {
      const ref = doc(db, 'agendamentos', agendamentoId);
      await updateDoc(ref, { status: newStatus });

      const target = barberAgendamentos.find((a) => a.id === agendamentoId);
      if (target) {
        let msg = `O status do seu agendamento foi alterado para "${newStatus}".`;
        if (newStatus === 'em_atendimento') msg = `${currentBarber.nome} iniciou seu atendimento!`;
        if (newStatus === 'concluido') msg = `Atendimento concluído! Obrigado pela preferência na Barbearia Liberdade.`;
        if (newStatus === 'confirmado') msg = `Seu horário foi confirmado pelo barbeiro ${currentBarber.nome}.`;

        await sendNotification(
          target.clienteId,
          'Atualização de Agendamento',
          msg,
          newStatus === 'concluido' ? 'confirmacao' : 'sistema',
          agendamentoId
        );
      }

      onRefreshData();
      if (selectedAgendamento && selectedAgendamento.id === agendamentoId) {
        setSelectedAgendamento({ ...selectedAgendamento, status: newStatus });
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // Save Availability
  const handleSaveDisponibilidade = async () => {
    try {
      const dispId = disponibilidade?.id || `disp-${currentBarber.id}`;
      const updated: Disponibilidade = {
        id: dispId,
        barbeiroId: currentBarber.id,
        diasSemana: workingDays,
        horarioInicio: startTime,
        horarioFim: endTime,
        intervaloMinutos: intervalMinutes,
        dataAtualizacao: new Date().toISOString(),
      };

      await setDoc(doc(db, 'disponibilidades', dispId), updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onRefreshData();
    } catch (err) {
      console.error('Erro ao salvar disponibilidade:', err);
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (workingDays.includes(dayIndex)) {
      setWorkingDays(workingDays.filter((d) => d !== dayIndex));
    } else {
      setWorkingDays([...workingDays, dayIndex].sort());
    }
  };

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Unique clients for this barber
  const clientMap = new Map<string, { nome: string; telefone: string; lastService: string; lastDate: string; total: number }>();
  barberAgendamentos.forEach((ag) => {
    const existing = clientMap.get(ag.clienteId);
    if (!existing) {
      clientMap.set(ag.clienteId, {
        nome: ag.clienteNome,
        telefone: ag.clienteTelefone,
        lastService: ag.servicoNome,
        lastDate: ag.data,
        total: 1,
      });
    } else {
      existing.total += 1;
      if (ag.data > existing.lastDate) {
        existing.lastDate = ag.data;
        existing.lastService = ag.servicoNome;
      }
    }
  });
  const clientsList = Array.from(clientMap.values());

  return (
    <div className="flex flex-col min-h-[620px] bg-[#121212] text-zinc-100 pb-16">
      {/* Barber Profile Header Card as in Mockup */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1A1A1E] via-[#161619] to-[#121214] border border-zinc-800 flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <img
            src={currentBarber.foto}
            alt={currentBarber.nome}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-display">
                {currentBarber.nome}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-semibold border border-[#D4AF37]/30">
                Barbeiro
              </span>
            </div>
            <p className="text-xs text-zinc-400">{currentBarber.especialidade}</p>
          </div>
        </div>

        {/* Quick Tabs Menu */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveScreen('agenda')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeScreen === 'agenda'
                ? 'bg-[#D4AF37] text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Agenda
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen('clientes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeScreen === 'clientes'
                ? 'bg-[#D4AF37] text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Clientes
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen('disponibilidade')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeScreen === 'disponibilidade'
                ? 'bg-[#D4AF37] text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Disponibilidade
          </button>
        </div>
      </div>

      {/* SCREEN 1: MINHA AGENDA */}
      {activeScreen === 'agenda' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Header row & View Mode Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
            <h3 className="text-base font-bold text-zinc-100 font-display">
              Minha agenda
            </h3>

            {/* Diária, Semanal, Mensal */}
            <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setAgendaMode('diaria')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  agendaMode === 'diaria' ? 'bg-[#D4AF37] text-zinc-950 font-bold' : 'text-zinc-400'
                }`}
              >
                Diária
              </button>
              <button
                type="button"
                onClick={() => setAgendaMode('semanal')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  agendaMode === 'semanal' ? 'bg-[#D4AF37] text-zinc-950 font-bold' : 'text-zinc-400'
                }`}
              >
                Semanal
              </button>
              <button
                type="button"
                onClick={() => setAgendaMode('mensal')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  agendaMode === 'mensal' ? 'bg-[#D4AF37] text-zinc-950 font-bold' : 'text-zinc-400'
                }`}
              >
                Mensal
              </button>
            </div>
          </div>

          {/* Date Selector Header `< 16 de Abril de 2025 >` */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00');
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-zinc-200 font-display">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>

            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00');
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Agenda Appointments List */}
          <div>
            {dailyAppointments.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs bg-[#18181b] rounded-2xl border border-zinc-800">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#D4AF37]" />
                <p>Nenhum agendamento para esta data.</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Os clientes que reservarem aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dailyAppointments.map((ag) => {
                  const isConfirmed = ag.status === 'confirmado';
                  const isInService = ag.status === 'em_atendimento';
                  const isScheduled = ag.status === 'agendado';
                  const isCompleted = ag.status === 'concluido';
                  const isCancelled = ag.status === 'cancelado';

                  return (
                    <div
                      key={ag.id}
                      onClick={() => setSelectedAgendamento(ag)}
                      className="p-3.5 rounded-xl bg-[#18181b] border border-zinc-800 hover:border-[#D4AF37]/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[70px] py-1 px-2 rounded-lg bg-zinc-900 border border-zinc-800">
                          <span className="text-xs font-bold text-zinc-100">
                            {ag.horarioInicio}
                          </span>
                          <span className="block text-[10px] text-zinc-500">
                            {ag.horarioFim}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-zinc-100">{ag.clienteNome}</h4>
                          <p className="text-[11px] text-zinc-400">{ag.servicoNome}</p>
                        </div>
                      </div>

                      {/* Badge as in Mockup */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isConfirmed
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : isInService
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                            : isScheduled
                            ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                            : isCompleted
                            ? 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                            : isCancelled
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {ag.status === 'em_atendimento' ? 'Em atendimento' : ag.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 2: MEUS CLIENTES */}
      {activeScreen === 'clientes' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-base font-bold text-zinc-100 font-display">
              Meus clientes
            </h3>
            <span className="text-xs text-zinc-400">Total: {clientsList.length}</span>
          </div>

          <div>
            {clientsList.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs bg-[#18181b] rounded-2xl border border-zinc-800">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#D4AF37]" />
                <p>Nenhum cliente agendado ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clientsList.map((cli, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#18181b] border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-[#D4AF37]">
                        {cli.nome.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-100">{cli.nome}</h4>
                        <p className="text-[11px] text-zinc-400">{cli.telefone}</p>
                        <p className="text-[10px] text-zinc-500">
                          Último serviço: {cli.lastService} ({cli.total}x)
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/55${cli.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      title="Conversar no WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 3: MINHA DISPONIBILIDADE (As in Mockup) */}
      {activeScreen === 'disponibilidade' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="pb-2 border-b border-zinc-800">
            <h3 className="text-base font-bold text-zinc-100 font-display">
              Minha disponibilidade
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure seus dias de trabalho, expediente e intervalos de descanso.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Dias de trabalho */}
            <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 font-display">
                Dias de trabalho
              </h4>

              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                  const isActive = workingDays.includes(dayIdx);
                  return (
                    <div
                      key={dayIdx}
                      onClick={() => toggleDay(dayIdx)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors"
                    >
                      <span className="text-xs text-zinc-200 font-medium">
                        {dayNames[dayIdx]}
                      </span>

                      <button
                        type="button"
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                          isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Horário de atendimento & Intervalo */}
            <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Horário de atendimento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Início</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Término</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Intervalo entre atendimentos
                </label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value={0}>Sem intervalo (0 minutos)</option>
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos (padrão)</option>
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                </select>
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveDisponibilidade}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 mt-4"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Alterações Salvas com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHES DO CLIENTE / AGENDAMENTO MODAL (As shown in mockup) */}
      {selectedAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100 font-display">
                Detalhes do cliente
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAgendamento(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Client info card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-[#D4AF37] flex items-center justify-center font-bold text-sm text-[#D4AF37]">
                {selectedAgendamento.clienteNome.charAt(0)}
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-zinc-100">
                  {selectedAgendamento.clienteNome}
                </h4>
                <p className="text-[11px] text-zinc-400">{selectedAgendamento.clienteTelefone}</p>
              </div>

              <a
                href={`https://wa.me/55${selectedAgendamento.clienteTelefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                title="Conversar no WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>

            {/* Appointment details */}
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Serviço:</span>
                <span className="font-semibold text-zinc-100">
                  {selectedAgendamento.servicoNome}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Duração / Valor:</span>
                <span className="text-[#D4AF37] font-semibold">
                  {selectedAgendamento.duracaoMinutos} min • R${' '}
                  {selectedAgendamento.valor.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Horário:</span>
                <span className="text-zinc-200">
                  {selectedAgendamento.data} • {selectedAgendamento.horarioInicio} - {selectedAgendamento.horarioFim}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-zinc-400">Status atual:</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  {selectedAgendamento.status}
                </span>
              </div>
            </div>

            {/* Change status actions as in mockup */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedAgendamento.id, 'concluido')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-sm"
              >
                Marcar como concluído
              </button>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedAgendamento.id, 'em_atendimento')}
                  className="py-2 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                >
                  Em atendimento
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedAgendamento.id, 'confirmado')}
                  className="py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                >
                  Confirmado
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedAgendamento.id, 'nao_compareceu')}
                  className="py-2 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                >
                  Não compareceu
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedAgendamento.id, 'cancelado')}
                  className="py-2 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
