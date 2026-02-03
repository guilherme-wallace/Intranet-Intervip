"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
// routes/api/v5/rede_neutra.ts
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
function gerarTokenUnico() {
    return __awaiter(this, void 0, void 0, function () {
        var chars, token, existe, i, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    chars = 'ABCDEFGHJKILMNOPQRSTUVWXYZ0123456789';
                    token = '';
                    existe = true;
                    _a.label = 1;
                case 1:
                    if (!existe) return [3 /*break*/, 3];
                    token = '';
                    for (i = 0; i < 5; i++)
                        token += chars.charAt(Math.floor(Math.random() * chars.length));
                    return [4 /*yield*/, executeDb('SELECT id FROM rn_clientes WHERE token = ?', [token])];
                case 2:
                    results = _a.sent();
                    if (results.length === 0)
                        existe = false;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, token];
            }
        });
    });
}
function sincronizarClientesLegados(parceiroIdLocal, ixcContratoId) {
    return __awaiter(this, void 0, void 0, function () {
        var produtosResp, produtosIxc, loginsIxc, loginsResp, e_1, _loop_1, _i, produtosIxc_1, prod, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[Sync] Iniciando sincroniza\u00E7\u00E3o para parceiro ".concat(parceiroIdLocal, " (Contrato IXC: ").concat(ixcContratoId, ")"));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 12]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/vd_contratos_produtos', {
                            "qtype": "vd_contratos_produtos.id_contrato",
                            "query": ixcContratoId,
                            "oper": "=",
                            "page": "1",
                            "rp": "2000",
                            "sortname": "vd_contratos_produtos.id",
                            "sortorder": "desc"
                        })];
                case 2:
                    produtosResp = _a.sent();
                    produtosIxc = produtosResp.registros || [];
                    if (produtosIxc.length === 0)
                        return [2 /*return*/];
                    loginsIxc = [];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/radusuarios', {
                            "qtype": "radusuarios.id_contrato",
                            "query": ixcContratoId,
                            "oper": "=",
                            "page": "1",
                            "rp": "2000"
                        })];
                case 4:
                    loginsResp = _a.sent();
                    loginsIxc = loginsResp.registros || [];
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    console.warn("Erro ao listar logins para sync:", e_1.message);
                    return [3 /*break*/, 6];
                case 6:
                    _loop_1 = function (prod) {
                        var loginMatch, existe, endereco, numero, bairro, cep, mac, obsProduto, dadosSync, token, matchToken;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    loginMatch = loginsIxc.find(function (l) {
                                        return l.login === prod.descricao ||
                                            (prod.descricao && prod.descricao.includes(l.login));
                                    });
                                    return [4 /*yield*/, executeDb('SELECT id FROM rn_clientes WHERE ixc_produto_id = ?', [prod.id])];
                                case 1:
                                    existe = _b.sent();
                                    endereco = loginMatch ? loginMatch.endereco : null;
                                    numero = loginMatch ? loginMatch.numero : null;
                                    bairro = loginMatch ? loginMatch.bairro : null;
                                    cep = loginMatch ? loginMatch.cep : null;
                                    mac = loginMatch ? loginMatch.onu_mac : null;
                                    obsProduto = prod.obs || "";
                                    dadosSync = {
                                        ixc_login_id: loginMatch ? loginMatch.id : null,
                                        login_pppoe: loginMatch ? loginMatch.login : (prod.descricao || 'sem_login'),
                                        valor: prod.valor_unit,
                                        descricao_produto: prod.descricao,
                                        onu_mac: mac,
                                        ativo: 1,
                                        cep: cep, endereco: endereco, numero: numero, bairro: bairro,
                                        obs: obsProduto
                                    };
                                    if (!(existe.length > 0)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, executeDb("UPDATE rn_clientes SET \n                        ixc_login_id = ?, login_pppoe = ?, valor = ?, descricao_produto = ?, \n                        onu_mac = ?, ativo = ?, obs = ?, cep = ?, endereco = ?, numero = ?, bairro = ?\n                    WHERE id = ?", [
                                            dadosSync.ixc_login_id, dadosSync.login_pppoe, dadosSync.valor, dadosSync.descricao_produto,
                                            dadosSync.onu_mac, dadosSync.ativo, dadosSync.obs, dadosSync.cep, dadosSync.endereco,
                                            dadosSync.numero, dadosSync.bairro, existe[0].id
                                        ])];
                                case 2:
                                    _b.sent();
                                    return [3 /*break*/, 8];
                                case 3:
                                    token = '';
                                    matchToken = prod.descricao ? prod.descricao.match(/^([A-Z0-9]{5})-/) : null;
                                    if (!(matchToken && matchToken[1])) return [3 /*break*/, 4];
                                    console.log("[Sync] Token detectado na descri\u00E7\u00E3o: ".concat(matchToken[1]));
                                    token = matchToken[1];
                                    return [3 /*break*/, 6];
                                case 4: return [4 /*yield*/, gerarTokenUnico()];
                                case 5:
                                    token = _b.sent();
                                    _b.label = 6;
                                case 6: return [4 /*yield*/, executeDb("INSERT INTO rn_clientes \n                    (parceiro_id, ixc_produto_id, ixc_login_id, token, descricao_produto, login_pppoe, valor, plano_nome, ativo, obs, onu_mac, cep, endereco, numero, bairro, created_at)\n                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())", [
                                        parceiroIdLocal,
                                        prod.id,
                                        dadosSync.ixc_login_id,
                                        token,
                                        dadosSync.descricao_produto,
                                        dadosSync.login_pppoe,
                                        dadosSync.valor,
                                        'Plano Importado',
                                        dadosSync.ativo,
                                        dadosSync.obs,
                                        dadosSync.onu_mac,
                                        dadosSync.cep,
                                        dadosSync.endereco,
                                        dadosSync.numero,
                                        dadosSync.bairro
                                    ])];
                                case 7:
                                    _b.sent();
                                    _b.label = 8;
                                case 8: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, produtosIxc_1 = produtosIxc;
                    _a.label = 7;
                case 7:
                    if (!(_i < produtosIxc_1.length)) return [3 /*break*/, 10];
                    prod = produtosIxc_1[_i];
                    return [5 /*yield**/, _loop_1(prod)];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 7];
                case 10:
                    console.log("[Sync] Sincroniza\u00E7\u00E3o conclu\u00EDda para parceiro ".concat(parceiroIdLocal, "."));
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _a.sent();
                    console.error("[Sync] Erro ao sincronizar parceiro ".concat(parceiroIdLocal, ":"), error_2.message);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
router.get('/produtos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var payload, response, listaProdutos, planosFormatados, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                payload = {
                    "qtype": "produtos.descricao",
                    "query": "REDE_NEUTRA_",
                    "oper": "L",
                    "page": "1",
                    "rp": "2000",
                    "sortname": "produtos.id",
                    "sortorder": "desc"
                };
                return [4 /*yield*/, makeIxcRequest('POST', '/produtos', payload)];
            case 1:
                response = _a.sent();
                listaProdutos = response.registros || [];
                planosFormatados = listaProdutos
                    .filter(function (p) { return p.ativo === 'S'; })
                    .map(function (p) {
                    var nome = p.descricao || "Produto sem nome";
                    var match = nome.match(/_(\d+[MG]B?)_(FTTH|FTTP)/i);
                    var nomeExibicao = nome;
                    if (match) {
                        var velocidade = match[1];
                        var tecnologia = match[2];
                        nomeExibicao = "".concat(velocidade, " - ").concat(tecnologia);
                    }
                    else {
                        var matchVel = nome.match(/_(\d+[MG]B?)/i);
                        if (matchVel)
                            nomeExibicao = "".concat(matchVel[1], " - Internet");
                    }
                    return {
                        id: p.id,
                        nome_original: nome,
                        nome_exibicao: nomeExibicao,
                        preco: p.preco_base
                    };
                });
                res.json(planosFormatados);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error("Erro ao buscar produtos:", error_3);
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/parceiros', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var contratoPayload, contratosIxc, resp, e_2, _i, contratosIxc_1, c, nomeParceiro, cliResp, e_3, checkQuery, existing, parceirosLocais, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 17, , 18]);
                contratoPayload = {
                    "qtype": "cliente_contrato.id_vd_contrato",
                    "query": "7977",
                    "oper": "=",
                    "page": "1",
                    "rp": "200",
                    "sortname": "cliente_contrato.id",
                    "sortorder": "desc"
                };
                contratosIxc = [];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato', contratoPayload)];
            case 2:
                resp = _a.sent();
                contratosIxc = (resp.registros || []).filter(function (c) { return c.status === 'A'; });
                return [3 /*break*/, 4];
            case 3:
                e_2 = _a.sent();
                console.warn("Falha ao buscar parceiros no IXC, usando cache local.");
                return [3 /*break*/, 4];
            case 4:
                _i = 0, contratosIxc_1 = contratosIxc;
                _a.label = 5;
            case 5:
                if (!(_i < contratosIxc_1.length)) return [3 /*break*/, 15];
                c = contratosIxc_1[_i];
                nomeParceiro = "Parceiro Desconhecido";
                _a.label = 6;
            case 6:
                _a.trys.push([6, 8, , 9]);
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente', {
                        qtype: 'cliente.id', query: c.id_cliente, oper: '=', rp: '1'
                    })];
            case 7:
                cliResp = _a.sent();
                if (cliResp.registros && cliResp.registros.length > 0) {
                    nomeParceiro = cliResp.registros[0].razao;
                }
                return [3 /*break*/, 9];
            case 8:
                e_3 = _a.sent();
                return [3 /*break*/, 9];
            case 9:
                checkQuery = "SELECT id FROM rn_parceiros WHERE ixc_contrato_id = ?";
                return [4 /*yield*/, executeDb(checkQuery, [c.id])];
            case 10:
                existing = _a.sent();
                if (!(existing.length === 0)) return [3 /*break*/, 12];
                return [4 /*yield*/, executeDb("INSERT INTO rn_parceiros (ixc_cliente_id, ixc_contrato_id, nome, ativo) VALUES (?, ?, ?, 1)", [c.id_cliente, c.id, nomeParceiro])];
            case 11:
                _a.sent();
                return [3 /*break*/, 14];
            case 12: return [4 /*yield*/, executeDb("UPDATE rn_parceiros SET nome = ? WHERE id = ?", [nomeParceiro, existing[0].id])];
            case 13:
                _a.sent();
                _a.label = 14;
            case 14:
                _i++;
                return [3 /*break*/, 5];
            case 15: return [4 /*yield*/, executeDb("SELECT * FROM rn_parceiros WHERE ativo = 1 ORDER BY nome ASC")];
            case 16:
                parceirosLocais = _a.sent();
                res.json(parceirosLocais);
                return [3 /*break*/, 18];
            case 17:
                error_4 = _a.sent();
                console.error("Erro rota parceiros:", error_4);
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 18];
            case 18: return [2 /*return*/];
        }
    });
}); });
router.get('/clientes/:parceiroId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parceiroId, parceiroRows, ixcContratoId, clientesLocais, clientesDetalhados, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parceiroId = req.params.parceiroId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, executeDb('SELECT ixc_contrato_id FROM rn_parceiros WHERE id = ?', [parceiroId])];
            case 2:
                parceiroRows = _a.sent();
                if (!(parceiroRows.length > 0)) return [3 /*break*/, 4];
                ixcContratoId = parceiroRows[0].ixc_contrato_id;
                return [4 /*yield*/, sincronizarClientesLegados(Number(parceiroId), ixcContratoId)];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4: return [4 /*yield*/, executeDb("SELECT * FROM rn_clientes WHERE parceiro_id = ? ORDER BY id DESC", [parceiroId])];
            case 5:
                clientesLocais = _a.sent();
                if (clientesLocais.length === 0) {
                    return [2 /*return*/, res.json([])];
                }
                return [4 /*yield*/, Promise.all(clientesLocais.map(function (cli) { return __awaiter(void 0, void 0, void 0, function () {
                        var onlineStatus, ixcLogin, e_4;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    onlineStatus = 'N';
                                    if (!cli.ixc_login_id) return [3 /*break*/, 4];
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, makeIxcRequest('POST', '/radusuarios', {
                                            qtype: 'radusuarios.id',
                                            query: cli.ixc_login_id,
                                            oper: '=',
                                            rp: '1'
                                        })];
                                case 2:
                                    ixcLogin = _a.sent();
                                    if (ixcLogin.registros && ixcLogin.registros.length > 0) {
                                        onlineStatus = ixcLogin.registros[0].online;
                                    }
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_4 = _a.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/, __assign(__assign({}, cli), { online: onlineStatus })];
                            }
                        });
                    }); }))];
            case 6:
                clientesDetalhados = _a.sent();
                res.json(clientesDetalhados);
                return [3 /*break*/, 8];
            case 7:
                error_5 = _a.sent();
                console.error("Erro listar clientes:", error_5);
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
router.post('/cliente', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, parceiro_id, cod_cliente_parceiro, caixa_atendimento, porta, cep, endereco, numero, bairro, plano_id, plano_nome, plano_nome_original, plano_valor, ixcProdResp, ixcLoginResp, novoIdLocal, parceiros, parceiro, valorFinal, token, sufixoCliente, identificadorUnico, infoTecnica, obsString, idPlanoVelocidade, planResp, e_5, insertResult, produtoPayload, loginPayload, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, parceiro_id = _a.parceiro_id, cod_cliente_parceiro = _a.cod_cliente_parceiro, caixa_atendimento = _a.caixa_atendimento, porta = _a.porta, cep = _a.cep, endereco = _a.endereco, numero = _a.numero, bairro = _a.bairro, plano_id = _a.plano_id, plano_nome = _a.plano_nome, plano_nome_original = _a.plano_nome_original, plano_valor = _a.plano_valor;
                console.log("=== INÍCIO CADASTRO REDE NEUTRA ===");
                if (!parceiro_id || !cep) {
                    return [2 /*return*/, res.status(400).json({ error: "Dados obrigatórios faltando." })];
                }
                ixcProdResp = null;
                ixcLoginResp = null;
                novoIdLocal = null;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 12, , 13]);
                return [4 /*yield*/, executeDb("SELECT * FROM rn_parceiros WHERE id = ?", [parceiro_id])];
            case 2:
                parceiros = _b.sent();
                if (parceiros.length === 0)
                    throw new Error("Parceiro não encontrado.");
                parceiro = parceiros[0];
                valorFinal = plano_valor ? plano_valor : (parceiro.valor_fixo || 30.00);
                return [4 /*yield*/, gerarTokenUnico()];
            case 3:
                token = _b.sent();
                sufixoCliente = cod_cliente_parceiro ? "-".concat(cod_cliente_parceiro) : '';
                identificadorUnico = "".concat(token, "-RN-").concat(parceiro.ixc_cliente_id).concat(sufixoCliente);
                infoTecnica = [];
                if (cod_cliente_parceiro)
                    infoTecnica.push("C\u00F3d: ".concat(cod_cliente_parceiro));
                if (caixa_atendimento)
                    infoTecnica.push("CTO: ".concat(caixa_atendimento));
                if (porta)
                    infoTecnica.push("Porta: ".concat(porta));
                obsString = "Token: ".concat(token, " | ").concat(infoTecnica.join(' | '));
                idPlanoVelocidade = "0";
                if (!plano_nome_original) return [3 /*break*/, 7];
                console.log("Buscando Plano de Velocidade (Radgrupo): ".concat(plano_nome_original, "..."));
                _b.label = 4;
            case 4:
                _b.trys.push([4, 6, , 7]);
                return [4 /*yield*/, makeIxcRequest('POST', '/radgrupos', {
                        qtype: 'radgrupos.grupo',
                        query: plano_nome_original,
                        oper: '=',
                        rp: '1'
                    })];
            case 5:
                planResp = _b.sent();
                if (planResp.registros && planResp.registros.length > 0) {
                    idPlanoVelocidade = planResp.registros[0].id;
                    console.log("Plano encontrado! ID: ".concat(idPlanoVelocidade));
                }
                else {
                    console.warn("AVISO: Plano '".concat(plano_nome_original, "' n\u00E3o encontrado em radgrupos. O cadastro pode falhar."));
                }
                return [3 /*break*/, 7];
            case 6:
                e_5 = _b.sent();
                console.error("Erro ao buscar plano de velocidade:", e_5.message);
                return [3 /*break*/, 7];
            case 7: return [4 /*yield*/, executeDb("INSERT INTO rn_clientes \n            (parceiro_id, token, descricao_produto, login_pppoe, valor, plano_nome, ativo, obs, onu_mac, cep, endereco, numero, bairro, caixa_atendimento, porta, created_at)\n            VALUES (?, ?, ?, ?, ?, ?, 1, ?, NULL, ?, ?, ?, ?, ?, ?, NOW())", [
                    parceiro.id, token, identificadorUnico, identificadorUnico, valorFinal, plano_nome,
                    obsString, cep, endereco, numero, bairro, caixa_atendimento, porta
                ])];
            case 8:
                insertResult = _b.sent();
                novoIdLocal = insertResult.insertId;
                produtoPayload = {
                    "id_contrato": parceiro.ixc_contrato_id,
                    "id_produto": plano_id,
                    "tipo": "I",
                    "qtde": "1",
                    "valor_unit": valorFinal,
                    "descricao": identificadorUnico,
                    "obs": obsString,
                    "id_plano": idPlanoVelocidade,
                    "fixar_ip": "0"
                };
                console.log("Enviando Produto IXC...");
                return [4 /*yield*/, makeIxcRequest('POST', '/vd_contratos_produtos', produtoPayload)];
            case 9:
                ixcProdResp = _b.sent();
                if (ixcProdResp.type === 'error') {
                    throw new Error("Erro IXC (Produto): ".concat(ixcProdResp.message));
                }
                loginPayload = {
                    "id_contrato": parceiro.ixc_contrato_id,
                    "id_cliente": parceiro.ixc_cliente_id,
                    "login": identificadorUnico,
                    "senha": "ivp@".concat(token),
                    "ativo": "S",
                    "obs": obsString,
                    "cep": cep, "endereco": endereco, "numero": numero, "bairro": bairro,
                    "endereco_padrao_cliente": "N",
                    "autenticacao": "L",
                    "tipo_conexao_mapa": "58",
                    "id_grupo": idPlanoVelocidade,
                    "login_simultaneo": "1",
                    "senha_md5": "N",
                    "auto_preencher_ip": "S",
                    "fixar_ip": "N",
                    "relacionar_ip_ao_login": "N",
                    "autenticacao_por_mac": "N",
                    "auto_preencher_mac": "S",
                    "relacionar_mac_ao_login": "S",
                    "tipo_vinculo_plano": "D"
                };
                console.log("Enviando Login IXC...");
                return [4 /*yield*/, makeIxcRequest('POST', '/radusuarios', loginPayload)];
            case 10:
                ixcLoginResp = _b.sent();
                if (ixcLoginResp.type === 'error') {
                    throw new Error("Erro IXC (Login): ".concat(ixcLoginResp.message));
                }
                return [4 /*yield*/, executeDb("UPDATE rn_clientes SET ixc_produto_id = ?, ixc_login_id = ? WHERE id = ?", [ixcProdResp.id, ixcLoginResp.id, novoIdLocal])];
            case 11:
                _b.sent();
                res.json({
                    success: true,
                    id: novoIdLocal,
                    token: token,
                    login: identificadorUnico,
                    ixc_login_id: ixcLoginResp.id
                });
                return [3 /*break*/, 13];
            case 12:
                error_6 = _b.sent();
                console.error("ERRO NO CADASTRO:", error_6.message);
                res.status(500).json({ error: error_6.message });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
router.put('/cliente/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, descricao_produto, login_pppoe, status_ativo, obs, cep, endereco, numero, bairro, clientes, cli, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, descricao_produto = _a.descricao_produto, login_pppoe = _a.login_pppoe, status_ativo = _a.status_ativo, obs = _a.obs, cep = _a.cep, endereco = _a.endereco, numero = _a.numero, bairro = _a.bairro;
                if (!id)
                    return [2 /*return*/, res.status(400).json({ error: "ID não informado" })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                return [4 /*yield*/, executeDb("UPDATE rn_clientes SET \n                descricao_produto = ?, login_pppoe = ?, ativo = ?, obs = ?,\n                cep = ?, endereco = ?, numero = ?, bairro = ?\n            WHERE id = ?", [descricao_produto, login_pppoe, status_ativo, obs, cep, endereco, numero, bairro, id])];
            case 2:
                _b.sent();
                return [4 /*yield*/, executeDb("SELECT ixc_produto_id, ixc_login_id FROM rn_clientes WHERE id = ?", [id])];
            case 3:
                clientes = _b.sent();
                if (!(clientes.length > 0)) return [3 /*break*/, 7];
                cli = clientes[0];
                if (!cli.ixc_produto_id) return [3 /*break*/, 5];
                return [4 /*yield*/, makeIxcRequest('PUT', "/vd_contratos_produtos/".concat(cli.ixc_produto_id), {
                        "descricao": descricao_produto,
                        "obs": obs
                    })];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                if (!cli.ixc_login_id) return [3 /*break*/, 7];
                return [4 /*yield*/, makeIxcRequest('PUT', "/radusuarios/".concat(cli.ixc_login_id), {
                        "login": login_pppoe,
                        "ativo": status_ativo == 1 ? "S" : "N",
                        "cep": cep,
                        "endereco": endereco,
                        "numero": numero,
                        "bairro": bairro
                    })];
            case 6:
                _b.sent();
                _b.label = 7;
            case 7:
                res.json({ success: true, message: "Cliente atualizado nas duas bases." });
                return [3 /*break*/, 9];
            case 8:
                error_7 = _b.sent();
                console.error("Erro ao editar cliente:", error_7);
                res.status(500).json({ error: error_7.message });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
router.get('/onu-detalhes/:id_login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_login, loginResp, loginData, fibraResp, dadosTecnicos, fibra, rxNum, matchVlan, popResp, e_6, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id_login = req.params.id_login;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 8, , 9]);
                return [4 /*yield*/, makeIxcRequest('POST', '/radusuarios', {
                        qtype: 'radusuarios.id', query: id_login, oper: '=', rp: '1'
                    })];
            case 2:
                loginResp = _a.sent();
                if (!loginResp.registros || loginResp.registros.length === 0) {
                    return [2 /*return*/, res.json({ online: 'N', sinal_rx: null, sinal_tx: null, mac: null })];
                }
                loginData = loginResp.registros[0];
                return [4 /*yield*/, makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                        qtype: 'id_login', query: id_login, oper: '=', rp: '1', sortname: 'id', sortorder: 'desc'
                    })];
            case 3:
                fibraResp = _a.sent();
                dadosTecnicos = {
                    online: 'N', mac: loginData.onu_mac, sinal_rx: '-', sinal_tx: '-', data_sinal: '-',
                    nome: '-', id_transmissor: '-', id_caixa_ftth: '-', porta_ftth: '-', onu_tipo: '-',
                    ponid: '-', onu_numero: '-', temperatura: '-', voltagem: '-', user_vlan: '-', id_fibra: null
                };
                if (!(fibraResp.registros && fibraResp.registros.length > 0)) return [3 /*break*/, 7];
                fibra = fibraResp.registros[0];
                dadosTecnicos.id_fibra = fibra.id;
                dadosTecnicos.sinal_rx = fibra.sinal_rx ? fibra.sinal_rx.replace(',', '.') : '-';
                dadosTecnicos.sinal_tx = fibra.sinal_tx ? fibra.sinal_tx.replace(',', '.') : '-';
                dadosTecnicos.data_sinal = fibra.data_sinal || '-';
                dadosTecnicos.nome = fibra.nome || '-';
                dadosTecnicos.id_transmissor = fibra.id_transmissor || '-';
                dadosTecnicos.id_caixa_ftth = fibra.id_caixa_ftth || '-';
                dadosTecnicos.porta_ftth = fibra.porta_ftth || '-';
                dadosTecnicos.onu_tipo = fibra.onu_tipo || '-';
                dadosTecnicos.ponid = fibra.ponid || '-';
                dadosTecnicos.onu_numero = fibra.onu_numero || '-';
                dadosTecnicos.temperatura = fibra.temperatura || '-';
                dadosTecnicos.voltagem = fibra.voltagem || '-';
                rxNum = parseFloat(dadosTecnicos.sinal_rx);
                if (!isNaN(rxNum) && rxNum !== 0)
                    dadosTecnicos.online = 'S';
                if (fibra.comandos) {
                    matchVlan = fibra.comandos.match(/user-vlan\s+(\d+)/);
                    if (matchVlan && matchVlan[1])
                        dadosTecnicos.user_vlan = matchVlan[1];
                }
                if (!fibra.id_transmissor) return [3 /*break*/, 7];
                _a.label = 4;
            case 4:
                _a.trys.push([4, 6, , 7]);
                return [4 /*yield*/, makeIxcRequest('POST', '/radpop', {
                        qtype: "radpop.id", query: fibra.id_transmissor, oper: "=", rp: "1"
                    })];
            case 5:
                popResp = _a.sent();
                if (popResp.registros && popResp.registros.length > 0) {
                    dadosTecnicos.id_transmissor = popResp.registros[0].pop;
                }
                return [3 /*break*/, 7];
            case 6:
                e_6 = _a.sent();
                return [3 /*break*/, 7];
            case 7:
                res.json(dadosTecnicos);
                return [3 /*break*/, 9];
            case 8:
                error_8 = _a.sent();
                console.error("Erro detalhes ONU:", error_8);
                res.status(500).json({ error: error_8.message });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
router.post('/refresh-onu', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_login, fibraResp, idFibra, urlRefresh, token, responseHtml, html_1, extract, novoSinalRx, novoSinalTx, novaTemp, novaVolt, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id_login = req.body.id_login;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                        qtype: 'id_login', query: id_login, oper: '=', rp: '1', sortname: 'id', sortorder: 'desc'
                    })];
            case 2:
                fibraResp = _a.sent();
                if (!fibraResp.registros || fibraResp.registros.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: "Registro de fibra não encontrado para este login." })];
                }
                idFibra = fibraResp.registros[0].id;
                urlRefresh = "".concat(process.env.IXC_API_URL, "/webservice/v1/botao_rel_22991");
                token = process.env.IXC_API_TOKEN;
                return [4 /*yield*/, axios_1.default.post(urlRefresh, { id: idFibra }, {
                        headers: { 'Authorization': "Basic ".concat(token), 'Content-Type': 'application/json' }
                    })];
            case 3:
                responseHtml = _a.sent();
                html_1 = responseHtml.data;
                extract = function (regex) {
                    var match = html_1.match(regex);
                    return match ? match[1] : null;
                };
                novoSinalRx = extract(/Sinal Rx:\s*([-0-9.,]+)/);
                novoSinalTx = extract(/Sinal Tx:\s*([-0-9.,]+)/);
                novaTemp = extract(/Temperatura:\s*([-0-9.,]+)/);
                novaVolt = extract(/Voltagem:\s*([-0-9.,]+)/);
                res.json({
                    success: true,
                    sinal_rx: novoSinalRx ? novoSinalRx.replace(',', '.') : '-',
                    sinal_tx: novoSinalTx ? novoSinalTx.replace(',', '.') : '-',
                    temperatura: novaTemp,
                    voltagem: novaVolt,
                    online: (novoSinalRx && parseFloat(novoSinalRx) < 0) ? 'S' : 'N'
                });
                return [3 /*break*/, 5];
            case 4:
                error_9 = _a.sent();
                console.error("Erro ao dar refresh na ONU:", error_9.message);
                res.status(500).json({ error: "Falha ao comunicar com a OLT." });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post('/autorizar-onu', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, ixc_login_id, mac, macLimpo, error_10;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, ixc_login_id = _a.ixc_login_id, mac = _a.mac;
                if (!ixc_login_id || !mac)
                    return [2 /*return*/, res.status(400).json({ error: "Dados incompletos" })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                macLimpo = mac.toUpperCase().replace(/[^A-Z0-9]/g, '');
                return [4 /*yield*/, makeIxcRequest('PUT', "/radusuarios/".concat(ixc_login_id), { "onu_mac": macLimpo })];
            case 2:
                _b.sent();
                return [4 /*yield*/, executeDb("UPDATE rn_clientes SET onu_mac = ? WHERE ixc_login_id = ?", [macLimpo, ixc_login_id])];
            case 3:
                _b.sent();
                res.json({ success: true, message: "ONU Autorizada" });
                return [3 /*break*/, 5];
            case 4:
                error_10 = _b.sent();
                res.status(500).json({ error: error_10.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post('/desautorizar-onu', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ixc_login_id, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ixc_login_id = req.body.ixc_login_id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, makeIxcRequest('PUT', "/radusuarios/".concat(ixc_login_id), { "onu_mac": "" })];
            case 2:
                _a.sent();
                return [4 /*yield*/, executeDb("UPDATE rn_clientes SET onu_mac = NULL WHERE ixc_login_id = ?", [ixc_login_id])];
            case 3:
                _a.sent();
                res.json({ success: true, message: "ONU Removida" });
                return [3 /*break*/, 5];
            case 4:
                error_11 = _a.sent();
                res.status(500).json({ error: error_11.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
