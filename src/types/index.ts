export type UserRole = 'cliente' | 'barbeiro' | 'administrador';

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'nao_compareceu';

export interface UserProfile {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  role: UserRole;
  status: 'ativo' | 'inativo';
  foto?: string;
  dataCriacao: string;
}

export interface Barbeiro {
  id: string;
  nome: string;
  foto: string;
  especialidade: string;
  descricao: string;
  servicosIds: string[];
  status: 'ativo' | 'inativo';
  telefone: string;
  avaliacao?: number;
  dataCriacao: string;
}

export interface Servico {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  duracaoMinutos: number;
  status: 'ativo' | 'inativo';
  icone?: string;
}

export interface Disponibilidade {
  id: string;
  barbeiroId: string;
  diasSemana: number[]; // 0 = Domingo, 1 = Segunda, ... 6 = Sábado
  horarioInicio: string; // "08:00"
  horarioFim: string; // "18:00"
  intervaloMinutos: number; // ex: 10
  pausaInicio?: string; // "12:00"
  pausaFim?: string; // "13:00"
  dataAtualizacao: string;
}

export interface Bloqueio {
  id: string;
  barbeiroId: string;
  data: string; // "YYYY-MM-DD"
  horarioInicio: string;
  horarioFim: string;
  motivo: string;
}

export interface Agendamento {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  barbeiroId: string;
  barbeiroNome: string;
  servicoId: string;
  servicoNome: string;
  data: string; // "YYYY-MM-DD"
  horarioInicio: string; // "15:00"
  horarioFim: string; // "15:30"
  duracaoMinutos: number;
  status: AppointmentStatus;
  valor: number;
  dataCriacao: string;
  observacoes?: string;
}

export interface AppNotification {
  id: string;
  usuarioId: string; // ou 'all' ou 'admin' ou barbeiroId
  titulo: string;
  mensagem: string;
  lida: boolean;
  tipo: 'reserva' | 'cancelamento' | 'confirmacao' | 'lembrete' | 'sistema';
  dataCriacao: string;
  agendamentoId?: string;
}
