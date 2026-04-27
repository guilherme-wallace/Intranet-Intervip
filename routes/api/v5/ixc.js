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
var Express = require("express");
var axios_1 = require("axios");
var database_1 = require("../../../api/database");
function formatarNomePlano(nomeOriginal) {
    if (!nomeOriginal)
        return 'Não informado';
    var nomeUpper = nomeOriginal.toUpperCase();
    var matchVelocidade = nomeUpper.match(/(\d+[MG])/);
    var velocidade = matchVelocidade ? matchVelocidade[1] : '';
    var tecnologia = '';
    if (nomeUpper.includes('FTTH'))
        tecnologia = 'FTTH';
    else if (nomeUpper.includes('FTTA'))
        tecnologia = 'FTTA';
    else if (nomeUpper.includes('AIRMAX') || nomeUpper.includes('RADIO') || nomeUpper.includes('RÁDIO'))
        tecnologia = 'Rádio';
    else if (nomeUpper.includes('PAC'))
        tecnologia = 'PAC';
    if (velocidade && tecnologia) {
        return "".concat(velocidade, "_").concat(tecnologia);
    }
    return nomeOriginal;
}
var router = Express.Router();
var makeIxcRequest = function (method, endpoint, data, operationType) {
    if (data === void 0) { data = null; }
    if (operationType === void 0) { operationType = null; }
    return __awaiter(void 0, void 0, void 0, function () {
        var url, token, headers, response, error_1, ixcError, ixcErrorMessage;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    url = "".concat(process.env.IXC_API_URL, "/webservice/v1").concat(endpoint);
                    token = process.env.IXC_API_TOKEN;
                    if (!url || !token) {
                        throw new Error('IXC_API_URL ou IXC_API_TOKEN não definidos no .env');
                    }
                    headers = {
                        'Authorization': "Basic ".concat(token),
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
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, axios_1.default)({
                            method: method,
                            url: url,
                            headers: headers,
                            data: data
                        })];
                case 2:
                    response = _c.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_1 = _c.sent();
                    console.error("Erro ao chamar API IXC (".concat(endpoint, "):"), ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) || error_1.message);
                    ixcError = (_b = error_1.response) === null || _b === void 0 ? void 0 : _b.data;
                    ixcErrorMessage = "Erro desconhecido";
                    if (typeof ixcError === 'object' && ixcError !== null) {
                        ixcErrorMessage = ixcError.mensagem || ixcError.message || ixcError.msg || JSON.stringify(ixcError);
                    }
                    else if (typeof ixcError === 'string') {
                        ixcErrorMessage = ixcError;
                    }
                    ixcErrorMessage = ixcErrorMessage.replace(/<br \/>/g, ' ').replace(/<br>/g, ' ');
                    throw new Error("Falha ao comunicar com o IXC: ".concat(ixcErrorMessage));
                case 4: return [2 /*return*/];
            }
        });
    });
};
var getIxcDate = function () {
    var now = new Date();
    now.setHours(now.getHours() - 3);
    return now.toISOString().replace('T', ' ').substring(0, 19);
};
var getIxcDateDMY = function () {
    var now = new Date();
    now.setHours(now.getHours() - 3);
    var day = String(now.getDate()).padStart(2, '0');
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var year = now.getFullYear();
    return "".concat(day, "/").concat(month, "/").concat(year);
};
var getModeloPlano = function (idPlano) {
    var map = {
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
var getTipoContratoPorVencimento = function (diaVencimento) {
    var map = {
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
    var cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11)
        return cpf;
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
function formatarDataNasParaDMY(dataYMD) {
    if (!dataYMD || dataYMD.length !== 10)
        return dataYMD;
    try {
        var _a = dataYMD.split('-'), year = _a[0], month = _a[1], day = _a[2];
        if (!year || !month || !day)
            return dataYMD;
        return "".concat(day, "-").concat(month, "-").concat(year);
    }
    catch (e) {
        console.error("Erro ao formatar data_nascimento:", e);
        return dataYMD;
    }
}
function getFinancialStatus(clientId) {
    return __awaiter(this, void 0, void 0, function () {
        var financeiroPayload, financeiroResponse, hoje, _i, _a, titulo, vencimento, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    financeiroPayload = {
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
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/fn_areceber', financeiroPayload)];
                case 2:
                    financeiroResponse = _b.sent();
                    hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    if (financeiroResponse && financeiroResponse.total > 0) {
                        for (_i = 0, _a = financeiroResponse.registros; _i < _a.length; _i++) {
                            titulo = _a[_i];
                            vencimento = new Date(titulo.data_vencimento);
                            if (vencimento < hoje) {
                                //console.log(`Cliente ${clientId} POSSUI atraso.`);
                                return [2 /*return*/, true];
                            }
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _b.sent();
                    console.error("Erro ao verificar financeiro do cliente ".concat(clientId, ":"), error_2.message);
                    return [2 /*return*/, false];
                case 4: 
                //console.log(`Cliente ${clientId} NÂO possui atraso.`);
                return [2 /*return*/, false];
            }
        });
    });
}
router.get('/vendedores', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var params, ixcResponse, vendedores, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                params = { qtype: 'vendedor.status', query: 'A', oper: '=', page: '1', rp: '1000', sortname: 'vendedor.nome', sortorder: 'asc' };
                return [4 /*yield*/, makeIxcRequest('POST', '/vendedor', params)];
            case 1:
                ixcResponse = _a.sent();
                if (!ixcResponse || !ixcResponse.registros)
                    throw new Error("Resposta inesperada da API IXC para vendedores.");
                vendedores = ixcResponse.registros.map(function (v) { return ({ id: v.id, nome: v.nome }); });
                res.json(vendedores);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/planos-home', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var params, ixcResponse, planosHome, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                params = { qtype: 'vd_contratos.Ativo', query: 'S', oper: '=', page: '1', rp: '5000', sortname: 'vd_contratos.nome', sortorder: 'asc' };
                return [4 /*yield*/, makeIxcRequest('POST', '/vd_contratos', params)];
            case 1:
                ixcResponse = _a.sent();
                if (!ixcResponse || !ixcResponse.registros)
                    throw new Error("Resposta inesperada da API IXC para planos.");
                planosHome = ixcResponse.registros
                    .filter(function (plano) { return plano.nome && plano.nome.toUpperCase().includes('HOME'); })
                    .map(function (plano) { return ({ id: plano.id, nome: plano.nome }); });
                res.json(planosHome);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/planos-ativos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var params, ixcResponse, todosPlanos, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                params = { qtype: 'vd_contratos.Ativo', query: 'S', oper: '=', page: '1', rp: '5000', sortname: 'vd_contratos.nome', sortorder: 'asc' };
                return [4 /*yield*/, makeIxcRequest('POST', '/vd_contratos', params)];
            case 1:
                ixcResponse = _a.sent();
                if (!ixcResponse || !ixcResponse.registros)
                    throw new Error("Resposta inesperada da API IXC para planos.");
                todosPlanos = ixcResponse.registros.map(function (plano) { return ({
                    id: plano.id,
                    nome: plano.nome,
                    valor_contrato: parseFloat(plano.valor_contrato || 0)
                }); });
                res.json(todosPlanos);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
function cadastrarCliente(clientData, dataCadastro, filialId) {
    if (filialId === void 0) { filialId = '3'; }
    return __awaiter(this, void 0, void 0, function () {
        var today, usaEnderecoCliente, celularParaEnviar, clientePayload, clienteResponse, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    today = dataCadastro.split(' ')[0];
                    usaEnderecoCliente = clientData.cep_cliente && clientData.cep_cliente !== '';
                    celularParaEnviar = clientData.telefone_celular || clientData.whatsapp;
                    clientePayload = {
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
                    return [4 /*yield*/, makeIxcRequest('POST', '/cliente', clientePayload)];
                case 1:
                    clienteResponse = _a.sent();
                    //console.log("Resposta da API IXC (Etapa 1):", clienteResponse);
                    if (!clienteResponse || !clienteResponse.id) {
                        errorMessage = clienteResponse.message || clienteResponse.mensagem || clienteResponse.msg || 'Resposta inválida do IXC.';
                        throw new Error("Falha ao cadastrar cliente: ".concat(errorMessage));
                    }
                    //console.log(`Etapa 1 OK: Cliente ID ${clienteResponse.id} criado.`);
                    return [2 /*return*/, clienteResponse.id];
            }
        });
    });
}
function criarContrato(novoClienteId, clientData, dataCadastro, nomePlano, options) {
    if (options === void 0) { options = { id_filial: '3', id_carteira_cobranca: '11', bloqueio_automatico: 'S' }; }
    return __awaiter(this, void 0, void 0, function () {
        var today, idTipoContrato, idModelo, contratoPayload, contratoResponse, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    today = dataCadastro.split(' ')[0];
                    idTipoContrato = getTipoContratoPorVencimento(clientData.data_vencimento);
                    idModelo = getModeloPlano(clientData.id_plano_ixc);
                    contratoPayload = {
                        'id_cliente': novoClienteId,
                        'id_vd_contrato': clientData.id_plano_ixc,
                        'id_vendedor': clientData.id_vendedor,
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
                    return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato', contratoPayload)];
                case 1:
                    contratoResponse = _a.sent();
                    //console.log("Resposta da API IXC (Etapa 2):", contratoResponse);
                    if (!contratoResponse || !contratoResponse.id) {
                        errorMessage = contratoResponse.message || contratoResponse.msg || 'Resposta inválida do IXC.';
                        throw new Error("Falha ao criar contrato: ".concat(errorMessage));
                    }
                    //console.log(`Etapa 2 OK: Contrato ID ${contratoResponse.id} criado.`);
                    return [2 /*return*/, contratoResponse.id];
            }
        });
    });
}
//plano de venda -> ID plano
var getGrupoRadiusPorPlano = function (idPlano) {
    var map = {
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
    return __awaiter(this, void 0, void 0, function () {
        var idGrupoRadius, tentativa, loginSufixo, login, senha, loginPayload, loginResponse, errorMessage, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    idGrupoRadius = getGrupoRadiusPorPlano(clientData.id_plano_ixc);
                    tentativa = 1;
                    _a.label = 1;
                case 1:
                    if (!(tentativa <= 50)) return [3 /*break*/, 6];
                    loginSufixo = (tentativa === 1) ? '' : "_".concat(tentativa);
                    login = "".concat(novoClienteId).concat(loginSufixo);
                    senha = "ivp@".concat(novoClienteId);
                    loginPayload = {
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
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/radusuarios', loginPayload)];
                case 3:
                    loginResponse = _a.sent();
                    //console.log("Resposta da API IXC (Etapa 3):", loginResponse);
                    if (loginResponse && loginResponse.id) {
                        //console.log(`Etapa 3 OK: Login PPPoE ID ${loginResponse.id} criado com o login '${login}'.`);
                        return [2 /*return*/, loginResponse.id];
                    }
                    errorMessage = (loginResponse.message || loginResponse.msg || 'Resposta inválida do IXC.').replace(/<br \/>/g, ' ');
                    if (errorMessage.includes("Login já existe!")) {
                        //console.log(`Login '${login}' já existe. Tentando próximo...`);
                    }
                    else {
                        throw new Error("Falha ao criar login PPPoE: ".concat(errorMessage));
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_6 = _a.sent();
                    if (error_6.message && error_6.message.includes("Login já existe!")) {
                        console.log("Login '".concat(login, "' j\u00E1 existe (erro capturado). Tentando pr\u00F3ximo..."));
                    }
                    else {
                        throw error_6;
                    }
                    return [3 /*break*/, 5];
                case 5:
                    tentativa++;
                    return [3 /*break*/, 1];
                case 6: throw new Error("Falha ao criar login PPPoE: Login já existe e 10 tentativas falharam.");
            }
        });
    });
}
var buildMensagemAtendimento = function (data, planoNome) {
    var telefones = (data.whatsapp && data.whatsapp !== data.telefone_celular)
        ? "".concat(data.telefone_celular, " / ").concat(data.whatsapp)
        : data.telefone_celular;
    var endereco = [
        data.endereco,
        data.numero,
        data.bairro
    ].filter(Boolean).join(', ');
    var enderecoCompleto = [
        endereco,
        data.complemento,
        data.referencia ? "(Ref: ".concat(data.referencia, ")") : ''
    ].filter(Boolean).join(' - ');
    var cpfLimpo = data.cnpj_cpf ? data.cnpj_cpf.replace(/\D/g, '') : '';
    var planoNomeFormatado = formatarNomePlano(data.plano_nome);
    return "\nOBS: ".concat(data.obs || 'Não informado', "\n\nTELEFONES: ").concat(telefones || 'Não informado', "\nPLANO: ").concat(planoNomeFormatado, "\nENDERE\u00C7O: ").concat(enderecoCompleto, "\n    ").trim().replace(/\n/g, '\r\n');
};
function abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId) {
    return __awaiter(this, void 0, void 0, function () {
        var mensagem_padrao, atendimentoPayload, atendimentoResponse, ticketId, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mensagem_padrao = buildMensagemAtendimento(clientData, nomePlano);
                    atendimentoPayload = {
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
                        "id_contrato": novoContratoId
                    };
                    return [4 /*yield*/, makeIxcRequest('POST', '/su_ticket', atendimentoPayload, 'incluir')];
                case 1:
                    atendimentoResponse = _a.sent();
                    ticketId = atendimentoResponse.id || atendimentoResponse.id_su_ticket;
                    if (!atendimentoResponse || !ticketId) {
                        errorMessage = (atendimentoResponse.message || atendimentoResponse.msg || 'Resposta inválida do IXC.').replace(/<br \/>/g, ' ');
                        throw new Error("Falha ao abrir atendimento/OS unificado: ".concat(errorMessage));
                    }
                    //console.log(`Etapa 4 OK: Atendimento/OS ID ${ticketId} criado.`);
                    return [2 /*return*/, ticketId.toString()];
            }
        });
    });
}
function obterIdFuncionarioIxc(usuario_intranet) {
    return __awaiter(this, void 0, void 0, function () {
        var error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!usuario_intranet)
                        return [2 /*return*/, "138"];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            database_1.LOCALHOST.query('SELECT id_funcionario_ixc FROM usuarios_intranet WHERE usuario = ? AND ativo = 1', [usuario_intranet], function (err, results) {
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
                        })];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    error_7 = _a.sent();
                    console.error("Erro geral ao consultar id_funcionario_ixc no banco local:", error_7);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, "138"]; // Fallback final
            }
        });
    });
}
function fecharTarefaOS(ticketId, idWflTarefaProxima, mensagem, idTecnico) {
    return __awaiter(this, void 0, void 0, function () {
        var osResponse, osAberta, payloadFechamento, resp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeIxcRequest('POST', '/su_oss_chamado', {
                        qtype: 'su_oss_chamado.id_ticket', query: ticketId, oper: '=', rp: '20', sortname: 'su_oss_chamado.id', sortorder: 'desc'
                    })];
                case 1:
                    osResponse = _a.sent();
                    if (!osResponse || !osResponse.registros || osResponse.registros.length === 0) {
                        throw new Error("Nenhuma OS encontrada para o ticket ".concat(ticketId));
                    }
                    osAberta = osResponse.registros.find(function (os) { return os.status === 'A' || os.status === 'EN'; });
                    if (!osAberta) {
                        //console.log(`Aviso: Nenhuma OS aberta encontrada no ticket ${ticketId}. O fluxo já pode ter avançado.`);
                        return [2 /*return*/];
                    }
                    payloadFechamento = {
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
                        "id_processo": osAberta.id_wfl_processo || "46",
                        "id_tarefa_atual": osAberta.id_wfl_tarefa,
                        "eh_tarefa_decisao": "N",
                        "sequencia_atual": "",
                        "proxima_sequencia_forcada": "",
                        "finaliza_processo_aux": "N",
                        "id_evento_status": "",
                        "id_proxima_tarefa": idWflTarefaProxima,
                        "id_proxima_tarefa_aux": ""
                    };
                    return [4 /*yield*/, makeIxcRequest('POST', '/su_oss_chamado_fechar', payloadFechamento)];
                case 2:
                    resp = _a.sent();
                    if (resp && resp.type === 'error') {
                        throw new Error("Erro no motor WFL ao avan\u00E7ar OS ".concat(osAberta.id, ": ").concat(resp.message.replace(/<br \/>/g, ' - ')));
                    }
                    //console.log(`Motor WFL disparado! OS ${osAberta.id} finalizada e próxima tarefa gerada com sucesso!`);
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 3:
                    //console.log(`Motor WFL disparado! OS ${osAberta.id} finalizada e próxima tarefa gerada com sucesso!`);
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function abrirTicketProcesso46(clienteId, contratoId, loginId, isNovoCliente, nomePlano, clientData, dadosTransferencia, idFuncionarioIxc, isTransferenciaParcial) {
    if (isTransferenciaParcial === void 0) { isTransferenciaParcial = false; }
    return __awaiter(this, void 0, void 0, function () {
        var mensagem_padrao, atendimentoPayload, response, ticketId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mensagem_padrao = '';
                    if (isNovoCliente) {
                        // Cliente novo
                        mensagem_padrao = "MUDAN\u00C7A DE TITULARIDADE VIA INTRANET\n\nCliente antigo:\n- Nome: ".concat(dadosTransferencia.oldClienteNome, "\n- C\u00F3digo: ").concat(dadosTransferencia.oldClienteId, "\n- Plano escolhido: ").concat(nomePlano);
                    }
                    else {
                        // Cliente antigo
                        mensagem_padrao = "MUDAN\u00C7A DE TITULARIDADE VIA INTRANET\n\nCliente novo:\n- Nome: ".concat(dadosTransferencia.newClienteNome, "\n- C\u00F3digo: ").concat(dadosTransferencia.newClienteId, "\n- Contatos: ").concat(dadosTransferencia.newTelefones, "\n -Plano escolhido: ").concat(nomePlano);
                    }
                    atendimentoPayload = {
                        "id_cliente": clienteId,
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
                    return [4 /*yield*/, makeIxcRequest('POST', '/su_ticket', atendimentoPayload, 'incluir')];
                case 1:
                    response = _a.sent();
                    ticketId = response.id || response.id_su_ticket;
                    if (!ticketId || response.type === 'error') {
                        throw new Error("Falha ao abrir ticket: ".concat(response.message || 'ID não retornado.'));
                    }
                    //console.log(`Ticket Processo 46 criado: ${ticketId}. Aguardando OS inicial nascer...`);
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 2:
                    //console.log(`Ticket Processo 46 criado: ${ticketId}. Aguardando OS inicial nascer...`);
                    _a.sent();
                    if (!!isNovoCliente) return [3 /*break*/, 9];
                    //console.log(`Avançando OSs do Cliente ANTIGO (Ticket ${ticketId})...`);
                    return [4 /*yield*/, fecharTarefaOS(ticketId, '398', 'Processo iniciado pela Intranet.', idFuncionarioIxc)];
                case 3:
                    //console.log(`Avançando OSs do Cliente ANTIGO (Ticket ${ticketId})...`);
                    _a.sent();
                    return [4 /*yield*/, fecharTarefaOS(ticketId, '399', 'Alteração efetuada com sucesso.', idFuncionarioIxc)];
                case 4:
                    _a.sent();
                    if (!isTransferenciaParcial) return [3 /*break*/, 6];
                    return [4 /*yield*/, fecharTarefaOS(ticketId, '403', 'Transferência PARCIAL de login efetuada. Contrato mantido ativo. Aguardando Retorno CRI.', idFuncionarioIxc)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, fecharTarefaOS(ticketId, '402', 'Login transferido para a nova titularidade. Aguardando conferência de cancelamento pelo Financeiro.', idFuncionarioIxc)];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8: return [3 /*break*/, 11];
                case 9: 
                //console.log(`Avançando OSs do Cliente NOVO (Ticket ${ticketId})...`);
                return [4 /*yield*/, fecharTarefaOS(ticketId, '460', 'Processo iniciado pela Intranet.', idFuncionarioIxc)];
                case 10:
                    //console.log(`Avançando OSs do Cliente NOVO (Ticket ${ticketId})...`);
                    _a.sent();
                    _a.label = 11;
                case 11: return [2 /*return*/, ticketId];
            }
        });
    });
}
function abrirChamadoSuporteInterno(mensagemErro) {
    return __awaiter(this, void 0, void 0, function () {
        var suportePayload, response, ticketId, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    suportePayload = {
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
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/su_ticket', suportePayload, 'incluir')];
                case 2:
                    response = _a.sent();
                    ticketId = response.id || response.id_su_ticket;
                    if (!ticketId)
                        throw new Error("ID do ticket não retornado.");
                    //console.log(`Chamado de suporte aberto com sucesso. ID: ${ticketId}`);
                    return [2 /*return*/, ticketId];
                case 3:
                    error_8 = _a.sent();
                    console.error("ALERTA CRÍTICO: Falha ao abrir chamado de suporte automático:", error_8.message);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function abrirChamadoNocCadastro(nomeNovoCondominio, clientData, clienteId) {
    return __awaiter(this, void 0, void 0, function () {
        var mensagem, suportePayload, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mensagem = "\nSOLICITA\u00C7\u00C3O DE CADASTRO DE NOVO CONDOM\u00CDNIO/LOCALIDADE\n-----------------------------------------------------\nO vendedor informou um local n\u00E3o cadastrado no sistema.\n\nNOME DO CONDOM\u00CDNIO/BAIRRO INFORMADO:\n>> ".concat(nomeNovoCondominio.toUpperCase(), " <<\n\nCLIENTE VINCULADO \u00C0 INSTALA\u00C7\u00C3O:\nID Cliente: ").concat(clienteId, "\nNome: ").concat(clientData.nome, "\nCPF/CNPJ: ").concat(clientData.cnpj_cpf, "\nEndere\u00E7o: ").concat(clientData.endereco, ", ").concat(clientData.numero, "\nBairro: ").concat(clientData.bairro, "\nCidade: ").concat(clientData.cidade, "\nComplemento: ").concat(clientData.complemento, "\n\n    ").trim();
                    suportePayload = {
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
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/su_ticket', suportePayload, 'incluir')];
                case 2:
                    _a.sent();
                    console.log("Chamado NOC criado com sucesso.");
                    return [3 /*break*/, 4];
                case 3:
                    error_9 = _a.sent();
                    console.error("Erro ao criar chamado NOC:", error_9.message);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function atualizarCliente(clientId, clientData, dataCadastro) {
    return __awaiter(this, void 0, void 0, function () {
        var today, usaEnderecoCliente, updatePayload, updateResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    today = dataCadastro.split(' ')[0];
                    usaEnderecoCliente = clientData.cep_cliente && clientData.cep_cliente !== '';
                    updatePayload = {
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
                    return [4 /*yield*/, makeIxcRequest('PUT', "/cliente/".concat(clientId), updatePayload, 'alterar')];
                case 1:
                    updateResponse = _a.sent();
                    console.log("Resposta da API IXC (Etapa 1.5 - Update):", updateResponse);
                    if (!updateResponse || (updateResponse.message && !updateResponse.message.includes('sucesso'))) {
                        //console.warn(`Aviso na Etapa 1.5: ${updateResponse.message || 'Resposta inesperada.'}`);
                    }
                    console.log("Etapa 1.5 OK: Cliente ID ".concat(clientId, " atualizado."));
                    return [2 /*return*/];
            }
        });
    });
}
function ajustarFinanceiroContrato(contratoId, valorAcordadoStr, idPlano) {
    return __awaiter(this, void 0, void 0, function () {
        var valorAcordado, targetSCM, targetSVA, produtosPayload, produtosResponse, _i, _a, produto, valorOriginal, descricaoProduto, diferenca, tipoServico, targetValor, valorAbsoluto, percentual, descontoPayload, acrescimoPayload, error_10;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Iniciando Etapa 5: Ajuste Financeiro no Contrato ".concat(contratoId, " (Plano Ref: ").concat(idPlano, ")"));
                    if (!valorAcordadoStr || valorAcordadoStr.trim() === '') {
                        console.log("Nenhum valor acordado informado.");
                        return [2 /*return*/];
                    }
                    valorAcordado = parseFloat(valorAcordadoStr.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
                    if (isNaN(valorAcordado) || valorAcordado <= 0) {
                        console.log("Valor acordado inv\u00E1lido: ".concat(valorAcordadoStr, "."));
                        return [2 /*return*/];
                    }
                    targetSCM = valorAcordado * 0.20;
                    targetSVA = valorAcordado * 0.80;
                    produtosPayload = {
                        "qtype": "vd_contratos_produtos.id_vd_contrato",
                        "query": idPlano,
                        "oper": "=",
                        "page": "1",
                        "rp": "1000",
                        "sortname": "vd_contratos_produtos.id",
                        "sortorder": "desc"
                    };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/vd_contratos_produtos', produtosPayload)];
                case 2:
                    produtosResponse = _b.sent();
                    if (!produtosResponse || !produtosResponse.registros || produtosResponse.registros.length === 0) {
                        //console.warn(`Nenhum produto encontrado no modelo do plano ${idPlano}.`);
                        return [2 /*return*/];
                    }
                    _i = 0, _a = produtosResponse.registros;
                    _b.label = 3;
                case 3:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    produto = _a[_i];
                    valorOriginal = parseFloat(produto.valor_unit);
                    descricaoProduto = produto.descricao ? produto.descricao.toUpperCase() : '';
                    diferenca = 0;
                    tipoServico = '';
                    targetValor = 0;
                    if (descricaoProduto.includes('SCM')) {
                        tipoServico = 'SCM';
                        targetValor = targetSCM;
                    }
                    else if (descricaoProduto.includes('SVA')) {
                        tipoServico = 'SVA';
                        targetValor = targetSVA;
                    }
                    else {
                        return [3 /*break*/, 7];
                    }
                    diferenca = targetValor - valorOriginal;
                    if (Math.abs(diferenca) < 0.01) {
                        console.log("".concat(tipoServico, ": Valor original (").concat(valorOriginal, ") igual ao alvo. Sem ajustes."));
                        return [3 /*break*/, 7];
                    }
                    valorAbsoluto = Math.abs(diferenca);
                    percentual = (valorAbsoluto / valorOriginal) * 100;
                    if (!(diferenca < 0)) return [3 /*break*/, 5];
                    descontoPayload = {
                        "id_contrato": contratoId,
                        "id_vd_contrato_produtos": produto.id,
                        "descricao": "Desconto Comercial ".concat(tipoServico),
                        "valor": valorAbsoluto.toFixed(2),
                        "data_validade": "",
                        "percentual": percentual.toString()
                    };
                    console.log("Aplicando DESCONTO em ".concat(tipoServico, ":"), descontoPayload);
                    return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato_descontos', descontoPayload)];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 5:
                    acrescimoPayload = {
                        "id_contrato": contratoId,
                        "id_vd_contrato_produtos": produto.id,
                        "descricao": "Acr\u00E9scimo Comercial ".concat(tipoServico),
                        "valor": valorAbsoluto.toFixed(2),
                        "data_validade": "",
                        "percentual": percentual.toString()
                    };
                    console.log("Aplicando ACR\u00C9SCIMO em ".concat(tipoServico, ":"), acrescimoPayload);
                    return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato_acrescimos', acrescimoPayload)];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_10 = _b.sent();
                    console.error("Erro ao ajustar financeiro: ".concat(error_10.message));
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
router.post('/cliente', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, existingClientId, condominio_novo_nome, clientData, dataCadastro, novoClienteId, nomePlano, planoInfo, e_1, novoContratoId, novoLoginId, novoTicketId, error_11, mensagemErroAutomatico, supportError_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, existingClientId = _a.existingClientId, condominio_novo_nome = _a.condominio_novo_nome, clientData = __rest(_a, ["existingClientId", "condominio_novo_nome"]);
                dataCadastro = getIxcDate();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 15, , 20]);
                nomePlano = "ID ".concat(clientData.id_plano_ixc);
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                return [4 /*yield*/, makeIxcRequest('POST', "/vd_contratos", { qtype: 'vd_contratos.id', query: clientData.id_plano_ixc, oper: '=' })];
            case 3:
                planoInfo = _b.sent();
                if (planoInfo && planoInfo.registros && planoInfo.registros.length > 0) {
                    nomePlano = planoInfo.registros[0].nome;
                }
                return [3 /*break*/, 5];
            case 4:
                e_1 = _b.sent();
                console.warn("Aviso: N\u00E3o foi poss\u00EDvel buscar o nome do plano ".concat(clientData.id_plano_ixc, ". Usando ID."));
                return [3 /*break*/, 5];
            case 5:
                if (!existingClientId) return [3 /*break*/, 7];
                //console.log(`Cliente ID ${existingClientId} fornecido. Pulando Etapa 1.`);
                novoClienteId = existingClientId;
                return [4 /*yield*/, atualizarCliente(novoClienteId, clientData, dataCadastro)];
            case 6:
                _b.sent();
                return [3 /*break*/, 9];
            case 7: return [4 /*yield*/, cadastrarCliente(clientData, dataCadastro)];
            case 8:
                //console.log("Nenhum Cliente ID fornecido. Executando Etapa 1 (Cadastro de Cliente)...");
                novoClienteId = _b.sent();
                _b.label = 9;
            case 9: return [4 /*yield*/, criarContrato(novoClienteId, clientData, dataCadastro, nomePlano)];
            case 10:
                novoContratoId = _b.sent();
                return [4 /*yield*/, criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro)];
            case 11:
                novoLoginId = _b.sent();
                return [4 /*yield*/, abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId)];
            case 12:
                novoTicketId = _b.sent();
                if (!(condominio_novo_nome && condominio_novo_nome.trim() !== '')) return [3 /*break*/, 14];
                return [4 /*yield*/, abrirChamadoNocCadastro(condominio_novo_nome, clientData, novoClienteId)];
            case 13:
                _b.sent();
                _b.label = 14;
            case 14:
                res.status(201).json({
                    success: true,
                    message: "Venda finalizada com sucesso! Cliente, Contrato, Login e Atendimento/OS criados.",
                    clienteId: novoClienteId,
                    contratoId: novoContratoId,
                    loginId: novoLoginId,
                    ticketId: novoTicketId
                });
                return [3 /*break*/, 20];
            case 15:
                error_11 = _b.sent();
                console.error('ERRO FATAL no cadastro BANDA LARGA:', error_11);
                _b.label = 16;
            case 16:
                _b.trys.push([16, 18, , 19]);
                mensagemErroAutomatico = "\nERRO AUTOM\u00C1TICO - FALHA NO CADASTRO BANDA LARGA\n-------------------------------------------------------\nDATA/HORA: ".concat(getIxcDate(), "\nCLIENTE TENTATIVA: ").concat(clientData.nome || 'N/A', "\nCPF/CNPJ: ").concat(clientData.cnpj_cpf || 'N/A', "\nVENDEDOR: ").concat(clientData.nome_vendedor || clientData.id_vendedor || 'N/A', "\n\nMENSAGEM DE ERRO DO SISTEMA:\n").concat(error_11.message || JSON.stringify(error_11), "\n\nDADOS RECEBIDOS (RESUMO):\nPlano: ").concat(clientData.id_plano_ixc, "\nEndere\u00E7o: ").concat(clientData.endereco, ", ").concat(clientData.numero, " - ").concat(clientData.bairro, "\nCondom\u00EDnio ID: ").concat(clientData.id_condominio, "\n            ").trim();
                return [4 /*yield*/, abrirChamadoSuporteInterno(mensagemErroAutomatico)];
            case 17:
                _b.sent();
                return [3 /*break*/, 19];
            case 18:
                supportError_1 = _b.sent();
                console.error("Não foi possível abrir o chamado de erro automático:", supportError_1);
                return [3 /*break*/, 19];
            case 19:
                res.status(500).json({
                    success: false,
                    error: error_11.message
                });
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/];
        }
    });
}); });
router.post('/cliente-corporativo', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, existingClientId, clientData, dataCadastro, novoClienteId, FILIAL_CORPORATIVO, OPCOES_CONTRATO_CORP, nomePlano, planoInfo, e_2, error_12, errorMsg, match, novoContratoId, novoLoginId, novoTicketId, error_13, mensagemErroAutomatico, supportError_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, existingClientId = _a.existingClientId, clientData = __rest(_a, ["existingClientId"]);
                dataCadastro = getIxcDate();
                FILIAL_CORPORATIVO = '1';
                OPCOES_CONTRATO_CORP = {
                    id_filial: '1',
                    id_carteira_cobranca: '10',
                    bloqueio_automatico: 'N',
                    base_geracao_tipo_doc: 'OPC',
                    tipo_doc_opc: '11',
                    tipo_doc_opc2: '6'
                };
                _b.label = 1;
            case 1:
                _b.trys.push([1, 20, , 25]);
                nomePlano = "ID ".concat(clientData.id_plano_ixc);
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                return [4 /*yield*/, makeIxcRequest('POST', "/vd_contratos", { qtype: 'vd_contratos.id', query: clientData.id_plano_ixc, oper: '=' })];
            case 3:
                planoInfo = _b.sent();
                if (planoInfo && planoInfo.registros && planoInfo.registros.length > 0) {
                    nomePlano = planoInfo.registros[0].nome;
                }
                return [3 /*break*/, 5];
            case 4:
                e_2 = _b.sent();
                console.warn("Aviso: erro ao buscar plano.");
                return [3 /*break*/, 5];
            case 5:
                if (!existingClientId) return [3 /*break*/, 7];
                novoClienteId = existingClientId;
                return [4 /*yield*/, atualizarCliente(novoClienteId, clientData, dataCadastro)];
            case 6:
                _b.sent();
                return [3 /*break*/, 15];
            case 7:
                _b.trys.push([7, 9, , 15]);
                return [4 /*yield*/, cadastrarCliente(clientData, dataCadastro, FILIAL_CORPORATIVO)];
            case 8:
                novoClienteId = _b.sent();
                return [3 /*break*/, 15];
            case 9:
                error_12 = _b.sent();
                errorMsg = error_12.message || '';
                if (!(errorMsg.includes('Este CNPJ/CPF já está Cadastrado') || errorMsg.includes('já está Cadastrado'))) return [3 /*break*/, 13];
                match = errorMsg.match(/ID:\s*(\d+)/);
                if (!(match && match[1])) return [3 /*break*/, 11];
                novoClienteId = match[1];
                console.log("Cliente recuperado ID: ".concat(novoClienteId, "."));
                return [4 /*yield*/, atualizarCliente(novoClienteId, clientData, dataCadastro)];
            case 10:
                _b.sent();
                return [3 /*break*/, 12];
            case 11: throw error_12;
            case 12: return [3 /*break*/, 14];
            case 13: throw error_12;
            case 14: return [3 /*break*/, 15];
            case 15: return [4 /*yield*/, criarContrato(novoClienteId, clientData, dataCadastro, nomePlano, OPCOES_CONTRATO_CORP)];
            case 16:
                novoContratoId = _b.sent();
                return [4 /*yield*/, criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro)];
            case 17:
                novoLoginId = _b.sent();
                return [4 /*yield*/, abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId)];
            case 18:
                novoTicketId = _b.sent();
                return [4 /*yield*/, ajustarFinanceiroContrato(novoContratoId, clientData.valor_acordado, clientData.id_plano_ixc)];
            case 19:
                _b.sent();
                res.status(201).json({
                    success: true,
                    message: "Venda finalizada com sucesso!",
                    clienteId: novoClienteId,
                    contratoId: novoContratoId,
                    loginId: novoLoginId,
                    ticketId: novoTicketId
                });
                return [3 /*break*/, 25];
            case 20:
                error_13 = _b.sent();
                console.error('ERRO FATAL no cadastro corporativo:', error_13);
                _b.label = 21;
            case 21:
                _b.trys.push([21, 23, , 24]);
                mensagemErroAutomatico = "\nERRO AUTOM\u00C1TICO - FALHA NO CADASTRO CORPORATIVO\n-------------------------------------------------------\nDATA/HORA: ".concat(getIxcDate(), "\nCLIENTE TENTATIVA: ").concat(clientData.nome || 'N/A', "\nCPF/CNPJ: ").concat(clientData.cnpj_cpf || 'N/A', "\nVENDEDOR: ").concat(clientData.nome_vendedor || clientData.id_vendedor || 'N/A', "\n\nMENSAGEM DE ERRO DO SISTEMA:\n").concat(error_13.message || JSON.stringify(error_13), "\n\nDADOS RECEBIDOS (RESUMO):\nPlano: ").concat(clientData.id_plano_ixc, "\nValor: ").concat(clientData.valor_acordado, "\nEndere\u00E7o Instala\u00E7\u00E3o: ").concat(clientData.endereco, ", ").concat(clientData.numero, " - ").concat(clientData.bairro, "\n            ").trim();
                return [4 /*yield*/, abrirChamadoSuporteInterno(mensagemErroAutomatico)];
            case 22:
                _b.sent();
                return [3 /*break*/, 24];
            case 23:
                supportError_2 = _b.sent();
                console.error("Não foi possível abrir o chamado de erro automático:", supportError_2);
                return [3 /*break*/, 24];
            case 24:
                res.status(500).json({ success: false, error: error_13.message });
                return [3 /*break*/, 25];
            case 25: return [2 /*return*/];
        }
    });
}); });
router.post('/consultar-cliente', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var cnpj_cpf, clientePayload, clienteResponse, cliente, contratoPayload, contratoResponse, contratos, financeiroPayload, financeiroResponse, contratosComAtraso_1, hoje_1, error_14;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                cnpj_cpf = req.body.cnpj_cpf;
                if (!cnpj_cpf) {
                    return [2 /*return*/, res.status(400).json({ error: 'CNPJ/CPF é obrigatório.' })];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                clientePayload = {
                    qtype: "cliente.cnpj_cpf",
                    query: cnpj_cpf,
                    oper: "=",
                    page: "1",
                    rp: "1",
                    sortname: "cliente.id",
                    sortorder: "asc"
                };
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente', clientePayload)];
            case 2:
                clienteResponse = _a.sent();
                if (!clienteResponse || clienteResponse.total === 0 || clienteResponse.total === "0") {
                    //console.log("Cliente não encontrado.");
                    return [2 /*return*/, res.json({ cliente: null, contratos: [], contratosComAtraso: [] })];
                }
                cliente = clienteResponse.registros[0];
                contratoPayload = {
                    qtype: "cliente_contrato.id_cliente",
                    query: cliente.id,
                    oper: "=",
                    page: "1",
                    rp: "200",
                    sortname: "cliente_contrato.id",
                    sortorder: "desc"
                };
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato', contratoPayload)];
            case 3:
                contratoResponse = _a.sent();
                contratos = (contratoResponse && contratoResponse.registros) ? contratoResponse.registros : [];
                financeiroPayload = {
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
                return [4 /*yield*/, makeIxcRequest('POST', '/fn_areceber', financeiroPayload)];
            case 4:
                financeiroResponse = _a.sent();
                contratosComAtraso_1 = new Set();
                hoje_1 = new Date();
                hoje_1.setHours(0, 0, 0, 0);
                if (financeiroResponse && financeiroResponse.total > 0) {
                    financeiroResponse.registros.forEach(function (titulo) {
                        var vencimento = new Date(titulo.data_vencimento);
                        if (titulo.id_contrato && vencimento < hoje_1) {
                            contratosComAtraso_1.add(titulo.id_contrato);
                        }
                    });
                }
                //console.log(`Contratos com atraso: ${Array.from(contratosComAtraso)}`);
                res.json({
                    cliente: cliente,
                    contratos: contratos,
                    contratosComAtraso: Array.from(contratosComAtraso_1)
                });
                return [3 /*break*/, 6];
            case 5:
                error_14 = _a.sent();
                console.error("Erro ao consultar cliente:", error_14.message);
                res.status(500).json({ error: "Erro ao consultar cliente: ".concat(error_14.message) });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.post('/consultar-endereco', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, cep, numero, payload, response, clientesComStatus, error_15;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, cep = _a.cep, numero = _a.numero;
                if (!cep) {
                    return [2 /*return*/, res.status(400).json({ error: 'O CEP é obrigatório.' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                payload = {
                    qtype: "cliente.cep",
                    query: "".concat(cep),
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
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente', payload)];
            case 2:
                response = _b.sent();
                if (!(response && response.registros && response.registros.length > 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, Promise.all(response.registros.map(function (cliente) { return __awaiter(void 0, void 0, void 0, function () {
                        var temAtraso;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, getFinancialStatus(cliente.id)];
                                case 1:
                                    temAtraso = _a.sent();
                                    return [2 /*return*/, __assign(__assign({}, cliente), { tem_atraso: temAtraso })];
                            }
                        });
                    }); }))];
            case 3:
                clientesComStatus = _b.sent();
                res.json(clientesComStatus);
                return [3 /*break*/, 5];
            case 4:
                res.json(response.registros || []);
                _b.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                error_15 = _b.sent();
                console.error("Erro ao consultar por endereço:", error_15.message);
                res.status(500).json({ error: "Erro ao consultar endere\u00E7o: ".concat(error_15.message) });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
router.post('/abrir-chamado-suporte', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var mensagem, msgFinal, ticketId, error_16;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                mensagem = req.body.mensagem;
                if (!mensagem)
                    return [2 /*return*/, res.status(400).json({ error: 'Mensagem obrigatória.' })];
                msgFinal = "[ABERTURA MANUAL]\n\n".concat(mensagem);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, abrirChamadoSuporteInterno(msgFinal)];
            case 2:
                ticketId = _a.sent();
                if (ticketId) {
                    res.json({ success: true, id_ticket: ticketId });
                }
                else {
                    throw new Error("Falha ao criar ticket.");
                }
                return [3 /*break*/, 4];
            case 3:
                error_16 = _a.sent();
                res.status(500).json({ error: error_16.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
var cidadesCache = [];
var ufsCache = [];
router.get('/cidades', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var payload, response, error_17;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (cidadesCache.length > 0)
                    return [2 /*return*/, res.json(cidadesCache)];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                payload = {
                    "qtype": "cidade.id", "query": "1", "oper": ">=", "page": "1", "rp": "6000", "sortname": "cidade.id", "sortorder": "desc"
                };
                return [4 /*yield*/, makeIxcRequest('POST', '/cidade', payload, 'listar')];
            case 2:
                response = _a.sent();
                if (response && response.registros) {
                    cidadesCache = response.registros.map(function (c) { return ({
                        id: c.id,
                        nome: c.nome,
                        uf: c.uf
                    }); });
                    res.json(cidadesCache);
                }
                else {
                    res.json([]);
                }
                return [3 /*break*/, 4];
            case 3:
                error_17 = _a.sent();
                console.error("Erro ao buscar cidades:", error_17.message);
                res.status(500).json({ error: "Falha ao buscar cidades" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get('/ufs', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var payload, response, error_18;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (ufsCache.length > 0)
                    return [2 /*return*/, res.json(ufsCache)];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                payload = {
                    "qtype": "uf.id", "query": "1", "oper": ">=", "page": "1", "rp": "2000", "sortname": "uf.id", "sortorder": "desc"
                };
                return [4 /*yield*/, makeIxcRequest('POST', '/uf', payload, 'listar')];
            case 2:
                response = _a.sent();
                if (response && response.registros) {
                    ufsCache = response.registros.map(function (u) { return ({
                        id: u.id,
                        sigla: u.sigla,
                        nome: u.nome
                    }); });
                    res.json(ufsCache);
                }
                else {
                    res.json([]);
                }
                return [3 /*break*/, 4];
            case 3:
                error_18 = _a.sent();
                console.error("Erro ao buscar UFs:", error_18.message);
                res.status(500).json({ error: "Falha ao buscar UFs" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get('/logins-contrato/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_19;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, makeIxcRequest('POST', '/radusuarios', {
                        qtype: 'radusuarios.id_contrato', query: req.params.id, oper: '=', rp: '100'
                    })];
            case 1:
                response = _a.sent();
                res.json(response.registros || []);
                return [3 /*break*/, 3];
            case 2:
                error_19 = _a.sent();
                res.status(500).json({ error: error_19.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
function buscarDetalhesContratoELoginAntigo(contratoId, loginSelecionadoId) {
    return __awaiter(this, void 0, void 0, function () {
        var contratoOldResponse, contratoAntigo, queryLogin, loginOldResponse, loginAntigo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato', { qtype: 'cliente_contrato.id', query: contratoId, oper: '=' })];
                case 1:
                    contratoOldResponse = _a.sent();
                    if (!contratoOldResponse || !contratoOldResponse.registros || contratoOldResponse.registros.length === 0) {
                        throw new Error("Contrato antigo não encontrado no IXC.");
                    }
                    contratoAntigo = contratoOldResponse.registros[0];
                    queryLogin = { qtype: 'radusuarios.id_contrato', query: contratoId, oper: '=' };
                    if (loginSelecionadoId) {
                        queryLogin = { qtype: 'radusuarios.id', query: loginSelecionadoId, oper: '=' };
                    }
                    return [4 /*yield*/, makeIxcRequest('POST', '/radusuarios', queryLogin)];
                case 2:
                    loginOldResponse = _a.sent();
                    if (!loginOldResponse || !loginOldResponse.registros || loginOldResponse.registros.length === 0) {
                        throw new Error("Login PPPoE não encontrado.");
                    }
                    loginAntigo = loginOldResponse.registros[0];
                    return [2 /*return*/, { contratoAntigo: contratoAntigo, loginAntigo: loginAntigo }];
            }
        });
    });
}
function transferirLoginPPPoE(loginAntigo, novoClienteId, novoContratoId, idGrupoRadius, dataCadastro, clientData) {
    return __awaiter(this, void 0, void 0, function () {
        var loginAntigoString, macAntigo, novoNomeAntigo, payloadRenomear, responsePut, loginPayload, loginResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    loginAntigoString = loginAntigo.login;
                    macAntigo = loginAntigo.mac;
                    novoNomeAntigo = "".concat(loginAntigoString, "-para-").concat(novoClienteId);
                    payloadRenomear = {
                        "autenticacao": loginAntigo.autenticacao || "L",
                        "tipo_conexao_mapa": loginAntigo.tipo_conexao_mapa || "58",
                        "id_cliente": loginAntigo.id_cliente,
                        "id_contrato": loginAntigo.id_contrato,
                        "id_grupo": loginAntigo.id_grupo,
                        "login": novoNomeAntigo,
                        "senha_md5": loginAntigo.senha_md5 || "N",
                        "senha": loginAntigo.senha || "ivp@".concat(loginAntigo.id_cliente),
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
                    return [4 /*yield*/, makeIxcRequest('PUT', "/radusuarios/".concat(loginAntigo.id), payloadRenomear, 'alterar')];
                case 1:
                    responsePut = _a.sent();
                    if (responsePut && responsePut.type === 'error') {
                        throw new Error("Erro ao renomear login antigo no IXC: ".concat(responsePut.message));
                    }
                    //console.log(`Comando PUT executado com sucesso no IXC. Novo nome: ${novoNomeAntigo}.`);
                    //console.log("Aguardando 3 segundos para o cache do banco de dados do IXC...");
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 2:
                    //console.log(`Comando PUT executado com sucesso no IXC. Novo nome: ${novoNomeAntigo}.`);
                    //console.log("Aguardando 3 segundos para o cache do banco de dados do IXC...");
                    _a.sent();
                    loginPayload = {
                        'id_cliente': novoClienteId,
                        'id_contrato': novoContratoId,
                        'login': loginAntigoString,
                        'senha': loginAntigo.senha || "ivp@".concat(loginAntigo.id_cliente),
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
                    return [4 /*yield*/, makeIxcRequest('POST', '/radusuarios', loginPayload)];
                case 3:
                    loginResponse = _a.sent();
                    if (loginResponse && loginResponse.type === 'error') {
                        throw new Error("API IXC Recusou a cria\u00E7\u00E3o do PPPoE: ".concat(loginResponse.message));
                    }
                    if (loginResponse && loginResponse.id) {
                        //console.log(`Novo login criado com sucesso. ID: ${loginResponse.id} | Nome: ${loginAntigoString}`);
                        return [2 /*return*/, loginResponse.id];
                    }
                    throw new Error(loginResponse ? JSON.stringify(loginResponse) : 'Retorno vazio ao criar login');
            }
        });
    });
}
function desconectarLoginPPPoE(loginId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_20;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/desconectar_clientes', { id: loginId })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_20 = _a.sent();
                    console.warn("Aviso: Falha ao enviar comando de desconex\u00E3o para o login ".concat(loginId, ". (O cliente pode j\u00E1 estar offline). Erro: ").concat(error_20.message));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function transferirOnuFibra(loginAntigoId, novoLoginId, novoContratoId) {
    return __awaiter(this, void 0, void 0, function () {
        var fibraResp, fibra, payloadFibra, putResp, error_21;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                            qtype: 'radpop_radio_cliente_fibra.id_login',
                            query: loginAntigoId,
                            oper: '=',
                            rp: '1'
                        })];
                case 1:
                    fibraResp = _a.sent();
                    if (!(fibraResp && fibraResp.registros && fibraResp.registros.length > 0)) return [3 /*break*/, 3];
                    fibra = fibraResp.registros[0];
                    payloadFibra = __assign(__assign({}, fibra), { id_login: novoLoginId, id_contrato: novoContratoId });
                    return [4 /*yield*/, makeIxcRequest('PUT', "/radpop_radio_cliente_fibra/".concat(fibra.id), payloadFibra, 'alterar')];
                case 2:
                    putResp = _a.sent();
                    if (putResp && putResp.type === 'error') {
                        throw new Error("IXC recusou a transfer\u00EAncia da ONU: ".concat(putResp.message));
                    }
                    return [3 /*break*/, 3];
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_21 = _a.sent();
                    console.error("Erro ao transferir v\u00EDnculo da ONU de fibra: ".concat(error_21.message));
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function ativarContrato(contratoId) {
    return __awaiter(this, void 0, void 0, function () {
        var resp, error_22;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, makeIxcRequest('POST', '/cliente_contrato_ativar_cliente', { id_contrato: contratoId })];
                case 1:
                    resp = _a.sent();
                    if (resp && resp.type === 'error') {
                        throw new Error(resp.message);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_22 = _a.sent();
                    console.error("Falha ao ativar o contrato ".concat(contratoId, ": ").concat(error_22.message));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function cancelarContratoAntigo(contratoId) {
    return __awaiter(this, void 0, void 0, function () {
        var payloadCancelamento;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    payloadCancelamento = {
                        status: 'C',
                        status_internet: 'D',
                        motivo_inclusao: 'C',
                        obs: 'Cancelado via automação de Mudança de Titularidade.',
                    };
                    return [4 /*yield*/, makeIxcRequest('PUT', "/cliente_contrato/".concat(contratoId), payloadCancelamento, 'alterar')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
router.post('/mudanca-titularidade', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, contratoAntigoId, existingClientId, loginSelecionadoId, isTransferenciaParcial, clientData, dataCadastro, _b, contratoAntigo, loginAntigo, clienteOldResponse, clienteAntigo, nomePlano, planoInfo, e_3, novoClienteId, novoContratoId, idGrupoRadius, novoLoginId, telefonesNovos, dadosTransferencia, idFuncionarioIxc, ticketAntigoId, ticketNovoId, error_23;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, contratoAntigoId = _a.contratoAntigoId, existingClientId = _a.existingClientId, loginSelecionadoId = _a.loginSelecionadoId, isTransferenciaParcial = _a.isTransferenciaParcial, clientData = __rest(_a, ["contratoAntigoId", "existingClientId", "loginSelecionadoId", "isTransferenciaParcial"]);
                dataCadastro = getIxcDate();
                _c.label = 1;
            case 1:
                _c.trys.push([1, 22, , 23]);
                return [4 /*yield*/, buscarDetalhesContratoELoginAntigo(contratoAntigoId, loginSelecionadoId)];
            case 2:
                _b = _c.sent(), contratoAntigo = _b.contratoAntigo, loginAntigo = _b.loginAntigo;
                return [4 /*yield*/, makeIxcRequest('POST', '/cliente', { qtype: 'cliente.id', query: contratoAntigo.id_cliente, oper: '=' })];
            case 3:
                clienteOldResponse = _c.sent();
                clienteAntigo = {};
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
                nomePlano = "ID ".concat(clientData.id_plano_ixc);
                _c.label = 4;
            case 4:
                _c.trys.push([4, 6, , 7]);
                return [4 /*yield*/, makeIxcRequest('POST', "/vd_contratos", { qtype: 'vd_contratos.id', query: clientData.id_plano_ixc, oper: '=' })];
            case 5:
                planoInfo = _c.sent();
                if (planoInfo && planoInfo.registros && planoInfo.registros.length > 0) {
                    nomePlano = planoInfo.registros[0].nome;
                }
                return [3 /*break*/, 7];
            case 6:
                e_3 = _c.sent();
                console.warn("Aviso: erro ao buscar plano.");
                return [3 /*break*/, 7];
            case 7:
                novoClienteId = void 0;
                if (!existingClientId) return [3 /*break*/, 9];
                //console.log(`Mudança Titularidade: Atualizando Cliente existente ID ${existingClientId}`);
                novoClienteId = existingClientId;
                return [4 /*yield*/, atualizarCliente(novoClienteId, clientData, dataCadastro)];
            case 8:
                _c.sent();
                return [3 /*break*/, 11];
            case 9: return [4 /*yield*/, cadastrarCliente(clientData, dataCadastro)];
            case 10:
                //console.log(`Mudança Titularidade: Cadastrando Novo Cliente`);
                novoClienteId = _c.sent();
                _c.label = 11;
            case 11: return [4 /*yield*/, criarContrato(novoClienteId, clientData, dataCadastro, nomePlano)];
            case 12:
                novoContratoId = _c.sent();
                idGrupoRadius = getGrupoRadiusPorPlano(clientData.id_plano_ixc) || '2006';
                return [4 /*yield*/, transferirLoginPPPoE(loginAntigo, novoClienteId, novoContratoId, idGrupoRadius, dataCadastro, clientData)];
            case 13:
                novoLoginId = _c.sent();
                return [4 /*yield*/, transferirOnuFibra(loginAntigo.id, novoLoginId, novoContratoId)];
            case 14:
                _c.sent();
                if (!(contratoAntigo.status === 'A')) return [3 /*break*/, 16];
                //console.log(`O contrato antigo era 'Ativo'. Engatilhando ativação do novo contrato...`);
                return [4 /*yield*/, ativarContrato(novoContratoId)];
            case 15:
                //console.log(`O contrato antigo era 'Ativo'. Engatilhando ativação do novo contrato...`);
                _c.sent();
                return [3 /*break*/, 16];
            case 16:
                telefonesNovos = (clientData.whatsapp && clientData.whatsapp !== clientData.telefone_celular)
                    ? "".concat(clientData.telefone_celular, " / ").concat(clientData.whatsapp)
                    : clientData.telefone_celular;
                dadosTransferencia = {
                    oldClienteId: contratoAntigo.id_cliente,
                    oldClienteNome: clienteAntigo.razao || 'Não informado',
                    newClienteId: novoClienteId,
                    newClienteNome: clientData.nome,
                    newTelefones: telefonesNovos
                };
                return [4 /*yield*/, obterIdFuncionarioIxc(clientData.usuario_intranet)];
            case 17:
                idFuncionarioIxc = _c.sent();
                return [4 /*yield*/, abrirTicketProcesso46(loginAntigo.id_cliente, contratoAntigoId, loginAntigo.id, false, nomePlano, clientData, dadosTransferencia, idFuncionarioIxc, isTransferenciaParcial)];
            case 18:
                ticketAntigoId = _c.sent();
                return [4 /*yield*/, abrirTicketProcesso46(novoClienteId, novoContratoId, novoLoginId, true, nomePlano, clientData, dadosTransferencia, idFuncionarioIxc)];
            case 19:
                ticketNovoId = _c.sent();
                //console.log("Iniciando rotina de desconexão forçada dos logins...");
                return [4 /*yield*/, desconectarLoginPPPoE(loginAntigo.id)];
            case 20:
                //console.log("Iniciando rotina de desconexão forçada dos logins...");
                _c.sent();
                return [4 /*yield*/, desconectarLoginPPPoE(novoLoginId)];
            case 21:
                _c.sent();
                res.status(201).json({
                    success: true,
                    message: "Mudança de Titularidade concluída com sucesso!",
                    clienteId: novoClienteId,
                    contratoId: novoContratoId,
                    loginId: novoLoginId,
                    ticketId: ticketNovoId
                });
                return [3 /*break*/, 23];
            case 22:
                error_23 = _c.sent();
                console.error('ERRO FATAL na Mudança de Titularidade:', error_23);
                res.status(500).json({ success: false, error: error_23.message });
                return [3 /*break*/, 23];
            case 23: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
