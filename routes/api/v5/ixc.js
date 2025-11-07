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
router.get('/vendedores', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var params, ixcResponse, vendedores, error_2;
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
                error_2 = _a.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/planos-home', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var params, ixcResponse, planosHome, error_3;
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
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
function cadastrarCliente(clientData, dataCadastro) {
    return __awaiter(this, void 0, void 0, function () {
        var today, clientePayload, clienteResponse, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Iniciando Etapa 1: Cadastro do Cliente...");
                    today = dataCadastro.split(' ')[0];
                    clientePayload = {
                        'ativo': 'S', 'tipo_pessoa': 'F', 'tipo_cliente_scm': '01', 'pais': 'Brasil',
                        'nacionalidade': 'Brasileiro', 'tipo_assinante': '3', 'id_tipo_cliente': '6',
                        'contribuinte_icms': 'N', 'filial_id': '3', 'filtra_filial': 'S', 'tipo_localidade': 'U',
                        'acesso_automatico_central': 'P', 'alterar_senha_primeiro_acesso': 'P', 'senha_hotsite_md5': 'N',
                        'hotsite_acesso': '0', 'crm': 'S', 'status_prospeccao': 'V', 'cadastrado_via_viabilidade': 'N',
                        'participa_cobranca': 'S', 'participa_pre_cobranca': 'S', 'cob_envia_email': 'S',
                        'cob_envia_sms': 'S', 'tipo_pessoa_titular_conta': 'F', 'orgao_publico': 'N',
                        'iss_classificacao_padrao': '99', 'data_cadastro': today, 'ultima_atualizacao': dataCadastro,
                        'razao': clientData.nome,
                        'cnpj_cpf': formatarCPF(clientData.cnpj_cpf),
                        'ie_identidade': clientData.ie_identidade, 'data_nascimento': clientData.data_nascimento,
                        'fone': clientData.telefone_celular, 'telefone_celular': clientData.telefone_celular,
                        'whatsapp': clientData.whatsapp, 'email': clientData.email,
                        'cep': clientData.cep,
                        'endereco': clientData.endereco, 'numero': clientData.numero, 'complemento': clientData.complemento,
                        'bairro': clientData.bairro, 'cidade': clientData.cidade, 'uf': clientData.uf,
                        'bloco': clientData.bloco, 'apartamento': clientData.apartamento,
                        'referencia': clientData.referencia, 'id_condominio': clientData.id_condominio,
                        'id_vendedor': clientData.id_vendedor, 'obs': clientData.obs,
                        'hotsite_email': clientData.cnpj_cpf.replace(/\D/g, ''),
                        'senha': clientData.cnpj_cpf.replace(/\D/g, '')
                    };
                    return [4 /*yield*/, makeIxcRequest('POST', '/cliente', clientePayload)];
                case 1:
                    clienteResponse = _a.sent();
                    console.log("Resposta da API IXC (Etapa 1):", clienteResponse);
                    if (!clienteResponse || !clienteResponse.id) {
                        errorMessage = clienteResponse.message || clienteResponse.mensagem || clienteResponse.msg || 'Resposta inválida do IXC.';
                        throw new Error("Falha ao cadastrar cliente: ".concat(errorMessage));
                    }
                    console.log("Etapa 1 OK: Cliente ID ".concat(clienteResponse.id, " criado."));
                    return [2 /*return*/, clienteResponse.id];
            }
        });
    });
}
function criarContrato(novoClienteId, clientData, dataCadastro, nomePlano) {
    return __awaiter(this, void 0, void 0, function () {
        var today, idTipoContrato, idModelo, contratoPayload, contratoResponse, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Iniciando Etapa 2: Criação do Contrato...");
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
                        'id_filial': '3',
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
                        'id_carteira_cobranca': '11',
                        'cc_previsao': 'P',
                        'tipo_cobranca': 'P',
                        'renovacao_automatica': 'S',
                        'base_geracao_tipo_doc': 'P',
                        'bloqueio_automatico': 'S',
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
                    console.log("Resposta da API IXC (Etapa 2):", contratoResponse);
                    if (!contratoResponse || !contratoResponse.id) {
                        errorMessage = contratoResponse.message || contratoResponse.msg || 'Resposta inválida do IXC.';
                        throw new Error("Falha ao criar contrato: ".concat(errorMessage));
                    }
                    console.log("Etapa 2 OK: Contrato ID ".concat(contratoResponse.id, " criado."));
                    return [2 /*return*/, contratoResponse.id];
            }
        });
    });
}
var getGrupoRadiusPorPlano = function (idPlano) {
    var map = {
        '7878': '3336',
        '7879': '3337',
        '7881': '3339',
        '7887': '3346',
        '8001': '6381',
        '8000': '6426',
        '7999': '6561'
    };
    return map[idPlano];
};
function criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro) {
    return __awaiter(this, void 0, void 0, function () {
        var idGrupoRadius, tentativa, loginSufixo, login, senha, loginPayload, loginResponse, errorMessage, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    idGrupoRadius = getGrupoRadiusPorPlano(clientData.id_plano_ixc);
                    tentativa = 1;
                    _a.label = 1;
                case 1:
                    if (!(tentativa <= 10)) return [3 /*break*/, 6];
                    loginSufixo = (tentativa === 1) ? '' : "_".concat(tentativa);
                    login = "".concat(novoClienteId).concat(loginSufixo);
                    senha = "ivp@".concat(login);
                    console.log("Iniciando Etapa 3 (Tentativa ".concat(tentativa, "): Cria\u00E7\u00E3o do Login PPPoE '").concat(login, "'..."));
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
                        'id_filial': '3',
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
                    console.log("Resposta da API IXC (Etapa 3):", loginResponse);
                    if (loginResponse && loginResponse.id) {
                        console.log("Etapa 3 OK: Login PPPoE ID ".concat(loginResponse.id, " criado com o login '").concat(login, "'."));
                        return [2 /*return*/, loginResponse.id];
                    }
                    errorMessage = (loginResponse.message || loginResponse.msg || 'Resposta inválida do IXC.').replace(/<br \/>/g, ' ');
                    if (errorMessage.includes("Login já existe!")) {
                        console.log("Login '".concat(login, "' j\u00E1 existe. Tentando pr\u00F3ximo..."));
                    }
                    else {
                        throw new Error("Falha ao criar login PPPoE: ".concat(errorMessage));
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_4 = _a.sent();
                    if (error_4.message && error_4.message.includes("Login já existe!")) {
                        console.log("Login '".concat(login, "' j\u00E1 existe (erro capturado). Tentando pr\u00F3ximo..."));
                    }
                    else {
                        throw error_4;
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
    return "\nVenda finalizada com sucesso! Cliente, Contrato, Login, Atendimento e OS criados.\n\nOBS: ".concat(data.obs || 'Não informado', "\n\nNOME COMPLETO: ").concat(data.nome, "\nN\u00DAMERO DO CPF: ").concat(cpfLimpo, "\nN\u00DAMERO DO RG: ").concat(data.ie_identidade, "\nDATA DE NASCIMENTO: ").concat(data.data_nascimento, "\nDOIS TELEFONES DE CONTATO: ").concat(telefones || 'Não informado', "\nE-MAIL COMPLETO: ").concat(data.email, "\nPLANO ESCOLHIDO: ").concat(planoNome, "\nDATA DE VENCIMENTO (5, 10, 15 OU 20): ").concat(data.data_vencimento, "\nENDERE\u00C7O COMPLETO COM PONTO DE REFER\u00CANCIA: ").concat(enderecoCompleto, "\n    ").trim().replace(/\n/g, '\r\n');
};
function abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId) {
    return __awaiter(this, void 0, void 0, function () {
        var mensagem_padrao, atendimentoPayload, atendimentoResponse, ticketId, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Iniciando Etapa 4: Abertura de Atendimento/OS Unificado...");
                    mensagem_padrao = buildMensagemAtendimento(clientData, nomePlano);
                    atendimentoPayload = {
                        "id_cliente": novoClienteId,
                        "assunto_ticket": "1",
                        "id_assunto": "1",
                        "id_wfl_processo": "3",
                        "titulo": "INSTALAÇÃO - BANDA LARGA",
                        "origem_endereco": "CC",
                        "status": "OSAB",
                        "su_status": "EP",
                        "id_ticket_setor": "4",
                        "prioridade": "M",
                        "id_responsavel_tecnico": "138",
                        "id_filial": "3",
                        "id_usuarios": "61",
                        "tipo": "C",
                        "menssagem": mensagem_padrao,
                        "id_login": novoLoginId,
                        "id_contrato": novoContratoId
                    };
                    return [4 /*yield*/, makeIxcRequest('POST', '/su_ticket', atendimentoPayload, 'incluir')];
                case 1:
                    atendimentoResponse = _a.sent();
                    console.log("Resposta da API IXC (Etapa 4):", atendimentoResponse);
                    ticketId = atendimentoResponse.id || atendimentoResponse.id_su_ticket;
                    if (!atendimentoResponse || !ticketId) {
                        errorMessage = (atendimentoResponse.message || atendimentoResponse.msg || 'Resposta inválida do IXC.').replace(/<br \/>/g, ' ');
                        throw new Error("Falha ao abrir atendimento/OS unificado: ".concat(errorMessage));
                    }
                    console.log("Etapa 4 OK: Atendimento/OS ID ".concat(ticketId, " criado."));
                    return [2 /*return*/, ticketId.toString()];
            }
        });
    });
}
router.post('/cliente', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, existingClientId, clientData, dataCadastro, novoClienteId, nomePlano, planoInfo, e_1, novoContratoId, novoLoginId, novoTicketId, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, existingClientId = _a.existingClientId, clientData = __rest(_a, ["existingClientId"]);
                dataCadastro = getIxcDate();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 12, , 13]);
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
                if (!existingClientId) return [3 /*break*/, 6];
                console.log("Cliente ID ".concat(existingClientId, " fornecido. Pulando Etapa 1."));
                novoClienteId = existingClientId;
                return [3 /*break*/, 8];
            case 6:
                console.log("Nenhum Cliente ID fornecido. Executando Etapa 1 (Cadastro de Cliente)...");
                return [4 /*yield*/, cadastrarCliente(clientData, dataCadastro)];
            case 7:
                novoClienteId = _b.sent(); // Esta linha falhará se o CPF existir
                _b.label = 8;
            case 8: return [4 /*yield*/, criarContrato(novoClienteId, clientData, dataCadastro, nomePlano)];
            case 9:
                novoContratoId = _b.sent();
                return [4 /*yield*/, criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro)];
            case 10:
                novoLoginId = _b.sent();
                return [4 /*yield*/, abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId)];
            case 11:
                novoTicketId = _b.sent();
                res.status(201).json({
                    success: true,
                    message: "Venda finalizada com sucesso! Cliente, Contrato, Login e Atendimento/OS criados.",
                    clienteId: novoClienteId,
                    contratoId: novoContratoId,
                    loginId: novoLoginId,
                    ticketId: novoTicketId
                });
                return [3 /*break*/, 13];
            case 12:
                error_5 = _b.sent();
                console.error('Erro no fluxo de cadastro:', error_5);
                res.status(500).json({
                    success: false,
                    error: error_5.message
                });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
