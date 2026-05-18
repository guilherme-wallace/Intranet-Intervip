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
exports.deleteEquipamento = exports.putEquipamento = exports.postEquipamento = exports.getEquipamentos = exports.getTiposEquipamento = void 0;
const mysql_1 = require("mysql");
function getTiposEquipamento(MySQL) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = 'SELECT id_equipamentoTipo, tipo_equipamento FROM equipamentos_tipo;';
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.getTiposEquipamento = getTiposEquipamento;
function getEquipamentos(MySQL, searchTerm) {
    return __awaiter(this, void 0, void 0, function* () {
        let QUERY = `SELECT e.*, t.tipo_equipamento FROM equipamentos_rede AS e JOIN equipamentos_tipo AS t ON e.tipo_equipamentoId = t.id_equipamentoTipo`;
        const params = [];
        if (searchTerm) {
            QUERY += ` WHERE e.marca LIKE ? OR e.modelo LIKE ? OR e.nome LIKE ?`;
            params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
        }
        QUERY += ` ORDER BY e.marca, e.modelo;`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, params, (error, response) => {
                if (error)
                    return reject(error);
                if (!response || response.length === 0) {
                    return resolve([]);
                }
                return resolve(response);
            });
        });
    });
}
exports.getEquipamentos = getEquipamentos;
function postEquipamento(MySQL, equipamento) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `
        INSERT INTO equipamentos_rede (
            tipo_equipamentoId, nome, marca, modelo, num_portas_wan, porta_gpon,
            porta_sfp, num_portas_lan, padrao_wifi, ethernet_tipo, velocidade_lan,
            velocidade_wifi_2_4, velocidade_wifi_5_8, cobertura_wifi, densidade_wifi,
            mimo, mesh, tipo_mesh, suporte_tr069, ipv6, endereco_ip, nome_usuario,
            senha_acesso, fonte, preco_medio, data_ultima_atualizacao_preco, site, observacoes
        ) VALUES (
            ${(0, mysql_1.escape)(equipamento.tipo_equipamentoId)},
            ${(0, mysql_1.escape)(equipamento.nome)},
            ${(0, mysql_1.escape)(equipamento.marca)},
            ${(0, mysql_1.escape)(equipamento.modelo)},
            ${(0, mysql_1.escape)(equipamento.num_portas_wan)},
            ${(0, mysql_1.escape)(equipamento.porta_gpon)},
            ${(0, mysql_1.escape)(equipamento.porta_sfp)},
            ${(0, mysql_1.escape)(equipamento.num_portas_lan)},
            ${(0, mysql_1.escape)(equipamento.padrao_wifi)},
            ${(0, mysql_1.escape)(equipamento.ethernet_tipo)},
            ${(0, mysql_1.escape)(equipamento.velocidade_lan)},
            ${(0, mysql_1.escape)(equipamento.velocidade_wifi_2_4)},
            ${(0, mysql_1.escape)(equipamento.velocidade_wifi_5_8)},
            ${(0, mysql_1.escape)(equipamento.cobertura_wifi)},
            ${(0, mysql_1.escape)(equipamento.densidade_wifi)},
            ${(0, mysql_1.escape)(equipamento.mimo)},
            ${(0, mysql_1.escape)(equipamento.mesh)},
            ${(0, mysql_1.escape)(equipamento.tipo_mesh)},
            ${(0, mysql_1.escape)(equipamento.suporte_tr069)},
            ${(0, mysql_1.escape)(equipamento.ipv6)},
            ${(0, mysql_1.escape)(equipamento.endereco_ip)},
            ${(0, mysql_1.escape)(equipamento.nome_usuario)},
            ${(0, mysql_1.escape)(equipamento.senha_acesso)},
            ${(0, mysql_1.escape)(equipamento.fonte)},
            ${(0, mysql_1.escape)(equipamento.preco_medio)},
            ${equipamento.data_ultima_atualizacao_preco ? (0, mysql_1.escape)(equipamento.data_ultima_atualizacao_preco) : 'NULL'},
            ${(0, mysql_1.escape)(equipamento.site)},
            ${(0, mysql_1.escape)(equipamento.observacoes)}
        );
    `;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.postEquipamento = postEquipamento;
function putEquipamento(MySQL, equipamento) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `
        UPDATE equipamentos_rede SET
            nome = ${(0, mysql_1.escape)(equipamento.nome)},
            marca = ${(0, mysql_1.escape)(equipamento.marca)},
            modelo = ${(0, mysql_1.escape)(equipamento.modelo)},
            num_portas_wan = ${(0, mysql_1.escape)(equipamento.num_portas_wan)},
            porta_gpon = ${(0, mysql_1.escape)(equipamento.porta_gpon)},
            porta_sfp = ${(0, mysql_1.escape)(equipamento.porta_sfp)},
            num_portas_lan = ${(0, mysql_1.escape)(equipamento.num_portas_lan)},
            padrao_wifi = ${(0, mysql_1.escape)(equipamento.padrao_wifi)},
            ethernet_tipo = ${(0, mysql_1.escape)(equipamento.ethernet_tipo)},
            velocidade_lan = ${(0, mysql_1.escape)(equipamento.velocidade_lan)},
            velocidade_wifi_2_4 = ${(0, mysql_1.escape)(equipamento.velocidade_wifi_2_4)},
            velocidade_wifi_5_8 = ${(0, mysql_1.escape)(equipamento.velocidade_wifi_5_8)},
            cobertura_wifi = ${(0, mysql_1.escape)(equipamento.cobertura_wifi)},
            densidade_wifi = ${(0, mysql_1.escape)(equipamento.densidade_wifi)},
            mimo = ${(0, mysql_1.escape)(equipamento.mimo)},
            mesh = ${(0, mysql_1.escape)(equipamento.mesh)},
            tipo_mesh = ${(0, mysql_1.escape)(equipamento.tipo_mesh)},
            suporte_tr069 = ${(0, mysql_1.escape)(equipamento.suporte_tr069)},
            ipv6 = ${(0, mysql_1.escape)(equipamento.ipv6)},
            endereco_ip = ${(0, mysql_1.escape)(equipamento.endereco_ip)},
            nome_usuario = ${(0, mysql_1.escape)(equipamento.nome_usuario)},
            senha_acesso = ${(0, mysql_1.escape)(equipamento.senha_acesso)},
            fonte = ${(0, mysql_1.escape)(equipamento.fonte)},
            preco_medio = ${(0, mysql_1.escape)(equipamento.preco_medio)},
            data_ultima_atualizacao_preco = ${equipamento.data_ultima_atualizacao_preco ? (0, mysql_1.escape)(equipamento.data_ultima_atualizacao_preco) : 'NULL'},
            site = ${(0, mysql_1.escape)(equipamento.site)},
            observacoes = ${(0, mysql_1.escape)(equipamento.observacoes)}
        WHERE id_equipamento = ${(0, mysql_1.escape)(equipamento.id_equipamento)};
    `;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.putEquipamento = putEquipamento;
function deleteEquipamento(MySQL, equipamentoId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `DELETE FROM equipamentos_rede WHERE id_equipamento = ${(0, mysql_1.escape)(equipamentoId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.deleteEquipamento = deleteEquipamento;
