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
exports.logErroSpc = exports.logFormatoSpcParaHomologacao = exports.registrarAnaliseCredito = exports.consultarSpc = exports.buildCreditDecision = exports.normalizeSpcResult = exports.buildSpcRestrictionSummary = exports.montarPayloadSpc = exports.obterConfigSpcSegura = exports.isSpcMockEnabled = exports.validarDocumentoCredito = exports.formatarTimestampSpcPtBr = exports.mascararDocumento = exports.limparDocumento = exports.clienteConcordouComConsultaCredito = void 0;
const axios_1 = require("axios");
const database_1 = require("../../api/database");
const logger_1 = require("../../api/logger");
function clienteConcordouComConsultaCredito(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}
exports.clienteConcordouComConsultaCredito = clienteConcordouComConsultaCredito;
const SPC_TIMEOUT_MS = Number(process.env.SPC_TIMEOUT_MS || 90000);
const BODY_ERRO_MAX_CHARS = 1000;
function executeDb(query, params = []) {
    return new Promise((resolve, reject) => {
        database_1.LOCALHOST.query(query, params, (err, results) => {
            if (err)
                return reject(err);
            resolve(results);
        });
    });
}
function limparDocumento(documento) {
    return String(documento || '').replace(/\D/g, '');
}
exports.limparDocumento = limparDocumento;
function mascararDocumento(documento) {
    const limpo = limparDocumento(documento);
    if (limpo.length === 11)
        return `${limpo.slice(0, 3)}.***.***-${limpo.slice(-2)}`;
    if (limpo.length === 14)
        return `${limpo.slice(0, 2)}.***.***/****-${limpo.slice(-2)}`;
    return limpo ? `${limpo.slice(0, 3)}***${limpo.slice(-2)}` : '';
}
exports.mascararDocumento = mascararDocumento;
function formatarTimestampSpcPtBr(timestamp) {
    const numero = Number(timestamp);
    if (!Number.isFinite(numero) || numero <= 0)
        return '';
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date(numero));
}
exports.formatarTimestampSpcPtBr = formatarTimestampSpcPtBr;
function validarCpf(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf))
        return false;
    let soma = 0;
    for (let i = 0; i < 9; i++)
        soma += Number(cpf[i]) * (10 - i);
    let digito = (soma * 10) % 11;
    if (digito === 10)
        digito = 0;
    if (digito !== Number(cpf[9]))
        return false;
    soma = 0;
    for (let i = 0; i < 10; i++)
        soma += Number(cpf[i]) * (11 - i);
    digito = (soma * 10) % 11;
    if (digito === 10)
        digito = 0;
    return digito === Number(cpf[10]);
}
function validarCnpj(cnpj) {
    if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj))
        return false;
    const calcular = (base, pesos) => {
        const soma = base.split('').reduce((acc, digito, index) => acc + Number(digito) * pesos[index], 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    const digito1 = calcular(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const digito2 = calcular(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digito1 === Number(cnpj[12]) && digito2 === Number(cnpj[13]);
}
function validarDocumentoCredito(documento, permitirMockSemDigito = false) {
    const documentoLimpo = limparDocumento(documento);
    if (documentoLimpo.length === 11) {
        if (permitirMockSemDigito)
            return { valido: true, documentoLimpo, tipoDocumento: 'CPF' };
        return { valido: validarCpf(documentoLimpo), documentoLimpo, tipoDocumento: 'CPF', erro: validarCpf(documentoLimpo) ? undefined : 'CPF invalido.' };
    }
    if (documentoLimpo.length === 14) {
        if (permitirMockSemDigito)
            return { valido: true, documentoLimpo, tipoDocumento: 'CNPJ' };
        return { valido: validarCnpj(documentoLimpo), documentoLimpo, tipoDocumento: 'CNPJ', erro: validarCnpj(documentoLimpo) ? undefined : 'CNPJ invalido.' };
    }
    return { valido: false, documentoLimpo, tipoDocumento: null, erro: 'Informe um CPF ou CNPJ valido.' };
}
exports.validarDocumentoCredito = validarDocumentoCredito;
function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}
function jsonSeguro(valor) {
    try {
        return JSON.stringify(valor);
    }
    catch (error) {
        return String((error === null || error === void 0 ? void 0 : error.message) || valor || '');
    }
}
function limitarTexto(valor, limite = BODY_ERRO_MAX_CHARS) {
    const texto = typeof valor === 'string' ? valor : jsonSeguro(valor);
    return texto.length > limite ? `${texto.slice(0, limite)}...[truncado]` : texto;
}
function isSpcMockEnabled() {
    return String(process.env.SPC_MOCK_ENABLED || 'false').trim().toLowerCase() === 'true';
}
exports.isSpcMockEnabled = isSpcMockEnabled;
function obterConfigSpcSegura() {
    const baseUrl = String(process.env.SPC_BASE_URL || '').replace(/\/+$/, '');
    const url = process.env.SPC_CONSULTA_PADRAO_URL || (baseUrl ? `${baseUrl}/spcconsulta/recurso/consulta/padrao` : '');
    const metodo = String(process.env.SPC_HTTP_METHOD || 'POST').toUpperCase();
    return {
        ambiente: process.env.SPC_ENV || 'homologacao',
        mockEnabled: isSpcMockEnabled(),
        url,
        metodo,
        timeoutMs: Number.isFinite(SPC_TIMEOUT_MS) ? SPC_TIMEOUT_MS : 90000,
        possuiUsuario: Boolean(process.env.SPC_USERNAME_WEB_SERVICE),
        possuiSenha: Boolean(process.env.SPC_PASSWORD_WEB_SERVICE),
        possuiCodigoProduto: Boolean(process.env.SPC_CODIGO_PRODUTO_PADRAO
            || process.env.SPC_CODIGO_PRODUTO_PF
            || process.env.SPC_CODIGO_PRODUTO_PJ
            || process.env.SPC_CODIGO_PRODUTO)
    };
}
exports.obterConfigSpcSegura = obterConfigSpcSegura;
function obterTipoConsumidor(tipoDocumento) {
    return tipoDocumento === 'CNPJ' ? 'J' : 'F';
}
function obterCodigoProduto(tipoConsumidor) {
    const codigoEspecifico = tipoConsumidor === 'J'
        ? process.env.SPC_CODIGO_PRODUTO_PJ
        : process.env.SPC_CODIGO_PRODUTO_PF;
    return String(codigoEspecifico
        || process.env.SPC_CODIGO_PRODUTO_PADRAO
        || process.env.SPC_CODIGO_PRODUTO
        || '').trim();
}
function obterCodigoInsumoOpcional() {
    return String(process.env.SPC_CODIGO_INSUMO_OPCIONAL || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => /^\d+$/.test(item) ? Number(item) : item);
}
function montarPayloadSpc(documentoLimpo, tipoDocumento) {
    const tipoConsumidor = obterTipoConsumidor(tipoDocumento);
    const codigoProduto = obterCodigoProduto(tipoConsumidor);
    if (!codigoProduto) {
        const erro = new Error('Codigo de produto SPC nao configurado.');
        erro.statusCode = 500;
        erro.publicMessage = 'Consulta SPC indisponivel por configuracao incompleta.';
        throw erro;
    }
    return {
        codigoProduto,
        tipoConsumidor,
        documentoConsumidor: documentoLimpo,
        codigoInsumoOpcional: obterCodigoInsumoOpcional()
    };
}
exports.montarPayloadSpc = montarPayloadSpc;
function montarRespostaMockSpc(documentoLimpo) {
    const sufixo = documentoLimpo.slice(-2);
    if (sufixo === '44') {
        const erro = new Error('Mock SPC ERRO_CONSULTA');
        erro.statusCode = 502;
        erro.publicMessage = 'Resposta inesperada do SPC Brasil.';
        erro.code = 'SPC_MOCK_ERRO_CONSULTA';
        erro.spcMeta = {
            ambiente: process.env.SPC_ENV || 'homologacao',
            mockEnabled: true,
            metodo: 'MOCK',
            url: 'SPC_MOCK',
            statusHttp: 502,
            contentType: 'application/json',
            bodyResumo: '{"mockClassification":"ERRO_CONSULTA"}',
            duracaoMs: 0
        };
        throw erro;
    }
    const classificationBySuffix = {
        '00': 'SEM_RESTRICAO',
        '11': 'RESTRICAO_FINANCEIRA',
        '22': 'RESTRICAO_TELECOM',
        '33': 'ANALISE_MANUAL'
    };
    return {
        mock: true,
        mockClassification: classificationBySuffix[sufixo] || 'SEM_RESTRICAO',
        documentoFinal: `${documentoLimpo.slice(0, 3)}***${documentoLimpo.slice(-2)}`,
        registros: classificationBySuffix[sufixo] === 'SEM_RESTRICAO' || !classificationBySuffix[sufixo]
            ? []
            : [{ origem: classificationBySuffix[sufixo] === 'RESTRICAO_TELECOM' ? 'TELECOM' : 'FINANCEIRA' }]
    };
}
function resumirFormato(valor, profundidade = 0) {
    if (valor === null || typeof valor === 'undefined')
        return valor;
    if (profundidade >= 3)
        return Array.isArray(valor) ? `[Array(${valor.length})]` : `[${typeof valor}]`;
    if (Array.isArray(valor)) {
        return {
            tipo: 'array',
            tamanho: valor.length,
            primeiroItem: valor.length ? resumirFormato(valor[0], profundidade + 1) : null
        };
    }
    if (typeof valor === 'object') {
        const resumo = {};
        Object.keys(valor).slice(0, 50).forEach((chave) => {
            const item = valor[chave];
            resumo[chave] = item && typeof item === 'object' ? resumirFormato(item, profundidade + 1) : typeof item;
        });
        return resumo;
    }
    return typeof valor;
}
function contemAlguma(texto, termos) {
    return termos.some(termo => texto.includes(termo));
}
function possuiListaRestritivaPreenchida(raw) {
    const nomesRestritivos = /restri|penden|inadimpl|negativ|spc|protest|debito|divida|ocorrenc/i;
    const visitar = (valor) => {
        if (!valor || typeof valor !== 'object')
            return false;
        if (Array.isArray(valor))
            return valor.some(item => visitar(item));
        return Object.entries(valor).some(([chave, item]) => {
            if (Array.isArray(item) && nomesRestritivos.test(chave) && item.length > 0)
                return true;
            if (typeof item === 'number' && item > 0 && nomesRestritivos.test(chave))
                return true;
            if (typeof item === 'string' && item !== '0' && /^\d+$/.test(item) && nomesRestritivos.test(chave))
                return true;
            return visitar(item);
        });
    };
    return visitar(raw);
}
function possuiListasRestritivasVazias(raw) {
    const nomesRestritivos = /restri|penden|inadimpl|negativ|spc|protest|debito|divida|ocorrenc/i;
    let encontrouLista = false;
    let encontrouPreenchida = false;
    const visitar = (valor) => {
        if (!valor || typeof valor !== 'object')
            return;
        if (Array.isArray(valor)) {
            valor.forEach(visitar);
            return;
        }
        Object.entries(valor).forEach(([chave, item]) => {
            if (Array.isArray(item) && nomesRestritivos.test(chave)) {
                encontrouLista = true;
                if (item.length > 0)
                    encontrouPreenchida = true;
            }
            visitar(item);
        });
    };
    visitar(raw);
    return encontrouLista && !encontrouPreenchida;
}
function obterResultadoRestSpc(rawResponse) {
    var _a, _b;
    return ((_b = (_a = rawResponse === null || rawResponse === void 0 ? void 0 : rawResponse.result) === null || _a === void 0 ? void 0 : _a.return_object) === null || _b === void 0 ? void 0 : _b.resultado) || null;
}
function quantidadePositiva(valor) {
    const numero = Number(valor || 0);
    return Number.isFinite(numero) && numero > 0;
}
function quantidadeResumoPositiva(bloco) {
    var _a;
    return quantidadePositiva((_a = bloco === null || bloco === void 0 ? void 0 : bloco.resumo) === null || _a === void 0 ? void 0 : _a.quantidadeTotal);
}
function obterQuantidadeResumo(bloco) {
    var _a;
    const numero = Number(((_a = bloco === null || bloco === void 0 ? void 0 : bloco.resumo) === null || _a === void 0 ? void 0 : _a.quantidadeTotal) || 0);
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
}
function temDetalhePreenchido(valor) {
    if (!valor)
        return false;
    if (Array.isArray(valor))
        return valor.length > 0;
    if (typeof valor === 'object')
        return Object.keys(valor).length > 0;
    if (typeof valor === 'string')
        return valor.trim() !== '';
    return Boolean(valor);
}
function temInformacaoPoderJudiciario(valor) {
    if (!valor)
        return false;
    if (Array.isArray(valor))
        return valor.length > 0;
    if (typeof valor === 'object') {
        if (quantidadeResumoPositiva(valor))
            return true;
        return Object.entries(valor).some(([chave, item]) => {
            if (chave === 'resumo')
                return false;
            if (typeof item === 'number')
                return item > 0;
            if (typeof item === 'string')
                return item.trim() !== '' && item.trim() !== '0';
            return temInformacaoPoderJudiciario(item);
        });
    }
    return Boolean(valor);
}
function getValorPorCaminho(obj, caminho) {
    return caminho.reduce((acc, chave) => acc === null || acc === void 0 ? void 0 : acc[chave], obj);
}
function extrairItensDetalheRestricao(resultado) {
    const caminhos = [
        ['spc', 'detalheSpc'],
        ['pendenciaFinanceira', 'detalhePendenciaFinanceira'],
        ['protesto', 'detalheProtesto'],
        ['chequeLojista', 'detalheChequeLojista'],
        ['ccf', 'detalheCcf'],
        ['informacaoPoderJudiciario']
    ];
    return caminhos.flatMap((caminho) => {
        const valor = getValorPorCaminho(resultado, caminho);
        if (!valor)
            return [];
        return Array.isArray(valor) ? valor : [valor];
    });
}
function textoCamposTelecom(item) {
    if (!item || typeof item !== 'object')
        return normalizarTexto(item);
    // Estes campos pertencem aos detalhes de restricao/inadimplencia.
    // Dados cadastrais do consumidor retornados pelo SPC, como nome do cliente,
    // nao devem ser usados para validar identidade nem para classificar credito,
    // especialmente em homologacao, onde o SPC pode retornar massa ficticia.
    const campos = [
        item.nomeAssociado,
        item.nomeEntidade,
        item.origem,
        item.associado,
        item.entidade,
        item.credor,
        item.nomeCredor,
        item.razaoSocial,
        item.nomeFantasia
    ];
    return normalizarTexto(campos.filter(Boolean).join(' '));
}
function possuiIndicadorTelecom(resultado) {
    const termosTelecom = ['TELECOM', 'TELECOMUNICACOES', 'INTERNET', 'FIBRA', 'BANDA LARGA', 'CLARO', 'VIVO', 'TIM', 'OI', 'NET'];
    return extrairItensDetalheRestricao(resultado).some(item => contemAlguma(textoCamposTelecom(item), termosTelecom));
}
function possuiBlocoRestritivoRest(resultado) {
    var _a, _b;
    return quantidadeResumoPositiva(resultado === null || resultado === void 0 ? void 0 : resultado.spc)
        || quantidadeResumoPositiva(resultado === null || resultado === void 0 ? void 0 : resultado.pendenciaFinanceira)
        || quantidadeResumoPositiva(resultado === null || resultado === void 0 ? void 0 : resultado.protesto)
        || quantidadeResumoPositiva(resultado === null || resultado === void 0 ? void 0 : resultado.chequeLojista)
        || quantidadeResumoPositiva(resultado === null || resultado === void 0 ? void 0 : resultado.ccf)
        || temDetalhePreenchido((_a = resultado === null || resultado === void 0 ? void 0 : resultado.spc) === null || _a === void 0 ? void 0 : _a.detalheSpc)
        || temDetalhePreenchido((_b = resultado === null || resultado === void 0 ? void 0 : resultado.pendenciaFinanceira) === null || _b === void 0 ? void 0 : _b.detalhePendenciaFinanceira)
        || temInformacaoPoderJudiciario(resultado === null || resultado === void 0 ? void 0 : resultado.informacaoPoderJudiciario);
}
function obterQuantidadeDetalhes(valor) {
    if (!valor)
        return 0;
    if (Array.isArray(valor))
        return valor.length;
    if (typeof valor === 'object')
        return Object.keys(valor).length > 0 ? 1 : 0;
    if (typeof valor === 'string')
        return valor.trim() ? 1 : 0;
    return Boolean(valor) ? 1 : 0;
}
function montarItemResumoRestricao(tipo, label, bloco, detalheKey) {
    const quantidadeResumo = obterQuantidadeResumo(bloco);
    const quantidadeDetalhes = detalheKey ? obterQuantidadeDetalhes(bloco === null || bloco === void 0 ? void 0 : bloco[detalheKey]) : 0;
    const quantidade = quantidadeResumo || quantidadeDetalhes;
    if (!quantidade)
        return null;
    return { tipo, label, quantidade };
}
function buildSpcRestrictionSummary(rawResponse) {
    const resultado = obterResultadoRestSpc(rawResponse);
    if (!resultado)
        return [];
    const itens = [
        montarItemResumoRestricao('spc', 'SPC', resultado.spc, 'detalheSpc'),
        montarItemResumoRestricao('pendenciaFinanceira', 'pendencia financeira', resultado.pendenciaFinanceira, 'detalhePendenciaFinanceira'),
        montarItemResumoRestricao('protesto', 'protesto', resultado.protesto, 'detalheProtesto'),
        montarItemResumoRestricao('chequeLojista', 'cheque lojista', resultado.chequeLojista, 'detalheChequeLojista'),
        montarItemResumoRestricao('ccf', 'CCF', resultado.ccf, 'detalheCcf')
    ].filter(Boolean);
    const quantidadeJudiciario = obterQuantidadeResumo(resultado.informacaoPoderJudiciario)
        || (temInformacaoPoderJudiciario(resultado.informacaoPoderJudiciario) ? 1 : 0);
    if (quantidadeJudiciario) {
        itens.push({
            tipo: 'informacaoPoderJudiciario',
            label: 'poder judiciario',
            quantidade: quantidadeJudiciario
        });
    }
    // Intencionalmente nao inclui valorTotal, valores individuais, datas,
    // credores, nomes de entidades nem consultaRealizada. Esses dados ficam
    // apenas no raw_response_json para auditoria interna.
    return itens;
}
exports.buildSpcRestrictionSummary = buildSpcRestrictionSummary;
function encontrarSituacaoCpf(valor) {
    if (!valor || typeof valor !== 'object')
        return null;
    if (valor.situacaoCpf)
        return valor.situacaoCpf;
    if (Array.isArray(valor)) {
        for (const item of valor) {
            const encontrado = encontrarSituacaoCpf(item);
            if (encontrado)
                return encontrado;
        }
        return null;
    }
    for (const item of Object.values(valor)) {
        const encontrado = encontrarSituacaoCpf(item);
        if (encontrado)
            return encontrado;
    }
    return null;
}
function possuiSituacaoCpfParaAnaliseManual(resultado) {
    const situacaoCpf = encontrarSituacaoCpf(resultado);
    const descricao = normalizarTexto((situacaoCpf === null || situacaoCpf === void 0 ? void 0 : situacaoCpf.descricaoSituacao) || (situacaoCpf === null || situacaoCpf === void 0 ? void 0 : situacaoCpf.situacao) || (situacaoCpf === null || situacaoCpf === void 0 ? void 0 : situacaoCpf.descricao) || '');
    return ['CANCELADA', 'SUSPENSA', 'NULA', 'IRREGULAR'].some(termo => descricao.includes(termo));
}
function normalizeSpcResult(rawResponse) {
    if (!rawResponse) {
        return { classification: 'ANALISE_MANUAL', motivo: 'SPC retornou resposta vazia.' };
    }
    const mockClassification = String((rawResponse === null || rawResponse === void 0 ? void 0 : rawResponse.mockClassification) || '');
    if (['SEM_RESTRICAO', 'RESTRICAO_FINANCEIRA', 'RESTRICAO_TELECOM', 'ANALISE_MANUAL'].includes(mockClassification)) {
        return { classification: mockClassification, motivo: 'Classificacao gerada por mock SPC local.' };
    }
    const resultado = obterResultadoRestSpc(rawResponse);
    if (resultado) {
        // Homologacao SPC Brasil pode retornar massa de teste/ficticia em dados
        // cadastrais pessoais, mesmo quando o documento consultado e real.
        // Por isso o mapper foca apenas em blocos de restricao/inadimplencia
        // e nunca bloqueia ou valida identidade por nome de consumidor.
        const temRestricao = possuiBlocoRestritivoRest(resultado);
        if (possuiSituacaoCpfParaAnaliseManual(resultado)) {
            return { classification: 'ANALISE_MANUAL', motivo: 'Situacao cadastral do CPF exige analise manual.' };
        }
        if (resultado.restricao === false && !temRestricao) {
            return { classification: 'SEM_RESTRICAO', motivo: 'Retorno SPC sem restricoes.' };
        }
        if (resultado.restricao === true || temRestricao) {
            if (possuiIndicadorTelecom(resultado)) {
                return { classification: 'RESTRICAO_TELECOM', motivo: 'Retorno SPC indica restricao em empresa de telecomunicacoes.' };
            }
            return { classification: 'RESTRICAO_FINANCEIRA', motivo: 'Retorno SPC indica restricao financeira.' };
        }
        return { classification: 'ANALISE_MANUAL', motivo: 'Retorno SPC sem sinal claro de restricao ou liberacao.' };
    }
    return { classification: 'ANALISE_MANUAL', motivo: 'Formato do retorno SPC ainda nao mapeado com seguranca.' };
}
exports.normalizeSpcResult = normalizeSpcResult;
function buildCreditDecision(params) {
    const perfilClassificado = params.spcClassification === 'SEM_RESTRICAO'
        || params.spcClassification === 'RESTRICAO_FINANCEIRA'
        || params.spcClassification === 'RESTRICAO_TELECOM'
        ? params.spcClassification
        : 'ANALISE_MANUAL';
    if (params.hasActiveContract && params.hasInternalFinancialRestriction) {
        return {
            status: 'BLOQUEADO',
            perfil: perfilClassificado,
            modalidade: null,
            taxaHabilitacao: null,
            motivo: 'Cliente ja possui contrato ativo com pendencia financeira. Necessario quitar antes de abrir novo contrato.'
        };
    }
    if (params.spcClassification === 'SEM_RESTRICAO') {
        return {
            status: 'APROVADO',
            perfil: 'SEM_RESTRICAO',
            modalidade: 'POS_PAGO',
            taxaHabilitacao: 0,
            motivo: 'Cliente sem restricoes de credito.'
        };
    }
    if (params.spcClassification === 'RESTRICAO_TELECOM') {
        return {
            status: 'APROVADO_COM_CONDICAO',
            perfil: 'RESTRICAO_TELECOM',
            modalidade: 'PRE_PAGO',
            taxaHabilitacao: 250,
            motivo: 'Cliente com restricoes em empresas de telecomunicacoes. Cadastro permitido apenas na modalidade pre-paga com taxa de habilitacao maior.'
        };
    }
    if (params.spcClassification === 'RESTRICAO_FINANCEIRA') {
        return {
            status: 'APROVADO_COM_CONDICAO',
            perfil: 'RESTRICAO_FINANCEIRA',
            modalidade: 'PRE_PAGO',
            taxaHabilitacao: 150,
            motivo: 'Cliente com restricoes financeiras. Cadastro permitido apenas na modalidade pre-paga com taxa de habilitacao.'
        };
    }
    return {
        status: 'ANALISE_MANUAL',
        perfil: 'ANALISE_MANUAL',
        modalidade: null,
        taxaHabilitacao: null,
        motivo: 'Nao foi possivel classificar automaticamente o retorno do SPC. Encaminhar para analise manual.'
    };
}
exports.buildCreditDecision = buildCreditDecision;
function consultarSpc(documento, context = {}) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        const inicioConsulta = Date.now();
        const validacao = validarDocumentoCredito(documento, isSpcMockEnabled());
        if (!validacao.valido) {
            const erro = new Error(validacao.erro || 'Documento invalido.');
            erro.statusCode = 400;
            erro.publicMessage = validacao.erro || 'Documento invalido.';
            erro.spcMeta = {
                ambiente: process.env.SPC_ENV || 'homologacao',
                mockEnabled: isSpcMockEnabled(),
                duracaoMs: Date.now() - inicioConsulta
            };
            throw erro;
        }
        const configSpc = obterConfigSpcSegura();
        if (configSpc.mockEnabled) {
            return montarRespostaMockSpc(validacao.documentoLimpo);
        }
        const username = process.env.SPC_USERNAME_WEB_SERVICE;
        const password = process.env.SPC_PASSWORD_WEB_SERVICE;
        const url = configSpc.url;
        const metodo = configSpc.metodo;
        if (!username || !password || !url) {
            const erro = new Error('Configuracao do SPC Brasil incompleta.');
            erro.statusCode = 500;
            erro.publicMessage = 'Consulta SPC indisponivel por configuracao incompleta.';
            erro.spcMeta = Object.assign(Object.assign({}, configSpc), { statusHttp: null, contentType: null, bodyResumo: null, duracaoMs: Date.now() - inicioConsulta });
            throw erro;
        }
        let payload;
        try {
            payload = montarPayloadSpc(validacao.documentoLimpo, validacao.tipoDocumento);
        }
        catch (error) {
            error.spcMeta = Object.assign(Object.assign({}, configSpc), { statusHttp: null, contentType: null, bodyResumo: 'Codigo de produto SPC ausente.', duracaoMs: Date.now() - inicioConsulta });
            throw error;
        }
        const payloadResumo = {
            codigoProduto: payload.codigoProduto,
            tipoConsumidor: payload.tipoConsumidor,
            codigoInsumoOpcional: payload.codigoInsumoOpcional
        };
        const authorization = Buffer.from(`${username}:${password}`).toString('base64');
        try {
            const response = yield axios_1.default.request({
                method: metodo,
                url,
                timeout: configSpc.timeoutMs,
                headers: {
                    Authorization: `Basic ${authorization}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                params: metodo === 'GET' ? payload : undefined,
                data: metodo === 'GET' ? undefined : payload
            });
            const contentType = String(((_a = response.headers) === null || _a === void 0 ? void 0 : _a['content-type']) || '');
            if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
                const erro = new Error('Resposta inesperada do SPC Brasil.');
                erro.statusCode = 502;
                erro.publicMessage = 'Resposta inesperada do SPC Brasil.';
                erro.spcStatus = response.status;
                erro.spcMeta = Object.assign(Object.assign({}, configSpc), { payloadResumo, statusHttp: response.status, contentType, bodyResumo: limitarTexto(response.data), duracaoMs: Date.now() - inicioConsulta });
                throw erro;
            }
            (0, logger_1.logInfo)('SPC.Consulta', 'Consulta SPC concluida.', {
                requestId: context.requestId,
                usuario: context.usuario,
                ambiente: configSpc.ambiente,
                spcUrl: configSpc.url,
                spcMetodo: configSpc.metodo,
                spcStatusHttp: response.status,
                spcContentType: contentType,
                duracaoMs: Date.now() - inicioConsulta,
                timeoutMs: configSpc.timeoutMs,
                spcPayloadResumo: payloadResumo
            });
            return response.data;
        }
        catch (error) {
            if ((error === null || error === void 0 ? void 0 : error.publicMessage) && (error === null || error === void 0 ? void 0 : error.spcMeta))
                throw error;
            const status = (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status;
            const erro = new Error((error === null || error === void 0 ? void 0 : error.message) || 'Falha ao consultar SPC Brasil.');
            erro.statusCode = status || ((error === null || error === void 0 ? void 0 : error.code) === 'ECONNABORTED' ? 504 : 502);
            erro.code = error === null || error === void 0 ? void 0 : error.code;
            erro.spcStatus = status;
            erro.spcResponse = (_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data;
            erro.spcMeta = Object.assign(Object.assign({}, configSpc), { payloadResumo, statusHttp: status || null, contentType: ((_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.headers) === null || _e === void 0 ? void 0 : _e['content-type']) || null, bodyResumo: (error === null || error === void 0 ? void 0 : error.response) ? limitarTexto(error.response.data) : limitarTexto((error === null || error === void 0 ? void 0 : error.message) || (error === null || error === void 0 ? void 0 : error.code) || 'Erro sem resposta HTTP do SPC'), duracaoMs: Date.now() - inicioConsulta });
            if (status === 401)
                erro.publicMessage = 'Falha de autenticação com SPC Brasil. Verifique operador e senha do Web Service.';
            else if (status === 400)
                erro.publicMessage = 'Consulta SPC recusada. Verifique documento, produto contratado ou formato da requisição.';
            else if ((error === null || error === void 0 ? void 0 : error.code) === 'ECONNABORTED')
                erro.publicMessage = 'Tempo limite excedido ao consultar SPC Brasil. Tente novamente em alguns instantes.';
            else if (['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(String((error === null || error === void 0 ? void 0 : error.code) || '').toUpperCase()))
                erro.publicMessage = 'Não foi possível conectar ao SPC Brasil.';
            else if (status >= 500)
                erro.publicMessage = 'SPC Brasil temporariamente indisponível.';
            else
                erro.publicMessage = 'Resposta inesperada do SPC Brasil.';
            throw erro;
        }
    });
}
exports.consultarSpc = consultarSpc;
let tabelaAnaliseCreditoPronta = false;
function garantirTabelaAnaliseCredito() {
    return __awaiter(this, void 0, void 0, function* () {
        if (tabelaAnaliseCreditoPronta)
            return;
        yield executeDb(`
        CREATE TABLE IF NOT EXISTS ivp_analise_credito (
            id INT(11) NOT NULL AUTO_INCREMENT,
            cliente_id VARCHAR(50) NULL,
            documento VARCHAR(20) NOT NULL,
            tipo_cadastro VARCHAR(30) NOT NULL,
            origem VARCHAR(20) NOT NULL DEFAULT 'SPC',
            ambiente VARCHAR(20) NOT NULL,
            classificacao VARCHAR(50) NOT NULL,
            status_decisao VARCHAR(50) NOT NULL,
            modalidade VARCHAR(20) NULL,
            taxa_habilitacao DECIMAL(10,2) NULL,
            motivo VARCHAR(500) NOT NULL,
            raw_response_json LONGTEXT NULL,
            erro_json LONGTEXT NULL,
            criado_por VARCHAR(120) NULL,
            cliente_concordou_consulta TINYINT(1) NOT NULL DEFAULT 0,
            cliente_concordou_consulta_em DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_documento_created_at (documento, created_at),
            KEY idx_cliente_created_at (cliente_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        yield executeDb(`
        ALTER TABLE ivp_analise_credito
            ADD COLUMN IF NOT EXISTS cliente_concordou_consulta TINYINT(1) NOT NULL DEFAULT 0 AFTER criado_por,
            ADD COLUMN IF NOT EXISTS cliente_concordou_consulta_em DATETIME NULL AFTER cliente_concordou_consulta
    `);
        tabelaAnaliseCreditoPronta = true;
    });
}
function registrarAnaliseCredito(input) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield garantirTabelaAnaliseCredito();
            const result = yield executeDb(`INSERT INTO ivp_analise_credito
             (cliente_id, documento, tipo_cadastro, origem, ambiente, classificacao, status_decisao, modalidade,
              taxa_habilitacao, motivo, raw_response_json, erro_json, criado_por,
              cliente_concordou_consulta, cliente_concordou_consulta_em)
             VALUES (?, ?, ?, 'SPC', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
                input.clienteId || null,
                limparDocumento(input.documento),
                input.tipoCadastro,
                process.env.SPC_ENV || 'homologacao',
                input.classificacao,
                input.decision.status,
                input.decision.modalidade,
                input.decision.taxaHabilitacao,
                input.decision.motivo,
                input.rawResponse ? jsonSeguro(input.rawResponse) : null,
                input.erro ? jsonSeguro(input.erro) : null,
                input.criadoPor || null,
                input.clienteConcordouConsulta ? 1 : 0
            ]);
            return (result === null || result === void 0 ? void 0 : result.insertId) || null;
        }
        catch (error) {
            (0, logger_1.logError)('SPC.Auditoria', error, {
                clienteId: input.clienteId,
                documento: mascararDocumento(input.documento),
                tipoCadastro: input.tipoCadastro,
                classificacao: input.classificacao,
                status: input.decision.status
            });
            return null;
        }
    });
}
exports.registrarAnaliseCredito = registrarAnaliseCredito;
function logFormatoSpcParaHomologacao(rawResponse, meta) {
    const ambiente = String(process.env.SPC_ENV || '').toLowerCase();
    if (ambiente !== 'homologacao')
        return;
    (0, logger_1.logInfo)('SPC.Homologacao.Payload', 'Formato de retorno SPC recebido em homologacao.', Object.assign(Object.assign({}, meta), { estrutura: resumirFormato(rawResponse) }));
}
exports.logFormatoSpcParaHomologacao = logFormatoSpcParaHomologacao;
function logErroSpc(error, meta) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const status = (error === null || error === void 0 ? void 0 : error.statusCode) || (error === null || error === void 0 ? void 0 : error.spcStatus);
    const metaCompleta = Object.assign(Object.assign({}, meta), { ambiente: ((_a = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _a === void 0 ? void 0 : _a.ambiente) || process.env.SPC_ENV || 'homologacao', spcUrl: (_b = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _b === void 0 ? void 0 : _b.url, spcMetodo: (_c = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _c === void 0 ? void 0 : _c.metodo, spcMockEnabled: (_d = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _d === void 0 ? void 0 : _d.mockEnabled, spcStatusHttp: ((_e = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _e === void 0 ? void 0 : _e.statusHttp) || (error === null || error === void 0 ? void 0 : error.spcStatus) || null, spcContentType: ((_f = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _f === void 0 ? void 0 : _f.contentType) || null, spcBodyResumo: ((_g = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _g === void 0 ? void 0 : _g.bodyResumo) || null, spcPayloadResumo: ((_h = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _h === void 0 ? void 0 : _h.payloadResumo) || null, duracaoMs: ((_j = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _j === void 0 ? void 0 : _j.duracaoMs) || null, timeoutMs: ((_k = error === null || error === void 0 ? void 0 : error.spcMeta) === null || _k === void 0 ? void 0 : _k.timeoutMs) || null, code: (error === null || error === void 0 ? void 0 : error.code) || null, publicMessage: (error === null || error === void 0 ? void 0 : error.publicMessage) || null });
    if (status === 401 || status === 400 || (error === null || error === void 0 ? void 0 : error.code) === 'SPC_MOCK_ERRO_CONSULTA') {
        (0, logger_1.logWarn)('SPC.Consulta', (error === null || error === void 0 ? void 0 : error.publicMessage) || (error === null || error === void 0 ? void 0 : error.message) || 'Falha controlada na consulta SPC.', metaCompleta);
        return;
    }
    (0, logger_1.logError)('SPC.Consulta', error, metaCompleta);
}
exports.logErroSpc = logErroSpc;
