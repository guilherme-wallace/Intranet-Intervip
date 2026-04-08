// routes/api/v5/agenda.ts
import * as Express from 'express';
import axios, { Method } from 'axios';
import { LOCALHOST } from '../../../api/database';

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

router.get('/triagem/busca-cliente/:termo', async (req, res) => {
    const { termo } = req.params;
    
    try {
        const payloadBusca = {
            qtype: isNaN(Number(termo)) ? "cliente.razao" : "cliente.cnpj_cpf",
            query: termo,
            oper: isNaN(Number(termo)) ? "L" : "=",
            page: "1",
            rp: "5"
        };

        const cliResp = await makeIxcRequest('POST', '/cliente', payloadBusca);
        
        if (!cliResp.registros || cliResp.registros.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado no IXC." });
        }

        const cliente = cliResp.registros[0];
        
        const contratoResp = await makeIxcRequest('POST', '/cliente_contrato', {
            qtype: "cliente_contrato.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });

        const chamadosPendentes = await makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });

        const osAbertas = (chamadosPendentes.registros || []).filter((os: any) => os.status === 'A' || os.status === 'EN');

        res.json({
            cliente: {
                id: cliente.id,
                nome: cliente.razao,
                documento: cliente.cnpj_cpf,
                endereco: cliente.endereco,
                numero: cliente.numero,
                bairro: cliente.bairro,
                cidade: cliente.cidade
            },
            contratos: contratoResp.registros || [],
            os_abertas: osAbertas
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;