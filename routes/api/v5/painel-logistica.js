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
// routes/api/v5/painel-logistica.ts
var Express = require("express");
var axios_1 = require("axios");
var database_1 = require("../../../api/database");
// Importe o makeIxcRequest se for precisar puxar dados ao vivo do IXC depois
var router = Express.Router();
var executeDb = function (query, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        database_1.LOCALHOST.query(query, params, function (err, results) {
            if (err)
                return reject(err);
            resolve(results);
        });
    });
};
var makeIxcRequest = function (method, endpoint, data) {
    if (data === void 0) { data = null; }
    return __awaiter(void 0, void 0, void 0, function () {
        var url, token, headers, response, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "".concat(process.env.IXC_API_URL, "/webservice/v1").concat(endpoint);
                    token = process.env.IXC_API_TOKEN;
                    headers = {
                        'Authorization': "Basic ".concat(token),
                        'Content-Type': 'application/json'
                    };
                    if (data && data.qtype) {
                        headers['ixcsoft'] = 'listar';
                        method = 'POST';
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, axios_1.default)({ method: method, url: url, headers: headers, data: data })];
                case 2:
                    response = _b.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_1 = _b.sent();
                    console.error("[IXC Err] ".concat(endpoint, ":"), ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) || error_1.message);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
};
router.get('/agendamentos', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, municipio, query, params, agendamentos, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, data = _a.data, municipio = _a.municipio;
                if (!data) {
                    return [2 /*return*/, res.status(400).json({ error: "Data é obrigatória" })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                query = "\n            SELECT * FROM ivp_agenda_os \n            WHERE data_agendamento = ? \n        ";
                params = [data];
                if (municipio && municipio !== 'TODOS') {
                    query += " AND municipio_base = ?";
                    params.push(municipio);
                }
                query += " ORDER BY turno ASC, aceita_encaixe DESC, created_at ASC";
                return [4 /*yield*/, executeDb(query, params)];
            case 2:
                agendamentos = _b.sent();
                res.json(agendamentos);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                console.error("Erro ao buscar agendamentos para logística:", error_2);
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.put('/atribuir-tecnico', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id_agenda, ixc_tecnico_id, status, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, id_agenda = _a.id_agenda, ixc_tecnico_id = _a.ixc_tecnico_id, status = _a.status;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, executeDb("UPDATE ivp_agenda_os SET ixc_tecnico_id = ?, status_interno = ? WHERE id = ?", [ixc_tecnico_id, status || 'ATRIBUIDO', id_agenda])];
            case 2:
                _b.sent();
                res.json({ success: true, message: "OS atribuída com sucesso!" });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
