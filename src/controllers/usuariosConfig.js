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
exports.UsuariosDB = void 0;
// src/controllers/usuariosConfig.ts
var database_1 = require("../../api/database");
var bcrypt = require("bcrypt");
var axios_1 = require("axios");
var saltRounds = 10;
exports.UsuariosDB = {
    buscarPorUsuario: function (usuario) {
        return new Promise(function (resolve, reject) {
            var QUERY = "SELECT * FROM usuarios_intranet WHERE usuario = ? AND ativo = 1 LIMIT 1";
            database_1.LOCALHOST.query(QUERY, [usuario], function (err, results) {
                if (err)
                    reject(err);
                resolve(results && results.length > 0 ? results[0] : null);
            });
        });
    },
    sincronizarUsuarioAD: function (nome, usuario, senhaAberta, grupo) { return __awaiter(void 0, void 0, void 0, function () {
        var hash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, bcrypt.hash(senhaAberta, saltRounds)];
                case 1:
                    hash = _a.sent();
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            var QUERY = "\n                INSERT INTO usuarios_intranet (nome, usuario, senha, grupo, origem, ativo)\n                VALUES (?, ?, ?, ?, 'AD', 1)\n                ON DUPLICATE KEY UPDATE \n                    nome = VALUES(nome),\n                    senha = VALUES(senha), \n                    grupo = VALUES(grupo),\n                    ultimo_login = NOW()\n            ";
                            database_1.LOCALHOST.query(QUERY, [nome, usuario, hash, grupo], function (err) {
                                if (err)
                                    reject(err);
                                resolve();
                            });
                        })];
            }
        });
    }); },
    sincronizarIXC: function (username) { return __awaiter(void 0, void 0, void 0, function () {
        var user, url, headers, payload, response, ixcUser, idUsuarioIxc_1, idFuncionarioIxc_1, statusIxc_1, idGrupoIxc_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.UsuariosDB.buscarPorUsuario(username)];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        //console.log(`[DEBUG IXC] Falha: Usuário '${username}' não encontrado na tabela usuarios_intranet.`);
                        throw new Error('Usuário não encontrado na Intranet');
                    }
                    //console.log(`[DEBUG IXC] Usuário local encontrado (ID: ${user.id}). Status atual: id_usuario_ixc=${user.id_usuario_ixc}, id_funcionario_ixc=${user.id_funcionario_ixc}`);
                    if (user.id_usuario_ixc !== null && user.id_funcionario_ixc !== null) {
                        //console.log(`[DEBUG IXC] Usuário já possui vínculo com o IXC. Sincronização ignorada.`);
                        return [2 /*return*/, user];
                    }
                    url = "".concat(process.env.IXC_API_URL, "/webservice/v1/usuarios");
                    headers = {
                        'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN),
                        'Content-Type': 'application/json',
                        'ixcsoft': 'listar'
                    };
                    payload = {
                        qtype: "usuarios.email",
                        query: "".concat(username, "@"),
                        oper: "L",
                        page: "1",
                        rp: "1"
                    };
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 7, , 8]);
                    return [4 /*yield*/, axios_1.default.post(url, payload, { headers: headers })];
                case 3:
                    response = _a.sent();
                    if (!(response.data && response.data.registros && response.data.registros.length > 0)) return [3 /*break*/, 5];
                    ixcUser = response.data.registros[0];
                    idUsuarioIxc_1 = ixcUser.id;
                    idFuncionarioIxc_1 = ixcUser.funcionario;
                    statusIxc_1 = ixcUser.status;
                    idGrupoIxc_1 = ixcUser.id_grupo;
                    //console.log(`[DEBUG IXC] Preparando UPDATE no banco local -> id_usuario_ixc: ${idUsuarioIxc}, id_funcionario_ixc: ${idFuncionarioIxc}, status_ixc: ${statusIxc}`);
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            // Adicionamos o id_grupo_ixc na query
                            var QUERY = "UPDATE usuarios_intranet SET id_usuario_ixc = ?, id_funcionario_ixc = ?, status_ixc = ?, id_grupo_ixc = ? WHERE id = ?";
                            database_1.LOCALHOST.query(QUERY, [idUsuarioIxc_1, idFuncionarioIxc_1, statusIxc_1, idGrupoIxc_1, user.id], function (err, result) {
                                if (err) {
                                    //console.error(`[DEBUG IXC] Erro SQL ao tentar atualizar o banco local:`, err);
                                    reject(err);
                                }
                                else {
                                    //console.log(`[DEBUG IXC] UPDATE realizado com sucesso! Linhas afetadas: ${result.affectedRows}`);
                                    resolve(true);
                                }
                            });
                        })];
                case 4:
                    //console.log(`[DEBUG IXC] Preparando UPDATE no banco local -> id_usuario_ixc: ${idUsuarioIxc}, id_funcionario_ixc: ${idFuncionarioIxc}, status_ixc: ${statusIxc}`);
                    _a.sent();
                    user.id_usuario_ixc = idUsuarioIxc_1;
                    user.id_funcionario_ixc = idFuncionarioIxc_1;
                    user.status_ixc = statusIxc_1;
                    user.id_grupo_ixc = idGrupoIxc_1;
                    return [2 /*return*/, user];
                case 5: 
                //console.log(`[DEBUG IXC] Nenhum usuário foi encontrado no IXC com o e-mail começando com '${username}@'.`);
                return [2 /*return*/, user];
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    //console.error("[DEBUG IXC] Ocorreu uma exceção ao comunicar com a API do IXC:");
                    if (error_1.response) {
                        //console.error("[DEBUG IXC] Data do erro:", JSON.stringify(error.response.data));
                    }
                    else {
                        //console.error("[DEBUG IXC] Mensagem:", error.message);
                    }
                    return [2 /*return*/, user];
                case 8: return [2 /*return*/];
            }
        });
    }); }
};
