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
// src/routes/scriptmigraOnusRoute.ts
var express_1 = require("express");
var child_process_1 = require("child_process");
var path = require("path");
var axios_1 = require("axios");
var router = (0, express_1.Router)();
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
router.get('/olts', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var payload, response, registros, olts, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                payload = {
                    "qtype": "radpop_radio.id",
                    "query": "1",
                    "oper": ">=",
                    "page": "1",
                    "rp": "1000",
                    "sortname": "radpop_radio.id",
                    "sortorder": "desc"
                };
                return [4 /*yield*/, makeIxcRequest('POST', '/radpop_radio', payload)];
            case 1:
                response = _a.sent();
                registros = response.registros || [];
                olts = registros
                    .filter(function (olt) {
                    return olt.ativo === 'S' &&
                        olt.descricao &&
                        !olt.descricao.toUpperCase().startsWith('REDE NEUTRA');
                })
                    .map(function (olt) { return ({
                    id: olt.id,
                    name: olt.descricao,
                    ip: olt.ip
                }); })
                    .sort(function (a, b) { return a.name.localeCompare(b.name); });
                res.json(olts);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error("Erro ao buscar OLTs:", error_2.message);
                res.status(500).json({ error: "Erro ao buscar lista de OLTs" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/run-olt-script', function (req, res) {
    var _a = req.body, use_OLT_Antiga = _a.use_OLT_Antiga, ip_OLT_Antiga = _a.ip_OLT_Antiga, use_OLT_Nova = _a.use_OLT_Nova, ip_OLT_Nova = _a.ip_OLT_Nova, pon_ANTIGA = _a.pon_ANTIGA, onu_ID = _a.onu_ID, ont_LIN_PROF = _a.ont_LIN_PROF, ont_SRV_PROF = _a.ont_SRV_PROF, ont_native_vlan = _a.ont_native_vlan, ont_vlan_service_port = _a.ont_vlan_service_port, ont_gem_PORT = _a.ont_gem_PORT, ont_user_vlan = _a.ont_user_vlan;
    var scriptPath = path.resolve(__dirname, '../../public/scriptsPy/migraOnus/main.py');
    var pythonCommand = "python \"".concat(scriptPath, "\" \"").concat(use_OLT_Antiga, "\" \"").concat(ip_OLT_Antiga, "\" \"").concat(use_OLT_Nova, "\" \"").concat(ip_OLT_Nova, "\" \"").concat(pon_ANTIGA, "\" \"").concat(onu_ID, "\" \"").concat(ont_LIN_PROF || 'None', "\" \"").concat(ont_SRV_PROF || 'None', "\" \"").concat(ont_native_vlan || 'None', "\" \"").concat(ont_vlan_service_port || 'None', "\" \"").concat(ont_gem_PORT || 'None', "\" \"").concat(ont_user_vlan || 'None', "\"");
    (0, child_process_1.exec)(pythonCommand, function (error, stdout, stderr) {
        if (error) {
            console.error("Error: ".concat(error.message));
            return res.status(500).send("Error running script: ".concat(error.message));
        }
        if (stderr) {
            console.error("Stderr: ".concat(stderr));
        }
        console.log("Script output: ".concat(stdout));
        res.send("Script executed successfully! Output: ".concat(stdout));
    });
});
exports.default = router;
