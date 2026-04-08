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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/api/v5/agendamento.ts
var Express = require("express");
var axios_1 = require("axios");
var database_1 = require("../../../api/database");
var router = Express.Router();
var executeDb = function (query, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        database_1.LOCALHOST.query(query, params, function (err, results) {
            if (err)
                return reject(err);
            resolve(results);
        });
    });
};
var makeIxcRequest = function (method, endpoint, data) {
    if (data === void 0) { data = null; }
    return __awaiter(void 0, void 0, void 0, function () {
        var url, token, headers, response, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "".concat(process.env.IXC_API_URL, "/webservice/v1").concat(endpoint);
                    token = process.env.IXC_API_TOKEN;
                    headers = {
                        'Authorization': "Basic ".concat(token),
                        'Content-Type': 'application/json'
                    };
                    if (data && data.qtype) {
                        headers['ixcsoft'] = 'listar';
                        method = 'POST';
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, axios_1.default)({ method: method, url: url, headers: headers, data: data })];
                case 2:
                    response = _b.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_1 = _b.sent();
                    console.error("[IXC Err] ".concat(endpoint, ":"), ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) || error_1.message);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
};
router.get('/triagem/busca-cliente/:termo', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var termo, payloadBusca, cliResp, cliente, contratoResp, chamadosPendentes, osAbertas, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                termo = req.params.termo;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                payloadBusca = {
                    qtype: isNaN(Number(termo)) ? "cliente.razao" : "cliente.cnpj_cpf",
                    query: termo,
                    oper: isNaN(Number(termo)) ? "L" : "=",
                    page: "1",
                    rp: "5"
                };
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente', payloadBusca)];
            case 2:
                cliResp = _a.sent();
                if (!cliResp.registros || cliResp.registros.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: "Cliente não encontrado no IXC." })];
                }
                cliente = cliResp.registros[0];
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato', {
                        qtype: "cliente_contrato.id_cliente",
                        query: cliente.id,
                        oper: "=",
                        page: "1",
                        rp: "10"
                    })];
            case 3:
                contratoResp = _a.sent();
                return [4 /*yield*/, makeIxcRequest('POST', '/suporte', {
                        qtype: "suporte.id_cliente",
                        query: cliente.id,
                        oper: "=",
                        page: "1",
                        rp: "10"
                    })];
            case 4:
                chamadosPendentes = _a.sent();
                osAbertas = (chamadosPendentes.registros || []).filter(function (os) { return os.status === 'A' || os.status === 'EN'; });
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
                return [3 /*break*/, 6];
            case 5:
                error_2 = _a.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.get('/triagem/busca-cliente/:termo', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var termo, payloadBusca, cliResp, cliente, contratoResp, chamadosPendentes, osAbertas, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                termo = req.params.termo;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                payloadBusca = {
                    qtype: isNaN(Number(termo)) ? "cliente.razao" : "cliente.cnpj_cpf",
                    query: termo,
                    oper: isNaN(Number(termo)) ? "L" : "=",
                    page: "1",
                    rp: "5"
                };
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente', payloadBusca)];
            case 2:
                cliResp = _a.sent();
                if (!cliResp.registros || cliResp.registros.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: "Cliente não encontrado no IXC." })];
                }
                cliente = cliResp.registros[0];
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato', {
                        qtype: "cliente_contrato.id_cliente",
                        query: cliente.id,
                        oper: "=",
                        page: "1",
                        rp: "10"
                    })];
            case 3:
                contratoResp = _a.sent();
                return [4 /*yield*/, makeIxcRequest('POST', '/suporte', {
                        qtype: "suporte.id_cliente",
                        query: cliente.id,
                        oper: "=",
                        page: "1",
                        rp: "10"
                    })];
            case 4:
                chamadosPendentes = _a.sent();
                osAbertas = (chamadosPendentes.registros || []).filter(function (os) { return os.status === 'A' || os.status === 'EN'; });
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
                return [3 /*break*/, 6];
            case 5:
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.get('/detalhes-os/:id_ticket', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_ticket, origem, ticketResp, osResp, idAtendimentoPai, ticket, clienteResp, cliente, tipoServico, enderecoCompleto, tipoImovel, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id_ticket = req.params.id_ticket;
                origem = req.query.origem;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, makeIxcRequest('POST', '/su_ticket', {
                        qtype: 'su_ticket.id', query: id_ticket, oper: '=', rp: '1'
                    })];
            case 2:
                ticketResp = _a.sent();
                if (!(!ticketResp.registros || ticketResp.registros.length === 0)) return [3 /*break*/, 5];
                return [4 /*yield*/, makeIxcRequest('POST', '/su_oss_chamado', {
                        qtype: 'su_oss_chamado.id', query: id_ticket, oper: '=', rp: '1'
                    })];
            case 3:
                osResp = _a.sent();
                if (!(osResp.registros && osResp.registros.length > 0)) return [3 /*break*/, 5];
                idAtendimentoPai = osResp.registros[0].id_ticket;
                return [4 /*yield*/, makeIxcRequest('POST', '/su_ticket', {
                        qtype: 'su_ticket.id', query: idAtendimentoPai, oper: '=', rp: '1'
                    })];
            case 4:
                ticketResp = _a.sent();
                _a.label = 5;
            case 5:
                if (!ticketResp.registros || ticketResp.registros.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: "Ordem de Serviço ou Atendimento não encontrado no IXC." })];
                }
                ticket = ticketResp.registros[0];
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente', {
                        qtype: 'cliente.id', query: ticket.id_cliente, oper: '=', rp: '1'
                    })];
            case 6:
                clienteResp = _a.sent();
                cliente = clienteResp.registros[0] || {};
                tipoServico = origem === 'venda' ? 'INSTALAÇÃO' : 'SUPORTE TÉCNICO';
                enderecoCompleto = "".concat(cliente.endereco || '', " ").concat(cliente.complemento || '').toUpperCase();
                tipoImovel = (enderecoCompleto.includes('APTO') || enderecoCompleto.includes('BLOCO') || enderecoCompleto.includes('CONDOMINIO')) ? 'PRÉDIO' : 'CASA';
                res.json({
                    id_ticket: ticket.id,
                    cliente_id: cliente.id,
                    nome: cliente.razao,
                    endereco: "".concat(cliente.endereco, ", ").concat(cliente.numero, " - ").concat(cliente.bairro),
                    cidade: cliente.cidade,
                    mensagem: ticket.menssagem || 'Sem descrição.',
                    tipo_servico: tipoServico,
                    tipo_imovel: tipoImovel
                });
                return [3 /*break*/, 8];
            case 7:
                error_4 = _a.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
router.get('/vagas', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, municipio, agendamentos, VAGAS_MAXIMAS, vagasMatutino_1, vagasVespertino_1, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, data = _a.data, municipio = _a.municipio;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, executeDb("SELECT turno, COUNT(*) as qtd \n             FROM ivp_agenda_os \n             WHERE data_agendamento = ? AND municipio_base = ? \n             GROUP BY turno", [data, municipio])];
            case 2:
                agendamentos = _b.sent();
                VAGAS_MAXIMAS = 5;
                vagasMatutino_1 = VAGAS_MAXIMAS;
                vagasVespertino_1 = VAGAS_MAXIMAS;
                agendamentos.forEach(function (row) {
                    if (row.turno === 'MATUTINO')
                        vagasMatutino_1 -= row.qtd;
                    if (row.turno === 'VESPERTINO')
                        vagasVespertino_1 -= row.qtd;
                });
                res.json({
                    matutino: { vagas: Math.max(0, vagasMatutino_1), disponivel: vagasMatutino_1 > 0 },
                    vespertino: { vagas: Math.max(0, vagasVespertino_1), disponivel: vagasVespertino_1 > 0 }
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _b.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post('/confirmar', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id_ticket, cliente_id, municipio, tipo_servico, tipo_imovel, data_agendamento, turno, aceita_encaixe, dataFormatada, msgInteracao, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id_ticket = _a.id_ticket, cliente_id = _a.cliente_id, municipio = _a.municipio, tipo_servico = _a.tipo_servico, tipo_imovel = _a.tipo_imovel, data_agendamento = _a.data_agendamento, turno = _a.turno, aceita_encaixe = _a.aceita_encaixe;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, executeDb("INSERT INTO ivp_agenda_os \n            (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel, municipio_base, aceita_encaixe, data_agendamento, turno, status_interno, criado_por)\n            VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, 'AGUARDANDO_ATRIBUICAO', 'ATENDIMENTO')", [id_ticket, cliente_id, tipo_servico, tipo_imovel, municipio, aceita_encaixe ? 1 : 0, data_agendamento, turno])];
            case 2:
                _b.sent();
                dataFormatada = data_agendamento.split('-').reverse().join('/');
                msgInteracao = "AGENDADO VIA INTRANET\nData: ".concat(dataFormatada, "\nTurno: ").concat(turno, "\nAceita Encaixe: ").concat(aceita_encaixe ? 'SIM' : 'NÃO');
                res.json({ success: true, message: "Agendamento confirmado com sucesso!" });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _b.sent();
                res.status(500).json({ error: error_6.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
