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
const router = Express.Router();
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
// Rota 1: Buscar o cliente para a Triagem
router.get('/busca-cliente/:termo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { termo } = req.params;
    try {
        // Busca o cliente pelo CPF/CNPJ, Razão Social ou ID
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
        // Busca os contratos do cliente
        const contratoResp = yield makeIxcRequest('POST', '/cliente_contrato', {
            qtype: "cliente_contrato.id_cliente", query: cliente.id, oper: "=", page: "1", rp: "10"
        });
        // Verifica se há chamados pendentes (Evitar duplicidade)
        const chamadosPendentes = yield makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente", query: cliente.id, oper: "=", page: "1", rp: "10"
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
// Rota 2: Gerar o Ticket de Suporte no IXC
router.post('/gerar-os', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cliente_id, contrato_id, motivo, observacao } = req.body;
    if (!cliente_id || !motivo) {
        return res.status(400).json({ error: "Dados incompletos para abrir o chamado." });
    }
    try {
        // IDs Padrões da sua empresa no IXC (Você precisará ajustar de acordo com o seu painel IXC)
        // Por exemplo: id_assunto 1 = "Lentidão", id_departamento 2 = "Suporte N1"
        // Como não temos os IDs reais, usarei variáveis genéricas que você pode mapear depois.
        const payloadTicket = {
            id_cliente: cliente_id,
            id_contrato: contrato_id || "",
            id_assunto: "1",
            id_departamento: "1",
            menssagem: `Motivo: ${motivo}\n\nObservações da Triagem:\n${observacao}`,
            status: "A",
            su_ticket_origem: "I",
            origem_endereco: "C" // "C" = Endereço do Cliente
        };
        const ixcResp = yield makeIxcRequest('POST', '/su_ticket', payloadTicket);
        if (ixcResp.type === 'error') {
            throw new Error(ixcResp.message);
        }
        // Retorna o ID gerado pelo IXC para o Frontend redirecionar
        res.json({ success: true, id_ticket: ixcResp.id });
    }
    catch (error) {
        console.error("Erro ao gerar OS:", error.message);
        res.status(500).json({ error: "Falha ao gerar OS no IXC." });
    }
}));
exports.default = router;
