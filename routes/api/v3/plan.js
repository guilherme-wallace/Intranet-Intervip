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
// routes/api/v3/plan.ts
const MySQLErrors_1 = require("../../../errors/MySQLErrors");
const api = require("../../../api/index");
const Express = require("express");
const PLAN = Express.Router();
PLAN.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let response = yield api.v3.GetPlans((_b = (_a = req.query.query) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : '');
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
exports.default = PLAN;
