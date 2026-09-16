import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Sparkles,
  Crown,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  XCircle,
  Share2,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Barbeiro,
  Servico,
  Agendamento,
  UserProfile,
} from '../../types';
import { getAvailableSlots, createAgendamentoSeguro, cancelarAgendamento } from '../../services/bookingService';

interface ClientModuleProps {
  currentUser: UserProfile;
  barbeiros: Barbeiro[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  onRefreshData: () => void;
  onOpenStaffLogin?: () => void;
  initialBarberId?: string | null;
  initialTab?: 'home' | 'agendar' | 'agendamentos' | 'perfil';
}

export const ClientModule: React.FC<ClientModuleProps> = ({
  currentUser,
  barbeiros,
  servicos,
  agendamentos,
  onRefreshData,
  onOpenStaffLogin,
  initialBarberId,
  initialTab = 'home',
}) => {
  // Navigation tabs: 'home' | 'agendar' | 'agendamentos' | 'perfil'
  const [activeTab, setActiveTab] = useState<'home' | 'agendar' | 'agendamentos' | 'perfil'>(initialTab);

  // Wizard steps: 1 = Servico, 2 = Barbeiro, 3 = Data e Horário, 4 = Confirmar
  // Se veio por link direto do barbeiro, inicia no passo 1 (Serviço) ou 3 (Data) com o barbeiro já selecionado
  const [wizardStep, setWizardStep] = useState<number>(initialBarberId ? 1 : 1);
  const [selectedServicoId, setSelectedServicoId] = useState<string>('serv-corte');
  const [selectedBarbeiroId, setSelectedBarbeiroId] = useState<string>(() => {
    if (initialBarberId && barbeiros.some((b) => b.id === initialBarberId)) {
      return initialBarberId;
    }
    const saved = localStorage.getItem('lider_prefered_barber_id');
    if (saved && barbeiros.some((b) => b.id === saved)) {
      return saved;
    }
    return 'barb-carlos';
  });

  // Track if user arrived through direct barber invitation link
  const [invitedBarber, setInvitedBarber] = useState<Barbeiro | null>(() => {
    if (initialBarberId) {
      return barbeiros.find((b) => b.id === initialBarberId) || null;
    }
    return null;
  });

  // Update selection if initialBarberId changes
  useEffect(() => {
    if (initialBarberId) {
      const found = barbeiros.find((b) => b.id === initialBarberId);
      if (found) {
        setSelectedBarbeiroId(found.id);
        setInvitedBarber(found);
        localStorage.setItem('lider_prefered_barber_id', found.id);
      }
    }
  }, [initialBarberId, barbeiros]);

  // Save selected barber preference whenever it changes
  const handleSelectBarber = (barberId: string) => {
    setSelectedBarbeiroId(barberId);
    localStorage.setItem('lider_prefered_barber_id', barberId);
  };

  // Date selection (default today or tomorrow)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('15:00');
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean; reason?: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Booking state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client Identification fields for real customer booking
  const [clientNome, setClientNome] = useState<string>(() => {
    return localStorage.getItem('lider_client_nome') || currentUser.nome || '';
  });
  const [clientTelefone, setClientTelefone] = useState<string>(() => {
    return localStorage.getItem('lider_client_telefone') || currentUser.telefone || '';
  });

  // Appointments filter tab
  const [appointmentsTab, setAppointmentsTab] = useState<'proximos' | 'historico'>('proximos');

  // Selected service and barber objects
  const selectedServico = servicos.find((s) => s.id === selectedServicoId) || servicos[0];
  const selectedBarbeiro = barbeiros.find((b) => b.id === selectedBarbeiroId) || barbeiros[0];

  // Fetch slots whenever barber, date, or service changes
  useEffect(() => {
    if (selectedBarbeiroId && selectedDate && selectedServico) {
      let isMounted = true;
      setLoadingSlots(true);
      getAvailableSlots(selectedBarbeiroId, selectedDate, selectedServico.duracaoMinutos || 30)
        .then((slots) => {
          if (isMounted) {
            setAvailableSlots(slots);
            // If currently selected time is not in available slots, pick first available
            const firstAvail = slots.find((s) => s.available);
            if (firstAvail && !slots.some((s) => s.time === selectedTime && s.available)) {
              setSelectedTime(firstAvail.time);
            }
            setLoadingSlots(false);
          }
        })
        .catch((err) => {
          console.error('Error fetching slots:', err);
          if (isMounted) setLoadingSlots(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [selectedBarbeiroId, selectedDate, selectedServico, agendamentos]);

  // Handle Booking Confirmation
  const handleConfirmBooking = async () => {
    if (!selectedServico || !selectedBarbeiro || !selectedDate || !selectedTime) return;

    const name = clientNome.trim();
    const phone = clientTelefone.trim();

    if (!name) {
      setErrorMessage('Por favor, informe seu nome para o agendamento.');
      return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      setErrorMessage('Por favor, informe seu WhatsApp com DDD.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Save profile locally for future seamless visits
    localStorage.setItem('lider_client_nome', name);
    localStorage.setItem('lider_client_telefone', phone);
    const cleanDigits = phone.replace(/\D/g, '');
    const finalClientId = `cli-${cleanDigits}`;
    localStorage.setItem('lider_client_id', finalClientId);

    // Calculate end time
    const [h, m] = selectedTime.split(':').map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + selectedServico.duracaoMinutos;
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const horarioFim = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const newBooking: Omit<Agendamento, 'id'> = {
      clienteId: finalClientId,
      clienteNome: name,
      clienteTelefone: phone,
      barbeiroId: selectedBarbeiro.id,
      barbeiroNome: selectedBarbeiro.nome,
      servicoId: selectedServico.id,
      servicoNome: selectedServico.nome,
      data: selectedDate,
      horarioInicio: selectedTime,
      horarioFim,
      duracaoMinutos: selectedServico.duracaoMinutos,
      status: 'confirmado',
      valor: selectedServico.preco,
      dataCriacao: new Date().toISOString(),
    };

    const res = await createAgendamentoSeguro(newBooking);

    if (res.success) {
      // Trigger golden celebration confetti
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#F5DF96', '#ffffff', '#B38F2E'],
        });
      } catch (e) {
        console.debug('Confetti error:', e);
      }

      setBookingSuccess(true);
      onRefreshData();
      setTimeout(() => {
        setBookingSuccess(false);
        setWizardStep(1);
        setActiveTab('agendamentos');
      }, 1600);
    } else {
      setErrorMessage(res.error || 'Erro ao confirmar agendamento.');
    }
    setIsSubmitting(false);
  };

  // Calendar Helpers
  const renderCalendar = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = selectedDate === dateString;
      const isPast = new Date(dateString + 'T23:59:59') < new Date();

      days.push(
        <button
          key={d}
          type="button"
          disabled={isPast}
          onClick={() => setSelectedDate(dateString)}
          className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
            isSelected
              ? 'bg-[#D4AF37] text-zinc-950 font-bold shadow-md shadow-[#D4AF37]/20 ring-2 ring-[#D4AF37]/50'
              : isPast
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
          }`}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4">
        {/* Calendar Nav */}
        <div className="flex items-center justify-between mb-3 text-sm font-semibold text-zinc-200">
          <button
            type="button"
            onClick={() => setCurrentCalendarMonth(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-display tracking-wider">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setCurrentCalendarMonth(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-500 mb-2">
          <span>D</span>
          <span>S</span>
          <span>T</span>
          <span>Q</span>
          <span>Q</span>
          <span>S</span>
          <span>S</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">{days}</div>
      </div>
    );
  };

  // User's appointments - match by ID, phone, or saved client credentials
  const clientAppointments = agendamentos.filter((a) => {
    const savedPhone = (localStorage.getItem('lider_client_telefone') || clientTelefone).replace(/\D/g, '');
    const savedId = localStorage.getItem('lider_client_id') || currentUser.id;
    if (savedId && a.clienteId === savedId) return true;
    if (savedPhone && a.clienteTelefone && a.clienteTelefone.replace(/\D/g, '') === savedPhone) return true;
    if (clientNome.trim() && a.clienteNome && a.clienteNome.toLowerCase() === clientNome.trim().toLowerCase()) return true;
    return false;
  });
  const upcomingAppointments = clientAppointments.filter(
    (a) => a.status !== 'cancelado' && a.status !== 'concluido'
  );
  const pastAppointments = clientAppointments.filter(
    (a) => a.status === 'cancelado' || a.status === 'concluido'
  );

  return (
    <div className="flex flex-col min-h-[550px] text-zinc-100 pb-20 sm:pb-4">
      {/* Top Client Navigation for Tablet & PC */}
      <div className="hidden sm:flex items-center justify-between pb-4 mb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 shadow-md shadow-[#D4AF37]/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Início</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setActiveTab('agendar');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'agendar'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 shadow-md shadow-[#D4AF37]/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Agendar Horário</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agendamentos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all relative ${
              activeTab === 'agendamentos'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 shadow-md shadow-[#D4AF37]/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Meus Agendamentos</span>
            {upcomingAppointments.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'agendamentos'
                    ? 'bg-zinc-950 text-[#D4AF37]'
                    : 'bg-[#D4AF37] text-zinc-950'
                }`}
              >
                {upcomingAppointments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'perfil'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 shadow-md shadow-[#D4AF37]/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Perfil</span>
          </button>
        </div>

        <div className="text-right">
          <p className="text-xs text-zinc-400">Cliente</p>
          <p className="text-sm font-bold text-zinc-100">{currentUser.nome}</p>
        </div>
      </div>

      {/* VIEW: HOME SCREEN */}
      {activeTab === 'home' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Welcome User */}
          <div className="px-1">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 font-display">
              Olá, {currentUser.nome}!
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
              Bem-vindo à Líder Barbers. Escolha o serviço, o barbeiro e agende seu horário.
            </p>
          </div>

          {/* Banner de Acesso por Link Personalizado do Barbeiro */}
          {invitedBarber && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 via-zinc-900 to-[#18181c] border border-[#D4AF37]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <img
                  src={invitedBarber.foto}
                  alt={invitedBarber.nome}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37] shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold uppercase tracking-wider border border-[#D4AF37]/30">
                      Link de Convite
                    </span>
                    <span className="text-xs text-zinc-400">Atendimento Exclusivo</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-display mt-0.5">
                    Você acessou o link de {invitedBarber.nome}
                  </h3>
                  <p className="text-xs text-zinc-400">{invitedBarber.especialidade}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectBarber(invitedBarber.id);
                    setWizardStep(1);
                    setActiveTab('agendar');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-[#D4AF37]/20"
                >
                  Agendar com {invitedBarber.nome.split(' ')[0]}
                </button>
                <button
                  type="button"
                  onClick={() => setInvitedBarber(null)}
                  className="px-3 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
                  title="Ver todos os barbeiros"
                >
                  Outro
                </button>
              </div>
            </div>
          )}

          {/* Hero Banner Card */}
          <div id="client-hero-card" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1C1C21] via-[#161619] to-[#0E0E10] border border-zinc-800/90 p-5 sm:p-8 shadow-xl">
            <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs uppercase font-bold tracking-widest text-[#D4AF37] mb-2">
                  <Crown className="w-3.5 h-3.5" /> Líder Barbers
                </span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-100 font-display leading-tight mb-2">
                  Mais que um corte, uma experiência de liderança.
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Profissionais de elite, ambiente refinado e atendimento de excelência no seu tempo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWizardStep(1);
                  setActiveTab('agendar');
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs sm:text-sm tracking-wider uppercase hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#D4AF37]/20 shrink-0"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Agendar horário</span>
              </button>
            </div>
          </div>

          {/* Nossos Serviços */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm sm:text-base font-bold text-zinc-200 font-display">
                Nossos Serviços
              </h3>
              <button
                type="button"
                onClick={() => {
                  setWizardStep(1);
                  setActiveTab('agendar');
                }}
                className="text-xs text-[#C5A059] hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {servicos.slice(0, 6).map((serv) => (
                <div
                  key={serv.id}
                  onClick={() => {
                    setSelectedServicoId(serv.id);
                    setWizardStep(2);
                    setActiveTab('agendar');
                  }}
                  className="p-3.5 rounded-xl bg-[#18181b] border border-zinc-800 hover:border-[#D4AF37]/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#D4AF37] mb-2.5 group-hover:bg-[#D4AF37]/10 transition-colors">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1">{serv.nome}</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{serv.duracaoMinutos} min</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#D4AF37]">
                      R$ {serv.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-[#D4AF37] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nossos Barbeiros */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm sm:text-base font-bold text-zinc-200 font-display">
                Nossos Barbeiros
              </h3>
              <button
                type="button"
                onClick={() => {
                  setWizardStep(2);
                  setActiveTab('agendar');
                }}
                className="text-xs text-[#C5A059] hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {barbeiros.map((barb) => (
                <div
                  key={barb.id}
                  onClick={() => {
                    setSelectedBarbeiroId(barb.id);
                    setWizardStep(3);
                    setActiveTab('agendar');
                  }}
                  className="p-3.5 rounded-xl bg-[#18181b] border border-zinc-800 hover:border-[#D4AF37]/50 transition-all text-center cursor-pointer group"
                >
                  <img
                    src={barb.foto}
                    alt={barb.nome}
                    className="w-14 h-14 rounded-full mx-auto object-cover border-2 border-zinc-700 group-hover:border-[#D4AF37] transition-colors mb-2"
                  />
                  <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1">{barb.nome}</h4>
                  <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{barb.especialidade}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Informações de Contato e Localização */}
          <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              <span>Líder Barbers • Unidade Principal - Centro</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>Segunda a Sábado: 08:00 às 20:00</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-zinc-500" />
              <span>WhatsApp: (11) 98765-4321</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: AGENDAMENTO WIZARD */}
      {activeTab === 'agendar' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Bar with back arrow */}
          <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
            <button
              type="button"
              onClick={() => {
                if (wizardStep > 1) {
                  setWizardStep(wizardStep - 1);
                } else {
                  setActiveTab('home');
                }
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-zinc-400">
                {wizardStep < 4 ? 'Agendar horário' : 'Confirmar agendamento'}
              </h2>
              <h3 className="text-base font-bold text-zinc-100 font-display">
                {wizardStep === 1 && '1. Serviço'}
                {wizardStep === 2 && '2. Barbeiro'}
                {wizardStep === 3 && '3. Data e horário'}
                {wizardStep === 4 && 'Confirmar agendamento'}
              </h3>
            </div>
          </div>

          {/* STEP 1: SERVIÇO */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {servicos.map((serv) => {
                  const isSelected = selectedServicoId === serv.id;
                  return (
                    <div
                      key={serv.id}
                      onClick={() => setSelectedServicoId(serv.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#1e1e24] border-[#D4AF37] ring-1 ring-[#D4AF37]'
                          : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-[#D4AF37] bg-[#D4AF37] text-zinc-950'
                              : 'border-zinc-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-100">{serv.nome}</h4>
                          <p className="text-[11px] text-zinc-400">
                            R$ {serv.preco.toFixed(2).replace('.', ',')} • {serv.duracaoMinutos} min
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-[#D4AF37]">
                        R$ {serv.preco.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#D4AF37]/20 mt-4"
              >
                Próximo: Escolher Barbeiro
              </button>
            </div>
          )}

          {/* STEP 2: BARBEIRO */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {barbeiros.map((barb) => {
                  const isSelected = selectedBarbeiroId === barb.id;
                  return (
                    <div
                      key={barb.id}
                      onClick={() => handleSelectBarber(barb.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#1e1e24] border-[#D4AF37] ring-1 ring-[#D4AF37]'
                          : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={barb.foto}
                          alt={barb.nome}
                          className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700"
                        />
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-100">{barb.nome}</h4>
                          <p className="text-[11px] text-[#C5A059]">{barb.especialidade}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{barb.descricao}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37] text-zinc-950'
                            : 'border-zinc-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#D4AF37]/20"
                >
                  Próximo: Data e Horário
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DATA E HORÁRIO */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              {/* Selected Barber Header Card with Option to Change Barber */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-zinc-900 via-[#18181c] to-zinc-900 border border-[#D4AF37]/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedBarbeiro.foto}
                    alt={selectedBarbeiro.nome}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#D4AF37]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-100 font-display">
                        Atendimento com {selectedBarbeiro.nome}
                      </span>
                      {invitedBarber?.id === selectedBarbeiro.id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold">
                          Link Exclusivo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#C5A059]">{selectedBarbeiro.especialidade}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 hover:text-white text-xs font-medium transition-all"
                  title="Clique para escolher outro profissional se preferir"
                >
                  Trocar barbeiro
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Interactive Calendar on Left */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 mb-2 font-display">
                    Selecione o Dia
                  </h4>
                  {renderCalendar()}
                </div>

                {/* Horários disponíveis on Right */}
                <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-300 mb-3 font-display flex items-center justify-between">
                    <span>Horários disponíveis</span>
                    <span className="text-[11px] text-[#C5A059] font-normal">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </h4>

                  {loadingSlots ? (
                    <div className="py-8 text-center text-zinc-500 text-xs animate-pulse">
                      Calculando horários em tempo real com a agenda do barbeiro...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-400">
                      O barbeiro selecionado não atende neste dia ou todos os horários estão ocupados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {availableSlots.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-zinc-900 text-[#D4AF37] border-2 border-[#D4AF37] shadow-sm'
                                : slot.available
                                ? 'bg-[#18181b] border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                                : 'bg-zinc-900/30 border border-zinc-900 text-zinc-600 line-through cursor-not-allowed'
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={!selectedTime || loadingSlots}
                      onClick={() => setWizardStep(4)}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs tracking-wider uppercase hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50"
                    >
                      Próximo: Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMAR AGENDAMENTO */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  {/* Selected Barber Card */}
                  <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 flex items-center gap-4">
                    <img
                      src={selectedBarbeiro?.foto}
                      alt={selectedBarbeiro?.nome}
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37]"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100">{selectedBarbeiro?.nome}</h4>
                      <p className="text-xs text-[#C5A059]">{selectedBarbeiro?.especialidade}</p>
                      <p className="text-[11px] text-zinc-400 mt-1">{selectedBarbeiro?.descricao}</p>
                    </div>
                  </div>

                  {/* Location & Guidelines */}
                  <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                      <MapPin className="w-4 h-4 text-[#D4AF37]" />
                      <span>Líder Barbers • Unidade Principal - Centro</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Por favor, chegue com 5 minutos de antecedência. Notificações de confirmação e lembretes serão emitidos em seu dispositivo.
                    </p>
                  </div>
                </div>

                {/* Service & Booking Details Box */}
                <div className="p-5 rounded-xl bg-[#18181b] border border-zinc-800 space-y-4 text-xs">
                  <h4 className="text-sm font-bold text-zinc-200 font-display border-b border-zinc-800 pb-2">
                    Resumo do Atendimento
                  </h4>

                  {/* Service row */}
                  <div className="flex items-start gap-3 text-zinc-300">
                    <div className="p-2 rounded-lg bg-zinc-900 text-[#D4AF37]">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-100 text-sm">{selectedServico?.nome}</p>
                      <p className="text-xs text-zinc-400">
                        {selectedServico?.duracaoMinutos} minutos de atendimento
                      </p>
                    </div>
                  </div>

                  {/* Date & Time row */}
                  <div className="flex items-start gap-3 text-zinc-300">
                    <div className="p-2 rounded-lg bg-zinc-900 text-[#D4AF37]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-100 text-sm">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-[#C5A059] font-medium">Horário: {selectedTime}</p>
                    </div>
                  </div>

                  {/* Customer Information Form */}
                  <div className="pt-3 border-t border-zinc-800 space-y-3">
                    <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs">
                      <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Seus dados para confirmação</span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Seu Nome Completo <span className="text-[#D4AF37]">*</span>
                        </label>
                        <input
                          type="text"
                          value={clientNome}
                          onChange={(e) => setClientNome(e.target.value)}
                          placeholder="Ex: Carlos Santana"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          WhatsApp com DDD <span className="text-[#D4AF37]">*</span>
                        </label>
                        <input
                          type="tel"
                          value={clientTelefone}
                          onChange={(e) => setClientTelefone(e.target.value)}
                          placeholder="Ex: (11) 98765-4321"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Summary */}
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="font-semibold text-zinc-300 text-sm">Total a Pagar</span>
                    <span className="font-bold text-[#D4AF37] text-lg">
                      R$ {selectedServico?.preco.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {/* Error warning if any */}
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting || bookingSuccess}
                      onClick={handleConfirmBooking}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs sm:text-sm tracking-wider uppercase hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span>Validando e reservando...</span>
                      ) : bookingSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Reserva Confirmada!</span>
                        </>
                      ) : (
                        <span>Confirmar agendamento</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="w-full py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
                    >
                      Voltar para data e horário
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: MEUS AGENDAMENTOS */}
      {activeTab === 'agendamentos' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-zinc-100 font-display">
              Meus agendamentos
            </h2>
          </div>

          {/* Tabs: Próximos | Históricos */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setAppointmentsTab('proximos')}
              className={`py-2 rounded-lg font-semibold transition-all ${
                appointmentsTab === 'proximos'
                  ? 'bg-[#D4AF37] text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Próximos ({upcomingAppointments.length})
            </button>
            <button
              type="button"
              onClick={() => setAppointmentsTab('historico')}
              className={`py-2 rounded-lg font-semibold transition-all ${
                appointmentsTab === 'historico'
                  ? 'bg-[#D4AF37] text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Histórico ({pastAppointments.length})
            </button>
          </div>

          {/* Appointments List */}
          <div>
            {(appointmentsTab === 'proximos' ? upcomingAppointments : pastAppointments).length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs space-y-3 bg-[#18181b] rounded-2xl border border-zinc-800">
                <CalendarCheck className="w-8 h-8 mx-auto opacity-30 text-[#D4AF37]" />
                <p>Nenhum agendamento encontrado nesta categoria.</p>
                <button
                  type="button"
                  onClick={() => {
                    setWizardStep(1);
                    setActiveTab('agendar');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] text-zinc-950 font-bold text-xs"
                >
                  Agendar agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(appointmentsTab === 'proximos' ? upcomingAppointments : pastAppointments).map((ag) => {
                  const isConfirmed = ag.status === 'confirmado';
                  const isScheduled = ag.status === 'agendado';
                  const isInService = ag.status === 'em_atendimento';
                  const isCancelled = ag.status === 'cancelado';

                  return (
                    <div
                      key={ag.id}
                      className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-100">{ag.servicoNome}</h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Barbeiro: {ag.barbeiroNome}</p>
                          <p className="text-[11px] text-[#C5A059] font-medium mt-0.5">
                            {ag.data} • {ag.horarioInicio} às {ag.horarioFim}
                          </p>
                        </div>

                        {/* Status Badge as in mockup */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isConfirmed
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : isInService
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                              : isScheduled
                              ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                              : isCancelled
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {ag.status === 'em_atendimento' ? 'Em atendimento' : ag.status}
                        </span>
                      </div>

                      {/* Footer with actions */}
                      {appointmentsTab === 'proximos' && ag.status !== 'cancelado' && (
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                          <span className="text-zinc-400">
                            Valor: <strong className="text-zinc-200">R$ {ag.valor.toFixed(2).replace('.', ',')}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm('Deseja realmente cancelar este agendamento?')) {
                                await cancelarAgendamento(ag.id);
                                onRefreshData();
                              }
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
                          >
                            Cancelar reserva
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: PERFIL */}
      {activeTab === 'perfil' && (
        <div className="space-y-4 animate-in fade-in max-w-xl">
          <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-zinc-100 font-display">
              Perfil do Cliente
            </h2>
          </div>

          <div className="p-5 rounded-xl bg-[#18181b] border border-zinc-800 space-y-4 text-xs">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-100">{clientNome || 'Novo Cliente'}</h4>
                <p className="text-zinc-400">{clientTelefone || 'WhatsApp não informado'}</p>
                <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Conta Ativa
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-3">
              <h5 className="font-semibold text-zinc-200">Editar Meus Dados</h5>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={clientNome}
                    onChange={(e) => {
                      setClientNome(e.target.value);
                      localStorage.setItem('lider_client_nome', e.target.value);
                    }}
                    placeholder="Seu nome completo"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">WhatsApp com DDD</label>
                  <input
                    type="tel"
                    value={clientTelefone}
                    onChange={(e) => {
                      setClientTelefone(e.target.value);
                      localStorage.setItem('lider_client_telefone', e.target.value);
                    }}
                    placeholder="Seu WhatsApp"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-zinc-400">
              <p>
                <strong>Unidade:</strong> Líder Barbers - Matriz
              </p>
              <p>
                <strong>Meus agendamentos registrados:</strong> {clientAppointments.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR (Mobile only) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#121212]/95 backdrop-blur-md border-t border-zinc-800/80 py-2 px-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              activeTab === 'home' ? 'text-[#D4AF37] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crown className="w-5 h-5" />
            <span>Início</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setActiveTab('agendar');
            }}
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              activeTab === 'agendar' ? 'text-[#D4AF37] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Agendar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agendamentos')}
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors relative ${
              activeTab === 'agendamentos' ? 'text-[#D4AF37] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Agendamentos</span>
            {upcomingAppointments.length > 0 && (
              <span className="absolute top-0 right-3 w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              activeTab === 'perfil' ? 'text-[#D4AF37] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
