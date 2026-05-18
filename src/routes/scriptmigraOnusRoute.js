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
// src/routes/scriptmigraOnusRoute.ts
const express_1 = require("express");
const child_process_1 = require("child_process");
const path = require("path");
const axios_1 = require("axios");
const router = (0, express_1.Router)();
const makeIxcRequest = (method, endpoint, data = null) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN;
    const headers = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };
    if (data && data.qtype) {
        headers['ixcsoft'] = 'listar';
        method = 'POST';
    }
    try {
        const response = yield (0, axios_1.default)({ method, url, headers, data });
        return response.data;
    }
    catch (error) {
        console.error(`[IXC Err] ${endpoint}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
});
router.get('/olts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = {
            "qtype": "radpop_radio.id",
            "query": "1",
            "oper": ">=",
            "page": "1",
            "rp": "1000",
            "sortname": "radpop_radio.id",
            "sortorder": "desc"
        };
        const response = yield makeIxcRequest('POST', '/radpop_radio', payload);
        const registros = response.registros || [];
        const olts = registros
            .filter((olt) => olt.ativo === 'S' &&
            olt.descricao &&
            !olt.descricao.toUpperCase().startsWith('REDE NEUTRA'))
            .map((olt) => ({
            id: olt.id,
            name: olt.descricao,
            ip: olt.ip
        }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(olts);
    }
    catch (error) {
        console.error("Erro ao buscar OLTs:", error.message);
        res.status(500).json({ error: "Erro ao buscar lista de OLTs" });
    }
}));
router.post('/run-olt-script', (req, res) => {
    const { use_OLT_Antiga, ip_OLT_Antiga, use_OLT_Nova, ip_OLT_Nova, pon_ANTIGA, onu_ID, ont_LIN_PROF, ont_SRV_PROF, ont_native_vlan, ont_vlan_service_port, ont_gem_PORT, ont_user_vlan } = req.body;
    const scriptPath = path.resolve(__dirname, '../../public/scriptsPy/migraOnus/main.py');
    const pythonCommand = `python "${scriptPath}" "${use_OLT_Antiga}" "${ip_OLT_Antiga}" "${use_OLT_Nova}" "${ip_OLT_Nova}" "${pon_ANTIGA}" "${onu_ID}" "${ont_LIN_PROF || 'None'}" "${ont_SRV_PROF || 'None'}" "${ont_native_vlan || 'None'}" "${ont_vlan_service_port || 'None'}" "${ont_gem_PORT || 'None'}" "${ont_user_vlan || 'None'}"`;
    (0, child_process_1.exec)(pythonCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send(`Error running script: ${error.message}`);
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        console.log(`Script output: ${stdout}`);
        res.send(`Script executed successfully! Output: ${stdout}`);
    });
});
exports.default = router;
