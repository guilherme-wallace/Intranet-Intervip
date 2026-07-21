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
const Express = require("express");
const agendaService_1 = require("./agendaService");
const spcService_1 = require("../../../src/services/spcService");
const logger_1 = require("../../../api/logger");
const router = Express.Router();
function formatarDocumentoIxc(documento) {
    const limpo = (0, spcService_1.limparDocumento)(documento);
    if (limpo.length === 11) {
        return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (limpo.length === 14) {
        return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return documento;
}
function usuarioDaRequest(req) {
    var _a, _b, _c, _d;
    return {
        username: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.username) || ((_b = req.session) === null || _b === void 0 ? void 0 : _b.username) || 'Visitante',
        group: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.group) || ((_d = req.session) === null || _d === void 0 ? void 0 : _d.group) || 'Sem grupo'
    };
}
function contratoAtivo(contrato) {
    const status = String((contrato === null || contrato === void 0 ? void 0 : contrato.status) || '').trim().toUpperCase();
    const statusInternet = String((contrato === null || contrato === void 0 ? void 0 : contrato.status_internet) || '').trim().toUpperCase();
    return status === 'A' || status === 'ATIVO' || statusInternet === 'A' || statusInternet === 'ATIVO';
}
function buscarClienteIxcPorDocumentoOuId(documento, clienteId, requestId, usuario) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        if (clienteId) {
            const resp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/cliente', {
                qtype: 'cliente.id',
                query: String(clienteId),
                oper: '=',
                page: '1',
                rp: '1',
                sortname: 'cliente.id',
                sortorder: 'asc'
            }, null, { requestId, usuario });
            return ((_a = resp === null || resp === void 0 ? void 0 : resp.registros) === null || _a === void 0 ? void 0 : _a[0]) || null;
        }
        const tentativas = [documento, formatarDocumentoIxc(documento)]
            .map(valor => String(valor || '').trim())
            .filter((valor, index, arr) => valor && arr.indexOf(valor) === index);
        for (const query of tentativas) {
            const resp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/cliente', {
                qtype: 'cliente.cnpj_cpf',
                query,
                oper: '=',
                page: '1',
                rp: '1',
                sortname: 'cliente.id',
                sortorder: 'asc'
            }, null, { requestId, usuario });
            if ((_b = resp === null || resp === void 0 ? void 0 : resp.registros) === null || _b === void 0 ? void 0 : _b[0])
                return resp.registros[0];
        }
        return null;
    });
}
function consultarSituacaoInternaIntervip(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const cliente = yield buscarClienteIxcPorDocumentoOuId(params.documento, params.clienteId, params.requestId, params.usuario);
        if (!(cliente === null || cliente === void 0 ? void 0 : cliente.id)) {
            return {
                clienteId: null,
                hasActiveContract: false,
                hasInternalFinancialRestriction: false,
                contratosAtivos: 0,
                titulosVencidos: 0
            };
        }
        const contratoResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/cliente_contrato', {
            qtype: 'cliente_contrato.id_cliente',
            query: String(cliente.id),
            oper: '=',
            page: '1',
            rp: '200',
            sortname: 'cliente_contrato.id',
            sortorder: 'desc'
        }, null, { requestId: params.requestId, usuario: params.usuario });
        const contratos = Array.isArray(contratoResp === null || contratoResp === void 0 ? void 0 : contratoResp.registros) ? contratoResp.registros : [];
        const contratosAtivos = contratos.filter(contratoAtivo);
        const financeiroResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/fn_areceber', {
            qtype: 'fn_areceber.id_cliente',
            query: String(cliente.id),
            oper: '=',
            rp: '2000',
            sortname: 'fn_areceber.data_vencimento',
            sortorder: 'asc',
            grid_param: JSON.stringify([
                { TB: 'fn_areceber.liberado', OP: '=', P: 'S' },
                { TB: 'fn_areceber.status', OP: '!=', P: 'C' },
                { TB: 'fn_areceber.status', OP: '!=', P: 'R' }
            ])
        }, null, { requestId: params.requestId, usuario: params.usuario });
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const titulos = Array.isArray(financeiroResp === null || financeiroResp === void 0 ? void 0 : financeiroResp.registros) ? financeiroResp.registros : [];
        const titulosVencidos = titulos.filter((titulo) => {
            if (!(titulo === null || titulo === void 0 ? void 0 : titulo.data_vencimento))
                return false;
            const vencimento = new Date(titulo.data_vencimento);
            return vencimento < hoje;
        });
        return {
            clienteId: String(cliente.id),
            hasActiveContract: contratosAtivos.length > 0,
            hasInternalFinancialRestriction: titulosVencidos.length > 0,
            contratosAtivos: contratosAtivos.length,
            titulosVencidos: titulosVencidos.length
        };
    });
}
router.post('/consulta-credito', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { documento, tipoCadastro, clienteId } = req.body || {};
    const requestId = req.requestId;
    const usuario = usuarioDaRequest(req);
    const tipo = String(tipoCadastro || '').toUpperCase();
    const validacao = (0, spcService_1.validarDocumentoCredito)(documento, (0, spcService_1.isSpcMockEnabled)());
    if (!['BANDA_LARGA', 'CORPORATIVO'].includes(tipo)) {
        return res.status(400).json({
            success: false,
            error: 'Tipo de cadastro invalido.',
            requestId
        });
    }
    if (!validacao.valido) {
        return res.status(400).json({
            success: false,
            error: validacao.erro || 'Documento invalido.',
            requestId
        });
    }
    let situacaoInterna = {
        clienteId: clienteId ? String(clienteId) : null,
        hasActiveContract: false,
        hasInternalFinancialRestriction: false,
        contratosAtivos: 0,
        titulosVencidos: 0
    };
    let rawSpc = null;
    let erroSpc = null;
    try {
        situacaoInterna = yield consultarSituacaoInternaIntervip({
            documento: validacao.documentoLimpo,
            clienteId,
            requestId,
            usuario: usuario.username
        });
    }
    catch (error) {
        (0, logger_1.logWarn)('SPC.SituacaoInterna', 'Nao foi possivel consultar completamente a situacao interna antes do SPC.', {
            requestId,
            usuario: usuario.username,
            documento: (0, spcService_1.mascararDocumento)(documento),
            clienteId,
            error: error === null || error === void 0 ? void 0 : error.message
        });
    }
    try {
        rawSpc = yield (0, spcService_1.consultarSpc)(validacao.documentoLimpo, {
            requestId,
            usuario: usuario.username
        });
        const normalizado = (0, spcService_1.normalizeSpcResult)(rawSpc);
        const restrictionSummary = (0, spcService_1.buildSpcRestrictionSummary)(rawSpc);
        const decision = (0, spcService_1.buildCreditDecision)({
            spcClassification: normalizado.classification,
            hasActiveContract: situacaoInterna.hasActiveContract,
            hasInternalFinancialRestriction: situacaoInterna.hasInternalFinancialRestriction
        });
        const analiseId = yield (0, spcService_1.registrarAnaliseCredito)({
            clienteId: situacaoInterna.clienteId || clienteId || null,
            documento: validacao.documentoLimpo,
            tipoCadastro: tipo,
            classificacao: normalizado.classification,
            decision,
            rawResponse: rawSpc,
            criadoPor: usuario.username
        });
        (0, spcService_1.logFormatoSpcParaHomologacao)(rawSpc, {
            requestId,
            usuario: usuario.username,
            tipoCadastro: tipo,
            documento: (0, spcService_1.mascararDocumento)(documento),
            classificacao: normalizado.classification,
            status: decision.status
        });
        (0, logger_1.logInfo)('SPC.ConsultaCredito', 'Analise de credito concluida.', {
            requestId,
            usuario: usuario.username,
            grupo: usuario.group,
            tipoCadastro: tipo,
            documento: (0, spcService_1.mascararDocumento)(documento),
            classificacao: normalizado.classification,
            status: decision.status,
            clienteId: situacaoInterna.clienteId,
            contratosAtivos: situacaoInterna.contratosAtivos,
            titulosVencidos: situacaoInterna.titulosVencidos,
            analiseId
        });
        return res.json({
            success: true,
            documento: (0, spcService_1.mascararDocumento)(documento),
            classification: normalizado.classification,
            decision,
            restrictionSummary,
            analiseId,
            manualPermitido: false,
            requestId
        });
    }
    catch (error) {
        erroSpc = {
            statusCode: error === null || error === void 0 ? void 0 : error.statusCode,
            spcStatus: error === null || error === void 0 ? void 0 : error.spcStatus,
            code: error === null || error === void 0 ? void 0 : error.code,
            message: (error === null || error === void 0 ? void 0 : error.publicMessage) || (error === null || error === void 0 ? void 0 : error.message)
        };
        (0, spcService_1.logErroSpc)(error, {
            requestId,
            usuario: usuario.username,
            grupo: usuario.group,
            tipoCadastro: tipo,
            documento: (0, spcService_1.mascararDocumento)(documento),
            clienteId: situacaoInterna.clienteId || clienteId || null
        });
        const decision = (0, spcService_1.buildCreditDecision)({
            spcClassification: 'ANALISE_MANUAL',
            hasActiveContract: situacaoInterna.hasActiveContract,
            hasInternalFinancialRestriction: situacaoInterna.hasInternalFinancialRestriction
        });
        const analiseId = yield (0, spcService_1.registrarAnaliseCredito)({
            clienteId: situacaoInterna.clienteId || clienteId || null,
            documento: validacao.documentoLimpo,
            tipoCadastro: tipo,
            classificacao: 'ERRO_CONSULTA',
            decision,
            rawResponse: rawSpc,
            erro: erroSpc,
            criadoPor: usuario.username
        });
        const statusHttp = (error === null || error === void 0 ? void 0 : error.statusCode) === 400 ? 400 : 502;
        return res.status(statusHttp).json({
            success: false,
            error: (error === null || error === void 0 ? void 0 : error.publicMessage) || 'Nao foi possivel consultar o SPC Brasil neste momento.',
            classification: 'ERRO_CONSULTA',
            decision,
            restrictionSummary: [],
            analiseId,
            manualPermitido: false,
            requestId
        });
    }
}));
router.use((err, req, res, _next) => {
    var _a, _b;
    (0, logger_1.logError)('SPC.Router', err, {
        requestId: req.requestId,
        usuario: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.username) || ((_b = req.session) === null || _b === void 0 ? void 0 : _b.username) || 'Visitante'
    });
    res.status(500).json({
        success: false,
        error: 'Erro interno ao processar analise de credito.',
        requestId: req.requestId
    });
});
exports.default = router;
