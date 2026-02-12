// src/routes/scriptmigraOnusRoute.ts
import { Router } from 'express';
import { exec } from 'child_process';
import * as path from 'path';
import axios from 'axios';

const router = Router();

const makeIxcRequest = async (method: any, endpoint: string, data: any = null) => {
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN;
    const headers: any = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };
    if (data && data.qtype) {
        headers['ixcsoft'] = 'listar';
        method = 'POST';
    }
    try {
        const response = await axios({ method, url, headers, data });
        return response.data;
    } catch (error) {
        console.error(`[IXC Err] ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
};

router.get('/olts', async (req, res) => {
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

        const response = await makeIxcRequest('POST', '/radpop_radio', payload);
        const registros = response.registros || [];

        const olts = registros
            .filter((olt: any) => 
                olt.ativo === 'S' && 
                olt.descricao && 
                !olt.descricao.toUpperCase().startsWith('REDE NEUTRA')
            )
            .map((olt: any) => ({
                id: olt.id,
                name: olt.descricao,
                ip: olt.ip
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        res.json(olts);
    } catch (error) {
        console.error("Erro ao buscar OLTs:", error.message);
        res.status(500).json({ error: "Erro ao buscar lista de OLTs" });
    }
});

router.post('/run-olt-script', (req, res) => {
    const {
        use_OLT_Antiga,
        ip_OLT_Antiga,
        use_OLT_Nova,
        ip_OLT_Nova,
        pon_ANTIGA,
        onu_ID,
        ont_LIN_PROF,
        ont_SRV_PROF,
        ont_native_vlan,
        ont_vlan_service_port,
        ont_gem_PORT,
        ont_user_vlan
    } = req.body;

    const scriptPath = path.resolve(__dirname, '../../public/scriptsPy/migraOnus/main.py');

    const pythonCommand = `python "${scriptPath}" "${use_OLT_Antiga}" "${ip_OLT_Antiga}" "${use_OLT_Nova}" "${ip_OLT_Nova}" "${pon_ANTIGA}" "${onu_ID}" "${ont_LIN_PROF || 'None'}" "${ont_SRV_PROF || 'None'}" "${ont_native_vlan || 'None'}" "${ont_vlan_service_port || 'None'}" "${ont_gem_PORT || 'None'}" "${ont_user_vlan || 'None'}"`;

    exec(pythonCommand, (error, stdout, stderr) => {
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

export default router;