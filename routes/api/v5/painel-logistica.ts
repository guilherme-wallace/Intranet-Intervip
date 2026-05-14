// routes/api/v5/painel-logistica.ts
import * as Express from 'express';
import axios, { Method } from 'axios';
import { LOCALHOST } from '../../../api/database';
// Importe o makeIxcRequest se for precisar puxar dados ao vivo do IXC depois

const router = Express.Router();

const executeDb = (query: string, params: any[] = []) => {
    return new Promise<any>((resolve, reject) => {
        LOCALHOST.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

const makeIxcRequest = async (method: Method, endpoint: string, data: any = null) => {
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
    } catch (error: any) {
        console.error(`[IXC Err] ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
};

router.get('/agendamentos', async (req, res) => {
    const { data, municipio } = req.query;

    if (!data) {
        return res.status(400).json({ error: "Data é obrigatória" });
    }

    try {
        let query = `
            SELECT * FROM ivp_agenda_os 
            WHERE data_agendamento = ? 
        `;
        let params: any[] = [data];

        if (municipio && municipio !== 'TODOS') {
            query += ` AND municipio_base = ?`;
            params.push(municipio);
        }

        query += ` ORDER BY turno ASC, aceita_encaixe DESC, created_at ASC`;

        const agendamentos = await executeDb(query, params);
        res.json(agendamentos);

    } catch (error: any) {
        console.error("Erro ao buscar agendamentos para logística:", error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/atribuir-tecnico', async (req, res) => {
    const { id_agenda, ixc_tecnico_id, status } = req.body;

    try {
        await executeDb(
            `UPDATE ivp_agenda_os SET ixc_tecnico_id = ?, status_interno = ? WHERE id = ?`,
            [ixc_tecnico_id, status || 'ATRIBUIDO', id_agenda]
        );

        res.json({ success: true, message: "OS atribuída com sucesso!" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;