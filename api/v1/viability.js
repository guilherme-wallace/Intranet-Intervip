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
exports.postViabilitys = void 0;
var mysql_1 = require("mysql");
function postViabilitys(MySQL, viabilitys) {
    return __awaiter(this, void 0, void 0, function () {
        var query, _i, viabilitys_1, viability;
        return __generator(this, function (_a) {
            query = 'INSERT INTO viability(clientName, cnpj, nomeFantaisa, phoneNumber, email, postalCodeId, city, neighborhood, state, address, number, complement, type, condominio, block, apartment, unionNumber, operador) VALUES';
            for (_i = 0, viabilitys_1 = viabilitys; _i < viabilitys_1.length; _i++) {
                viability = viabilitys_1[_i];
                query += "(".concat((0, mysql_1.escape)(viability.clientName), ", ").concat((0, mysql_1.escape)(viability.cnpj), ", ").concat((0, mysql_1.escape)(viability.nomeFantaisa), ", ").concat((0, mysql_1.escape)(viability.phoneNumber), ", \n            ").concat((0, mysql_1.escape)(viability.email), ", ").concat((0, mysql_1.escape)(viability.postalCodeId), ", ").concat((0, mysql_1.escape)(viability.city), ", \n            ").concat((0, mysql_1.escape)(viability.neighborhood), ", ").concat((0, mysql_1.escape)(viability.state), ", ").concat((0, mysql_1.escape)(viability.address), ", ").concat((0, mysql_1.escape)(viability.number), ", ").concat((0, mysql_1.escape)(viability.complement), ",\n            ").concat((0, mysql_1.escape)(viability.type), ", ").concat((0, mysql_1.escape)(viability.condominio), ", ").concat((0, mysql_1.escape)(viability.block), ", ").concat((0, mysql_1.escape)(viability.apartment), ", ").concat((0, mysql_1.escape)(viability.unionNumber), ", ").concat((0, mysql_1.escape)(viability.operador), "),");
            }
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(query.slice(0, -1).concat(';'), function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.postViabilitys = postViabilitys;
