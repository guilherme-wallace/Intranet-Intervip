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

    if (tipo_alerta === 'CORP' && identificador && (!nome_identificado || !nome_identificado.includes('|'))) {
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
        
        const buscarIncidente = `SELECT id FROM mon_incidentes WHERE regiao_afetada = ? AND status = 'Ativo' ORDER BY id DESC LIMIT 1`;
        
        LOCALHOST.query(buscarIncidente, [host_zabbix], (err, results: any) => {
            if (err) return res.status(500).json({ error: err.message });

            const inserirAlertaFinal = (idInc) => {
                const INSERT_ALERTA = `
                    INSERT INTO mon_alertas 
                    (id_incidente, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_falha, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'DOWN')
                `;
                LOCALHOST.query(INSERT_ALERTA, [idInc, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_evento], (errIns) => {
                    if (errIns) return res.status(500).json({ error: errIns.message });
                    res.json({ success: true, message: 'Alerta DOWN registrado e agrupado.' });
                });
            };

            if (results && results.length > 0) {
                inserirAlertaFinal(results[0].id);
            } else {
                const criarIncidente = `INSERT INTO mon_incidentes (regiao_afetada, data_inicio, status) VALUES (?, ?, 'Ativo')`;
                LOCALHOST.query(criarIncidente, [host_zabbix, data_evento], (errCriar, resultsCriar: any) => {
                    if (errCriar) return res.status(500).json({ error: errCriar.message });
                    inserirAlertaFinal(resultsCriar.insertId);
                });
            }
        });

    } else if (status === 'UP') {
        
        const BUSCAR_ALERTA = `
            SELECT id, id_incidente FROM mon_alertas 
            WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' 
            ORDER BY data_falha DESC LIMIT 1
        `;

        LOCALHOST.query(BUSCAR_ALERTA, [identificador, host_zabbix], (errBusca, resBusca: any) => {
            if (errBusca) return res.status(500).json({ error: errBusca.message });
            
            if (resBusca && resBusca.length > 0) {
                const alertaId = resBusca[0].id;
                const incidenteId = resBusca[0].id_incidente;

                const UPDATE_ALERTA = `UPDATE mon_alertas SET status = 'UP', data_retorno = ?, sinal_rx_retorno = ? WHERE id = ?`;
                
                LOCALHOST.query(UPDATE_ALERTA, [data_evento, sinal_rx_retorno, alertaId], (errUpd) => {
                    if (errUpd) return res.status(500).json({ error: errUpd.message });

                    if (incidenteId) {
                        const CHECK_RESTANTES = `SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1`;
                        
                        LOCALHOST.query(CHECK_RESTANTES, [incidenteId], (errCheck, resCheck: any) => {
                            if (errCheck) console.error("Erro ao checar alertas restantes:", errCheck);

                            if (resCheck && resCheck.length === 0) {
                                const FECHAR_INCIDENTE = `UPDATE mon_incidentes SET status = 'Resolvido', data_fim = ? WHERE id = ?`;
                                
                                LOCALHOST.query(FECHAR_INCIDENTE, [data_evento, incidenteId], (errFim) => {
                                    if (errFim) console.error("Erro ao fechar incidente:", errFim);
                                    return res.json({ success: true, message: 'Alerta UP e Incidente Massivo Resolvido!' });
                                });
                            } else {
                                return res.json({ success: true, message: 'Alerta UP, mas Incidente Massivo segue Ativo.' });
                            }
                        });
                    } else {
                        res.json({ success: true, message: 'Alerta isolado normalizado para UP.' });
                    }
                });
            } else {
                res.json({ success: true, message: 'Nenhum alerta DOWN pendente encontrado para este equipamento.' });
            }
        });
        
    } else {
        res.status(400).json({ error: 'Status inválido. Use DOWN ou UP.' });
    }
});

router.get('/falhas-ativas', (req, res) => {
    
    const queryIncidentes = `
        SELECT * FROM mon_incidentes 
        WHERE 
            (status = 'Ativo' AND data_inicio <= NOW() - INTERVAL 5 MINUTE)
           OR 
            (status = 'Resolvido' AND data_fim >= NOW() - INTERVAL 10 MINUTE)
        ORDER BY data_inicio DESC
    `;
    
    LOCALHOST.query(queryIncidentes, (errInc, resultIncidentes: any[]) => {
        if (errInc) return res.status(500).json({ error: errInc.message });

        const queryAlertas = `
            SELECT * FROM mon_alertas 
            WHERE 
                id_incidente IN (
                    SELECT id FROM mon_incidentes 
                    WHERE status = 'Ativo' OR (status = 'Resolvido' AND data_fim >= NOW() - INTERVAL 10 MINUTE)
                )
                OR 
                (id_incidente IS NULL AND (
                    (status = 'DOWN' AND data_falha <= NOW() - INTERVAL 5 MINUTE) OR 
                    (status IN ('UP', 'IGNORADO') AND data_retorno >= NOW() - INTERVAL 10 MINUTE)
                ))
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