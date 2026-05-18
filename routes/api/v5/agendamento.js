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
// routes/api/v5/agendamento.ts
const Express = require("express");
const axios_1 = require("axios");
const database_1 = require("../../../api/database");
const router = Express.Router();
const executeDb = (query, params = []) => {
    return new Promise((resolve, reject) => {
        database_1.LOCALHOST.query(query, params, (err, results) => {
            if (err)
                return reject(err);
            resolve(results);
        });
    });
};
const makeIxcRequest = (method, endpoint, data = null) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN;
    const headers = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };
    if (data && data.qtype) {
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
router.get('/triagem/busca-cliente/:termo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { termo } = req.params;
    try {
        const payloadBusca = {
            qtype: isNaN(Number(termo)) ? "cliente.razao" : "cliente.cnpj_cpf",
            query: termo,
            oper: isNaN(Number(termo)) ? "L" : "=",
            page: "1",
            rp: "5"
        };
        const cliResp = yield makeIxcRequest('POST', '/cliente', payloadBusca);
        if (!cliResp.registros || cliResp.registros.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado no IXC." });
        }
        const cliente = cliResp.registros[0];
        const contratoResp = yield makeIxcRequest('POST', '/cliente_contrato', {
            qtype: "cliente_contrato.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });
        const chamadosPendentes = yield makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });
        const osAbertas = (chamadosPendentes.registros || []).filter((os) => os.status === 'A' || os.status === 'EN');
        res.json({
            cliente: {
                id: cliente.id,
                nome: cliente.razao,
                documento: cliente.cnpj_cpf,
                endereco: cliente.endereco,
                numero: cliente.numero,
                bairro: cliente.bairro,
                cidade: cliente.cidade
            },
            contratos: contratoResp.registros || [],
            os_abertas: osAbertas
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/triagem/busca-cliente/:termo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { termo } = req.params;
    try {
        const payloadBusca = {
            qtype: isNaN(Number(termo)) ? "cliente.razao" : "cliente.cnpj_cpf",
            query: termo,
            oper: isNaN(Number(termo)) ? "L" : "=",
            page: "1",
            rp: "5"
        };
        const cliResp = yield makeIxcRequest('POST', '/cliente', payloadBusca);
        if (!cliResp.registros || cliResp.registros.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado no IXC." });
        }
        const cliente = cliResp.registros[0];
        const contratoResp = yield makeIxcRequest('POST', '/cliente_contrato', {
            qtype: "cliente_contrato.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });
        const chamadosPendentes = yield makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });
        const osAbertas = (chamadosPendentes.registros || []).filter((os) => os.status === 'A' || os.status === 'EN');
        res.json({
            cliente: {
                id: cliente.id,
                nome: cliente.razao,
                documento: cliente.cnpj_cpf,
                endereco: cliente.endereco,
                numero: cliente.numero,
                bairro: cliente.bairro,
                cidade: cliente.cidade
            },
            contratos: contratoResp.registros || [],
            os_abertas: osAbertas
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/detalhes-os/:id_ticket', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_ticket } = req.params;
    const { origem } = req.query;
    try {
        let ticketResp = yield makeIxcRequest('POST', '/su_ticket', {
            qtype: 'su_ticket.id', query: id_ticket, oper: '=', rp: '1'
        });
        if (!ticketResp.registros || ticketResp.registros.length === 0) {
            const osResp = yield makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id', query: id_ticket, oper: '=', rp: '1'
            });
            if (osResp.registros && osResp.registros.length > 0) {
                const idAtendimentoPai = osResp.registros[0].id_ticket;
                ticketResp = yield makeIxcRequest('POST', '/su_ticket', {
                    qtype: 'su_ticket.id', query: idAtendimentoPai, oper: '=', rp: '1'
                });
            }
        }
        if (!ticketResp.registros || ticketResp.registros.length === 0) {
            return res.status(404).json({ error: "Ordem de Serviço ou Atendimento não encontrado no IXC." });
        }
        const ticket = ticketResp.registros[0];
        const clienteResp = yield makeIxcRequest('POST', '/cliente', {
            qtype: 'cliente.id', query: ticket.id_cliente, oper: '=', rp: '1'
        });
        const cliente = clienteResp.registros[0] || {};
        const tipoServico = origem === 'venda' ? 'INSTALAÇÃO' : 'SUPORTE TÉCNICO';
        const enderecoCompleto = `${cliente.endereco || ''} ${cliente.complemento || ''}`.toUpperCase();
        const tipoImovel = (enderecoCompleto.includes('APTO') || enderecoCompleto.includes('BLOCO') || enderecoCompleto.includes('CONDOMINIO')) ? 'PRÉDIO' : 'CASA';
        res.json({
            id_ticket: ticket.id,
            cliente_id: cliente.id,
            nome: cliente.razao,
            endereco: `${cliente.endereco}, ${cliente.numero} - ${cliente.bairro}`,
            cidade: cliente.cidade,
            mensagem: ticket.menssagem || 'Sem descrição.',
            tipo_servico: tipoServico,
            tipo_imovel: tipoImovel
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/vagas', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, municipio } = req.query;
    try {
        const agendamentos = yield executeDb(`SELECT turno, COUNT(*) as qtd 
             FROM ivp_agenda_os 
             WHERE data_agendamento = ? AND municipio_base = ? 
             GROUP BY turno`, [data, municipio]);
        const VAGAS_MAXIMAS = 5;
        let vagasMatutino = VAGAS_MAXIMAS;
        let vagasVespertino = VAGAS_MAXIMAS;
        agendamentos.forEach((row) => {
            if (row.turno === 'MATUTINO')
                vagasMatutino -= row.qtd;
            if (row.turno === 'VESPERTINO')
                vagasVespertino -= row.qtd;
        });
        res.json({
            matutino: { vagas: Math.max(0, vagasMatutino), disponivel: vagasMatutino > 0 },
            vespertino: { vagas: Math.max(0, vagasVespertino), disponivel: vagasVespertino > 0 }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/confirmar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_ticket, cliente_id, municipio, tipo_servico, tipo_imovel, data_agendamento, turno, aceita_encaixe } = req.body;
    try {
        yield executeDb(`INSERT INTO ivp_agenda_os 
            (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel, municipio_base, aceita_encaixe, data_agendamento, turno, status_interno, criado_por)
            VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, 'AGUARDANDO_ATRIBUICAO', 'ATENDIMENTO')`, [id_ticket, cliente_id, tipo_servico, tipo_imovel, municipio, aceita_encaixe ? 1 : 0, data_agendamento, turno]);
        const dataFormatada = data_agendamento.split('-').reverse().join('/');
        const msgInteracao = `AGENDADO VIA INTRANET\nData: ${dataFormatada}\nTurno: ${turno}\nAceita Encaixe: ${aceita_encaixe ? 'SIM' : 'NÃO'}`;
        res.json({ success: true, message: "Agendamento confirmado com sucesso!" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
