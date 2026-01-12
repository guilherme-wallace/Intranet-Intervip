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
    let { 
        id, id_wanguard, data_evento, ip_interno, cliente_nome, cliente_id_ixc, login,
        trafego_upload, trafego_download, equipamento, analise, 
        acao_tomada, observacoes, status, usuario_responsavel 
    } = req.body;

    if (!id && !cliente_id_ixc && ip_interno) {
        try {
            const infoIxc = await consultarIxcPorIp(ip_interno);
            if (infoIxc && infoIxc.total > 0) {
                const registro = infoIxc.registros[0];
                cliente_id_ixc = registro.id_cliente;
                login = registro.login;

                const respCliente = await axios.post(`${process.env.IXC_API_URL}/webservice/v1/cliente`, {
                    qtype: "cliente.id", query: cliente_id_ixc, oper: "=", rp: "1"
                }, { headers: { 'Authorization': `Basic ${process.env.IXC_API_TOKEN}`, 'ixcsoft': 'listar' } });
                
                if (respCliente.data?.registros?.length > 0) {
                    cliente_nome = respCliente.data.registros[0].razao;
                }
            }
        } catch (e) { console.error("Falha ao identificar cliente pelo IP:", e); }
    }

    if (id) {
        const QUERY = `UPDATE soc_wanguard_report SET 
            equipamento = ?, analise_preliminar = ?, acao_tomada = ?, observacoes = ?, status = ?, login = ?
            WHERE id = ?`;
        LOCALHOST.query(QUERY, [equipamento, analise, acao_tomada, observacoes, status, login, id], (error) => {
            if (error) return res.status(500).json({ error: error.message });
            res.json({ success: true, message: 'Atualizado' });
        });
    } else {
        const CHECK_SQL = `SELECT id, qtd_anomalias FROM soc_wanguard_report 
                           WHERE ip_interno = ? AND status != 'Concluído' 
                           ORDER BY id DESC LIMIT 1`;

        LOCALHOST.query(CHECK_SQL, [ip_interno], (err, results: any) => {
            if (results && results.length > 0) {
                const INC_SQL = `UPDATE soc_wanguard_report SET qtd_anomalias = qtd_anomalias + 1, trafego_upload = ?, trafego_download = ?, id_wanguard = ? WHERE id = ?`;
                LOCALHOST.query(INC_SQL, [trafego_upload, trafego_download, id_wanguard, results[0].id], (e) => {
                    if (e) return res.status(500).json({ error: e.message });
                    res.json({ success: true, message: 'Qtd incrementada' });
                });
            } else {
                const INS_SQL = `INSERT INTO soc_wanguard_report 
                    (id_wanguard, data_evento, ip_interno, cliente_nome, cliente_id_ixc, login, trafego_upload, trafego_download, status, analise_preliminar, usuario_responsavel, qtd_anomalias) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendente', ?, ?, 1)`;
                LOCALHOST.query(INS_SQL, [id_wanguard, data_evento, ip_interno, cliente_nome, cliente_id_ixc, login, trafego_upload, trafego_download, analise, usuario_responsavel], (e, r) => {
                    if (e) return res.status(500).json({ error: e.message });
                    res.json({ success: true, id: r.insertId });
                });
            }
        });
    }
});

router.delete('/excluir/:id', async (req, res) => {
    const { id } = req.params;
    const QUERY = `DELETE FROM soc_wanguard_report WHERE id = ?`;
    
    LOCALHOST.query(QUERY, [id], (error) => {
        if (error) {
            console.error("Erro SQL ao excluir:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, message: 'Registro excluído com sucesso' });
    });
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
    const urlBase = `${process.env.IXC_API_URL}/webservice/v1`;
    const headers = {
        'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
        'ixcsoft': 'listar',
        'Content-Type': 'application/json'
    };

    try {
        const respRad = await axios.post(`${urlBase}/radusuarios`, {
            qtype: "radusuarios.ip",
            query: ip,
            oper: "=",
            rp: "1"
        }, { headers });

        if (!respRad.data || respRad.data.total <= 0) {
            return res.status(404).json({ message: "IP não encontrado" });
        }

        const registroRad = respRad.data.registros[0];
        const idCliente = registroRad.id_cliente;
        const loginEncontrado = registroRad.login;

        const respCliente = await axios.post(`${urlBase}/cliente`, {
            qtype: "cliente.id",
            query: idCliente,
            oper: "=",
            rp: "1"
        }, { headers });

        let nomeCliente = "Nome não encontrado";
        if (respCliente.data && respCliente.data.total > 0) {
            nomeCliente = respCliente.data.registros[0].razao;
        }

        res.json({
            cliente_id: idCliente,
            cliente_nome: nomeCliente,
            login: loginEncontrado 
        });

    } catch (error) {
        console.error("Erro IXC:", error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;