import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  Key,
  Mail,
  Store,
  Calendar,
  Lock,
  RefreshCw,
  Crown,
  Sparkles,
  LogOut,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { AdminBarbearia, BarbeariaUnidade } from '../../types';
import { db, purgeAllTestData } from '../../firebase/config';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { ShareLinksCard } from '../common/ShareLinksCard';
import { GeneratedAccessModal } from '../common/GeneratedAccessModal';

interface SuperAdminModuleProps {
  onRefreshData?: () => void;
  onExitToStore?: () => void;
}

// Initial seed units if database is empty - Clean production starter
const DEFAULT_BARBEARIAS: BarbeariaUnidade[] = [
  {
    id: 'unidade-matriz',
    nome: 'Líder Barbers - Matriz',
    cidade: 'Brasil',
    status: 'ativo',
  },
];

// No mock admins - completely clean for production
const DEFAULT_ADMINS: AdminBarbearia[] = [];

export const SuperAdminModule: React.FC<SuperAdminModuleProps> = ({
  onRefreshData,
  onExitToStore,
}) => {
  const [admins, setAdmins] = useState<AdminBarbearia[]>([]);
  const [barbearias, setBarbearias] = useState<BarbeariaUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for creating a new Admin Barbearia
  const [showModal, setShowModal] = useState(false);
  const [adminNome, setAdminNome] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [adminTelefone, setAdminTelefone] = useState('');
  const [selectedBarbeariaId, setSelectedBarbeariaId] = useState('');
  const [isCustomBarbearia, setIsCustomBarbearia] = useState(false);
  const [newBarbeariaNome, setNewBarbeariaNome] = useState('');
  const [newBarbeariaCidade, setNewBarbeariaCidade] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Modal para exibir o Link Exclusivo gerado logo após o cadastro
  const [createdAdminModalData, setCreatedAdminModalData] = useState<{
    isOpen: boolean;
    adminName: string;
    barbeariaName: string;
    accessUrl: string;
    pin: string;
    phone: string;
  } | null>(null);

  // Feedback de link copiado no card do admin
  const [copiedAdminId, setCopiedAdminId] = useState<string | null>(null);

  const getAdminAccessUrl = (admin: AdminBarbearia) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const cleanUrl = `${origin}${pathname}`;
    const pin = admin.senha || admin.pin || 'admin123';
    return `${cleanUrl}?admin=${admin.id}&chave=${pin}`;
  };

  const handleCopyAdminLink = async (admin: AdminBarbearia) => {
    const url = getAdminAccessUrl(admin);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedAdminId(admin.id);
      setTimeout(() => setCopiedAdminId(null), 2500);
    } catch (err) {
      console.error('Erro ao copiar link do admin:', err);
    }
  };

  const handleSendAdminWhatsApp = (admin: AdminBarbearia) => {
    const url = getAdminAccessUrl(admin);
    const pin = admin.senha || admin.pin || 'admin123';
    const message = `Olá, ${admin.nome}! Seu acesso exclusivo como Administrador da barbearia *${admin.barbeariaNome}* está pronto.\n\n🔑 *Acesse seu painel gerencial pelo link:*\n${url}\n\n📌 *Sua senha/PIN:* ${pin}\n\nSalve este link nos seus favoritos do celular para gerenciar barbeiros, serviços e agendamentos!`;
    const cleanPhone = admin.telefone ? admin.telefone.replace(/\D/g, '') : '';
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const [isPurging, setIsPurging] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);

  // Manual purge trigger for the owner
  const handlePurgeAllTestRecords = async () => {
    if (!window.confirm('Atenção: deseja limpar todos os agendamentos, administradores e unidades de teste? O sistema ficará 100% zerado e limpo para você operar.')) {
      return;
    }
    try {
      setIsPurging(true);
      await purgeAllTestData(true);
      await loadSuperAdminData();
      if (onRefreshData) onRefreshData();
      setPurgeMessage('Todos os dados de teste foram apagados com sucesso! O sistema está limpo.');
      setTimeout(() => setPurgeMessage(null), 4000);
    } catch (err) {
      console.error('Erro ao purgar dados:', err);
      setPurgeMessage('Erro ao limpar dados de teste.');
    } finally {
      setIsPurging(false);
    }
  };

  // Load data from Firestore or fallback gracefully
  const loadSuperAdminData = async () => {
    try {
      setLoading(true);

      // Load units
      const unitsSnap = await getDocs(collection(db, 'barbearias'));
      let loadedUnits: BarbeariaUnidade[] = [];
      if (unitsSnap.empty) {
        // Seed clean default unit
        for (const u of DEFAULT_BARBEARIAS) {
          await setDoc(doc(db, 'barbearias', u.id), u);
        }
        loadedUnits = DEFAULT_BARBEARIAS;
      } else {
        loadedUnits = unitsSnap.docs
          .map((d) => d.data() as BarbeariaUnidade)
          .filter((u) => !['unidade-jardins', 'unidade-morumbi'].includes(u.id));
      }
      setBarbearias(loadedUnits);
      if (loadedUnits.length > 0) {
        setSelectedBarbeariaId(loadedUnits[0].id);
      }

      // Load admins
      const adminsSnap = await getDocs(collection(db, 'administradores_barbearia'));
      let loadedAdmins: AdminBarbearia[] = [];
      if (!adminsSnap.empty) {
        loadedAdmins = adminsSnap.docs
          .map((d) => d.data() as AdminBarbearia)
          .filter((adm) => !['admin-matriz-1', 'admin-jardins-1'].includes(adm.id));
      }
      setAdmins(loadedAdmins);
    } catch (err) {
      console.warn('Erro ao conectar Firestore para Super Admin, usando estado local:', err);
      setBarbearias(DEFAULT_BARBEARIAS);
      if (DEFAULT_BARBEARIAS.length > 0) {
        setSelectedBarbeariaId(DEFAULT_BARBEARIAS[0].id);
      }
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuperAdminData();
  }, []);

  // Handle create new admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!adminNome.trim()) {
      setSubmitError('Informe o nome completo do administrador.');
      return;
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setSubmitError('Informe um e-mail válido para acesso.');
      return;
    }
    if (!adminSenha.trim() || adminSenha.length < 4) {
      setSubmitError('A senha provisória deve conter pelo menos 4 caracteres.');
      return;
    }

    let targetBarbeariaId = selectedBarbeariaId;
    let targetBarbeariaNome = barbearias.find((b) => b.id === selectedBarbeariaId)?.nome || 'Unidade Geral';

    try {
      // If adding a brand new barber shop unit
      if (isCustomBarbearia) {
        if (!newBarbeariaNome.trim()) {
          setSubmitError('Informe o nome da nova barbearia.');
          return;
        }
        const newUnitId = `unidade-${Date.now()}`;
        const newUnit: BarbeariaUnidade = {
          id: newUnitId,
          nome: newBarbeariaNome.trim(),
          cidade: newBarbeariaCidade.trim() || 'Brasil',
          status: 'ativo',
        };
        await setDoc(doc(db, 'barbearias', newUnitId), newUnit);
        targetBarbeariaId = newUnitId;
        targetBarbeariaNome = newUnit.nome;
        setBarbearias((prev) => [...prev, newUnit]);
      }

      const newAdminId = `admin-barb-${Date.now()}`;
      const newAdmin: AdminBarbearia = {
        id: newAdminId,
        nome: adminNome.trim(),
        email: adminEmail.trim().toLowerCase(),
        senha: adminSenha,
        barbeariaId: targetBarbeariaId,
        barbeariaNome: targetBarbeariaNome,
        telefone: adminTelefone.trim() || '(11) 99999-0000',
        status: 'ativo',
        dataCriacao: new Date().toISOString(),
      };

      await setDoc(doc(db, 'administradores_barbearia', newAdminId), newAdmin);

      // Also register in users collection to support unified login if needed
      await setDoc(doc(db, 'users', newAdminId), {
        id: newAdminId,
        nome: newAdmin.nome,
        email: newAdmin.email,
        telefone: newAdmin.telefone,
        role: 'administrador',
        barbeariaId: targetBarbeariaId,
        status: 'ativo',
        dataCriacao: newAdmin.dataCriacao,
      });

      setAdmins((prev) => [newAdmin, ...prev]);
      setSubmitSuccess(`Administrador "${newAdmin.nome}" cadastrado com sucesso!`);

      // Abrir modal com o link gerado para envio imediato pelo dono
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
      const cleanUrl = `${origin}${pathname}`;
      const accessUrl = `${cleanUrl}?admin=${newAdminId}&chave=${adminSenha.trim()}`;

      setCreatedAdminModalData({
        isOpen: true,
        adminName: newAdmin.nome,
        barbeariaName: targetBarbeariaNome,
        accessUrl,
        pin: adminSenha.trim(),
        phone: newAdmin.telefone || '',
      });

      // Reset form
      setAdminNome('');
      setAdminEmail('');
      setAdminSenha('');
      setAdminTelefone('');
      setNewBarbeariaNome('');
      setNewBarbeariaCidade('');
      setIsCustomBarbearia(false);
      setShowModal(false);

      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Erro ao cadastrar administrador:', err);
      setSubmitError('Erro ao salvar no banco de dados. Tente novamente.');
    }
  };

  // Delete Admin
  const handleDeleteAdmin = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja revogar o acesso do administrador ${nome}?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'administradores_barbearia', id));
      await deleteDoc(doc(db, 'users', id));
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Erro ao excluir admin:', err);
      // Fallback local state
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    }
  };

  // Filtered admin list
  const filteredAdmins = admins.filter(
    (a) =>
      a.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.barbeariaNome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-[640px] bg-[#121212] text-zinc-100 pb-16 space-y-6">
      {/* Super Admin Top Header / Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1c1810] via-[#161619] to-[#121214] border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[2px] shadow-lg shadow-amber-500/15 flex items-center justify-center">
            <div className="w-full h-full bg-[#141417] rounded-[10px] flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 font-display">
                Painel Master (Super Admin)
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 uppercase tracking-wider">
                Dono do Sistema
              </span>
            </div>
            <p className="text-xs text-[#C5A059] mt-0.5">
              Gestão Global Multi-Unidades • Cadastro e Controle de Administradores de Barbearias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onExitToStore && (
            <button
              type="button"
              onClick={onExitToStore}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
              title="Voltar para a vitrine limpa da loja (clientes)"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Voltar à Loja</span>
            </button>
          )}
          <button
            type="button"
            disabled={isPurging}
            onClick={handlePurgeAllTestRecords}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            title="Excluir agendamentos e registros de teste"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">{isPurging ? 'Limpando...' : 'Zerar Dados de Teste'}</span>
            <span className="sm:hidden">Zerar</span>
          </button>
          <button
            type="button"
            onClick={loadSuperAdminData}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-zinc-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
            <span>Cadastrar Administrador</span>
          </button>
        </div>
      </div>

      {purgeMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{purgeMessage}</span>
        </div>
      )}

      {/* Central de Links & Acesso Inteligente (Query Params) */}
      <ShareLinksCard role="super_admin" />

      {submitSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#161619] border border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Total de Administradores</p>
            <p className="text-2xl font-bold text-zinc-100 font-display mt-1">{admins.length}</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Contas de gestão ativas</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161619] border border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Barbearias Conectadas</p>
            <p className="text-2xl font-bold text-zinc-100 font-display mt-1">{barbearias.length}</p>
            <p className="text-[11px] text-[#C5A059] mt-0.5">Unidades na plataforma</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161619] border border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Controle de Segurança (RBAC)</p>
            <p className="text-sm font-bold text-emerald-400 font-display mt-1">Isolamento Ativo</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Super Admin protegido por credencial</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Admins List & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-display flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              <span>Administradores e Barbearias Associadas</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Cada administrador gerencia estritamente a sua respectiva unidade.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar admin ou barbearia..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            Carregando lista de administradores cadastrados...
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-10 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
            <Users className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm text-zinc-400">Nenhum administrador encontrado.</p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition-colors"
            >
              Cadastrar Primeiro Administrador
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAdmins.map((admin) => (
              <div
                key={admin.id}
                className="p-5 rounded-2xl bg-[#161619] border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 font-display text-sm">
                        {admin.nome.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                          {admin.nome}
                        </h4>
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
                          Admin da Barbearia
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAdmin(admin.id, admin.nome)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Excluir ou revogar administrador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-1.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Building2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span className="font-semibold text-zinc-200 truncate">
                        {admin.barbeariaNome}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                    {admin.telefone && (
                      <p className="text-[11px] text-zinc-500 pl-5">
                        Contato: {admin.telefone}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Senha/PIN: <code className="px-1.5 py-0.5 rounded bg-zinc-950 text-amber-300 font-mono text-[10px]">{admin.senha || admin.pin || 'admin123'}</code></span>
                    </div>
                  </div>

                  {/* Ações de Envio do Link Exclusivo do Admin */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                      Link de Acesso Exclusivo deste Administrador:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyAdminLink(admin)}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-semibold transition-all shadow-sm"
                        title="Copiar o link direto de acesso deste administrador"
                      >
                        {copiedAdminId === admin.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Copiar Link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAdminWhatsApp(admin)}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white border border-emerald-600/50 text-xs font-semibold transition-all shadow-sm"
                        title="Enviar link de acesso direto para o WhatsApp do administrador"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-white" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Status: <strong className="text-emerald-400 font-medium">Ativo</strong></span>
                  <span>ID: {admin.id.slice(0, 12)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Cadastrar Novo Administrador de Barbearia */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#18181b] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 font-display">
                    Cadastrar Novo Administrador
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Crie credenciais e vincule o admin à sua respectiva barbearia.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setSubmitError(null);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">
                  Nome Completo do Administrador *
                </label>
                <input
                  type="text"
                  value={adminNome}
                  onChange={(e) => setAdminNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Email & Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@barbearia.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={adminTelefone}
                    onChange={(e) => setAdminTelefone(e.target.value)}
                    placeholder="(11) 99999-8888"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Senha Provisória */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">
                  Senha Provisória de Acesso *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminSenha}
                    onChange={(e) => setAdminSenha(e.target.value)}
                    placeholder="Mínimo 4 caracteres (ex: admin123)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-amber-400 focus:outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Vinculação de Barbearia */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-300">
                    Barbearia Associada *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomBarbearia(!isCustomBarbearia)}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    {isCustomBarbearia ? 'Selecionar existente' : '+ Cadastrar nova barbearia'}
                  </button>
                </div>

                {!isCustomBarbearia ? (
                  <select
                    value={selectedBarbeariaId}
                    onChange={(e) => setSelectedBarbeariaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-amber-400 focus:outline-none"
                  >
                    {barbearias.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome} ({b.cidade})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-700/60">
                    <input
                      type="text"
                      value={newBarbeariaNome}
                      onChange={(e) => setNewBarbeariaNome(e.target.value)}
                      placeholder="Nome da nova barbearia (ex: Líder Barbers - Paulista)"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-amber-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newBarbeariaCidade}
                      onChange={(e) => setNewBarbeariaCidade(e.target.value)}
                      placeholder="Cidade / Estado (ex: São Paulo - SP)"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-zinc-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-amber-500/20"
                >
                  Salvar Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Link Exclusivo do Administrador Gerado */}
      {createdAdminModalData && (
        <GeneratedAccessModal
          isOpen={createdAdminModalData.isOpen}
          onClose={() => setCreatedAdminModalData(null)}
          title="Acesso do Administrador Gerado com Sucesso"
          recipientName={createdAdminModalData.adminName}
          recipientRole="administrador"
          establishmentName={createdAdminModalData.barbeariaName}
          accessUrl={createdAdminModalData.accessUrl}
          pin={createdAdminModalData.pin}
          phone={createdAdminModalData.phone}
        />
      )}
    </div>
  );
};
