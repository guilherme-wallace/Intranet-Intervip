import axios, { Method } from 'axios';
import { LOCALHOST } from '../../api/database';
import { logError, logInfo, logWarn } from '../../api/logger';

export type SpcClassification = 'SEM_RESTRICAO' | 'RESTRICAO_FINANCEIRA' | 'RESTRICAO_TELECOM' | 'ERRO_CONSULTA' | 'ANALISE_MANUAL';
export type CreditDecisionStatus = 'APROVADO' | 'APROVADO_COM_CONDICAO' | 'BLOQUEADO' | 'ANALISE_MANUAL';
export type TipoCadastroCredito = 'BANDA_LARGA' | 'CORPORATIVO';

export interface CreditDecision {
    status: CreditDecisionStatus;
    perfil: 'SEM_RESTRICAO' | 'RESTRICAO_FINANCEIRA' | 'RESTRICAO_TELECOM' | 'ANALISE_MANUAL';
    modalidade: 'POS_PAGO' | 'PRE_PAGO' | null;
    taxaHabilitacao: 0 | 150 | 250 | null;
    motivo: string;
}

export interface AuditCreditAnalysisInput {
    clienteId?: string | null;
    documento: string;
    tipoCadastro: TipoCadastroCredito;
    classificacao: SpcClassification;
    decision: CreditDecision;
    rawResponse?: any;
    erro?: any;
    criadoPor?: string | null;
}

export interface SpcConsultaContext {
    requestId?: string;
    usuario?: string;
}

export interface SpcRestrictionSummaryItem {
    tipo: string;
    label: string;
    quantidade: number;
}

const SPC_TIMEOUT_MS = Number(process.env.SPC_TIMEOUT_MS || 90000);
const BODY_ERRO_MAX_CHARS = 1000;

function executeDb(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        LOCALHOST.query(query, params, (err: any, results: any) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

export function limparDocumento(documento: any): string {
    return String(documento || '').replace(/\D/g, '');
}

export function mascararDocumento(documento: any): string {
    const limpo = limparDocumento(documento);
    if (limpo.length === 11) return `${limpo.slice(0, 3)}.***.***-${limpo.slice(-2)}`;
    if (limpo.length === 14) return `${limpo.slice(0, 2)}.***.***/****-${limpo.slice(-2)}`;
    return limpo ? `${limpo.slice(0, 3)}***${limpo.slice(-2)}` : '';
}

export function formatarTimestampSpcPtBr(timestamp: any): string {
    const numero = Number(timestamp);
    if (!Number.isFinite(numero) || numero <= 0) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date(numero));
}

function validarCpf(cpf: string): boolean {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    if (digito !== Number(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
    digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    return digito === Number(cpf[10]);
}

function validarCnpj(cnpj: string): boolean {
    if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
    const calcular = (base: string, pesos: number[]) => {
        const soma = base.split('').reduce((acc, digito, index) => acc + Number(digito) * pesos[index], 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    const digito1 = calcular(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const digito2 = calcular(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digito1 === Number(cnpj[12]) && digito2 === Number(cnpj[13]);
}

export function validarDocumentoCredito(documento: any, permitirMockSemDigito = false): { valido: boolean; documentoLimpo: string; tipoDocumento: 'CPF' | 'CNPJ' | null; erro?: string } {
    const documentoLimpo = limparDocumento(documento);
    if (documentoLimpo.length === 11) {
        if (permitirMockSemDigito) return { valido: true, documentoLimpo, tipoDocumento: 'CPF' };
        return { valido: validarCpf(documentoLimpo), documentoLimpo, tipoDocumento: 'CPF', erro: validarCpf(documentoLimpo) ? undefined : 'CPF invalido.' };
    }
    if (documentoLimpo.length === 14) {
        if (permitirMockSemDigito) return { valido: true, documentoLimpo, tipoDocumento: 'CNPJ' };
        return { valido: validarCnpj(documentoLimpo), documentoLimpo, tipoDocumento: 'CNPJ', erro: validarCnpj(documentoLimpo) ? undefined : 'CNPJ invalido.' };
    }
    return { valido: false, documentoLimpo, tipoDocumento: null, erro: 'Informe um CPF ou CNPJ valido.' };
}

function normalizarTexto(valor: any): string {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

function jsonSeguro(valor: any): string {
    try {
        return JSON.stringify(valor);
    } catch (error: any) {
        return String(error?.message || valor || '');
    }
}

function limitarTexto(valor: any, limite = BODY_ERRO_MAX_CHARS): string {
    const texto = typeof valor === 'string' ? valor : jsonSeguro(valor);
    return texto.length > limite ? `${texto.slice(0, limite)}...[truncado]` : texto;
}

export function isSpcMockEnabled(): boolean {
    return String(process.env.SPC_MOCK_ENABLED || 'false').trim().toLowerCase() === 'true';
}

export function obterConfigSpcSegura() {
    const baseUrl = String(process.env.SPC_BASE_URL || '').replace(/\/+$/, '');
    const url = process.env.SPC_CONSULTA_PADRAO_URL || (baseUrl ? `${baseUrl}/spcconsulta/recurso/consulta/padrao` : '');
    const metodo = String(process.env.SPC_HTTP_METHOD || 'POST').toUpperCase() as Method;
    return {
        ambiente: process.env.SPC_ENV || 'homologacao',
        mockEnabled: isSpcMockEnabled(),
        url,
        metodo,
        timeoutMs: Number.isFinite(SPC_TIMEOUT_MS) ? SPC_TIMEOUT_MS : 90000,
        possuiUsuario: Boolean(process.env.SPC_USERNAME_WEB_SERVICE),
        possuiSenha: Boolean(process.env.SPC_PASSWORD_WEB_SERVICE),
        possuiCodigoProduto: Boolean(
            process.env.SPC_CODIGO_PRODUTO_PADRAO
            || process.env.SPC_CODIGO_PRODUTO_PF
            || process.env.SPC_CODIGO_PRODUTO_PJ
            || process.env.SPC_CODIGO_PRODUTO
        )
    };
}

function obterTipoConsumidor(tipoDocumento: 'CPF' | 'CNPJ' | null): 'F' | 'J' {
    return tipoDocumento === 'CNPJ' ? 'J' : 'F';
}

function obterCodigoProduto(tipoConsumidor: 'F' | 'J'): string {
    const codigoEspecifico = tipoConsumidor === 'J'
        ? process.env.SPC_CODIGO_PRODUTO_PJ
        : process.env.SPC_CODIGO_PRODUTO_PF;
    return String(
        codigoEspecifico
        || process.env.SPC_CODIGO_PRODUTO_PADRAO
        || process.env.SPC_CODIGO_PRODUTO
        || ''
    ).trim();
}

function obterCodigoInsumoOpcional(): Array<string | number> {
    return String(process.env.SPC_CODIGO_INSUMO_OPCIONAL || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => /^\d+$/.test(item) ? Number(item) : item);
}

export function montarPayloadSpc(documentoLimpo: string, tipoDocumento: 'CPF' | 'CNPJ' | null): any {
    const tipoConsumidor = obterTipoConsumidor(tipoDocumento);
    const codigoProduto = obterCodigoProduto(tipoConsumidor);

    if (!codigoProduto) {
        const erro: any = new Error('Codigo de produto SPC nao configurado.');
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

function montarRespostaMockSpc(documentoLimpo: string): any {
    const sufixo = documentoLimpo.slice(-2);
    if (sufixo === '44') {
        const erro: any = new Error('Mock SPC ERRO_CONSULTA');
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

    const classificationBySuffix: Record<string, SpcClassification> = {
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

function resumirFormato(valor: any, profundidade = 0): any {
    if (valor === null || typeof valor === 'undefined') return valor;
    if (profundidade >= 3) return Array.isArray(valor) ? `[Array(${valor.length})]` : `[${typeof valor}]`;
    if (Array.isArray(valor)) {
        return {
            tipo: 'array',
            tamanho: valor.length,
            primeiroItem: valor.length ? resumirFormato(valor[0], profundidade + 1) : null
        };
    }
    if (typeof valor === 'object') {
        const resumo: any = {};
        Object.keys(valor).slice(0, 50).forEach((chave) => {
            const item = valor[chave];
            resumo[chave] = item && typeof item === 'object' ? resumirFormato(item, profundidade + 1) : typeof item;
        });
        return resumo;
    }
    return typeof valor;
}

function contemAlguma(texto: string, termos: string[]): boolean {
    return termos.some(termo => texto.includes(termo));
}

function possuiListaRestritivaPreenchida(raw: any): boolean {
    const nomesRestritivos = /restri|penden|inadimpl|negativ|spc|protest|debito|divida|ocorrenc/i;
    const visitar = (valor: any): boolean => {
        if (!valor || typeof valor !== 'object') return false;
        if (Array.isArray(valor)) return valor.some(item => visitar(item));
        return Object.entries(valor).some(([chave, item]) => {
            if (Array.isArray(item) && nomesRestritivos.test(chave) && item.length > 0) return true;
            if (typeof item === 'number' && item > 0 && nomesRestritivos.test(chave)) return true;
            if (typeof item === 'string' && item !== '0' && /^\d+$/.test(item) && nomesRestritivos.test(chave)) return true;
            return visitar(item);
        });
    };
    return visitar(raw);
}

function possuiListasRestritivasVazias(raw: any): boolean {
    const nomesRestritivos = /restri|penden|inadimpl|negativ|spc|protest|debito|divida|ocorrenc/i;
    let encontrouLista = false;
    let encontrouPreenchida = false;
    const visitar = (valor: any) => {
        if (!valor || typeof valor !== 'object') return;
        if (Array.isArray(valor)) {
            valor.forEach(visitar);
            return;
        }
        Object.entries(valor).forEach(([chave, item]) => {
            if (Array.isArray(item) && nomesRestritivos.test(chave)) {
                encontrouLista = true;
                if (item.length > 0) encontrouPreenchida = true;
            }
            visitar(item);
        });
    };
    visitar(raw);
    return encontrouLista && !encontrouPreenchida;
}

function obterResultadoRestSpc(rawResponse: any): any | null {
    return rawResponse?.result?.return_object?.resultado || null;
}

function quantidadePositiva(valor: any): boolean {
    const numero = Number(valor || 0);
    return Number.isFinite(numero) && numero > 0;
}

function quantidadeResumoPositiva(bloco: any): boolean {
    return quantidadePositiva(bloco?.resumo?.quantidadeTotal);
}

function obterQuantidadeResumo(bloco: any): number {
    const numero = Number(bloco?.resumo?.quantidadeTotal || 0);
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function temDetalhePreenchido(valor: any): boolean {
    if (!valor) return false;
    if (Array.isArray(valor)) return valor.length > 0;
    if (typeof valor === 'object') return Object.keys(valor).length > 0;
    if (typeof valor === 'string') return valor.trim() !== '';
    return Boolean(valor);
}

function temInformacaoPoderJudiciario(valor: any): boolean {
    if (!valor) return false;
    if (Array.isArray(valor)) return valor.length > 0;
    if (typeof valor === 'object') {
        if (quantidadeResumoPositiva(valor)) return true;
        return Object.entries(valor).some(([chave, item]) => {
            if (chave === 'resumo') return false;
            if (typeof item === 'number') return item > 0;
            if (typeof item === 'string') return item.trim() !== '' && item.trim() !== '0';
            return temInformacaoPoderJudiciario(item);
        });
    }
    return Boolean(valor);
}

function getValorPorCaminho(obj: any, caminho: string[]): any {
    return caminho.reduce((acc, chave) => acc?.[chave], obj);
}

function extrairItensDetalheRestricao(resultado: any): any[] {
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
        if (!valor) return [];
        return Array.isArray(valor) ? valor : [valor];
    });
}

function textoCamposTelecom(item: any): string {
    if (!item || typeof item !== 'object') return normalizarTexto(item);
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

function possuiIndicadorTelecom(resultado: any): boolean {
    const termosTelecom = ['TELECOM', 'TELECOMUNICACOES', 'INTERNET', 'FIBRA', 'BANDA LARGA', 'CLARO', 'VIVO', 'TIM', 'OI', 'NET'];
    return extrairItensDetalheRestricao(resultado).some(item => contemAlguma(textoCamposTelecom(item), termosTelecom));
}

function possuiBlocoRestritivoRest(resultado: any): boolean {
    return quantidadeResumoPositiva(resultado?.spc)
        || quantidadeResumoPositiva(resultado?.pendenciaFinanceira)
        || quantidadeResumoPositiva(resultado?.protesto)
        || quantidadeResumoPositiva(resultado?.chequeLojista)
        || quantidadeResumoPositiva(resultado?.ccf)
        || temDetalhePreenchido(resultado?.spc?.detalheSpc)
        || temDetalhePreenchido(resultado?.pendenciaFinanceira?.detalhePendenciaFinanceira)
        || temInformacaoPoderJudiciario(resultado?.informacaoPoderJudiciario);
}

function obterQuantidadeDetalhes(valor: any): number {
    if (!valor) return 0;
    if (Array.isArray(valor)) return valor.length;
    if (typeof valor === 'object') return Object.keys(valor).length > 0 ? 1 : 0;
    if (typeof valor === 'string') return valor.trim() ? 1 : 0;
    return Boolean(valor) ? 1 : 0;
}

function montarItemResumoRestricao(tipo: string, label: string, bloco: any, detalheKey?: string): SpcRestrictionSummaryItem | null {
    const quantidadeResumo = obterQuantidadeResumo(bloco);
    const quantidadeDetalhes = detalheKey ? obterQuantidadeDetalhes(bloco?.[detalheKey]) : 0;
    const quantidade = quantidadeResumo || quantidadeDetalhes;
    if (!quantidade) return null;
    return { tipo, label, quantidade };
}

export function buildSpcRestrictionSummary(rawResponse: any): SpcRestrictionSummaryItem[] {
    const resultado = obterResultadoRestSpc(rawResponse);
    if (!resultado) return [];

    const itens = [
        montarItemResumoRestricao('spc', 'SPC', resultado.spc, 'detalheSpc'),
        montarItemResumoRestricao('pendenciaFinanceira', 'pendencia financeira', resultado.pendenciaFinanceira, 'detalhePendenciaFinanceira'),
        montarItemResumoRestricao('protesto', 'protesto', resultado.protesto, 'detalheProtesto'),
        montarItemResumoRestricao('chequeLojista', 'cheque lojista', resultado.chequeLojista, 'detalheChequeLojista'),
        montarItemResumoRestricao('ccf', 'CCF', resultado.ccf, 'detalheCcf')
    ].filter(Boolean) as SpcRestrictionSummaryItem[];

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

function encontrarSituacaoCpf(valor: any): any | null {
    if (!valor || typeof valor !== 'object') return null;
    if (valor.situacaoCpf) return valor.situacaoCpf;
    if (Array.isArray(valor)) {
        for (const item of valor) {
            const encontrado = encontrarSituacaoCpf(item);
            if (encontrado) return encontrado;
        }
        return null;
    }
    for (const item of Object.values(valor)) {
        const encontrado = encontrarSituacaoCpf(item);
        if (encontrado) return encontrado;
    }
    return null;
}

function possuiSituacaoCpfParaAnaliseManual(resultado: any): boolean {
    const situacaoCpf = encontrarSituacaoCpf(resultado);
    const descricao = normalizarTexto(situacaoCpf?.descricaoSituacao || situacaoCpf?.situacao || situacaoCpf?.descricao || '');
    return ['CANCELADA', 'SUSPENSA', 'NULA', 'IRREGULAR'].some(termo => descricao.includes(termo));
}

export function normalizeSpcResult(rawResponse: any): { classification: SpcClassification; motivo: string } {
    if (!rawResponse) {
        return { classification: 'ANALISE_MANUAL', motivo: 'SPC retornou resposta vazia.' };
    }

    const mockClassification = String(rawResponse?.mockClassification || '') as SpcClassification;
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

export function buildCreditDecision(params: {
    spcClassification: SpcClassification;
    hasActiveContract: boolean;
    hasInternalFinancialRestriction: boolean;
}): CreditDecision {
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

export async function consultarSpc(documento: string, context: SpcConsultaContext = {}): Promise<any> {
    const inicioConsulta = Date.now();
    const validacao = validarDocumentoCredito(documento, isSpcMockEnabled());
    if (!validacao.valido) {
        const erro: any = new Error(validacao.erro || 'Documento invalido.');
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
        const erro: any = new Error('Configuracao do SPC Brasil incompleta.');
        erro.statusCode = 500;
        erro.publicMessage = 'Consulta SPC indisponivel por configuracao incompleta.';
        erro.spcMeta = {
            ...configSpc,
            statusHttp: null,
            contentType: null,
            bodyResumo: null,
            duracaoMs: Date.now() - inicioConsulta
        };
        throw erro;
    }

    let payload: any;
    try {
        payload = montarPayloadSpc(validacao.documentoLimpo, validacao.tipoDocumento);
    } catch (error: any) {
        error.spcMeta = {
            ...configSpc,
            statusHttp: null,
            contentType: null,
            bodyResumo: 'Codigo de produto SPC ausente.',
            duracaoMs: Date.now() - inicioConsulta
        };
        throw error;
    }
    const payloadResumo = {
        codigoProduto: payload.codigoProduto,
        tipoConsumidor: payload.tipoConsumidor,
        codigoInsumoOpcional: payload.codigoInsumoOpcional
    };
    const authorization = Buffer.from(`${username}:${password}`).toString('base64');

    try {
        const response = await axios.request({
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

        const contentType = String(response.headers?.['content-type'] || '');
        if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
            const erro: any = new Error('Resposta inesperada do SPC Brasil.');
            erro.statusCode = 502;
            erro.publicMessage = 'Resposta inesperada do SPC Brasil.';
            erro.spcStatus = response.status;
            erro.spcMeta = {
                ...configSpc,
                payloadResumo,
                statusHttp: response.status,
                contentType,
                bodyResumo: limitarTexto(response.data),
                duracaoMs: Date.now() - inicioConsulta
            };
            throw erro;
        }

        logInfo('SPC.Consulta', 'Consulta SPC concluida.', {
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
    } catch (error: any) {
        if (error?.publicMessage && error?.spcMeta) throw error;

        const status = error?.response?.status;
        const erro: any = new Error(error?.message || 'Falha ao consultar SPC Brasil.');
        erro.statusCode = status || (error?.code === 'ECONNABORTED' ? 504 : 502);
        erro.code = error?.code;
        erro.spcStatus = status;
        erro.spcResponse = error?.response?.data;
        erro.spcMeta = {
            ...configSpc,
            payloadResumo,
            statusHttp: status || null,
            contentType: error?.response?.headers?.['content-type'] || null,
            bodyResumo: error?.response ? limitarTexto(error.response.data) : limitarTexto(error?.message || error?.code || 'Erro sem resposta HTTP do SPC'),
            duracaoMs: Date.now() - inicioConsulta
        };

        if (status === 401) erro.publicMessage = 'Falha de autenticação com SPC Brasil. Verifique operador e senha do Web Service.';
        else if (status === 400) erro.publicMessage = 'Consulta SPC recusada. Verifique documento, produto contratado ou formato da requisição.';
        else if (error?.code === 'ECONNABORTED') erro.publicMessage = 'Tempo limite excedido ao consultar SPC Brasil. Tente novamente em alguns instantes.';
        else if (['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(String(error?.code || '').toUpperCase())) erro.publicMessage = 'Não foi possível conectar ao SPC Brasil.';
        else if (status >= 500) erro.publicMessage = 'SPC Brasil temporariamente indisponível.';
        else erro.publicMessage = 'Resposta inesperada do SPC Brasil.';

        throw erro;
    }
}

async function garantirTabelaAnaliseCredito(): Promise<void> {
    await executeDb(`
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
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_documento_created_at (documento, created_at),
            KEY idx_cliente_created_at (cliente_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

export async function registrarAnaliseCredito(input: AuditCreditAnalysisInput): Promise<number | null> {
    try {
        await garantirTabelaAnaliseCredito();
        const result = await executeDb(
            `INSERT INTO ivp_analise_credito
             (cliente_id, documento, tipo_cadastro, origem, ambiente, classificacao, status_decisao, modalidade, taxa_habilitacao, motivo, raw_response_json, erro_json, criado_por)
             VALUES (?, ?, ?, 'SPC', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
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
                input.criadoPor || null
            ]
        );
        return result?.insertId || null;
    } catch (error: any) {
        logError('SPC.Auditoria', error, {
            clienteId: input.clienteId,
            documento: mascararDocumento(input.documento),
            tipoCadastro: input.tipoCadastro,
            classificacao: input.classificacao,
            status: input.decision.status
        });
        return null;
    }
}

export function logFormatoSpcParaHomologacao(rawResponse: any, meta: any) {
    const ambiente = String(process.env.SPC_ENV || '').toLowerCase();
    if (ambiente !== 'homologacao') return;
    logInfo('SPC.Homologacao.Payload', 'Formato de retorno SPC recebido em homologacao.', {
        ...meta,
        estrutura: resumirFormato(rawResponse)
    });
}

export function logErroSpc(error: any, meta: any) {
    const status = error?.statusCode || error?.spcStatus;
    const metaCompleta = {
        ...meta,
        ambiente: error?.spcMeta?.ambiente || process.env.SPC_ENV || 'homologacao',
        spcUrl: error?.spcMeta?.url,
        spcMetodo: error?.spcMeta?.metodo,
        spcMockEnabled: error?.spcMeta?.mockEnabled,
        spcStatusHttp: error?.spcMeta?.statusHttp || error?.spcStatus || null,
        spcContentType: error?.spcMeta?.contentType || null,
        spcBodyResumo: error?.spcMeta?.bodyResumo || null,
        spcPayloadResumo: error?.spcMeta?.payloadResumo || null,
        duracaoMs: error?.spcMeta?.duracaoMs || null,
        timeoutMs: error?.spcMeta?.timeoutMs || null,
        code: error?.code || null,
        publicMessage: error?.publicMessage || null
    };

    if (status === 401 || status === 400 || error?.code === 'SPC_MOCK_ERRO_CONSULTA') {
        logWarn('SPC.Consulta', error?.publicMessage || error?.message || 'Falha controlada na consulta SPC.', metaCompleta);
        return;
    }
    logError('SPC.Consulta', error, metaCompleta);
}
