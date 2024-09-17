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
var Swagger = require("swagger-ui-express");
var api = require("../../api/index");
var Express = require("express");
var plan_1 = require("./v3/plan");
var sale_1 = require("./v1/sale");
var block_1 = require("./v1/block");
var group_1 = require("./v1/group");
var radius_1 = require("./v4/radius");
var group_2 = require("./v4/group");
var address_1 = require("./v1/address");
var client_1 = require("./v1/client");
var client_2 = require("./v4/client");
var viability_1 = require("./v1/viability");
var contract_1 = require("./v1/contract");
var contract_2 = require("./v2/contract");
var contract_3 = require("./v4/contract");
var salesperson_1 = require("./v1/salesperson");
var SWAGGER_UI = Swagger;
var ROUTER = Express.Router();
var SWAGGER_DOC = require('../../swagger.json');
ROUTER.use('/', SWAGGER_UI.serve);
ROUTER.get('/', SWAGGER_UI.setup(SWAGGER_DOC));
ROUTER.use('/v3/plan', plan_1.default);
ROUTER.use('/v1/sale', sale_1.default);
ROUTER.use('/v1/block', block_1.default);
ROUTER.use('/v1/group', group_1.default);
ROUTER.use('/v4/radius', radius_1.default);
ROUTER.use('/v4/group', group_2.default);
ROUTER.use('/v1/address', address_1.default);
ROUTER.use('/v1/client', client_1.default);
ROUTER.use('/v4/client', client_2.default);
ROUTER.use('/v1/viability', viability_1.default);
ROUTER.use('/v1/contract', contract_1.default);
ROUTER.use('/v2/contract', contract_2.default);
ROUTER.use('/v4/contract', contract_3.default);
ROUTER.use('/v1/salesperson', salesperson_1.default);
ROUTER.get('/v1/type', function (_req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.GetTypes()];
            case 1:
                response = _a.sent();
                res.json(response);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.log(error_1);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
ROUTER.get('/v1/structures', function (_req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.GetStructures()];
            case 1:
                response = _a.sent();
                res.json(response);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.log(error_2);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
ROUTER.get('/v1/address/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.GetGroupAddress(+req.params.id)];
            case 1:
                response = _a.sent();
                res.json(response);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.log(error_3);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
ROUTER.get('/v1/plan/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.GetPlans(+req.params.id)];
            case 1:
                response = _a.sent();
                res.json(response);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.log(error_4);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
ROUTER.get('/v2/plan/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v2.GetPlans(+req.params.id)];
            case 1:
                response = _a.sent();
                res.json(response);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.log(error_5);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
ROUTER.get('/v1/research/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.GetResearch(+req.params.id)];
            case 1:
                response = _a.sent();
                if (response) {
                    return [2 /*return*/, res.json(response)];
                }
                return [2 /*return*/, res.status(404).json({ error: 'Not found.' })];
            case 2:
                error_6 = _a.sent();
                console.log(error_6);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
ROUTER.get('/v1/research/answer/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.GetResearchAnswers(+req.params.id)];
            case 1:
                response = _a.sent();
                res.json(response);
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                console.log(error_7);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
ROUTER.get('/v1/technology', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.GetTechnologies()];
            case 1:
                response = _a.sent();
                res.json(response);
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.log(error_8);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
ROUTER.put('/v1/block/:id', function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var blockId, blockData, response, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                blockId = +req.params.id;
                blockData = req.body;
                blockData.blockId = blockId; // Certifique-se de que o blockId está incluído nos dados
                return [4 /*yield*/, api.v1.PutBlock(blockData)];
            case 1:
                response = _a.sent();
                if (response.affectedRows > 0) {
                    return [2 /*return*/, res.status(200).json({ message: 'Bloco atualizado com sucesso!' })];
                }
                return [2 /*return*/, res.status(404).json({ error: 'Bloco não encontrado.' })];
            case 2:
                error_9 = _a.sent();
                console.log(error_9);
                return [2 /*return*/, res.status(500).json({ error: 'Erro interno do servidor.' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = ROUTER;
