(function () {
    const MODAL_ID = 'modal-analise-credito-spc';
    const STATUS_LABELS = {
        APROVADO: 'Aprovado',
        APROVADO_COM_CONDICAO: 'Aprovado com condição',
        BLOQUEADO: 'Bloqueado',
        ANALISE_MANUAL: 'Análise manual'
    };
    const PERFIL_LABELS = {
        SEM_RESTRICAO: 'Sem restrições de crédito',
        RESTRICAO_FINANCEIRA: 'Com restrições financeiras',
        RESTRICAO_TELECOM: 'Com restrições em telecomunicações',
        ANALISE_MANUAL: 'Análise manual',
        ERRO_CONSULTA: 'Erro na consulta'
    };

    function escapeHtml(valor) {
        return String(valor || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatarMoeda(valor) {
        if (valor === null || typeof valor === 'undefined') return '-';
        return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function resumoCondicaoContrato(decision) {
        if (decision?.perfil === 'SEM_RESTRICAO') return 'Pós-pago | Taxa de instalação isenta';
        if (decision?.perfil === 'RESTRICAO_FINANCEIRA') return 'Pré-pago | Taxa de instalação R$ 150,00 em parcela única | Próximo vencimento definido automaticamente';
        if (decision?.perfil === 'RESTRICAO_TELECOM') return 'Pré-pago | Taxa de instalação R$ 250,00 em parcela única | Próximo vencimento definido automaticamente';
        return 'Condição contratual pendente de análise manual';
    }

    function renderRestrictionSummary(payload) {
        const itens = Array.isArray(payload?.restrictionSummary) ? payload.restrictionSummary : [];
        const itensValidos = itens
            .map(item => ({
                label: String(item?.label || item?.tipo || 'ocorrencia').trim(),
                quantidade: Number(item?.quantidade || 0)
            }))
            .filter(item => item.label && Number.isFinite(item.quantidade) && item.quantidade > 0);

        if (!itensValidos.length) return '';

        const textoItens = itensValidos
            .map(item => `${item.quantidade} ${item.label}${item.quantidade === 1 ? '' : '(s)'}`)
            .join(', ');
        const classification = payload?.classification || payload?.decision?.perfil || '';
        const titulo = classification === 'RESTRICAO_TELECOM'
            ? 'Restricao em telecomunicacoes identificada'
            : 'Restricao financeira identificada';

        return `
            <div class="alert alert-warning small mb-3">
                <strong>${escapeHtml(titulo)}:</strong> ${escapeHtml(textoItens)}.
            </div>
        `;
    }

    function ensureModal() {
        let modal = document.getElementById(MODAL_ID);
        if (modal) return modal;

        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = MODAL_ID;
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('data-bs-backdrop', 'static');
        modal.setAttribute('data-bs-keyboard', 'false');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="${MODAL_ID}-title">Análise de crédito</h5>
                    </div>
                    <div class="modal-body" id="${MODAL_ID}-body"></div>
                    <div class="modal-footer" id="${MODAL_ID}-footer"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function renderDecision(decision, extraHtml, payload) {
        const status = STATUS_LABELS[decision?.status] || decision?.status || 'Não informado';
        const perfil = PERFIL_LABELS[decision?.perfil] || decision?.perfil || 'Não informado';
        return `
            <div class="mb-3">
                <div class="fw-bold">${escapeHtml(status)}</div>
                <div class="text-muted small">${escapeHtml(perfil)}</div>
            </div>
            ${renderRestrictionSummary(payload)}
            <div class="border rounded p-3 mb-3 bg-light text-dark">
                <div><strong>Condição do contrato:</strong> ${escapeHtml(resumoCondicaoContrato(decision))}</div>
            </div>
            <p class="mb-0">${escapeHtml(decision?.motivo || 'Decisão de crédito recebida.')}</p>
            ${extraHtml || ''}
        `;
    }

    function showCreditoModal({ title, body, type = 'info', actions = [] }) {
        return new Promise(resolve => {
            const modalEl = ensureModal();
            const titleEl = document.getElementById(`${MODAL_ID}-title`);
            const bodyEl = document.getElementById(`${MODAL_ID}-body`);
            const footerEl = document.getElementById(`${MODAL_ID}-footer`);
            const dialogEl = modalEl.querySelector('.modal-dialog');

            titleEl.textContent = title;
            bodyEl.innerHTML = body;
            footerEl.innerHTML = '';
            dialogEl.classList.remove('modal-success', 'modal-danger', 'modal-warning');
            if (type === 'danger') dialogEl.classList.add('modal-danger');
            if (type === 'warning') dialogEl.classList.add('modal-warning');
            if (type === 'success') dialogEl.classList.add('modal-success');

            const modalCompat = criarModalCompat(modalEl);
            const botoes = actions.length ? actions : [{ label: 'Fechar', value: 'close', className: 'btn-secondary' }];
            botoes.forEach(action => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `btn ${action.className || 'btn-secondary'}`;
                button.textContent = action.label;
                button.addEventListener('click', () => {
                    modalCompat.hide();
                    resolve(action.value);
                }, { once: true });
                footerEl.appendChild(button);
            });

            modalCompat.show();
        });
    }

    function criarModalCompat(modalEl) {
        if (window.bootstrap && bootstrap.Modal) {
            if (typeof bootstrap.Modal.getOrCreateInstance === 'function') {
                const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
                return {
                    show: () => instance.show(),
                    hide: () => instance.hide()
                };
            }

            const instance = new bootstrap.Modal(modalEl);
            return {
                show: () => instance.show(),
                hide: () => instance.hide()
            };
        }

        if (window.jQuery && typeof window.jQuery(modalEl).modal === 'function') {
            return {
                show: () => window.jQuery(modalEl).modal('show'),
                hide: () => window.jQuery(modalEl).modal('hide')
            };
        }

        return {
            show: () => {
                modalEl.classList.add('show');
                modalEl.style.display = 'block';
                modalEl.removeAttribute('aria-hidden');
            },
            hide: () => {
                modalEl.classList.remove('show');
                modalEl.style.display = 'none';
                modalEl.setAttribute('aria-hidden', 'true');
            }
        };
    }

    function aplicarDecisaoCreditoEmCampos(decision) {
        if (!decision) return;
        const modalidadeIds = ['modalidade', 'modalidade_pagamento', 'tipo_modalidade', 'credito_modalidade'];
        const taxaIds = ['taxa_habilitacao', 'taxa_instalacao', 'valor_taxa_habilitacao', 'credito_taxa_habilitacao'];

        modalidadeIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.value = decision.modalidade || '';
                field.readOnly = true;
                field.setAttribute('aria-readonly', 'true');
                if (field.tagName === 'SELECT') field.disabled = true;
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        taxaIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.value = decision.taxaHabilitacao === null || typeof decision.taxaHabilitacao === 'undefined'
                    ? ''
                    : String(decision.taxaHabilitacao);
                field.readOnly = true;
                field.setAttribute('aria-readonly', 'true');
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    function exibirResumoCondicaoContrato(decision, submitButton) {
        const form = submitButton?.closest('form');
        if (!form) return;
        let summary = form.querySelector('[data-spc-credit-summary]');
        if (!summary) {
            summary = document.createElement('div');
            summary.setAttribute('data-spc-credit-summary', 'true');
            summary.setAttribute('role', 'status');
            const target = submitButton.parentElement || submitButton;
            target.parentElement.insertBefore(summary, target);
        }
        summary.className = `alert ${decision?.status === 'APROVADO' ? 'alert-success' : 'alert-warning'} mt-3`;
        summary.textContent = resumoCondicaoContrato(decision);
    }

    async function consultarCreditoNoBackend({ documento, tipoCadastro, clienteId }) {
        const response = await fetch('/api/spc/consulta-credito', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documento, tipoCadastro, clienteId: clienteId || null })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.error || 'Não foi possível consultar a análise de crédito.');
            error.payload = payload;
            throw error;
        }
        return payload;
    }

    async function executarAnaliseCreditoAntesCadastro(options) {
        if (window.__spcAnaliseEmAndamento) {
            console.warn('Analise SPC ja esta em andamento para este formulario.');
            return { permitir: false, payload: null, emAndamento: true };
        }

        window.__spcAnaliseEmAndamento = true;
        const submitButton = options?.botao || document.getElementById('btn-finalizar-venda');
        const originalHtml = submitButton?.innerHTML || '';
        const originalDisabled = submitButton?.disabled || false;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Consultando SPC Brasil. Essa etapa pode levar até 1 minuto...';
        }

        try {
            const payload = await consultarCreditoNoBackend(options || {});
            const decision = payload.decision || {};
            aplicarDecisaoCreditoEmCampos(decision);
            exibirResumoCondicaoContrato(decision, submitButton);

            if (decision.status === 'APROVADO') {
                window.ultimaAnaliseCreditoSpc = payload;
                return { permitir: true, payload };
            }

            if (decision.status === 'APROVADO_COM_CONDICAO') {
                const escolha = await showCreditoModal({
                    title: 'Cadastro aprovado com condição',
                    type: 'warning',
                    body: renderDecision(decision, '<p class="small text-muted mt-3 mb-0">Confirme para continuar o cadastro com a modalidade e taxa acima.</p>', payload),
                    actions: [
                        { label: 'Cancelar cadastro', value: 'cancelar', className: 'btn-outline-secondary' },
                        { label: 'Continuar com condição', value: 'continuar', className: 'btn-warning' }
                    ]
                });
                if (escolha === 'continuar') {
                    window.ultimaAnaliseCreditoSpc = payload;
                    return { permitir: true, payload };
                }
                return { permitir: false, payload };
            }

            if (decision.status === 'BLOQUEADO') {
                await showCreditoModal({
                    title: 'Cadastro bloqueado',
                    type: 'danger',
                    body: renderDecision(decision, '', payload),
                    actions: [{ label: 'Entendi', value: 'fechar', className: 'btn-danger' }]
                });
                return { permitir: false, payload };
            }

            await showCreditoModal({
                title: 'Análise manual necessária',
                type: 'warning',
                body: renderDecision(
                    decision,
                    '<p class="small text-muted mt-3 mb-0">O contrato não será criado automaticamente. Encaminhe o cadastro para análise manual.</p>',
                    payload
                ),
                actions: [{ label: 'Fechar', value: 'fechar', className: 'btn-secondary' }]
            });
            return { permitir: false, payload };
        } catch (error) {
            console.error('Falha na análise de crédito SPC:', error?.payload || error);
            const payload = error?.payload || {};
            const decision = payload.decision || {
                status: 'ANALISE_MANUAL',
                perfil: 'ANALISE_MANUAL',
                modalidade: null,
                taxaHabilitacao: null,
                motivo: error?.message || 'Não foi possível consultar a análise de crédito.'
            };

            await showCreditoModal({
                title: 'Análise de crédito indisponível',
                type: 'warning',
                body: renderDecision(decision, '<p class="small text-muted mt-3 mb-0">O contrato não será criado automaticamente. Não foram exibidos dados brutos da consulta.</p>'),
                actions: [{ label: 'Fechar', value: 'fechar', className: 'btn-secondary' }]
            });
            return { permitir: false, payload };
        } finally {
            window.__spcAnaliseEmAndamento = false;
            if (submitButton) {
                submitButton.disabled = originalDisabled;
                submitButton.innerHTML = originalHtml;
            }
        }
    }

    window.executarAnaliseCreditoAntesCadastro = executarAnaliseCreditoAntesCadastro;
    window.aplicarDecisaoCreditoEmCampos = aplicarDecisaoCreditoEmCampos;
})();
