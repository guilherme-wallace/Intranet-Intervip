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
//Intranet-Intervip\routes\api\v1\block.ts
const MySQLErrors_1 = require("../../../errors/MySQLErrors");
const api = require("../../../api/index");
const Express = require("express");
const BLOCK = Express.Router();
BLOCK.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetBlocks(+req.params.id);
        return res.json(response);
    }
    catch (error) {
        if (error instanceof MySQLErrors_1.MySQLReturnNullError) {
            return res.status(404).json({ error: "Not found." });
        }
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
BLOCK.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.PostBlocks(req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        if (error.code.startsWith('ER_NO_REFERENCED_ROW')) {
            yield api.v1.PostCondominio(req.body[0].condominio);
            return res.status(201).json(yield api.v1.PostBlocks(req.body));
        }
        else if (error.code == 'ER_BAD_NULL_ERROR') {
            return res.status(400).json({ error: 'Invalid object.' });
        }
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
BLOCK.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield api.v1.DeleteBlocks(+req.params.id);
        return res.status(204).json();
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
BLOCK.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blockId = +req.params.id;
        const blockData = req.body;
        blockData.blockId = blockId; // Assegurando que o blockId esteja presente no objeto
        let response = yield api.v1.PutBlock(blockData);
        if (response.affectedRows > 0) {
            return res.status(200).json({ message: 'Bloco atualizado com sucesso!' });
        }
        return res.status(404).json({ error: 'Bloco não encontrado.' });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}));
exports.default = BLOCK;
