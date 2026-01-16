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

    if (id) {
        const QUERY = `UPDATE soc_wanguard_report SET 
            equipamento = ?, analise_preliminar = ?, acao_tomada = ?, observacoes = ?, status = ?, login = ?
            WHERE id = ?`;
        
        LOCALHOST.query(QUERY, [equipamento, analise, acao_tomada, observacoes, status, login, id], (error) => {
            if (error) return res.status(500).json({ error: error.message });
            res.json({ success: true, message: 'Evento atualizado' });
        });
        return;
    }

    if (!cliente_id_ixc && ip_interno) {
        try {
            const infoIxc = await consultarIxcPorIp(ip_interno);
            if (infoIxc && infoIxc.total > 0) {
                const registro = infoIxc.registros[0];
                cliente_id_ixc = registro.id_cliente;
                login = registro.login;

                const respCliente = await axios.post(`${process.env.IXC_API_URL}/webservice/v1/cliente`, {
                    qtype: "cliente.id", query: cliente_id_ixc, oper: "=", rp: "1"
                }, { 
                    headers: { 'Authorization': `Basic ${process.env.IXC_API_TOKEN}`, 'ixcsoft': 'listar' } 
                });
                
                if (respCliente.data?.registros?.length > 0) {
                    cliente_nome = respCliente.data.registros[0].razao;
                }
            }
        } catch (e) { console.error("Erro identificação automática:", e); }
    }

    const CHECK_ID_WANGUARD = `SELECT id FROM soc_wanguard_report WHERE id_wanguard = ? LIMIT 1`;

    LOCALHOST.query(CHECK_ID_WANGUARD, [id_wanguard], (err, idExists: any) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (idExists && idExists.length > 0 && id_wanguard !== null) {
            return res.json({ success: true, message: 'Duplicata ignorada.' });
        }

        const CHECK_OPEN = `SELECT id, qtd_anomalias, alerta_ixc FROM soc_wanguard_report 
                            WHERE ip_interno = ? AND cliente_id_ixc = ? AND status != 'Concluído' 
                            ORDER BY id DESC LIMIT 1`;

        LOCALHOST.query(CHECK_OPEN, [ip_interno, cliente_id_ixc], (err, results: any) => {
            if (err) return res.status(500).json({ error: err.message });

            if (results && results.length > 0) {
                const regExistente = results[0];
                
                const UPDATE_INC = `UPDATE soc_wanguard_report SET 
                                    qtd_anomalias = qtd_anomalias + 1,
                                    trafego_upload = ?, trafego_download = ?, id_wanguard = ?
                                    WHERE id = ?`;
                
                LOCALHOST.query(UPDATE_INC, [trafego_upload, trafego_download, id_wanguard, regExistente.id], (e) => {
                    if (e) return res.status(500).json({ error: e.message });
                    
                    if (regExistente.alerta_ixc === 'Não' && cliente_id_ixc) {
                        processarAlertaIxc(regExistente.id, cliente_id_ixc);
                    }

                    res.json({ success: true, message: 'Quantidade incrementada.' });
                });

            } else {
                const INSERT_SQL = `INSERT INTO soc_wanguard_report 
                    (id_wanguard, data_evento, ip_interno, cliente_nome, cliente_id_ixc, login, trafego_upload, trafego_download, status, analise_preliminar, usuario_responsavel, qtd_anomalias, equipamento, acao_tomada, observacoes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`;
                
                const statusFinal = status || 'Pendente';

                LOCALHOST.query(INSERT_SQL, [
                    id_wanguard, data_evento, ip_interno, cliente_nome, cliente_id_ixc, login, 
                    trafego_upload, trafego_download, statusFinal, analise, usuario_responsavel,
                    equipamento, acao_tomada, observacoes 
                ], (e, r) => {
                    if (e) return res.status(500).json({ error: e.message });
                    
                    if (cliente_id_ixc) {
                        processarAlertaIxc(r.insertId, cliente_id_ixc);
                    }

                    res.json({ success: true, id: r.insertId });
                });
            }
        });
    });
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

router.get('/equipamentos-lista', async (req, res) => {
    const QUERY = `SELECT id_equipamento, marca, modelo FROM equipamentos_rede ORDER BY marca, modelo ASC`;
    
    LOCALHOST.query(QUERY, (error, results) => {
        if (error) {
            console.error("Erro ao buscar equipamentos:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json(results);
    });
});

router.get('/relatorio-consumo/:loginPPPoE', async (req, res) => {
    const { loginPPPoE } = req.params;
    const urlBase = `${process.env.IXC_API_URL}/webservice/v1`;
    const headers = {
        'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
        'ixcsoft': 'listar',
        'Content-Type': 'application/json'
    };

    try {
        const respId = await axios.post(`${urlBase}/radusuarios`, {
            qtype: "radusuarios.login",
            query: loginPPPoE,
            oper: "=",
            rp: "1"
        }, { headers });

        if (!respId.data || respId.data.total <= 0) {
            return res.status(404).json({ message: "Login não encontrado no IXC." });
        }

        const idLoginNumerico = respId.data.registros[0].id;

        const respConsumo = await axios.post(`${urlBase}/radusuarios_consumo_d`, {
            qtype: "radusuarios_consumo_d.id_login",
            query: idLoginNumerico,
            oper: "=",
            page: "1",
            rp: "15",
            sortname: "radusuarios_consumo_d.id",
            sortorder: "desc"
        }, { headers });

        const registros = respConsumo.data.registros || [];
        
        let totalDownload = 0;
        let totalUpload = 0;

        const dadosFormatados = registros.map((reg: any) => {
            const down = parseFloat(reg.consumo || 0);
            const up = parseFloat(reg.consumo_upload || 0);
            
            totalDownload += down;
            totalUpload += up;

            return {
                data: reg.data,
                download_bytes: down,
                upload_bytes: up
            };
        });

        res.json({
            historico: dadosFormatados,
            total_download: totalDownload,
            total_upload: totalUpload
        });

    } catch (error) {
        console.error("Erro ao buscar consumo:", error.message);
        res.status(500).json({ error: "Falha na comunicação com o IXC" });
    }
});

const processarAlertaIxc = async (idReportLocal: number, idClienteIxc: string) => {
    if (!idClienteIxc) return;

    const urlBase = `${process.env.IXC_API_URL}/webservice/v1`;
    
    const headersListar = {
        'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
        'ixcsoft': 'listar', 
        'Content-Type': 'application/json'
    };

    const headersEditar = {
        'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
        'Content-Type': 'application/json'
    };

    try {
        const respGet = await axios.post(`${urlBase}/cliente`, {
            qtype: "cliente.id", query: idClienteIxc, oper: "=", rp: "1"
        }, { headers: headersListar });

        if (!respGet.data || respGet.data.total <= 0) return;

        const clienteDados = respGet.data.registros[0];
        const mensagemAlerta = "ATENÇÃO: Este cliente possui alerta de uso incomum de internet, podendo ser um equipamento tvbox infectado com virus.";
        
        let alertaAtual = clienteDados.alerta || "";
        if (alertaAtual.includes("uso incomum de internet")) {
            const UPDATE_LOCAL = `UPDATE soc_wanguard_report SET alerta_ixc = 'Sim' WHERE id = ?`;
            LOCALHOST.query(UPDATE_LOCAL, [idReportLocal], () => {});
            return;
        }

        const novoAlerta = alertaAtual 
            ? `${mensagemAlerta}\n\n${alertaAtual}` 
            : mensagemAlerta;

        clienteDados.alerta = novoAlerta;

        await axios.put(`${urlBase}/cliente/${idClienteIxc}`, clienteDados, { headers: headersEditar });

        const UPDATE_LOCAL = `UPDATE soc_wanguard_report SET alerta_ixc = 'Sim' WHERE id = ?`;
        LOCALHOST.query(UPDATE_LOCAL, [idReportLocal], (err) => {
            if (err) console.error("Erro ao atualizar flag alerta_ixc:", err);
            else console.log(`Alerta IXC atualizado com sucesso para o cliente ${idClienteIxc}`);
        });

    } catch (error) {
        console.error("Erro ao processar alerta IXC:", error.message);
    }
};

export default router;