"use strict";
// routes/api/index.ts
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
const Swagger = require("swagger-ui-express");
const api = require("../../api/index");
const Express = require("express");
const equipamentosRoute_1 = require("./v1/equipamentosRoute");
const plan_1 = require("./v3/plan");
const sale_1 = require("./v1/sale");
const block_1 = require("./v1/block");
const condominio_1 = require("./v1/condominio");
const radius_1 = require("./v4/radius");
const condominio_2 = require("./v4/condominio");
const address_1 = require("./v1/address");
const client_1 = require("./v1/client");
const client_2 = require("./v4/client");
const viability_1 = require("./v1/viability");
const contract_1 = require("./v1/contract");
const contract_2 = require("./v2/contract");
const contract_3 = require("./v4/contract");
const salesperson_1 = require("./v1/salesperson");
const SWAGGER_UI = Swagger;
const ROUTER = Express.Router();
const SWAGGER_DOC = require('../../swagger.json');
ROUTER.use('/', SWAGGER_UI.serve);
ROUTER.get('/', SWAGGER_UI.setup(SWAGGER_DOC));
ROUTER.use('/v3/plan', plan_1.default);
ROUTER.use('/v1/sale', sale_1.default);
ROUTER.use('/v1/block', block_1.default);
ROUTER.use('/v1/condominio', condominio_1.default);
ROUTER.use('/v4/radius', radius_1.default);
ROUTER.use('/v4/condominio', condominio_2.default);
ROUTER.use('/v1/address', address_1.default);
ROUTER.use('/v1/client', client_1.default);
ROUTER.use('/v4/client', client_2.default);
ROUTER.use('/v1/viability', viability_1.default);
ROUTER.use('/v1/contract', contract_1.default);
ROUTER.use('/v2/contract', contract_2.default);
ROUTER.use('/v4/contract', contract_3.default);
ROUTER.use('/v1/salesperson', salesperson_1.default);
ROUTER.use('/v1/equipamentos', equipamentosRoute_1.default);
ROUTER.get('/v1/type', (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetTypes();
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
ROUTER.get('/v1/structures', (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetStructures();
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
ROUTER.get('/v1/address/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetCondominioAddress(+req.params.id);
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
ROUTER.get('/v1/plan/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetPlans(+req.params.id);
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
ROUTER.get('/v2/plan/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v2.GetPlans(+req.params.id);
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
ROUTER.get('/v1/research/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetResearch(+req.params.id);
        if (response) {
            return res.json(response);
        }
        return res.status(404).json({ error: 'Not found.' });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
ROUTER.get('/v1/research/answer/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetResearchAnswers(+req.params.id);
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
ROUTER.get('/v1/technology', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetTechnologies();
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
ROUTER.put('/v1/block/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blockId = +req.params.id;
        const blockData = req.body;
        blockData.blockId = blockId;
        let response = yield api.v1.PutBlock(blockData);
        if (response.affectedRows > 0) {
            return res.status(200).json({ message: 'Bloco atualizado com sucesso!' });
        }
        return res.status(404).json({ error: 'Bloco não encontrado.' });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}));
exports.default = ROUTER;
