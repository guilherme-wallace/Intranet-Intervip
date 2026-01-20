"use strict";
// routes/api/v5/soc.ts
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
var Express = require("express");
var database_1 = require("../../../api/database");
var axios_1 = require("axios");
var router = Express.Router();
router.get('/eventos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var QUERY;
    return __generator(this, function (_a) {
        QUERY = "SELECT * FROM soc_wanguard_report ORDER BY data_evento DESC LIMIT 100";
        database_1.LOCALHOST.query(QUERY, function (error, results) {
            if (error) {
                console.error("Erro SQL ao listar:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json(results);
        });
        return [2 /*return*/];
    });
}); });
router.post('/salvar', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, id_wanguard, data_evento, ip_interno, cliente_nome, cliente_id_ixc, login, trafego_upload, trafego_download, equipamento, analise, acao_tomada, observacoes, status, usuario_responsavel, QUERY, infoIxc, registro, respCliente, e_1, CHECK_ID_WANGUARD;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.body, id = _a.id, id_wanguard = _a.id_wanguard, data_evento = _a.data_evento, ip_interno = _a.ip_interno, cliente_nome = _a.cliente_nome, cliente_id_ixc = _a.cliente_id_ixc, login = _a.login, trafego_upload = _a.trafego_upload, trafego_download = _a.trafego_download, equipamento = _a.equipamento, analise = _a.analise, acao_tomada = _a.acao_tomada, observacoes = _a.observacoes, status = _a.status, usuario_responsavel = _a.usuario_responsavel;
                if (id) {
                    QUERY = "UPDATE soc_wanguard_report SET \n            equipamento = ?, analise_preliminar = ?, acao_tomada = ?, observacoes = ?, status = ?, login = ?\n            WHERE id = ?";
                    database_1.LOCALHOST.query(QUERY, [equipamento, analise, acao_tomada, observacoes, status, login, id], function (error) {
                        if (error)
                            return res.status(500).json({ error: error.message });
                        res.json({ success: true, message: 'Evento atualizado' });
                    });
                    return [2 /*return*/];
                }
                if (!(!cliente_id_ixc && ip_interno)) return [3 /*break*/, 6];
                _d.label = 1;
            case 1:
                _d.trys.push([1, 5, , 6]);
                return [4 /*yield*/, consultarIxcPorIp(ip_interno)];
            case 2:
                infoIxc = _d.sent();
                if (!(infoIxc && infoIxc.total > 0)) return [3 /*break*/, 4];
                registro = infoIxc.registros[0];
                cliente_id_ixc = registro.id_cliente;
                login = registro.login;
                return [4 /*yield*/, axios_1.default.post("".concat(process.env.IXC_API_URL, "/webservice/v1/cliente"), {
                        qtype: "cliente.id", query: cliente_id_ixc, oper: "=", rp: "1"
                    }, {
                        headers: { 'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN), 'ixcsoft': 'listar' }
                    })];
            case 3:
                respCliente = _d.sent();
                if (((_c = (_b = respCliente.data) === null || _b === void 0 ? void 0 : _b.registros) === null || _c === void 0 ? void 0 : _c.length) > 0) {
                    cliente_nome = respCliente.data.registros[0].razao;
                }
                _d.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                e_1 = _d.sent();
                console.error("Erro identificação automática:", e_1);
                return [3 /*break*/, 6];
            case 6:
                CHECK_ID_WANGUARD = "SELECT id FROM soc_wanguard_report WHERE id_wanguard = ? LIMIT 1";
                database_1.LOCALHOST.query(CHECK_ID_WANGUARD, [id_wanguard], function (err, idExists) {
                    if (err)
                        return res.status(500).json({ error: err.message });
                    if (idExists && idExists.length > 0 && id_wanguard !== null) {
                        return res.json({ success: true, message: 'Duplicata ignorada.' });
                    }
                    var CHECK_OPEN = "SELECT id, qtd_anomalias, alerta_ixc FROM soc_wanguard_report \n                            WHERE ip_interno = ? AND cliente_id_ixc = ? AND status != 'Conclu\u00EDdo' \n                            ORDER BY id DESC LIMIT 1";
                    database_1.LOCALHOST.query(CHECK_OPEN, [ip_interno, cliente_id_ixc], function (err, results) {
                        if (err)
                            return res.status(500).json({ error: err.message });
                        if (results && results.length > 0) {
                            var regExistente_1 = results[0];
                            var UPDATE_INC = "UPDATE soc_wanguard_report SET \n                                    qtd_anomalias = qtd_anomalias + 1,\n                                    trafego_upload = ?, trafego_download = ?, id_wanguard = ?\n                                    WHERE id = ?";
                            database_1.LOCALHOST.query(UPDATE_INC, [trafego_upload, trafego_download, id_wanguard, regExistente_1.id], function (e) {
                                if (e)
                                    return res.status(500).json({ error: e.message });
                                if (regExistente_1.alerta_ixc === 'Não' && cliente_id_ixc) {
                                    processarAlertaIxc(regExistente_1.id, cliente_id_ixc);
                                }
                                res.json({ success: true, message: 'Quantidade incrementada.' });
                            });
                        }
                        else {
                            var INSERT_SQL = "INSERT INTO soc_wanguard_report \n                    (id_wanguard, data_evento, ip_interno, cliente_nome, cliente_id_ixc, login, trafego_upload, trafego_download, status, analise_preliminar, usuario_responsavel, qtd_anomalias, equipamento, acao_tomada, observacoes) \n                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)";
                            var statusFinal = status || 'Pendente';
                            database_1.LOCALHOST.query(INSERT_SQL, [
                                id_wanguard, data_evento, ip_interno, cliente_nome, cliente_id_ixc, login,
                                trafego_upload, trafego_download, statusFinal, analise, usuario_responsavel,
                                equipamento, acao_tomada, observacoes
                            ], function (e, r) {
                                if (e)
                                    return res.status(500).json({ error: e.message });
                                if (cliente_id_ixc) {
                                    processarAlertaIxc(r.insertId, cliente_id_ixc);
                                }
                                res.json({ success: true, id: r.insertId });
                            });
                        }
                    });
                });
                return [2 /*return*/];
        }
    });
}); });
router.delete('/excluir/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, QUERY;
    return __generator(this, function (_a) {
        id = req.params.id;
        QUERY = "DELETE FROM soc_wanguard_report WHERE id = ?";
        database_1.LOCALHOST.query(QUERY, [id], function (error) {
            if (error) {
                console.error("Erro SQL ao excluir:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json({ success: true, message: 'Registro excluído com sucesso' });
        });
        return [2 /*return*/];
    });
}); });
var consultarIxcPorIp = function (ip) { return __awaiter(void 0, void 0, void 0, function () {
    var url, token, payload, response;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = "".concat(process.env.IXC_API_URL, "/webservice/v1/radusuarios");
                token = process.env.IXC_API_TOKEN;
                payload = {
                    qtype: "radusuarios.ip",
                    query: ip,
                    oper: "=",
                    page: "1",
                    rp: "1"
                };
                return [4 /*yield*/, axios_1.default.post(url, payload, {
                        headers: {
                            'Authorization': "Basic ".concat(token),
                            'ixcsoft': 'listar',
                            'Content-Type': 'application/json'
                        }
                    })];
            case 1:
                response = _a.sent();
                return [2 /*return*/, response.data];
        }
    });
}); };
router.get('/buscar-cliente-ip/:ip', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ip, urlBase, headers, respRad, registroRad, idCliente, loginEncontrado, respCliente, nomeCliente, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ip = req.params.ip;
                urlBase = "".concat(process.env.IXC_API_URL, "/webservice/v1");
                headers = {
                    'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN),
                    'ixcsoft': 'listar',
                    'Content-Type': 'application/json'
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, axios_1.default.post("".concat(urlBase, "/radusuarios"), {
                        qtype: "radusuarios.ip",
                        query: ip,
                        oper: "=",
                        rp: "1"
                    }, { headers: headers })];
            case 2:
                respRad = _a.sent();
                if (!respRad.data || respRad.data.total <= 0) {
                    return [2 /*return*/, res.status(404).json({ message: "IP não encontrado" })];
                }
                registroRad = respRad.data.registros[0];
                idCliente = registroRad.id_cliente;
                loginEncontrado = registroRad.login;
                return [4 /*yield*/, axios_1.default.post("".concat(urlBase, "/cliente"), {
                        qtype: "cliente.id",
                        query: idCliente,
                        oper: "=",
                        rp: "1"
                    }, { headers: headers })];
            case 3:
                respCliente = _a.sent();
                nomeCliente = "Nome não encontrado";
                if (respCliente.data && respCliente.data.total > 0) {
                    nomeCliente = respCliente.data.registros[0].razao;
                }
                res.json({
                    cliente_id: idCliente,
                    cliente_nome: nomeCliente,
                    login: loginEncontrado
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                console.error("Erro IXC:", error_1.message);
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get('/equipamentos-lista', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var QUERY;
    return __generator(this, function (_a) {
        QUERY = "SELECT id_equipamento, marca, modelo FROM equipamentos_rede ORDER BY marca, modelo ASC";
        database_1.LOCALHOST.query(QUERY, function (error, results) {
            if (error) {
                console.error("Erro ao buscar equipamentos:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json(results);
        });
        return [2 /*return*/];
    });
}); });
router.get('/relatorio-consumo/:loginPPPoE', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var loginPPPoE, urlBase, headers, respId, idLoginNumerico, respConsumo, registros, totalDownload_1, totalUpload_1, dadosFormatados, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                loginPPPoE = req.params.loginPPPoE;
                urlBase = "".concat(process.env.IXC_API_URL, "/webservice/v1");
                headers = {
                    'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN),
                    'ixcsoft': 'listar',
                    'Content-Type': 'application/json'
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, axios_1.default.post("".concat(urlBase, "/radusuarios"), {
                        qtype: "radusuarios.login",
                        query: loginPPPoE,
                        oper: "=",
                        rp: "1"
                    }, { headers: headers })];
            case 2:
                respId = _a.sent();
                if (!respId.data || respId.data.total <= 0) {
                    return [2 /*return*/, res.status(404).json({ message: "Login não encontrado no IXC." })];
                }
                idLoginNumerico = respId.data.registros[0].id;
                return [4 /*yield*/, axios_1.default.post("".concat(urlBase, "/radusuarios_consumo_d"), {
                        qtype: "radusuarios_consumo_d.id_login",
                        query: idLoginNumerico,
                        oper: "=",
                        page: "1",
                        rp: "15",
                        sortname: "radusuarios_consumo_d.id",
                        sortorder: "desc"
                    }, { headers: headers })];
            case 3:
                respConsumo = _a.sent();
                registros = respConsumo.data.registros || [];
                totalDownload_1 = 0;
                totalUpload_1 = 0;
                dadosFormatados = registros.map(function (reg) {
                    var down = parseFloat(reg.consumo || 0);
                    var up = parseFloat(reg.consumo_upload || 0);
                    totalDownload_1 += down;
                    totalUpload_1 += up;
                    return {
                        data: reg.data,
                        download_bytes: down,
                        upload_bytes: up
                    };
                });
                res.json({
                    historico: dadosFormatados,
                    total_download: totalDownload_1,
                    total_upload: totalUpload_1
                });
                return [3 /*break*/, 5];
            case 4:
                error_2 = _a.sent();
                console.error("Erro ao buscar consumo:", error_2.message);
                res.status(500).json({ error: "Falha na comunicação com o IXC" });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
var processarAlertaIxc = function (idReportLocal, idClienteIxc) { return __awaiter(void 0, void 0, void 0, function () {
    var urlBase, headersListar, headersEditar, respGet, clienteDados, mensagemAlerta, alertaAtual, UPDATE_LOCAL_1, novoAlerta, UPDATE_LOCAL, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!idClienteIxc)
                    return [2 /*return*/];
                urlBase = "".concat(process.env.IXC_API_URL, "/webservice/v1");
                headersListar = {
                    'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN),
                    'ixcsoft': 'listar',
                    'Content-Type': 'application/json'
                };
                headersEditar = {
                    'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN),
                    'Content-Type': 'application/json'
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, axios_1.default.post("".concat(urlBase, "/cliente"), {
                        qtype: "cliente.id", query: idClienteIxc, oper: "=", rp: "1"
                    }, { headers: headersListar })];
            case 2:
                respGet = _a.sent();
                if (!respGet.data || respGet.data.total <= 0)
                    return [2 /*return*/];
                clienteDados = respGet.data.registros[0];
                mensagemAlerta = "ATENÇÃO: Este cliente possui alerta de uso incomum de internet, podendo ser um equipamento tvbox infectado com virus.";
                alertaAtual = clienteDados.alerta || "";
                if (alertaAtual.includes("uso incomum de internet")) {
                    UPDATE_LOCAL_1 = "UPDATE soc_wanguard_report SET alerta_ixc = 'Sim' WHERE id = ?";
                    database_1.LOCALHOST.query(UPDATE_LOCAL_1, [idReportLocal], function () { });
                    return [2 /*return*/];
                }
                novoAlerta = alertaAtual
                    ? "".concat(mensagemAlerta, "\n\n").concat(alertaAtual)
                    : mensagemAlerta;
                clienteDados.alerta = novoAlerta;
                return [4 /*yield*/, axios_1.default.put("".concat(urlBase, "/cliente/").concat(idClienteIxc), clienteDados, { headers: headersEditar })];
            case 3:
                _a.sent();
                UPDATE_LOCAL = "UPDATE soc_wanguard_report SET alerta_ixc = 'Sim' WHERE id = ?";
                database_1.LOCALHOST.query(UPDATE_LOCAL, [idReportLocal], function (err) {
                    if (err)
                        console.error("Erro ao atualizar flag alerta_ixc:", err);
                    else
                        console.log("Alerta IXC atualizado com sucesso para o cliente ".concat(idClienteIxc));
                });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _a.sent();
                console.error("Erro ao processar alerta IXC:", error_3.message);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.default = router;
