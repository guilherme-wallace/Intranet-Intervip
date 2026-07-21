import { LOCALHOST } from '../../api/database';
import { logError } from '../../api/logger';
import { CreditDecision, limparDocumento, TipoCadastroCredito } from './spcService';

export interface IxcCreditContractConfig {
    tipoContratoPosPagoPorDia: Record<string, string>;
    tipoContratoPrePagoPorDia: Record<string, string>;
    condPagAtivacaoUnicaId: string;
    produtoTaxaAtivacaoId: string;
    tipoDocAtivacaoId: string;
    ativacaoVencimentoDias: number;
}

export type IxcContractModality = 'POS_PAGO' | 'PRE_PAGO';
export type ActivationBillingStatus =
    | 'NAO_APLICAVEL'
    | 'FATURADO'
    | 'VENDA_ATIVACAO_GERADA'
    | 'PENDENTE_FATURAR_ATIVACAO'
    | 'PROCESSANDO_FATURAMENTO'
    | 'PENDENTE_CONFIRMAR_FINANCEIRO'
    | 'ERRO_SEM_VENDA'
    | 'ERRO_FATURAR_ATIVACAO';

export interface ActivationBillingResult {
    status: ActivationBillingStatus;
    mensagem: string | null;
}

export const MANUAL_ACTIVATION_BILLING_MESSAGE = "Contrato criado com taxa de ativação, porém o faturamento da ativação precisa ser realizado manualmente no IXC pelo botão 'Faturar ativação/instalação'.";

export interface PersistedCreditAnalysis {
    id: number;
    clienteId: string | null;
    documento: string;
    tipoCadastro: TipoCadastroCredito;
    classificacao: string;
    criadoPor: string | null;
    createdAt: any;
    decision: CreditDecision;
}

export interface CreditContractAuditInput {
    analiseCreditoId: number;
    clienteId?: string | null;
    tipoCadastro: TipoCadastroCredito;
    decision: CreditDecision;
    diaVencimento: any;
    criadoPor: string;
    requestId?: string;
}

export class CreditContractRuleError extends Error {
    code: string;
    statusCode: number;
    isCreditRuleError = true;

    constructor(message: string, code: string, statusCode = 422) {
        super(message);
        this.name = 'CreditContractRuleError';
        this.code = code;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, CreditContractRuleError.prototype);
    }
}

function executeDb(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        LOCALHOST.query(query, params, (err: any, results: any) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

function envText(name: string): string {
    return String(process.env[name] || '').trim();
}

function parseVencimentoDias(value: string): number {
    if (value === '') return 0;
    if (!/^\d+$/.test(value)) {
        throw new CreditContractRuleError(
            'IXC_ATIVACAO_VENCIMENTO_DIAS deve ser um numero inteiro maior ou igual a zero.',
            'IXC_CREDIT_CONFIG_INVALID',
            500
        );
    }
    return Number(value);
}

export function getIxcCreditContractConfig(): IxcCreditContractConfig {
    return {
        tipoContratoPosPagoPorDia: {
            '5': envText('IXC_TIPO_CONTRATO_POS_PAGO_DIA_5_ID'),
            '10': envText('IXC_TIPO_CONTRATO_POS_PAGO_DIA_10_ID'),
            '15': envText('IXC_TIPO_CONTRATO_POS_PAGO_DIA_15_ID'),
            '20': envText('IXC_TIPO_CONTRATO_POS_PAGO_DIA_20_ID'),
            '25': envText('IXC_TIPO_CONTRATO_POS_PAGO_DIA_25_ID'),
            '30': envText('IXC_TIPO_CONTRATO_POS_PAGO_DIA_30_ID')
        },
        tipoContratoPrePagoPorDia: {
            '5': envText('IXC_TIPO_CONTRATO_PRE_PAGO_DIA_5_ID'),
            '10': envText('IXC_TIPO_CONTRATO_PRE_PAGO_DIA_10_ID'),
            '15': envText('IXC_TIPO_CONTRATO_PRE_PAGO_DIA_15_ID'),
            '20': envText('IXC_TIPO_CONTRATO_PRE_PAGO_DIA_20_ID'),
            '25': envText('IXC_TIPO_CONTRATO_PRE_PAGO_DIA_25_ID'),
            '30': envText('IXC_TIPO_CONTRATO_PRE_PAGO_DIA_30_ID')
        },
        condPagAtivacaoUnicaId: envText('IXC_COND_PAG_ATIVACAO_UNICA_ID'),
        produtoTaxaAtivacaoId: envText('IXC_PRODUTO_TAXA_ATIVACAO_ID'),
        tipoDocAtivacaoId: envText('IXC_TIPO_DOC_ATIVACAO_ID'),
        ativacaoVencimentoDias: parseVencimentoDias(envText('IXC_ATIVACAO_VENCIMENTO_DIAS'))
    };
}

export function resolveIxcTipoContratoId(
    modalidade: IxcContractModality,
    diaVencimento: any,
    options: IxcCreditContractConfig = getIxcCreditContractConfig()
): string {
    const dia = String(diaVencimento || '').trim();
    if (!['5', '10', '15', '20', '25', '30'].includes(dia)) {
        throw new CreditContractRuleError(
            `Dia de vencimento ${dia || 'não informado'} não é suportado para o contrato IXC.`,
            'IXC_CONTRACT_DUE_DAY_UNSUPPORTED',
            422
        );
    }

    const mapping = modalidade === 'POS_PAGO'
        ? options.tipoContratoPosPagoPorDia
        : options.tipoContratoPrePagoPorDia;
    const id = String(mapping?.[dia] || '').trim();
    if (id) return id;

    const modalidadeTexto = modalidade === 'POS_PAGO' ? 'pós-pago' : 'pré-pago';
    throw new CreditContractRuleError(
        `Tipo de contrato ${modalidadeTexto} para vencimento dia ${dia} não está configurado no IXC.`,
        modalidade === 'PRE_PAGO'
            ? 'IXC_PREPAID_CONTRACT_TYPE_NOT_CONFIGURED'
            : 'IXC_POSTPAID_CONTRACT_TYPE_NOT_CONFIGURED',
        422
    );
}

export function resolveIxcContractDueDay(
    modalidade: IxcContractModality,
    diaVencimentoSelecionado: any,
    options: IxcCreditContractConfig = getIxcCreditContractConfig(),
    now: Date = new Date()
): number {
    if (modalidade === 'POS_PAGO') {
        const selectedDay = String(diaVencimentoSelecionado || '').trim();
        // Reaproveita a validacao de dias suportados e de configuracao do ID.
        resolveIxcTipoContratoId('POS_PAGO', selectedDay, options);
        return Number(selectedDay);
    }

    const configuredDays = Object.entries(options.tipoContratoPrePagoPorDia || {})
        .filter(([, id]) => String(id || '').trim())
        .map(([day]) => Number(day))
        .filter(day => Number.isInteger(day) && day >= 1 && day <= 31)
        .sort((a, b) => a - b);
    if (configuredDays.length === 0) {
        throw new CreditContractRuleError(
            'Nenhum tipo de contrato pre-pago esta configurado no IXC.',
            'IXC_PREPAID_CONTRACT_TYPE_NOT_CONFIGURED',
            500
        );
    }

    const dayInSaoPaulo = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        day: 'numeric'
    }).format(now));
    return configuredDays.find(day => day >= dayInSaoPaulo) || configuredDays[0];
}

function requireConfig(value: string | undefined, envName: string): string {
    if (value) return value;
    throw new CreditContractRuleError(
        `Configuracao IXC obrigatoria ausente: ${envName}.`,
        'IXC_CREDIT_CONFIG_MISSING',
        500
    );
}

function formatDateDmy(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
}

export function calculateIxcActivationDueDate(days: number, now: Date = new Date()): string {
    const dueDate = new Date(now.getTime());
    dueDate.setHours(12, 0, 0, 0);
    dueDate.setDate(dueDate.getDate() + days);
    return formatDateDmy(dueDate);
}

function appendCreditObservation(currentObservation: any, creditObservation: string): string {
    return [String(currentObservation || '').trim(), creditObservation]
        .filter(Boolean)
        .join('\n');
}

function clearActivationChargeFields(payload: any): void {
    [
        'id_cond_pag_ativ',
        'ativacao_numero_parcelas',
        'ativacao_vencimentos',
        'ativacao_valor_parcela',
        'id_produto_ativ',
        'id_tipo_doc_ativ'
    ].forEach(field => delete payload[field]);
}

export function applyCreditDecisionToIxcContractPayload(
    payloadContrato: any,
    creditDecision: CreditDecision,
    options: IxcCreditContractConfig,
    diaVencimento: any = payloadContrato?.dia_fixo_vencimento,
    now: Date = new Date()
): any {
    const payload = { ...(payloadContrato || {}) };

    if (!creditDecision) {
        throw new CreditContractRuleError('Analise de credito obrigatoria para criar o contrato.', 'CREDIT_ANALYSIS_REQUIRED');
    }

    if (creditDecision.status === 'BLOQUEADO') {
        throw new CreditContractRuleError(
            creditDecision.motivo || 'Analise de credito bloqueia a criacao do contrato.',
            'CREDIT_DECISION_BLOCKED',
            409
        );
    }

    if (creditDecision.status === 'ANALISE_MANUAL' || creditDecision.perfil === 'ANALISE_MANUAL') {
        throw new CreditContractRuleError(
            'Analise manual pendente. O contrato nao pode ser criado automaticamente.',
            'CREDIT_MANUAL_REVIEW_REQUIRED',
            409
        );
    }

    if (creditDecision.perfil === 'SEM_RESTRICAO') {
        if (creditDecision.status !== 'APROVADO') {
            throw new CreditContractRuleError('Decisao de credito inconsistente para cliente sem restricao.', 'CREDIT_DECISION_INVALID');
        }
        const effectiveDueDay = resolveIxcContractDueDay('POS_PAGO', diaVencimento, options, now);
        payload.dia_fixo_vencimento = String(effectiveDueDay);
        payload.id_tipo_contrato = resolveIxcTipoContratoId('POS_PAGO', effectiveDueDay, options);
        payload.taxa_instalacao = '0.00';
        clearActivationChargeFields(payload);
        return payload;
    }

    const financialRestriction = creditDecision.perfil === 'RESTRICAO_FINANCEIRA';
    const telecomRestriction = creditDecision.perfil === 'RESTRICAO_TELECOM';
    if (!financialRestriction && !telecomRestriction) {
        throw new CreditContractRuleError('Perfil de credito nao reconhecido para criacao do contrato.', 'CREDIT_DECISION_INVALID');
    }
    if (creditDecision.status !== 'APROVADO_COM_CONDICAO') {
        throw new CreditContractRuleError('Decisao de credito inconsistente para contrato pre-pago.', 'CREDIT_DECISION_INVALID');
    }

    const activationFee = financialRestriction ? '150.00' : '250.00';
    const effectiveDueDay = resolveIxcContractDueDay('PRE_PAGO', diaVencimento, options, now);
    payload.dia_fixo_vencimento = String(effectiveDueDay);
    payload.id_tipo_contrato = resolveIxcTipoContratoId('PRE_PAGO', effectiveDueDay, options);
    payload.taxa_instalacao = activationFee;
    payload.id_cond_pag_ativ = requireConfig(options.condPagAtivacaoUnicaId, 'IXC_COND_PAG_ATIVACAO_UNICA_ID');
    payload.ativacao_numero_parcelas = '1';
    payload.ativacao_valor_parcela = activationFee;
    payload.ativacao_vencimentos = calculateIxcActivationDueDate(options.ativacaoVencimentoDias, now);

    payload.id_produto_ativ = requireConfig(options.produtoTaxaAtivacaoId, 'IXC_PRODUTO_TAXA_ATIVACAO_ID');
    payload.id_tipo_doc_ativ = requireConfig(options.tipoDocAtivacaoId, 'IXC_TIPO_DOC_ATIVACAO_ID');

    const profileText = financialRestriction ? 'restricao financeira' : 'restricao telecom';
    payload.obs = appendCreditObservation(
        payload.obs,
        `Analise de credito: ${profileText}. Contrato criado na modalidade pre-paga com taxa de ativacao em parcela unica.`
    );
    return payload;
}

function persistedDecisionFromRow(row: any): CreditDecision {
    const taxa = row.taxa_habilitacao === null || typeof row.taxa_habilitacao === 'undefined'
        ? null
        : Number(row.taxa_habilitacao);
    return {
        status: row.status_decisao,
        perfil: ['SEM_RESTRICAO', 'RESTRICAO_FINANCEIRA', 'RESTRICAO_TELECOM'].includes(String(row.classificacao))
            ? row.classificacao
            : 'ANALISE_MANUAL',
        modalidade: row.modalidade || null,
        taxaHabilitacao: taxa as 0 | 150 | 250 | null,
        motivo: String(row.motivo || '')
    };
}

export async function loadCreditAnalysisForIxcContract(params: {
    analiseCreditoId: any;
    documento: any;
    tipoCadastro: TipoCadastroCredito;
    clienteId?: any;
    diaVencimento: any;
}): Promise<PersistedCreditAnalysis> {
    const analysisId = Number(params.analiseCreditoId);
    if (!Number.isInteger(analysisId) || analysisId <= 0) {
        throw new CreditContractRuleError('Analise de credito nao informada ou invalida.', 'CREDIT_ANALYSIS_REQUIRED');
    }

    const document = limparDocumento(params.documento);
    const rows = await executeDb(
        `SELECT id, cliente_id, documento, tipo_cadastro, classificacao, status_decisao,
                modalidade, taxa_habilitacao, motivo, criado_por, created_at
         FROM ivp_analise_credito
         WHERE id = ? AND documento = ? AND tipo_cadastro = ?
           AND id = (
               SELECT MAX(ultima.id)
               FROM ivp_analise_credito ultima
               WHERE ultima.documento = ? AND ultima.tipo_cadastro = ?
           )
         LIMIT 1`,
        [analysisId, document, params.tipoCadastro, document, params.tipoCadastro]
    );
    const row = rows?.[0];
    if (!row) {
        throw new CreditContractRuleError(
            'Analise de credito nao encontrada, nao corresponde ao documento ou foi substituida por uma analise mais recente.',
            'CREDIT_ANALYSIS_NOT_FOUND',
            409
        );
    }

    const persistedClientId = String(row.cliente_id || '').trim();
    const requestedClientId = String(params.clienteId || '').trim();
    if (persistedClientId && requestedClientId && persistedClientId !== requestedClientId) {
        throw new CreditContractRuleError('Analise de credito nao corresponde ao cliente informado.', 'CREDIT_ANALYSIS_CLIENT_MISMATCH', 409);
    }

    const analysis: PersistedCreditAnalysis = {
        id: Number(row.id),
        clienteId: persistedClientId || null,
        documento: String(row.documento),
        tipoCadastro: row.tipo_cadastro,
        classificacao: String(row.classificacao),
        criadoPor: row.criado_por || null,
        createdAt: row.created_at,
        decision: persistedDecisionFromRow(row)
    };

    // Valida status/perfil e a configuracao necessaria antes de qualquer escrita no IXC.
    applyCreditDecisionToIxcContractPayload({}, analysis.decision, getIxcCreditContractConfig(), params.diaVencimento);
    return analysis;
}

let auditTableReady = false;

export async function ensureCreditContractAuditTable(): Promise<void> {
    if (auditTableReady) return;
    await executeDb(`
        CREATE TABLE IF NOT EXISTS ivp_contrato_credito_auditoria (
            id INT(11) NOT NULL AUTO_INCREMENT,
            analise_credito_id INT(11) NOT NULL,
            id_cliente VARCHAR(50) NULL,
            id_contrato_ixc VARCHAR(50) NULL,
            tipo_cadastro VARCHAR(30) NOT NULL,
            modalidade VARCHAR(20) NOT NULL,
            taxa_habilitacao DECIMAL(10,2) NOT NULL,
            dia_vencimento INT NULL,
            id_tipo_contrato VARCHAR(50) NULL,
            taxa_instalacao DECIMAL(10,2) NOT NULL DEFAULT 0,
            ativacao_numero_parcelas INT NOT NULL DEFAULT 0,
            id_cond_pag_ativ VARCHAR(50) NULL,
            id_produto_ativ VARCHAR(50) NULL,
            id_tipo_doc_ativ VARCHAR(50) NULL,
            status_faturamento_ativacao VARCHAR(40) NOT NULL DEFAULT 'NAO_APLICAVEL',
            mensagem_faturamento_ativacao VARCHAR(500) NULL,
            id_vd_saida_ativacao VARCHAR(50) NULL,
            id_fn_areceber_ativacao VARCHAR(50) NULL,
            faturamento_ativacao_started_at DATETIME NULL,
            faturamento_ativacao_finished_at DATETIME NULL,
            status_processamento VARCHAR(20) NOT NULL DEFAULT 'PROCESSANDO',
            request_id VARCHAR(80) NULL,
            criado_por VARCHAR(120) NOT NULL,
            erro_resumo VARCHAR(500) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_contrato_credito_analise (analise_credito_id),
            KEY idx_contrato_credito_cliente (id_cliente),
            KEY idx_contrato_credito_ixc (id_contrato_ixc)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await executeDb(`
        ALTER TABLE ivp_contrato_credito_auditoria
            ADD COLUMN IF NOT EXISTS dia_vencimento INT NULL AFTER taxa_habilitacao,
            ADD COLUMN IF NOT EXISTS id_tipo_contrato VARCHAR(50) NULL AFTER dia_vencimento,
            ADD COLUMN IF NOT EXISTS taxa_instalacao DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER id_tipo_contrato,
            ADD COLUMN IF NOT EXISTS id_cond_pag_ativ VARCHAR(50) NULL AFTER ativacao_numero_parcelas,
            ADD COLUMN IF NOT EXISTS id_produto_ativ VARCHAR(50) NULL AFTER id_cond_pag_ativ,
            ADD COLUMN IF NOT EXISTS id_tipo_doc_ativ VARCHAR(50) NULL AFTER id_produto_ativ,
            ADD COLUMN IF NOT EXISTS status_faturamento_ativacao VARCHAR(40) NOT NULL DEFAULT 'NAO_APLICAVEL' AFTER id_tipo_doc_ativ,
            ADD COLUMN IF NOT EXISTS mensagem_faturamento_ativacao VARCHAR(500) NULL AFTER status_faturamento_ativacao,
            ADD COLUMN IF NOT EXISTS id_vd_saida_ativacao VARCHAR(50) NULL AFTER mensagem_faturamento_ativacao,
            ADD COLUMN IF NOT EXISTS id_fn_areceber_ativacao VARCHAR(50) NULL AFTER id_vd_saida_ativacao,
            ADD COLUMN IF NOT EXISTS faturamento_ativacao_started_at DATETIME NULL AFTER id_fn_areceber_ativacao,
            ADD COLUMN IF NOT EXISTS faturamento_ativacao_finished_at DATETIME NULL AFTER faturamento_ativacao_started_at
    `);
    auditTableReady = true;
}

export function getActivationBillingResult(taxaInstalacao: any): ActivationBillingResult {
    const taxa = Number(taxaInstalacao || 0);
    if (taxa <= 0) return { status: 'NAO_APLICAVEL', mensagem: null };
    // O IXC documenta um fluxo financeiro de venda em varias etapas, sem um
    // endpoint atomico confirmado equivalente ao botao de faturamento.
    return {
        status: 'PENDENTE_FATURAR_ATIVACAO',
        mensagem: MANUAL_ACTIVATION_BILLING_MESSAGE
    };
}

export async function startCreditContractAudit(input: CreditContractAuditInput): Promise<number> {
    await ensureCreditContractAuditTable();
    const auditPayload = applyCreditDecisionToIxcContractPayload(
        { dia_fixo_vencimento: input.diaVencimento },
        input.decision,
        getIxcCreditContractConfig(),
        input.diaVencimento
    );
    const modalidade = input.decision.perfil === 'SEM_RESTRICAO' ? 'POS_PAGO' : 'PRE_PAGO';
    try {
        const result = await executeDb(
            `INSERT INTO ivp_contrato_credito_auditoria
             (analise_credito_id, id_cliente, tipo_cadastro, modalidade, taxa_habilitacao,
              dia_vencimento, id_tipo_contrato, taxa_instalacao, ativacao_numero_parcelas,
              id_cond_pag_ativ, id_produto_ativ, id_tipo_doc_ativ, status_faturamento_ativacao,
              mensagem_faturamento_ativacao, status_processamento, request_id, criado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NAO_APLICAVEL', NULL, 'PROCESSANDO', ?, ?)`,
            [
                input.analiseCreditoId,
                input.clienteId || null,
                input.tipoCadastro,
                modalidade,
                Number(auditPayload.taxa_instalacao || 0),
                Number(auditPayload.dia_fixo_vencimento),
                auditPayload.id_tipo_contrato,
                Number(auditPayload.taxa_instalacao || 0),
                Number(auditPayload.ativacao_numero_parcelas || 0),
                auditPayload.id_cond_pag_ativ || null,
                auditPayload.id_produto_ativ || null,
                auditPayload.id_tipo_doc_ativ || null,
                input.requestId || null,
                input.criadoPor
            ]
        );
        return Number(result.insertId);
    } catch (error: any) {
        if (error?.code === 'ER_DUP_ENTRY') {
            throw new CreditContractRuleError(
                'Esta analise de credito ja esta sendo usada ou ja gerou um contrato.',
                'CREDIT_ANALYSIS_ALREADY_USED',
                409
            );
        }
        throw error;
    }
}

export async function associateCreditAnalysisClient(analysis: PersistedCreditAnalysis, clienteId: string, auditId: number): Promise<void> {
    const id = String(clienteId || '').trim();
    if (!id) throw new CreditContractRuleError('Cliente IXC invalido para a analise de credito.', 'CREDIT_ANALYSIS_CLIENT_MISMATCH');
    if (analysis.clienteId && analysis.clienteId !== id) {
        throw new CreditContractRuleError('Analise de credito nao corresponde ao cliente criado no IXC.', 'CREDIT_ANALYSIS_CLIENT_MISMATCH', 409);
    }
    await executeDb(
        `UPDATE ivp_analise_credito SET cliente_id = COALESCE(NULLIF(cliente_id, ''), ?) WHERE id = ?`,
        [id, analysis.id]
    );
    await executeDb(`UPDATE ivp_contrato_credito_auditoria SET id_cliente = ? WHERE id = ?`, [id, auditId]);
    analysis.clienteId = id;
}

export async function finishCreditContractAudit(
    auditId: number,
    contratoId: string,
    faturamentoAtivacao: ActivationBillingResult
): Promise<void> {
    await executeDb(
        `UPDATE ivp_contrato_credito_auditoria
         SET id_contrato_ixc = ?, status_processamento = 'SUCESSO', erro_resumo = NULL,
             status_faturamento_ativacao = ?, mensagem_faturamento_ativacao = ?
         WHERE id = ?`,
        [String(contratoId), faturamentoAtivacao.status, faturamentoAtivacao.mensagem, auditId]
    );
}

export async function failCreditContractAudit(auditId: number | null, error: any): Promise<void> {
    if (!auditId) return;
    const message = String(error?.message || error || 'Falha desconhecida').slice(0, 500);
    try {
        await executeDb(
            `UPDATE ivp_contrato_credito_auditoria
             SET status_processamento = 'FALHA', erro_resumo = ?
             WHERE id = ? AND id_contrato_ixc IS NULL`,
            [message, auditId]
        );
    } catch (auditError: any) {
        logError('IXC.Credito.AuditoriaFalha', auditError, { auditId });
    }
}
