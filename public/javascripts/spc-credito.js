(function () {
    const MODAL_ID = 'modal-analise-credito-spc';
    const CONSENT_CHECKBOX_ID = `${MODAL_ID}-ciencia-cliente`;

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

    function montarTermoAceiteConsultaCredito() {
        const nome = String(document.getElementById('nome')?.value || '').trim() || 'Cliente';
        return `Sr(a). ${nome}, para darmos andamento à sua contratação e definirmos as melhores condições comerciais para o seu perfil, nosso procedimento padrão inclui a realização de uma análise de crédito. É um passo rápido e seguro, que fazemos em conformidade com a Lei Geral de Proteção de Dados. Podemos prosseguir com a consulta?`;
    }

    function obterConcordanciaConsultaCredito() {
        return document.querySelector('input[name="cliente_concordou_consulta_credito"]:checked')?.value || '';
    }

    function atualizarTermoAceiteConsultaCredito() {
        const termo = document.getElementById('termo-aceite-consulta-credito');
        if (termo) termo.textContent = montarTermoAceiteConsultaCredito();
    }

    function atualizarEstadoAceiteConsultaCredito(revalidarFormulario = true) {
        const concordancia = obterConcordanciaConsultaCredito();
        const mensagem = document.getElementById('mensagem-aceite-consulta-credito');
        if (mensagem) {
            mensagem.classList.remove('text-danger', 'text-success');
            if (concordancia === 'SIM') {
                mensagem.textContent = 'Concordância registrada.';
                mensagem.classList.add('text-success');
            } else if (concordancia === 'NAO') {
                mensagem.textContent = 'Cadastro não autorizado.';
                mensagem.classList.add('text-danger');
            } else {
                mensagem.textContent = 'Opção de concordância não selecionada.';
                mensagem.classList.add('text-danger');
            }
        }

        if (revalidarFormulario && typeof window.checkFormValidity === 'function') {
            window.checkFormValidity();
        }
    }

    async function copiarTermoAceiteConsultaCredito() {
        const status = document.getElementById('status-copia-termo-consulta-credito');
        try {
            const texto = montarTermoAceiteConsultaCredito();
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(texto);
            } else {
                const campoTemporario = document.createElement('textarea');
                campoTemporario.value = texto;
                campoTemporario.setAttribute('readonly', '');
                campoTemporario.style.position = 'fixed';
                campoTemporario.style.opacity = '0';
                document.body.appendChild(campoTemporario);
                campoTemporario.select();
                const copiado = document.execCommand('copy');
                campoTemporario.remove();
                if (!copiado) throw new Error('Copia nao suportada pelo navegador.');
            }
            if (status) {
                status.textContent = 'Termo copiado.';
                status.className = 'small mb-3 text-success';
            }
        } catch (_error) {
            if (status) {
                status.textContent = 'Não foi possível copiar automaticamente. Selecione o texto acima e copie manualmente.';
                status.className = 'small mb-3 text-danger';
            }
        }
    }

    function configurarAceiteConsultaCredito() {
        const termo = document.getElementById('termo-aceite-consulta-credito');
        if (!termo) return;

        document.getElementById('nome')?.addEventListener('input', atualizarTermoAceiteConsultaCredito);
        document.getElementById('nome')?.addEventListener('change', atualizarTermoAceiteConsultaCredito);
        document.getElementById('btn-copiar-termo-consulta-credito')?.addEventListener('click', copiarTermoAceiteConsultaCredito);
        document.querySelectorAll('input[name="cliente_concordou_consulta_credito"]').forEach(input => {
            input.addEventListener('change', () => atualizarEstadoAceiteConsultaCredito(true));
        });

        atualizarTermoAceiteConsultaCredito();
        atualizarEstadoAceiteConsultaCredito(false);
    }

    function resumoCondicaoContrato(decision, oferta) {
        const modalidade = oferta?.modalidade || decision?.modalidade;
        const taxa = Number(oferta?.taxaInstalacao ?? decision?.taxaHabilitacao ?? 0);
        if (modalidade === 'POS_PAGO') return 'Pós-pago | Instalação isenta';
        if (modalidade === 'PRE_PAGO') return `Pré-pago | Instalação ${formatarMoeda(taxa)} em parcela única`;
        return 'Oferta indisponível';
    }

    function renderOferta(payload, options) {
        const decision = payload?.decision || {};
        const oferta = payload?.oferta || {};
        const modalidade = oferta.modalidade === 'PRE_PAGO' ? 'Pré-pago' : 'Pós-pago';
        const taxa = Number(oferta.taxaInstalacao ?? decision.taxaHabilitacao ?? 0);
        const instalacao = taxa > 0 ? `${formatarMoeda(taxa)} em parcela única` : 'Isenta';
        const plano = String(options?.planoNome || 'Não informado').trim();
        const diaVencimento = oferta.modalidade === 'PRE_PAGO'
            ? oferta.diaVencimento
            : oferta.diaVencimento || options?.diaVencimento;
        const vencimento = diaVencimento
            ? `Dia ${diaVencimento}`
            : oferta.modalidade === 'PRE_PAGO'
                ? 'Próximo vencimento definido automaticamente'
                : 'Não informado';
        const nomeCliente = String(options?.nomeCliente || '').trim();
        const referenciaCliente = nomeCliente ? ` o cliente ${escapeHtml(nomeCliente)}` : ' o cliente';

        return `
            <p class="mb-3">Segue a oferta disponível para este cliente:</p>
            <div class="border rounded p-3 mb-3 bg-light text-dark">
                <div class="row g-2">
                    <div class="col-5 fw-semibold">Modalidade:</div><div class="col-7">${escapeHtml(modalidade)}</div>
                    <div class="col-5 fw-semibold">Instalação:</div><div class="col-7">${escapeHtml(instalacao)}</div>
                    <div class="col-5 fw-semibold">Plano escolhido:</div><div class="col-7">${escapeHtml(plano)}</div>
                    <div class="col-5 fw-semibold">Vencimento:</div><div class="col-7">${escapeHtml(vencimento)}</div>
                </div>
            </div>
            <div class="form-check border rounded p-3 ps-5 mb-0">
                <input class="form-check-input" type="checkbox" id="${CONSENT_CHECKBOX_ID}">
                <label class="form-check-label small" for="${CONSENT_CHECKBOX_ID}">
                    Declaro que, antes desta análise, informei${referenciaCliente} e confirmei que está ciente de que a Intervip poderá consultar seu CPF/CNPJ em bases de análise de crédito, incluindo o SPC Brasil, exclusivamente para avaliação cadastral, contratação, modalidade de pagamento, taxa de instalação e condições comerciais aplicáveis.
                </label>
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

    function renderMensagemOperacional(message) {
        return `
            <div class="alert alert-warning mb-0" role="alert">${escapeHtml(message)}</div>
        `;
    }

    function showCreditoModal({ title, body, type = 'info', actions = [], confirmationCheckboxId = null }) {
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
                if (action.requiresConfirmation) button.disabled = true;
                button.addEventListener('click', () => {
                    modalCompat.hide();
                    resolve(action.value);
                }, { once: true });
                footerEl.appendChild(button);
            });

            if (confirmationCheckboxId) {
                const checkbox = document.getElementById(confirmationCheckboxId);
                const syncConfirmation = () => {
                    footerEl.querySelectorAll('button[data-requires-confirmation="true"]').forEach(button => {
                        button.disabled = !checkbox?.checked;
                    });
                };
                footerEl.querySelectorAll('button').forEach((button, index) => {
                    if (botoes[index]?.requiresConfirmation) button.dataset.requiresConfirmation = 'true';
                });
                checkbox?.addEventListener('change', syncConfirmation);
                syncConfirmation();
            }

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

    function exibirResumoCondicaoContrato(decision, oferta, submitButton) {
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
        summary.textContent = resumoCondicaoContrato(decision, oferta);
    }

    async function consultarCreditoNoBackend({ documento, tipoCadastro, clienteId, diaVencimento, clienteConcordouConsulta }) {
        const response = await fetch('/api/spc/consulta-credito', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documento,
                tipoCadastro,
                clienteId: clienteId || null,
                diaVencimento: diaVencimento || null,
                clienteConcordouConsulta: clienteConcordouConsulta === true
            })
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
            exibirResumoCondicaoContrato(decision, payload.oferta, submitButton);

            if (decision.status === 'APROVADO' || decision.status === 'APROVADO_COM_CONDICAO') {
                const escolha = await showCreditoModal({
                    title: 'Oferta para o cliente',
                    type: decision.status === 'APROVADO' ? 'success' : 'warning',
                    body: renderOferta(payload, options),
                    confirmationCheckboxId: CONSENT_CHECKBOX_ID,
                    actions: [
                        { label: 'Cancelar cadastro', value: 'cancelar', className: 'btn-outline-secondary' },
                        {
                            label: 'Continuar',
                            value: 'continuar',
                            className: decision.status === 'APROVADO' ? 'btn-success' : 'btn-warning',
                            requiresConfirmation: true
                        }
                    ]
                });
                if (escolha === 'continuar') {
                    window.ultimaAnaliseCreditoSpc = payload;
                    return { permitir: true, payload, cienciaConfirmada: true };
                }
                return { permitir: false, payload };
            }

            if (decision.status === 'BLOQUEADO') {
                await showCreditoModal({
                    title: 'Cadastro bloqueado',
                    type: 'danger',
                    body: renderMensagemOperacional('Não foi possível liberar esta contratação. Verifique as pendências internas antes de continuar.'),
                    actions: [{ label: 'Entendi', value: 'fechar', className: 'btn-danger' }]
                });
                return { permitir: false, payload };
            }

            await showCreditoModal({
                title: 'Análise manual necessária',
                type: 'warning',
                body: renderMensagemOperacional('A contratação não pode continuar automaticamente. Encaminhe o cadastro para análise manual.'),
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
                body: renderMensagemOperacional('Não foi possível concluir a análise neste momento. O contrato não será criado automaticamente.'),
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
    window.obterConcordanciaConsultaCredito = obterConcordanciaConsultaCredito;
    window.atualizarTermoAceiteConsultaCredito = atualizarTermoAceiteConsultaCredito;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', configurarAceiteConsultaCredito);
    } else {
        configurarAceiteConsultaCredito();
    }
})();
