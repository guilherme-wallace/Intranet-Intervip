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
const api = require("../../../api/index");
const Express = require("express");
const EQUIPAMENTOS = Express.Router();
EQUIPAMENTOS.get('/tipos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetTiposEquipamento();
        return res.json(response);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}));
EQUIPAMENTOS.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const searchTerm = req.query.search;
        let response = yield api.v1.GetEquipamentos(searchTerm);
        return res.json(response);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}));
EQUIPAMENTOS.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const equipamentoData = req.body;
        let response = yield api.v1.PostEquipamento(equipamentoData);
        return res.status(201).json(response);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}));
EQUIPAMENTOS.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const equipamentoId = +req.params.id;
        const equipamentoData = req.body;
        equipamentoData.id_equipamento = equipamentoId;
        let response = yield api.v1.PutEquipamento(equipamentoData);
        if (response.affectedRows > 0) {
            return res.status(200).json({ message: 'Equipamento atualizado com sucesso!' });
        }
        return res.status(404).json({ error: 'Equipamento não encontrado.' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}));
EQUIPAMENTOS.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield api.v1.DeleteEquipamento(+req.params.id);
        return res.status(204).json();
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}));
exports.default = EQUIPAMENTOS;
