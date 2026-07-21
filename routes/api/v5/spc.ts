import * as Express from 'express';
import { AgendaService } from './agendaService';
import {
    buildCreditDecision,
    buildSpcRestrictionSummary,
    consultarSpc,
    isSpcMockEnabled,
    limparDocumento,
    logErroSpc,
    logFormatoSpcParaHomologacao,
    mascararDocumento,
    normalizeSpcResult,
    registrarAnaliseCredito,
    TipoCadastroCredito,
    validarDocumentoCredito
} from '../../../src/services/spcService';
import { logError, logInfo, logWarn } from '../../../api/logger';

const router = Express.Router();

function formatarDocumentoIxc(documento: string): string {
    const limpo = limparDocumento(documento);
    if (limpo.length === 11) {
        return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (limpo.length === 14) {
        return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return documento;
}

function usuarioDaRequest(req: any): { username: string; group: string } {
    return {
        username: req.user?.username || req.session?.username || 'Visitante',
        group: req.user?.group || req.session?.group || 'Sem grupo'
    };
}

function contratoAtivo(contrato: any): boolean {
    const status = String(contrato?.status || '').trim().toUpperCase();
    const statusInternet = String(contrato?.status_internet || '').trim().toUpperCase();
    return status === 'A' || status === 'ATIVO' || statusInternet === 'A' || statusInternet === 'ATIVO';
}

async function buscarClienteIxcPorDocumentoOuId(documento: string, clienteId?: any, requestId?: string, usuario?: string): Promise<any | null> {
    if (clienteId) {
        const resp = await AgendaService.makeIxcRequest('POST', '/cliente', {
            qtype: 'cliente.id',
            query: String(clienteId),
            oper: '=',
            page: '1',
            rp: '1',
            sortname: 'cliente.id',
            sortorder: 'asc'
        }, null, { requestId, usuario });
        return resp?.registros?.[0] || null;
    }

    const tentativas = [documento, formatarDocumentoIxc(documento)]
        .map(valor => String(valor || '').trim())
        .filter((valor, index, arr) => valor && arr.indexOf(valor) === index);

    for (const query of tentativas) {
        const resp = await AgendaService.makeIxcRequest('POST', '/cliente', {
            qtype: 'cliente.cnpj_cpf',
            query,
            oper: '=',
            page: '1',
            rp: '1',
            sortname: 'cliente.id',
            sortorder: 'asc'
        }, null, { requestId, usuario });
        if (resp?.registros?.[0]) return resp.registros[0];
    }

    return null;
}

async function consultarSituacaoInternaIntervip(params: {
    documento: string;
    clienteId?: any;
    requestId?: string;
    usuario?: string;
}): Promise<{ clienteId: string | null; hasActiveContract: boolean; hasInternalFinancialRestriction: boolean; contratosAtivos: number; titulosVencidos: number }> {
    const cliente = await buscarClienteIxcPorDocumentoOuId(params.documento, params.clienteId, params.requestId, params.usuario);
    if (!cliente?.id) {
        return {
            clienteId: null,
            hasActiveContract: false,
            hasInternalFinancialRestriction: false,
            contratosAtivos: 0,
            titulosVencidos: 0
        };
    }

    const contratoResp = await AgendaService.makeIxcRequest('POST', '/cliente_contrato', {
        qtype: 'cliente_contrato.id_cliente',
        query: String(cliente.id),
        oper: '=',
        page: '1',
        rp: '200',
        sortname: 'cliente_contrato.id',
        sortorder: 'desc'
    }, null, { requestId: params.requestId, usuario: params.usuario });
    const contratos = Array.isArray(contratoResp?.registros) ? contratoResp.registros : [];
    const contratosAtivos = contratos.filter(contratoAtivo);

    const financeiroResp = await AgendaService.makeIxcRequest('POST', '/fn_areceber', {
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
    const titulos = Array.isArray(financeiroResp?.registros) ? financeiroResp.registros : [];
    const titulosVencidos = titulos.filter((titulo: any) => {
        if (!titulo?.data_vencimento) return false;
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
}

router.post('/consulta-credito', async (req, res) => {
    const { documento, tipoCadastro, clienteId } = req.body || {};
    const requestId = req.requestId;
    const usuario = usuarioDaRequest(req);
    const tipo = String(tipoCadastro || '').toUpperCase() as TipoCadastroCredito;
    const validacao = validarDocumentoCredito(documento, isSpcMockEnabled());

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
    let rawSpc: any = null;
    let erroSpc: any = null;

    try {
        situacaoInterna = await consultarSituacaoInternaIntervip({
            documento: validacao.documentoLimpo,
            clienteId,
            requestId,
            usuario: usuario.username
        });
    } catch (error: any) {
        logWarn('SPC.SituacaoInterna', 'Nao foi possivel consultar completamente a situacao interna antes do SPC.', {
            requestId,
            usuario: usuario.username,
            documento: mascararDocumento(documento),
            clienteId,
            error: error?.message
        });
    }

    try {
        rawSpc = await consultarSpc(validacao.documentoLimpo, {
            requestId,
            usuario: usuario.username
        });
        const normalizado = normalizeSpcResult(rawSpc);
        const restrictionSummary = buildSpcRestrictionSummary(rawSpc);
        const decision = buildCreditDecision({
            spcClassification: normalizado.classification,
            hasActiveContract: situacaoInterna.hasActiveContract,
            hasInternalFinancialRestriction: situacaoInterna.hasInternalFinancialRestriction
        });

        const analiseId = await registrarAnaliseCredito({
            clienteId: situacaoInterna.clienteId || clienteId || null,
            documento: validacao.documentoLimpo,
            tipoCadastro: tipo,
            classificacao: normalizado.classification,
            decision,
            rawResponse: rawSpc,
            criadoPor: usuario.username
        });

        logFormatoSpcParaHomologacao(rawSpc, {
            requestId,
            usuario: usuario.username,
            tipoCadastro: tipo,
            documento: mascararDocumento(documento),
            classificacao: normalizado.classification,
            status: decision.status
        });

        logInfo('SPC.ConsultaCredito', 'Analise de credito concluida.', {
            requestId,
            usuario: usuario.username,
            grupo: usuario.group,
            tipoCadastro: tipo,
            documento: mascararDocumento(documento),
            classificacao: normalizado.classification,
            status: decision.status,
            clienteId: situacaoInterna.clienteId,
            contratosAtivos: situacaoInterna.contratosAtivos,
            titulosVencidos: situacaoInterna.titulosVencidos,
            analiseId
        });

        return res.json({
            success: true,
            documento: mascararDocumento(documento),
            classification: normalizado.classification,
            decision,
            restrictionSummary,
            analiseId,
            manualPermitido: false,
            requestId
        });
    } catch (error: any) {
        erroSpc = {
            statusCode: error?.statusCode,
            spcStatus: error?.spcStatus,
            code: error?.code,
            message: error?.publicMessage || error?.message
        };

        logErroSpc(error, {
            requestId,
            usuario: usuario.username,
            grupo: usuario.group,
            tipoCadastro: tipo,
            documento: mascararDocumento(documento),
            clienteId: situacaoInterna.clienteId || clienteId || null
        });

        const decision = buildCreditDecision({
            spcClassification: 'ANALISE_MANUAL',
            hasActiveContract: situacaoInterna.hasActiveContract,
            hasInternalFinancialRestriction: situacaoInterna.hasInternalFinancialRestriction
        });

        const analiseId = await registrarAnaliseCredito({
            clienteId: situacaoInterna.clienteId || clienteId || null,
            documento: validacao.documentoLimpo,
            tipoCadastro: tipo,
            classificacao: 'ERRO_CONSULTA',
            decision,
            rawResponse: rawSpc,
            erro: erroSpc,
            criadoPor: usuario.username
        });

        const statusHttp = error?.statusCode === 400 ? 400 : 502;
        return res.status(statusHttp).json({
            success: false,
            error: error?.publicMessage || 'Nao foi possivel consultar o SPC Brasil neste momento.',
            classification: 'ERRO_CONSULTA',
            decision,
            restrictionSummary: [],
            analiseId,
            manualPermitido: false,
            requestId
        });
    }
});

router.use((err: any, req: any, res: any, _next: any) => {
    logError('SPC.Router', err, {
        requestId: req.requestId,
        usuario: req.user?.username || req.session?.username || 'Visitante'
    });
    res.status(500).json({
        success: false,
        error: 'Erro interno ao processar analise de credito.',
        requestId: req.requestId
    });
});

export default router;
