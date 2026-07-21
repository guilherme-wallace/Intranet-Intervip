"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.faturarAtivacaoContrato = exports.validarFinalizarSaida = exports.criarVdSaidaAtivacao = exports.buildVdSaidaActivationPayload = exports.findActivationFinancialCandidate = exports.findActivationSaleCandidate = exports.listarVdSaidaPorContrato = exports.listarFnAReceberPorContrato = exports.isAutomaticActivationBillingEnabled = exports.defaultActivationBillingAuditStore = exports.ACTIVATION_SALE_CREATED_MESSAGE = exports.ACTIVATION_FINANCIAL_NOT_FOUND_MESSAGE = exports.ACTIVATION_ALREADY_BILLED_MESSAGE = exports.AUTOMATIC_ACTIVATION_BILLING_ERROR_MESSAGE = exports.AUTOMATIC_ACTIVATION_BILLING_SUCCESS_MESSAGE = void 0;
const database_1 = require("../../api/database");
const logger_1 = require("../../api/logger");
const agendaService_1 = require("../../routes/api/v5/agendaService");
const ixcCreditContractService_1 = require("./ixcCreditContractService");
exports.AUTOMATIC_ACTIVATION_BILLING_SUCCESS_MESSAGE = 'Contrato criado e taxa de ativacao faturada automaticamente no IXC.';
exports.AUTOMATIC_ACTIVATION_BILLING_ERROR_MESSAGE = 'Contrato criado, mas nao foi possivel faturar automaticamente a taxa de ativacao. Verifique o contrato no IXC antes de tentar novamente para evitar cobranca duplicada.';
exports.ACTIVATION_ALREADY_BILLED_MESSAGE = 'Taxa de ativacao ja encontrada no financeiro do IXC. Nenhuma nova venda foi gerada.';
exports.ACTIVATION_FINANCIAL_NOT_FOUND_MESSAGE = 'Venda de ativacao finalizada, mas nao foi encontrado titulo financeiro correspondente em fn_areceber.';
exports.ACTIVATION_SALE_CREATED_MESSAGE = 'Contrato criado e taxa de ativacao gerada no IXC. A venda foi vinculada ao contrato e protegida contra duplicidade.';
function executeDb(query, params = []) {
    return new Promise((resolve, reject) => {
        database_1.LOCALHOST.query(query, params, (error, results) => {
            if (error)
                return reject(error);
            resolve(results);
        });
    });
}
function mapAuditRow(row) {
    if (!row)
        return null;
    return {
        id: Number(row.id),
        analiseCreditoId: Number(row.analise_credito_id),
        idContratoIxc: row.id_contrato_ixc ? String(row.id_contrato_ixc) : null,
        status: String(row.status_faturamento_ativacao),
        idVdSaida: row.id_vd_saida_ativacao ? String(row.id_vd_saida_ativacao) : null,
        idFnAReceber: row.id_fn_areceber_ativacao ? String(row.id_fn_areceber_ativacao) : null
    };
}
exports.defaultActivationBillingAuditStore = {
    get(auditoriaId, analiseCreditoId, idContrato) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, ixcCreditContractService_1.ensureCreditContractAuditTable)();
            const rows = yield executeDb(`SELECT id, analise_credito_id, id_contrato_ixc, status_faturamento_ativacao,
                    id_vd_saida_ativacao, id_fn_areceber_ativacao
             FROM ivp_contrato_credito_auditoria
             WHERE id = ? AND analise_credito_id = ? AND id_contrato_ixc = ?
             LIMIT 1`, [auditoriaId, analiseCreditoId, String(idContrato)]);
            return mapAuditRow(rows === null || rows === void 0 ? void 0 : rows[0]);
        });
    },
    tryStart(auditoriaId, existingSaleId = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const withExistingSale = Boolean(existingSaleId);
            const result = yield executeDb(withExistingSale
                ? `UPDATE ivp_contrato_credito_auditoria
                   SET status_faturamento_ativacao = 'PROCESSANDO_FATURAMENTO',
                       mensagem_faturamento_ativacao = 'Reprocessando a finalizacao da venda de ativacao existente.',
                       faturamento_ativacao_started_at = NOW(),
                       faturamento_ativacao_finished_at = NULL
                   WHERE id = ? AND id_vd_saida_ativacao = ?
                     AND status_faturamento_ativacao != 'FATURADO'
                     AND (
                         status_faturamento_ativacao != 'PROCESSANDO_FATURAMENTO'
                         OR faturamento_ativacao_started_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                     )`
                : `UPDATE ivp_contrato_credito_auditoria
                   SET status_faturamento_ativacao = 'PROCESSANDO_FATURAMENTO',
                       mensagem_faturamento_ativacao = 'Verificando duplicidade antes de faturar a ativacao.',
                       faturamento_ativacao_started_at = COALESCE(faturamento_ativacao_started_at, NOW()),
                       faturamento_ativacao_finished_at = NULL
                   WHERE id = ? AND id_vd_saida_ativacao IS NULL
                     AND status_faturamento_ativacao IN ('PENDENTE_FATURAR_ATIVACAO', 'ERRO_SEM_VENDA')`, withExistingSale ? [auditoriaId, String(existingSaleId)] : [auditoriaId]);
            return Number((result === null || result === void 0 ? void 0 : result.affectedRows) || 0) === 1;
        });
    },
    saveSaleId(auditoriaId, idSaida) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield executeDb(`UPDATE ivp_contrato_credito_auditoria
             SET id_vd_saida_ativacao = ?,
                 mensagem_faturamento_ativacao = 'Venda de ativacao criada; finalizacao pendente.'
             WHERE id = ? AND status_faturamento_ativacao = 'PROCESSANDO_FATURAMENTO'
               AND id_vd_saida_ativacao IS NULL`, [String(idSaida), auditoriaId]);
            if (Number((result === null || result === void 0 ? void 0 : result.affectedRows) || 0) !== 1) {
                throw new Error('Nao foi possivel salvar o id da vd_saida na auditoria. Nenhuma nova venda deve ser criada.');
            }
        });
    },
    finish(auditoriaId, status, mensagem, idFnAReceber = null) {
        return __awaiter(this, void 0, void 0, function* () {
            yield executeDb(`UPDATE ivp_contrato_credito_auditoria
             SET status_faturamento_ativacao = ?, mensagem_faturamento_ativacao = ?,
                 id_fn_areceber_ativacao = COALESCE(?, id_fn_areceber_ativacao),
                 faturamento_ativacao_finished_at = NOW()
             WHERE id = ?`, [status, String(mensagem).slice(0, 500), idFnAReceber ? String(idFnAReceber) : null, auditoriaId]);
        });
    }
};
const defaultRequester = (method, endpoint, data, operationType, context) => agendaService_1.AgendaService.makeIxcRequest(method, endpoint, data, operationType, context);
function isAutomaticActivationBillingEnabled(env = process.env) {
    return String(env.IXC_FATURAR_ATIVACAO_AUTOMATICO || 'false').trim().toLowerCase() === 'true';
}
exports.isAutomaticActivationBillingEnabled = isAutomaticActivationBillingEnabled;
function recordsFromResponse(response) {
    return Array.isArray(response === null || response === void 0 ? void 0 : response.registros) ? response.registros : [];
}
function listFilter(table, idContrato, includeFinancialGrid = false, contractField = 'id_contrato') {
    const filter = {
        qtype: `${table}.${contractField}`,
        query: String(idContrato),
        oper: '=',
        rp: '200000',
        sortname: table === 'fn_areceber' ? 'fn_areceber.data_vencimento' : 'vd_saida.id',
        sortorder: table === 'fn_areceber' ? 'asc' : 'desc'
    };
    if (includeFinancialGrid) {
        filter.grid_param = JSON.stringify([
            { TB: 'fn_areceber.liberado', OP: '=', P: 'S' },
            { TB: 'fn_areceber.status', OP: '!=', P: 'C' },
            { TB: 'fn_areceber.status', OP: '!=', P: 'R' }
        ]);
    }
    return filter;
}
function listarFnAReceberPorContrato(idContrato, requestIxc = defaultRequester, context = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield requestIxc('GET', '/fn_areceber', listFilter('fn_areceber', idContrato, true), 'listar', context);
        return recordsFromResponse(response);
    });
}
exports.listarFnAReceberPorContrato = listarFnAReceberPorContrato;
function listarVdSaidaPorContrato(idContrato, requestIxc = defaultRequester, context = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        // O botao "Faturar ativacao/instalacao" do IXC vincula a venda avulsa ao
        // contrato por vd_saida.id_contrato_avulso e mantem id_contrato = 0.
        // Consultamos tambem id_contrato para reconhecer vendas criadas pela
        // primeira versao desta integracao e nunca gerar uma cobranca duplicada.
        const avulsaResponse = yield requestIxc('GET', '/vd_saida', listFilter('vd_saida', idContrato, false, 'id_contrato_avulso'), 'listar', context);
        let legacyRecords = [];
        try {
            const legacyResponse = yield requestIxc('GET', '/vd_saida', listFilter('vd_saida', idContrato, false, 'id_contrato'), 'listar', context);
            legacyRecords = recordsFromResponse(legacyResponse);
        }
        catch (error) {
            // A consulta avulsa e a fonte de verdade atual. Este fallback existe
            // somente para vendas legadas e nao deve derrubar o fluxo novo.
            (0, logger_1.logWarn)('IXC.Ativacao.ConsultaVendaLegada', 'Falha ao consultar vinculo legado de vd_saida.', {
                requestId: context.requestId,
                idContrato,
                message: technicalSummary(error)
            });
        }
        const unique = new Map();
        [...recordsFromResponse(avulsaResponse), ...legacyRecords].forEach((record, index) => {
            const key = String((record === null || record === void 0 ? void 0 : record.id) || (record === null || record === void 0 ? void 0 : record.id_saida) || `sem-id-${index}`);
            if (!unique.has(key))
                unique.set(key, record);
        });
        return Array.from(unique.values());
    });
}
exports.listarVdSaidaPorContrato = listarVdSaidaPorContrato;
function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}
function moneyInCents(value) {
    const normalized = typeof value === 'string'
        ? value.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
        : value;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
function recordAmount(record) {
    for (const field of ['valor', 'valor_total', 'valor_produto_ativacao', 'valor_original', 'valor_documento']) {
        const amount = moneyInCents(record === null || record === void 0 ? void 0 : record[field]);
        if (amount !== null)
            return amount;
    }
    return null;
}
function activationTerms(record) {
    const text = normalizeText([
        record === null || record === void 0 ? void 0 : record.obs,
        record === null || record === void 0 ? void 0 : record.historico,
        record === null || record === void 0 ? void 0 : record.descricao,
        record === null || record === void 0 ? void 0 : record.documento,
        record === null || record === void 0 ? void 0 : record.tipo_recebimento,
        record === null || record === void 0 ? void 0 : record.origem
    ].filter(Boolean).join(' '));
    return ['TAXA', 'INSTALACAO', 'ATIVACAO'].some(term => text.includes(term));
}
function recordProduct(record) {
    return String((record === null || record === void 0 ? void 0 : record.id_produto_ativacao) || (record === null || record === void 0 ? void 0 : record.id_produto) || '').trim();
}
function findActivationSaleCandidate(records, params) {
    const expectedAmount = moneyInCents(params.taxaAtivacao);
    return records.find(record => {
        const linkedContract = String((record === null || record === void 0 ? void 0 : record.id_contrato_avulso) || '') === String(params.idContrato)
            || String((record === null || record === void 0 ? void 0 : record.id_contrato) || '') === String(params.idContrato);
        if (!linkedContract)
            return false;
        if (recordAmount(record) !== expectedAmount)
            return false;
        const product = recordProduct(record);
        const hasContext = Boolean(product || (record === null || record === void 0 ? void 0 : record.obs) || (record === null || record === void 0 ? void 0 : record.historico) || (record === null || record === void 0 ? void 0 : record.descricao) || (record === null || record === void 0 ? void 0 : record.criada_contrato_taxa_ativacao));
        return !hasContext
            || product === String(params.idProdutoAtivacao)
            || String((record === null || record === void 0 ? void 0 : record.criada_contrato_taxa_ativacao) || '').toUpperCase() === 'S'
            || activationTerms(record);
    }) || null;
}
exports.findActivationSaleCandidate = findActivationSaleCandidate;
function findActivationFinancialCandidate(records, params, activationSales = []) {
    const expectedAmount = moneyInCents(params.taxaAtivacao);
    const saleIds = new Set(activationSales
        .filter(record => findActivationSaleCandidate([record], params))
        .map(record => String((record === null || record === void 0 ? void 0 : record.id) || (record === null || record === void 0 ? void 0 : record.id_saida) || ''))
        .filter(Boolean));
    return records.find(record => {
        if (String((record === null || record === void 0 ? void 0 : record.id_contrato) || '') !== String(params.idContrato))
            return false;
        if (recordAmount(record) !== expectedAmount)
            return false;
        const idSaida = String((record === null || record === void 0 ? void 0 : record.id_saida) || '').trim();
        if (idSaida && saleIds.has(idSaida))
            return true;
        const product = recordProduct(record);
        const hasContext = Boolean(product || (record === null || record === void 0 ? void 0 : record.obs) || (record === null || record === void 0 ? void 0 : record.historico) || (record === null || record === void 0 ? void 0 : record.descricao));
        return !hasContext || product === String(params.idProdutoAtivacao) || activationTerms(record);
    }) || null;
}
exports.findActivationFinancialCandidate = findActivationFinancialCandidate;
function formatDmy(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}
function normalizeIxcDate(value, fallback) {
    const text = String(value || '').trim();
    const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmy)
        return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;
    const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return ymd ? `${ymd[3]}/${ymd[2]}/${ymd[1]}` : formatDmy(fallback);
}
function requiredText(value, name) {
    const text = String(value || '').trim();
    if (!text)
        throw new Error(`Configuracao obrigatoria ausente para faturar ativacao: ${name}.`);
    return text;
}
function buildVdSaidaActivationPayload(params, now = new Date()) {
    const amount = moneyInCents(params.taxaAtivacao);
    if (![15000, 25000].includes(Number(amount))) {
        throw new Error('A taxa de ativacao automatica deve ser exatamente 150.00 ou 250.00.');
    }
    const formattedAmount = (Number(amount) / 100).toFixed(2);
    const payload = {
        tributacao_digitada: 'N',
        id_tipo_documento: requiredText(params.idTipoDocumentoAtivacao, 'IXC_TIPO_DOC_ATIVACAO_ID'),
        id_cliente: requiredText(params.idCliente, 'id_cliente'),
        id_condicao_pagamento: requiredText(params.idCondicaoPagamento, 'IXC_COND_PAG_ATIVACAO_UNICA_ID'),
        filial_id: String(params.idFilial || '').trim(),
        data_emissao: formatDmy(now),
        data_saida: formatDmy(now),
        valor_total: formattedAmount,
        indFinal: '1',
        indPres: '1',
        documento: '',
        obs: `Taxa de ativacao/instalacao do contrato ${requiredText(params.idContrato, 'id_contrato')}. Parcela unica.`,
        status: 'A',
        impresso: 'N',
        criada_contrato_taxa_ativacao: 'S',
        gera_estoque: 'S',
        previsao: 'N',
        // Este e o vinculo utilizado pelo faturamento manual do contrato no IXC.
        // Nao trocar por id_contrato: repetir vd_saida gera cobranca duplicada.
        id_contrato: '0',
        id_contrato_avulso: requiredText(params.idContrato, 'id_contrato_avulso'),
        status_fat_os: '0',
        id_produto_ativacao: requiredText(params.idProdutoAtivacao, 'IXC_PRODUTO_TAXA_ATIVACAO_ID'),
        operador: String(params.idResponsavel || '').trim(),
        valor_produto_ativacao: formattedAmount,
        data_vencimento_areceber: normalizeIxcDate(params.vencimento, now),
        modalidade_frete: '9',
        informar_local_entrega: 'N',
        cnpj_venda: 'S',
        razao_venda: 'S',
        id_comissionado: String(params.idVendedor || '').trim()
    };
    Object.keys(payload).forEach(key => {
        if (payload[key] === '' && ['filial_id', 'operador', 'id_comissionado'].includes(key))
            delete payload[key];
    });
    return payload;
}
exports.buildVdSaidaActivationPayload = buildVdSaidaActivationPayload;
function assertIxcOperationSuccess(response, operation) {
    const type = normalizeText((response === null || response === void 0 ? void 0 : response.type) || (response === null || response === void 0 ? void 0 : response.tipo) || '');
    if ((response === null || response === void 0 ? void 0 : response.success) === false || type === 'ERROR' || type === 'ERRO') {
        const error = new Error(String((response === null || response === void 0 ? void 0 : response.message) || (response === null || response === void 0 ? void 0 : response.mensagem) || (response === null || response === void 0 ? void 0 : response.msg) || `Falha no IXC ao ${operation}.`));
        // O IXC respondeu e rejeitou a inclusao antes de devolver um id_saida.
        // Diferente de timeout/queda de rede, esta falha pode ser reprocessada
        // depois da correcao sem presumir que uma venda foi criada.
        error.ixcDefinitiveFailure = true;
        throw error;
    }
}
function responseId(response) {
    var _a, _b;
    const value = (response === null || response === void 0 ? void 0 : response.id) || (response === null || response === void 0 ? void 0 : response.id_saida) || (response === null || response === void 0 ? void 0 : response.registro_id) || (response === null || response === void 0 ? void 0 : response.id_registro) || ((_b = (_a = response === null || response === void 0 ? void 0 : response.registros) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id);
    return value === null || typeof value === 'undefined' || String(value).trim() === '' ? null : String(value);
}
function criarVdSaidaAtivacao(params, requestIxc = defaultRequester, now = new Date()) {
    return __awaiter(this, void 0, void 0, function* () {
        const payload = buildVdSaidaActivationPayload(params, now);
        // Nunca habilitar retry nesta insercao. Um timeout nao comprova que a
        // venda deixou de ser gravada e repetir vd_saida gera cobranca duplicada.
        const response = yield requestIxc('POST', '/vd_saida', payload, 'incluir', {
            requestId: params.requestId,
            usuario: params.usuario,
            disableRetry: true
        });
        assertIxcOperationSuccess(response, 'criar a venda de ativacao');
        const idSaida = responseId(response);
        if (!idSaida)
            throw new Error('IXC criou a vd_saida sem retornar um id_saida identificavel. Nao tente criar outra venda.');
        return { idSaida, response, payload };
    });
}
exports.criarVdSaidaAtivacao = criarVdSaidaAtivacao;
function validarFinalizarSaida(idSaida, requestIxc = defaultRequester, context = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield requestIxc('GET', '/validar_finalizar_saida', { id_saida: String(idSaida) }, null, context);
        assertIxcOperationSuccess(response, 'validar/finalizar a venda de ativacao');
        return response;
    });
}
exports.validarFinalizarSaida = validarFinalizarSaida;
function result(status, mensagem) {
    return { status, mensagem };
}
function technicalSummary(error) {
    return String((error === null || error === void 0 ? void 0 : error.message) || error || 'Falha desconhecida').replace(/\s+/g, ' ').slice(0, 240);
}
function finishAndConfirmExistingSale(params, idSaida, requestIxc, auditStore) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = { requestId: params.requestId, usuario: params.usuario };
        try {
            yield validarFinalizarSaida(idSaida, requestIxc, context);
        }
        catch (error) {
            // A resposta pode ter se perdido depois de o IXC concluir a venda.
            // Conferimos o financeiro antes de declarar falha, sempre reutilizando
            // o mesmo id_saida e nunca criando outra vd_saida.
            try {
                const [financials, sales] = yield Promise.all([
                    listarFnAReceberPorContrato(params.idContrato, requestIxc, context),
                    listarVdSaidaPorContrato(params.idContrato, requestIxc, context)
                ]);
                const candidate = findActivationFinancialCandidate(financials, params, sales);
                if (candidate) {
                    const idFinancial = responseId(candidate);
                    yield auditStore.finish(params.auditoriaId, 'FATURADO', exports.AUTOMATIC_ACTIVATION_BILLING_SUCCESS_MESSAGE, idFinancial);
                    (0, logger_1.logInfo)('IXC.Ativacao.FinanceiroConfirmado', 'Titulo de ativacao confirmado depois da finalizacao.', {
                        requestId: params.requestId,
                        idContrato: params.idContrato,
                        idCliente: params.idCliente,
                        taxaEsperada: Number(params.taxaAtivacao).toFixed(2),
                        idSaida,
                        idFnAReceber: idFinancial,
                        status: 'FATURADO'
                    });
                    return result('FATURADO', exports.AUTOMATIC_ACTIVATION_BILLING_SUCCESS_MESSAGE);
                }
            }
            catch (verificationError) {
                (0, logger_1.logWarn)('IXC.Ativacao.VerificacaoAposErro', 'Nao foi possivel confirmar o financeiro depois da falha de finalizacao.', {
                    requestId: params.requestId,
                    idContrato: params.idContrato,
                    idSaida,
                    message: technicalSummary(verificationError)
                });
            }
            // O id_saida ja foi localizado/criado e salvo antes desta chamada. Isso
            // comprova a geracao da venda e e suficiente para bloquear outra vd_saida,
            // mesmo que o IXC ainda nao tenha disponibilizado um fn_areceber.
            const message = `${exports.ACTIVATION_SALE_CREATED_MESSAGE} Finalizacao/financeiro ainda nao confirmado: ${technicalSummary(error)}`;
            yield auditStore.finish(params.auditoriaId, 'VENDA_ATIVACAO_GERADA', message);
            (0, logger_1.logWarn)('IXC.Ativacao.VendaGeradaSemFinanceiro', 'Venda da ativacao existe; nenhuma nova vd_saida sera criada.', {
                requestId: params.requestId,
                idContrato: params.idContrato,
                idCliente: params.idCliente,
                taxaEsperada: Number(params.taxaAtivacao).toFixed(2),
                idSaida,
                status: 'VENDA_ATIVACAO_GERADA',
                finalizacao: technicalSummary(error)
            });
            return result('VENDA_ATIVACAO_GERADA', exports.ACTIVATION_SALE_CREATED_MESSAGE);
        }
        const [financials, sales] = yield Promise.all([
            listarFnAReceberPorContrato(params.idContrato, requestIxc, context),
            listarVdSaidaPorContrato(params.idContrato, requestIxc, context)
        ]);
        const candidate = findActivationFinancialCandidate(financials, params, sales);
        if (candidate) {
            const idFinancial = responseId(candidate);
            yield auditStore.finish(params.auditoriaId, 'FATURADO', exports.AUTOMATIC_ACTIVATION_BILLING_SUCCESS_MESSAGE, idFinancial);
            (0, logger_1.logInfo)('IXC.Ativacao.FinanceiroConfirmado', 'Titulo de ativacao confirmado em fn_areceber.', {
                requestId: params.requestId,
                idContrato: params.idContrato,
                idCliente: params.idCliente,
                taxaEsperada: Number(params.taxaAtivacao).toFixed(2),
                idSaida,
                idFnAReceber: idFinancial,
                status: 'FATURADO'
            });
            return result('FATURADO', exports.AUTOMATIC_ACTIVATION_BILLING_SUCCESS_MESSAGE);
        }
        const message = `${exports.ACTIVATION_SALE_CREATED_MESSAGE} ${exports.ACTIVATION_FINANCIAL_NOT_FOUND_MESSAGE}`;
        yield auditStore.finish(params.auditoriaId, 'VENDA_ATIVACAO_GERADA', message);
        return result('VENDA_ATIVACAO_GERADA', exports.ACTIVATION_SALE_CREATED_MESSAGE);
    });
}
function faturarAtivacaoContrato(params, dependencies = {}) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const startedAt = Date.now();
        const requestIxc = dependencies.requestIxc || defaultRequester;
        const auditStore = dependencies.auditStore || exports.defaultActivationBillingAuditStore;
        const automaticEnabled = typeof dependencies.automaticEnabled === 'boolean'
            ? dependencies.automaticEnabled
            : isAutomaticActivationBillingEnabled();
        const context = { requestId: params.requestId, usuario: params.usuario };
        const amount = moneyInCents(params.taxaAtivacao);
        let finalStatus = 'NAO_APLICAVEL';
        if (!amount || amount <= 0)
            return result(finalStatus, 'Taxa de ativacao isenta; faturamento nao aplicavel.');
        if (!automaticEnabled) {
            finalStatus = 'PENDENTE_FATURAR_ATIVACAO';
            return result(finalStatus, ixcCreditContractService_1.MANUAL_ACTIVATION_BILLING_MESSAGE);
        }
        let stage = 'ANTES_DA_VENDA';
        let idSaida = null;
        try {
            const audit = yield auditStore.get(params.auditoriaId, params.analiseCreditoId, params.idContrato);
            if (!audit)
                throw new Error('Auditoria do contrato nao encontrada; faturamento automatico bloqueado.');
            if (audit.status === 'FATURADO') {
                finalStatus = 'FATURADO';
                return result(finalStatus, audit.idFnAReceber
                    ? exports.AUTOMATIC_ACTIVATION_BILLING_SUCCESS_MESSAGE
                    : exports.ACTIVATION_ALREADY_BILLED_MESSAGE);
            }
            idSaida = audit.idVdSaida;
            const acquired = yield auditStore.tryStart(params.auditoriaId, idSaida);
            if (!acquired) {
                finalStatus = 'ERRO_FATURAR_ATIVACAO';
                return result(finalStatus, 'Faturamento da ativacao ja esta em processamento ou exige conciliacao manual. Nenhuma nova venda foi criada.');
            }
            if (idSaida) {
                stage = 'VENDA_SALVA';
                const billingResult = yield finishAndConfirmExistingSale(params, idSaida, requestIxc, auditStore);
                finalStatus = billingResult.status;
                return billingResult;
            }
            // Primeira barreira contra duplicidade: o financeiro pode ter sido
            // gerado por uma operacao anterior/manual ainda nao refletida localmente.
            const [financialsBefore, salesBefore] = yield Promise.all([
                listarFnAReceberPorContrato(params.idContrato, requestIxc, context),
                listarVdSaidaPorContrato(params.idContrato, requestIxc, context)
            ]);
            const existingFinancial = findActivationFinancialCandidate(financialsBefore, params, salesBefore);
            if (existingFinancial) {
                const idFinancial = responseId(existingFinancial);
                yield auditStore.finish(params.auditoriaId, 'FATURADO', exports.ACTIVATION_ALREADY_BILLED_MESSAGE, idFinancial);
                (0, logger_1.logInfo)('IXC.Ativacao.JaFaturada', 'Titulo de ativacao ja existia antes de criar vd_saida.', {
                    requestId: params.requestId,
                    idContrato: params.idContrato,
                    idCliente: params.idCliente,
                    taxaEsperada: (Number(amount) / 100).toFixed(2),
                    idFnAReceber: idFinancial,
                    status: 'FATURADO'
                });
                finalStatus = 'FATURADO';
                return result(finalStatus, exports.ACTIVATION_ALREADY_BILLED_MESSAGE);
            }
            // Segunda barreira: se houve queda depois de criar a venda mas antes de
            // salvar sua identificacao local, reaproveitamos a vd_saida localizada.
            const existingSale = findActivationSaleCandidate(salesBefore, params);
            if (existingSale) {
                idSaida = responseId(existingSale);
                if (!idSaida)
                    throw new Error('Existe vd_saida candidata sem identificador. Faturamento bloqueado para conciliacao manual.');
                yield auditStore.saveSaleId(params.auditoriaId, idSaida);
                stage = 'VENDA_SALVA';
                const billingResult = yield finishAndConfirmExistingSale(params, idSaida, requestIxc, auditStore);
                finalStatus = billingResult.status;
                return billingResult;
            }
            stage = 'CRIANDO_VENDA';
            const created = yield criarVdSaidaAtivacao(params, requestIxc, ((_a = dependencies.now) === null || _a === void 0 ? void 0 : _a.call(dependencies)) || new Date());
            idSaida = created.idSaida;
            yield auditStore.saveSaleId(params.auditoriaId, idSaida);
            stage = 'VENDA_SALVA';
            (0, logger_1.logInfo)('IXC.Ativacao.VendaCriada', 'vd_saida de ativacao criada e salva na auditoria.', {
                requestId: params.requestId,
                idContrato: params.idContrato,
                idCliente: params.idCliente,
                taxaEsperada: (Number(amount) / 100).toFixed(2),
                idSaida
            });
            const billingResult = yield finishAndConfirmExistingSale(params, idSaida, requestIxc, auditStore);
            finalStatus = billingResult.status;
            return billingResult;
        }
        catch (error) {
            const status = stage === 'ANTES_DA_VENDA'
                || (stage === 'CRIANDO_VENDA' && (error === null || error === void 0 ? void 0 : error.ixcDefinitiveFailure))
                ? 'ERRO_SEM_VENDA'
                : 'ERRO_FATURAR_ATIVACAO';
            finalStatus = 'ERRO_FATURAR_ATIVACAO';
            const auditMessage = `${exports.AUTOMATIC_ACTIVATION_BILLING_ERROR_MESSAGE} Falha resumida: ${technicalSummary(error)}`;
            try {
                yield auditStore.finish(params.auditoriaId, status, auditMessage);
            }
            catch (auditError) {
                (0, logger_1.logError)('IXC.Ativacao.AuditoriaErro', auditError, {
                    requestId: params.requestId,
                    idContrato: params.idContrato,
                    idSaida
                });
            }
            (0, logger_1.logError)('IXC.Ativacao.FaturamentoErro', error, {
                requestId: params.requestId,
                idContrato: params.idContrato,
                idCliente: params.idCliente,
                taxaEsperada: amount ? (Number(amount) / 100).toFixed(2) : null,
                idSaida,
                status,
                duracaoMs: Date.now() - startedAt
            });
            return result(finalStatus, exports.AUTOMATIC_ACTIVATION_BILLING_ERROR_MESSAGE);
        }
        finally {
            (0, logger_1.logInfo)('IXC.Ativacao.Faturamento', 'Processamento de faturamento da ativacao concluido.', {
                requestId: params.requestId,
                idContrato: params.idContrato,
                idCliente: params.idCliente,
                taxaEsperada: amount ? (Number(amount) / 100).toFixed(2) : null,
                idSaida,
                status: finalStatus,
                duracaoMs: Date.now() - startedAt
            });
        }
    });
}
exports.faturarAtivacaoContrato = faturarAtivacaoContrato;
