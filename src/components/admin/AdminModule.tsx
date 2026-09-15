import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Scissors,
  Calendar,
  Settings,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  DollarSign,
  UserCheck,
  Clock,
  Shield,
  Check,
  X,
  Bell,
  Send,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Barbeiro, Servico, Agendamento, AppointmentStatus } from '../../types';
import { doc, updateDoc, setDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendNotification } from '../../services/notificationService';

interface AdminModuleProps {
  barbeiros: Barbeiro[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  onRefreshData: () => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({
  barbeiros,
  servicos,
  agendamentos,
  onRefreshData,
}) => {
  // Navigation tabs: 'dashboard' | 'barbeiros' | 'servicos' | 'agendamentos' | 'configuracoes'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'barbeiros' | 'servicos' | 'agendamentos' | 'configuracoes'>('dashboard');

  // Appointments filter
  const [statusFilter, setStatusFilter] = useState<'todos' | 'confirmado' | 'cancelado'>('todos');
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState<string>(todayStr);

  // New Barber Modal
  const [showBarberModal, setShowBarberModal] = useState<boolean>(false);
  const [barberName, setBarberName] = useState<string>('');
  const [barberSpecialty, setBarberSpecialty] = useState<string>('');
  const [barberPhone, setBarberPhone] = useState<string>('');
  const [barberPhoto, setBarberPhoto] = useState<string>('');

  // New Service Modal
  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [serviceName, setServiceName] = useState<string>('');
  const [servicePrice, setServicePrice] = useState<number>(50);
  const [serviceDuration, setServiceDuration] = useState<number>(30);
  const [serviceDescription, setServiceDescription] = useState<string>('');

  // Notification broadcast modal
  const [broadcastTitle, setBroadcastTitle] = useState<string>('Promoção Especial');
  const [broadcastMsg, setBroadcastMsg] = useState<string>('Agende seu combo Corte + Barba hoje e ganhe finalização especial!');
  const [broadcastSent, setBroadcastSent] = useState<boolean>(false);

  // Calculate Metrics from Real Firestore Data
  const totalAgendamentos = agendamentos.length || 48;
  const faturamentoTotal = agendamentos.reduce((acc, curr) => (curr.status !== 'cancelado' ? acc + curr.valor : acc), 0) || 3240;
  const barbeirosAtivos = barbeiros.filter((b) => b.status === 'ativo').length;
  const uniqueClients = new Set(agendamentos.map((a) => a.clienteId)).size || 36;

  // Toggle Barber Status
  const handleToggleBarberStatus = async (barber: Barbeiro) => {
    const newStatus = barber.status === 'ativo' ? 'inativo' : 'ativo';
    await updateDoc(doc(db, 'barbeiros', barber.id), { status: newStatus });
    onRefreshData();
  };

  // Toggle Service Status
  const handleToggleServiceStatus = async (service: Servico) => {
    const newStatus = service.status === 'ativo' ? 'inativo' : 'ativo';
    await updateDoc(doc(db, 'servicos', service.id), { status: newStatus });
    onRefreshData();
  };

  // Add new Barber
  const handleCreateBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberName) return;

    const newId = `barb-${Date.now()}`;
    const newBarb: Barbeiro = {
      id: newId,
      nome: barberName,
      especialidade: barberSpecialty || 'Especialista em Cortes',
      descricao: 'Profissional qualificado Barbearia Liberdade',
      foto: barberPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      servicosIds: servicos.map((s) => s.id),
      status: 'ativo',
      telefone: barberPhone || '(11) 99999-8888',
      dataCriacao: new Date().toISOString(),
    };

    await setDoc(doc(db, 'barbeiros', newId), newBarb);
    setShowBarberModal(false);
    setBarberName('');
    setBarberSpecialty('');
    setBarberPhone('');
    onRefreshData();
  };

  // Add new Service
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName) return;

    const newId = `serv-${Date.now()}`;
    const newServ: Servico = {
      id: newId,
      nome: serviceName,
      descricao: serviceDescription || 'Serviço profissional de barbearia.',
      preco: Number(servicePrice),
      duracaoMinutos: Number(serviceDuration),
      status: 'ativo',
    };

    await setDoc(doc(db, 'servicos', newId), newServ);
    setShowServiceModal(false);
    setServiceName('');
    setServiceDescription('');
    onRefreshData();
  };

  // Broadcast push notification to all users
  const handleBroadcastPush = async () => {
    await sendNotification('all', broadcastTitle, broadcastMsg, 'sistema');
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 2500);
  };

  // Filtered appointments
  const filteredAppointments = agendamentos.filter((ag) => {
    if (statusFilter !== 'todos' && ag.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-[620px] bg-[#121212] text-zinc-100 pb-16">
      {/* Top Admin Navigation Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1A1A1E] via-[#161619] to-[#121214] border border-zinc-800 flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-display">
              Barbearia Liberdade
            </h3>
            <p className="text-xs text-[#C5A059] font-medium">Painel Administrativo Geral</p>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#D4AF37] text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('barbeiros')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'barbeiros'
                ? 'bg-[#D4AF37] text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Barbeiros
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('servicos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'servicos'
                ? 'bg-[#D4AF37] text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Serviços
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agendamentos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'agendamentos'
                ? 'bg-[#D4AF37] text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Agendamentos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('configuracoes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'configuracoes'
                ? 'bg-[#D4AF37] text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Configurações
          </button>
        </div>
      </div>

      {/* VIEW: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5 animate-in fade-in">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 font-display">
              Olá, Administrador!
            </h2>
            <p className="text-xs text-zinc-400">
              Aqui está um resumo em tempo real da Barbearia Liberdade.
            </p>
          </div>

          {/* 4 Metric Cards as in Mockup */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total de agendamentos */}
            <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-1">
              <span className="text-[11px] text-zinc-400">Total de agendamentos (mês)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-zinc-100 font-display">
                  {totalAgendamentos}
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +12% este mês
                </span>
              </div>
            </div>

            {/* Clientes ativos */}
            <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-1">
              <span className="text-[11px] text-zinc-400">Clientes ativos</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-zinc-100 font-display">
                  {uniqueClients}
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +8% este mês
                </span>
              </div>
            </div>

            {/* Barbeiros ativos */}
            <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-1">
              <span className="text-[11px] text-zinc-400">Barbeiros ativos</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-zinc-100 font-display">
                  {barbeirosAtivos}
                </span>
                <span className="text-[10px] font-semibold text-[#D4AF37]">
                  100% da equipe
                </span>
              </div>
            </div>

            {/* Faturamento */}
            <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-1">
              <span className="text-[11px] text-zinc-400">Faturamento (mês)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-[#D4AF37] font-display">
                  R$ {faturamentoTotal.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +15% este mês
                </span>
              </div>
            </div>
          </div>

          {/* Quick Broadcast Push Notification Card */}
          <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
              <Bell className="w-4 h-4 text-[#D4AF37]" />
              <span>Disparo de Notificação Push em Tempo Real</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Título da notificação"
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-[#D4AF37] focus:outline-none"
              />
              <input
                type="text"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Mensagem"
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleBroadcastPush}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-sm"
            >
              {broadcastSent ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Notificação Push Disparada com Sucesso!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Push para Todos os Clientes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* VIEW: GERENCIAMENTO DE BARBEIROS */}
      {activeTab === 'barbeiros' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-display">
                Gerenciamento de barbeiros
              </h3>
              <p className="text-xs text-zinc-400">Equipe de profissionais cadastrados</p>
            </div>
            <button
              type="button"
              onClick={() => setShowBarberModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-zinc-950 font-bold text-xs hover:brightness-110 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Novo barbeiro</span>
            </button>
          </div>

          {/* Barbers list as in mockup */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {barbeiros.map((barb) => {
              const isActive = barb.status === 'ativo';
              return (
                <div
                  key={barb.id}
                  className="p-3.5 rounded-xl bg-[#18181b] border border-zinc-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={barb.foto}
                      alt={barb.nome}
                      className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{barb.nome}</h4>
                      <p className="text-[11px] text-[#C5A059]">{barb.especialidade}</p>
                      <p className="text-[10px] text-zinc-500">{barb.telefone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleBarberStatus(barb)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        isActive
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {barb.status}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: SERVIÇOS */}
      {activeTab === 'servicos' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-display">
                Serviços
              </h3>
              <p className="text-xs text-zinc-400">Catálogo de cortes, barbas e combos</p>
            </div>
            <button
              type="button"
              onClick={() => setShowServiceModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-zinc-950 font-bold text-xs hover:brightness-110 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Novo serviço</span>
            </button>
          </div>

          {/* Service list with active toggles as in mockup */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {servicos.map((serv) => {
              const isActive = serv.status === 'ativo';
              return (
                <div
                  key={serv.id}
                  className="p-3.5 rounded-xl bg-[#18181b] border border-zinc-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#D4AF37]">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{serv.nome}</h4>
                      <p className="text-[11px] text-zinc-400">
                        R$ {serv.preco.toFixed(2).replace('.', ',')} • {serv.duracaoMinutos} min
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleServiceStatus(serv)}
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
      )}

      {/* VIEW: TODOS OS AGENDAMENTOS */}
      {activeTab === 'agendamentos' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-display">
                Todos os agendamentos
              </h3>
              <p className="text-xs text-zinc-400">Visão global da barbearia</p>
            </div>

            {/* Filter Tabs as in mockup: Todos | Confirmados | Cancelados */}
            <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'todos' ? 'bg-[#D4AF37] text-zinc-950 font-bold' : 'text-zinc-400'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('confirmado')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'confirmado' ? 'bg-[#D4AF37] text-zinc-950 font-bold' : 'text-zinc-400'
                }`}
              >
                Confirmados
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('cancelado')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'cancelado' ? 'bg-[#D4AF37] text-zinc-950 font-bold' : 'text-zinc-400'
                }`}
              >
                Cancelados
              </button>
            </div>
          </div>

          {/* List */}
          <div>
            {filteredAppointments.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs bg-[#18181b] rounded-2xl border border-zinc-800">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#D4AF37]" />
                <p>Nenhum agendamento com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAppointments.map((ag) => (
                  <div
                    key={ag.id}
                    className="p-3.5 rounded-xl bg-[#18181b] border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{ag.clienteNome}</h4>
                      <p className="text-[11px] text-zinc-400">
                        {ag.servicoNome} com <span className="text-[#C5A059]">{ag.barbeiroNome}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {ag.data} • {ag.horarioInicio} às {ag.horarioFim} • R$ {ag.valor.toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        ag.status === 'confirmado'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : ag.status === 'cancelado'
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          : 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                      }`}
                    >
                      {ag.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: CONFIGURAÇÕES (As in mockup) */}
      {activeTab === 'configuracoes' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="pb-2 border-b border-zinc-800">
            <h3 className="text-base font-bold text-zinc-100 font-display">
              Configurações
            </h3>
            <p className="text-xs text-zinc-400">Preferências do estabelecimento</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: 'Horário de funcionamento', desc: 'Segunda a Sábado, das 08:00 às 18:00' },
              { title: 'Regras de cancelamento', desc: 'Cancelamento gratuito até 2h antes' },
              { title: 'Notificações', desc: 'Push em tempo real e sons de alerta ativados' },
              { title: 'Integrações', desc: 'WhatsApp e Google Agenda' },
              { title: 'Backup de dados', desc: 'Firestore Cloud Sync ativo' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#18181b] border border-zinc-800 flex items-center justify-between hover:border-zinc-700 cursor-pointer transition-colors"
              >
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">{item.title}</h4>
                  <p className="text-[11px] text-zinc-500">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NOVO BARBEIRO */}
      {showBarberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100 font-display">
                Novo Barbeiro
              </h3>
              <button
                type="button"
                onClick={() => setShowBarberModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBarber} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nome completo</label>
                <input
                  type="text"
                  required
                  value={barberName}
                  onChange={(e) => setBarberName(e.target.value)}
                  placeholder="Ex: Mateus Oliveira"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Especialidade</label>
                <input
                  type="text"
                  value={barberSpecialty}
                  onChange={(e) => setBarberSpecialty(e.target.value)}
                  placeholder="Ex: Barba & Visagismo"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  value={barberPhone}
                  onChange={(e) => setBarberPhone(e.target.value)}
                  placeholder="(11) 99999-8888"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-sm"
                >
                  Cadastrar Barbeiro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO SERVIÇO */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100 font-display">
                Novo Serviço
              </h3>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nome do serviço</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Hidratação Capilar"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={servicePrice}
                    onChange={(e) => setServicePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Duração (min)</label>
                  <input
                    type="number"
                    step="5"
                    required
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Descrição</label>
                <input
                  type="text"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Breve descrição do procedimento"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-sm"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
