// routes/api/v5/monitoramento.ts

import * as Express from 'express';
import { LOCALHOST } from '../../../api/database';
import axios from 'axios';

const router = Express.Router();

router.post('/webhook/n8n', async (req, res) => {
    let { 
        host_zabbix, tipo_alerta, identificador, nome_identificado,
        motivo_falha, status, data_evento, sinal_rx_retorno
    } = req.body;

    if (tipo_alerta === 'CORP' && identificador) {
        let idCliente = identificador;
        let idContrato: string | null = null;

        if (identificador.includes('|')) {
            const parts = identificador.split('|');
            idCliente = parts[0];
            idContrato = parts[1];
        }

        try {
            const headersIxc = {
                'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
                'ixcsoft': 'listar',
                'Content-Type': 'application/json'
            };

            const respCliente = await axios.post(`${process.env.IXC_API_URL}/webservice/v1/cliente`, {
                qtype: "cliente.id", query: idCliente, oper: "=", rp: "1"
            }, { headers: headersIxc });

            let razaoSocial = "";
            if (respCliente.data && respCliente.data.registros && respCliente.data.registros.length > 0) {
                razaoSocial = respCliente.data.registros[0].razao;
            }

            let enderecoCompleto = "";
            if (idContrato) {
                const respContrato = await axios.post(`${process.env.IXC_API_URL}/webservice/v1/cliente_contrato`, {
                    qtype: "cliente_contrato.id", query: idContrato, oper: "=", rp: "1"
                }, { headers: headersIxc });

                if (respContrato.data && respContrato.data.registros && respContrato.data.registros.length > 0) {
                    const c = respContrato.data.registros[0];
                    enderecoCompleto = `${c.endereco}, ${c.numero}`;
                    if (c.complemento) enderecoCompleto += ` (${c.complemento})`;
                    enderecoCompleto += ` - ${c.bairro}`;
                }
            }

            if (razaoSocial) {
                nome_identificado = `${razaoSocial} (ID: ${idCliente})`;
                if (enderecoCompleto) {
                    nome_identificado += ` | ${enderecoCompleto}`;
                }
            }
        } catch (error) {
            console.error("Erro ao enriquecer dados do CORP via IXC:", error.message);
        }
    }
    if (status === 'DOWN') {
        const INSERT_ALERTA = `
            INSERT INTO mon_alertas 
            (host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_falha, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'DOWN')
        `;
        
        LOCALHOST.query(INSERT_ALERTA, [host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_evento], (error, results) => {
            if (error) {
                console.error("Erro ao inserir alerta:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json({ success: true, message: 'Alerta DOWN registrado', id_alerta: results.insertId });
        });

    } else if (status === 'UP') {
        const UPDATE_ALERTA = `
            UPDATE mon_alertas 
            SET status = 'UP', data_retorno = ?, sinal_rx_retorno = ? 
            WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' 
            ORDER BY data_falha DESC LIMIT 1
        `;
        
        LOCALHOST.query(UPDATE_ALERTA, [data_evento, sinal_rx_retorno, identificador, host_zabbix], (error, results) => {
            if (error) {
                console.error("Erro ao atualizar alerta para UP:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json({ success: true, message: 'Alerta normalizado para UP' });
        });
    } else {
        res.status(400).json({ error: 'Status inválido. Use DOWN ou UP.' });
    }
});

router.get('/falhas-ativas', (req, res) => {
    
    const QUERY = `
        SELECT * FROM mon_alertas 
        WHERE 
            (status = 'DOWN' AND data_falha <= NOW() - INTERVAL 5 MINUTE)
            OR 
            (status = 'UP' AND data_retorno >= NOW() - INTERVAL 10 MINUTE)
        ORDER BY data_falha DESC
    `;
    
    LOCALHOST.query(QUERY, (error, results) => {
        if (error) {
            console.error("Erro ao buscar falhas:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json(results);
    });
});

router.post('/acao-manual/arquivar', (req, res) => {
    const { id_alerta } = req.body;
    
    const QUERY = `UPDATE mon_alertas SET status = 'UP', data_retorno = NOW() WHERE id = ?`;
    
    LOCALHOST.query(QUERY, [id_alerta], (error) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, message: 'Alerta arquivado manualmente.' });
    });
});

export default router;