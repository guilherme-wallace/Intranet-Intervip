const assert = require('assert');
const {
    applyCreditDecisionToIxcContractPayload,
    CreditContractRuleError,
    getActivationBillingResult,
    resolveIxcContractDueDay,
    resolveIxcTipoContratoId,
    validateCreditConsultationAcknowledgement
} = require('../src/services/ixcCreditContractService');
const {
    faturarAtivacaoContrato
} = require('../src/services/ixcActivationBillingService');

const config = {
    tipoContratoPosPagoPorDia: {
        '5': '5',
        '10': '10',
        '15': '15',
        '20': '20',
        '25': '',
        '30': ''
    },
    tipoContratoPrePagoPorDia: {
        '5': '36',
        '10': '37',
        '15': '38',
        '20': '39',
        '25': '40',
        '30': '41'
    },
    condPagAtivacaoUnicaId: '1',
    produtoTaxaAtivacaoId: '9045',
    tipoDocAtivacaoId: '501',
    ativacaoVencimentoDias: 2
};
const now = new Date(2026, 6, 17, 10, 0, 0);
const day21SaoPaulo = new Date('2026-07-21T15:00:00.000Z');

function decision(status, perfil, modalidade, taxaHabilitacao, motivo = 'Teste') {
    return { status, perfil, modalidade, taxaHabilitacao, motivo };
}

function assertCreditError(fn, expectedCode) {
    assert.throws(fn, error => error instanceof CreditContractRuleError && error.code === expectedCode);
}

assert.strictEqual(validateCreditConsultationAcknowledgement(true), true);
assertCreditError(
    () => validateCreditConsultationAcknowledgement(false),
    'CREDIT_CONSULTATION_ACK_REQUIRED'
);

const approvedDecision = decision('APROVADO', 'SEM_RESTRICAO', 'POS_PAGO', 0);
for (const [day, expectedId] of Object.entries({ '5': '5', '10': '10', '15': '15', '20': '20' })) {
    const payload = applyCreditDecisionToIxcContractPayload(
        { dia_fixo_vencimento: day },
        approvedDecision,
        config,
        day,
        now
    );
    assert.strictEqual(payload.id_tipo_contrato, expectedId, `POS_PAGO dia ${day}`);
    assert.strictEqual(payload.taxa_instalacao, '0.00');
}

for (const [day, expectedId] of Object.entries({ '5': '36', '10': '37', '15': '38', '20': '39', '25': '40', '30': '41' })) {
    assert.strictEqual(resolveIxcTipoContratoId('PRE_PAGO', day, config), expectedId, `PRE_PAGO dia ${day}`);
}
assert.throws(
    () => resolveIxcTipoContratoId('POS_PAGO', 25, config),
    error => error instanceof CreditContractRuleError
        && error.code === 'IXC_POSTPAID_CONTRACT_TYPE_NOT_CONFIGURED'
        && error.message === 'Tipo de contrato pós-pago para vencimento dia 25 não está configurado no IXC.'
);
assertCreditError(() => resolveIxcTipoContratoId('PRE_PAGO', 12, config), 'IXC_CONTRACT_DUE_DAY_UNSUPPORTED');
assert.strictEqual(resolveIxcContractDueDay('PRE_PAGO', 5, config, day21SaoPaulo), 25);
assert.strictEqual(resolveIxcContractDueDay('PRE_PAGO', 5, config, new Date('2026-07-25T15:00:00.000Z')), 25);
assert.strictEqual(resolveIxcContractDueDay('PRE_PAGO', 5, config, new Date('2026-07-30T15:00:00.000Z')), 30);
assert.strictEqual(resolveIxcContractDueDay('PRE_PAGO', 30, config, new Date('2026-07-31T15:00:00.000Z')), 5);
assert.strictEqual(resolveIxcContractDueDay('POS_PAGO', 10, config, day21SaoPaulo), 10);

const financialRestrictionDay25 = applyCreditDecisionToIxcContractPayload(
    { dia_fixo_vencimento: '25' },
    decision('APROVADO_COM_CONDICAO', 'RESTRICAO_FINANCEIRA', 'PRE_PAGO', 150),
    config,
    '25',
    day21SaoPaulo
);
assert.strictEqual(financialRestrictionDay25.id_tipo_contrato, '40');
assert.strictEqual(financialRestrictionDay25.dia_fixo_vencimento, '25');
assert.strictEqual(financialRestrictionDay25.taxa_instalacao, '150.00');
assert.strictEqual(financialRestrictionDay25.ativacao_numero_parcelas, '1');

const financialRestriction = applyCreditDecisionToIxcContractPayload(
    { dia_fixo_vencimento: '5' },
    decision('APROVADO_COM_CONDICAO', 'RESTRICAO_FINANCEIRA', 'PRE_PAGO', 150),
    config,
    '5',
    now
);
assert.strictEqual(financialRestriction.id_tipo_contrato, '39');
assert.strictEqual(financialRestriction.dia_fixo_vencimento, '20');
assert.strictEqual(financialRestriction.taxa_instalacao, '150.00');
assert.strictEqual(financialRestriction.ativacao_numero_parcelas, '1');
assert.strictEqual(financialRestriction.ativacao_valor_parcela, '150.00');
assert.strictEqual(financialRestriction.id_cond_pag_ativ, '1');
assert.strictEqual(financialRestriction.id_produto_ativ, '9045');
assert.strictEqual(financialRestriction.id_tipo_doc_ativ, '501');
assert.strictEqual(financialRestriction.ativacao_vencimentos, '19/07/2026');

const telecomRestriction = applyCreditDecisionToIxcContractPayload(
    { dia_fixo_vencimento: '5' },
    decision('APROVADO_COM_CONDICAO', 'RESTRICAO_TELECOM', 'PRE_PAGO', 250),
    config,
    '5',
    now
);
assert.strictEqual(telecomRestriction.id_tipo_contrato, '39');
assert.strictEqual(telecomRestriction.dia_fixo_vencimento, '20');
assert.strictEqual(telecomRestriction.taxa_instalacao, '250.00');
assert.strictEqual(telecomRestriction.ativacao_numero_parcelas, '1');
assert.strictEqual(telecomRestriction.ativacao_valor_parcela, '250.00');

const backendOverridesFrontend = applyCreditDecisionToIxcContractPayload(
    {
        dia_fixo_vencimento: '5',
        id_tipo_contrato: '999',
        taxa_instalacao: '999.00',
        id_cond_pag_ativ: 'PARCELADO',
        ativacao_numero_parcelas: '12',
        ativacao_valor_parcela: '1.00',
        ativacao_vencimentos: '01/01/2099',
        id_produto_ativ: 'INJETADO',
        id_tipo_doc_ativ: 'INJETADO'
    },
    decision('APROVADO_COM_CONDICAO', 'RESTRICAO_FINANCEIRA', 'PRE_PAGO', 999),
    config,
    '5',
    now
);
assert.strictEqual(backendOverridesFrontend.id_tipo_contrato, '39');
assert.strictEqual(backendOverridesFrontend.dia_fixo_vencimento, '20');
assert.strictEqual(backendOverridesFrontend.taxa_instalacao, '150.00');
assert.strictEqual(backendOverridesFrontend.ativacao_numero_parcelas, '1');
assert.strictEqual(backendOverridesFrontend.ativacao_valor_parcela, '150.00');

const noRestrictionClearsActivation = applyCreditDecisionToIxcContractPayload(
    {
        dia_fixo_vencimento: '10',
        id_cond_pag_ativ: 'INJETADO',
        ativacao_numero_parcelas: '8',
        ativacao_valor_parcela: '99.00',
        ativacao_vencimentos: '01/01/2099',
        id_produto_ativ: 'INJETADO',
        id_tipo_doc_ativ: 'INJETADO'
    },
    approvedDecision,
    config,
    '10',
    now
);
assert.strictEqual(noRestrictionClearsActivation.id_tipo_contrato, '10');
assert.strictEqual(noRestrictionClearsActivation.id_cond_pag_ativ, undefined);
assert.strictEqual(noRestrictionClearsActivation.ativacao_numero_parcelas, undefined);
assert.strictEqual(noRestrictionClearsActivation.id_produto_ativ, undefined);

assert.deepStrictEqual(getActivationBillingResult('0.00'), { status: 'NAO_APLICAVEL', mensagem: null });
assert.strictEqual(getActivationBillingResult('150.00').status, 'PENDENTE_FATURAR_ATIVACAO');

assertCreditError(
    () => applyCreditDecisionToIxcContractPayload({}, decision('BLOQUEADO', 'RESTRICAO_FINANCEIRA', null, null), config, '5', now),
    'CREDIT_DECISION_BLOCKED'
);
assertCreditError(
    () => applyCreditDecisionToIxcContractPayload({}, decision('ANALISE_MANUAL', 'ANALISE_MANUAL', null, null), config, '5', now),
    'CREDIT_MANUAL_REVIEW_REQUIRED'
);

function billingParams(taxa = 150) {
    return {
        auditoriaId: 77,
        idContrato: '9001',
        idCliente: '3001',
        taxaAtivacao: taxa,
        idProdutoAtivacao: '9045',
        idTipoDocumentoAtivacao: '501',
        idCondicaoPagamento: '1',
        idFilial: '3',
        idVendedor: '12',
        idResponsavel: '12',
        vencimento: '17/07/2026',
        requestId: 'teste-ixc-ativacao',
        analiseCreditoId: 88,
        usuario: 'teste'
    };
}

function fakeAudit(initial = {}) {
    const state = {
        status: 'PENDENTE_FATURAR_ATIVACAO',
        idVdSaida: null,
        idFnAReceber: null,
        messages: [],
        ...initial
    };
    return {
        state,
        store: {
            async get() {
                return {
                    id: 77,
                    analiseCreditoId: 88,
                    idContratoIxc: '9001',
                    status: state.status,
                    idVdSaida: state.idVdSaida,
                    idFnAReceber: state.idFnAReceber
                };
            },
            async tryStart(_auditId, existingSaleId) {
                if (state.status === 'FATURADO' || state.status === 'PROCESSANDO_FATURAMENTO') return false;
                if (!existingSaleId && !['PENDENTE_FATURAR_ATIVACAO', 'ERRO_SEM_VENDA'].includes(state.status)) return false;
                state.status = 'PROCESSANDO_FATURAMENTO';
                return true;
            },
            async saveSaleId(_auditId, idSaida) {
                if (state.idVdSaida) throw new Error('Venda ja salva');
                state.idVdSaida = String(idSaida);
            },
            async finish(_auditId, status, mensagem, idFnAReceber) {
                state.status = status;
                state.idFnAReceber = idFnAReceber || state.idFnAReceber;
                state.messages.push(mensagem);
            }
        }
    };
}

function fakeRequester(handler) {
    const calls = [];
    const requester = async (method, endpoint, data, operationType, context) => {
        calls.push({ method, endpoint, data, operationType, context });
        return handler({ method, endpoint, data, operationType, context, calls });
    };
    return { calls, requester };
}

function financial(idSaida, valor) {
    return {
        id: `fin-${idSaida}`,
        id_saida: String(idSaida),
        id_contrato: '9001',
        valor: Number(valor).toFixed(2),
        obs: 'Taxa de ativacao do contrato',
        liberado: 'S',
        status: 'A'
    };
}

function sale(idSaida, valor) {
    return {
        id: String(idSaida),
        id_contrato: '0',
        id_contrato_avulso: '9001',
        valor_total: Number(valor).toFixed(2),
        valor_produto_ativacao: Number(valor).toFixed(2),
        id_produto_ativacao: '9045',
        criada_contrato_taxa_ativacao: 'S'
    };
}

async function runActivationBillingTests() {
    {
        const audit = fakeAudit();
        const http = fakeRequester(() => { throw new Error('Nao deveria chamar IXC'); });
        const result = await faturarAtivacaoContrato(billingParams(0), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: true
        });
        assert.strictEqual(result.status, 'NAO_APLICAVEL');
        assert.strictEqual(http.calls.length, 0, 'taxa 0 nao chama faturamento');
    }

    for (const value of [150, 250]) {
        const audit = fakeAudit();
        const http = fakeRequester(() => { throw new Error('Nao deveria chamar IXC'); });
        const result = await faturarAtivacaoContrato(billingParams(value), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: false
        });
        assert.strictEqual(result.status, 'PENDENTE_FATURAR_ATIVACAO');
        assert.strictEqual(http.calls.length, 0, `taxa ${value} com flag false nao chama IXC`);
    }

    {
        const audit = fakeAudit();
        const http = fakeRequester(({ endpoint }) => {
            if (endpoint === '/fn_areceber') return { registros: [financial('490', 150)] };
            if (endpoint === '/vd_saida') return { registros: [sale('490', 150)] };
            throw new Error(`Endpoint inesperado ${endpoint}`);
        });
        const result = await faturarAtivacaoContrato(billingParams(150), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: true
        });
        assert.strictEqual(result.status, 'FATURADO');
        assert.strictEqual(http.calls[0].endpoint, '/fn_areceber', 'consulta financeiro antes de criar venda');
        assert.strictEqual(http.calls.filter(call => call.endpoint === '/vd_saida' && call.operationType === 'incluir').length, 0);
    }

    {
        const audit = fakeAudit();
        const http = fakeRequester(({ endpoint, operationType }) => {
            if (endpoint === '/fn_areceber') return { registros: [] };
            if (endpoint === '/vd_saida' && operationType === 'listar') return { registros: [sale('489', 150)] };
            if (endpoint === '/validar_finalizar_saida') throw new Error('Venda aberta sem financeiro confirmado');
            throw new Error(`Endpoint inesperado ${endpoint}`);
        });
        const result = await faturarAtivacaoContrato(billingParams(150), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: true
        });
        assert.strictEqual(result.status, 'VENDA_ATIVACAO_GERADA');
        assert.strictEqual(audit.state.idVdSaida, '489');
        assert.strictEqual(http.calls.filter(call => call.endpoint === '/vd_saida' && call.operationType === 'incluir').length, 0,
            'vd_saida localizada por id_contrato_avulso impede nova venda');
        assert.ok(http.calls.some(call => call.endpoint === '/vd_saida'
            && call.operationType === 'listar'
            && call.data.qtype === 'vd_saida.id_contrato_avulso'));
    }

    {
        const audit = fakeAudit();
        const http = fakeRequester(({ endpoint, operationType }) => {
            if (endpoint === '/fn_areceber') return { registros: [] };
            if (endpoint === '/vd_saida' && operationType === 'listar') return { registros: [sale('488', 150)] };
            if (endpoint === '/validar_finalizar_saida') return { type: 'success' };
            throw new Error(`Endpoint inesperado ${endpoint}`);
        });
        const result = await faturarAtivacaoContrato(billingParams(150), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: true
        });
        assert.strictEqual(result.status, 'VENDA_ATIVACAO_GERADA');
        assert.strictEqual(audit.state.status, 'VENDA_ATIVACAO_GERADA');
        assert.strictEqual(http.calls.filter(call => call.endpoint === '/vd_saida' && call.operationType === 'incluir').length, 0);
    }

    {
        const audit = fakeAudit({ idVdSaida: '490', status: 'ERRO_FATURAR_ATIVACAO' });
        const http = fakeRequester(({ endpoint }) => {
            if (endpoint === '/validar_finalizar_saida') return { type: 'success' };
            if (endpoint === '/fn_areceber') return { registros: [financial('490', 150)] };
            if (endpoint === '/vd_saida') return { registros: [sale('490', 150)] };
            throw new Error(`Endpoint inesperado ${endpoint}`);
        });
        const result = await faturarAtivacaoContrato(billingParams(150), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: true
        });
        assert.strictEqual(result.status, 'FATURADO');
        assert.strictEqual(http.calls.filter(call => call.endpoint === '/vd_saida' && call.operationType === 'incluir').length, 0,
            'id_vd_saida salvo impede segunda venda');
    }

    {
        const audit = fakeAudit();
        let afterCreate = false;
        const http = fakeRequester(({ endpoint, operationType }) => {
            if (endpoint === '/fn_areceber') return { registros: [] };
            if (endpoint === '/vd_saida' && operationType === 'listar') return { registros: afterCreate ? [sale('491', 150)] : [] };
            if (endpoint === '/vd_saida' && operationType === 'incluir') {
                afterCreate = true;
                return { id: '491' };
            }
            if (endpoint === '/validar_finalizar_saida') throw new Error('Falha simulada ao finalizar');
            throw new Error(`Endpoint inesperado ${endpoint}`);
        });
        const result = await faturarAtivacaoContrato(billingParams(150), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: true,
            now: () => now
        });
        assert.strictEqual(result.status, 'VENDA_ATIVACAO_GERADA');
        assert.strictEqual(http.calls.filter(call => call.endpoint === '/vd_saida' && call.operationType === 'incluir').length, 1,
            'erro ao finalizar nunca cria segunda venda');
        assert.strictEqual(audit.state.idVdSaida, '491');
    }

    {
        const audit = fakeAudit();
        const http = fakeRequester(({ endpoint, operationType }) => {
            if (endpoint === '/fn_areceber' || (endpoint === '/vd_saida' && operationType === 'listar')) {
                return { registros: [] };
            }
            if (endpoint === '/vd_saida' && operationType === 'incluir') {
                return { type: 'error', message: 'Periodo invalido' };
            }
            throw new Error(`Endpoint inesperado ${endpoint}`);
        });
        const result = await faturarAtivacaoContrato(billingParams(150), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: true,
            now: () => now
        });
        assert.strictEqual(result.status, 'ERRO_FATURAR_ATIVACAO');
        assert.strictEqual(audit.state.status, 'ERRO_SEM_VENDA', 'rejeicao explicita do IXC permite reprocessamento seguro');
        assert.strictEqual(audit.state.idVdSaida, null);
        assert.strictEqual(http.calls.filter(call => call.endpoint === '/vd_saida' && call.operationType === 'incluir').length, 1);
    }

    {
        const audit = fakeAudit();
        let finalized = false;
        const http = fakeRequester(({ endpoint, operationType }) => {
            if (endpoint === '/fn_areceber') return { registros: finalized ? [financial('492', 250)] : [] };
            if (endpoint === '/vd_saida' && operationType === 'listar') return { registros: finalized ? [sale('492', 250)] : [] };
            if (endpoint === '/vd_saida' && operationType === 'incluir') return { id: '492' };
            if (endpoint === '/validar_finalizar_saida') {
                finalized = true;
                return { type: 'success' };
            }
            throw new Error(`Endpoint inesperado ${endpoint}`);
        });
        const result = await faturarAtivacaoContrato(billingParams(250), {
            requestIxc: http.requester, auditStore: audit.store, automaticEnabled: true,
            now: () => now
        });
        assert.strictEqual(result.status, 'FATURADO');
        assert.strictEqual(audit.state.idFnAReceber, 'fin-492');
        const creationCalls = http.calls.filter(call => call.endpoint === '/vd_saida' && call.operationType === 'incluir');
        assert.strictEqual(creationCalls.length, 1);
        assert.strictEqual(creationCalls[0].context.disableRetry, true);
        assert.strictEqual(creationCalls[0].data.id_contrato, '0');
        assert.strictEqual(creationCalls[0].data.id_contrato_avulso, '9001');
        assert.strictEqual(creationCalls[0].data.gera_estoque, 'S');
        assert.strictEqual(creationCalls[0].data.tributacao_digitada, 'N');
        assert.strictEqual(creationCalls[0].data.id_produto_ativacao, '9045');
        assert.strictEqual(creationCalls[0].data.valor_produto_ativacao, '250.00');
        assert.strictEqual(creationCalls[0].data.id_condicao_pagamento, '1');
        assert.strictEqual(creationCalls[0].data.id_tipo_documento, '501');
        assert.strictEqual(creationCalls[0].data.data_emissao, '17/07/2026');
        assert.strictEqual(creationCalls[0].data.data_saida, '17/07/2026');
        assert.strictEqual(creationCalls[0].data.data_vencimento_areceber, '17/07/2026');
    }

    console.log('OK: regras de credito e faturamento da ativacao IXC validadas (27 cenarios).');
}

runActivationBillingTests().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
