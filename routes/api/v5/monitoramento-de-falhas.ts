// routes/api/v5/monitoramento.ts

import * as Express from 'express';
import { LOCALHOST } from '../../../api/database';
import axios from 'axios';

const router = Express.Router();

const queryAsync = (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
        LOCALHOST.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const webhookQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

async function processWebhookQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    while (webhookQueue.length > 0) {
        const task = webhookQueue.shift();
        if (task) {
            try {
                await task();
            } catch (err) {
                console.error("Erro na fila do webhook:", err);
            }
        }
    }
    isProcessingQueue = false;
}

router.post('/webhook/n8n', (req, res) => {
    
    res.json({ success: true, message: 'Alerta recebido e enfileirado para agrupamento.' });

    webhookQueue.push(async () => {
        let { 
            host_zabbix, tipo_alerta, identificador, nome_identificado,
            motivo_falha, status, data_evento, sinal_rx_retorno,
            is_update, update_action, update_message
        } = req.body;

        let data_evento_sql = data_evento;
        if (data_evento_sql && data_evento_sql.includes('.')) {
            data_evento_sql = data_evento_sql.replace(/\./g, '-');
        }

        if (tipo_alerta === 'CORP' && identificador && (!nome_identificado || !nome_identificado.includes('|'))) {
            let idCliente = identificador;
            let idContrato: string | null = null;
            if (identificador.includes('|')) {
                const parts = identificador.split('|');
                idCliente = parts[0];
                idContrato = parts[1];
            }
            try {
                const headersIxc = { 'Authorization': `Basic ${process.env.IXC_API_TOKEN}`, 'ixcsoft': 'listar', 'Content-Type': 'application/json' };
                const respCliente = await axios.post(`${process.env.IXC_API_URL}/webservice/v1/cliente`, { qtype: "cliente.id", query: idCliente, oper: "=", rp: "1" }, { headers: headersIxc });
                let razaoSocial = "";
                if (respCliente.data && respCliente.data.registros && respCliente.data.registros.length > 0) {
                    razaoSocial = respCliente.data.registros[0].razao;
                }
                let enderecoCompleto = "";
                if (idContrato) {
                    const respContrato = await axios.post(`${process.env.IXC_API_URL}/webservice/v1/cliente_contrato`, { qtype: "cliente_contrato.id", query: idContrato, oper: "=", rp: "1" }, { headers: headersIxc });
                    if (respContrato.data && respContrato.data.registros && respContrato.data.registros.length > 0) {
                        const c = respContrato.data.registros[0];
                        enderecoCompleto = `${c.endereco}, ${c.numero}`;
                        if (c.complemento) enderecoCompleto += ` (${c.complemento})`;
                        enderecoCompleto += ` - ${c.bairro}`;
                    }
                }
                if (razaoSocial) {
                    nome_identificado = `${razaoSocial} (ID: ${idCliente})`;
                    if (enderecoCompleto) nome_identificado += ` | ${enderecoCompleto}`;
                }
            } catch (error) {
                console.error("Erro ao enriquecer dados do CORP via IXC:", error.message);
            }
        }

        if (status === 'DOWN') {
            
            const checkDuplicata = await queryAsync(`
                SELECT id, motivo_falha, id_incidente FROM mon_alertas 
                WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' 
                ORDER BY id DESC LIMIT 1
            `, [identificador, host_zabbix]);

            if (checkDuplicata && checkDuplicata.length > 0) {
                const alertaExistente = checkDuplicata[0];
                
                if (is_update === '1' || (update_action && update_action.toLowerCase().includes('acknowledge'))) {
                    
                    let novoMotivo = alertaExistente.motivo_falha;
                    if (update_message && update_message.trim() !== "") {
                        novoMotivo = `${alertaExistente.motivo_falha} | ACK: ${update_message}`;
                    } else {
                        novoMotivo = `${alertaExistente.motivo_falha} | Reconhecido no Zabbix`;
                    }
                    
                    await queryAsync(`UPDATE mon_alertas SET status = 'IGNORADO', motivo_falha = ? WHERE id = ?`, [novoMotivo, alertaExistente.id]);
                    
                    if (alertaExistente.id_incidente) {
                        const checkRestantes = await queryAsync(`SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1`, [alertaExistente.id_incidente]);
                        if (checkRestantes.length === 0) {
                            await queryAsync(`UPDATE mon_incidentes SET status = 'Resolvido', data_fim = NOW() WHERE id = ?`, [alertaExistente.id_incidente]);
                        }
                    }
                    return;
                }
                
                return; 
            }

            const buscarIncidente = `
                SELECT id, regiao_afetada FROM mon_incidentes 
                WHERE status = 'Ativo' 
                AND (
                    (regiao_afetada = ? AND data_inicio >= CAST(? AS DATETIME) - INTERVAL 10 MINUTE)
                    OR 
                    (data_inicio >= CAST(? AS DATETIME) - INTERVAL 2 MINUTE)
                )
                ORDER BY id DESC LIMIT 1
            `;
            
            const resInc = await queryAsync(buscarIncidente, [host_zabbix, data_evento_sql, data_evento_sql]);
            let idIncidentePai;

            if (resInc && resInc.length > 0) {
                idIncidentePai = resInc[0].id;
                if (resInc[0].regiao_afetada !== host_zabbix && resInc[0].regiao_afetada !== 'Múltiplos Equipamentos') {
                    await queryAsync(`UPDATE mon_incidentes SET regiao_afetada = 'Múltiplos Equipamentos' WHERE id = ?`, [idIncidentePai]);
                }
            } else {
                const resCriar = await queryAsync(`INSERT INTO mon_incidentes (regiao_afetada, data_inicio, status) VALUES (?, ?, 'Ativo')`, [host_zabbix, data_evento_sql]);
                idIncidentePai = resCriar.insertId;
            }

            await queryAsync(`
                INSERT INTO mon_alertas 
                (id_incidente, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_falha, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'DOWN')
            `, [idIncidentePai, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_evento_sql]);

        } else if (status === 'UP') {
            
            const resBusca = await queryAsync(`
                SELECT id, id_incidente FROM mon_alertas 
                WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' 
                ORDER BY data_falha DESC LIMIT 1
            `, [identificador, host_zabbix]);

            if (resBusca && resBusca.length > 0) {
                const alertaId = resBusca[0].id;
                const incidenteId = resBusca[0].id_incidente;

                await queryAsync(`UPDATE mon_alertas SET status = 'UP', data_retorno = ?, sinal_rx_retorno = ? WHERE id = ?`, [data_evento_sql, sinal_rx_retorno, alertaId]);

                if (incidenteId) {
                    const resCheck = await queryAsync(`SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1`, [incidenteId]);
                    if (resCheck.length === 0) {
                        await queryAsync(`UPDATE mon_incidentes SET status = 'Resolvido', data_fim = ? WHERE id = ?`, [data_evento_sql, incidenteId]);
                    }
                }
            }
        }
    });
    
    processWebhookQueue();
});

router.get('/falhas-ativas', (req, res) => {
    
    const queryIncidentes = `
        SELECT * FROM mon_incidentes 
        WHERE 
            (status = 'Ativo' AND data_inicio <= NOW() - INTERVAL '2:30' MINUTE_SECOND)
           OR 
            (status = 'Resolvido' AND data_fim >= NOW() - INTERVAL 10 MINUTE)
        ORDER BY data_inicio DESC
    `;
    
    LOCALHOST.query(queryIncidentes, (errInc, resultIncidentes: any[]) => {
        if (errInc) return res.status(500).json({ error: errInc.message });

        const queryAlertas = `
            SELECT * FROM mon_alertas 
            WHERE 
                status != 'IGNORADO' AND (
                    id_incidente IN (
                        SELECT id FROM mon_incidentes 
                        WHERE status = 'Ativo' OR (status = 'Resolvido' AND data_fim >= NOW() - INTERVAL 10 MINUTE)
                    )
                    OR 
                    (id_incidente IS NULL AND (
                        (status = 'DOWN' AND data_falha <= NOW() - INTERVAL '2:30' MINUTE_SECOND) OR 
                        (status IN ('UP', 'IGNORADO') AND data_retorno >= NOW() - INTERVAL 10 MINUTE)
                    ))
                )
            ORDER BY data_falha DESC
        `;

        LOCALHOST.query(queryAlertas, (errAlt, resultAlertas: any[]) => {
            if (errAlt) return res.status(500).json({ error: errAlt.message });

            const incidentesAgrupados = resultIncidentes.map(inc => {
                return {
                    ...inc,
                    alertas: resultAlertas.filter(a => a.id_incidente === inc.id)
                };
            });

            const alertasIsolados = resultAlertas.filter(a => a.id_incidente === null);
            alertasIsolados.forEach(alerta => {
                incidentesAgrupados.push({
                    id: alerta.id,
                    regiao_afetada: alerta.host_zabbix,
                    data_inicio: alerta.data_falha,
                    status: alerta.status === 'DOWN' ? 'Ativo' : 'Resolvido',
                    alertas: [alerta]
                });
            });

            incidentesAgrupados.sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime());

            res.json(incidentesAgrupados);
        });
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

router.get('/busca-contratos/:id_cliente', async (req, res) => {
    const { id_cliente } = req.params;
    try {
        const headersIxc = {
            'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
            'ixcsoft': 'listar',
            'Content-Type': 'application/json'
        };

        const respCliente = await axios.post(`${process.env.IXC_API_URL}/webservice/v1/cliente`, {
            qtype: "cliente.id", query: id_cliente, oper: "=", rp: "1"
        }, { headers: headersIxc });
        
        const cliente = respCliente.data?.registros?.[0] || {};
        let nomeCliente = cliente.razao || 'Cliente não encontrado';

        const respContrato = await axios.post(`${process.env.IXC_API_URL}/webservice/v1/cliente_contrato`, {
            qtype: "cliente_contrato.id_cliente", query: id_cliente, oper: "=", rp: "50"
        }, { headers: headersIxc });

        const registrosValidos = (respContrato.data?.registros || []).filter(c => !['D', 'C', 'CM', 'CA'].includes(c.status_internet));

        const contratos = registrosValidos.map(c => {
            let enderecoStr = '';
            
            if (c.endereco) {
                enderecoStr = [c.endereco, c.numero, c.bairro].filter(Boolean).join(', ');
            } else if (c.endereco_padrao_cliente === 'S' || !c.endereco) {
                enderecoStr = [cliente.endereco, cliente.numero, cliente.bairro].filter(Boolean).join(', ');
            }
            
            if (!enderecoStr || enderecoStr.trim() === '') enderecoStr = 'Endereço não especificado';

            return { 
                id_contrato: c.id, 
                status: c.status_internet, 
                endereco: enderecoStr,
                plano: c.contrato || 'Plano Genérico',
                data_ativacao: c.data_ativacao ? c.data_ativacao.split('-').reverse().join('/') : 'N/A'
            };
        });

        res.json({ nome: nomeCliente, contratos });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/acao-lote', (req, res) => {
    const { ids, acao } = req.body;
    
    if (!ids || !ids.length) return res.status(400).json({ error: 'Nenhum ID fornecido.' });
    if (!['UP', 'DOWN', 'IGNORADO'].includes(acao)) return res.status(400).json({ error: 'Ação inválida.' });

    const statusDb = acao;
    const placeholders = ids.map(() => '?').join(',');
    
    const setRetorno = acao === 'UP' ? 'NOW()' : 'NULL';

    const UPDATE_ALERTAS = `UPDATE mon_alertas SET status = ?, data_retorno = ${setRetorno} WHERE id IN (${placeholders})`;
    
    LOCALHOST.query(UPDATE_ALERTAS, [statusDb, ...ids], (errUpd) => {
        if (errUpd) return res.status(500).json({ error: errUpd.message });

        const BUSCAR_PAIS = `SELECT DISTINCT id_incidente FROM mon_alertas WHERE id IN (${placeholders}) AND id_incidente IS NOT NULL`;
        
        LOCALHOST.query(BUSCAR_PAIS, [...ids], (errPais, resPais: any[]) => {
            if (errPais || !resPais.length) return res.json({ success: true });

            resPais.forEach(pai => {
                const CHECK_RESTANTES = `SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1`;
                LOCALHOST.query(CHECK_RESTANTES, [pai.id_incidente], (errCheck, resCheck: any[]) => {
                    if (resCheck && resCheck.length === 0) {
                        const FECHAR_INCIDENTE = `UPDATE mon_incidentes SET status = 'Resolvido', data_fim = NOW() WHERE id = ?`;
                        LOCALHOST.query(FECHAR_INCIDENTE, [pai.id_incidente], () => {});
                    } else if (acao === 'DOWN') {
                        const REABRIR_INCIDENTE = `UPDATE mon_incidentes SET status = 'Ativo', data_fim = NULL WHERE id = ?`;
                        LOCALHOST.query(REABRIR_INCIDENTE, [pai.id_incidente], () => {});
                    }
                });
            });
            res.json({ success: true, message: `Status alterado para ${acao}.` });
        });
    });
});

export default router;