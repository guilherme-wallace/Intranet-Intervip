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
// routes/api/v5/abertura-OS.ts
const Express = require("express");
const axios_1 = require("axios");
const database_1 = require("../../../api/database");
const router = Express.Router();
const makeIxcRequest = (method, endpoint, data = null, operationType = null) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN;
    const headers = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };
    if (operationType) {
        headers['ixcsoft'] = operationType;
    }
    else if (data && data.qtype) {
        headers['ixcsoft'] = 'listar';
        method = 'POST';
    }
    try {
        const response = yield (0, axios_1.default)({ method, url, headers, data });
        return response.data;
    }
    catch (error) {
        console.error(`[IXC Err] ${endpoint}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
});
const getIxcDate = () => {
    const now = new Date();
    now.setHours(now.getHours() - 3);
    return now.toISOString().replace('T', ' ').substring(0, 19);
};
function obterIdFuncionarioIxc(usuario_intranet) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!usuario_intranet)
            return "138";
        try {
            return yield new Promise((resolve, reject) => {
                database_1.LOCALHOST.query('SELECT id_funcionario_ixc FROM usuarios_intranet WHERE usuario = ? AND ativo = 1', [usuario_intranet], (err, results) => {
                    if (err) {
                        return resolve("138");
                    }
                    if (results && results.length > 0 && results[0].id_funcionario_ixc) {
                        resolve(results[0].id_funcionario_ixc.toString());
                    }
                    else {
                        resolve("138");
                    }
                });
            });
        }
        catch (error) {
            console.error("Erro geral ao consultar id_funcionario_ixc no banco local:", error);
        }
        return "138";
    });
}
router.get('/busca-cliente/:termo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { termo } = req.params;
    try {
        const termoLimpo = termo.replace(/[^\d]/g, '');
        let clienteEncontrado = null;
        if (termoLimpo.length === 11 || termoLimpo.length === 14) {
            let queryFormatada = termoLimpo;
            if (termoLimpo.length === 11) {
                queryFormatada = termoLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            }
            else {
                queryFormatada = termoLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
            }
            const respCpf = yield makeIxcRequest('POST', '/cliente', {
                qtype: "cliente.cnpj_cpf", query: queryFormatada, oper: "=", page: "1", rp: "1"
            });
            if (respCpf.registros && respCpf.registros.length > 0) {
                clienteEncontrado = respCpf.registros[0];
            }
        }
        if (!clienteEncontrado && termoLimpo.length > 0) {
            const respId = yield makeIxcRequest('POST', '/cliente', {
                qtype: "cliente.id", query: termoLimpo, oper: "=", page: "1", rp: "1"
            });
            if (respId.registros && respId.registros.length > 0) {
                clienteEncontrado = respId.registros[0];
            }
        }
        if (!clienteEncontrado) {
            return res.status(404).json({ error: "Cliente não encontrado no IXC." });
        }
        const conResp = yield makeIxcRequest('POST', '/cliente_contrato', {
            qtype: 'cliente_contrato.id_cliente', query: String(clienteEncontrado.id), oper: '=', page: '1', rp: '50'
        });
        const contratosAtivos = (conResp.registros || []).filter((c) => c.status !== 'C' && c.status !== 'I');
        const contratoPrincipal = contratosAtivos.length > 0 ? contratosAtivos[0] : (conResp.registros ? conResp.registros[0] : null);
        res.json({
            id: clienteEncontrado.id,
            nome: clienteEncontrado.razao,
            documento: clienteEncontrado.cnpj_cpf,
            telefones: [clienteEncontrado.telefone_celular, clienteEncontrado.telefone_residencial].filter(f => f).join(' / ') || 'Sem telefone',
            contrato_id: contratoPrincipal ? contratoPrincipal.id : null,
            endereco: contratoPrincipal ? `${contratoPrincipal.endereco}, ${contratoPrincipal.numero} - ${contratoPrincipal.bairro}` : 'Endereço não encontrado'
        });
    }
    catch (error) {
        console.error("Erro ao buscar cliente:", error);
        res.status(500).json({ error: error.message });
    }
}));
router.post('/criar-os', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cliente_id, contrato_id, id_assunto, id_departamento, id_processo, observacao, titulo } = req.body;
    console.log("\n=== [DEBUG] INICIANDO CRIAÇÃO DE CHAMADO (IXC) ===");
    console.log("1. Dados brutos recebidos do Frontend:", req.body);
    if (!cliente_id || !id_assunto || !observacao || !id_processo) {
        console.error("-> Erro: Dados incompletos. Faltando assunto ou processo.");
        return res.status(400).json({ error: "Dados incompletos. Verifique se o assunto possui um processo vinculado no IXC." });
    }
    try {
        const payloadTicket = {
            id_cliente: cliente_id,
            titulo: titulo || "Atendimento via Intranet",
            id_assunto: id_assunto,
            id_ticket_setor: id_departamento || "1",
            id_wfl_processo: id_processo,
            origem_endereco: "CC",
            tipo: "C",
            status: "A",
            su_status: "N",
            prioridade: "M",
            su_ticket_origem: "I",
            menssagem: observacao,
            mensagem: observacao
        };
        if (contrato_id && String(contrato_id).trim() !== "") {
            payloadTicket.id_contrato = contrato_id;
        }
        console.log("2. Payload final montado:", payloadTicket);
        const ixcResp = yield makeIxcRequest('POST', '/su_ticket', payloadTicket, 'incluir');
        console.log("3. Resposta recebida do IXC:", ixcResp);
        if (ixcResp.type === 'error') {
            throw new Error(ixcResp.message || "Erro desconhecido retornado pelo IXC");
        }
        res.json({ success: true, ticket_id: ixcResp.id, message: "Atendimento criado com sucesso no IXC!" });
        console.log("=== CHAMADO CRIADO COM SUCESSO ===\n");
    }
    catch (error) {
        console.error("4. [ERRO FATAL] Falha ao criar OS no IXC:");
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
}));
router.get('/assuntos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const resp = yield makeIxcRequest('POST', '/su_oss_assunto', {
            qtype: 'su_oss_assunto.ativo',
            query: 'S',
            oper: '=',
            page: '1',
            rp: '1000',
            sortname: 'assunto',
            sortorder: 'asc'
        });
        const assuntosAtivos = (resp.registros || []).filter((a) => a.ativo === 'S');
        res.json(assuntosAtivos);
    }
    catch (error) {
        console.error("Erro ao buscar assuntos:", error.message);
        res.status(500).json({ error: error.message });
    }
}));
router.get('/tarefas/:id_processo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id_processo } = req.params;
        const resp = yield makeIxcRequest('POST', '/wfl_tarefa', {
            qtype: 'wfl_tarefa.id_processo',
            query: id_processo,
            oper: '=',
            page: '1',
            rp: '1000',
            sortname: 'wfl_tarefa.id',
            sortorder: 'asc'
        });
        const tarefasSeq2 = (resp.registros || []).filter((t) => t.sequencia === '2' && t.ativo === 'S');
        res.json(tarefasSeq2);
    }
    catch (error) {
        console.error("Erro ao buscar tarefas:", error.message);
        res.status(500).json({ error: error.message });
    }
}));
router.post('/avancar-tarefa', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticket_id, id_tarefa, usuario_intranet } = req.body;
    try {
        console.log(`\n=== AVANÇANDO TAREFA DO TICKET ${ticket_id} ===`);
        const idTecnicoIxc = yield obterIdFuncionarioIxc(usuario_intranet);
        const osResponse = yield makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_ticket', query: String(ticket_id), oper: '=', rp: '20', sortname: 'su_oss_chamado.id', sortorder: 'desc'
        });
        if (!osResponse || !osResponse.registros || osResponse.registros.length === 0) {
            throw new Error(`Nenhuma OS encontrada dentro do ticket ${ticket_id}.`);
        }
        const osAberta = osResponse.registros.find((os) => os.status === 'A' || os.status === 'EN');
        if (!osAberta) {
            throw new Error(`Nenhuma OS aberta foi encontrada no ticket ${ticket_id}.`);
        }
        console.log(`-> Fechando OS ${osAberta.id} com o Técnico ID: ${idTecnicoIxc}`);
        const dataHoraAtual = getIxcDate();
        const dataAtual = dataHoraAtual.split(' ')[0];
        const payloadFechamento = {
            "id_chamado": osAberta.id,
            "gera_comissao_aux": "N",
            "data_inicio": dataHoraAtual,
            "data_final": dataHoraAtual,
            "id_resposta": "",
            "mensagem": "Atendimento triado e encaminhado via Intranet Hub.",
            "id_tecnico": idTecnicoIxc,
            "id_equipe": "",
            "gera_comissao": "N",
            "status": "F",
            "data": dataAtual,
            "id_evento": "",
            "id_su_diagnostico": "",
            "justificativa_sla_atrasado": "",
            "latitude": "",
            "longitude": "",
            "gps_time": "",
            "id_processo": osAberta.id_wfl_processo,
            "id_tarefa_atual": osAberta.id_wfl_tarefa,
            "eh_tarefa_decisao": "N",
            "sequencia_atual": "",
            "proxima_sequencia_forcada": "",
            "finaliza_processo_aux": "N",
            "id_evento_status": "",
            "id_proxima_tarefa": id_tarefa,
            "id_proxima_tarefa_aux": ""
        };
        const respWfl = yield makeIxcRequest('POST', '/su_oss_chamado_fechar', payloadFechamento, 'incluir');
        if (respWfl && respWfl.type === 'error') {
            throw new Error(`Erro no motor do IXC: ${respWfl.message.replace(/<br \/>/g, ' - ')}`);
        }
        console.log(`=== SUCESSO: OS MOVIDA PARA A PRÓXIMA ETAPA ===\n`);
        res.json({ success: true });
    }
    catch (error) {
        console.error("Erro ao avançar tarefa:", error.message);
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
