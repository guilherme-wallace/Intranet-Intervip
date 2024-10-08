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
var MySQLErrors_1 = require("../../../errors/MySQLErrors");
var api = require("../../../api/index");
var Express = require("express");
var BLOCK = Express.Router();
BLOCK.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.GetBlocks(+req.params.id)];
            case 1:
                response = _a.sent();
                return [2 /*return*/, res.json(response)];
            case 2:
                error_1 = _a.sent();
                if (error_1 instanceof MySQLErrors_1.MySQLReturnNullError) {
                    return [2 /*return*/, res.status(404).json({ error: "Not found." })];
                }
                console.log(error_1);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
BLOCK.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var response, error_2, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 7]);
                return [4 /*yield*/, api.v1.PostBlocks(req.body)];
            case 1:
                response = _c.sent();
                return [2 /*return*/, res.status(201).json(response)];
            case 2:
                error_2 = _c.sent();
                if (!error_2.code.startsWith('ER_NO_REFERENCED_ROW')) return [3 /*break*/, 5];
                return [4 /*yield*/, api.v1.PostCondominio(req.body[0].condominio)];
            case 3:
                _c.sent();
                _b = (_a = res.status(201)).json;
                return [4 /*yield*/, api.v1.PostBlocks(req.body)];
            case 4: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
            case 5:
                if (error_2.code == 'ER_BAD_NULL_ERROR') {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid object.' })];
                }
                _c.label = 6;
            case 6:
                console.log(error_2);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 7: return [2 /*return*/];
        }
    });
}); });
BLOCK.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, api.v1.DeleteBlocks(+req.params.id)];
            case 1:
                _a.sent();
                return [2 /*return*/, res.status(204).json()];
            case 2:
                error_3 = _a.sent();
                console.log(error_3);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
BLOCK.put('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var blockId, blockData, response, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                blockId = +req.params.id;
                blockData = req.body;
                blockData.blockId = blockId; // Assegurando que o blockId esteja presente no objeto
                return [4 /*yield*/, api.v1.PutBlock(blockData)];
            case 1:
                response = _a.sent();
                if (response.affectedRows > 0) {
                    return [2 /*return*/, res.status(200).json({ message: 'Bloco atualizado com sucesso!' })];
                }
                return [2 /*return*/, res.status(404).json({ error: 'Bloco não encontrado.' })];
            case 2:
                error_4 = _a.sent();
                console.log(error_4);
                return [2 /*return*/, res.status(500).json({ error: "Erro interno do servidor." })];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = BLOCK;
