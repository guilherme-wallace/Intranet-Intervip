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
// routes/api/v5/looking-glass.ts
var Express = require("express");
var ssh2_1 = require("ssh2");
var router = Express.Router();
function executarComandoHuawei(ipRouter, comando) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var conn = new ssh2_1.Client();
                    conn.on('ready', function () {
                        conn.exec(comando, function (err, stream) {
                            if (err) {
                                conn.end();
                                return reject(err);
                            }
                            var resultado = '';
                            stream.on('close', function (code, signal) {
                                conn.end();
                                resolve(resultado);
                            }).on('data', function (data) {
                                resultado += data.toString();
                            }).stderr.on('data', function (data) {
                                console.error('Erro no fluxo stderr SSH:', data.toString());
                            });
                        });
                    }).on('error', function (err) {
                        reject(err);
                    }).connect({
                        host: ipRouter,
                        port: parseInt(process.env.LG_SSH_PORT || '65222'),
                        username: process.env.LG_SSH_USER,
                        password: process.env.LG_SSH_PASS,
                        algorithms: {
                            kex: ['diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1']
                        },
                        readyTimeout: 10000
                    });
                })];
        });
    });
}
router.post('/consultar', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, type, target, selectedRouter, ipRouter, loopbackInterface, comando, safeTarget, bgpTarget, bgp6Target, output, cleanOutput, indexTotal, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, type = _a.type, target = _a.target, selectedRouter = _a.router;
                if (!type || !target || !selectedRouter) {
                    return [2 /*return*/, res.status(400).json({ error: 'Parâmetros incompletos. type, target e router são obrigatórios.' })];
                }
                ipRouter = '';
                loopbackInterface = 'LoopBack0';
                if (selectedRouter === 'VTA01') {
                    ipRouter = process.env.LG_ROUTER_VTA01_IP || '10.225.1.253';
                    loopbackInterface = 'LoopBack0';
                }
                else if (selectedRouter === 'SEA01') {
                    ipRouter = process.env.LG_ROUTER_SEA01_IP || '172.31.0.78';
                    loopbackInterface = 'LoopBack2';
                }
                else {
                    return [2 /*return*/, res.status(400).json({ error: 'Roteador inválido.' })];
                }
                comando = '';
                safeTarget = target.replace(/[^a-fA-F0-9.:\/]/g, '');
                switch (type) {
                    case 'bgp':
                        bgpTarget = safeTarget.replace('/', ' ');
                        comando = "display bgp routing-table ".concat(bgpTarget, " longer-prefixes | no-more");
                        break;
                    case 'bgp6':
                        bgp6Target = safeTarget.replace('/', ' ');
                        comando = "display bgp ipv6 routing-table ".concat(bgp6Target, " | no-more");
                        break;
                    case 'ping':
                        comando = "ping -i ".concat(loopbackInterface, " ").concat(safeTarget);
                        break;
                    case 'trace':
                        comando = "tracert -i ".concat(loopbackInterface, " ").concat(safeTarget);
                        break;
                    case 'ping6':
                        comando = "ping ipv6 ".concat(safeTarget);
                        break;
                    case 'trace6':
                        comando = "tracert ipv6 ".concat(safeTarget);
                        break;
                    default:
                        return [2 /*return*/, res.status(400).json({ error: 'Tipo de consulta inválido.' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, executarComandoHuawei(ipRouter, comando)];
            case 2:
                output = _b.sent();
                cleanOutput = output;
                cleanOutput = cleanOutput.replace(/<[a-zA-Z0-9\-_]+>/g, '');
                cleanOutput = cleanOutput.replace(/^Info: The max number of VTY users.*$/gm, '');
                cleanOutput = cleanOutput.replace(/^\s*The (current|last) login.*$/gm, '');
                if (type === 'bgp' || type === 'bgp6') {
                    indexTotal = cleanOutput.indexOf('Total Number of Routes:');
                    if (indexTotal !== -1) {
                        cleanOutput = cleanOutput.substring(indexTotal);
                    }
                }
                cleanOutput = cleanOutput.trim();
                if (!cleanOutput) {
                    cleanOutput = 'Comando executado, mas não houve retorno textual (ou o prefixo não foi encontrado na tabela).';
                }
                return [2 /*return*/, res.json({ success: true, output: cleanOutput })];
            case 3:
                error_1 = _b.sent();
                console.error('Falha na execução do Looking Glass:', error_1.message);
                return [2 /*return*/, res.status(500).json({
                        error: 'Falha ao conectar no roteador via SSH.',
                        details: error_1.message
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
