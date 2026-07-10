let listaTecnicos = [];
let usuarioPodeEditar = false; 
let todosAgendamentosGlobais = [];
let mapaTecnicoColuna = {};
let allTechsGlobal = [];
let duplaCounter = 0;
let tagsLogisticaGlobal = [];
let capacidadeResumoDiaGlobal = null;
let capacidadeResumoDataGlobal = '';

const CHAVE_CAPACIDADE_POR_COLUNA = {
    'col-manut-casa-matutino': 'manutencao_casa_m',
    'col-manut-casa-vespertino': 'manutencao_casa_t',
    'col-manut-predio-serra-matutino': 'manutencao_predio_serra_m',
    'col-manut-predio-serra-vespertino': 'manutencao_predio_serra_t',
    'col-manut-predio-outros-matutino': 'manutencao_predio_outros_m',
    'col-manut-predio-outros-vespertino': 'manutencao_predio_outros_t',
    'col-inst-serra-matutino': 'instalacao_serra_m',
    'col-inst-serra-vespertino': 'instalacao_serra_t',
    'col-inst-outros-matutino': 'instalacao_outros_m',
    'col-inst-outros-vespertino': 'instalacao_outros_t',
    'col-recolhimento-matutino': 'recolhimento_serra_m',
    'col-recolhimento-vespertino': 'recolhimento_serra_t'
};

const CAMPOS_CAPACIDADE_LOGISTICA = [
    'casa_m',
    'casa_t',
    'predio_serra_m',
    'predio_serra_t',
    'predio_outros_m',
    'predio_outros_t',
    'inst_serra_m',
    'inst_serra_t',
    'inst_outros_m',
    'inst_outros_t',
    'inst_casa_serra_m',
    'inst_casa_serra_t',
    'inst_predio_serra_m',
    'inst_predio_serra_t',
    'inst_casa_outros_m',
    'inst_casa_outros_t',
    'inst_predio_outros_m',
    'inst_predio_outros_t',
    'recolhimento_serra_m',
    'recolhimento_serra_t',
    'recolhimento_outros_m',
    'recolhimento_outros_t'
];

function normalizarGrupoUsuario(grupo) {
    return String(grupo || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

function usuarioEhLogisticaOuNoc() {
    const grupo = normalizarGrupoUsuario(window.grupoUsuarioLogado || '');
    return grupo.includes('LOGISTICA') || grupo.includes('NOC') || grupo.includes('FIBRA') || grupo.includes('ADMIN');
}

function obterModoAtendimentoPainel() {
    return document.getElementById('filtro-modo-atendimento')?.value || 'OPERACIONAL';
}

function modoPainelRecolhimento() {
    return obterModoAtendimentoPainel() === 'RECOLHIMENTO';
}

const PRIORIDADE_LOGISTICA_LABELS = {
    0: 'Normal',
    1: 'Média',
    2: 'Alta',
    3: 'Urgente'
};

const OPCOES_TURNO_ESCALA = [
    { value: 'INTEGRAL', label: 'Integral' },
    { value: 'MATUTINO', label: 'Matutino' },
    { value: 'VESPERTINO', label: 'Vespertino' }
];

const OPCOES_REGIAO_ESCALA = [
    { value: 'TODAS', label: 'Todas' },
    { value: 'SERRA', label: 'Serra' },
    { value: 'VV_VIX_CCA', label: 'Vila Velha / Vit\u00f3ria / Cariacica' }
];

const OPCOES_IMOVEL_ESCALA = [
    { value: 'AMBOS', label: 'Ambos' },
    { value: 'CASA', label: 'Casa' },
    { value: 'PREDIO', label: 'Pr\u00e9dio' }
];

function normalizarTurnoEscala(valor) {
    const turno = String(valor || 'INTEGRAL').trim().toUpperCase();
    if (turno === 'MANHA') return 'MATUTINO';
    if (turno === 'TARDE') return 'VESPERTINO';
    return OPCOES_TURNO_ESCALA.some(opcao => opcao.value === turno) ? turno : 'INTEGRAL';
}

function normalizarRegiaoEscala(valor) {
    const regiao = String(valor || 'SERRA')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\/\s-]+/g, '_')
        .replace(/_+/g, '_');
    if (regiao === 'VV_VIX_CAR') return 'VV_VIX_CCA';
    if (['VILA_VELHA', 'VITORIA', 'CARIACICA'].includes(regiao)) return 'VV_VIX_CCA';
    if (regiao === 'VILA_VELHA_VITORIA_CARIACICA') return 'VV_VIX_CCA';
    return OPCOES_REGIAO_ESCALA.some(opcao => opcao.value === regiao) ? regiao : 'SERRA';
}

function normalizarImovelEscala(valor) {
    const imovel = String(valor || 'AMBOS').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return OPCOES_IMOVEL_ESCALA.some(opcao => opcao.value === imovel) ? imovel : 'AMBOS';
}

function montarOptionsEscala(opcoes, selecionado) {
    return opcoes.map(opcao => `<option value="${opcao.value}" ${opcao.value === selecionado ? 'selected' : ''}>${opcao.label}</option>`).join('');
}

function formatarVelocidadePlano(speed) {
    const velocidade = Number(speed || 0);
    if (!Number.isFinite(velocidade) || velocidade <= 0) return '';
    return `${velocidade} MB`;
}

function traduzirStatusContratoLogistica(status) {
    const mapa = { P: 'Pré-contrato', A: 'Ativo', I: 'Inativo', N: 'Negativado', D: 'Desistiu' };
    const s = String(status || '').toUpperCase();
    return mapa[s] ? `${mapa[s]} (${s})` : (s ? `Desconhecido (${s})` : 'Não informado');
}

function traduzirStatusAcessoLogistica(status) {
    const mapa = { A: 'Ativo', D: 'Desativado', CM: 'Bloqueio Manual', CA: 'Bloqueio Automático', FA: 'Financeiro em atraso', AA: 'Aguardando Assinatura' };
    const s = String(status || '').toUpperCase();
    return mapa[s] ? `${mapa[s]} (${s})` : (s ? `Desconhecido (${s})` : 'Não informado');
}

function simNaoLogistica(valor) {
    const v = String(valor || '').toUpperCase();
    if (v === 'S') return 'Sim';
    if (v === 'N') return 'Não';
    return 'Não informado';
}

function montarContatosClienteLogistica(cliente) {
    const itens = [
        ['Telefone residencial', cliente?.fone || cliente?.telefone_residencial],
        ['Telefone comercial', cliente?.telefone_comercial],
        ['Telefone celular', cliente?.telefone_celular],
        ['WhatsApp', cliente?.whatsapp],
        ['E-mail', cliente?.email],
        ['Contato', cliente?.contato]
    ].filter(([, valor]) => valor);
    return itens.length ? itens.map(([label, valor]) => `${label}: ${valor}`).join(' | ') : 'Nenhum contato cadastrado';
}

document.addEventListener('DOMContentLoaded', async () => {
    try { if (typeof initializeThemeAndUserInfo === 'function') initializeThemeAndUserInfo(); } catch (e) {}
    await verificarPermissoes();

    document.getElementById('filtro-data').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('filtro-data').addEventListener('change', carregarAgenda);
    document.getElementById('filtro-municipio').addEventListener('change', renderizarQuadro);
    document.getElementById('filtro-setor').addEventListener('change', renderizarQuadro);
    document.getElementById('filtro-status').addEventListener('change', carregarAgenda);
    document.getElementById('filtro-modo-atendimento')?.addEventListener('change', () => {
        ajustarFiltrosPorModo();
        carregarFilaLogistica();
        carregarAgenda();
    });

    document.getElementById('btn-data-ontem')?.addEventListener('click', () => mudarData(-1));
    document.getElementById('btn-data-hoje')?.addEventListener('click', () => mudarData(0));
    document.getElementById('btn-data-amanha')?.addEventListener('click', () => mudarData(1));

    document.getElementById('btn-confirmar-tarefa-logistica')?.addEventListener('click', processarAvancoTarefaLogistica);
    document.getElementById('btn-action-fechar')?.addEventListener('click', enviarFechamentoOS);
    document.getElementById('btn-ver-onu')?.addEventListener('click', abrirModalONU);
    document.getElementById('btn-abrir-config')?.addEventListener('click', abrirModalConfiguracoes);
    document.getElementById('btn-salvar-config')?.addEventListener('click', salvarConfiguracoes);
    document.getElementById('btn-salvar-novo-template')?.addEventListener('click', salvarNovoTemplate);
    document.getElementById('btn-aplicar-template')?.addEventListener('click', aplicarTemplateCapacidade);
    document.getElementById('btn-editar-template')?.addEventListener('click', editarTemplateCapacidade);
    document.getElementById('btn-excluir-template')?.addEventListener('click', excluirTemplateCapacidade);
    document.getElementById('btn-add-dupla')?.addEventListener('click', () => adicionarLinhaDupla());
    document.getElementById('btn-action-reagendar')?.addEventListener('click', enviarReagendamento);
    document.getElementById('action-nova-data')?.addEventListener('change', atualizarInfoCapacidadeReagendamento);
    document.getElementById('action-novo-turno')?.addEventListener('change', atualizarInfoCapacidadeReagendamento);
    document.getElementById('btn-cancelar-visita')?.addEventListener('click', abrirModalCancelarVisita);
    document.getElementById('btn-confirmar-cancelar-visita')?.addEventListener('click', confirmarCancelarVisita);
    document.getElementById('btn-abrir-reagendamento-visita')?.addEventListener('click', abrirModalReagendamentoVisita);
    document.getElementById('calendario-reagendamento')?.addEventListener('click', tratarCliqueCalendarioReagendamento);
    document.getElementById('btn-aceitar-prioridade')?.addEventListener('click', () => tratarPrioridade('aceitar'));
    document.getElementById('btn-recusar-prioridade')?.addEventListener('click', () => tratarPrioridade('recusar'));
    document.getElementById('btn-contato-confirmado')?.addEventListener('click', () => registrarContatoCliente('CONFIRMADO'));
    document.getElementById('btn-contato-sem-contato')?.addEventListener('click', () => registrarContatoCliente('SEM_CONTATO'));
    document.getElementById('btn-iniciar-espera')?.addEventListener('click', iniciarEsperaCliente);
    document.getElementById('btn-parar-espera')?.addEventListener('click', pararEsperaCliente);
    document.getElementById('btn-salvar-observacao-logistica')?.addEventListener('click', salvarObservacaoLogistica);
    document.getElementById('btn-salvar-prioridade-logistica')?.addEventListener('click', salvarPrioridadeLogistica);
    document.getElementById('btn-salvar-tags-os')?.addEventListener('click', salvarTagsOsAtual);
    document.getElementById('btn-salvar-tag-logistica')?.addEventListener('click', salvarTagLogistica);
    document.getElementById('btn-limpar-form-tag')?.addEventListener('click', limparFormTagLogistica);
    document.getElementById('tbody-tags-logistica')?.addEventListener('click', tratarCliqueTabelaTags);
    document.getElementById('btn-relatorio-conexao')?.addEventListener('click', () => {
        const login = window.loginAtualData?.login || window.loginAtualData?.user || window.loginAtualData?.usuario;
        if (login) verHistoricoPppoe(login);
    });

    document.addEventListener('click', async function(e) {
        const btnTurno = e.target.closest('.btn-retrair-turno');
        if (btnTurno) {
            const targetId = btnTurno.getAttribute('data-target');
            const el = document.getElementById(targetId);
            if (el) {
                if (el.classList.contains('d-none')) {
                    el.classList.remove('d-none');
                    el.classList.add('d-flex');
                } else {
                    el.classList.remove('d-flex');
                    el.classList.add('d-none');
                }
            }
        }
        
        const retrairCol = e.target.closest('.click-retrair-coluna');
        if (retrairCol) {
            const targetId = retrairCol.getAttribute('data-target');
            const el = document.getElementById(targetId);
            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        const btnTratar = e.target.closest('.btn-tratar-fila');
        if (btnTratar) {
            const osDataStr = btnTratar.getAttribute('data-os');
            if (osDataStr) {
                const osData = JSON.parse(osDataStr);
                abrirModalDetalhes(osData);
            }
        }
        
        const cardTarefa = e.target.closest('.card-tarefa-wfl');
        if (cardTarefa) {
            const radio = cardTarefa.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            return;
        }
    });

    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('select-atribuir-tecnico')) {
            const id_agenda = e.target.getAttribute('data-id-agenda');
            const ixc_os_id = e.target.getAttribute('data-ixc-os-id');
            const data_agendamento = e.target.getAttribute('data-agendamento');
            const turno = e.target.getAttribute('data-turno');
            const id_tecnico = e.target.value;
            if (typeof window.atribuirTecnicoOS === 'function') {
                window.atribuirTecnicoOS(id_agenda, id_tecnico, ixc_os_id, data_agendamento, turno);
            }
        }
    });

    carregarFilaLogistica(); 
    carregarAgenda();
    setInterval(autoRefreshSilencioso, 45000); 
    setInterval(atualizarTimers, 10000); 
});

function mudarData(offset) {
    const inputData = document.getElementById('filtro-data');
    let dataObj = new Date(inputData.value + 'T12:00:00'); 
    
    if (offset === 0) dataObj = new Date();
    else dataObj.setDate(dataObj.getDate() + offset);
    
    inputData.value = dataObj.toISOString().split('T')[0];
    carregarAgenda();
}

function mostrarAvisoAgenda(mensagem, requestId, permitirRetry = false) {
    let aviso = document.getElementById('aviso-agenda-logistica');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'aviso-agenda-logistica';
        aviso.className = 'alert alert-warning py-2 px-3 small mx-3 my-2';
        const quadro = document.querySelector('.kanban-board') || document.querySelector('.container-fluid') || document.body;
        quadro.prepend(aviso);
    }
    aviso.replaceChildren();
    const texto = document.createElement('span');
    texto.textContent = requestId ? `${mensagem} RequestId: ${requestId}` : mensagem;
    aviso.appendChild(texto);
    if (permitirRetry) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'btn btn-sm btn-outline-warning ms-2 py-0 btn-retry-aviso-agenda';
        botao.textContent = 'Tentar novamente';
        botao.addEventListener('click', carregarAgenda);
        aviso.appendChild(botao);
    }
    aviso.classList.remove('d-none');
}

function limparAvisoAgenda() {
    document.getElementById('aviso-agenda-logistica')?.classList.add('d-none');
}

function renderizarErroCarregamentoAgenda(mensagem = 'Erro de Conexão', tipo = 'danger') {
    document.querySelectorAll('.column-body').forEach(el => {
        el.innerHTML = `
            <div class="alert alert-${tipo} small m-2">
                <div>${mensagem}</div>
                <button type="button" class="btn btn-sm btn-outline-${tipo} mt-2 btn-tentar-novamente-agenda">Tentar novamente</button>
            </div>
        `;
    });
    document.querySelectorAll('.btn-tentar-novamente-agenda').forEach(btn => {
        btn.addEventListener('click', carregarAgenda);
    });
}

function getPrimeiroUltimoNome(nomeCompleto) {
    if (!nomeCompleto) return 'Técnico';
    const partes = nomeCompleto.trim().split(' ');
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0];
}

function showModalNativo(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.removeAttribute('aria-hidden'); 
    let m = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
    m.show();
}

function hideModalNativo(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    let m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
}

async function verificarPermissoes() {
    try {
        const response = await fetch('/api/username');
        const data = await response.json();
        const grupo = normalizarGrupoUsuario(data.group || '');
        window.grupoUsuarioLogado = data.group || '';
        const selectModo = document.getElementById('filtro-modo-atendimento');
        if (selectModo) {
            selectModo.value = (grupo.includes('QUALIDADE') || grupo.includes('RECOLHIMENTO')) && !grupo.includes('ADMIN') && !grupo.includes('NOC')
                ? 'RECOLHIMENTO'
                : 'OPERACIONAL';
        }
        ajustarFiltrosPorModo();
        
        if (grupo.includes('LOGISTICA') || grupo.includes('ADMIN') || grupo.includes('NOC') || grupo.includes('FIBRA')) {
            usuarioPodeEditar = true;
            document.getElementById('area-admin-logistica')?.classList.remove('d-none');
        }
        if (grupo.includes('QUALIDADE') || grupo.includes('RECOLHIMENTO')) {
            usuarioPodeEditar = true;
        }
    } catch (e) { console.error("Erro ao checar permissões", e); }
}

function ajustarFiltrosPorModo() {
    const selectSetor = document.getElementById('filtro-setor');
    if (!selectSetor) return;
    if (modoPainelRecolhimento()) {
        selectSetor.value = 'RECOLHIMENTO';
        selectSetor.disabled = true;
    } else {
        selectSetor.disabled = false;
        if (selectSetor.value === 'RECOLHIMENTO') selectSetor.value = 'TODOS';
    }
}

async function carregarAgenda() {
    const data = document.getElementById('filtro-data').value;
    if (!data) return;
    const statusFiltro = document.getElementById('filtro-status').value;

    await construirColunasTecnicos(data);

    const possuiAgendaAnterior = Array.isArray(todosAgendamentosGlobais) && todosAgendamentosGlobais.length > 0;
    if (!possuiAgendaAnterior) {
        document.querySelectorAll('.column-body').forEach(el => {
            el.innerHTML = '<div class="text-muted text-center small p-3"><span class="spinner-border spinner-border-sm mb-1"></span><br>Carregando...</div>';
        });
    }

    try {
        const response = await fetch(`/api/v5/painel-logistica/agendamentos?data=${data}&municipio=TODOS&status=${encodeURIComponent(statusFiltro)}&modo=${encodeURIComponent(obterModoAtendimentoPainel())}`);
        const payload = await response.json().catch(() => ({}));
        await carregarCapacidadeResumoDia(data);

        if (!response.ok) {
            console.error('Erro ao carregar agenda:', payload);
            const erro = new Error('Erro de Conexão');
            erro.payload = payload;
            throw erro;
        }

        if (payload?.partial || payload?.ixcIndisponivel) {
            const listaParcial = Array.isArray(payload.agendamentos) ? payload.agendamentos : [];
            const aviso = payload.warning || 'IXC temporariamente indisponível. Mantendo última versão carregada.';
            mostrarAvisoAgenda(aviso, payload.requestId, true);

            if (listaParcial.length > 0) {
                todosAgendamentosGlobais = listaParcial;
                renderizarQuadro();
            } else if (possuiAgendaAnterior) {
                renderizarQuadro();
            } else {
                renderizarErroCarregamentoAgenda('IXC temporariamente indisponível. Não foi possível carregar a agenda agora.', 'warning');
            }
            return;
        }

        todosAgendamentosGlobais = Array.isArray(payload) ? payload : [];
        limparAvisoAgenda();
        
        renderizarQuadro();
    } catch (error) {
        console.error('Erro ao carregar agenda:', error?.payload || error);
        const requestId = error?.payload?.requestId;
        if (possuiAgendaAnterior) {
            mostrarAvisoAgenda('Não foi possível atualizar os dados. Mantendo última agenda carregada.', requestId, true);
            renderizarQuadro();
            return;
        }
        mostrarAvisoAgenda('Não foi possível atualizar os dados agora.', requestId, true);
        renderizarErroCarregamentoAgenda();
    }
}

async function carregarCapacidadeResumoDia(data) {
    const resumoAnterior = capacidadeResumoDataGlobal === data
        ? JSON.stringify(capacidadeResumoDiaGlobal || {})
        : '';
    try {
        const response = await fetch(`/api/v5/painel-logistica/capacidade-dia?data=${encodeURIComponent(data)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Erro ao consultar capacidade do dia.');
        capacidadeResumoDiaGlobal = payload.capacidadeResumo || null;
        capacidadeResumoDataGlobal = data;
    } catch (error) {
        console.warn('[Painel Logistica] Não foi possível carregar o resumo de capacidade:', error.message);
        if (capacidadeResumoDataGlobal !== data) {
            capacidadeResumoDiaGlobal = null;
            capacidadeResumoDataGlobal = data;
        }
    }
    return resumoAnterior !== JSON.stringify(capacidadeResumoDiaGlobal || {});
}

function colunaCapacidadePermitida(chave, filtroSetor, filtroMunicipio) {
    const chaves = Array.isArray(chave) ? chave : [chave];
    const instalacao = chaves.some(item => String(item).startsWith('instalacao_'));
    const recolhimento = chaves.some(item => String(item).startsWith('recolhimento_'));
    if (filtroSetor === 'RECOLHIMENTO') return recolhimento;
    if (recolhimento) return false;
    if (filtroSetor === 'MANUTENCAO' && instalacao) return false;
    if (filtroSetor === 'INSTALACAO' && !instalacao) return false;
    if (filtroMunicipio === 'SERRA' && chaves.every(item => String(item).includes('_outros_'))) return false;
    if (filtroMunicipio === 'VV_VIX_CCA' && chaves.every(item => String(item).includes('_serra_'))) return false;
    return true;
}

function obterChavesCapacidadeColuna(corpoId, filtroMunicipio) {
    if (corpoId === 'col-inst-serra-matutino') return ['instalacao_casa_serra_m', 'instalacao_predio_serra_m'];
    if (corpoId === 'col-inst-serra-vespertino') return ['instalacao_casa_serra_t', 'instalacao_predio_serra_t'];
    if (corpoId === 'col-inst-outros-matutino') return ['instalacao_casa_outros_m', 'instalacao_predio_outros_m'];
    if (corpoId === 'col-inst-outros-vespertino') return ['instalacao_casa_outros_t', 'instalacao_predio_outros_t'];
    if (corpoId === 'col-recolhimento-matutino') {
        if (filtroMunicipio === 'SERRA') return ['recolhimento_serra_m'];
        if (filtroMunicipio === 'VV_VIX_CCA') return ['recolhimento_outros_m'];
        return ['recolhimento_serra_m', 'recolhimento_outros_m'];
    }
    if (corpoId === 'col-recolhimento-vespertino') {
        if (filtroMunicipio === 'SERRA') return ['recolhimento_serra_t'];
        if (filtroMunicipio === 'VV_VIX_CCA') return ['recolhimento_outros_t'];
        return ['recolhimento_serra_t', 'recolhimento_outros_t'];
    }
    const chave = CHAVE_CAPACIDADE_POR_COLUNA[corpoId || ''];
    return chave ? [chave] : [];
}

function obterSlotCapacidadeColuna(corpoId, filtroMunicipio) {
    if (capacidadeResumoDataGlobal !== document.getElementById('filtro-data')?.value) return null;
    const chaves = obterChavesCapacidadeColuna(corpoId, filtroMunicipio);
    const slots = chaves.map(chave => capacidadeResumoDiaGlobal?.[chave]).filter(Boolean);
    if (slots.length === 0) return null;
    return slots.reduce((acc, slot) => ({
        usadas: acc.usadas + Number(slot.usadas || 0),
        total: acc.total + Number(slot.total || 0),
        disponiveis: acc.disponiveis + Math.max(0, Number(slot.disponiveis || 0)),
        encerrado: acc.encerrado && Boolean(slot.encerrado)
    }), { usadas: 0, total: 0, disponiveis: 0, encerrado: true });
}

function atualizarTaskCountComVagas(coluna, totalCards, filtroSetor, filtroMunicipio) {
    const spanCount = coluna.querySelector('.task-count');
    if (!spanCount) return { possuiResumo: false, permitida: true };

    const corpo = coluna.querySelector('.column-body');
    const chaves = obterChavesCapacidadeColuna(corpo?.id || '', filtroMunicipio);
    const slot = obterSlotCapacidadeColuna(corpo?.id || '', filtroMunicipio);
    const permitida = chaves.length === 0 || colunaCapacidadePermitida(chaves, filtroSetor, filtroMunicipio);
    const container = spanCount.closest('.task-count-resumo') || spanCount.parentElement;

    container.replaceChildren();
    container.className = 'task-count-resumo mt-1';

    const qtd = document.createElement('span');
    qtd.className = 'badge bg-secondary rounded-pill task-count-qtd';
    const novoCount = document.createElement('span');
    novoCount.className = 'task-count';
    novoCount.textContent = String(totalCards);
    qtd.append(novoCount, document.createTextNode(` OS`));
    container.appendChild(qtd);

    if (slot) {
        const usadas = Number(slot.usadas || 0);
        const total = Number(slot.total || 0);
        const livres = Math.max(0, Number(slot.disponiveis || 0));
        const vagas = document.createElement('span');
        vagas.className = 'badge rounded-pill task-count-vagas';
        vagas.textContent = `${usadas}/${total} vagas`;
        const disponiveis = document.createElement('span');
        disponiveis.className = `task-count-livres ${livres === 0 ? 'task-count-lotado' : ''}`;
        disponiveis.textContent = slot.encerrado
            ? 'Encerrado'
            : (livres === 0 ? 'Lotado' : `${livres} livre${livres === 1 ? '' : 's'}`);
        container.append(vagas, disponiveis);
    }

    return { possuiResumo: !!slot, permitida };
}

function renderizarQuadro() {
    document.querySelectorAll('.column-body').forEach(col => col.innerHTML = '');
    document.querySelectorAll('.swimlane-container').forEach(lane => lane.classList.remove('d-none'));
    
    const filtroSetor = document.getElementById('filtro-setor').value;
    const statusFiltro = document.getElementById('filtro-status').value;
    const filtroMun = document.getElementById('filtro-municipio').value;

    todosAgendamentosGlobais.forEach(os => {
        const statusIxc = os.ixc_status || 'A';
        const isConcluido = (statusIxc === 'F');
        const isFalha = (statusIxc === 'RAG');
        
        const isInstalacao = (os.tipo_servico === 'INSTALACAO') || (os.nome_setor && os.nome_setor.toUpperCase().includes('INSTALA')) || (os.setor === '5');
        const textoRecolhimento = [
            os.nome_processo,
            os.sintoma_relatado,
            os.assunto,
            os.titulo,
            os.mensagem
        ].filter(Boolean).join(' ').toUpperCase();
        const isRecolhimento = String(os.tipo_servico || '').toUpperCase().includes('RECOLHIMENTO') || String(os.setor || '') === '19' || textoRecolhimento.includes('CANCELAMENTO - INTERNET BANDA LARGA') || textoRecolhimento.includes('RECOLHER EQUIPAMENTOS');

        if (modoPainelRecolhimento() && !isRecolhimento) return;
        if (!modoPainelRecolhimento() && isRecolhimento) return;

        if (statusFiltro === 'OCULTAR_CONCLUIDOS' && isConcluido) return; 
        if (statusFiltro === 'PENDENTES' && (isConcluido || isFalha)) return;
        if (statusFiltro === 'FALHAS' && !isFalha) return;
        
        if (filtroSetor === 'RECOLHIMENTO' && !isRecolhimento) return;
        if (filtroSetor === 'MANUTENCAO' && (isInstalacao || isRecolhimento)) return;
        if (filtroSetor === 'INSTALACAO' && (!isInstalacao || isRecolhimento)) return;

        const cidadeUpper = (os.cidade_real || '').toUpperCase();
        const isSerra = cidadeUpper.includes('SERRA');
        
        if (filtroMun === 'SERRA' && !isSerra) return;
        if (filtroMun === 'VV_VIX_CCA' && isSerra) return;

        const card = criarCardOS(os);

        let turnoId = (os.turno === 'MATUTINO') ? 'matutino' : 'vespertino';
        
        let baseDivId = '';
        if (isRecolhimento) {
            baseDivId = `col-recolhimento-${turnoId}`;
        } else if (isInstalacao) {
            baseDivId = isSerra ? `col-inst-serra-${turnoId}` : `col-inst-outros-${turnoId}`;
        } else {
            if (os.tipo_imovel === 'CASA' || os.tipo_imovel === 'CORPORATIVO') baseDivId = `col-manut-casa-${turnoId}`;
            else baseDivId = isSerra ? `col-manut-predio-serra-${turnoId}` : `col-manut-predio-outros-${turnoId}`;
        }

        const baseCol = document.getElementById(baseDivId);
        if (!baseCol) return;

        if (!os.ixc_tecnico_id || String(os.ixc_tecnico_id) === '138' || String(os.ixc_tecnico_id) === '0') {
            baseCol.appendChild(card);
        } else {
            const techColId = `tec-${os.ixc_tecnico_id}-${baseDivId}`;
            let techCol = document.getElementById(techColId);

            if (!techCol) {
                techCol = criarColunaTecnico(os.ixc_tecnico_id, os.nome_tecnico, techColId, isInstalacao);
                baseCol.appendChild(techCol);
            }
            document.getElementById(`body-${techColId}`).appendChild(card);
        }
    });

    document.querySelectorAll('.kanban-column').forEach(col => {
        const totalCards = col.querySelectorAll('.asana-card').length;
        const estado = atualizarTaskCountComVagas(col, totalCards, filtroSetor, filtroMun);
        col.style.display = estado.permitida && totalCards > 0 ? 'block' : 'none';
    });

    ['matutino', 'vespertino'].forEach(turno => {
        const laneBody = document.getElementById(`swimlane-${turno}`);
        const lane = laneBody ? laneBody.closest('.swimlane-container') : null;
        if (!laneBody || !lane) return;
        const possuiColunaVisivel = Array.from(laneBody.querySelectorAll('.kanban-column'))
            .some(coluna => coluna.style.display !== 'none');
        lane.classList.toggle('d-none', !possuiColunaVisivel);
    });

    atualizarTimers();
}

function criarColunaTecnico(idTecnico, nomeTecnico, techColId, isInstalacao) {
    const div = document.createElement('div');
    div.className = 'tec-sub-column mb-3 border border-2 rounded bg-white overflow-hidden shadow-sm';
    div.id = techColId;

    const headerColor = isInstalacao ? 'bg-success text-white' : 'bg-primary text-white';

    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center p-2 click-retrair-coluna ${headerColor}" style="cursor: pointer;" data-target="body-${techColId}">
            <span class="fw-bold" style="font-size: 0.75rem; pointer-events: none;"><i class="bi bi-person-workspace me-1"></i>${nomeTecnico}</span>
            <i class="bi bi-arrows-collapse small" style="pointer-events: none;"></i>
        </div>
        <div class="p-2 bg-white" id="body-${techColId}" style="min-height: 10px;"></div>
    `;
    return div;
}

window.opcoesEscala = [];

async function construirColunasTecnicos(data) {
    try {
        const response = await fetch(`/api/v5/painel-logistica/tecnicos?data=${data}`);
        listaTecnicos = await response.json();

        let colunasMap = new Map();
        listaTecnicos.forEach(tec => {
            const isDupla = tec.dupla_id && tec.dupla_id.trim() !== '';
            const key = isDupla ? `DUPLA_${tec.dupla_id}` : `TEC_${tec.id}`;

            if (!colunasMap.has(key)) {
                colunasMap.set(key, { id_tecnico: tec.id, nomes: [getPrimeiroUltimoNome(tec.nome)], turno: normalizarTurnoEscala(tec.turno_escala) });
            } else {
                colunasMap.get(key).nomes.push(getPrimeiroUltimoNome(tec.nome));
            }
        });

        window.opcoesEscala = Array.from(colunasMap.values()).map(col => ({
            id_tecnico: col.id_tecnico, nome_exibicao: col.nomes.join(' & '), turno: col.turno
        }));
    } catch (error) { console.error("Erro na escala:", error); }
}

function criarCardOS(os) {
    const card = document.createElement('div');
    card.className = `asana-card ${os.status_interno === 'ATRIBUIDO' ? 'card-os-atribuida' : 'card-os-pendente'}`;
    card.id = `os-${os.id}`;
    card.dataset.agendaId = os.id;
    card.dataset.ixcOsId = os.ixc_os_id;

    const isPend = (!os.ixc_tecnico_id || String(os.ixc_tecnico_id) === '138' || String(os.ixc_tecnico_id) === '0');
    let corBorda = 'border-left: 4px solid #6c757d;'; 
    let cardStyleAdicional = '';
    let badgeStatus = `<span class="asana-badge badge-turno">Pendente</span>`;
    
    if (isPend) {
        corBorda = 'border-left: 6px solid #dc3545;';
        cardStyleAdicional = 'background-color: var(--os-pending-bg, #fff4f4) !important; border: 1px dashed #dc3545 !important;';
        badgeStatus = `<span class="asana-badge bg-danger text-white border-danger shadow-sm"><i class="bi bi-exclamation-circle-fill me-1"></i>Aguardando Técnico</span>`;
    }

    const statusIxc = os.ixc_status || 'A';

    if (!isPend) {
        if (statusIxc === 'DS') {
            corBorda = 'border-left: 4px solid #ffc107;';
            const inicioDeslocamento = obterInicioDeslocamentoOs(os);
            badgeStatus = `<span class="asana-badge timer-deslocamento" style="background-color: #fff3cd; color: #856404;" data-inicio="${inicioDeslocamento || ''}" data-os-id="${os.ixc_os_id || os.id || ''}"><i class="bi bi-car-front-fill me-1"></i>Deslocamento</span>`;
        }
        else if (statusIxc === 'EX') { corBorda = 'border-left: 4px solid #0dcaf0;'; badgeStatus = `<span class="asana-badge timer-execucao" style="background-color: #cff4fc; color: #055160;" data-inicio="${os.data_hora_execucao || ''}" data-os-id="${os.ixc_os_id || os.id || ''}"><i class="bi bi-tools me-1"></i>Execução</span>`; }
        else if (statusIxc === 'F') { corBorda = 'border-left: 4px solid #198754;'; badgeStatus = `<span class="asana-badge" style="background-color: #d1e7dd; color: #0f5132;"><i class="bi bi-check-circle-fill me-1"></i>Concluído</span>`; }
        else if (statusIxc === 'RAG') { corBorda = 'border-left: 4px solid #dc3545;'; badgeStatus = `<span class="asana-badge" style="background-color: #f8d7da; color: #842029;"><i class="bi bi-x-circle-fill me-1"></i>Reagendar</span>`; }
    }

    card.style.cssText = corBorda + cardStyleAdicional + (os.is_futuro_prioridade ? ' background-color: var(--os-priority-bg, #fff0f0) !important; border: 2px solid #dc3545 !important;' : '');

    let badgesHtml = os.horario_agendado ? `<span class="asana-badge bg-dark text-white"><i class="bi bi-clock me-1"></i>${os.horario_agendado}</span>` : '';
    badgesHtml += badgeStatus;
    if (os.aceita_encaixe) badgesHtml += `<span class="asana-badge badge-encaixe"><i class="bi bi-lightning-fill"></i> Encaixe</span>`;
    const preferenciaHorario = formatarPreferenciaHorario(os);
    if (preferenciaHorario) badgesHtml += `<span class="asana-badge bg-info-subtle text-info-emphasis"><i class="bi bi-clock-history me-1"></i>${preferenciaHorario}</span>`;
    const prioridadeManual = Math.max(0, Math.min(3, Number(os.prioridade_logistica || 0)));
    if (prioridadeManual > 0) badgesHtml += `<span class="asana-badge bg-danger text-white"><i class="bi bi-arrow-up-circle me-1"></i>${PRIORIDADE_LOGISTICA_LABELS[prioridadeManual]}</span>`;
    if (os.is_futuro_prioridade) badgesHtml += `<span class="asana-badge bg-danger text-white border border-danger shadow-sm ms-1"><i class="bi bi-calendar-x me-1"></i>Vindo de ${String(os.data_agendamento_original).split('T')[0].split('-').reverse().join('/')}</span>`;
    else if (os.solicita_prioridade) badgesHtml += `<span class="asana-badge bg-danger text-white border border-danger shadow-sm ms-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>Prioridade</span>`;

    if (Array.isArray(os.tags)) {
        os.tags.forEach(tag => {
            badgesHtml += `<span class="asana-badge" style="background:${tag.cor_fundo || '#0d6efd'};color:${tag.cor_texto || '#fff'};"><i class="bi bi-tag-fill me-1"></i>${tag.nome}</span>`;
        });
    }

    const contatoStatus = String(os.contato_status || 'PENDENTE').toUpperCase();
    if (contatoStatus === 'CONFIRMADO') badgesHtml += `<span class="asana-badge bg-success text-white"><i class="bi bi-telephone-check me-1"></i>Cliente Confirmou</span>`;
    else if (contatoStatus === 'NAO_RECEBE') badgesHtml += `<span class="asana-badge bg-warning text-dark"><i class="bi bi-calendar-x me-1"></i>Não Recebe</span>`;
    else if (contatoStatus === 'SEM_CONTATO') badgesHtml += `<span class="asana-badge bg-secondary text-white"><i class="bi bi-telephone-x me-1"></i>Sem Contato</span>`;

    if (os.espera_cliente_ate) {
        badgesHtml += `<span class="asana-badge bg-warning text-dark timer-espera-cliente" data-fim-espera="${os.espera_cliente_ate}"><i class="bi bi-hourglass-split me-1"></i>Técnico aguardando cliente</span>`;
    }

    const velocidadePlanoLabel = formatarVelocidadePlano(os.velocidade_plano ?? os.plano_speed ?? os.velocidadePlano ?? os.speed);
    if (velocidadePlanoLabel) {
        badgesHtml += `<span class="asana-badge bg-primary-subtle text-primary-emphasis"><i class="bi bi-speedometer2 me-1"></i>${velocidadePlanoLabel}</span>`;
    }

    let optionsHtml = '';
    window.opcoesEscala.forEach(op => {
        const turnoOpcao = normalizarTurnoEscala(op.turno);
        if ((os.turno === 'MATUTINO' && ['INTEGRAL', 'MATUTINO'].includes(turnoOpcao)) || (os.turno === 'VESPERTINO' && ['INTEGRAL', 'VESPERTINO'].includes(turnoOpcao))) {
            const isSelected = (os.ixc_tecnico_id == op.id_tecnico && !isPend) ? 'selected' : '';
            optionsHtml += `<option value="${op.id_tecnico}" ${isSelected}>${op.nome_exibicao}</option>`;
        }
    });

    if (!isPend && os.ixc_tecnico_id && !optionsHtml.includes(`value="${os.ixc_tecnico_id}"`)) {
        optionsHtml += `<option value="${os.ixc_tecnico_id}" selected>${os.nome_tecnico} (Fora Escala)</option>`;
    }

    const nomeProcessoSeguro = escapeHtmlLogistica(normalizarNomeProcessoCard(os.nome_processo));
    const processoHtml = nomeProcessoSeguro ? `
        <div class="processo-os-card mt-3" title="${nomeProcessoSeguro}">
            <span class="badge-processo-os">
                <i class="bi bi-diagram-3 me-1" aria-hidden="true"></i>
                <span class="processo-os-texto">${nomeProcessoSeguro}</span>
            </span>
        </div>
    ` : '';

    card.innerHTML = `
        <div class="mb-2 cursor-pointer click-os-detalhes">${badgesHtml}</div>
        <div class="os-title cursor-pointer click-os-detalhes" style="font-size:0.85rem; line-height: 1.4; font-weight: bold; color: #212529;">
            ${os.ixc_cliente_id} - ${os.nome_condominio || 'S/C'} - ${os.tipo_imovel}
        </div>
        <div class="os-meta d-flex justify-content-between align-items-center mt-2">
            <span class="text-truncate small"><i class="bi bi-geo-alt me-1 text-danger"></i>${os.cidade_real || os.municipio_base}</span>
            <span class="text-muted small fw-bold">#${os.ixc_os_id}</span>
        </div>
        ${processoHtml}
        <div class="mt-2 border-top pt-2">
            <select class="form-select form-select-sm border-secondary fw-bold select-atribuir-tecnico" 
                style="background-color: #f8f9fa;" 
                data-id-agenda="${os.id}" 
                data-ixc-os-id="${os.ixc_os_id}" 
                data-agendamento="${os.data_agendamento_original || os.data_agendamento || ''}"
                data-turno="${os.turno || 'MATUTINO'}"
                ${!usuarioPodeEditar ? 'disabled' : ''}>
                <option value="">👤 Atribuir Técnico / Fila...</option>
                ${optionsHtml}
            </select>
        </div>
    `;

    card.querySelectorAll('.click-os-detalhes').forEach(el => el.addEventListener('click', () => abrirModalDetalhes(os)));
    return card;
}

function normalizarNomeProcessoCard(valor) {
    const nome = String(valor || '').trim();
    return /^PROCESSO\s*#\s*\d+$/i.test(nome) ? '' : nome;
}

function escapeHtmlLogistica(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatarPreferenciaHorario(os) {
    const tipo = String(os?.preferencia_horario_tipo || 'SEM_PREFERENCIA').toUpperCase();
    const inicio = String(os?.preferencia_horario_inicio || '').substring(0, 5);
    const fim = String(os?.preferencia_horario_fim || '').substring(0, 5);
    const obs = String(os?.preferencia_horario_obs || '').trim();

    if (!tipo || tipo === 'SEM_PREFERENCIA') return '';
    if (tipo === 'MANHA') return 'Pref. manhã';
    if (tipo === 'TARDE') return 'Pref. tarde';
    if (tipo === 'A_PARTIR' && inicio) return `Pref. a partir de ${inicio}`;
    if (tipo === 'ATE' && fim) return `Pref. até ${fim}`;
    if (tipo === 'INTERVALO' && inicio && fim) return `Pref. ${inicio}-${fim}`;
    if (tipo === 'OBSERVACAO' && obs) return `Pref. ${obs}`;
    return 'Pref. horário';
}

function obterInicioDeslocamentoOs(os) {
    return os?.data_hora_deslocamento ||
        os?.data_inicio_deslocamento ||
        os?.data_deslocamento ||
        os?.inicio_deslocamento ||
        '';
}

function traduzirMotivoOnu(motivo) {
    const raw = String(motivo || '').trim();
    const normalizado = raw.toUpperCase();
    if (!raw) return '---';
    if (normalizado.includes('DYING-GASP') || normalizado.includes('DYING GASP')) return 'Falha elétrica';
    if (normalizado === 'LOS' || normalizado.includes('LOS') || normalizado.includes('LOBI')) return 'Perda do Sinal Óptico';
    return raw;
}

function classeSinalOnu(valor) {
    const numero = Math.abs(parseFloat(String(valor || '').replace(',', '.')));
    if (!Number.isFinite(numero) || numero === 0) return 'text-muted';
    if (numero > 30) return 'text-danger fw-bold';
    if (numero >= 28) return 'text-warning fw-bold';
    return 'text-success fw-bold';
}

function obterOffsetSaoPauloMs(date = new Date()) {
    const partes = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
    }, {});

    const asUtc = Date.UTC(
        Number(partes.year),
        Number(partes.month) - 1,
        Number(partes.day),
        Number(partes.hour),
        Number(partes.minute),
        Number(partes.second)
    );

    return asUtc - date.getTime();
}

function criarDataSaoPaulo(ano, mes, dia, hora = 0, minuto = 0, segundo = 0) {
    const utcSemOffset = Date.UTC(ano, mes - 1, dia, hora, minuto, segundo);
    const offset = obterOffsetSaoPauloMs(new Date(utcSemOffset));
    return new Date(utcSemOffset - offset);
}

function parseDataHoraOperacional(valor) {
    if (!valor && valor !== 0) return null;
    if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
    if (typeof valor === 'number') {
        const dataNumero = new Date(valor);
        return Number.isNaN(dataNumero.getTime()) ? null : dataNumero;
    }

    const str = String(valor).trim();
    if (!str || str === 'null' || str === '0000-00-00 00:00:00') return null;

    let match = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
        return criarDataSaoPaulo(
            Number(match[1]),
            Number(match[2]),
            Number(match[3]),
            Number(match[4]),
            Number(match[5]),
            Number(match[6] || 0)
        );
    }

    match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
        return criarDataSaoPaulo(
            Number(match[3]),
            Number(match[2]),
            Number(match[1]),
            Number(match[4]),
            Number(match[5]),
            Number(match[6] || 0)
        );
    }

    const fallback = new Date(str);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatarDuracaoTimer(ms) {
    const totalSegundos = Math.floor(ms / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

function calcularDuracaoConfiavel(valorInicio, osId, contexto) {
    const inicio = parseDataHoraOperacional(valorInicio);
    if (!inicio) {
        if (valorInicio) console.warn(`[Timer ${contexto}] data inválida para OS ${osId || 'N/A'}:`, valorInicio);
        return null;
    }

    const diffMs = Date.now() - inicio.getTime();
    const limiteFuturoMs = 5 * 60 * 1000;
    const limiteMaximoMs = 7 * 24 * 60 * 60 * 1000;
    if (diffMs < -limiteFuturoMs || diffMs > limiteMaximoMs) {
        console.warn(`[Timer ${contexto}] data inválida para OS ${osId || 'N/A'}:`, valorInicio);
        return null;
    }

    return Math.max(0, diffMs);
}

function atualizarOsLocal(idLocal, patch) {
    const idStr = String(idLocal);
    const os = todosAgendamentosGlobais.find(item => String(item.id) === idStr);
    if (os) Object.assign(os, patch);
    if (window.osModalAtual && String(window.osModalAtual.id) === idStr) {
        Object.assign(window.osModalAtual, patch);
    }
}

function atualizarCardAberto(idLocal) {
    if (!idLocal || String(idLocal).startsWith('fila-')) return;
    renderizarQuadro();
}

function atualizarStatusContatoNaUi(idLocal, status) {
    atualizarOsLocal(idLocal, { contato_status: status });
    const elStatusContato = document.getElementById('status-contato-atual');
    if (elStatusContato) elStatusContato.textContent = `Status: ${formatarStatusContato(status)}`;
    atualizarCardAberto(idLocal);
}

function atualizarEsperaNaUi(idLocal, esperaAte) {
    atualizarOsLocal(idLocal, { espera_cliente_ate: esperaAte || null });
    const input = document.getElementById('input-minutos-espera');
    if (input) input.value = '';
    atualizarCardAberto(idLocal);
}

window.atribuirTecnicoOS = async function(
    id_agenda,
    id_tecnico,
    ixc_os_id,
    data_agendamento,
    turno
) {
    try {
        const response = await fetch('/api/v5/painel-logistica/atribuir-tecnico', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_agenda,
                ixc_tecnico_id: id_tecnico,
                ixc_os_id,
                data_agendamento,
                turno,
                usuario_logado: window.usuarioLogado
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
            throw new Error(data.error || data.message || 'Erro ao atribuir técnico no IXC.');
        }

        await carregarAgenda();

        if (usuarioPodeEditar) {
            await carregarFilaLogistica();
        }
    } catch (error) {
        showInfoModal('Erro ao atribuir técnico: ' + error.message);

        await carregarAgenda();
    }
};

async function autoRefreshSilencioso() {
    const data = document.getElementById('filtro-data').value;
    if (!data) return;
    const statusFiltro = document.getElementById('filtro-status').value;

    try {
        const capacidadeAlterada = await carregarCapacidadeResumoDia(data);
        const response = await fetch(`/api/v5/painel-logistica/agendamentos?data=${data}&municipio=TODOS&status=${encodeURIComponent(statusFiltro)}&modo=${encodeURIComponent(obterModoAtendimentoPainel())}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Falha no refresh silencioso:', payload);
            mostrarAvisoAgenda('Atualização automática falhou. Mantendo última versão carregada.', payload?.requestId);
            return;
        }

        if (payload?.partial || payload?.ixcIndisponivel) {
            const listaParcial = Array.isArray(payload.agendamentos) ? payload.agendamentos : [];
            console.warn('IXC indisponível no refresh silencioso:', {
                requestId: payload.requestId,
                fallbackLocal: payload.fallbackLocal,
                stale: payload.stale
            });
            mostrarAvisoAgenda(
                payload.warning || 'Atualização automática indisponível. Mantendo última versão carregada.',
                payload.requestId,
                true
            );
            if (todosAgendamentosGlobais.length === 0 && listaParcial.length > 0) {
                todosAgendamentosGlobais = listaParcial;
                renderizarQuadro();
            } else if (capacidadeAlterada) {
                renderizarQuadro();
            }
            return;
        }

        const novaLista = Array.isArray(payload) ? payload : [];
        
        if (capacidadeAlterada || JSON.stringify(novaLista) !== JSON.stringify(todosAgendamentosGlobais)) {
            todosAgendamentosGlobais = novaLista;
            limparAvisoAgenda();
            renderizarQuadro();
            if(usuarioPodeEditar) carregarFilaLogistica(); 
        }
    } catch (e) {
        console.error("Falha no refresh silencioso", e);
        mostrarAvisoAgenda('Atualização automática falhou. Mantendo última versão carregada.');
    }
}

function atualizarTimers() {
    document.querySelectorAll('.timer-execucao').forEach(el => {
        const inicioStr = el.dataset.inicio;
        const diffMs = calcularDuracaoConfiavel(inicioStr, el.dataset.osId, 'Execução');
        if (diffMs === null) {
            el.innerHTML = '<i class="bi bi-tools me-1"></i>Execução';
            return;
        }
        
        const diffMinutos = Math.floor(diffMs / 60000);
        el.innerHTML = `<i class="bi bi-tools me-1"></i>Execução ${formatarDuracaoTimer(diffMs)}`;
        el.className = 'asana-badge timer-execucao';
        el.style.backgroundColor = '';

        if (diffMinutos >= 90) { el.classList.add('text-roxo-vibrante', 'blink'); el.style.backgroundColor = '#f3e5f5'; }
        else if (diffMinutos >= 60) { el.classList.add('text-danger', 'fw-bold'); el.style.backgroundColor = '#f8d7da'; }
        else { el.classList.add('text-success', 'fw-bold'); el.style.backgroundColor = '#d1e7dd'; }
    });

    document.querySelectorAll('.timer-deslocamento').forEach(el => {
        const inicioStr = el.dataset.inicio;
        const diffMs = calcularDuracaoConfiavel(inicioStr, el.dataset.osId, 'Deslocamento');
        if (diffMs === null) {
            el.innerHTML = '<i class="bi bi-car-front-fill me-1"></i>Deslocamento';
            el.className = 'asana-badge timer-deslocamento text-warning fw-bold';
            el.style.backgroundColor = '#fff3cd';
            return;
        }

        el.innerHTML = `<i class="bi bi-car-front-fill me-1"></i>Deslocamento ${formatarDuracaoTimer(diffMs)}`;
        el.className = 'asana-badge timer-deslocamento text-warning fw-bold';
        el.style.backgroundColor = '#fff3cd';
    });

    document.querySelectorAll('.timer-espera-cliente').forEach(el => {
        const fimStr = el.dataset.fimEspera;
        if (!fimStr || fimStr === 'null') return;
        const fim = new Date(String(fimStr).replace(/-/g, '/'));
        if (isNaN(fim)) return;
        const diffSeg = Math.floor((fim - new Date()) / 1000);
        const card = el.closest('.asana-card');
        if (diffSeg <= 0) {
            el.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i>ESPERA ACABOU';
            el.classList.add('bg-danger', 'text-white', 'blink');
            if (card) card.classList.add('blink');
        } else {
            const min = Math.floor(diffSeg / 60);
            const seg = diffSeg % 60;
            el.innerHTML = `<i class="bi bi-hourglass-split me-1"></i>Técnico aguardando cliente ${min}:${String(seg).padStart(2,'0')}`;
            if (card) card.classList.remove('blink');
        }
    });
}

function mostrarAvisoFilaLogistica(mensagem, requestId) {
    const container = document.getElementById('container-fila-logistica');
    if (!container) return;
    let aviso = document.getElementById('aviso-fila-logistica');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'aviso-fila-logistica';
        aviso.className = 'alert alert-warning py-2 px-3 small mb-2';
        container.prepend(aviso);
    }
    aviso.replaceChildren();
    const texto = document.createElement('span');
    texto.textContent = requestId ? `${mensagem} RequestId: ${requestId}` : mensagem;
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn btn-sm btn-outline-warning ms-2 py-0';
    botao.textContent = 'Tentar novamente';
    botao.addEventListener('click', carregarFilaLogistica);
    aviso.append(texto, botao);
    aviso.classList.remove('d-none');
}

function limparAvisoFilaLogistica() {
    document.getElementById('aviso-fila-logistica')?.classList.add('d-none');
}

function renderizarFilaIndisponivel(tbody) {
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-warning py-4">
                <div>IXC temporariamente indisponível. Não foi possível carregar a fila agora.</div>
                <button type="button" class="btn btn-sm btn-outline-warning mt-2 btn-retry-fila-logistica">Tentar novamente</button>
            </td>
        </tr>
    `;
    tbody.querySelector('.btn-retry-fila-logistica')?.addEventListener('click', carregarFilaLogistica);
}

async function carregarFilaLogistica() {
    if (!usuarioPodeEditar) return;

    const container = document.getElementById('container-fila-logistica');
    const tbody = document.getElementById('tbody-fila-logistica');
    const contador = document.getElementById('contador-fila');
    
    if(!container) return;
    container.classList.remove('d-none');
    const possuiaFilaAnterior = !!tbody?.querySelector('[data-fila-os-id]');

    try {
        const res = await fetch(`/api/v5/painel-logistica/fila-pendentes?modo=${encodeURIComponent(obterModoAtendimentoPainel())}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok && !payload?.partial) {
            const erro = new Error(payload.error || 'Erro ao carregar a fila de O.S.');
            erro.payload = payload;
            throw erro;
        }

        const filaRecebida = Array.isArray(payload) ? payload : (Array.isArray(payload.items) ? payload.items : []);
        if (payload?.partial || payload?.ixcIndisponivel) {
            mostrarAvisoFilaLogistica(
                payload.message || 'IXC temporariamente indisponível. Mantendo última fila carregada.',
                payload.requestId
            );
            if (filaRecebida.length === 0 && possuiaFilaAnterior) return;
            if (filaRecebida.length === 0) {
                contador.textContent = '0';
                renderizarFilaIndisponivel(tbody);
                return;
            }
        } else {
            limparAvisoFilaLogistica();
        }
        const grupoNormalizado = normalizarGrupoUsuario(window.grupoUsuarioLogado || '');
        const deveOcultarSetor19 = !modoPainelRecolhimento() || grupoNormalizado.includes('LOGISTICA') || grupoNormalizado.includes('FIBRA');
        const obterSetorFila = os => [os.setor, os.id_setor, os.id_ticket_setor, os.id_setor_atual]
            .map(valor => String(valor || '').trim())
            .find(Boolean) || '';
        const fila = modoPainelRecolhimento()
            ? filaRecebida.filter(os => obterSetorFila(os) === '19' || String(os.tipo_servico || '').toUpperCase().includes('RECOLHIMENTO'))
            : (deveOcultarSetor19 ? filaRecebida.filter(os => obterSetorFila(os) !== '19') : filaRecebida);

        contador.textContent = fila.length;

        if (fila.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4 fst-italic">Nenhuma O.S. pendente na fila neste momento.</td></tr>';
            return;
        }

        let html = '';
        fila.forEach(os => {
            let sintoma = os.mensagem || os.assunto || '---';
            sintoma = sintoma.replace(/(<([^>]+)>)/gi, " ");
            const sintomaTrunc = sintoma.length > 50 ? sintoma.substring(0, 50) + '...' : sintoma;

            const osDataStr = JSON.stringify({
                ixc_os_id: os.id,
                id: 'fila-' + os.id,
                origem: 'FILA_LOGISTICA',
                turno: 'N/A',
                tipo_imovel: os.tipo_imovel || 'Pendente',
                tipo_servico: os.tipo_servico || os.nome_setor || '',
                municipio_base: os.municipio_base || os.cidade_real || os.cidade || '',
                cidade_real: os.cidade_real || os.cidade || '',
                nome_setor: os.nome_setor || '',
                data_agendamento_original: os.data_abertura
            }).replace(/'/g, "&#39;");

            let badgeAtraso = '';
            if (os._is_atrasada_com_tecnico) {
                badgeAtraso = `<span class="badge bg-danger mt-1 d-block shadow-sm" style="font-size: 0.7rem;"><i class="bi bi-clock-history me-1"></i>Atrasada</span>`;
            }

            let badgeRetornoFila = '';
            if (os.retornou_fila) {
                const motivoRetorno = escapeHtmlLogistica(os.retornou_fila_motivo || 'OS retornada para tratamento da logística.');
                badgeRetornoFila = `
                    <span class="badge badge-retorno-fila mt-1 d-block" title="Motivo: ${motivoRetorno}">
                        <i class="bi bi-arrow-repeat me-1" aria-hidden="true"></i>Retornou para fila
                    </span>`;
            }

            html += `
                <tr data-fila-os-id="${os.id}">
                    <td class="align-middle">
                        <span class="fw-bold text-primary">#${os.id}</span>
                        ${badgeAtraso}
                        ${badgeRetornoFila}
                    </td>
                    <td class="align-middle"><span class="badge bg-secondary">${os.nome_setor}</span></td>
                    <td class="align-middle">
                        <span class="fw-bold d-block text-truncate" style="max-width: 250px;">${os.nome_cliente}</span>
                        <span class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-geo-alt"></i> ${os.endereco_formatado}</span>
                    </td>
                    <td class="align-middle" title="${sintoma}">${sintomaTrunc}</td>
                    <td class="align-middle">${(os.data_abertura || '').substring(0, 16)}</td>
                    <td class="align-middle text-center">
                        <button class="btn btn-sm btn-outline-danger fw-bold btn-tratar-fila shadow-sm" data-os='${osDataStr}'>
                            <i class="bi bi-box-arrow-in-up-right me-1"></i>Tratar O.S.
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (e) {
        console.error('Erro ao carregar a fila de O.S.:', e?.payload || e);
        mostrarAvisoFilaLogistica('Não foi possível atualizar a fila. Mantendo última versão carregada.', e?.payload?.requestId);
        if (!possuiaFilaAnterior) renderizarFilaIndisponivel(tbody);
    }
}

function removerOsFilaAtualDaUi() {
    const os = window.osModalAtual || window.osAtualParaFechar;
    if (!os || !String(os.id || '').startsWith('fila-')) return false;

    const idFila = String(os.ixc_os_id || os.id).replace(/^fila-/, '');
    const tbody = document.getElementById('tbody-fila-logistica');
    const contador = document.getElementById('contador-fila');
    const linha = Array.from(document.querySelectorAll('[data-fila-os-id]'))
        .find(el => String(el.dataset.filaOsId) === idFila);

    if (linha) linha.remove();

    if (contador) {
        const atual = Number(contador.textContent || 0);
        contador.textContent = String(Math.max(0, atual - 1));
    }

    if (tbody && !tbody.querySelector('[data-fila-os-id]')) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4 fst-italic">Nenhuma O.S. pendente na fila neste momento.</td></tr>';
        if (contador) contador.textContent = '0';
    }

    return true;
}

async function abrirModalConfiguracoes() {
    showModalNativo('modalConfiguracoes');
    const data = document.getElementById('filtro-data').value;
    document.getElementById('display-data-escala').textContent = data.split('-').reverse().join('/');
    carregarTagsConfiguracao();

    const containerIndiv = document.getElementById('lista-checkbox-tecnicos');
    const containerDuplas = document.getElementById('container-duplas');
    containerIndiv.innerHTML = '<div class="text-center mt-3"><div class="spinner-border text-primary"></div></div>';
    containerDuplas.innerHTML = '';

    try {
        const response = await fetch('/api/v5/painel-logistica/todos-tecnicos');
        allTechsGlobal = await response.json();
        containerIndiv.innerHTML = '';
        
        const duplasSalvas = {};
        const individuaisSalvos = [];

        listaTecnicos.forEach(t => {
            if (t.dupla_id && t.dupla_id.trim() !== '') {
                if (!duplasSalvas[t.dupla_id]) {
                    duplasSalvas[t.dupla_id] = {
                        equipe: t.equipe,
                        regiao: normalizarRegiaoEscala(t.regiao),
                        turno: normalizarTurnoEscala(t.turno_escala),
                        tipo_imovel: normalizarImovelEscala(t.tipo_imovel),
                        techs: []
                    };
                }
                duplasSalvas[t.dupla_id].techs.push(t.id);
            } else individuaisSalvos.push(t);
        });

        Object.keys(duplasSalvas).forEach(dId => {
            const arr = duplasSalvas[dId].techs;
            const dupla = duplasSalvas[dId];
            adicionarLinhaDupla(arr[0] || '', arr[1] || '', dupla.equipe, dupla.regiao, dupla.turno, dupla.tipo_imovel);
        });

        allTechsGlobal.forEach(tec => {
            const indivObj = individuaisSalvos.find(t => t.id === tec.id);
            const isChecked = indivObj ? 'checked' : '';
            const equipe = indivObj ? indivObj.equipe : 'MANUTENCAO';
            const regiao = normalizarRegiaoEscala(indivObj ? indivObj.regiao : null);
            const turno = normalizarTurnoEscala(indivObj ? (indivObj.turno_escala || indivObj.turno) : null);
            const imovel = normalizarImovelEscala(indivObj ? indivObj.tipo_imovel : null);

            containerIndiv.innerHTML += `
                <div class="col-12 mb-2 tec-escala-item" data-nome="${tec.nome}">
                    <div class="p-2 border rounded bg-light d-flex align-items-center gap-2">
                        <div class="form-check me-2" style="width: 240px;">
                            <input class="form-check-input chk-escala" type="checkbox" value="${tec.id}" id="chk-tec-${tec.id}" ${isChecked}>
                            <label class="form-check-label fw-bold text-truncate w-100" for="chk-tec-${tec.id}">${getPrimeiroUltimoNome(tec.nome)}</label>
                        </div>
                        <select class="form-select form-select-sm sel-equipe" id="equipe-${tec.id}" style="width: 100px;">
                            <option value="MANUTENCAO" ${equipe === 'MANUTENCAO' ? 'selected' : ''}>Manut</option>
                            <option value="INSTALACAO" ${equipe === 'INSTALACAO' ? 'selected' : ''}>Instal</option>
                            <option value="RECOLHIMENTO" ${equipe === 'RECOLHIMENTO' ? 'selected' : ''}>Recolh</option>
                        </select>
                        <select class="form-select form-select-sm sel-regiao" id="regiao-${tec.id}" style="width: 100px;">
                            ${montarOptionsEscala(OPCOES_REGIAO_ESCALA, regiao)}
                        </select>
                        <select class="form-select form-select-sm sel-turno" id="turno-${tec.id}" style="width: 90px;">
                            ${montarOptionsEscala(OPCOES_TURNO_ESCALA, turno)}
                        </select>
                        <select class="form-select form-select-sm sel-imovel" id="imovel-${tec.id}" style="width: 90px;">
                            ${montarOptionsEscala(OPCOES_IMOVEL_ESCALA, imovel)}
                        </select>
                    </div>
                </div>`;
        });

        configurarBuscaTecnicosEscala();
        atualizarResumoTecnicosSelecionados();

        const resCap = await fetch(`/api/v5/painel-logistica/capacidade-dia?data=${data}`);
        const capData = await resCap.json();
        if (capData && capData.encontrado) {
            CAMPOS_CAPACIDADE_LOGISTICA.forEach(campo => {
                const input = document.getElementById('cap-' + campo.replace(/_/g, '-'));
                if (input) input.value = capData[campo] ?? 0;
            });
        }

        const resTemp = await fetch('/api/v5/painel-logistica/capacidade-templates');
        window.templatesCapacidade = await resTemp.json();
        const selectTemp = document.getElementById('select-template-capacidade');
        selectTemp.innerHTML = '<option value="">Selecione um modelo salvo...</option>';
        window.templatesCapacidade.forEach(t => selectTemp.add(new Option(t.nome, t.id)));
        
    } catch (e) { containerIndiv.innerHTML = '<div class="text-danger mt-3">Erro ao carregar.</div>'; }
}

function aplicarTemplateCapacidade() {
    const selectTemp = document.getElementById('select-template-capacidade');
    const t = window.templatesCapacidade?.find(x => String(x.id) === selectTemp.value);
    if (!t) return;

    CAMPOS_CAPACIDADE_LOGISTICA.forEach(campo => {
        const input = document.getElementById('cap-' + campo.replace(/_/g, '-'));
        if (input) input.value = t[campo] ?? 0;
    });
    showInfoModal(`Modelo carregado! Clique em 'Salvar Tudo'.`);
}

function configurarBuscaTecnicosEscala() {
    const busca = document.getElementById('busca-tecnico-escala');
    if (busca && !busca.dataset.listenerAttached) {
        busca.addEventListener('input', () => {
            const termo = busca.value.trim().toUpperCase();
            document.querySelectorAll('#lista-checkbox-tecnicos .tec-escala-item').forEach(item => {
                const nome = (item.dataset.nome || '').toUpperCase();
                item.classList.toggle('d-none', termo && !nome.includes(termo));
            });
        });
        busca.dataset.listenerAttached = 'true';
    }

    document.querySelectorAll('.chk-escala').forEach(chk => {
        if (!chk.dataset.resumoListenerAttached) {
            chk.addEventListener('change', atualizarResumoTecnicosSelecionados);
            chk.dataset.resumoListenerAttached = 'true';
        }
    });
}

function atualizarResumoTecnicosSelecionados() {
    const resumo = document.getElementById('resumo-tecnicos-selecionados');
    if (!resumo) return;
    const selecionados = Array.from(document.querySelectorAll('.chk-escala:checked')).map(chk => {
        const label = document.querySelector(`label[for="chk-tec-${chk.value}"]`);
        return label ? label.textContent.trim() : chk.value;
    });
    resumo.textContent = selecionados.length
        ? `${selecionados.length} técnico(s) individual(is): ${selecionados.join(', ')}`
        : 'Nenhum técnico individual selecionado.';
}

function adicionarLinhaDupla(tec1 = '', tec2 = '', equipe = 'MANUTENCAO', regiao = 'SERRA', turno = 'INTEGRAL', tipoImovel = 'AMBOS') {
    duplaCounter++;
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center gap-2 mb-2 p-2 border rounded bg-light dupla-row shadow-sm';
    const regiaoSelecionada = normalizarRegiaoEscala(regiao);
    const turnoSelecionado = normalizarTurnoEscala(turno);
    const imovelSelecionado = normalizarImovelEscala(tipoImovel);
    
    let options = `<option value="">Selecione...</option>`;
    allTechsGlobal.forEach(t => { options += `<option value="${t.id}">${getPrimeiroUltimoNome(t.nome)}</option>`; });

    div.innerHTML = `
        <select class="form-select form-select-sm sel-equipe-dupla border-primary fw-bold" style="width: 100px;">
            <option value="MANUTENCAO" ${equipe === 'MANUTENCAO' ? 'selected' : ''}>Manut</option>
            <option value="INSTALACAO" ${equipe === 'INSTALACAO' ? 'selected' : ''}>Instal</option>
            <option value="RECOLHIMENTO" ${equipe === 'RECOLHIMENTO' ? 'selected' : ''}>Recolh</option>
        </select>
        <select class="form-select form-select-sm sel-regiao border-secondary" style="width: 100px;">${montarOptionsEscala(OPCOES_REGIAO_ESCALA, regiaoSelecionada)}</select>
        <select class="form-select form-select-sm sel-turno border-secondary" style="width: 90px;">${montarOptionsEscala(OPCOES_TURNO_ESCALA, turnoSelecionado)}</select>
        <select class="form-select form-select-sm sel-imovel border-secondary" style="width: 90px;">${montarOptionsEscala(OPCOES_IMOVEL_ESCALA, imovelSelecionado)}</select>
        <select class="form-select form-select-sm sel-tec1-dupla flex-grow-1">${options}</select>
        <select class="form-select form-select-sm sel-tec2-dupla flex-grow-1">${options}</select>
        <button type="button" class="btn btn-sm btn-outline-danger btn-rm-dupla"><i class="bi bi-trash"></i></button>
    `;
    div.querySelector('.sel-tec1-dupla').value = tec1;
    div.querySelector('.sel-tec2-dupla').value = tec2;
    div.querySelector('.btn-rm-dupla').addEventListener('click', () => div.remove());
    document.getElementById('container-duplas').appendChild(div);
}

function getValoresCapacidade() {
    const valores = CAMPOS_CAPACIDADE_LOGISTICA.reduce((acc, campo) => {
        acc[campo] = document.getElementById('cap-' + campo.replace(/_/g, '-'))?.value || 0;
        return acc;
    }, {});
    valores.inst_serra_m = Number(valores.inst_casa_serra_m || 0) + Number(valores.inst_predio_serra_m || 0);
    valores.inst_serra_t = Number(valores.inst_casa_serra_t || 0) + Number(valores.inst_predio_serra_t || 0);
    valores.inst_outros_m = Number(valores.inst_casa_outros_m || 0) + Number(valores.inst_predio_outros_m || 0);
    valores.inst_outros_t = Number(valores.inst_casa_outros_t || 0) + Number(valores.inst_predio_outros_t || 0);
    return valores;
}

async function salvarNovoTemplate() {
    const nomeTemplate = await showPromptModal("Digite o nome para este novo modelo de capacidade:");
    if (!nomeTemplate) return;

    try {
        await fetch('/api/v5/painel-logistica/capacidade-templates/salvar', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nomeTemplate, capacidades: getValoresCapacidade() })
        });
        showInfoModal("Novo modelo salvo com sucesso!");
        abrirModalConfiguracoes();
    } catch (e) { showInfoModal("Erro ao salvar template."); }
}

async function editarTemplateCapacidade() {
    const selectTemp = document.getElementById('select-template-capacidade');
    const template = window.templatesCapacidade?.find(x => String(x.id) === selectTemp.value);
    if (!template) return showInfoModal('Selecione um modelo para editar.');

    const nome = await showPromptModal('Nome do modelo:', template.nome);
    if (!nome) return;

    try {
        const response = await fetch(`/api/v5/painel-logistica/capacidade-templates/${template.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, capacidades: getValoresCapacidade() })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao editar modelo.');
        showInfoModal('Modelo atualizado com sucesso.');
        abrirModalConfiguracoes();
    } catch (e) {
        showInfoModal('Erro ao editar modelo: ' + e.message);
    }
}

async function excluirTemplateCapacidade() {
    const selectTemp = document.getElementById('select-template-capacidade');
    const template = window.templatesCapacidade?.find(x => String(x.id) === selectTemp.value);
    if (!template) return showInfoModal('Selecione um modelo para excluir.');
    if (!(await showConfirmModal(`Excluir o modelo "${template.nome}"?`))) return;

    try {
        const response = await fetch(`/api/v5/painel-logistica/capacidade-templates/${template.id}`, {
            method: 'DELETE'
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao excluir modelo.');
        showInfoModal('Modelo excluído.');
        abrirModalConfiguracoes();
    } catch (e) {
        showInfoModal('Erro ao excluir modelo: ' + e.message);
    }
}

async function carregarTagsConfiguracao() {
    const tbody = document.getElementById('tbody-tags-logistica');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Carregando tags...</td></tr>';

    try {
        const response = await fetch('/api/v5/painel-logistica/tags');
        const tags = await response.json();
        tagsLogisticaGlobal = Array.isArray(tags) ? tags : [];

        if (tagsLogisticaGlobal.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhuma tag cadastrada.</td></tr>';
            return;
        }

        tbody.innerHTML = tagsLogisticaGlobal.map(tag => `
            <tr>
                <td class="fw-bold">${tag.nome}</td>
                <td><span class="badge" style="background:${tag.cor_fundo};color:${tag.cor_texto};">${tag.nome}</span></td>
                <td>${Number(tag.ativo) === 1 ? '<span class="badge bg-success">Ativa</span>' : '<span class="badge bg-secondary">Inativa</span>'}</td>
                <td>${tag.ordem || 0}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-action="editar-tag" data-tag-id="${tag.id}"><i class="bi bi-pencil"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" data-action="excluir-tag" data-tag-id="${tag.id}"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar tags.</td></tr>';
    }
}

function limparFormTagLogistica() {
    document.getElementById('tag-logistica-id').value = '';
    document.getElementById('tag-logistica-nome').value = '';
    document.getElementById('tag-logistica-cor-fundo').value = '#0d6efd';
    document.getElementById('tag-logistica-cor-texto').value = '#ffffff';
    document.getElementById('tag-logistica-ordem').value = '0';
    document.getElementById('tag-logistica-ativo').checked = true;
    const btnSalvar = document.getElementById('btn-salvar-tag-logistica');
    if (btnSalvar) btnSalvar.textContent = 'Criar nova Tag';
}

async function salvarTagLogistica() {
    const id = document.getElementById('tag-logistica-id').value;
    const payload = {
        nome: document.getElementById('tag-logistica-nome').value,
        cor_fundo: document.getElementById('tag-logistica-cor-fundo').value,
        cor_texto: document.getElementById('tag-logistica-cor-texto').value,
        ordem: Number(document.getElementById('tag-logistica-ordem').value || 0),
        ativo: document.getElementById('tag-logistica-ativo').checked ? 1 : 0
    };

    if (!payload.nome.trim()) return showInfoModal('Informe o nome da tag.');

    try {
        const response = await fetch(id ? `/api/v5/painel-logistica/tags/${id}` : '/api/v5/painel-logistica/tags', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao salvar tag.');
        tagsLogisticaGlobal = [];
        limparFormTagLogistica();
        carregarTagsConfiguracao();
    } catch (error) {
        showInfoModal('Erro ao salvar tag: ' + error.message);
    }
}

function tratarCliqueTabelaTags(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const tagId = btn.dataset.tagId;

    if (action === 'editar-tag') {
        editarTagLogistica(tagId);
    }

    if (action === 'excluir-tag') {
        excluirTagLogistica(tagId);
    }
}

function editarTagLogistica(id) {
    const tag = tagsLogisticaGlobal.find(item => String(item.id) === String(id));
    if (!tag) return;
    document.getElementById('tag-logistica-id').value = tag.id;
    document.getElementById('tag-logistica-nome').value = tag.nome || '';
    document.getElementById('tag-logistica-cor-fundo').value = tag.cor_fundo || '#0d6efd';
    document.getElementById('tag-logistica-cor-texto').value = tag.cor_texto || '#ffffff';
    document.getElementById('tag-logistica-ordem').value = tag.ordem || 0;
    document.getElementById('tag-logistica-ativo').checked = Number(tag.ativo) === 1;
    const btnSalvar = document.getElementById('btn-salvar-tag-logistica');
    if (btnSalvar) btnSalvar.textContent = 'Salvar Tag';
}

async function excluirTagLogistica(id) {
    if (!(await showConfirmModal('Deseja realmente excluir esta tag?', 'Excluir tag', 'warning', 'Excluir', 'Cancelar'))) return;
    try {
        const response = await fetch(`/api/v5/painel-logistica/tags/${id}`, { method: 'DELETE' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao excluir tag.');
        const idEditando = document.getElementById('tag-logistica-id')?.value;
        if (String(idEditando || '') === String(id)) limparFormTagLogistica();
        tagsLogisticaGlobal = [];
        carregarTagsConfiguracao();
    } catch (error) {
        showInfoModal('Erro ao excluir tag: ' + error.message);
    }
}

async function salvarConfiguracoes() {
    const data = document.getElementById('filtro-data').value;
    const tecnicosArr = [];
    const idsUsados = new Set(); 

    document.querySelectorAll('.dupla-row').forEach((row, index) => {
        const t1 = row.querySelector('.sel-tec1-dupla').value;
        const t2 = row.querySelector('.sel-tec2-dupla').value;
        const baseObj = {
            equipe: row.querySelector('.sel-equipe-dupla').value,
            regiao: normalizarRegiaoEscala(row.querySelector('.sel-regiao').value),
            turno: normalizarTurnoEscala(row.querySelector('.sel-turno').value),
            tipo_imovel: normalizarImovelEscala(row.querySelector('.sel-imovel').value),
            dupla_id: `D_DYN_${index + 1}`
        };
        
        if (t1) { tecnicosArr.push({ id: t1, ...baseObj }); idsUsados.add(t1); }
        if (t2 && t2 !== t1) { tecnicosArr.push({ id: t2, ...baseObj }); idsUsados.add(t2); }
    });

    document.querySelectorAll('.chk-escala:checked').forEach(chk => {
        const id = chk.value;
        if (!idsUsados.has(id)) {
            tecnicosArr.push({
                id,
                equipe: document.getElementById(`equipe-${id}`).value,
                regiao: normalizarRegiaoEscala(document.getElementById(`regiao-${id}`).value),
                turno: normalizarTurnoEscala(document.getElementById(`turno-${id}`).value),
                tipo_imovel: normalizarImovelEscala(document.getElementById(`imovel-${id}`).value),
                dupla_id: null
            });
        }
    });

    const btn = document.getElementById('btn-salvar-config');
    btn.innerHTML = 'Salvando...'; btn.disabled = true;

    try {
        await fetch('/api/v5/painel-logistica/salvar-configuracoes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: data, tecnicos: tecnicosArr, capacidades: getValoresCapacidade() })
        });
        hideModalNativo('modalConfiguracoes');
        carregarAgenda();
    } catch (e) { showInfoModal("Erro ao salvar."); } 
    finally { btn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Salvar Tudo'; btn.disabled = false; }
}

async function abrirModalDetalhes(os) {
    window.osModalAtual = os;
    document.getElementById('action-os-id').value = os.ixc_os_id;
    document.getElementById('action-agenda-local-id').value = os.id; 
    document.getElementById('action-nova-data').value = document.getElementById('filtro-data').value;
    renderizarCalendarioReagendamento(document.getElementById('filtro-data').value);
    document.querySelectorAll('input[name="reagendamento-duvida"]').forEach(input => { input.checked = false; });
    const prefReag = document.getElementById('reag-preferencia-obs');
    if (prefReag) prefReag.value = os.preferencia_horario_obs || '';
    atualizarInfoCapacidadeReagendamento();
    
    document.getElementById('detalhe-os-titulo').textContent = `OS #${os.ixc_os_id} - ${os.turno} (${os.tipo_imovel})`;

    const areaAcoes = document.getElementById('area-acoes-os');
    if (areaAcoes) areaAcoes.style.display = 'block';
    const osVindaDaFila = String(os.id || '').startsWith('fila-') || os.origem === 'FILA_LOGISTICA';
    const podeAcoesSensiveisModal = usuarioEhLogisticaOuNoc();
    document.getElementById('secao-confirmacao-cliente')?.classList.toggle('d-none', osVindaDaFila || !podeAcoesSensiveisModal);
    document.getElementById('secao-espera-cliente')?.classList.toggle('d-none', osVindaDaFila || !podeAcoesSensiveisModal);
    document.getElementById('secao-prioridade-logistica')?.classList.toggle('d-none', osVindaDaFila || !podeAcoesSensiveisModal);
    document.getElementById('secao-tags-os')?.classList.toggle('d-none', osVindaDaFila);
    document.getElementById('secao-acoes-visita')?.classList.remove('d-none');
    document.getElementById('btn-action-fechar')?.classList.toggle('d-none', !podeAcoesSensiveisModal);
    document.getElementById('btn-cancelar-visita')?.classList.toggle('d-none', osVindaDaFila);
    document.getElementById('btn-abrir-reagendamento-visita')?.classList.remove('d-none');

    document.getElementById('loading-detalhes-os').style.display = 'flex';
    document.getElementById('conteudo-detalhes-os').style.display = 'none';

    showModalNativo('modalDetalhesOS');

    try {
        const response = await fetch(`/api/v5/painel-logistica/os-detalhes/${os.ixc_os_id}`);
        const data = await response.json();
        const osDetalhe = data.os || {};
        const localDetalhe = data.local || {};
        const municipioDetalhe = localDetalhe.municipio_base || os.municipio_base || os.cidade_real || data.cliente?.cidade || osDetalhe.cidade || osDetalhe.bairro || '';
        window.osModalAtual = {
            ...window.osModalAtual,
            tipo_servico: localDetalhe.tipo_servico || os.tipo_servico || osDetalhe.tipo_servico || osDetalhe.assunto || osDetalhe.setor || '',
            municipio_base: municipioDetalhe,
            cidade_real: municipioDetalhe,
            tipo_imovel: localDetalhe.tipo_imovel || os.tipo_imovel || window.osModalAtual?.tipo_imovel || ''
        };

        document.getElementById('det-cliente-nome').textContent = data.cliente.razao || data.cliente.nome || 'Cliente não encontrado';
        document.getElementById('det-cliente-fone').textContent = montarContatosClienteLogistica(data.cliente);
        const planoContratoId = data.contrato.id_plano_local || data.contrato.id_vd_contrato || data.contrato.id_plano || data.contrato.plano_id || data.contrato.plano || '';
        const planoContratoNome = data.contrato.nome_plano_local || data.contrato.nome_plano || '';
        const planoContratoLabel = planoContratoNome || (planoContratoId ? `Plano não localizado (${planoContratoId})` : '');
        const contratoLabel = [
            data.contrato.id ? `Contrato #${data.contrato.id}` : (data.contrato.contrato || 'Sem contrato'),
            `Status: ${traduzirStatusContratoLogistica(data.contrato.status)}`,
            `Acesso: ${traduzirStatusAcessoLogistica(data.contrato.status_internet || data.contrato.status_acesso)}`,
            `Bloqueio automático: ${simNaoLogistica(data.contrato.bloqueio_automatico)}`,
            planoContratoLabel ? `Plano: ${planoContratoLabel}` : ''
        ].filter(Boolean).join(' | ');
        document.getElementById('det-contrato').textContent = contratoLabel;
        
        if (data.login && data.login.login) {
            document.getElementById('det-login').textContent = `PPPOE: ${data.login.login}`;
            document.getElementById('btn-ver-onu').style.display = 'inline-block';
            document.getElementById('btn-relatorio-conexao')?.classList.remove('d-none');
            window.loginAtualData = data.login; window.onuAtualData = data.onu;
        } else {
            document.getElementById('det-login').textContent = 'Sem login PPPoE';
            document.getElementById('btn-ver-onu').style.display = 'none';
            document.getElementById('btn-relatorio-conexao')?.classList.add('d-none');
            window.loginAtualData = null; window.onuAtualData = null;
        }

        preencherResumoAcesso(data.resumoAcesso || {});
        renderizarHistoricoMensagens(data.mensagens || []);
        const prefBox = document.getElementById('det-preferencia-horario');
        const preferenciaTexto = formatarPreferenciaHorario({ ...os, ...(data.local || {}) });
        if (prefBox) {
            prefBox.textContent = preferenciaTexto ? `Preferência de horário: ${preferenciaTexto}` : '';
            prefBox.classList.toggle('d-none', !preferenciaTexto);
        }
        const statusContato = data.local?.contato_status || os.contato_status || 'PENDENTE';
        const elStatusContato = document.getElementById('status-contato-atual');
        if (elStatusContato) elStatusContato.textContent = `Status: ${formatarStatusContato(statusContato)}`;
        const obs = document.getElementById('input-observacao-logistica');
        if (obs) obs.value = '';
        const prioridade = document.getElementById('input-prioridade-logistica');
        if (prioridade) prioridade.value = os.prioridade_logistica || data.local?.prioridade_logistica || 0;
        await carregarTagsParaModalOs(os, data.local || {});

        const osData = data.os;
        document.getElementById('det-endereco').textContent = `${osData.endereco || ''}, ${osData.numero || 'S/N'} - ${osData.bairro || ''}`;
        document.getElementById('det-sintoma').innerHTML = (osData.mensagem || os.sintoma_relatado || 'Sem descrição').replace(/\n/g, "<br>");

        document.getElementById('loading-detalhes-os').style.display = 'none';
        document.getElementById('conteudo-detalhes-os').style.display = 'flex';

        if (os.is_futuro_prioridade) {
            document.getElementById('data-prioridade-original').textContent = String(os.data_agendamento_original).split('T')[0].split('-').reverse().join('/');
            document.getElementById('alerta-prioridade-futura').classList.remove('d-none');
            window.osPrioridadeAtual = os;
        } else {
            document.getElementById('alerta-prioridade-futura').classList.add('d-none');
        }

        window.osAtualParaFechar = { 
            ixc_os_id: os.ixc_os_id, 
            id_processo: osData.id_wfl_param_os || osData.id_wfl_processo || osData.id_processo || '0', 
            id_tarefa_atual: osData.id_wfl_tarefa || osData.id_tarefa_atual || osData.id_tarefa || '0', 
            id_tecnico: osData.id_tecnico 
        };
    } catch (e) { hideModalNativo('modalDetalhesOS'); }
}

function formatarStatusContato(status) {
    const s = String(status || 'PENDENTE').toUpperCase();
    if (s === 'CONFIRMADO') return 'cliente confirmou';
    if (s === 'NAO_RECEBE') return 'cliente não irá receber / reagendado';
    if (s === 'SEM_CONTATO') return 'sem contato';
    return 'pendente';
}

function preencherResumoAcesso(resumo) {
    const status = resumo.status || 'Sem login';
    const statusEl = document.getElementById('resumo-status-acesso');
    if (statusEl) {
        statusEl.textContent = status;
        statusEl.className = status === 'Online' ? 'badge bg-success' : (status === 'Offline' ? 'badge bg-danger' : 'badge bg-secondary');
    }
    const qHoje = document.getElementById('resumo-quedas-hoje');
    const q7 = document.getElementById('resumo-quedas-7d');
    const sinais = document.getElementById('resumo-sinais-onu');
    if (qHoje) qHoje.textContent = resumo.quedas_hoje ?? 0;
    if (q7) q7.textContent = resumo.quedas_7_dias ?? 0;
    if (sinais) sinais.textContent = `${resumo.rx || 'N/A'} / ${resumo.tx || 'N/A'}`;
}

function renderizarHistoricoMensagens(mensagens) {
    const container = document.getElementById('historico-mensagens-os');
    if (!container) return;
    if (!mensagens || mensagens.length === 0) {
        container.innerHTML = '<p class="text-muted mb-0">Nenhuma mensagem encontrada no IXC.</p>';
        return;
    }
    container.innerHTML = mensagens.map(m => {
        const dataMsg = formatarDataHoraMensagem(m.data || m.data_inicio || m.created_at || '');
        const autor = m.autor_nome || m.nome_tecnico || m.tecnico || m.usuario || 'Sistema/IXC';
        const texto = String(m.mensagem || m.resposta || m.descricao || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        return `<div class="border-bottom pb-2 mb-2"><div class="fw-bold text-primary small">${dataMsg} - ${autor}</div><div>${texto || 'Sem conteúdo'}</div></div>`;
    }).join('');
}

function formatarDataHoraMensagem(valor) {
    if (!valor) return '--/--/---- --:--';
    const str = String(valor).replace('T', ' ').substring(0, 16);
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
    const data = new Date(valor);
    if (!isNaN(data)) {
        return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return str;
}

async function carregarTagsBase() {
    if (tagsLogisticaGlobal.length > 0) return tagsLogisticaGlobal;
    const res = await fetch('/api/v5/painel-logistica/tags');
    const tags = await res.json();
    tagsLogisticaGlobal = Array.isArray(tags) ? tags : [];
    return tagsLogisticaGlobal;
}

async function carregarTagsParaModalOs(os) {
    const container = document.getElementById('lista-tags-os');
    if (!container) return;
    if (!os.id || String(os.id).startsWith('fila-')) {
        container.innerHTML = '<span class="text-muted small">Tags disponíveis apenas para OS agendada.</span>';
        return;
    }

    const tags = (await carregarTagsBase()).filter(tag => Number(tag.ativo) === 1);
    const selecionadas = new Set((os.tags || []).map(tag => String(tag.id)));
    if (tags.length === 0) {
        container.innerHTML = '<span class="text-muted small">Nenhuma tag ativa configurada.</span>';
        return;
    }

    container.innerHTML = tags.map(tag => `
        <label class="form-check-label border rounded-pill px-2 py-1 bg-white small" style="cursor:pointer;">
            <input class="form-check-input me-1 chk-tag-os" type="checkbox" value="${tag.id}" ${selecionadas.has(String(tag.id)) ? 'checked' : ''}>
            <span style="background:${tag.cor_fundo || '#0d6efd'};color:${tag.cor_texto || '#fff'};" class="badge">${tag.nome}</span>
        </label>
    `).join('');
}

async function salvarTagsOsAtual() {
    const os = window.osModalAtual;
    if (!os || !os.id || String(os.id).startsWith('fila-')) return showInfoModal('Tags disponíveis apenas para OS agendada.');
    const tagIds = Array.from(document.querySelectorAll('.chk-tag-os:checked')).map(chk => chk.value);

    try {
        const response = await fetch(`/api/v5/painel-logistica/os-tags/${os.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag_ids: tagIds })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao salvar tags.');

        const tagsSelecionadas = tagsLogisticaGlobal.filter(tag => tagIds.includes(String(tag.id)));
        atualizarOsLocal(os.id, { tags: tagsSelecionadas });
        atualizarCardAberto(os.id);
    } catch (error) {
        showInfoModal('Erro ao salvar tags: ' + error.message);
    }
}

async function salvarPrioridadeLogistica() {
    const os = window.osModalAtual;
    if (!os || !os.id || String(os.id).startsWith('fila-')) return showInfoModal('Prioridade disponível apenas para OS agendada.');
    const prioridade = Number(document.getElementById('input-prioridade-logistica')?.value || 0);

    try {
        const response = await fetch('/api/v5/painel-logistica/prioridade-logistica', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_local: os.id,
                ixc_os_id: os.ixc_os_id,
                prioridade,
                usuario_logado: window.usuarioLogado
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao salvar prioridade.');
        atualizarOsLocal(os.id, { prioridade_logistica: prioridade, prioridade_logistica_obs: '' });
        atualizarCardAberto(os.id);
    } catch (error) {
        showInfoModal('Erro ao salvar prioridade: ' + error.message);
    }
}

async function verHistoricoPppoe(username) {
    const tbody = document.getElementById('tbody-historico-pppoe');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><span class="spinner-border spinner-border-sm me-2"></span>Buscando relatório no IXC...</td></tr>';

    showModalNativo('modalHistoricoPPPOE');

    try {
        const res = await fetch(`/api/v5/painel-logistica/historico-conexao/${encodeURIComponent(username)}`);
        const history = await res.json();

        if (!Array.isArray(history) || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum registro de conexão encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = history.map(h => {
            const up = h.acctinputoctets ? formatBytes(h.acctinputoctets) : '0 B';
            const down = h.acctoutputoctets ? formatBytes(h.acctoutputoctets) : '0 B';
            return `<tr>
                <td class="fw-bold">${h.framedipaddress || 'N/A'}</td>
                <td>${h.callingstationid || 'N/A'}</td>
                <td>${h.acctstarttime || 'N/A'}</td>
                <td>${h.acctstoptime || '<span class="text-success fw-bold">Sessão Ativa</span>'}</td>
                <td>${formatarTempoSessao(h.acctsessiontime)}</td>
                <td><i class="bi bi-arrow-up-short text-primary"></i> ${up}<br><i class="bi bi-arrow-down-short text-success"></i> ${down}</td>
                <td class="${h.acctterminatecause ? 'text-danger' : ''}">${traduzirMotivoOnu(h.acctterminatecause)}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar histórico.</td></tr>';
    }
}

function formatBytes(bytes) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatarTempoSessao(segundos) {
    if (!segundos || segundos == 0) return '0s';
    const d = Math.floor(segundos / 86400);
    const h = Math.floor((segundos % 86400) / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const res = [];
    if (d > 0) res.push(`${d}d`);
    if (h > 0) res.push(`${h}h`);
    if (m > 0) res.push(`${m}m`);
    return res.join(' ') || `${segundos}s`;
}

async function registrarContatoCliente(status) {
    const ixc_os_id = document.getElementById('action-os-id').value;
    const id_local = document.getElementById('action-agenda-local-id').value;
    const nova_data = '';
    const novo_turno = '';

    if (status === 'NAO_RECEBE') {
        return showInfoModal('Use Reagendar Visita para alterar a data da visita.', 'Ação removida', 'warning');
    }

    const confirma = status === 'CONFIRMADO'
        ? 'Confirmar que o cliente irá receber o técnico?'
        : 'Registrar que a logística não conseguiu contato com o cliente?';
    if (!(await showConfirmModal(confirma))) return;

    try {
        const response = await fetch('/api/v5/painel-logistica/contato-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_local, ixc_os_id, status_contato: status, nova_data, novo_turno, usuario_logado: window.usuarioLogado })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao registrar contato.');
        atualizarStatusContatoNaUi(id_local, status);
        if (data.registrado_ixc === false) {
            showInfoModal(data.aviso || 'Confirmação salva localmente. O IXC recusou o registro da mensagem.', 'Confirmação com Cliente', 'warning');
        }
        setTimeout(() => carregarAgenda(), 250);
    } catch (e) {
        showInfoModal('Erro ao registrar contato: ' + e.message);
    }
}

async function iniciarEsperaCliente() {
    const id_local = document.getElementById('action-agenda-local-id').value;
    const minutos = document.getElementById('input-minutos-espera').value;
    if (!minutos || Number(minutos) <= 0) return showInfoModal('Informe por quantos minutos o técnico deve aguardar.');

    try {
        const response = await fetch('/api/v5/painel-logistica/aguardar-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_local, minutos, usuario_logado: window.usuarioLogado })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao iniciar espera.');
        atualizarEsperaNaUi(id_local, data.espera_cliente_ate);
        setTimeout(() => autoRefreshSilencioso(), 250);
    } catch (e) {
        showInfoModal('Erro ao iniciar espera: ' + e.message);
    }
}

async function pararEsperaCliente() {
    const id_local = document.getElementById('action-agenda-local-id').value;
    if (!id_local || String(id_local).startsWith('fila-')) return;

    try {
        const response = await fetch('/api/v5/painel-logistica/parar-espera-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_local, usuario_logado: window.usuarioLogado })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao parar espera.');
        atualizarEsperaNaUi(id_local, null);
    } catch (e) {
        showInfoModal('Erro ao parar espera: ' + e.message);
    }
}

async function salvarObservacaoLogistica() {
    const ixc_os_id = document.getElementById('action-os-id').value;
    const id_local = document.getElementById('action-agenda-local-id').value;
    const mensagem = document.getElementById('input-observacao-logistica').value;
    if (!mensagem || !mensagem.trim()) return showInfoModal('Digite a observação.');

    try {
        const response = await fetch('/api/v5/painel-logistica/observacao-logistica', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_local, ixc_os_id, mensagem, usuario_logado: window.usuarioLogado })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao salvar observação.');
        document.getElementById('input-observacao-logistica').value = '';
        showInfoModal(data.registrado_ixc ? 'Observação registrada no IXC.' : (data.aviso || 'Observação salva localmente.'), 'Observação', data.registrado_ixc ? 'success' : 'warning');
        // Recarrega os detalhes para puxar o histórico atualizado.
        const responseDet = await fetch(`/api/v5/painel-logistica/os-detalhes/${ixc_os_id}`);
        const det = await responseDet.json();
        renderizarHistoricoMensagens(det.mensagens || []);
    } catch (e) {
        showInfoModal('Erro ao salvar observação: ' + e.message);
    }
}

function abrirModalONU() {
    const login = window.loginAtualData;
    const onu = window.onuAtualData;

    if (!login) return;

    document.getElementById('det-onu-login').textContent = login.login || 'N/A';
    document.getElementById('det-onu-senha').textContent = login.senha || 'N/A';
    document.getElementById('det-onu-mac-login').textContent = login.mac || 'N/A';
    document.getElementById('det-onu-ip').textContent = login.ip || 'N/A';

    const hAtual = login.historico_atual;
    const hQueda = login.historico_queda;

    if (hAtual) {
        if (!hAtual.acctstoptime) {
            document.getElementById('det-onu-queda-data').innerHTML = '<span class="text-success fw-bold"><i class="bi bi-circle-fill small me-1"></i>Cliente Online no Momento</span>';
            
            const inicio = new Date(hAtual.acctstarttime);
            const diffMins = Math.floor((new Date() - inicio) / 60000);
            const horas = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            document.getElementById('det-onu-uptime').innerHTML = `<span class="fw-bold">${horas}h ${mins}m ativo</span>`;
        } else {
            document.getElementById('det-onu-queda-data').textContent = hAtual.acctstoptime;
            document.getElementById('det-onu-uptime').textContent = 'Sessão Encerrada';
        }

        document.getElementById('det-onu-queda-motivo').textContent = hQueda ? traduzirMotivoOnu(hQueda.acctterminatecause) : 'Sem quedas registradas';
    } else {
        document.getElementById('det-onu-queda-data').textContent = 'Sem registros';
        document.getElementById('det-onu-queda-motivo').textContent = '---';
        document.getElementById('det-onu-uptime').textContent = '---';
    }

    if (onu) {
        document.getElementById('det-onu-nao-encontrada').style.display = 'none';
        document.getElementById('det-onu-dados').style.display = 'block';
        
        atualizarLayoutOnu(onu);

        document.getElementById('loading-sinal-olt').style.display = 'inline-block';
        fetch('/api/v5/painel-logistica/onu-realtime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_fibra: onu.id })
        })
        .then(res => res.json())
        .then(onuLive => {
            document.getElementById('loading-sinal-olt').style.display = 'none';
            if(onuLive) atualizarLayoutOnu(onuLive);
        }).catch(e => {
            console.error("Falha ao atualizar ONU", e);
            document.getElementById('loading-sinal-olt').style.display = 'none';
        });
        
    } else {
        document.getElementById('det-onu-nao-encontrada').style.display = 'block';
        document.getElementById('det-onu-dados').style.display = 'none';
        document.getElementById('loading-sinal-olt').style.display = 'none';
    }

    showModalNativo('modalDetalhesONU');
}

function renderizarCalendarioReagendamento(dataBase) {
    const container = document.getElementById('calendario-reagendamento');
    if (!container) return;
    const base = dataBase ? new Date(`${dataBase}T00:00:00`) : new Date();
    if (Number.isNaN(base.getTime())) return;

    const inicio = new Date(base);
    const selecionada = document.getElementById('action-nova-data')?.value || '';
    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        const ymd = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        dias.push(`<button type="button" class="btn btn-sm ${ymd === selecionada ? 'btn-primary' : 'btn-outline-primary'}" data-action="selecionar-data-reag" data-date="${ymd}">${label}</button>`);
    }
    container.innerHTML = dias.join('');
}

function tratarCliqueCalendarioReagendamento(e) {
    const btn = e.target.closest('[data-action="selecionar-data-reag"]');
    if (!btn) return;
    const input = document.getElementById('action-nova-data');
    if (input) input.value = btn.dataset.date;
    renderizarCalendarioReagendamento(btn.dataset.date);
    atualizarInfoCapacidadeReagendamento();
}

function obterParametrosCapacidadeReagendamento() {
    const os = window.osModalAtual || {};
    return {
        data: document.getElementById('action-nova-data')?.value || '',
        turno: document.getElementById('action-novo-turno')?.value || 'MATUTINO',
        municipio: os.municipio_base || os.cidade_real || os.municipio || os.cidade || '',
        tipo_servico: os.tipo_servico || os.assunto || '',
        tipo_imovel: os.tipo_imovel || ''
    };
}

function renderizarInfoCapacidadeReagendamento(info, estado = 'ok') {
    const box = document.getElementById('info-capacidade-reagendamento');
    if (!box) return;

    if (!info) {
        box.className = 'small rounded border bg-white p-2 mb-3 text-muted d-none';
        box.textContent = '';
        return;
    }

    const classes = estado === 'lotado'
        ? 'small rounded border border-danger bg-white p-2 mb-3 text-danger'
        : estado === 'erro'
            ? 'small rounded border bg-white p-2 mb-3 text-muted'
            : 'small rounded border border-success bg-white p-2 mb-3 text-success';
    box.className = classes;
    box.textContent = info;
}

async function atualizarInfoCapacidadeReagendamento() {
    const params = obterParametrosCapacidadeReagendamento();
    window.capacidadeReagendamentoAtual = null;

    if (!params.data) {
        renderizarInfoCapacidadeReagendamento(null);
        return;
    }

    renderizarInfoCapacidadeReagendamento('Consultando capacidade do turno...', 'erro');

    try {
        const query = new URLSearchParams({
            data_inicio: params.data,
            data_fim: params.data,
            municipio: params.municipio,
            tipo_servico: params.tipo_servico,
            tipo_imovel: params.tipo_imovel
        });
        const response = await fetch(`/api/v5/agendamento/vagas-semana?${query.toString()}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Nao foi possivel consultar a capacidade.');

        const chaveTurno = params.turno === 'VESPERTINO' ? 'vespertino' : 'matutino';
        const capacidade = data?.[params.data]?.[chaveTurno];
        if (!capacidade) {
            renderizarInfoCapacidadeReagendamento('Capacidade nao encontrada para este turno.', 'erro');
            return;
        }

        window.capacidadeReagendamentoAtual = {
            data: params.data,
            turno: params.turno,
            vagas: Number(capacidade.vagas || 0),
            disponivel: Boolean(capacidade.disponivel),
            msg: capacidade.msg || ''
        };

        const labelTurno = params.turno === 'VESPERTINO' ? 'Vespertino' : 'Matutino';
        const texto = `${labelTurno}: ${window.capacidadeReagendamentoAtual.vagas} vaga(s) disponiveis${capacidade.msg ? ` - ${capacidade.msg}` : ''}.`;
        renderizarInfoCapacidadeReagendamento(texto, window.capacidadeReagendamentoAtual.disponivel ? 'ok' : 'lotado');
    } catch (e) {
        console.warn('[Painel Logistica] Falha ao consultar capacidade de reagendamento:', e.message);
        renderizarInfoCapacidadeReagendamento('Nao foi possivel consultar a capacidade agora.', 'erro');
    }
}

function abrirModalReagendamentoVisita() {
    if (!window.osModalAtual) return showInfoModal('Abra uma OS antes de reagendar.', 'OS não selecionada', 'warning');
    document.querySelectorAll('input[name="reagendamento-duvida"]').forEach(input => { input.checked = false; });
    const dataFiltro = document.getElementById('filtro-data')?.value || new Date().toISOString().split('T')[0];
    const inputData = document.getElementById('action-nova-data');
    if (inputData && !inputData.value) inputData.value = dataFiltro;
    renderizarCalendarioReagendamento(inputData?.value || dataFiltro);
    atualizarInfoCapacidadeReagendamento();
    showModalNativo('modalReagendarVisita');
}

async function enviarReagendamento() {
    const ixc_os_id = document.getElementById('action-os-id').value;
    const id_agenda_local = document.getElementById('action-agenda-local-id').value;
    const nova_data = document.getElementById('action-nova-data').value;
    const novo_turno = document.getElementById('action-novo-turno').value;
    const escolhaDuvida = document.querySelector('input[name="reagendamento-duvida"]:checked')?.value;
    const preferenciaObs = document.getElementById('reag-preferencia-obs')?.value.trim() || '';

    if (!nova_data) return showInfoModal("Selecione a nova data!");
    if (!escolhaDuvida) return showInfoModal('Escolha se deseja abrir chamado de dúvida ou apenas reagendar.', 'Escolha obrigatória', 'warning');
    if (!window.capacidadeReagendamentoAtual || window.capacidadeReagendamentoAtual.data !== nova_data || window.capacidadeReagendamentoAtual.turno !== novo_turno) {
        await atualizarInfoCapacidadeReagendamento();
    }
    if (window.capacidadeReagendamentoAtual && !window.capacidadeReagendamentoAtual.disponivel) {
        const podeForcarLotado = usuarioEhLogisticaOuNoc();
        if (!podeForcarLotado) return showInfoModal('Este turno está sem vagas disponíveis. Apenas Logística/NOC pode confirmar mesmo assim.', 'Turno lotado', 'warning');
        const confirmarSemVaga = await showConfirmModal('Este turno está sem vagas disponíveis. Deseja reagendar mesmo assim?', 'Turno lotado', 'warning', 'Reagendar mesmo assim', 'Voltar');
        if (!confirmarSemVaga) return;
    }

    const btn = document.getElementById('btn-action-reagendar');
    btn.innerHTML = 'Reagendando...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/v5/painel-logistica/reagendar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ixc_os_id,
                id_agenda_local,
                nova_data,
                novo_turno,
                usuario_logado: window.usuarioLogado,
                abrir_chamado_duvida: escolhaDuvida === 'SIM',
                modo_reagendamento: escolhaDuvida === 'SIM' ? 'COM_CHAMADO_DUVIDA' : 'APENAS_REAGENDAR',
                preferencia_horario_obs: preferenciaObs,
                preferencia_horario_tipo: preferenciaObs ? 'OBSERVACAO' : 'SEM_PREFERENCIA'
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || data.message || 'Erro ao reagendar.');
        
        removerOsFilaAtualDaUi();
        hideModalNativo('modalReagendarVisita');
        hideModalNativo('modalDetalhesOS');
        carregarAgenda(); 
        carregarFilaLogistica();
    } catch (e) {
        showInfoModal("Erro ao reagendar: " + e.message);
    } finally {
        btn.innerHTML = 'Reagendar Visita';
        btn.disabled = false;
    }
}

function abrirModalCancelarVisita() {
    document.getElementById('cancelar-visita-motivo').value = '';
    showModalNativo('modalCancelarVisita');
}

async function confirmarCancelarVisita() {
    const motivo = document.getElementById('cancelar-visita-motivo')?.value.trim() || '';
    const os = window.osModalAtual || {};
    if (!motivo) return showInfoModal('Informe o motivo do cancelamento da visita.', 'Motivo obrigatório', 'warning');

    const btn = document.getElementById('btn-confirmar-cancelar-visita');
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Cancelando...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/v5/painel-logistica/cancelar-visita', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_local: os.id,
                ixc_os_id: os.ixc_os_id,
                motivo,
                usuario_logado: window.usuarioLogado
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Erro ao cancelar visita.');

        hideModalNativo('modalCancelarVisita');
        hideModalNativo('modalDetalhesOS');
        removerOsFilaAtualDaUi();
        todosAgendamentosGlobais = todosAgendamentosGlobais.filter(item => String(item.id) !== String(os.id));
        renderizarQuadro();
        carregarAgenda();
        carregarFilaLogistica();
    } catch (e) {
        showInfoModal('Erro ao cancelar visita: ' + e.message, 'Erro', 'danger');
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

function enviarFechamentoOS() {
    const mensagem = document.getElementById('input-fechar-mensagem').value;
    if (!mensagem) return showInfoModal('Por favor, descreva o que foi feito na mensagem de resolução.');

    const pId = window.osAtualParaFechar ? window.osAtualParaFechar.id_processo : null;

    if (pId && String(pId).trim() !== '' && String(pId).trim() !== '0') {
        hideModalNativo('modalDetalhesOS');
        setTimeout(() => { abrirModalDecisaoWFL(); }, 500);
    } else {
        executarFechamentoFinal(mensagem, null);
    }
}

window.tratarPrioridade = async function(acao) {
    if (!window.osPrioridadeAtual) return;
    
    const msgConfirma = acao === 'aceitar' 
        ? 'Tem certeza que deseja PUXAR este agendamento para HOJE?' 
        : 'Tem certeza que deseja RECUSAR a prioridade? A OS continuará no dia originalmente agendado.';
        
    if (!(await showConfirmModal(msgConfirma))) return;

    try {
        const hojeYmd = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        const response = await fetch('/api/v5/painel-logistica/tratar-prioridade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_local: window.osPrioridadeAtual.id,
                ixc_os_id: window.osPrioridadeAtual.ixc_os_id,
                acao: acao,
                data_hoje: hojeYmd,
                usuario_logado: window.usuarioLogado
            })
        });

        const result = await response.json().catch(() => ({}));
        
        if (!response.ok || result.success === false) {
            throw new Error(result.error || result.message || 'Falha ao processar prioridade.');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalhesOS'));
        if (modal) modal.hide();
        
        await carregarAgenda();

        if (usuarioPodeEditar) {
            await carregarFilaLogistica();
        }
    } catch (error) {
        showInfoModal('Erro ao processar a prioridade: ' + error.message);
        await carregarAgenda();
    }
};

async function abrirModalDecisaoWFL() {
    const os = window.osAtualParaFechar;
    document.getElementById('sucesso-ticket-id').textContent = os.ixc_os_id;
    const container = document.getElementById('lista-tarefas-processo');
    container.innerHTML = '<div class="text-center text-muted"><span class="spinner-border spinner-border-sm"></span> Carregando fluxo...</div>';
    showModalNativo('modalDecisaoAgendamento');

    try {
        const response = await fetch(`/api/v5/abertura-OS/tarefas/${os.id_processo}/${os.id_tarefa_atual}`);
        const tarefas = await response.json();
        
        container.innerHTML = '';
        if (!tarefas || tarefas.length === 0) {
            container.innerHTML = '<div class="alert alert-warning small">Nenhuma próxima etapa encontrada no fluxo. O fechamento será direto.</div>';
            container.innerHTML += `<input class="radio-tarefa-wfl d-none" type="radio" value="" checked>`;
            return;
        }

        tarefas.forEach((t, index) => {
            const isVisita = (t.descricao || t.tarefa || '').toUpperCase().includes('VISITA');
            const icon = isVisita ? 'bi-calendar2-event text-primary' : 'bi-diagram-3 text-success';
            const checked = index === 0 ? 'checked' : '';
            
            container.innerHTML += `
                <div class="form-check border rounded p-3 bg-white shadow-sm d-flex align-items-center mb-2 card-tarefa-wfl" style="cursor: pointer; transition: 0.2s;">
                    <input class="form-check-input ms-1 me-3 fs-5 radio-tarefa-wfl" type="radio" name="tarefaWorkflow" id="tarefa-${t.id}" value="${t.id}" ${checked}>
                    <label class="form-check-label w-100 fw-bold text-dark d-flex align-items-center m-0" for="tarefa-${t.id}" style="cursor: pointer; pointer-events: none;">
                        <i class="bi ${icon} fs-4 me-3"></i> 
                        <span style="font-size: 0.95rem;">${t.descricao || t.tarefa}</span>
                    </label>
                </div>
            `;
        });
    } catch (e) {
        container.innerHTML = '<div class="alert alert-danger small">Erro ao carregar etapas do fluxo.</div>';
    }
}

function processarAvancoTarefaLogistica() {
    const tarefaSelecionada = document.querySelector('.radio-tarefa-wfl:checked');
    const idTarefaDestino = tarefaSelecionada ? tarefaSelecionada.value : null;
    
    const mensagem = document.getElementById('input-fechar-mensagem').value || 'Finalizado via Painel de Logística';
    executarFechamentoFinal(mensagem, idTarefaDestino);
}

async function executarFechamentoFinal(mensagem, idTarefaDestino) {
    const os = window.osAtualParaFechar;
    const btnFechar = document.getElementById('btn-action-fechar');
    const btnWfl = document.getElementById('btn-confirmar-tarefa-logistica');
    
    if (btnFechar) { btnFechar.innerHTML = 'Processando...'; btnFechar.disabled = true; }
    if (btnWfl) { btnWfl.innerHTML = 'Avançando...'; btnWfl.disabled = true; }

    try {
        const payload = {
            ixc_os_id: os.ixc_os_id,
            mensagem_resposta: mensagem,
            id_processo: os.id_processo,
            id_tarefa_atual: os.id_tarefa_atual,
            id_tecnico: os.id_tecnico,
            id_tarefa: idTarefaDestino,
            usuario_logado: window.usuarioLogado 
        };

        const response = await fetch('/api/v5/painel-logistica/fechar-os', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro interno ao fechar OS');
        
        removerOsFilaAtualDaUi();
        hideModalNativo('modalDetalhesOS');
        hideModalNativo('modalDecisaoAgendamento');
        carregarAgenda();
        if (usuarioPodeEditar) carregarFilaLogistica();
    } catch (e) {
        showInfoModal('Erro ao finalizar OS: ' + e.message);
    } finally {
        if (btnFechar) { btnFechar.innerHTML = '<i class="bi bi-check-circle me-1"></i>Fechar OS e Tramitar'; btnFechar.disabled = false; }
        if (btnWfl) { btnWfl.innerHTML = 'Finalizar e Avançar <i class="bi bi-arrow-right-circle ms-1"></i>'; btnWfl.disabled = false; }
    }
}

function atualizarLayoutOnu(onu) {
    if (!onu) return;
    
    document.getElementById('det-onu-mac').textContent = onu.mac || onu.id_mac || '---';
    const rx = onu.sinal_rx || onu.rx || '';
    const tx = onu.sinal_tx || onu.tx || '';
    const rxEl = document.getElementById('det-onu-sinal');
    const txEl = document.getElementById('det-onu-sinal-tx');
    if (rxEl) {
        rxEl.textContent = rx || '---';
        rxEl.className = classeSinalOnu(rx);
    }
    if (txEl) {
        txEl.textContent = tx || '---';
        txEl.className = classeSinalOnu(tx);
    }
    document.getElementById('det-onu-distancia').textContent = onu.distancia || onu.distance || '---';
    
    const statusFisico = onu.status || onu.status_onu || 'N/A';
    const spanStatus = document.getElementById('det-onu-status');
    
    if (statusFisico.toUpperCase() === 'ONLINE' || statusFisico.toUpperCase() === 'O') {
        spanStatus.className = 'badge bg-success';
        spanStatus.textContent = 'ONLINE';
    } else {
        spanStatus.className = 'badge bg-danger';
        spanStatus.textContent = statusFisico;
    }
}

function initializeThemeAndUserInfo() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const bodyElement = document.querySelector('body');
    const themeToggleButton = document.getElementById('theme-toggle');

    function aplicarIconeTema() {
        if (!themeToggleButton) return;

        const isDark = bodyElement.classList.contains('dark-mode');

        themeToggleButton.innerHTML = isDark
            ? '<i class="bi bi-brightness-high"></i>'
            : '<i class="bi bi-moon-stars"></i>';

        themeToggleButton.title = isDark
            ? 'Alternar para Tema Claro'
            : 'Alternar para Tema Escuro';
    }

    if (currentTheme === 'dark') {
        bodyElement.classList.add('dark-mode');
    } else {
        bodyElement.classList.remove('dark-mode');
    }

    aplicarIconeTema();

    if (themeToggleButton && !themeToggleButton.dataset.themeListenerAttached) {
        themeToggleButton.addEventListener('click', function() {
            bodyElement.classList.toggle('dark-mode');

            const newTheme = bodyElement.classList.contains('dark-mode')
                ? 'dark'
                : 'light';

            localStorage.setItem('theme', newTheme);
            aplicarIconeTema();

            if (typeof renderizarQuadro === 'function') {
                renderizarQuadro();
            }
        });

        themeToggleButton.dataset.themeListenerAttached = 'true';
    }

    const logoutButton = document.getElementById('btnLogout');

    if (logoutButton && !logoutButton.dataset.logoutListenerAttached) {
        logoutButton.addEventListener('click', function() {
            window.location.href = '/logout';
        });

        logoutButton.dataset.logoutListenerAttached = 'true';
    }

    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const username = data.username || 'Visitante';
            window.usuarioLogado = username;

            const group = data.group || 'Sem grupo';
            window.grupoUsuarioLogado = group;

            if (username === 'Visitante') {
                if (typeof showModal === 'function') {
                    showInfoModal('Sessão Expirada', 'Será necessário refazer o login!', 'warning');
                } else {
                    showInfoModal('Sessão expirada. Será necessário refazer o login.');
                }

                setTimeout(() => {
                    window.location = '/';
                }, 300);

                return;
            }

            document.querySelectorAll('.user-info span').forEach(el => {
                if (el.textContent.includes('{username}')) {
                    el.textContent = username;
                }

                if (el.textContent.includes('{group}')) {
                    el.textContent = group;
                }
            });
        })
        .catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);

            if (typeof showModal === 'function') {
                showInfoModal(
                    'Erro de Autenticação',
                    'Não foi possível verificar seu usuário. Por favor, faça o login novamente.',
                    'danger'
                );
            } else {
                showInfoModal('Erro de autenticação. Faça login novamente.');
            }

            setTimeout(() => {
                window.location = '/';
            }, 300);
        });
}
