"use strict";
// routes/api/v5/monitoramento.ts
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var Express = require("express");
var database_1 = require("../../../api/database");
var axios_1 = require("axios");
var router = Express.Router();
var queryAsync = function (sql, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        database_1.LOCALHOST.query(sql, params, function (err, results) {
            if (err)
                reject(err);
            else
                resolve(results);
        });
    });
};
var webhookQueue = [];
var isProcessingQueue = false;
function processWebhookQueue() {
    return __awaiter(this, void 0, void 0, function () {
        var task, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isProcessingQueue)
                        return [2 /*return*/];
                    isProcessingQueue = true;
                    _a.label = 1;
                case 1:
                    if (!(webhookQueue.length > 0)) return [3 /*break*/, 6];
                    task = webhookQueue.shift();
                    if (!task) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, task()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.error("Erro na fila do webhook:", err_1);
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 1];
                case 6:
                    isProcessingQueue = false;
                    return [2 /*return*/];
            }
        });
    });
}
router.post('/webhook/n8n', function (req, res) {
    res.json({ success: true, message: 'Alerta recebido e enfileirado para agrupamento.' });
    webhookQueue.push(function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, status, data_evento, sinal_rx_retorno, is_update, update_action, update_message, data_evento_sql, idCliente, idContrato, parts, headersIxc, respCliente, razaoSocial, enderecoCompleto, respContrato, c, error_1, checkDuplicata, alertaExistente, motivoBase, novoMotivo, checkRestantes, buscarIncidente, resInc, idIncidentePai, resCriar, resBusca, alertaId, incidenteId, resCheck;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = req.body, host_zabbix = _a.host_zabbix, tipo_alerta = _a.tipo_alerta, identificador = _a.identificador, nome_identificado = _a.nome_identificado, motivo_falha = _a.motivo_falha, status = _a.status, data_evento = _a.data_evento, sinal_rx_retorno = _a.sinal_rx_retorno, is_update = _a.is_update, update_action = _a.update_action, update_message = _a.update_message;
                    data_evento_sql = data_evento;
                    if (data_evento_sql && data_evento_sql.includes('.')) {
                        data_evento_sql = data_evento_sql.replace(/\./g, '-');
                    }
                    if (!(tipo_alerta === 'CORP' && identificador && (!nome_identificado || !nome_identificado.includes('|')))) return [3 /*break*/, 6];
                    idCliente = identificador;
                    idContrato = null;
                    if (identificador.includes('|')) {
                        parts = identificador.split('|');
                        idCliente = parts[0];
                        idContrato = parts[1];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    headersIxc = { 'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN), 'ixcsoft': 'listar', 'Content-Type': 'application/json' };
                    return [4 /*yield*/, axios_1.default.post("".concat(process.env.IXC_API_URL, "/webservice/v1/cliente"), { qtype: "cliente.id", query: idCliente, oper: "=", rp: "1" }, { headers: headersIxc })];
                case 2:
                    respCliente = _b.sent();
                    razaoSocial = "";
                    if (respCliente.data && respCliente.data.registros && respCliente.data.registros.length > 0) {
                        razaoSocial = respCliente.data.registros[0].razao;
                    }
                    enderecoCompleto = "";
                    if (!idContrato) return [3 /*break*/, 4];
                    return [4 /*yield*/, axios_1.default.post("".concat(process.env.IXC_API_URL, "/webservice/v1/cliente_contrato"), { qtype: "cliente_contrato.id", query: idContrato, oper: "=", rp: "1" }, { headers: headersIxc })];
                case 3:
                    respContrato = _b.sent();
                    if (respContrato.data && respContrato.data.registros && respContrato.data.registros.length > 0) {
                        c = respContrato.data.registros[0];
                        enderecoCompleto = "".concat(c.endereco, ", ").concat(c.numero);
                        if (c.complemento)
                            enderecoCompleto += " (".concat(c.complemento, ")");
                        enderecoCompleto += " - ".concat(c.bairro);
                    }
                    _b.label = 4;
                case 4:
                    if (razaoSocial) {
                        nome_identificado = "".concat(razaoSocial, " (ID: ").concat(idCliente, ")");
                        if (enderecoCompleto)
                            nome_identificado += " | ".concat(enderecoCompleto);
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    console.error("Erro ao enriquecer dados do CORP via IXC:", error_1.message);
                    return [3 /*break*/, 6];
                case 6:
                    if (!(status === 'DOWN')) return [3 /*break*/, 20];
                    return [4 /*yield*/, queryAsync("\n                SELECT id, motivo_falha, id_incidente FROM mon_alertas \n                WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' \n                ORDER BY id DESC LIMIT 1\n            ", [identificador, host_zabbix])];
                case 7:
                    checkDuplicata = _b.sent();
                    if (!(checkDuplicata && checkDuplicata.length > 0)) return [3 /*break*/, 12];
                    alertaExistente = checkDuplicata[0];
                    if (!(is_update === '1' || (update_action && update_action.toLowerCase().includes('acknowledge')))) return [3 /*break*/, 11];
                    motivoBase = alertaExistente.motivo_falha || 'Desconhecido';
                    novoMotivo = motivoBase;
                    if (update_message && update_message.trim() !== "") {
                        novoMotivo = "".concat(motivoBase, " | ACK: ").concat(update_message);
                    }
                    else {
                        novoMotivo = "".concat(motivoBase, " | Reconhecido no Zabbix");
                    }
                    return [4 /*yield*/, queryAsync("UPDATE mon_alertas SET status = 'IGNORADO', data_retorno = NOW(), motivo_falha = ? WHERE id = ?", [novoMotivo, alertaExistente.id])];
                case 8:
                    _b.sent();
                    if (!alertaExistente.id_incidente) return [3 /*break*/, 11];
                    return [4 /*yield*/, queryAsync("SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1", [alertaExistente.id_incidente])];
                case 9:
                    checkRestantes = _b.sent();
                    if (!(checkRestantes.length === 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, queryAsync("UPDATE mon_incidentes SET status = 'Resolvido', data_fim = NOW() WHERE id = ?", [alertaExistente.id_incidente])];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11: return [2 /*return*/];
                case 12:
                    buscarIncidente = "\n                SELECT id, regiao_afetada FROM mon_incidentes \n                WHERE status = 'Ativo' \n                AND (\n                    (regiao_afetada = ? AND data_inicio >= CAST(? AS DATETIME) - INTERVAL 20 MINUTE)\n                    OR \n                    (data_inicio >= CAST(? AS DATETIME) - INTERVAL 2 MINUTE)\n                )\n                ORDER BY id DESC LIMIT 1\n            ";
                    return [4 /*yield*/, queryAsync(buscarIncidente, [host_zabbix, data_evento_sql, data_evento_sql])];
                case 13:
                    resInc = _b.sent();
                    idIncidentePai = void 0;
                    if (!(resInc && resInc.length > 0)) return [3 /*break*/, 16];
                    idIncidentePai = resInc[0].id;
                    if (!(resInc[0].regiao_afetada !== host_zabbix && resInc[0].regiao_afetada !== 'Múltiplos Equipamentos')) return [3 /*break*/, 15];
                    return [4 /*yield*/, queryAsync("UPDATE mon_incidentes SET regiao_afetada = 'M\u00FAltiplos Equipamentos' WHERE id = ?", [idIncidentePai])];
                case 14:
                    _b.sent();
                    _b.label = 15;
                case 15: return [3 /*break*/, 18];
                case 16: return [4 /*yield*/, queryAsync("INSERT INTO mon_incidentes (regiao_afetada, data_inicio, status) VALUES (?, ?, 'Ativo')", [host_zabbix, data_evento_sql])];
                case 17:
                    resCriar = _b.sent();
                    idIncidentePai = resCriar.insertId;
                    _b.label = 18;
                case 18: return [4 /*yield*/, queryAsync("\n                INSERT INTO mon_alertas \n                (id_incidente, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_falha, status) \n                VALUES (?, ?, ?, ?, ?, ?, ?, 'DOWN')\n            ", [idIncidentePai, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_evento_sql])];
                case 19:
                    _b.sent();
                    return [3 /*break*/, 25];
                case 20:
                    if (!(status === 'UP')) return [3 /*break*/, 25];
                    return [4 /*yield*/, queryAsync("\n                SELECT id, id_incidente FROM mon_alertas \n                WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' \n                ORDER BY data_falha DESC LIMIT 1\n            ", [identificador, host_zabbix])];
                case 21:
                    resBusca = _b.sent();
                    if (!(resBusca && resBusca.length > 0)) return [3 /*break*/, 25];
                    alertaId = resBusca[0].id;
                    incidenteId = resBusca[0].id_incidente;
                    return [4 /*yield*/, queryAsync("UPDATE mon_alertas SET status = 'UP', data_retorno = ?, sinal_rx_retorno = ? WHERE id = ?", [data_evento_sql, sinal_rx_retorno, alertaId])];
                case 22:
                    _b.sent();
                    if (!incidenteId) return [3 /*break*/, 25];
                    return [4 /*yield*/, queryAsync("SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1", [incidenteId])];
                case 23:
                    resCheck = _b.sent();
                    if (!(resCheck.length === 0)) return [3 /*break*/, 25];
                    return [4 /*yield*/, queryAsync("UPDATE mon_incidentes SET status = 'Resolvido', data_fim = ? WHERE id = ?", [data_evento_sql, incidenteId])];
                case 24:
                    _b.sent();
                    _b.label = 25;
                case 25: return [2 /*return*/];
            }
        });
    }); });
    processWebhookQueue();
});
router.get('/falhas-ativas', function (req, res) {
    var queryIncidentes = "\n        SELECT * FROM mon_incidentes \n        WHERE \n            (status = 'Ativo' AND data_inicio <= NOW() - INTERVAL '2:30' MINUTE_SECOND)\n           OR \n            (status = 'Resolvido' AND data_fim >= NOW() - INTERVAL 10 MINUTE)\n        ORDER BY data_inicio DESC\n    ";
    database_1.LOCALHOST.query(queryIncidentes, function (errInc, resultIncidentes) {
        if (errInc)
            return res.status(500).json({ error: errInc.message });
        var queryAlertas = "\n            SELECT * FROM mon_alertas \n            WHERE \n                id_incidente IN (\n                    SELECT id FROM mon_incidentes \n                    WHERE status = 'Ativo' OR (status = 'Resolvido' AND data_fim >= NOW() - INTERVAL 10 MINUTE)\n                )\n                OR \n                (id_incidente IS NULL AND (\n                    (status = 'DOWN' AND data_falha <= NOW() - INTERVAL '2:30' MINUTE_SECOND) OR \n                    (status IN ('UP', 'IGNORADO') AND data_retorno >= NOW() - INTERVAL 10 MINUTE)\n                ))\n            ORDER BY data_falha DESC\n        ";
        database_1.LOCALHOST.query(queryAlertas, function (errAlt, resultAlertas) {
            if (errAlt)
                return res.status(500).json({ error: errAlt.message });
            var incidentesAgrupados = resultIncidentes.map(function (inc) {
                return __assign(__assign({}, inc), { alertas: resultAlertas.filter(function (a) { return a.id_incidente === inc.id; }) });
            });
            var alertasIsolados = resultAlertas.filter(function (a) { return a.id_incidente === null; });
            alertasIsolados.forEach(function (alerta) {
                incidentesAgrupados.push({
                    id: alerta.id,
                    regiao_afetada: alerta.host_zabbix,
                    data_inicio: alerta.data_falha,
                    status: alerta.status === 'DOWN' ? 'Ativo' : 'Resolvido',
                    alertas: [alerta]
                });
            });
            incidentesAgrupados.sort(function (a, b) { return new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime(); });
            res.json(incidentesAgrupados);
        });
    });
});
router.get('/busca-contratos/:id_cliente', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_cliente, headersIxc, respCliente, cliente_1, nomeCliente, respContrato, registrosValidos, contratos, error_2;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                id_cliente = req.params.id_cliente;
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                headersIxc = {
                    'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN),
                    'ixcsoft': 'listar',
                    'Content-Type': 'application/json'
                };
                return [4 /*yield*/, axios_1.default.post("".concat(process.env.IXC_API_URL, "/webservice/v1/cliente"), {
                        qtype: "cliente.id", query: id_cliente, oper: "=", rp: "1"
                    }, { headers: headersIxc })];
            case 2:
                respCliente = _d.sent();
                cliente_1 = ((_b = (_a = respCliente.data) === null || _a === void 0 ? void 0 : _a.registros) === null || _b === void 0 ? void 0 : _b[0]) || {};
                nomeCliente = cliente_1.razao || 'Cliente não encontrado';
                return [4 /*yield*/, axios_1.default.post("".concat(process.env.IXC_API_URL, "/webservice/v1/cliente_contrato"), {
                        qtype: "cliente_contrato.id_cliente", query: id_cliente, oper: "=", rp: "50"
                    }, { headers: headersIxc })];
            case 3:
                respContrato = _d.sent();
                registrosValidos = (((_c = respContrato.data) === null || _c === void 0 ? void 0 : _c.registros) || []).filter(function (c) { return !['D', 'C', 'CM', 'CA'].includes(c.status_internet); });
                contratos = registrosValidos.map(function (c) {
                    var enderecoStr = '';
                    if (c.endereco) {
                        enderecoStr = [c.endereco, c.numero, c.bairro].filter(Boolean).join(', ');
                    }
                    else if (c.endereco_padrao_cliente === 'S' || !c.endereco) {
                        enderecoStr = [cliente_1.endereco, cliente_1.numero, cliente_1.bairro].filter(Boolean).join(', ');
                    }
                    if (!enderecoStr || enderecoStr.trim() === '')
                        enderecoStr = 'Endereço não especificado';
                    return {
                        id_contrato: c.id, status: c.status_internet, endereco: enderecoStr,
                        plano: c.contrato || 'Plano Genérico',
                        data_ativacao: c.data_ativacao ? c.data_ativacao.split('-').reverse().join('/') : 'N/A'
                    };
                });
                res.json({ nome: nomeCliente, contratos: contratos });
                return [3 /*break*/, 5];
            case 4:
                error_2 = _d.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post('/acao-lote', function (req, res) {
    var _a = req.body, ids = _a.ids, acao = _a.acao;
    if (!ids || !ids.length)
        return res.status(400).json({ error: 'Nenhum ID fornecido.' });
    if (!['UP', 'DOWN', 'IGNORADO'].includes(acao))
        return res.status(400).json({ error: 'Ação inválida.' });
    var statusDb = acao;
    var placeholders = ids.map(function () { return '?'; }).join(',');
    var setRetorno = acao === 'UP' ? 'NOW()' : 'NULL';
    var UPDATE_ALERTAS = "UPDATE mon_alertas SET status = ?, data_retorno = ".concat(setRetorno, " WHERE id IN (").concat(placeholders, ")");
    database_1.LOCALHOST.query(UPDATE_ALERTAS, __spreadArray([statusDb], ids, true), function (errUpd) {
        if (errUpd)
            return res.status(500).json({ error: errUpd.message });
        var BUSCAR_PAIS = "SELECT DISTINCT id_incidente FROM mon_alertas WHERE id IN (".concat(placeholders, ") AND id_incidente IS NOT NULL");
        database_1.LOCALHOST.query(BUSCAR_PAIS, __spreadArray([], ids, true), function (errPais, resPais) {
            if (errPais || !resPais.length)
                return res.json({ success: true });
            resPais.forEach(function (pai) {
                var CHECK_RESTANTES = "SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1";
                database_1.LOCALHOST.query(CHECK_RESTANTES, [pai.id_incidente], function (errCheck, resCheck) {
                    if (resCheck && resCheck.length === 0) {
                        var FECHAR_INCIDENTE = "UPDATE mon_incidentes SET status = 'Resolvido', data_fim = NOW() WHERE id = ?";
                        database_1.LOCALHOST.query(FECHAR_INCIDENTE, [pai.id_incidente], function () { });
                    }
                    else if (acao === 'DOWN') {
                        var REABRIR_INCIDENTE = "UPDATE mon_incidentes SET status = 'Ativo', data_fim = NULL WHERE id = ?";
                        database_1.LOCALHOST.query(REABRIR_INCIDENTE, [pai.id_incidente], function () { });
                    }
                });
            });
            res.json({ success: true, message: "Status alterado para ".concat(acao, ".") });
        });
    });
});
exports.default = router;
