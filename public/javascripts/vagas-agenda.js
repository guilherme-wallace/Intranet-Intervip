(function () {
    const estado = {
        inicio: '',
        municipio: 'TODOS',
        tipo: 'TODOS',
        carregando: false
    };

    const categorias = [
        ['manutencao_casa_m', 'Casa - Manhã'],
        ['manutencao_casa_t', 'Casa - Tarde'],
        ['manutencao_predio_serra_m', 'Prédio Serra - Manhã'],
        ['manutencao_predio_serra_t', 'Prédio Serra - Tarde'],
        ['manutencao_predio_outros_m', 'Prédio VV/VIX/CCA - Manhã'],
        ['manutencao_predio_outros_t', 'Prédio VV/VIX/CCA - Tarde'],
        ['instalacao_casa_serra_m', 'Instalação Casa Serra - Manhã'],
        ['instalacao_casa_serra_t', 'Instalação Casa Serra - Tarde'],
        ['instalacao_predio_serra_m', 'Instalação Prédio Serra - Manhã'],
        ['instalacao_predio_serra_t', 'Instalação Prédio Serra - Tarde'],
        ['instalacao_casa_outros_m', 'Instalação Casa VV/VIX/CCA - Manhã'],
        ['instalacao_casa_outros_t', 'Instalação Casa VV/VIX/CCA - Tarde'],
        ['instalacao_predio_outros_m', 'Instalação Prédio VV/VIX/CCA - Manhã'],
        ['instalacao_predio_outros_t', 'Instalação Prédio VV/VIX/CCA - Tarde'],
        ['recolhimento_serra_m', 'Recolhimento Serra - Manhã'],
        ['recolhimento_serra_t', 'Recolhimento Serra - Tarde'],
        ['recolhimento_outros_m', 'Recolhimento VV/VIX/CCA - Manhã'],
        ['recolhimento_outros_t', 'Recolhimento VV/VIX/CCA - Tarde']
    ];

    function ymdLocal(date) {
        const ano = date.getFullYear();
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const dia = String(date.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    function obterHojeSaoPauloYmd() {
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
    }

    function normalizarDataBaseYmd(dataBase) {
        if (!dataBase) return obterHojeSaoPauloYmd();
        if (dataBase instanceof Date) {
            return new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(dataBase);
        }
        const texto = String(dataBase).substring(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : obterHojeSaoPauloYmd();
    }

    function calcularInicioSemana(ymd) {
        const base = new Date(`${ymd}T12:00:00`);
        if (Number.isNaN(base.getTime())) return obterInicioSemana();
        const dia = base.getDay();
        const diff = dia === 0 ? -6 : 1 - dia;
        base.setDate(base.getDate() + diff);
        return ymdLocal(base);
    }

    function adicionarDias(ymd, dias) {
        const data = new Date(`${ymd}T12:00:00`);
        data.setDate(data.getDate() + dias);
        return ymdLocal(data);
    }

    function semanaTotalmentePassada(inicio) {
        return adicionarDias(inicio, 6) < obterHojeSaoPauloYmd();
    }

    function obterInicioSemana(dataBase) {
        const hoje = obterHojeSaoPauloYmd();
        const inicio = calcularInicioSemana(normalizarDataBaseYmd(dataBase));
        return semanaTotalmentePassada(inicio) ? calcularInicioSemana(hoje) : inicio;
    }

    function deslocarSemana(inicio, delta) {
        const data = new Date(`${inicio}T12:00:00`);
        data.setDate(data.getDate() + (delta * 7));
        return ymdLocal(data);
    }

    function formatarData(valor) {
        const partes = String(valor || '').split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}` : valor;
    }

    function garantirModal() {
        let modal = document.getElementById('modal-vagas-agenda');
        if (modal) return modal;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal fade" id="modal-vagas-agenda" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header bg-light">
                            <div>
                                <h5 class="modal-title fw-bold mb-0"><i class="bi bi-calendar-week me-2 text-primary"></i>Vagas Agenda</h5>
                                <small class="text-muted" id="vagas-agenda-periodo">---</small>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="d-flex flex-wrap gap-2 align-items-end mb-3">
                                <div class="btn-group" role="group" aria-label="Navegação de semana">
                                    <button type="button" class="btn btn-outline-primary" id="btn-vagas-semana-anterior"><i class="bi bi-chevron-left"></i></button>
                                    <button type="button" class="btn btn-outline-primary" id="btn-vagas-semana-atual"><i class="bi bi-calendar-check"></i></button>
                                    <button type="button" class="btn btn-outline-primary" id="btn-vagas-semana-proxima"><i class="bi bi-chevron-right"></i></button>
                                </div>
                                <div>
                                    <label class="form-label small fw-bold mb-1">Município</label>
                                    <select class="form-select form-select-sm" id="select-vagas-municipio">
                                        <option value="TODOS">Todos</option>
                                        <option value="SERRA">Serra</option>
                                        <option value="VV_VIX_CCA">Vila Velha / Vitória / Cariacica</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label small fw-bold mb-1">Tipo</label>
                                    <select class="form-select form-select-sm" id="select-vagas-tipo">
                                        <option value="TODOS">Todos</option>
                                        <option value="SUPORTE">Manutenção / Suporte</option>
                                        <option value="INSTALACAO">Instalação</option>
                                        <option value="RECOLHIMENTO">Recolhimento</option>
                                    </select>
                                </div>
                            </div>
                            <div id="vagas-agenda-alerta" class="alert alert-warning small d-none"></div>
                            <div id="vagas-agenda-conteudo" class="row g-3"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper.firstElementChild);

        modal = document.getElementById('modal-vagas-agenda');
        modal.querySelector('#btn-vagas-semana-anterior').addEventListener('click', () => mudarSemanaVagasAgenda(-1));
        modal.querySelector('#btn-vagas-semana-atual').addEventListener('click', () => {
            estado.inicio = obterInicioSemana();
            carregarVagasAgendaSemana();
        });
        modal.querySelector('#btn-vagas-semana-proxima').addEventListener('click', () => mudarSemanaVagasAgenda(1));
        modal.querySelector('#select-vagas-municipio').addEventListener('change', (event) => {
            estado.municipio = event.target.value;
            carregarVagasAgendaSemana();
        });
        modal.querySelector('#select-vagas-tipo').addEventListener('change', (event) => {
            estado.tipo = event.target.value;
            carregarVagasAgendaSemana();
        });
        return modal;
    }

    function atualizarEstadoNavegacao() {
        const modal = garantirModal();
        const anterior = modal.querySelector('#btn-vagas-semana-anterior');
        if (anterior) {
            anterior.disabled = semanaTotalmentePassada(deslocarSemana(estado.inicio, -1));
        }
    }

    function classeSlot(slot) {
        if (!slot || Number(slot.total || 0) <= 0 || Number(slot.disponiveis || 0) <= 0) return 'vagas-slot-lotado';
        if (Number(slot.disponiveis || 0) <= 1) return 'vagas-slot-baixo';
        return 'vagas-slot-disponivel';
    }

    function textoDisponivel(slot) {
        if (slot?.encerrado) return 'Encerrado';
        if (!slot || Number(slot.total || 0) <= 0) return 'Fechado';
        if (Number(slot.disponiveis || 0) <= 0) return 'Lotado';
        return `${slot.disponiveis} vaga${Number(slot.disponiveis) === 1 ? '' : 's'}`;
    }

    function renderizarVagasAgenda(payload) {
        const modal = garantirModal();
        const periodo = modal.querySelector('#vagas-agenda-periodo');
        const conteudo = modal.querySelector('#vagas-agenda-conteudo');
        periodo.textContent = `${formatarData(payload.inicio)} até ${formatarData(payload.fim)}`;

        const hojeYmd = obterHojeSaoPauloYmd();
        const diasVisiveis = (payload.dias || []).filter(dia => String(dia.data || '') >= hojeYmd);

        if (diasVisiveis.length === 0) {
            conteudo.innerHTML = '<div class="col-12"><div class="alert alert-warning small mb-0">Esta semana ja passou. Selecione a semana atual ou uma semana futura.</div></div>';
            atualizarEstadoNavegacao();
            return;
        }

        conteudo.innerHTML = diasVisiveis.map(dia => {
            const slots = categorias
                .filter(([chave]) => dia.capacidades && dia.capacidades[chave])
                .map(([chave, label]) => {
                    const slot = dia.capacidades[chave];
                    return `
                        <div class="vagas-slot ${classeSlot(slot)}">
                            <div class="d-flex justify-content-between gap-2">
                                <span class="fw-semibold">${label}</span>
                                <span class="fw-bold">${slot.usadas}/${slot.total}</span>
                            </div>
                            <div class="small text-muted">${textoDisponivel(slot)}</div>
                        </div>
                    `;
                }).join('');

            return `
                <div class="col-12 col-md-6 col-xl">
                    <div class="vagas-dia-card ${dia.passado ? 'vagas-dia-passado' : ''}">
                        <div class="fw-bold text-primary text-capitalize">${dia.label}</div>
                        <div class="small text-muted mb-2">${formatarData(dia.data)}</div>
                        <div class="d-flex flex-column gap-2">${slots || '<div class="text-muted small">Sem capacidade para os filtros.</div>'}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function carregarVagasAgendaSemana() {
        if (estado.carregando) return;
        estado.carregando = true;
        const modal = garantirModal();
        const alerta = modal.querySelector('#vagas-agenda-alerta');
        const conteudo = modal.querySelector('#vagas-agenda-conteudo');
        alerta.classList.add('d-none');
        conteudo.innerHTML = '<div class="col-12 text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Carregando vagas...</div>';

        try {
            const url = `/api/v5/agendamento/vagas-semana?inicio=${encodeURIComponent(estado.inicio)}&municipio=${encodeURIComponent(estado.municipio)}&tipo=${encodeURIComponent(estado.tipo)}`;
            const response = await fetch(url);
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.success === false) throw new Error(payload.error || 'Erro ao consultar vagas.');
            renderizarVagasAgenda(payload);
            atualizarEstadoNavegacao();
        } catch (error) {
            console.error('[Vagas Agenda] Falha ao consultar vagas:', error);
            alerta.textContent = 'Não foi possível carregar as vagas da agenda agora.';
            alerta.classList.remove('d-none');
            conteudo.innerHTML = '';
            atualizarEstadoNavegacao();
        } finally {
            estado.carregando = false;
        }
    }

    function mudarSemanaVagasAgenda(delta) {
        const novoInicio = deslocarSemana(estado.inicio, delta);
        if (delta < 0 && semanaTotalmentePassada(novoInicio)) {
            const modal = garantirModal();
            const alerta = modal.querySelector('#vagas-agenda-alerta');
            alerta.textContent = 'Esta semana ja passou. Selecione a semana atual ou uma semana futura.';
            alerta.classList.remove('d-none');
            atualizarEstadoNavegacao();
            return;
        }
        estado.inicio = novoInicio;
        carregarVagasAgendaSemana();
    }

    window.abrirModalVagasAgenda = function (options = {}) {
        const modal = garantirModal();
        estado.inicio = obterInicioSemana(options.dataBase);
        estado.municipio = options.municipio || 'TODOS';
        estado.tipo = options.tipo || 'TODOS';
        modal.querySelector('#select-vagas-municipio').value = estado.municipio;
        modal.querySelector('#select-vagas-tipo').value = estado.tipo;
        bootstrap.Modal.getOrCreateInstance(modal).show();
        atualizarEstadoNavegacao();
        carregarVagasAgendaSemana();
    };

    document.addEventListener('click', (event) => {
        const botao = event.target.closest('.btn-vagas-agenda');
        if (!botao) return;
        const inputData = botao.dataset.dateInput ? document.getElementById(botao.dataset.dateInput) : null;
        window.abrirModalVagasAgenda({ dataBase: inputData?.value || botao.dataset.dataBase || '' });
    });
})();
