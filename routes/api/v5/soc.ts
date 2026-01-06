// routes/api/v5/soc.ts

import * as Express from 'express';
import { LOCALHOST } from '../../../api/database';
import axios from 'axios';

const router = Express.Router();

router.get('/eventos', async (req, res) => {
    const QUERY = `SELECT * FROM soc_wanguard_report ORDER BY data_evento DESC LIMIT 100`;
    
    LOCALHOST.query(QUERY, (error, results) => {
        if (error) {
            console.error("Erro SQL ao listar:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json(results);
    });
});

router.post('/salvar', async (req, res) => {
    const { 
        id, data_evento, ip_interno, cliente_nome, cliente_id_ixc, 
        trafego_upload, trafego_download, equipamento, analise, 
        acao, observacoes, status, usuario_responsavel 
    } = req.body;

    if (id) {
        const QUERY = `UPDATE soc_wanguard_report SET 
            equipamento = ?, analise_preliminar = ?, acao_tomada = ?, observacoes = ?, status = ? 
            WHERE id = ?`;
        
        LOCALHOST.query(QUERY, [equipamento, analise, acao, observacoes, status, id], (error) => {
            if (error) return res.status(500).json({ error: error.message });
            res.json({ success: true, message: 'Evento atualizado' });
        });
    } else {
        const QUERY = `INSERT INTO soc_wanguard_report 
            (data_evento, ip_interno, cliente_nome, cliente_id_ixc, trafego_upload, trafego_download, equipamento, analise_preliminar, acao_tomada, observacoes, status, usuario_responsavel) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        LOCALHOST.query(QUERY, [
            data_evento, ip_interno, cliente_nome, cliente_id_ixc, 
            trafego_upload, trafego_download, equipamento, analise, 
            acao, observacoes, status, usuario_responsavel
        ], (error, result) => {
            if (error) {
                console.error("Erro SQL ao inserir:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json({ success: true, id: result.insertId });
        });
    }
});

const consultarIxcPorIp = async (ip: string) => {
    const url = `${process.env.IXC_API_URL}/webservice/v1/radusuarios`;
    const token = process.env.IXC_API_TOKEN;

    const payload = {
        qtype: "radusuarios.ip",
        query: ip,
        oper: "=",
        page: "1",
        rp: "1"
    };

    const response = await axios.post(url, payload, {
        headers: {
            'Authorization': `Basic ${token}`,
            'ixcsoft': 'listar',
            'Content-Type': 'application/json'
        }
    });

    return response.data;
};

router.get('/buscar-cliente-ip/:ip', async (req, res) => {
    const { ip } = req.params;
    try {
        const data = await consultarIxcPorIp(ip);
        if (data && data.total > 0) {
            const registro = data.registros[0];
            res.json({
                cliente_id: registro.id_cliente,
                login: registro.login,
            });
        } else {
            res.status(404).json({ message: "IP não encontrado no IXC" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;