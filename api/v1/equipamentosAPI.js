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
exports.deleteEquipamento = exports.putEquipamento = exports.postEquipamento = exports.getEquipamentos = exports.getTiposEquipamento = void 0;
var mysql_1 = require("mysql");
function getTiposEquipamento(MySQL) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = 'SELECT id_equipamentoTipo, tipo_equipamento FROM equipamentos_tipo;';
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.getTiposEquipamento = getTiposEquipamento;
function getEquipamentos(MySQL, searchTerm) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY, params;
        return __generator(this, function (_a) {
            QUERY = "SELECT e.*, t.tipo_equipamento FROM equipamentos_rede AS e JOIN equipamentos_tipo AS t ON e.tipo_equipamentoId = t.id_equipamentoTipo";
            params = [];
            if (searchTerm) {
                QUERY += " WHERE e.marca LIKE ? OR e.modelo LIKE ? OR e.nome LIKE ?";
                params.push("%".concat(searchTerm, "%"), "%".concat(searchTerm, "%"), "%".concat(searchTerm, "%"));
            }
            QUERY += " ORDER BY e.marca, e.modelo;";
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, params, function (error, response) {
                        if (error)
                            return reject(error);
                        if (!response || response.length === 0) {
                            return resolve([]);
                        }
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.getEquipamentos = getEquipamentos;
function postEquipamento(MySQL, equipamento) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "\n        INSERT INTO equipamentos_rede (\n            tipo_equipamentoId, nome, marca, modelo, num_portas_wan, porta_gpon,\n            porta_sfp, num_portas_lan, padrao_wifi, ethernet_tipo, velocidade_lan,\n            velocidade_wifi_2_4, velocidade_wifi_5_8, cobertura_wifi, densidade_wifi,\n            mimo, mesh, tipo_mesh, suporte_tr069, ipv6, endereco_ip, nome_usuario,\n            senha_acesso, fonte, preco_medio, data_ultima_atualizacao_preco, site, observacoes\n        ) VALUES (\n            ".concat((0, mysql_1.escape)(equipamento.tipo_equipamentoId), ",\n            ").concat((0, mysql_1.escape)(equipamento.nome), ",\n            ").concat((0, mysql_1.escape)(equipamento.marca), ",\n            ").concat((0, mysql_1.escape)(equipamento.modelo), ",\n            ").concat((0, mysql_1.escape)(equipamento.num_portas_wan), ",\n            ").concat((0, mysql_1.escape)(equipamento.porta_gpon), ",\n            ").concat((0, mysql_1.escape)(equipamento.porta_sfp), ",\n            ").concat((0, mysql_1.escape)(equipamento.num_portas_lan), ",\n            ").concat((0, mysql_1.escape)(equipamento.padrao_wifi), ",\n            ").concat((0, mysql_1.escape)(equipamento.ethernet_tipo), ",\n            ").concat((0, mysql_1.escape)(equipamento.velocidade_lan), ",\n            ").concat((0, mysql_1.escape)(equipamento.velocidade_wifi_2_4), ",\n            ").concat((0, mysql_1.escape)(equipamento.velocidade_wifi_5_8), ",\n            ").concat((0, mysql_1.escape)(equipamento.cobertura_wifi), ",\n            ").concat((0, mysql_1.escape)(equipamento.densidade_wifi), ",\n            ").concat((0, mysql_1.escape)(equipamento.mimo), ",\n            ").concat((0, mysql_1.escape)(equipamento.mesh), ",\n            ").concat((0, mysql_1.escape)(equipamento.tipo_mesh), ",\n            ").concat((0, mysql_1.escape)(equipamento.suporte_tr069), ",\n            ").concat((0, mysql_1.escape)(equipamento.ipv6), ",\n            ").concat((0, mysql_1.escape)(equipamento.endereco_ip), ",\n            ").concat((0, mysql_1.escape)(equipamento.nome_usuario), ",\n            ").concat((0, mysql_1.escape)(equipamento.senha_acesso), ",\n            ").concat((0, mysql_1.escape)(equipamento.fonte), ",\n            ").concat((0, mysql_1.escape)(equipamento.preco_medio), ",\n            ").concat(equipamento.data_ultima_atualizacao_preco ? (0, mysql_1.escape)(equipamento.data_ultima_atualizacao_preco) : 'NULL', ",\n            ").concat((0, mysql_1.escape)(equipamento.site), ",\n            ").concat((0, mysql_1.escape)(equipamento.observacoes), "\n        );\n    ");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.postEquipamento = postEquipamento;
function putEquipamento(MySQL, equipamento) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "\n        UPDATE equipamentos_rede SET\n            nome = ".concat((0, mysql_1.escape)(equipamento.nome), ",\n            marca = ").concat((0, mysql_1.escape)(equipamento.marca), ",\n            modelo = ").concat((0, mysql_1.escape)(equipamento.modelo), ",\n            num_portas_wan = ").concat((0, mysql_1.escape)(equipamento.num_portas_wan), ",\n            porta_gpon = ").concat((0, mysql_1.escape)(equipamento.porta_gpon), ",\n            porta_sfp = ").concat((0, mysql_1.escape)(equipamento.porta_sfp), ",\n            num_portas_lan = ").concat((0, mysql_1.escape)(equipamento.num_portas_lan), ",\n            padrao_wifi = ").concat((0, mysql_1.escape)(equipamento.padrao_wifi), ",\n            ethernet_tipo = ").concat((0, mysql_1.escape)(equipamento.ethernet_tipo), ",\n            velocidade_lan = ").concat((0, mysql_1.escape)(equipamento.velocidade_lan), ",\n            velocidade_wifi_2_4 = ").concat((0, mysql_1.escape)(equipamento.velocidade_wifi_2_4), ",\n            velocidade_wifi_5_8 = ").concat((0, mysql_1.escape)(equipamento.velocidade_wifi_5_8), ",\n            cobertura_wifi = ").concat((0, mysql_1.escape)(equipamento.cobertura_wifi), ",\n            densidade_wifi = ").concat((0, mysql_1.escape)(equipamento.densidade_wifi), ",\n            mimo = ").concat((0, mysql_1.escape)(equipamento.mimo), ",\n            mesh = ").concat((0, mysql_1.escape)(equipamento.mesh), ",\n            tipo_mesh = ").concat((0, mysql_1.escape)(equipamento.tipo_mesh), ",\n            suporte_tr069 = ").concat((0, mysql_1.escape)(equipamento.suporte_tr069), ",\n            ipv6 = ").concat((0, mysql_1.escape)(equipamento.ipv6), ",\n            endereco_ip = ").concat((0, mysql_1.escape)(equipamento.endereco_ip), ",\n            nome_usuario = ").concat((0, mysql_1.escape)(equipamento.nome_usuario), ",\n            senha_acesso = ").concat((0, mysql_1.escape)(equipamento.senha_acesso), ",\n            fonte = ").concat((0, mysql_1.escape)(equipamento.fonte), ",\n            preco_medio = ").concat((0, mysql_1.escape)(equipamento.preco_medio), ",\n            data_ultima_atualizacao_preco = ").concat(equipamento.data_ultima_atualizacao_preco ? (0, mysql_1.escape)(equipamento.data_ultima_atualizacao_preco) : 'NULL', ",\n            site = ").concat((0, mysql_1.escape)(equipamento.site), ",\n            observacoes = ").concat((0, mysql_1.escape)(equipamento.observacoes), "\n        WHERE id_equipamento = ").concat((0, mysql_1.escape)(equipamento.id_equipamento), ";\n    ");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.putEquipamento = putEquipamento;
function deleteEquipamento(MySQL, equipamentoId) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "DELETE FROM equipamentos_rede WHERE id_equipamento = ".concat((0, mysql_1.escape)(equipamentoId), ";");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.deleteEquipamento = deleteEquipamento;
