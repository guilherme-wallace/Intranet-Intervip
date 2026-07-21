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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/api/v5/ixc.ts
const Express = require("express");
const axios_1 = require("axios");
const database_1 = require("../../../api/database");
const logger_1 = require("../../../api/logger");
const ixcCreditContractService_1 = require("../../../src/services/ixcCreditContractService");
const ixcActivationBillingService_1 = require("../../../src/services/ixcActivationBillingService");
const spcService_1 = require("../../../src/services/spcService");
const ixcAttendanceProtocolService_1 = require("../../../src/services/ixcAttendanceProtocolService");
function formatarNomePlano(nomeOriginal) {
    if (!nomeOriginal)
        return 'Não informado';
    const nomeUpper = nomeOriginal.toUpperCase();
    const matchVelocidade = nomeUpper.match(/(\d+[MG])/);
    const velocidade = matchVelocidade ? matchVelocidade[1] : '';
    let tecnologia = '';
    if (nomeUpper.includes('FTTH'))
        tecnologia = 'FTTH';
    else if (nomeUpper.includes('FTTB'))
        tecnologia = 'FTTB';
    else if (nomeUpper.includes('AIRMAX') || nomeUpper.includes('RADIO') || nomeUpper.includes('RÁDIO'))
        tecnologia = 'Rádio';
    else if (nomeUpper.includes('PAC'))
        tecnologia = 'PAC';
    if (velocidade && tecnologia) {
        return `${velocidade}_${tecnologia}`;
    }
    return nomeOriginal;
}
const router = Express.Router();
const ID_ASSUNTO_MUDANCA_TITULARIDADE = '218';
const ID_ASSUNTO_CANCELAMENTO_BANDA_LARGA = '14';
const ID_PROCESSO_CANCELAMENTO_BANDA_LARGA = '6';
const TITULO_CANCELAMENTO_BANDA_LARGA = 'CANCELAMENTO - INTERNET BANDA LARGA';
const makeIxcRequest = (method, endpoint, data = null, operationType = null) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN;
    if (!url || !token) {
        throw new Error('IXC_API_URL ou IXC_API_TOKEN não definidos no .env');
    }
    const headers = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    if (data && data.qtype) {
        headers['ixcsoft'] = 'listar';
        method = 'POST';
    }
    else if (operationType) {
        headers['ixcsoft'] = operationType;
    }
    try {
        const response = yield (0, axios_1.default)({
            method: method,
            url: url,
            headers: headers,
            data: data
        });
        return response.data;
    }
    catch (error) {
        const ixcError = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
        let ixcErrorMessage = "Erro desconhecido";
        if (typeof ixcError === 'object' && ixcError !== null) {
            ixcErrorMessage = ixcError.mensagem || ixcError.message || ixcError.msg || JSON.stringify(ixcError);
        }
        else if (typeof ixcError === 'string') {
            ixcErrorMessage = ixcError;
        }
        ixcErrorMessage = ixcErrorMessage.replace(/<br \/>/g, ' ').replace(/<br>/g, ' ');
        console.error(`Erro ao chamar API IXC (${endpoint}) HTTP ${((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || 'N/A'}. Consulte logs/error.log.`);
        (0, logger_1.logError)('IXC.makeIxcRequest', error, {
            endpoint,
            method,
            operationType,
            payload: data,
            resposta_ixc: ixcError,
            http_status: (_c = error.response) === null || _c === void 0 ? void 0 : _c.status
        });
        const erroIxc = new Error(`Falha ao comunicar com o IXC: ${ixcErrorMessage}`);
        erroIxc.ixcResponse = ixcError;
        erroIxc.ixcEndpoint = endpoint;
        if (error.stack)
            erroIxc.stack = `${erroIxc.stack}\nCausado por: ${error.stack}`;
        throw erroIxc;
    }
});
const getIxcDate = () => {
    const now = new Date();
    now.setHours(now.getHours() - 3);
    return now.toISOString().replace('T', ' ').substring(0, 19);
};
const getIxcDateDMY = () => {
    const now = new Date();
    now.setHours(now.getHours() - 3);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
};
function validateExistingIxcClientForCreditAnalysis(clienteId, documento) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const id = String(clienteId || '').trim();
        if (!id)
            return;
        const response = yield makeIxcRequest('POST', '/cliente', {
            qtype: 'cliente.id',
            query: id,
            oper: '=',
            page: '1',
            rp: '1'
        });
        const cliente = (_a = response === null || response === void 0 ? void 0 : response.registros) === null || _a === void 0 ? void 0 : _a[0];
        if (!cliente || (0, spcService_1.limparDocumento)(cliente.cnpj_cpf) !== (0, spcService_1.limparDocumento)(documento)) {
            throw new ixcCreditContractService_1.CreditContractRuleError('Cliente IXC nao corresponde ao documento da analise de credito.', 'CREDIT_ANALYSIS_CLIENT_MISMATCH', 409);
        }
    });
}
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function executeDbLocal(query, params = []) {
    return new Promise((resolve, reject) => {
        database_1.LOCALHOST.query(query, params, (err, results) => {
            if (err)
                return reject(err);
            resolve(results || []);
        });
    });
}
function valorTextoIxc(valor) {
    return String(valor || '').trim();
}
function obterUsuarioIxcCadastro(usuarioIntranet, fallbackFuncionario = '302') {
    return __awaiter(this, void 0, void 0, function* () {
        const usuario = valorTextoIxc(usuarioIntranet);
        if (!usuario || usuario === 'Visitante') {
            return { idFuncionarioIxc: fallbackFuncionario, idUsuarioIxc: '61' };
        }
        const rows = yield executeDbLocal(`SELECT id_funcionario_ixc, id_usuario_ixc
         FROM usuarios_intranet
         WHERE ativo = 1
           AND (usuario = ? OR nome = ?)
         LIMIT 1`, [usuario, usuario]).catch(() => []);
        const row = (rows === null || rows === void 0 ? void 0 : rows[0]) || {};
        const funcionario = valorTextoIxc(row.id_funcionario_ixc);
        return {
            idFuncionarioIxc: funcionario && funcionario !== '138' ? funcionario : fallbackFuncionario,
            idUsuarioIxc: valorTextoIxc(row.id_usuario_ixc) || '61'
        };
    });
}
function buscarRespostaPesquisa(questionId, answerId) {
    return __awaiter(this, void 0, void 0, function* () {
        const id = valorTextoIxc(answerId);
        if (!/^\d+$/.test(id))
            return null;
        const rows = yield executeDbLocal(`SELECT answerId, answer
         FROM saleResearchAnswer
         WHERE questionId = ? AND answerId = ?
         LIMIT 1`, [questionId, id]);
        return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
    });
}
function montarMensagemCancelamento(motivo, operadora, observacao) {
    return [
        'Solicitação de cancelamento de contrato.',
        '',
        `Motivo do cancelamento: ${motivo || 'Nao informado'}`,
        operadora ? `Operadora contratada: ${operadora}` : '',
        observacao ? `Observação: ${observacao}` : ''
    ].filter(linha => linha !== '').join('\r\n');
}
function localizarOsRecolhimentoPorTicket(ticketId) {
    return __awaiter(this, void 0, void 0, function* () {
        const delays = [0, 800, 1500];
        for (const delay of delays) {
            if (delay)
                yield sleep(delay);
            const osResp = yield makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id_ticket',
                query: ticketId,
                oper: '=',
                rp: '20',
                sortname: 'su_oss_chamado.id',
                sortorder: 'desc'
            }).catch(() => ({ registros: [] }));
            const registros = Array.isArray(osResp === null || osResp === void 0 ? void 0 : osResp.registros) ? osResp.registros : [];
            const osRecolhimento = registros.find((os) => {
                const setor19 = String((os === null || os === void 0 ? void 0 : os.setor) || '').trim() === '19';
                const texto = String((os === null || os === void 0 ? void 0 : os.mensagem) || '').toUpperCase();
                const recolhimento = texto.includes('CANCELAR - RECOLHER EQUIPAMENTOS') || texto.includes(TITULO_CANCELAMENTO_BANDA_LARGA);
                const aberta = !['F', 'C'].includes(String((os === null || os === void 0 ? void 0 : os.status) || '').toUpperCase());
                return aberta && (setor19 || recolhimento);
            });
            if (osRecolhimento)
                return osRecolhimento;
        }
        return null;
    });
}
function localizarOsAbertaCancelamentoPorTicket(ticketId) {
    return __awaiter(this, void 0, void 0, function* () {
        const osResp = yield makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_ticket',
            query: ticketId,
            oper: '=',
            rp: '20',
            sortname: 'su_oss_chamado.id',
            sortorder: 'desc'
        }).catch(() => ({ registros: [] }));
        const registros = Array.isArray(osResp === null || osResp === void 0 ? void 0 : osResp.registros) ? osResp.registros : [];
        return registros.find((os) => ['A', 'EN'].includes(String((os === null || os === void 0 ? void 0 : os.status) || '').toUpperCase())) || registros[0] || null;
    });
}
const getModeloPlano = (idPlano) => {
    const map = {
        '7878': '12',
        '7879': '4',
        '7881': '13',
        '7887': '12',
        '8001': '13',
        '8000': '19',
        '7999': '14'
    };
    return map[idPlano] || '1';
};
const getTipoContratoPorVencimento = (diaVencimento) => {
    const map = {
        '5': '5',
        '10': '10',
        '15': '15',
        '20': '20'
    };
    return map[diaVencimento] || '10';
};
function formatarCPF(cpf) {
    if (!cpf)
        return '';
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11)
        return cpf;
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
function formatarDataNasParaDMY(dataYMD) {
    if (!dataYMD || dataYMD.length !== 10)
        return dataYMD;
    try {
        const [year, month, day] = dataYMD.split('-');
        if (!year || !month || !day)
            return dataYMD;
        return `${day}-${month}-${year}`;
    }
    catch (e) {
        console.error("Erro ao formatar data_nascimento:", e);
        return dataYMD;
    }
}
function getFinancialStatus(clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        const financeiroPayload = {
            "qtype": "fn_areceber.id_cliente",
            "query": clientId,
            "oper": "=",
            "rp": "500",
            "sortname": "fn_areceber.data_vencimento",
            "sortorder": "asc",
            "grid_param": JSON.stringify([
                { "TB": "fn_areceber.liberado", "OP": "=", "P": "S" },
                { "TB": "fn_areceber.status", "OP": "!=", "P": "C" },
                { "TB": "fn_areceber.status", "OP": "!=", "P": "R" }
            ])
        };
        try {
            //console.log(`Verificando financeiro do ID: ${clientId}`);
            const financeiroResponse = yield makeIxcRequest('POST', '/fn_areceber', financeiroPayload);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            if (financeiroResponse && financeiroResponse.total > 0) {
                for (const titulo of financeiroResponse.registros) {
                    const vencimento = new Date(titulo.data_vencimento);
                    if (vencimento < hoje) {
                        //console.log(`Cliente ${clientId} POSSUI atraso.`);
                        return true;
                    }
                }
            }
        }
        catch (error) {
            console.error(`Erro ao verificar financeiro do cliente ${clientId}:`, error.message);
            return false;
        }
        //console.log(`Cliente ${clientId} NÂO possui atraso.`);
        return false;
    });
}
router.get('/vendedores', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const params = { qtype: 'vendedor.status', query: 'A', oper: '=', page: '1', rp: '1000', sortname: 'vendedor.nome', sortorder: 'asc' };
        const ixcResponse = yield makeIxcRequest('POST', '/vendedor', params);
        if (!ixcResponse || !ixcResponse.registros)
            throw new Error("Resposta inesperada da API IXC para vendedores.");
        const vendedores = ixcResponse.registros.map((v) => ({ id: v.id, nome: v.nome }));
        res.json(vendedores);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/planos-home', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const params = { qtype: 'vd_contratos.Ativo', query: 'S', oper: '=', page: '1', rp: '5000', sortname: 'vd_contratos.nome', sortorder: 'asc' };
        const ixcResponse = yield makeIxcRequest('POST', '/vd_contratos', params);
        if (!ixcResponse || !ixcResponse.registros)
            throw new Error("Resposta inesperada da API IXC para planos.");
        const planosHome = ixcResponse.registros
            .filter((plano) => plano.nome && plano.nome.toUpperCase().includes('HOME'))
            .map((plano) => ({ id: plano.id, nome: plano.nome }));
        res.json(planosHome);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/planos-ativos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const params = { qtype: 'vd_contratos.Ativo', query: 'S', oper: '=', page: '1', rp: '5000', sortname: 'vd_contratos.nome', sortorder: 'asc' };
        const ixcResponse = yield makeIxcRequest('POST', '/vd_contratos', params);
        if (!ixcResponse || !ixcResponse.registros)
            throw new Error("Resposta inesperada da API IXC para planos.");
        const todosPlanos = ixcResponse.registros.map((plano) => ({
            id: plano.id,
            nome: plano.nome,
            valor_contrato: parseFloat(plano.valor_contrato || 0)
        }));
        res.json(todosPlanos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
function cadastrarCliente(clientData, dataCadastro, filialId = '3') {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Iniciando Etapa 1: Cadastro do Cliente (Filial ${filialId})...`);
        const today = dataCadastro.split(' ')[0];
        const usaEnderecoCliente = clientData.cep_cliente && clientData.cep_cliente !== '';
        const celularParaEnviar = clientData.telefone_celular || clientData.whatsapp;
        const clientePayload = {
            'ativo': 'S', 'pais': 'Brasil',
            'nacionalidade': 'Brasileiro',
            'contribuinte_icms': 'N',
            'filial_id': clientData.id_filial,
            'filtra_filial': 'S', 'tipo_localidade': 'U',
            'acesso_automatico_central': 'P', 'alterar_senha_primeiro_acesso': 'P', 'senha_hotsite_md5': 'N',
            'hotsite_acesso': '0', 'crm': 'S', 'status_prospeccao': 'V', 'cadastrado_via_viabilidade': 'N',
            'participa_cobranca': 'S', 'participa_pre_cobranca': 'S', 'cob_envia_email': 'S',
            'cob_envia_sms': 'S', 'tipo_pessoa_titular_conta': 'F', 'orgao_publico': 'N',
            'iss_classificacao_padrao': '99', 'data_cadastro': today, 'ultima_atualizacao': dataCadastro,
            'tipo_pessoa': clientData.tipo_pessoa,
            'tipo_cliente_scm': clientData.tipo_cliente_scm,
            'id_tipo_cliente': clientData.id_tipo_cliente,
            'tipo_assinante': clientData.tipo_assinante,
            'razao': clientData.nome,
            'cnpj_cpf': formatarCPF(clientData.cnpj_cpf),
            'ie_identidade': clientData.ie_identidade, 'data_nascimento': formatarDataNasParaDMY(clientData.data_nascimento),
            'fone': celularParaEnviar,
            'telefone_celular': celularParaEnviar,
            'whatsapp': clientData.whatsapp, 'email': clientData.email,
            // Endereço de cliente (Matriz)
            'cep': usaEnderecoCliente ? clientData.cep_cliente : clientData.cep,
            'endereco': usaEnderecoCliente ? clientData.endereco_cliente : clientData.endereco,
            'numero': usaEnderecoCliente ? clientData.numero_cliente : clientData.numero,
            'complemento': usaEnderecoCliente ? clientData.complemento_cliente : clientData.complemento,
            'bairro': usaEnderecoCliente ? clientData.bairro_cliente : clientData.bairro,
            'cidade': usaEnderecoCliente ? clientData.cidade_cliente : clientData.cidade,
            'uf': usaEnderecoCliente ? clientData.uf_cliente : clientData.uf,
            // Campos de instalação
            'bloco': usaEnderecoCliente ? '' : clientData.bloco,
            'apartamento': usaEnderecoCliente ? '' : clientData.apartamento,
            'referencia': usaEnderecoCliente ? '' : clientData.referencia,
            'id_condominio': clientData.id_condominio,
            'id_vendedor': clientData.id_vendedor, 'obs': clientData.obs,
            'hotsite_email': clientData.cnpj_cpf.replace(/\D/g, ''),
            'senha': clientData.cnpj_cpf.replace(/\D/g, '')
        };
        //console.log("Cliente Payload (Etapa 1):", JSON.stringify(clientePayload, null, 2));
        const clienteResponse = yield makeIxcRequest('POST', '/cliente', clientePayload);
        //console.log("Resposta da API IXC (Etapa 1):", clienteResponse);
        if (!clienteResponse || !clienteResponse.id) {
            const errorMessage = clienteResponse.message || clienteResponse.mensagem || clienteResponse.msg || 'Resposta inválida do IXC.';
            throw new Error(`Falha ao cadastrar cliente: ${errorMessage}`);
        }
        //console.log(`Etapa 1 OK: Cliente ID ${clienteResponse.id} criado.`);
        return clienteResponse.id;
    });
}
function criarContrato(novoClienteId, clientData, dataCadastro, nomePlano, options = { id_filial: '3', id_carteira_cobranca: '11', bloqueio_automatico: 'S' }, contextoCredito) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log("Iniciando Etapa 2: Criação do Contrato...");
        const today = dataCadastro.split(' ')[0];
        const idTipoContrato = getTipoContratoPorVencimento(clientData.data_vencimento);
        const idModelo = getModeloPlano(clientData.id_plano_ixc);
        const contratoPayloadBase = {
            'id_cliente': novoClienteId,
            'id_vd_contrato': clientData.id_plano_ixc,
            'id_vendedor': clientData.id_vendedor,
            'id_vendedor_ativ': clientData.id_vendedor,
            'dia_fixo_vencimento': clientData.data_vencimento,
            'obs': clientData.obs,
            'endereco_padrao_cliente': 'N',
            'cep': clientData.cep,
            'endereco': clientData.endereco,
            'numero': clientData.numero,
            'bairro': clientData.bairro,
            'cidade': clientData.cidade,
            'complemento': clientData.complemento,
            'bloco': clientData.bloco,
            'apartamento': clientData.apartamento,
            'referencia': clientData.referencia,
            'id_condominio': clientData.id_condominio,
            'tipo': 'I',
            'id_filial': options.id_filial,
            'id_carteira_cobranca': options.id_carteira_cobranca,
            'bloqueio_automatico': options.bloqueio_automatico,
            'base_geracao_tipo_doc': options.base_geracao_tipo_doc || 'P',
            'tipo_doc_opc': options.tipo_doc_opc || '',
            'tipo_doc_opc2': options.tipo_doc_opc2 || '',
            'data_assinatura': today,
            'data': getIxcDateDMY(),
            'status': 'P',
            'status_internet': 'AA',
            'status_velocidade': 'N',
            'motivo_inclusao': 'I',
            'contrato': nomePlano,
            'id_tipo_contrato': idTipoContrato,
            'id_modelo': idModelo,
            'id_tipo_documento': '501',
            'cc_previsao': 'P',
            'tipo_cobranca': 'P',
            'renovacao_automatica': 'S',
            'aviso_atraso': 'S',
            'fidelidade': '12',
            'ultima_atualizacao': dataCadastro,
            'liberacao_bloqueio_manual': 'P',
            'assinatura_digital': 'P',
            'integracao_assinatura_digital': 'P',
            'tipo_produtos_plano': 'P',
            'gerar_finan_assin_digital_contrato': 'P',
            'agrupar_financeiro_contrato': 'P',
            'aplicar_desconto_tempo_bloqueio': 'P',
            'desbloqueio_confianca': 'P',
            'liberacao_suspensao_parcial': 'P',
            'document_photo': 'P',
            'selfie_photo': 'P'
        };
        const contratoPayload = contextoCredito
            ? (0, ixcCreditContractService_1.applyCreditDecisionToIxcContractPayload)(contratoPayloadBase, contextoCredito.analise.decision, (0, ixcCreditContractService_1.getIxcCreditContractConfig)(), clientData.data_vencimento)
            : contratoPayloadBase;
        if (contextoCredito) {
            (0, logger_1.logInfo)('IXC.Credito.PayloadContrato', 'Condicao de credito aplicada ao payload do contrato.', {
                requestId: contextoCredito.requestId,
                usuario: contextoCredito.usuario,
                analiseCreditoId: contextoCredito.analise.id,
                modalidade: contextoCredito.analise.decision.perfil === 'SEM_RESTRICAO' ? 'POS_PAGO' : 'PRE_PAGO',
                dia_vencimento: clientData.data_vencimento,
                taxa_instalacao: contratoPayload.taxa_instalacao,
                ativacao_numero_parcelas: contratoPayload.ativacao_numero_parcelas || '0',
                ativacao_valor_parcela: contratoPayload.ativacao_valor_parcela || '0.00',
                id_tipo_contrato: contratoPayload.id_tipo_contrato,
                id_cond_pag_ativ: contratoPayload.id_cond_pag_ativ || null,
                id_produto_ativ: contratoPayload.id_produto_ativ || null,
                id_tipo_doc_ativ: contratoPayload.id_tipo_doc_ativ || null,
                status_faturamento_ativacao: (0, ixcCreditContractService_1.getActivationBillingResult)(contratoPayload.taxa_instalacao).status
            });
        }
        //console.log("Contrato Payload (Etapa 2):", JSON.stringify(contratoPayload, null, 2));
        const contratoResponse = yield makeIxcRequest('POST', '/cliente_contrato', contratoPayload);
        //console.log("Resposta da API IXC (Etapa 2):", contratoResponse);
        if (!contratoResponse || !contratoResponse.id) {
            const errorMessage = contratoResponse.message || contratoResponse.msg || 'Resposta inválida do IXC.';
            throw new Error(`Falha ao criar contrato: ${errorMessage}`);
        }
        if (contextoCredito) {
            const faturamentoAtivacao = (0, ixcCreditContractService_1.getActivationBillingResult)(contratoPayload.taxa_instalacao);
            try {
                yield (0, ixcCreditContractService_1.finishCreditContractAudit)(contextoCredito.auditoriaId, String(contratoResponse.id), faturamentoAtivacao);
            }
            catch (auditError) {
                // O contrato ja existe no IXC. Mantemos a reserva PROCESSANDO para
                // impedir repeticao e registramos a falha para conciliacao manual.
                (0, logger_1.logError)('IXC.Credito.AuditoriaContratoCriado', auditError, {
                    requestId: contextoCredito.requestId,
                    analiseCreditoId: contextoCredito.analise.id,
                    contratoId: contratoResponse.id,
                    auditoriaId: contextoCredito.auditoriaId
                });
            }
        }
        //console.log(`Etapa 2 OK: Contrato ID ${contratoResponse.id} criado.`);
        return contratoResponse.id;
    });
}
function processarFaturamentoAtivacaoContrato(contratoId, clienteId, clientData, options, contextoCredito) {
    return __awaiter(this, void 0, void 0, function* () {
        const taxaAtivacao = Number(contextoCredito.analise.decision.taxaHabilitacao || 0);
        if (taxaAtivacao <= 0)
            return (0, ixcCreditContractService_1.getActivationBillingResult)(0);
        if (!(0, ixcActivationBillingService_1.isAutomaticActivationBillingEnabled)())
            return (0, ixcCreditContractService_1.getActivationBillingResult)(taxaAtivacao);
        const config = (0, ixcCreditContractService_1.getIxcCreditContractConfig)();
        return (0, ixcActivationBillingService_1.faturarAtivacaoContrato)({
            auditoriaId: contextoCredito.auditoriaId,
            idContrato: String(contratoId),
            idCliente: String(clienteId),
            taxaAtivacao,
            idProdutoAtivacao: config.produtoTaxaAtivacaoId,
            idTipoDocumentoAtivacao: config.tipoDocAtivacaoId,
            idCondicaoPagamento: config.condPagAtivacaoUnicaId,
            idFilial: String(options.id_filial || clientData.id_filial || ''),
            idVendedor: String(clientData.id_vendedor_ativ || clientData.id_vendedor || ''),
            idResponsavel: String(clientData.id_responsavel || clientData.id_responsavel_ativ || ''),
            vencimento: (0, ixcCreditContractService_1.calculateIxcActivationDueDate)(config.ativacaoVencimentoDias),
            requestId: contextoCredito.requestId,
            analiseCreditoId: contextoCredito.analise.id,
            usuario: contextoCredito.usuario
        });
    });
}
//plano de venda -> ID plano
const getGrupoRadiusPorPlano = (idPlano) => {
    const map = {
        '7878': '3336',
        '7879': '3337',
        '7881': '3339',
        '7887': '3346',
        '8001': '6381',
        '8000': '6426',
        '7999': '6561',
        '7986': '6562',
        '7988': '6557',
        '7989': '6557',
        '7813': '3270',
        '7891': '6350',
        '7803': '3260',
        '6597': '2050',
        '51': '2034',
        '6598': '2051',
        '6599': '2052',
        '7951': '6507',
        '7821': '3278',
        '7948': '6484',
        '6': '2006',
        '6601': '2054',
        '7992': '6560',
        '7945': '6476',
        '7949': '6487',
        '7929': '6435',
        '6446': '6446',
        '7793': '3249',
        '7894': '3659',
        '7873': '3330',
        '7934': '6453',
        '7944': '6474',
        '7870': '3327',
        '7942': '6470',
        '7895': '6361',
        '7933': '6451',
        '7809': '3266',
        '7892': '6354',
        '7930': '6437',
        '7806': '3263',
        '7919': '6413',
        '7922': '6420',
        '7931': '6448',
        '7815': '3272',
        '7937': '6460',
        '7946': '6478',
        '7938': '6462',
        '7939': '6464',
        '7940': '6466',
        '7941': '6468',
        '7920': '6415',
        '7796': '3253',
        '7804': '3261',
        '7910': '6390',
        '7904': '6377',
        '7883': '3342',
        '7911': '6392',
        '7893': '6356',
        '7912': '6394',
        '7928': '6433',
        '7927': '6431',
        '7913': '6396',
        '7985': '6454'
    };
    return map[idPlano];
};
function criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro) {
    return __awaiter(this, void 0, void 0, function* () {
        const idGrupoRadius = getGrupoRadiusPorPlano(clientData.id_plano_ixc);
        for (let tentativa = 1; tentativa <= 50; tentativa++) {
            const loginSufixo = (tentativa === 1) ? '' : `_${tentativa}`;
            const login = `${novoClienteId}${loginSufixo}`;
            const senha = `ivp@${novoClienteId}`;
            //console.log(`Iniciando Etapa 3 (Tentativa ${tentativa}): Criação do Login PPPoE '${login}'...`);
            const loginPayload = {
                'id_cliente': novoClienteId,
                'id_contrato': novoContratoId,
                'login': login,
                'senha': senha,
                'endereco_padrao_cliente': 'S',
                'cep': clientData.cep, 'endereco': clientData.endereco, 'numero': clientData.numero,
                'bairro': clientData.bairro, 'cidade': clientData.cidade, 'complemento': clientData.complemento,
                'bloco': clientData.bloco, 'apartamento': clientData.apartamento,
                'referencia': clientData.referencia, 'id_condominio': clientData.id_condominio,
                'id_filial': clientData.id_filial,
                'ativo': 'S',
                'autenticacao': 'L',
                'login_simultaneo': '1',
                'auto_preencher_ip': 'H',
                'fixar_ip': 'H',
                'relacionar_ip_ao_login': 'H',
                'tipo_vinculo_plano': 'D',
                'ultima_atualizacao': dataCadastro,
                'id_grupo': idGrupoRadius,
                'tipo_conexao_mapa': '58',
                'autenticacao_por_mac': 'P',
                'auto_preencher_mac': 'H',
                'relacionar_mac_ao_login': 'H',
                'senha_md5': 'N',
                "online": "SS",
            };
            //console.log(`Login Payload (Etapa 3, Tentativa ${tentativa}):`, JSON.stringify(loginPayload, null, 2));
            try {
                const loginResponse = yield makeIxcRequest('POST', '/radusuarios', loginPayload);
                //console.log("Resposta da API IXC (Etapa 3):", loginResponse);
                if (loginResponse && loginResponse.id) {
                    //console.log(`Etapa 3 OK: Login PPPoE ID ${loginResponse.id} criado com o login '${login}'.`);
                    return loginResponse.id;
                }
                const errorMessage = (loginResponse.message || loginResponse.msg || 'Resposta inválida do IXC.').replace(/<br \/>/g, ' ');
                if (errorMessage.includes("Login já existe!")) {
                    //console.log(`Login '${login}' já existe. Tentando próximo...`);
                }
                else {
                    throw new Error(`Falha ao criar login PPPoE: ${errorMessage}`);
                }
            }
            catch (error) {
                if (error.message && error.message.includes("Login já existe!")) {
                    console.log(`Login '${login}' já existe (erro capturado). Tentando próximo...`);
                }
                else {
                    throw error;
                }
            }
        }
        throw new Error("Falha ao criar login PPPoE: Login já existe e 10 tentativas falharam.");
    });
}
const buildMensagemAtendimento = (data, planoNome) => {
    const telefones = (data.whatsapp && data.whatsapp !== data.telefone_celular)
        ? `${data.telefone_celular} / ${data.whatsapp}`
        : data.telefone_celular;
    const endereco = [
        data.endereco,
        data.numero,
        data.bairro
    ].filter(Boolean).join(', ');
    const enderecoCompleto = [
        endereco,
        data.complemento,
        data.referencia ? `(Ref: ${data.referencia})` : ''
    ].filter(Boolean).join(' - ');
    const cpfLimpo = data.cnpj_cpf ? data.cnpj_cpf.replace(/\D/g, '') : '';
    const planoNomeFormatado = formatarNomePlano(data.nome_plano || data.plano || planoNome || `Plano ID ${data.id_plano_ixc}`);
    return `
OBS: ${data.obs || 'Não informado'}

TELEFONES: ${telefones || 'Não informado'}
PLANO: ${planoNomeFormatado}
ENDEREÇO: ${enderecoCompleto}
    `.trim().replace(/\n/g, '\r\n');
};
function abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log("Iniciando Etapa 4: Abertura de Atendimento/OS Unificado...");
        const mensagem_padrao = buildMensagemAtendimento(clientData, nomePlano);
        const protocolo = yield (0, ixcAttendanceProtocolService_1.gerarProtocoloAtendimentoIxc)(makeIxcRequest, {
            usuario: clientData.usuario_intranet || 'cadastro'
        });
        const atendimentoPayload = {
            "id_cliente": novoClienteId,
            "assunto_ticket": clientData.assunto_ticket,
            "id_assunto": clientData.id_assunto,
            "id_wfl_processo": clientData.id_wfl_processo,
            "titulo": clientData.titulo_atendimento,
            "origem_endereco": "CC",
            "status": "OSAB",
            "su_status": "EP",
            "id_ticket_setor": "4",
            "prioridade": "M",
            "id_responsavel_tecnico": "138",
            "id_filial": clientData.id_filial,
            "id_usuarios": "61",
            "tipo": "C",
            "menssagem": mensagem_padrao,
            "id_login": novoLoginId,
            "id_contrato": novoContratoId,
            "protocolo": protocolo
        };
        //console.log("Atendimento/OS Payload (Etapa 4):", JSON.stringify(atendimentoPayload, null, 2));
        const atendimentoResponse = yield makeIxcRequest('POST', '/su_ticket', atendimentoPayload, 'incluir');
        //console.log("Resposta da API IXC (Etapa 4):", atendimentoResponse);
        const ticketId = atendimentoResponse.id || atendimentoResponse.id_su_ticket;
        if (!atendimentoResponse || !ticketId) {
            const errorMessage = (atendimentoResponse.message || atendimentoResponse.msg || 'Resposta inválida do IXC.').replace(/<br \/>/g, ' ');
            throw new Error(`Falha ao abrir atendimento/OS unificado: ${errorMessage}`);
        }
        //console.log(`Etapa 4 OK: Atendimento/OS ID ${ticketId} criado.`);
        return ticketId.toString();
    });
}
function buscarOsInstalacaoPorTicket(ticketId) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let tentativa = 0; tentativa < 4; tentativa++) {
            if (tentativa > 0) {
                yield new Promise(resolve => setTimeout(resolve, 1500));
            }
            const osResponse = yield makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id_ticket',
                query: String(ticketId),
                oper: '=',
                rp: '20',
                sortname: 'su_oss_chamado.id',
                sortorder: 'desc'
            }).catch(() => ({ registros: [] }));
            const registros = (osResponse === null || osResponse === void 0 ? void 0 : osResponse.registros) || [];
            const osAberta = registros.find((os) => !['F', 'C'].includes(String(os.status || '').toUpperCase()));
            if (osAberta)
                return osAberta;
        }
        return null;
    });
}
function obterIdFuncionarioIxc(usuario_intranet) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!usuario_intranet)
            return "138";
        try {
            return yield new Promise((resolve, reject) => {
                database_1.LOCALHOST.query('SELECT id_funcionario_ixc FROM usuarios_intranet WHERE usuario = ? AND ativo = 1', [usuario_intranet], (err, results) => {
                    if (err) {
                        //console.error("Erro ao executar query de id_funcionario_ixc:", err);
                        return resolve("138");
                    }
                    if (results && results.length > 0 && results[0].id_funcionario_ixc) {
                        resolve(results[0].id_funcionario_ixc.toString());
                    }
                    else {
                        //console.warn(`Usuário '${usuario_intranet}' não encontrado ou inativo no banco local. Usando ID padrão.`);
                        resolve("138");
                    }
                });
            });
        }
        catch (error) {
            console.error("Erro geral ao consultar id_funcionario_ixc no banco local:", error);
        }
        return "138"; // Fallback final
    });
}
function fecharTarefaOS(ticketId, idWflTarefaProxima, mensagem, idTecnico) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Buscando OS aberta no ticket ${ticketId}...`);
        const osResponse = yield makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_ticket', query: ticketId, oper: '=', rp: '20', sortname: 'su_oss_chamado.id', sortorder: 'desc'
        });
        if (!osResponse || !osResponse.registros || osResponse.registros.length === 0) {
            throw new Error(`Nenhuma OS encontrada para o ticket ${ticketId}`);
        }
        const osAberta = osResponse.registros.find((os) => os.status === 'A' || os.status === 'EN');
        if (!osAberta) {
            //console.log(`Aviso: Nenhuma OS aberta encontrada no ticket ${ticketId}. O fluxo já pode ter avançado.`);
            return;
        }
        //console.log(`Finalizando OS ${osAberta.id} via su_oss_chamado_fechar e engatilhando próxima tarefa ID ${idWflTarefaProxima}...`);
        const payloadFechamento = {
            "id_chamado": osAberta.id,
            "gera_comissao_aux": "N",
            "data_inicio": getIxcDate(),
            "data_final": getIxcDate(),
            "id_resposta": "",
            "mensagem": mensagem,
            "id_tecnico": idTecnico || osAberta.id_tecnico || "138",
            "id_equipe": "",
            "gera_comissao": "N",
            "status": "F",
            "data": getIxcDate().split(' ')[0],
            "id_evento": "",
            "id_su_diagnostico": "",
            "justificativa_sla_atrasado": "",
            "latitude": "",
            "longitude": "",
            "gps_time": "",
            "id_processo": osAberta.id_wfl_param_os || osAberta.id_wfl_processo || osAberta.id_processo || "46",
            "id_tarefa_atual": osAberta.id_wfl_tarefa || osAberta.id_tarefa_atual || osAberta.id_tarefa || "",
            "eh_tarefa_decisao": "N",
            "sequencia_atual": "",
            "proxima_sequencia_forcada": "",
            "finaliza_processo_aux": "N",
            "id_evento_status": "",
            "id_proxima_tarefa": idWflTarefaProxima,
            "id_proxima_tarefa_aux": ""
        };
        const resp = yield makeIxcRequest('POST', '/su_oss_chamado_fechar', payloadFechamento);
        if (resp && resp.type === 'error') {
            throw new Error(`Erro no motor WFL ao avançar OS ${osAberta.id}: ${resp.message.replace(/<br \/>/g, ' - ')}`);
        }
        //console.log(`Motor WFL disparado! OS ${osAberta.id} finalizada e próxima tarefa gerada com sucesso!`);
        yield new Promise(resolve => setTimeout(resolve, 3000));
    });
}
function abrirTicketProcesso46(clienteId, contratoId, loginId, isNovoCliente, nomePlano, clientData, dadosTransferencia, idFuncionarioIxc, isTransferenciaParcial = false) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Abrindo ticket Proc 46 para o cliente ${clienteId} (${isNovoCliente ? 'NOVO' : 'ANTIGO'})...`);
        let mensagem_padrao = '';
        if (isNovoCliente) {
            // Cliente novo
            mensagem_padrao = `MUDANÇA DE TITULARIDADE VIA INTRANET\n\nCliente antigo:\n- Nome: ${dadosTransferencia.oldClienteNome}\n- Código: ${dadosTransferencia.oldClienteId}\n- Plano escolhido: ${nomePlano}`;
        }
        else {
            // Cliente antigo
            mensagem_padrao = `MUDANÇA DE TITULARIDADE VIA INTRANET\n\nCliente novo:\n- Nome: ${dadosTransferencia.newClienteNome}\n- Código: ${dadosTransferencia.newClienteId}\n- Contatos: ${dadosTransferencia.newTelefones}\n -Plano escolhido: ${nomePlano}`;
        }
        const atendimentoPayload = {
            "id_cliente": clienteId,
            "id_assunto": ID_ASSUNTO_MUDANCA_TITULARIDADE,
            "titulo": "ALTERAÇÃO DE TITULARIDADE / RAZÃO SOCIAL",
            "id_wfl_processo": "46",
            "id_ticket_setor": "4",
            "prioridade": "M",
            "id_responsavel_tecnico": idFuncionarioIxc,
            "id_filial": clientData.id_filial || "3",
            "tipo": "C",
            "menssagem": mensagem_padrao,
            "status": "OSAB",
            "su_status": "EP",
            "id_login": loginId || '',
            "id_contrato": contratoId || ''
        };
        if (!atendimentoPayload.id_assunto) {
            throw new Error('Assunto obrigatório não definido para mudança de titularidade.');
        }
        const payloadLog = {
            id_cliente: atendimentoPayload.id_cliente,
            id_contrato: atendimentoPayload.id_contrato,
            id_login: atendimentoPayload.id_login,
            id_assunto: atendimentoPayload.id_assunto,
            id_wfl_processo: atendimentoPayload.id_wfl_processo,
            id_ticket_setor: atendimentoPayload.id_ticket_setor,
            id_responsavel_tecnico: atendimentoPayload.id_responsavel_tecnico,
            id_usuarios: atendimentoPayload.id_usuarios || null,
            origem_endereco: atendimentoPayload.origem_endereco || null,
            usuario: clientData.usuario_intranet || 'Não informado',
            cliente_novo: isNovoCliente
        };
        (0, logger_1.logInfo)('Cadastro Banda Larga.Mudanca Titularidade', '[Cadastro Banda Larga][Mudanca Titularidade] abrindo atendimento', payloadLog);
        (0, logger_1.logInfo)('Cadastro Banda Larga.Mudanca Titularidade', '[Cadastro Banda Larga][Mudanca Titularidade] Payload atendimento', payloadLog);
        const response = yield makeIxcRequest('POST', '/su_ticket', atendimentoPayload, 'incluir').catch((error) => {
            (0, logger_1.logError)('[Cadastro Banda Larga][Mudanca Titularidade] falha ao abrir atendimento', error, Object.assign({ etapa: 'abrir_atendimento' }, payloadLog));
            if (String((error === null || error === void 0 ? void 0 : error.message) || '').toLowerCase().includes('assunto')) {
                throw new Error('Não foi possível abrir o atendimento de mudança de titularidade porque o IXC recusou o assunto informado. Verifique a configuração do assunto 218 no IXC.');
            }
            throw error;
        });
        const ticketId = response.id || response.id_su_ticket;
        if (!ticketId || response.type === 'error') {
            const erroResposta = new Error(`Falha ao abrir ticket: ${response.message || 'ID não retornado.'}`);
            (0, logger_1.logError)('[Cadastro Banda Larga][Mudanca Titularidade] falha ao abrir atendimento', erroResposta, Object.assign({ etapa: 'validar_resposta_atendimento' }, payloadLog));
            if (String(response.message || '').toLowerCase().includes('assunto')) {
                throw new Error('Não foi possível abrir o atendimento de mudança de titularidade porque o IXC recusou o assunto informado. Verifique a configuração do assunto 218 no IXC.');
            }
            throw new Error(`Falha ao abrir ticket: ${response.message || 'ID não retornado.'}`);
        }
        //console.log(`Ticket Processo 46 criado: ${ticketId}. Aguardando OS inicial nascer...`);
        yield new Promise(resolve => setTimeout(resolve, 3000));
        if (!isNovoCliente) {
            //console.log(`Avançando OSs do Cliente ANTIGO (Ticket ${ticketId})...`);
            yield fecharTarefaOS(ticketId, '398', 'Processo iniciado pela Intranet.', idFuncionarioIxc);
            yield fecharTarefaOS(ticketId, '399', 'Alteração efetuada com sucesso.', idFuncionarioIxc);
            if (isTransferenciaParcial) {
                yield fecharTarefaOS(ticketId, '403', 'Transferência PARCIAL de login efetuada. Contrato mantido ativo. Aguardando Retorno CRI.', idFuncionarioIxc);
                //console.log(`>>> Fluxo Cliente Antigo (Parcial) posicionado com sucesso no CRI (Tarefa 403) <<<`);
            }
            else {
                yield fecharTarefaOS(ticketId, '402', 'Login transferido para a nova titularidade. Aguardando conferência de cancelamento pelo Financeiro.', idFuncionarioIxc);
                //console.log(`>>> Fluxo Cliente Antigo posicionado com sucesso no Financeiro (Tarefa 402) <<<`);
            }
        }
        else {
            //console.log(`Avançando OSs do Cliente NOVO (Ticket ${ticketId})...`);
            yield fecharTarefaOS(ticketId, '460', 'Processo iniciado pela Intranet.', idFuncionarioIxc);
            //await fecharTarefaOS(ticketId, '403', 'Contrato e Login gerados automaticamente. Aguardando Retorno CRI.', idFuncionarioIxc);
            //console.log(`>>> Fluxo Cliente Novo posicionado com sucesso no CRI (Tarefa 403) <<<`);
        }
        return ticketId;
    });
}
function abrirChamadoSuporteInterno(mensagemErro) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log("Tentando abrir chamado de suporte automático/manual...");
        const suportePayload = {
            "tipo": "E",
            "id_estrutura": "3",
            "id_cliente": "1",
            "id_filial": "3",
            "id_assunto": "175",
            "titulo": "SUPORTE TECNICO - ERRO SISTEMA",
            "id_wfl_processo": "50",
            "id_ticket_setor": "2",
            "id_responsavel_tecnico": "138",
            "prioridade": "M",
            "id_ticket_origem": "I",
            "id_usuarios": "61",
            "id_resposta": "0",
            "menssagem": mensagemErro,
            "interacao_pendente": "I",
            "su_status": "EP",
            "id_evento_status_processo": "0",
            "id_canal_atendimento": "0",
            "status": "OSAB",
            "id_su_diagnostico": "0"
        };
        try {
            const response = yield makeIxcRequest('POST', '/su_ticket', suportePayload, 'incluir');
            const ticketId = response.id || response.id_su_ticket;
            if (!ticketId)
                throw new Error("ID do ticket não retornado.");
            //console.log(`Chamado de suporte aberto com sucesso. ID: ${ticketId}`);
            return ticketId;
        }
        catch (error) {
            console.error("ALERTA CRÍTICO: Falha ao abrir chamado de suporte automático:", error.message);
            return null;
        }
    });
}
function abrirChamadoNocCadastro(nomeNovoCondominio, clientData, clienteId) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log("Abrindo chamado para o NOC - Cadastro de Condomínio...");
        const mensagem = `
SOLICITAÇÃO DE CADASTRO DE NOVO CONDOMÍNIO/LOCALIDADE
-----------------------------------------------------
O vendedor informou um local não cadastrado no sistema.
VENDEDOR: ${clientData.nome_vendedor || clientData.id_vendedor || 'N/A'}

NOME DO CONDOMÍNIO/BAIRRO INFORMADO:
>> ${nomeNovoCondominio.toUpperCase()} <<

CLIENTE VINCULADO À INSTALAÇÃO:
ID Cliente: ${clienteId}
Nome: ${clientData.nome}
CPF/CNPJ: ${clientData.cnpj_cpf}
Endereço: ${clientData.endereco}, ${clientData.numero}
Bairro: ${clientData.bairro}
Cidade: ${clientData.cidade}
Complemento: ${clientData.complemento}

    `.trim();
        const suportePayload = {
            "tipo": "E",
            "id_estrutura": "3",
            "id_cliente": clienteId,
            "id_filial": "3",
            "id_assunto": "175",
            "titulo": "CADASTRO DE NOVO CONDOMINIO - VENDAS",
            "id_wfl_processo": "50",
            "id_ticket_setor": "2",
            "id_responsavel_tecnico": "138",
            "prioridade": "A",
            "id_ticket_origem": "I",
            "id_usuarios": "61",
            "id_resposta": "0",
            "menssagem": mensagem,
            "interacao_pendente": "I",
            "su_status": "EP",
            "id_evento_status_processo": "0",
            "id_canal_atendimento": "0",
            "status": "OSAB",
            "id_su_diagnostico": "0"
        };
        try {
            yield makeIxcRequest('POST', '/su_ticket', suportePayload, 'incluir');
            console.log("Chamado NOC criado com sucesso.");
        }
        catch (error) {
            console.error("Erro ao criar chamado NOC:", error.message);
        }
    });
}
function atualizarCliente(clientId, clientData, dataCadastro) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Iniciando Etapa 1.5: Atualização (PUT) do Cliente ID ${clientId}...`);
        const today = dataCadastro.split(' ')[0];
        const usaEnderecoCliente = clientData.cep_cliente && clientData.cep_cliente !== '';
        const updatePayload = {
            'ativo': 'S', 'tipo_pessoa': 'F', 'tipo_cliente_scm': clientData.tipo_cliente_scm, 'pais': 'Brasil',
            'nacionalidade': 'Brasileiro', 'tipo_assinante': clientData.tipo_assinante, 'id_tipo_cliente': clientData.id_tipo_cliente,
            'contribuinte_icms': 'N',
            'filial_id': clientData.id_filial,
            'filtra_filial': 'S', 'tipo_localidade': 'U',
            'acesso_automatico_central': 'P', 'alterar_senha_primeiro_acesso': 'P', 'senha_hotsite_md5': 'N',
            'hotsite_acesso': '0', 'crm': 'S', 'status_prospeccao': 'V', 'cadastrado_via_viabilidade': 'N',
            'participa_cobranca': 'S', 'participa_pre_cobranca': 'S', 'cob_envia_email': 'S',
            'cob_envia_sms': 'S', 'tipo_pessoa_titular_conta': 'F', 'orgao_publico': 'N',
            'iss_classificacao_padrao': '99', 'data_cadastro': today, 'ultima_atualizacao': dataCadastro,
            'hotsite_email': clientData.cnpj_cpf.replace(/\D/g, ''),
            'senha': clientData.cnpj_cpf.replace(/\D/g, ''),
            'razao': clientData.nome,
            'cnpj_cpf': formatarCPF(clientData.cnpj_cpf),
            'ie_identidade': clientData.ie_identidade,
            'data_nascimento': formatarDataNasParaDMY(clientData.data_nascimento),
            'fone': clientData.telefone_celular,
            'telefone_celular': clientData.telefone_celular,
            'whatsapp': clientData.whatsapp,
            'email': clientData.email,
            // Endereço Condicional (Matriz vs Instalação)
            'cep': usaEnderecoCliente ? clientData.cep_cliente : clientData.cep,
            'endereco': usaEnderecoCliente ? clientData.endereco_cliente : clientData.endereco,
            'numero': usaEnderecoCliente ? clientData.numero_cliente : clientData.numero,
            'complemento': usaEnderecoCliente ? clientData.complemento_cliente : clientData.complemento,
            'bairro': usaEnderecoCliente ? clientData.bairro_cliente : clientData.bairro,
            'cidade': usaEnderecoCliente ? clientData.cidade_cliente : clientData.cidade,
            'uf': usaEnderecoCliente ? clientData.uf_cliente : clientData.uf,
            // Dados de instalação
            'bloco': usaEnderecoCliente ? '' : clientData.bloco,
            'apartamento': usaEnderecoCliente ? '' : clientData.apartamento,
            'referencia': usaEnderecoCliente ? '' : clientData.referencia,
            'id_condominio': clientData.id_condominio
        };
        const updateResponse = yield makeIxcRequest('PUT', `/cliente/${clientId}`, updatePayload, 'alterar');
        console.log("Resposta da API IXC (Etapa 1.5 - Update):", updateResponse);
        if (!updateResponse || (updateResponse.message && !updateResponse.message.includes('sucesso'))) {
            //console.warn(`Aviso na Etapa 1.5: ${updateResponse.message || 'Resposta inesperada.'}`);
        }
        console.log(`Etapa 1.5 OK: Cliente ID ${clientId} atualizado.`);
    });
}
function ajustarFinanceiroContrato(contratoId, valorAcordadoStr, idPlano) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Iniciando Etapa 5: Ajuste Financeiro no Contrato ${contratoId} (Plano Ref: ${idPlano})`);
        if (!valorAcordadoStr || valorAcordadoStr.trim() === '') {
            console.log("Nenhum valor acordado informado.");
            return;
        }
        const valorAcordado = parseFloat(valorAcordadoStr.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
        if (isNaN(valorAcordado) || valorAcordado <= 0) {
            console.log(`Valor acordado inválido: ${valorAcordadoStr}.`);
            return;
        }
        const targetSCM = valorAcordado * 0.20; // 20% para SCM (Internet)
        const targetSVA = valorAcordado * 0.80; // 80% para SVA (Serviços)
        const produtosPayload = {
            "qtype": "vd_contratos_produtos.id_vd_contrato",
            "query": idPlano,
            "oper": "=",
            "page": "1",
            "rp": "1000",
            "sortname": "vd_contratos_produtos.id",
            "sortorder": "desc"
        };
        try {
            const produtosResponse = yield makeIxcRequest('POST', '/vd_contratos_produtos', produtosPayload);
            if (!produtosResponse || !produtosResponse.registros || produtosResponse.registros.length === 0) {
                //console.warn(`Nenhum produto encontrado no modelo do plano ${idPlano}.`);
                return;
            }
            for (const produto of produtosResponse.registros) {
                const valorOriginal = parseFloat(produto.valor_unit);
                const descricaoProduto = produto.descricao ? produto.descricao.toUpperCase() : '';
                let diferenca = 0;
                let tipoServico = '';
                let targetValor = 0;
                if (descricaoProduto.includes('SCM')) {
                    tipoServico = 'SCM';
                    targetValor = targetSCM;
                }
                else if (descricaoProduto.includes('SVA')) {
                    tipoServico = 'SVA';
                    targetValor = targetSVA;
                }
                else {
                    continue;
                }
                diferenca = targetValor - valorOriginal;
                if (Math.abs(diferenca) < 0.01) {
                    console.log(`${tipoServico}: Valor original (${valorOriginal}) igual ao alvo. Sem ajustes.`);
                    continue;
                }
                const valorAbsoluto = Math.abs(diferenca);
                const percentual = (valorAbsoluto / valorOriginal) * 100;
                if (diferenca < 0) {
                    const descontoPayload = {
                        "id_contrato": contratoId,
                        "id_vd_contrato_produtos": produto.id,
                        "descricao": `Desconto Comercial ${tipoServico}`,
                        "valor": valorAbsoluto.toFixed(2),
                        "data_validade": "",
                        "percentual": percentual.toString()
                    };
                    console.log(`Aplicando DESCONTO em ${tipoServico}:`, descontoPayload);
                    yield makeIxcRequest('POST', '/cliente_contrato_descontos', descontoPayload);
                }
                else {
                    const acrescimoPayload = {
                        "id_contrato": contratoId,
                        "id_vd_contrato_produtos": produto.id,
                        "descricao": `Acréscimo Comercial ${tipoServico}`,
                        "valor": valorAbsoluto.toFixed(2),
                        "data_validade": "",
                        "percentual": percentual.toString()
                    };
                    console.log(`Aplicando ACRÉSCIMO em ${tipoServico}:`, acrescimoPayload);
                    yield makeIxcRequest('POST', '/cliente_contrato_acrescimos', acrescimoPayload);
                }
            }
        }
        catch (error) {
            console.error(`Erro ao ajustar financeiro: ${error.message}`);
        }
    });
}
router.post('/cliente', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e;
    const _f = req.body, { existingClientId, condominio_novo_nome } = _f, clientData = __rest(_f, ["existingClientId", "condominio_novo_nome"]);
    const dataCadastro = getIxcDate();
    let novoClienteId;
    let novoContratoId = null;
    let auditoriaCreditoId = null;
    try {
        const usuario = ((_d = req.user) === null || _d === void 0 ? void 0 : _d.username) || ((_e = req.session) === null || _e === void 0 ? void 0 : _e.username) || 'Visitante';
        const analiseCredito = yield (0, ixcCreditContractService_1.loadCreditAnalysisForIxcContract)({
            analiseCreditoId: clientData.analise_credito_id,
            documento: clientData.cnpj_cpf,
            tipoCadastro: 'BANDA_LARGA',
            clienteId: existingClientId,
            diaVencimento: clientData.data_vencimento
        });
        const modalidadeContrato = analiseCredito.decision.perfil === 'SEM_RESTRICAO' ? 'POS_PAGO' : 'PRE_PAGO';
        const diaVencimentoContrato = (0, ixcCreditContractService_1.resolveIxcContractDueDay)(modalidadeContrato, clientData.data_vencimento, (0, ixcCreditContractService_1.getIxcCreditContractConfig)());
        clientData.data_vencimento = String(diaVencimentoContrato);
        yield validateExistingIxcClientForCreditAnalysis(existingClientId, clientData.cnpj_cpf);
        auditoriaCreditoId = yield (0, ixcCreditContractService_1.startCreditContractAudit)({
            analiseCreditoId: analiseCredito.id,
            clienteId: analiseCredito.clienteId || existingClientId || null,
            tipoCadastro: 'BANDA_LARGA',
            decision: analiseCredito.decision,
            diaVencimento: clientData.data_vencimento,
            criadoPor: usuario,
            requestId: req.requestId
        });
        let nomePlano = `ID ${clientData.id_plano_ixc}`;
        try {
            const planoInfo = yield makeIxcRequest('POST', `/vd_contratos`, { qtype: 'vd_contratos.id', query: clientData.id_plano_ixc, oper: '=' });
            if (planoInfo && planoInfo.registros && planoInfo.registros.length > 0) {
                nomePlano = planoInfo.registros[0].nome;
            }
        }
        catch (e) {
            console.warn(`Aviso: Não foi possível buscar o nome do plano ${clientData.id_plano_ixc}. Usando ID.`);
        }
        if (existingClientId) {
            //console.log(`Cliente ID ${existingClientId} fornecido. Pulando Etapa 1.`);
            novoClienteId = existingClientId;
            yield atualizarCliente(novoClienteId, clientData, dataCadastro);
        }
        else {
            //console.log("Nenhum Cliente ID fornecido. Executando Etapa 1 (Cadastro de Cliente)...");
            novoClienteId = yield cadastrarCliente(clientData, dataCadastro);
        }
        yield (0, ixcCreditContractService_1.associateCreditAnalysisClient)(analiseCredito, novoClienteId, auditoriaCreditoId);
        const opcoesContratoBandaLarga = {
            id_filial: '3',
            id_carteira_cobranca: '11',
            bloqueio_automatico: 'S'
        };
        const contextoCredito = {
            analise: analiseCredito,
            auditoriaId: auditoriaCreditoId,
            requestId: req.requestId,
            usuario
        };
        novoContratoId = yield criarContrato(novoClienteId, clientData, dataCadastro, nomePlano, opcoesContratoBandaLarga, contextoCredito);
        const faturamentoAtivacao = yield processarFaturamentoAtivacaoContrato(novoContratoId, novoClienteId, clientData, opcoesContratoBandaLarga, contextoCredito);
        const novoLoginId = yield criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro);
        const novoTicketId = yield abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId);
        const osInstalacao = yield buscarOsInstalacaoPorTicket(novoTicketId);
        if (condominio_novo_nome && condominio_novo_nome.trim() !== '') {
            yield abrirChamadoNocCadastro(condominio_novo_nome, clientData, novoClienteId);
        }
        res.status(201).json({
            success: true,
            message: "Venda finalizada com sucesso! Cliente, Contrato, Login e Atendimento/OS criados.",
            clienteId: novoClienteId,
            contratoId: novoContratoId,
            loginId: novoLoginId,
            ticketId: novoTicketId,
            osId: (osInstalacao === null || osInstalacao === void 0 ? void 0 : osInstalacao.id) || null,
            modalidadeContrato,
            diaVencimentoContrato,
            statusFaturamentoAtivacao: faturamentoAtivacao.status,
            avisoFaturamentoAtivacao: faturamentoAtivacao.mensagem
        });
    }
    catch (error) {
        console.error('ERRO FATAL no cadastro BANDA LARGA:', error);
        if (!novoContratoId)
            yield (0, ixcCreditContractService_1.failCreditContractAudit)(auditoriaCreditoId, error);
        if (!(error === null || error === void 0 ? void 0 : error.isCreditRuleError))
            try {
                const mensagemErroAutomatico = `
ERRO AUTOMÁTICO - FALHA NO CADASTRO BANDA LARGA
-------------------------------------------------------
DATA/HORA: ${getIxcDate()}
CLIENTE TENTATIVA: ${clientData.nome || 'N/A'}
CPF/CNPJ: ${clientData.cnpj_cpf || 'N/A'}
VENDEDOR: ${clientData.nome_vendedor || clientData.id_vendedor || 'N/A'}

MENSAGEM DE ERRO DO SISTEMA:
${error.message || JSON.stringify(error)}

DADOS RECEBIDOS (RESUMO):
Plano: ${clientData.id_plano_ixc}
Endereço: ${clientData.endereco}, ${clientData.numero} - ${clientData.bairro}
Condomínio ID: ${clientData.id_condominio}
            `.trim();
                yield abrirChamadoSuporteInterno(mensagemErroAutomatico);
            }
            catch (supportError) {
                console.error("Não foi possível abrir o chamado de erro automático:", supportError);
            }
        res.status((error === null || error === void 0 ? void 0 : error.statusCode) || 500).json({
            success: false,
            error: error.message,
            code: (error === null || error === void 0 ? void 0 : error.code) || null
        });
    }
}));
router.post('/cliente-corporativo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h;
    const _j = req.body, { existingClientId } = _j, clientData = __rest(_j, ["existingClientId"]);
    const dataCadastro = getIxcDate();
    let novoClienteId;
    let novoContratoId = null;
    let auditoriaCreditoId = null;
    const FILIAL_CORPORATIVO = '1';
    const OPCOES_CONTRATO_CORP = {
        id_filial: '1',
        id_carteira_cobranca: '10',
        bloqueio_automatico: 'N',
        base_geracao_tipo_doc: 'OPC',
        tipo_doc_opc: '11',
        tipo_doc_opc2: '6'
    };
    try {
        const usuario = ((_g = req.user) === null || _g === void 0 ? void 0 : _g.username) || ((_h = req.session) === null || _h === void 0 ? void 0 : _h.username) || 'Visitante';
        const analiseCredito = yield (0, ixcCreditContractService_1.loadCreditAnalysisForIxcContract)({
            analiseCreditoId: clientData.analise_credito_id,
            documento: clientData.cnpj_cpf,
            tipoCadastro: 'CORPORATIVO',
            clienteId: existingClientId,
            diaVencimento: clientData.data_vencimento
        });
        const modalidadeContrato = analiseCredito.decision.perfil === 'SEM_RESTRICAO' ? 'POS_PAGO' : 'PRE_PAGO';
        const diaVencimentoContrato = (0, ixcCreditContractService_1.resolveIxcContractDueDay)(modalidadeContrato, clientData.data_vencimento, (0, ixcCreditContractService_1.getIxcCreditContractConfig)());
        clientData.data_vencimento = String(diaVencimentoContrato);
        yield validateExistingIxcClientForCreditAnalysis(existingClientId, clientData.cnpj_cpf);
        auditoriaCreditoId = yield (0, ixcCreditContractService_1.startCreditContractAudit)({
            analiseCreditoId: analiseCredito.id,
            clienteId: analiseCredito.clienteId || existingClientId || null,
            tipoCadastro: 'CORPORATIVO',
            decision: analiseCredito.decision,
            diaVencimento: clientData.data_vencimento,
            criadoPor: usuario,
            requestId: req.requestId
        });
        let nomePlano = `ID ${clientData.id_plano_ixc}`;
        try {
            const planoInfo = yield makeIxcRequest('POST', `/vd_contratos`, { qtype: 'vd_contratos.id', query: clientData.id_plano_ixc, oper: '=' });
            if (planoInfo && planoInfo.registros && planoInfo.registros.length > 0) {
                nomePlano = planoInfo.registros[0].nome;
            }
        }
        catch (e) {
            console.warn(`Aviso: erro ao buscar plano.`);
        }
        clientData.nome_plano = nomePlano;
        if (existingClientId) {
            novoClienteId = existingClientId;
            yield atualizarCliente(novoClienteId, clientData, dataCadastro);
        }
        else {
            try {
                novoClienteId = yield cadastrarCliente(clientData, dataCadastro, FILIAL_CORPORATIVO);
            }
            catch (error) {
                const errorMsg = error.message || '';
                if (errorMsg.includes('Este CNPJ/CPF já está Cadastrado') || errorMsg.includes('já está Cadastrado')) {
                    const match = errorMsg.match(/ID:\s*(\d+)/);
                    if (match && match[1]) {
                        novoClienteId = match[1];
                        console.log(`Cliente recuperado ID: ${novoClienteId}.`);
                        yield atualizarCliente(novoClienteId, clientData, dataCadastro);
                    }
                    else {
                        throw error;
                    }
                }
                else {
                    throw error;
                }
            }
        }
        yield (0, ixcCreditContractService_1.associateCreditAnalysisClient)(analiseCredito, novoClienteId, auditoriaCreditoId);
        const contextoCredito = {
            analise: analiseCredito,
            auditoriaId: auditoriaCreditoId,
            requestId: req.requestId,
            usuario
        };
        novoContratoId = yield criarContrato(novoClienteId, clientData, dataCadastro, nomePlano, OPCOES_CONTRATO_CORP, contextoCredito);
        const faturamentoAtivacao = yield processarFaturamentoAtivacaoContrato(novoContratoId, novoClienteId, clientData, OPCOES_CONTRATO_CORP, contextoCredito);
        const novoLoginId = yield criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro);
        const novoTicketId = yield abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId);
        yield ajustarFinanceiroContrato(novoContratoId, clientData.valor_acordado, clientData.id_plano_ixc);
        res.status(201).json({
            success: true,
            message: "Venda finalizada com sucesso!",
            clienteId: novoClienteId,
            contratoId: novoContratoId,
            loginId: novoLoginId,
            ticketId: novoTicketId,
            modalidadeContrato,
            diaVencimentoContrato,
            statusFaturamentoAtivacao: faturamentoAtivacao.status,
            avisoFaturamentoAtivacao: faturamentoAtivacao.mensagem
        });
    }
    catch (error) {
        console.error('ERRO FATAL no cadastro corporativo:', error);
        if (!novoContratoId)
            yield (0, ixcCreditContractService_1.failCreditContractAudit)(auditoriaCreditoId, error);
        if (!(error === null || error === void 0 ? void 0 : error.isCreditRuleError))
            try {
                const mensagemErroAutomatico = `
ERRO AUTOMÁTICO - FALHA NO CADASTRO CORPORATIVO
-------------------------------------------------------
DATA/HORA: ${getIxcDate()}
CLIENTE TENTATIVA: ${clientData.nome || 'N/A'}
CPF/CNPJ: ${clientData.cnpj_cpf || 'N/A'}
VENDEDOR: ${clientData.nome_vendedor || clientData.id_vendedor || 'N/A'}

MENSAGEM DE ERRO DO SISTEMA:
${error.message || JSON.stringify(error)}

DADOS RECEBIDOS (RESUMO):
Plano: ${clientData.id_plano_ixc}
Valor: ${clientData.valor_acordado}
Endereço Instalação: ${clientData.endereco}, ${clientData.numero} - ${clientData.bairro}
            `.trim();
                yield abrirChamadoSuporteInterno(mensagemErroAutomatico);
            }
            catch (supportError) {
                console.error("Não foi possível abrir o chamado de erro automático:", supportError);
            }
        res.status((error === null || error === void 0 ? void 0 : error.statusCode) || 500).json({ success: false, error: error.message, code: (error === null || error === void 0 ? void 0 : error.code) || null });
    }
}));
router.post('/consultar-cliente', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cnpj_cpf } = req.body;
    if (!cnpj_cpf) {
        return res.status(400).json({ error: 'CNPJ/CPF é obrigatório.' });
    }
    try {
        const clientePayload = {
            qtype: "cliente.cnpj_cpf",
            query: cnpj_cpf,
            oper: "=",
            page: "1",
            rp: "1",
            sortname: "cliente.id",
            sortorder: "asc"
        };
        //console.log("Consultando cliente:", clientePayload);
        const clienteResponse = yield makeIxcRequest('POST', '/cliente', clientePayload);
        if (!clienteResponse || clienteResponse.total === 0 || clienteResponse.total === "0") {
            //console.log("Cliente não encontrado.");
            return res.json({ cliente: null, contratos: [], contratosComAtraso: [] });
        }
        const cliente = clienteResponse.registros[0];
        //console.log(`Cliente encontrado: ID ${cliente.id}`);
        const contratoPayload = {
            qtype: "cliente_contrato.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "200",
            sortname: "cliente_contrato.id",
            sortorder: "desc"
        };
        //console.log("Consultando contratos:", contratoPayload);
        const contratoResponse = yield makeIxcRequest('POST', '/cliente_contrato', contratoPayload);
        const contratos = (contratoResponse && contratoResponse.registros) ? contratoResponse.registros : [];
        //console.log(`Encontrados ${contratos.length} contratos.`);
        const financeiroPayload = {
            "qtype": "fn_areceber.id_cliente",
            "query": cliente.id,
            "oper": "=",
            "rp": "2000",
            "sortname": "fn_areceber.data_vencimento",
            "sortorder": "asc",
            "grid_param": JSON.stringify([
                { "TB": "fn_areceber.liberado", "OP": "=", "P": "S" },
                { "TB": "fn_areceber.status", "OP": "!=", "P": "C" },
                { "TB": "fn_areceber.status", "OP": "!=", "P": "R" }
            ])
        };
        //console.log("Consultando financeiro:", financeiroPayload);
        const financeiroResponse = yield makeIxcRequest('POST', '/fn_areceber', financeiroPayload);
        const contratosComAtraso = new Set();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (financeiroResponse && financeiroResponse.total > 0) {
            financeiroResponse.registros.forEach((titulo) => {
                const vencimento = new Date(titulo.data_vencimento);
                if (titulo.id_contrato && vencimento < hoje) {
                    contratosComAtraso.add(titulo.id_contrato);
                }
            });
        }
        //console.log(`Contratos com atraso: ${Array.from(contratosComAtraso)}`);
        res.json({
            cliente,
            contratos,
            contratosComAtraso: Array.from(contratosComAtraso)
        });
    }
    catch (error) {
        console.error("Erro ao consultar cliente:", error.message);
        res.status(500).json({ error: `Erro ao consultar cliente: ${error.message}` });
    }
}));
router.post('/consultar-endereco', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cep, numero } = req.body;
    if (!cep) {
        return res.status(400).json({ error: 'O CEP é obrigatório.' });
    }
    try {
        const payload = {
            qtype: "cliente.cep",
            query: `${cep}`,
            oper: "=",
            page: "1",
            rp: "20",
            sortname: "cliente.id",
            sortorder: "asc"
        };
        if (numero && numero.trim() !== '') {
            payload.grid_param = JSON.stringify([
                { "TB": "cliente.numero", "OP": "=", "P": numero }
            ]);
        }
        console.log("Consultando por CEP + Número:", payload);
        const response = yield makeIxcRequest('POST', '/cliente', payload);
        if (response && response.registros && response.registros.length > 0) {
            //console.log(`Encontrados ${response.registros.length} clientes.`);
            const clientesComStatus = yield Promise.all(response.registros.map((cliente) => __awaiter(void 0, void 0, void 0, function* () {
                const temAtraso = yield getFinancialStatus(cliente.id);
                return Object.assign(Object.assign({}, cliente), { tem_atraso: temAtraso });
            })));
            res.json(clientesComStatus);
        }
        else {
            res.json(response.registros || []);
        }
    }
    catch (error) {
        console.error("Erro ao consultar por endereço:", error.message);
        res.status(500).json({ error: `Erro ao consultar endereço: ${error.message}` });
    }
}));
router.post('/abrir-chamado-suporte', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mensagem } = req.body;
    if (!mensagem)
        return res.status(400).json({ error: 'Mensagem obrigatória.' });
    const msgFinal = `[ABERTURA MANUAL]\n\n${mensagem}`;
    try {
        const ticketId = yield abrirChamadoSuporteInterno(msgFinal);
        if (ticketId) {
            res.json({ success: true, id_ticket: ticketId });
        }
        else {
            throw new Error("Falha ao criar ticket.");
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
let cidadesCache = [];
let ufsCache = [];
router.get('/cidades', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (cidadesCache.length > 0)
        return res.json(cidadesCache);
    try {
        const payload = {
            "qtype": "cidade.id", "query": "1", "oper": ">=", "page": "1", "rp": "6000", "sortname": "cidade.id", "sortorder": "desc"
        };
        const response = yield makeIxcRequest('POST', '/cidade', payload, 'listar');
        if (response && response.registros) {
            cidadesCache = response.registros.map((c) => ({
                id: c.id,
                nome: c.nome,
                uf: c.uf
            }));
            res.json(cidadesCache);
        }
        else {
            res.json([]);
        }
    }
    catch (error) {
        console.error("Erro ao buscar cidades:", error.message);
        res.status(500).json({ error: "Falha ao buscar cidades" });
    }
}));
router.get('/ufs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (ufsCache.length > 0)
        return res.json(ufsCache);
    try {
        const payload = {
            "qtype": "uf.id", "query": "1", "oper": ">=", "page": "1", "rp": "2000", "sortname": "uf.id", "sortorder": "desc"
        };
        const response = yield makeIxcRequest('POST', '/uf', payload, 'listar');
        if (response && response.registros) {
            ufsCache = response.registros.map((u) => ({
                id: u.id,
                sigla: u.sigla,
                nome: u.nome
            }));
            res.json(ufsCache);
        }
        else {
            res.json([]);
        }
    }
    catch (error) {
        console.error("Erro ao buscar UFs:", error.message);
        res.status(500).json({ error: "Falha ao buscar UFs" });
    }
}));
router.get('/logins-contrato/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield makeIxcRequest('POST', '/radusuarios', {
            qtype: 'radusuarios.id_contrato', query: req.params.id, oper: '=', rp: '100'
        });
        res.json(response.registros || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
function buscarDetalhesContratoELoginAntigo(contratoId, loginSelecionadoId) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Buscando detalhes do contrato antigo ID: ${contratoId}`);
        const contratoOldResponse = yield makeIxcRequest('POST', '/cliente_contrato', { qtype: 'cliente_contrato.id', query: contratoId, oper: '=' });
        if (!contratoOldResponse || !contratoOldResponse.registros || contratoOldResponse.registros.length === 0) {
            throw new Error("Contrato antigo não encontrado no IXC.");
        }
        const contratoAntigo = contratoOldResponse.registros[0];
        let queryLogin = { qtype: 'radusuarios.id_contrato', query: contratoId, oper: '=' };
        if (loginSelecionadoId) {
            queryLogin = { qtype: 'radusuarios.id', query: loginSelecionadoId, oper: '=' };
        }
        const loginOldResponse = yield makeIxcRequest('POST', '/radusuarios', queryLogin);
        if (!loginOldResponse || !loginOldResponse.registros || loginOldResponse.registros.length === 0) {
            throw new Error("Login PPPoE não encontrado.");
        }
        const loginAntigo = loginOldResponse.registros[0];
        return { contratoAntigo, loginAntigo };
    });
}
function valorTextoMudancaEndereco(valor) {
    return String(valor || '').trim();
}
function validarRespostaAlteracaoEnderecoIxc(response, mensagemPadrao) {
    if (response && response.type !== 'error' && response.success !== false)
        return;
    const erroResposta = new Error((response === null || response === void 0 ? void 0 : response.message) || (response === null || response === void 0 ? void 0 : response.mensagem) || (response === null || response === void 0 ? void 0 : response.msg) || mensagemPadrao);
    erroResposta.ixcResponse = response;
    throw erroResposta;
}
function normalizarDataContratoParaPut(campo, valor) {
    if (typeof valor !== 'string' || !campo.toLowerCase().startsWith('data'))
        return valor;
    const texto = valor.trim();
    if (!texto || texto.startsWith('0000-00-00'))
        return '';
    const dataYmd = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dataYmd)
        return valor;
    return `${dataYmd[3]}/${dataYmd[2]}/${dataYmd[1]}`;
}
function montarPayloadContratoMudancaEndereco(contratoAtual, enderecoNovo) {
    const payload = Object.fromEntries(Object.entries(contratoAtual || {}).map(([campo, valor]) => [
        campo,
        normalizarDataContratoParaPut(campo, valor)
    ]));
    delete payload.id;
    Object.keys(payload)
        .filter(campo => campo.toLowerCase().includes('cancel'))
        .forEach(campo => delete payload[campo]);
    const condominioNovo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.id_condominio);
    payload.id_condominio = condominioNovo || valorTextoMudancaEndereco(contratoAtual === null || contratoAtual === void 0 ? void 0 : contratoAtual.id_condominio);
    payload.condominio_novo = condominioNovo || valorTextoMudancaEndereco(contratoAtual === null || contratoAtual === void 0 ? void 0 : contratoAtual.condominio_novo);
    payload.bloco = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.bloco);
    payload.bloco_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.bloco);
    payload.apartamento = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.apartamento);
    payload.apartamento_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.apartamento);
    payload.cep = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.cep);
    payload.cep_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.cep);
    payload.endereco = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.endereco);
    payload.endereco_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.endereco);
    payload.numero = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.numero);
    payload.numero_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.numero);
    payload.bairro = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.bairro);
    payload.bairro_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.bairro);
    payload.cidade = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.cidade);
    payload.cidade_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.cidade);
    payload.complemento = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.complemento);
    payload.complemento_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.complemento);
    payload.referencia = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.referencia);
    payload.referencia_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.referencia);
    payload.latitude = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.latitude)
        || valorTextoMudancaEndereco(contratoAtual === null || contratoAtual === void 0 ? void 0 : contratoAtual.latitude);
    payload.latitude_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.latitude)
        || valorTextoMudancaEndereco(contratoAtual === null || contratoAtual === void 0 ? void 0 : contratoAtual.latitude_novo)
        || valorTextoMudancaEndereco(contratoAtual === null || contratoAtual === void 0 ? void 0 : contratoAtual.latitude);
    payload.longitude = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.longitude)
        || valorTextoMudancaEndereco(contratoAtual === null || contratoAtual === void 0 ? void 0 : contratoAtual.longitude);
    payload.longitude_novo = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.longitude)
        || valorTextoMudancaEndereco(contratoAtual === null || contratoAtual === void 0 ? void 0 : contratoAtual.longitude_novo)
        || valorTextoMudancaEndereco(contratoAtual === null || contratoAtual === void 0 ? void 0 : contratoAtual.longitude);
    return payload;
}
function formatarEnderecoMudancaEndereco(endereco) {
    if (!endereco)
        return 'Nao informado';
    const linhaPrincipal = [
        endereco.endereco,
        endereco.numero,
        endereco.bairro
    ].filter(Boolean).join(', ');
    return [
        endereco.cep ? `CEP: ${endereco.cep}` : '',
        linhaPrincipal,
        endereco.cidade ? `Cidade/UF: ${endereco.cidade}${endereco.uf ? `/${endereco.uf}` : ''}` : '',
        endereco.complemento ? `Complemento: ${endereco.complemento}` : '',
        endereco.referencia ? `Referencia: ${endereco.referencia}` : '',
        endereco.id_condominio ? `Condominio/localidade: ${endereco.id_condominio}` : '',
        endereco.localidade_nome ? `Localidade informada: ${endereco.localidade_nome}` : ''
    ].filter(Boolean).join('\r\n') || 'Nao informado';
}
function resolverCidadeUfParaMensagemMudancaEndereco(endereco) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const cidadeInformada = valorTextoMudancaEndereco(endereco === null || endereco === void 0 ? void 0 : endereco.cidade);
        const ufInformada = valorTextoMudancaEndereco(endereco === null || endereco === void 0 ? void 0 : endereco.uf);
        let cidadeNome = /^\d+$/.test(cidadeInformada) ? '' : cidadeInformada;
        let ufSigla = /^\d+$/.test(ufInformada) ? '' : ufInformada.toUpperCase();
        try {
            let cidadeRegistro = cidadesCache.find(cidade => String(cidade.id) === cidadeInformada);
            if (!cidadeRegistro && /^\d+$/.test(cidadeInformada)) {
                const cidadeResponse = yield makeIxcRequest('POST', '/cidade', {
                    qtype: 'cidade.id',
                    query: cidadeInformada,
                    oper: '=',
                    rp: '1'
                }, 'listar');
                const cidadeIxc = (_a = cidadeResponse === null || cidadeResponse === void 0 ? void 0 : cidadeResponse.registros) === null || _a === void 0 ? void 0 : _a[0];
                if (cidadeIxc) {
                    cidadeRegistro = { id: cidadeIxc.id, nome: cidadeIxc.nome, uf: cidadeIxc.uf };
                    cidadesCache.push(cidadeRegistro);
                }
            }
            cidadeNome = valorTextoMudancaEndereco(cidadeRegistro === null || cidadeRegistro === void 0 ? void 0 : cidadeRegistro.nome) || cidadeNome;
            const ufReferencia = ufInformada || valorTextoMudancaEndereco(cidadeRegistro === null || cidadeRegistro === void 0 ? void 0 : cidadeRegistro.uf);
            let ufRegistro = ufsCache.find(uf => String(uf.id) === ufReferencia || String(uf.sigla).toUpperCase() === ufReferencia.toUpperCase());
            if (!ufRegistro && /^\d+$/.test(ufReferencia)) {
                const ufResponse = yield makeIxcRequest('POST', '/uf', {
                    qtype: 'uf.id',
                    query: ufReferencia,
                    oper: '=',
                    rp: '1'
                }, 'listar');
                const ufIxc = (_b = ufResponse === null || ufResponse === void 0 ? void 0 : ufResponse.registros) === null || _b === void 0 ? void 0 : _b[0];
                if (ufIxc) {
                    ufRegistro = { id: ufIxc.id, sigla: ufIxc.sigla, nome: ufIxc.nome };
                    ufsCache.push(ufRegistro);
                }
            }
            ufSigla = valorTextoMudancaEndereco(ufRegistro === null || ufRegistro === void 0 ? void 0 : ufRegistro.sigla)
                || (!/^\d+$/.test(ufReferencia) ? ufReferencia.toUpperCase() : ufSigla);
        }
        catch (error) {
            console.warn('[Cadastro Banda Larga][Mudanca Endereco] nao foi possivel traduzir cidade/UF para a mensagem', {
                cidadeId: cidadeInformada,
                ufId: ufInformada,
                etapa: 'resolver_cidade_uf_mensagem'
            });
            (0, logger_1.logError)('Cadastro Banda Larga.Mudanca Endereco.CidadeUF', error, {
                cidade_id: cidadeInformada,
                uf_id: ufInformada
            });
        }
        return Object.assign(Object.assign({}, endereco), { cidade: cidadeNome || 'Cidade nao identificada', uf: ufSigla || 'UF nao identificada' });
    });
}
function buscarContratoIxcPorId(contratoId) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const contratoResponse = yield makeIxcRequest('POST', '/cliente_contrato', {
            qtype: 'cliente_contrato.id',
            query: contratoId,
            oper: '=',
            rp: '1'
        });
        const contrato = (_a = contratoResponse === null || contratoResponse === void 0 ? void 0 : contratoResponse.registros) === null || _a === void 0 ? void 0 : _a[0];
        if (!contrato)
            throw new Error('Contrato nao encontrado no IXC.');
        return contrato;
    });
}
function buscarClienteIxcPorId(clienteId) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const clienteResponse = yield makeIxcRequest('POST', '/cliente', {
            qtype: 'cliente.id',
            query: clienteId,
            oper: '=',
            rp: '1'
        });
        const cliente = (_a = clienteResponse === null || clienteResponse === void 0 ? void 0 : clienteResponse.registros) === null || _a === void 0 ? void 0 : _a[0];
        if (!cliente)
            throw new Error('Cliente nao encontrado no IXC para atualizar o endereco padrao.');
        return cliente;
    });
}
function montarPayloadClienteMudancaEndereco(clienteAtual, enderecoNovo) {
    const payload = Object.fromEntries(Object.entries(clienteAtual || {}).map(([campo, valor]) => [
        campo,
        normalizarDataContratoParaPut(campo, valor)
    ]));
    delete payload.id;
    Object.keys(payload)
        .filter(campo => campo.toLowerCase().includes('cancel'))
        .forEach(campo => delete payload[campo]);
    payload.cep = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.cep);
    payload.endereco = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.endereco);
    payload.numero = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.numero);
    payload.bairro = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.bairro);
    payload.cidade = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.cidade);
    payload.uf = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.uf);
    payload.complemento = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.complemento);
    payload.referencia = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.referencia);
    payload.id_condominio = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.id_condominio);
    payload.bloco = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.bloco);
    payload.apartamento = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.apartamento);
    payload.latitude = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.latitude)
        || valorTextoMudancaEndereco(clienteAtual === null || clienteAtual === void 0 ? void 0 : clienteAtual.latitude);
    payload.longitude = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.longitude)
        || valorTextoMudancaEndereco(clienteAtual === null || clienteAtual === void 0 ? void 0 : clienteAtual.longitude);
    return payload;
}
function atualizarEnderecoClienteIxc(clienteAtual, enderecoNovo) {
    return __awaiter(this, void 0, void 0, function* () {
        const payload = montarPayloadClienteMudancaEndereco(clienteAtual, enderecoNovo);
        console.log('[Cadastro Banda Larga][Mudanca Endereco] atualizando cliente', {
            clienteId: clienteAtual.id,
            etapa: 'atualizar_cliente',
            camposEndereco: {
                cep: payload.cep,
                endereco: payload.endereco,
                numero: payload.numero,
                bairro: payload.bairro,
                cidade: payload.cidade,
                uf: payload.uf,
                complemento: payload.complemento ? '[informado]' : '',
                referencia: payload.referencia ? '[informado]' : '',
                id_condominio: payload.id_condominio
            }
        });
        const response = yield makeIxcRequest('PUT', `/cliente/${clienteAtual.id}`, payload, 'alterar');
        validarRespostaAlteracaoEnderecoIxc(response, 'IXC nao confirmou a alteracao do endereco do cliente.');
    });
}
function buscarContratosValidosClienteMudancaEndereco(clienteId) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield makeIxcRequest('POST', '/cliente_contrato', {
            qtype: 'cliente_contrato.id_cliente',
            query: clienteId,
            oper: '=',
            page: '1',
            rp: '1000',
            sortname: 'cliente_contrato.id',
            sortorder: 'desc'
        });
        const contratos = Array.isArray(response === null || response === void 0 ? void 0 : response.registros) ? response.registros : [];
        return contratos.filter((contrato) => !['C', 'I'].includes(String((contrato === null || contrato === void 0 ? void 0 : contrato.status) || '').toUpperCase()));
    });
}
function buscarLoginContratoMudancaEndereco(contratoId) {
    return __awaiter(this, void 0, void 0, function* () {
        const loginResponse = yield makeIxcRequest('POST', '/radusuarios', {
            qtype: 'radusuarios.id_contrato',
            query: contratoId,
            oper: '=',
            rp: '100',
            sortname: 'radusuarios.id',
            sortorder: 'desc'
        });
        const logins = Array.isArray(loginResponse === null || loginResponse === void 0 ? void 0 : loginResponse.registros) ? loginResponse.registros : [];
        const loginAtivo = logins.find((login) => String(login.ativo || '').toUpperCase() === 'S');
        return loginAtivo || logins[0] || null;
    });
}
function montarPayloadLoginMudancaEndereco(loginAtual, enderecoNovo) {
    const payload = Object.fromEntries(Object.entries(loginAtual || {}).map(([campo, valor]) => [
        campo,
        normalizarDataContratoParaPut(campo, valor)
    ]));
    payload.cep = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.cep);
    payload.endereco = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.endereco);
    payload.numero = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.numero);
    payload.bairro = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.bairro);
    payload.cidade = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.cidade);
    payload.complemento = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.complemento);
    payload.referencia = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.referencia);
    payload.id_condominio = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.id_condominio);
    payload.bloco = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.bloco);
    payload.apartamento = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.apartamento);
    payload.latitude = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.latitude)
        || valorTextoMudancaEndereco(loginAtual === null || loginAtual === void 0 ? void 0 : loginAtual.latitude);
    payload.longitude = valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.longitude)
        || valorTextoMudancaEndereco(loginAtual === null || loginAtual === void 0 ? void 0 : loginAtual.longitude);
    return payload;
}
function atualizarEnderecoLoginIxc(loginAtual, enderecoNovo) {
    return __awaiter(this, void 0, void 0, function* () {
        const loginId = valorTextoMudancaEndereco(loginAtual === null || loginAtual === void 0 ? void 0 : loginAtual.id);
        if (!loginId)
            throw new Error('Login do contrato sem ID valido para atualizar o endereco.');
        const payload = montarPayloadLoginMudancaEndereco(loginAtual, enderecoNovo);
        console.log('[Cadastro Banda Larga][Mudanca Endereco] atualizando login', {
            loginId,
            contratoId: loginAtual.id_contrato,
            clienteId: loginAtual.id_cliente,
            etapa: 'atualizar_login',
            camposEndereco: {
                cep: payload.cep,
                endereco: payload.endereco,
                numero: payload.numero,
                bairro: payload.bairro,
                cidade: payload.cidade,
                complemento: payload.complemento ? '[informado]' : '',
                referencia: payload.referencia ? '[informado]' : '',
                id_condominio: payload.id_condominio
            }
        });
        const response = yield makeIxcRequest('PUT', `/radusuarios/${loginId}`, payload, 'alterar');
        validarRespostaAlteracaoEnderecoIxc(response, 'IXC nao confirmou a alteracao do endereco do login.');
    });
}
function obterAutorIxcMudancaEndereco(usuarioIntranet) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!usuarioIntranet || usuarioIntranet === 'Visitante') {
            throw new Error('Nao foi possivel identificar o colaborador logado para abrir o atendimento.');
        }
        const autor = yield new Promise((resolve, reject) => {
            database_1.LOCALHOST.query(`SELECT id_funcionario_ixc, id_usuario_ixc
             FROM usuarios_intranet
             WHERE usuario = ? AND ativo = 1
             LIMIT 1`, [usuarioIntranet], (erro, resultados) => {
                if (erro)
                    return reject(erro);
                resolve((resultados === null || resultados === void 0 ? void 0 : resultados[0]) || null);
            });
        });
        const idFuncionarioIxc = valorTextoMudancaEndereco(autor === null || autor === void 0 ? void 0 : autor.id_funcionario_ixc);
        if (!idFuncionarioIxc || idFuncionarioIxc === '138') {
            throw new Error(`Colaborador "${usuarioIntranet}" sem funcionario IXC valido para abrir o atendimento.`);
        }
        return {
            idFuncionarioIxc,
            idUsuarioIxc: valorTextoMudancaEndereco(autor === null || autor === void 0 ? void 0 : autor.id_usuario_ixc) || '61'
        };
    });
}
function atualizarEnderecoContratoIxc(contratoAtual, enderecoNovo) {
    return __awaiter(this, void 0, void 0, function* () {
        const payload = montarPayloadContratoMudancaEndereco(contratoAtual, enderecoNovo);
        console.log('[Cadastro Banda Larga][Mudanca Endereco] Payload endereco contrato:', {
            contratoId: contratoAtual.id,
            id_cliente: contratoAtual.id_cliente,
            etapa: 'montar_payload_contrato',
            camposEnderecoNovo: {
                condominio_novo: payload.condominio_novo,
                cep_novo: payload.cep_novo,
                endereco_novo: payload.endereco_novo,
                numero_novo: payload.numero_novo,
                bairro_novo: payload.bairro_novo,
                cidade_novo: payload.cidade_novo,
                complemento_novo: payload.complemento_novo ? '[informado]' : '',
                referencia_novo: payload.referencia_novo ? '[informado]' : '',
                bloco_novo: payload.bloco_novo ? '[informado]' : '',
                apartamento_novo: payload.apartamento_novo ? '[informado]' : ''
            }
        });
        console.log('[Cadastro Banda Larga][Mudanca Endereco] Atualizando contrato no IXC:', {
            contratoId: contratoAtual.id,
            etapa: 'atualizar_contrato',
            endpoint: `/cliente_contrato/${contratoAtual.id}`
        });
        const response = yield makeIxcRequest('PUT', `/cliente_contrato/${contratoAtual.id}`, payload, 'alterar');
        validarRespostaAlteracaoEnderecoIxc(response, 'IXC nao confirmou a alteracao do endereco do contrato.');
    });
}
function abrirChamadoMudancaEndereco(clienteId, contratoId, contratoAtual, enderecoAntigo, enderecoNovo, usuarioIntranet, autorIxc, loginId, observacoes, regraEnderecoCliente) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!valorTextoMudancaEndereco(loginId)) {
            throw new Error('Não foi encontrado login vinculado ao contrato selecionado.');
        }
        const enderecoNovoMensagem = yield resolverCidadeUfParaMensagemMudancaEndereco(enderecoNovo);
        const mensagem = `

Contrato: ${contratoId}
Login: ${loginId}
Cliente: ${clienteId}
Colaborador responsavel: ${usuarioIntranet || 'Nao informado'} (IXC ${autorIxc.idFuncionarioIxc})

Endereco novo:
${formatarEnderecoMudancaEndereco(enderecoNovoMensagem)}

Observacoes:
${observacoes || 'Nao informado'}
    `.trim().replace(/\n/g, '\r\n');
        const atendimentoPayload = {
            id_cliente: clienteId,
            id_login: loginId,
            id_contrato: contratoId,
            id_filial: contratoAtual.id_filial || '3',
            id_assunto: '4',
            titulo: 'MUDANÇA DE ENDEREÇO',
            origem_endereco: 'L',
            id_wfl_processo: '9',
            id_ticket_setor: '4',
            id_responsavel_tecnico: autorIxc.idFuncionarioIxc,
            id_ticket_origem: 'I',
            id_usuarios: autorIxc.idUsuarioIxc,
            tipo: 'C',
            prioridade: 'M',
            melhor_horario_reserva: 'Q',
            interacao_pendente: 'N',
            status: 'OSAB',
            su_status: 'EP',
            origem_cadastro: 'P',
            menssagem: mensagem
        };
        console.log('[Cadastro Banda Larga][Mudanca Endereco] origem_endereco definida como L por assunto com login obrigatório', {
            clienteId,
            contratoId,
            loginId,
            origem_endereco: atendimentoPayload.origem_endereco,
            etapa: 'abrir_atendimento'
        });
        console.log('[Cadastro Banda Larga][Mudanca Endereco] Payload atendimento:', {
            etapa: 'abrir_atendimento',
            tipo: atendimentoPayload.tipo,
            id_cliente: atendimentoPayload.id_cliente,
            id_login: atendimentoPayload.id_login || '',
            id_contrato: atendimentoPayload.id_contrato,
            id_filial: atendimentoPayload.id_filial,
            id_assunto: atendimentoPayload.id_assunto,
            id_wfl_processo: atendimentoPayload.id_wfl_processo,
            id_ticket_setor: atendimentoPayload.id_ticket_setor,
            id_responsavel_tecnico: atendimentoPayload.id_responsavel_tecnico,
            id_usuarios: atendimentoPayload.id_usuarios,
            origem_endereco: atendimentoPayload.origem_endereco
        });
        try {
            const response = yield makeIxcRequest('POST', '/su_ticket', atendimentoPayload, 'incluir');
            const ticketId = (response === null || response === void 0 ? void 0 : response.id) || (response === null || response === void 0 ? void 0 : response.id_su_ticket);
            if (!ticketId || (response === null || response === void 0 ? void 0 : response.type) === 'error') {
                const erroResposta = new Error((response === null || response === void 0 ? void 0 : response.message) || (response === null || response === void 0 ? void 0 : response.msg) || 'IXC nao retornou o ticket da mudanca de endereco.');
                erroResposta.ixcResponse = response;
                throw erroResposta;
            }
            return String(ticketId);
        }
        catch (error) {
            error.atendimentoPayload = atendimentoPayload;
            throw error;
        }
    });
}
router.get('/cancelamento/opcoes/:questionId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const questionId = Number(req.params.questionId);
        if (![2, 3].includes(questionId)) {
            return res.status(400).json({ success: false, error: 'Pergunta de pesquisa inválida.' });
        }
        const respostas = yield executeDbLocal(`SELECT answerId, answer
             FROM saleResearchAnswer
             WHERE questionId = ?
             ORDER BY answer`, [questionId]);
        res.json({ success: true, items: respostas });
    }
    catch (error) {
        (0, logger_1.logError)('Cadastro Banda Larga.Cancelamento.Opcoes', error, {
            questionId: req.params.questionId
        });
        res.status(500).json({ success: false, error: 'Erro ao carregar opções de cancelamento.' });
    }
}));
router.post('/cancelamento-cliente', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const logContext = 'Cadastro Banda Larga.Cancelamento';
    const { clienteId, contratoId, motivoAnswerId, operadoraAnswerId, observacao, usuario_intranet } = req.body || {};
    let ticketIdLog = '';
    let enderecoAtualizado = false;
    try {
        if (!valorTextoIxc(clienteId) || !valorTextoIxc(contratoId)) {
            return res.status(400).json({ success: false, error: 'Cliente e contrato são obrigatórios.' });
        }
        const motivo = yield buscarRespostaPesquisa(2, motivoAnswerId);
        if (!motivo) {
            return res.status(400).json({ success: false, error: 'Informe o motivo do cancelamento.' });
        }
        const exigeOperadora = String(motivo.answer || '').trim().toUpperCase() === 'CONTRATOU OUTRA OPERADORA';
        const operadora = exigeOperadora ? yield buscarRespostaPesquisa(3, operadoraAnswerId) : null;
        if (exigeOperadora && !operadora) {
            return res.status(400).json({ success: false, error: 'Informe qual operadora o cliente contratou.' });
        }
        const contrato = yield buscarContratoIxcPorId(String(contratoId));
        if (String(contrato.id_cliente) !== String(clienteId)) {
            return res.status(400).json({ success: false, error: 'Contrato não pertence ao cliente informado.' });
        }
        const login = yield buscarLoginContratoMudancaEndereco(String(contratoId));
        const loginId = valorTextoIxc(login === null || login === void 0 ? void 0 : login.id);
        if (!loginId) {
            return res.status(400).json({
                success: false,
                error: 'Não foi encontrado login vinculado ao contrato selecionado.'
            });
        }
        const autorIxc = yield obterUsuarioIxcCadastro(usuario_intranet, '302');
        const mensagem = montarMensagemCancelamento(motivo.answer, (operadora === null || operadora === void 0 ? void 0 : operadora.answer) || '', valorTextoIxc(observacao));
        const atendimentoPayload = {
            tipo: 'C',
            id_cliente: String(clienteId),
            id_assunto: ID_ASSUNTO_CANCELAMENTO_BANDA_LARGA,
            titulo: TITULO_CANCELAMENTO_BANDA_LARGA,
            su_status: 'EP',
            prioridade: 'M',
            id_ticket_setor: '4',
            id_ticket_origem: 'I',
            id_usuarios: autorIxc.idUsuarioIxc,
            id_wfl_processo: ID_PROCESSO_CANCELAMENTO_BANDA_LARGA,
            origem_endereco: 'C',
            menssagem: mensagem,
            id_filial: contrato.id_filial || '1',
            id_responsavel_tecnico: autorIxc.idFuncionarioIxc,
            interacao_pendente: 'N',
            melhor_horario_reserva: 'Q',
            id_login: loginId,
            id_contrato: String(contratoId),
            origem_cadastro: 'P'
        };
        (0, logger_1.logInfo)(logContext, '[Cadastro Banda Larga][Cancelamento] abrindo atendimento', {
            usuario: usuario_intranet || 'Nao informado',
            clienteId: String(clienteId),
            contratoId: String(contratoId),
            loginId,
            motivo: motivo.answer,
            operadora: (operadora === null || operadora === void 0 ? void 0 : operadora.answer) || null,
            id_assunto: atendimentoPayload.id_assunto,
            id_wfl_processo: atendimentoPayload.id_wfl_processo,
            id_responsavel_tecnico: atendimentoPayload.id_responsavel_tecnico,
            id_usuarios: atendimentoPayload.id_usuarios
        });
        const response = yield makeIxcRequest('POST', '/su_ticket', atendimentoPayload, 'incluir');
        const ticketId = (response === null || response === void 0 ? void 0 : response.id) || (response === null || response === void 0 ? void 0 : response.id_su_ticket) || (response === null || response === void 0 ? void 0 : response.ticket_id);
        ticketIdLog = String(ticketId || '');
        if (!ticketId || (response === null || response === void 0 ? void 0 : response.type) === 'error') {
            throw new Error((response === null || response === void 0 ? void 0 : response.message) || (response === null || response === void 0 ? void 0 : response.msg) || 'IXC não retornou o atendimento de cancelamento.');
        }
        const osInicial = yield localizarOsAbertaCancelamentoPorTicket(String(ticketId));
        if (!(osInicial === null || osInicial === void 0 ? void 0 : osInicial.id)) {
            (0, logger_1.logWarn)(logContext, '[Cadastro Banda Larga][Cancelamento] OS inicial ainda nao localizada.', {
                clienteId: String(clienteId),
                contratoId: String(contratoId),
                ticketId: String(ticketId),
                etapa: 'aguardando_tramitacao'
            });
            return res.status(202).json({
                success: true,
                partial: true,
                ticketId: String(ticketId),
                message: 'Atendimento aberto, mas ainda não foi possível localizar a OS de recolhimento. Verifique no IXC.'
            });
        }
        (0, logger_1.logInfo)(logContext, '[Cadastro Banda Larga][Cancelamento] atendimento aberto aguardando tramitacao', {
            clienteId: String(clienteId),
            contratoId: String(contratoId),
            loginId,
            ticketId: String(ticketId),
            osInicialId: (osInicial === null || osInicial === void 0 ? void 0 : osInicial.id) ? String(osInicial.id) : null,
            tarefaAtual: (osInicial === null || osInicial === void 0 ? void 0 : osInicial.id_wfl_tarefa) || null
        });
        res.json({
            success: true,
            ticketId: String(ticketId),
            osInicialId: (osInicial === null || osInicial === void 0 ? void 0 : osInicial.id) ? String(osInicial.id) : '',
            modo: 'CANCELAMENTO_AGUARDANDO_TRAMITACAO'
        });
    }
    catch (error) {
        (0, logger_1.logError)(logContext, error, {
            etapa: 'cancelamento_cliente',
            clienteId: valorTextoIxc(clienteId),
            contratoId: valorTextoIxc(contratoId),
            ticketId: ticketIdLog || null,
            enderecoAtualizado
        });
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao abrir atendimento de cancelamento.'
        });
    }
}));
router.post('/cancelamento-cliente/tramitar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const logContext = 'Cadastro Banda Larga.Cancelamento.Tramitar';
    const { ticketId, idTarefa, mensagem, usuario_intranet } = req.body || {};
    try {
        const ticketIdFinal = valorTextoIxc(ticketId);
        const idTarefaFinal = valorTextoIxc(idTarefa);
        if (!ticketIdFinal) {
            return res.status(400).json({ success: false, error: 'Atendimento de cancelamento nÃ£o informado.' });
        }
        if (!['29', '129', '147'].includes(idTarefaFinal)) {
            return res.status(400).json({ success: false, error: 'Selecione uma tramitaÃ§Ã£o vÃ¡lida para o cancelamento.' });
        }
        const autorIxc = yield obterUsuarioIxcCadastro(usuario_intranet, '302');
        const mensagemFinal = valorTextoIxc(mensagem) || 'Atendimento de cancelamento tramitado via Intranet Hub.';
        (0, logger_1.logInfo)(logContext, '[Cadastro Banda Larga][Cancelamento] tramitando atendimento', {
            usuario: usuario_intranet || 'Nao informado',
            ticketId: ticketIdFinal,
            idTarefa: idTarefaFinal,
            id_responsavel_tecnico: autorIxc.idFuncionarioIxc
        });
        yield fecharTarefaOS(ticketIdFinal, idTarefaFinal, mensagemFinal, autorIxc.idFuncionarioIxc);
        if (idTarefaFinal !== '29') {
            return res.json({
                success: true,
                encaminhado: true,
                agendar: false,
                ticketId: ticketIdFinal,
                message: 'Atendimento encaminhado com sucesso. Nenhum agendamento Ã© necessÃ¡rio nesta etapa.'
            });
        }
        const osRecolhimento = yield localizarOsRecolhimentoPorTicket(ticketIdFinal);
        if (!(osRecolhimento === null || osRecolhimento === void 0 ? void 0 : osRecolhimento.id)) {
            (0, logger_1.logWarn)(logContext, '[Cadastro Banda Larga][Cancelamento] OS de recolhimento ainda nao localizada apos tramitacao.', {
                ticketId: ticketIdFinal,
                idTarefa: idTarefaFinal,
                setorEsperado: '19'
            });
            return res.status(202).json({
                success: true,
                partial: true,
                agendar: true,
                ticketId: ticketIdFinal,
                message: 'Atendimento tramitado para recolhimento, mas ainda nÃ£o foi possÃ­vel localizar a OS. Verifique no IXC.'
            });
        }
        (0, logger_1.logInfo)(logContext, '[Cadastro Banda Larga][Cancelamento] OS de recolhimento localizada apos tramitacao', {
            ticketId: ticketIdFinal,
            osId: String(osRecolhimento.id),
            setor: osRecolhimento.setor
        });
        res.json({
            success: true,
            agendar: true,
            ticketId: ticketIdFinal,
            osId: String(osRecolhimento.id),
            modo: 'RECOLHIMENTO'
        });
    }
    catch (error) {
        (0, logger_1.logError)(logContext, error, {
            ticketId: valorTextoIxc(ticketId),
            idTarefa: valorTextoIxc(idTarefa),
            usuario: usuario_intranet || 'Nao informado'
        });
        res.status(500).json({
            success: false,
            error: 'NÃ£o foi possÃ­vel tramitar o atendimento de cancelamento.',
            detail: error.message
        });
    }
}));
router.post('/mudanca-endereco', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const logPrefix = '[Cadastro Banda Larga][Mudanca Endereco]';
    const { contratoId, clienteId, enderecoNovo, enderecoAntigo, usuario_intranet, observacoes } = req.body;
    let clienteAtualizado = false;
    let contratoAtualizado = false;
    let loginAtualizado = false;
    let loginIdLog = '';
    let enderecoPadraoCliente = false;
    let enderecoPadraoLogin = false;
    let clienteComApenasUmContrato = false;
    let quantidadeContratosValidos = 0;
    let etapaAtual = 'validacao';
    let atendimentoCriado = false;
    let ticketIdLog = '';
    console.log(`${logPrefix} inicio`, { clienteId, contratoId, usuario: usuario_intranet || 'Nao informado', etapa: 'validacao' });
    try {
        if (!contratoId || !clienteId) {
            return res.status(400).json({ success: false, error: 'Cliente e contrato sao obrigatorios.' });
        }
        const faltando = ['cep', 'endereco', 'numero', 'bairro', 'cidade', 'uf', 'complemento']
            .filter(campo => !valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo[campo]));
        if (!valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.id_condominio) && !valorTextoMudancaEndereco(enderecoNovo === null || enderecoNovo === void 0 ? void 0 : enderecoNovo.localidade_nome)) {
            faltando.push('localidade');
        }
        if (faltando.length > 0) {
            return res.status(400).json({ success: false, error: `Campos obrigatorios faltando: ${faltando.join(', ')}` });
        }
        etapaAtual = 'buscar_contrato';
        console.log(`${logPrefix} buscando contrato`, { clienteId, contratoId, usuario: usuario_intranet || 'Nao informado', etapa: etapaAtual });
        const contratoAtual = yield buscarContratoIxcPorId(String(contratoId));
        if (String(contratoAtual.id_cliente) !== String(clienteId)) {
            return res.status(400).json({ success: false, error: 'Contrato nao pertence ao cliente informado.' });
        }
        const statusContrato = String(contratoAtual.status || '').toUpperCase();
        const statusInternet = String(contratoAtual.status_internet || '').toUpperCase();
        if (statusContrato === 'C' || !['A', 'AA'].includes(statusInternet)) {
            return res.status(400).json({
                success: false,
                error: `Contrato nao elegivel para mudanca de endereco (status ${statusContrato || 'N/A'}, internet ${statusInternet || 'N/A'}).`
            });
        }
        etapaAtual = 'buscar_login';
        console.log(`${logPrefix} buscando login`, { clienteId, contratoId, usuario: usuario_intranet || 'Nao informado', etapa: etapaAtual });
        const loginAtual = yield buscarLoginContratoMudancaEndereco(String(contratoId));
        const loginId = valorTextoMudancaEndereco(loginAtual === null || loginAtual === void 0 ? void 0 : loginAtual.id);
        loginIdLog = loginId;
        if (!loginAtual || !loginId) {
            console.warn(`${logPrefix} bloqueado sem login`, {
                clienteId,
                contratoId,
                usuario: usuario_intranet || 'Nao informado',
                etapa: etapaAtual
            });
            return res.status(400).json({
                success: false,
                error: 'Não foi encontrado login vinculado ao contrato selecionado.'
            });
        }
        etapaAtual = 'buscar_contratos_cliente';
        console.log(`${logPrefix} buscando contratos do cliente`, {
            clienteId,
            contratoId,
            etapa: etapaAtual
        });
        const contratosValidosCliente = yield buscarContratosValidosClienteMudancaEndereco(String(clienteId));
        quantidadeContratosValidos = contratosValidosCliente.length;
        clienteComApenasUmContrato = quantidadeContratosValidos === 1;
        enderecoPadraoCliente = String(contratoAtual.endereco_padrao_cliente || '').toUpperCase() === 'S';
        enderecoPadraoLogin = String(loginAtual.endereco_padrao_cliente || '').toUpperCase() === 'S';
        const deveAtualizarCadastroCliente = enderecoPadraoCliente || enderecoPadraoLogin || clienteComApenasUmContrato;
        etapaAtual = 'verificar_endereco_padrao_cliente';
        console.log(`${logPrefix} verificando endereco padrao do cliente`, {
            clienteId,
            contratoId,
            endereco_padrao_cliente: enderecoPadraoCliente ? 'S' : String(contratoAtual.endereco_padrao_cliente || 'N'),
            endereco_padrao_login: enderecoPadraoLogin ? 'S' : String(loginAtual.endereco_padrao_cliente || 'N'),
            quantidade_contratos_validos: quantidadeContratosValidos,
            cliente_com_apenas_um_contrato: clienteComApenasUmContrato,
            atualizar_cadastro_cliente: deveAtualizarCadastroCliente,
            etapa: etapaAtual
        });
        const autorIxc = yield obterAutorIxcMudancaEndereco(usuario_intranet);
        let enderecoAntigoEfetivo = enderecoAntigo;
        if (deveAtualizarCadastroCliente) {
            etapaAtual = 'buscar_cliente';
            console.log(`${logPrefix} buscando cliente`, { clienteId, contratoId, etapa: etapaAtual });
            const clienteAtual = yield buscarClienteIxcPorId(String(clienteId));
            if (enderecoPadraoCliente || enderecoPadraoLogin)
                enderecoAntigoEfetivo = clienteAtual;
            etapaAtual = 'atualizar_cliente';
            yield atualizarEnderecoClienteIxc(clienteAtual, enderecoNovo);
            clienteAtualizado = true;
            console.log(`${logPrefix} cliente atualizado`, { clienteId, contratoId, etapa: etapaAtual });
        }
        etapaAtual = 'atualizar_contrato';
        console.log(`${logPrefix} montando payload do contrato`, { clienteId, contratoId, usuario: usuario_intranet || 'Nao informado', etapa: 'montar_payload_contrato' });
        yield atualizarEnderecoContratoIxc(contratoAtual, enderecoNovo);
        contratoAtualizado = true;
        console.log(`${logPrefix} contrato atualizado`, { clienteId, contratoId, usuario: usuario_intranet || 'Nao informado', etapa: 'contrato_atualizado' });
        etapaAtual = 'atualizar_login';
        yield atualizarEnderecoLoginIxc(loginAtual, enderecoNovo);
        loginAtualizado = true;
        console.log(`${logPrefix} login atualizado`, {
            clienteId,
            contratoId,
            loginId,
            usuario: usuario_intranet || 'Nao informado',
            etapa: 'login_atualizado'
        });
        etapaAtual = 'abrir_atendimento';
        console.log(`${logPrefix} abrindo atendimento`, {
            clienteId,
            contratoId,
            usuario: usuario_intranet || 'Nao informado',
            idFuncionarioIxc: autorIxc.idFuncionarioIxc,
            idUsuarioIxc: autorIxc.idUsuarioIxc,
            loginId: loginId || 'Nao localizado',
            etapa: 'abrir_atendimento'
        });
        const ticketId = yield abrirChamadoMudancaEndereco(String(clienteId), String(contratoId), contratoAtual, enderecoAntigoEfetivo, enderecoNovo, usuario_intranet, autorIxc, loginId, observacoes, {
            contratoUsavaEnderecoCliente: enderecoPadraoCliente,
            loginUsavaEnderecoCliente: enderecoPadraoLogin,
            clienteTinhaApenasUmContrato: clienteComApenasUmContrato,
            clienteAtualizado
        });
        atendimentoCriado = true;
        ticketIdLog = ticketId;
        console.log(`${logPrefix} chamado criado`, { clienteId, contratoId, usuario: usuario_intranet || 'Nao informado', ticketId, etapa: 'chamado_criado' });
        etapaAtual = 'localizar_os';
        console.log(`${logPrefix} localizando OS`, { clienteId, contratoId, ticketId, etapa: 'localizar_os' });
        const osMudancaEndereco = yield buscarOsInstalacaoPorTicket(ticketId);
        if (!(osMudancaEndereco === null || osMudancaEndereco === void 0 ? void 0 : osMudancaEndereco.id)) {
            console.warn(`${logPrefix} OS nao localizada`, { clienteId, contratoId, usuario: usuario_intranet || 'Nao informado', ticketId, etapa: 'localizar_os' });
            return res.status(202).json({ success: true, ticketId, osId: null, error: 'Endereco alterado e chamado criado, mas nao foi possivel localizar a OS para agendamento.' });
        }
        console.log(`${logPrefix} redirecionamento final`, { clienteId, contratoId, usuario: usuario_intranet || 'Nao informado', ticketId, osId: osMudancaEndereco.id, etapa: 'redirecionar_agendamento' });
        res.status(201).json({
            success: true,
            message: 'Mudanca de endereco concluida com sucesso.',
            clienteId,
            contratoId,
            ticketId,
            osId: osMudancaEndereco.id,
            clienteAtualizado,
            contratoAtualizado,
            loginAtualizado
        });
    }
    catch (error) {
        const falhaParcial = clienteAtualizado || contratoAtualizado || loginAtualizado;
        const metaErro = {
            clienteId,
            contratoId,
            loginId: loginIdLog || 'Nao localizado',
            usuario: usuario_intranet || 'Nao informado',
            endereco_padrao_cliente: enderecoPadraoCliente ? 'S' : 'N',
            endereco_padrao_login: enderecoPadraoLogin ? 'S' : 'N',
            quantidade_contratos_validos: quantidadeContratosValidos,
            cliente_com_apenas_um_contrato: clienteComApenasUmContrato,
            cliente_atualizado: clienteAtualizado,
            contrato_atualizado: contratoAtualizado,
            login_atualizado: loginAtualizado,
            falha_parcial: falhaParcial,
            atendimento_criado: atendimentoCriado,
            ticket_id: ticketIdLog,
            etapa_falha: etapaAtual,
            etapa: 'falha',
            payload_atendimento: error.atendimentoPayload,
            endpoint_ixc: error.ixcEndpoint,
            resposta_ixc: error.ixcResponse
        };
        console.error(`${logPrefix} falha`, {
            clienteId,
            contratoId,
            loginId: loginIdLog || 'Nao localizado',
            cliente_atualizado: clienteAtualizado,
            contrato_atualizado: contratoAtualizado,
            login_atualizado: loginAtualizado,
            atendimento_criado: atendimentoCriado,
            etapa_falha: etapaAtual,
            erro: 'Consulte logs/error.log para detalhes sanitizados.'
        });
        (0, logger_1.logError)('Cadastro Banda Larga.Mudanca Endereco', error, metaErro);
        if (falhaParcial) {
            const mensagemFalhaParcial = atendimentoCriado
                ? 'Endereço atualizado e atendimento criado no IXC, mas houve erro ao localizar a OS. Verifique o atendimento antes de tentar novamente.'
                : etapaAtual === 'abrir_atendimento'
                    ? 'Endereço atualizado no IXC, mas houve erro ao abrir o atendimento. Verifique o contrato/cliente no IXC antes de tentar novamente.'
                    : 'Endereço atualizado parcialmente no IXC, mas não foi possível concluir o fluxo. Verifique o contrato/cliente no IXC antes de tentar novamente.';
            return res.status(502).json({
                success: false,
                partial_success: true,
                endereco_atualizado: true,
                cliente_atualizado: clienteAtualizado,
                contrato_atualizado: contratoAtualizado,
                login_atualizado: loginAtualizado,
                atendimento_criado: atendimentoCriado,
                ticketId: ticketIdLog || undefined,
                error: mensagemFalhaParcial
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
}));
function transferirLoginPPPoE(loginAntigo, novoClienteId, novoContratoId, idGrupoRadius, dataCadastro, clientData) {
    return __awaiter(this, void 0, void 0, function* () {
        const loginAntigoString = loginAntigo.login;
        let macAntigo = loginAntigo.mac;
        //console.log(`Iniciando transferência do Login PPPoE: ${loginAntigoString}`);
        const novoNomeAntigo = `${loginAntigoString}-para-${novoClienteId}`;
        const payloadRenomear = {
            "autenticacao": loginAntigo.autenticacao || "L",
            "tipo_conexao_mapa": loginAntigo.tipo_conexao_mapa || "58",
            "id_cliente": loginAntigo.id_cliente,
            "id_contrato": loginAntigo.id_contrato,
            "id_grupo": loginAntigo.id_grupo,
            "login": novoNomeAntigo,
            "senha_md5": loginAntigo.senha_md5 || "N",
            "senha": loginAntigo.senha || `ivp@${loginAntigo.id_cliente}`,
            "login_simultaneo": loginAntigo.login_simultaneo || "1",
            "ativo": "N",
            "auto_preencher_ip": loginAntigo.auto_preencher_ip || "H",
            "fixar_ip": loginAntigo.fixar_ip || "H",
            "relacionar_ip_ao_login": loginAntigo.relacionar_ip_ao_login || "H",
            "autenticacao_por_mac": "N",
            "auto_preencher_mac": loginAntigo.auto_preencher_mac || "H",
            "relacionar_mac_ao_login": loginAntigo.relacionar_mac_ao_login || "H",
            "tipo_vinculo_plano": loginAntigo.tipo_vinculo_plano || "D",
            "mac": "",
            "endereco_padrao_cliente": "S",
            "id_filial": clientData.id_filial || loginAntigo.id_filial || "3",
            "cep": clientData.cep,
            "endereco": clientData.endereco,
            "numero": clientData.numero,
            "bairro": clientData.bairro,
            "cidade": clientData.cidade,
            "complemento": clientData.complemento,
            "bloco": clientData.bloco,
            "apartamento": clientData.apartamento,
            "referencia": clientData.referencia,
            "id_condominio": clientData.id_condominio
        };
        //console.log(`Enviando comando para renomear login para: ${novoNomeAntigo}...`);
        const responsePut = yield makeIxcRequest('PUT', `/radusuarios/${loginAntigo.id}`, payloadRenomear, 'alterar');
        if (responsePut && responsePut.type === 'error') {
            throw new Error(`Erro ao renomear login antigo no IXC: ${responsePut.message}`);
        }
        //console.log(`Comando PUT executado com sucesso no IXC. Novo nome: ${novoNomeAntigo}.`);
        //console.log("Aguardando 3 segundos para o cache do banco de dados do IXC...");
        yield new Promise(resolve => setTimeout(resolve, 3000));
        //console.log(`Criando novo login PPPoE: '${loginAntigoString}' no contrato ${novoContratoId}`);
        const loginPayload = {
            'id_cliente': novoClienteId,
            'id_contrato': novoContratoId,
            'login': loginAntigoString,
            'senha': loginAntigo.senha || `ivp@${loginAntigo.id_cliente}`,
            'id_grupo': idGrupoRadius,
            'mac': '',
            'ativo': 'S',
            'autenticacao': 'L',
            'login_simultaneo': '1',
            'auto_preencher_ip': 'H',
            'fixar_ip': 'H',
            'relacionar_ip_ao_login': 'H',
            'tipo_vinculo_plano': 'D',
            'ultima_atualizacao': dataCadastro,
            'tipo_conexao_mapa': '58',
            'autenticacao_por_mac': 'P',
            'auto_preencher_mac': 'H',
            'relacionar_mac_ao_login': 'H',
            'senha_md5': 'N',
            'id_filial': clientData.id_filial || '3',
            'endereco_padrao_cliente': 'S',
            'cep': clientData.cep,
            'endereco': clientData.endereco,
            'numero': clientData.numero,
            'bairro': clientData.bairro,
            'cidade': clientData.cidade,
            'complemento': clientData.complemento,
            'bloco': clientData.bloco,
            'apartamento': clientData.apartamento,
            'referencia': clientData.referencia,
            'id_condominio': clientData.id_condominio
        };
        const loginResponse = yield makeIxcRequest('POST', '/radusuarios', loginPayload);
        if (loginResponse && loginResponse.type === 'error') {
            throw new Error(`API IXC Recusou a criação do PPPoE: ${loginResponse.message}`);
        }
        if (loginResponse && loginResponse.id) {
            //console.log(`Novo login criado com sucesso. ID: ${loginResponse.id} | Nome: ${loginAntigoString}`);
            return loginResponse.id;
        }
        throw new Error(loginResponse ? JSON.stringify(loginResponse) : 'Retorno vazio ao criar login');
    });
}
function desconectarLoginPPPoE(loginId) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Enviando comando de desconexão (Kick) para o login ID: ${loginId}`);
        try {
            yield makeIxcRequest('POST', '/desconectar_clientes', { id: loginId });
            //console.log(`Comando de desconexão executado com sucesso para o login ${loginId}.`);
        }
        catch (error) {
            console.warn(`Aviso: Falha ao enviar comando de desconexão para o login ${loginId}. (O cliente pode já estar offline). Erro: ${error.message}`);
        }
    });
}
function transferirOnuFibra(loginAntigoId, novoLoginId, novoContratoId) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Verificando existência de ONU (Fibra) atrelada ao login antigo (ID: ${loginAntigoId})...`);
        try {
            const fibraResp = yield makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                qtype: 'radpop_radio_cliente_fibra.id_login',
                query: loginAntigoId,
                oper: '=',
                rp: '1'
            });
            if (fibraResp && fibraResp.registros && fibraResp.registros.length > 0) {
                const fibra = fibraResp.registros[0];
                //console.log(`ONU encontrada (ID Fibra: ${fibra.id}). Transferindo para o novo login (ID: ${novoLoginId}) e contrato (ID: ${novoContratoId})...`);
                const payloadFibra = Object.assign(Object.assign({}, fibra), { id_login: novoLoginId, id_contrato: novoContratoId });
                const putResp = yield makeIxcRequest('PUT', `/radpop_radio_cliente_fibra/${fibra.id}`, payloadFibra, 'alterar');
                if (putResp && putResp.type === 'error') {
                    throw new Error(`IXC recusou a transferência da ONU: ${putResp.message}`);
                }
                //console.log(`ONU transferida com sucesso! Agora a fibra está vinculada ao novo login e contrato.`);
            }
            else {
                //console.log(`Nenhuma ONU de fibra encontrada para o login antigo.`);
            }
        }
        catch (error) {
            console.error(`Erro ao transferir vínculo da ONU de fibra: ${error.message}`);
        }
    });
}
function ativarContrato(contratoId) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Enviando comando para ativar o contrato ID: ${contratoId}...`);
        try {
            const resp = yield makeIxcRequest('POST', '/cliente_contrato_ativar_cliente', { id_contrato: contratoId });
            if (resp && resp.type === 'error') {
                throw new Error(resp.message);
            }
            //console.log(`Contrato ${contratoId} ativado com sucesso!`);
        }
        catch (error) {
            console.error(`Falha ao ativar o contrato ${contratoId}: ${error.message}`);
        }
    });
}
function cancelarContratoAntigo(contratoId) {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log(`Cancelando contrato antigo ID: ${contratoId}`);
        const payloadCancelamento = {
            status: 'C',
            status_internet: 'D',
            motivo_inclusao: 'C',
            obs: 'Cancelado via automação de Mudança de Titularidade.',
        };
        yield makeIxcRequest('PUT', `/cliente_contrato/${contratoId}`, payloadCancelamento, 'alterar');
        //console.log(`Contrato ${contratoId} cancelado com sucesso.`);
    });
}
router.post('/mudanca-titularidade', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _k = req.body, { contratoAntigoId, existingClientId, loginSelecionadoId, isTransferenciaParcial } = _k, clientData = __rest(_k, ["contratoAntigoId", "existingClientId", "loginSelecionadoId", "isTransferenciaParcial"]);
    const dataCadastro = getIxcDate();
    try {
        const { contratoAntigo, loginAntigo } = yield buscarDetalhesContratoELoginAntigo(contratoAntigoId, loginSelecionadoId);
        //console.log(`Buscando dados do cliente antigo ID: ${contratoAntigo.id_cliente}...`);
        const clienteOldResponse = yield makeIxcRequest('POST', '/cliente', { qtype: 'cliente.id', query: contratoAntigo.id_cliente, oper: '=' });
        let clienteAntigo = {};
        if (clienteOldResponse && clienteOldResponse.registros && clienteOldResponse.registros.length > 0) {
            clienteAntigo = clienteOldResponse.registros[0];
        }
        if (contratoAntigo.endereco_padrao_cliente === 'S') {
            clientData.cep = clienteAntigo.cep || '';
            clientData.endereco = clienteAntigo.endereco || '';
            clientData.numero = clienteAntigo.numero || '';
            clientData.bairro = clienteAntigo.bairro || '';
            clientData.cidade = clienteAntigo.cidade || '';
            clientData.uf = clienteAntigo.uf || '';
            clientData.complemento = clienteAntigo.complemento || '';
            clientData.bloco = clienteAntigo.bloco || '';
            clientData.apartamento = clienteAntigo.apartamento || '';
            clientData.referencia = clienteAntigo.referencia || '';
            clientData.id_condominio = clienteAntigo.id_condominio || '';
        }
        else {
            clientData.cep = contratoAntigo.cep || '';
            clientData.endereco = contratoAntigo.endereco || '';
            clientData.numero = contratoAntigo.numero || '';
            clientData.bairro = contratoAntigo.bairro || '';
            clientData.cidade = contratoAntigo.cidade || '';
            clientData.uf = contratoAntigo.uf || '';
            clientData.complemento = contratoAntigo.complemento || '';
            clientData.bloco = contratoAntigo.bloco || '';
            clientData.apartamento = contratoAntigo.apartamento || '';
            clientData.referencia = contratoAntigo.referencia || '';
            clientData.id_condominio = contratoAntigo.id_condominio || '';
        }
        clientData.id_filial = contratoAntigo.id_filial;
        clientData.id_vendedor = clientData.id_vendedor || contratoAntigo.id_vendedor || '45';
        let nomePlano = `ID ${clientData.id_plano_ixc}`;
        try {
            const planoInfo = yield makeIxcRequest('POST', `/vd_contratos`, { qtype: 'vd_contratos.id', query: clientData.id_plano_ixc, oper: '=' });
            if (planoInfo && planoInfo.registros && planoInfo.registros.length > 0) {
                nomePlano = planoInfo.registros[0].nome;
            }
        }
        catch (e) {
            console.warn(`Aviso: erro ao buscar plano.`);
        }
        clientData.nome_plano = nomePlano;
        let novoClienteId;
        if (existingClientId) {
            //console.log(`Mudança Titularidade: Atualizando Cliente existente ID ${existingClientId}`);
            novoClienteId = existingClientId;
            yield atualizarCliente(novoClienteId, clientData, dataCadastro);
        }
        else {
            //console.log(`Mudança Titularidade: Cadastrando Novo Cliente`);
            novoClienteId = yield cadastrarCliente(clientData, dataCadastro);
        }
        const novoContratoId = yield criarContrato(novoClienteId, clientData, dataCadastro, nomePlano);
        const idGrupoRadius = getGrupoRadiusPorPlano(clientData.id_plano_ixc) || '2006';
        const novoLoginId = yield transferirLoginPPPoE(loginAntigo, novoClienteId, novoContratoId, idGrupoRadius, dataCadastro, clientData);
        yield transferirOnuFibra(loginAntigo.id, novoLoginId, novoContratoId);
        //console.log(`Contrato antigo (ID: ${contratoAntigoId}) mantido. O Financeiro fará a validação de cancelamento via WFL.`);
        if (contratoAntigo.status === 'A') {
            //console.log(`O contrato antigo era 'Ativo'. Engatilhando ativação do novo contrato...`);
            yield ativarContrato(novoContratoId);
        }
        else {
            //console.log(`O contrato antigo possuía status '${contratoAntigo.status}'. O novo permanecerá como Pré-contrato (P).`);
        }
        const telefonesNovos = (clientData.whatsapp && clientData.whatsapp !== clientData.telefone_celular)
            ? `${clientData.telefone_celular} / ${clientData.whatsapp}`
            : clientData.telefone_celular;
        const dadosTransferencia = {
            oldClienteId: contratoAntigo.id_cliente,
            oldClienteNome: clienteAntigo.razao || 'Não informado',
            newClienteId: novoClienteId,
            newClienteNome: clientData.nome,
            newTelefones: telefonesNovos
        };
        const idFuncionarioIxc = yield obterIdFuncionarioIxc(clientData.usuario_intranet);
        //console.log(`Usuário logado: ${clientData.usuario_intranet || 'Desconhecido'} | ID Funcionário IXC mapeado: ${idFuncionarioIxc}`);
        const ticketAntigoId = yield abrirTicketProcesso46(loginAntigo.id_cliente, contratoAntigoId, loginAntigo.id, false, nomePlano, clientData, dadosTransferencia, idFuncionarioIxc, isTransferenciaParcial);
        const ticketNovoId = yield abrirTicketProcesso46(novoClienteId, novoContratoId, novoLoginId, true, nomePlano, clientData, dadosTransferencia, idFuncionarioIxc);
        //console.log("Iniciando rotina de desconexão forçada dos logins...");
        yield desconectarLoginPPPoE(loginAntigo.id);
        yield desconectarLoginPPPoE(novoLoginId);
        res.status(201).json({
            success: true,
            message: "Mudança de Titularidade concluída com sucesso!",
            clienteId: novoClienteId,
            contratoId: novoContratoId,
            loginId: novoLoginId,
            ticketId: ticketNovoId
        });
    }
    catch (error) {
        console.error('ERRO FATAL na Mudança de Titularidade:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}));
exports.default = router;
