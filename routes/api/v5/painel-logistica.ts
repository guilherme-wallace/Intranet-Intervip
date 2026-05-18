// routes/api/v5/painel-logistica.ts
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

router.get('/tecnicos', async (req, res) => {
    const { data } = req.query;
    try {
        const query = `
            SELECT u.id_funcionario_ixc as id, u.nome 
            FROM usuarios_intranet u
            INNER JOIN ivp_agenda_escala e ON u.id_funcionario_ixc = e.id_funcionario_ixc
            WHERE u.ativo = 1 AND e.data_escala = ?
            ORDER BY u.nome ASC
        `;
        const tecnicos = await executeDb(query, [data]);
        res.json(tecnicos);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/todos-tecnicos', async (req, res) => {
    try {
        const query = `
            SELECT id_funcionario_ixc as id, nome 
            FROM usuarios_intranet 
            WHERE ativo = 1 AND id_grupo_ixc = 31 AND id_funcionario_ixc IS NOT NULL
            ORDER BY nome ASC
        `;
        const todos = await executeDb(query);
        res.json(todos);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/salvar-escala', async (req, res) => {
    const { data, tecnicos_ids } = req.body;
    try {
        await executeDb(`DELETE FROM ivp_agenda_escala WHERE data_escala = ?`, [data]);
        
        if (tecnicos_ids && tecnicos_ids.length > 0) {
            for (let id of tecnicos_ids) {
                await executeDb(
                    `INSERT INTO ivp_agenda_escala (data_escala, id_funcionario_ixc) VALUES (?, ?)`, 
                    [data, id]
                );
            }
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/agendamentos', async (req, res) => {
    const { data, municipio } = req.query;

    if (!data) return res.status(400).json({ error: "Data é obrigatória" });

    try {
        let queryLocal = `SELECT * FROM ivp_agenda_os WHERE data_agendamento = ?`;
        let params: any[] = [data];

        if (municipio && municipio !== 'TODOS') {
            queryLocal += ` AND municipio_base = ?`;
            params.push(municipio);
        }
        queryLocal += ` ORDER BY turno ASC, aceita_encaixe DESC, created_at ASC`;

        const agendamentosLocais = await executeDb(queryLocal, params);
        const mapLocais = new Map();
        agendamentosLocais.forEach((os: any) => mapLocais.set(String(os.ixc_os_id), os));

        const payloadIxc = {
            qtype: 'su_oss_chamado.data_agenda',
            query: `${data} 00:00:00`,
            oper: '>=',
            page: '1',
            rp: '1500' 
        };

        const ixcResp = await makeIxcRequest('POST', '/su_oss_chamado', payloadIxc);

        let agendamentosIxc = (ixcResp.registros || []).filter((os: any) => {
            const idTec = String(os.id_tecnico).trim();
            const ehDoDiaExato = os.data_agenda && os.data_agenda.startsWith(data);
            return idTec !== '' && idTec !== '0' && ehDoDiaExato;
        });

        const idsExtraidos = agendamentosIxc.map((os: any) => os.id_tecnico).filter((id: any) => id);
        const idsParaChecar = idsExtraidos.filter((id: any, index: number) => idsExtraidos.indexOf(id) === index);

        let validTechIds = new Set();
        let techNamesMap = new Map();

        if (idsParaChecar.length > 0) {
            const techs = await executeDb(
                `SELECT id_funcionario_ixc, nome FROM usuarios_intranet 
                 WHERE id_funcionario_ixc IN (${idsParaChecar.join(',')}) 
                 AND id_grupo_ixc = 31 AND ativo = 1`
            );
            techs.forEach((t: any) => {
                validTechIds.add(String(t.id_funcionario_ixc));
                techNamesMap.set(String(t.id_funcionario_ixc), t.nome);
            });
        }

        agendamentosIxc = agendamentosIxc.filter((os: any) => validTechIds.has(String(os.id_tecnico)));

        const listaFinal = [...agendamentosLocais];

        for (const osIxc of agendamentosIxc) {
            if (mapLocais.has(String(osIxc.id))) {
                const localOs = mapLocais.get(String(osIxc.id));
                if (String(localOs.ixc_tecnico_id) !== String(osIxc.id_tecnico)) {
                    localOs.ixc_tecnico_id = osIxc.id_tecnico;
                    localOs.status_interno = 'ATRIBUIDO';
                }
                localOs.ixc_status = osIxc.status; 
            } else {
                let turnoInferred = 'MATUTINO';
                const horario = (osIxc.melhor_horario_agenda || '').toUpperCase();
                if (horario === 'T' || horario === 'N') turnoInferred = 'VESPERTINO';

                const isPredio = (osIxc.apartamento || osIxc.id_condominio || osIxc.bloco) ? 'PRÉDIO' : 'CASA';
                let msg = osIxc.mensagem || 'Agendado pelo IXC';
                msg = msg.replace(/(<([^>]+)>)/gi, ""); 

                listaFinal.push({
                    id: `ixc-${osIxc.id}`, 
                    ixc_os_id: osIxc.id,
                    ixc_cliente_id: osIxc.id_cliente,
                    tipo_servico: 'IXC', 
                    tipo_imovel: isPredio,
                    municipio_base: osIxc.bairro ? `${osIxc.bairro} (IXC)` : 'Importado', 
                    aceita_encaixe: 0,
                    data_agendamento: data,
                    turno: turnoInferred,
                    status_interno: 'ATRIBUIDO',
                    ixc_tecnico_id: osIxc.id_tecnico,
                    sintoma_relatado: msg,
                    ixc_status: osIxc.status
                });
            }
        }

        listaFinal.forEach(os => {
            if (os.ixc_tecnico_id) {
                os.nome_tecnico = techNamesMap.get(String(os.ixc_tecnico_id)) || `Técnico ${os.ixc_tecnico_id}`;
            }
        });

        res.json(listaFinal);

    } catch (error: any) {
        console.error("Erro ao buscar agendamentos (Local + IXC):", error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/atribuir-tecnico', async (req, res) => {
    const { id_agenda, ixc_tecnico_id, status, ixc_os_id } = req.body;

    try {
        if (!String(id_agenda).startsWith('ixc-')) {
            await executeDb(
                `UPDATE ivp_agenda_os SET ixc_tecnico_id = ?, status_interno = ? WHERE id = ?`,
                [ixc_tecnico_id, status || 'ATRIBUIDO', id_agenda]
            );
        }

        if (ixc_tecnico_id && ixc_os_id) {
            await makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
                id_tecnico: ixc_tecnico_id,
                status: 'A',
            });
        }

        res.json({ success: true, message: "Técnico atribuído com sucesso!" });
    } catch (error: any) {
        console.error("Erro na sincronização com IXC:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.put('/reagendar', async (req, res) => {
    const { ixc_os_id, id_agenda_local, nova_data, novo_turno } = req.body;

    try {
        const horaIXC = novo_turno === 'MATUTINO' ? '08:00:00' : '13:00:00';
        await makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
            data_agenda: `${nova_data} ${horaIXC}`,
            status: 'AG',
            id_tecnico: '',
            melhor_horario_agenda: novo_turno === 'MATUTINO' ? 'M' : 'T'
        });

        if (!String(id_agenda_local).startsWith('ixc-')) {
            await executeDb(
                `UPDATE ivp_agenda_os 
                 SET data_agendamento = ?, turno = ?, ixc_tecnico_id = NULL, status_interno = 'AGUARDANDO_LOGISTICA' 
                 WHERE id = ?`,
                [nova_data, novo_turno, id_agenda_local]
            );
        }

        res.json({ success: true, message: "OS Reagendada com sucesso!" });
    } catch (error: any) {
        console.error("Erro ao reagendar:", error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/fechar-os', async (req, res) => {
    const { ixc_os_id, mensagem_resposta } = req.body;

    try {
        await makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
            status: 'F',
            mensagem_resposta: mensagem_resposta
        });

        res.json({ success: true, message: "OS Finalizada com sucesso!" });
    } catch (error: any) {
        console.error("Erro ao fechar OS:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/os-detalhes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const osDataResp = await makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id', query: id, oper: '=', page: '1', rp: '1'
        });

        if (!osDataResp.registros || osDataResp.registros.length === 0) {
            return res.status(404).json({ error: "OS não encontrada no IXC" });
        }
        const osData = osDataResp.registros[0];

        let clienteName = 'N/A';
        let telefones = 'N/A';
        let contratoName = 'N/A';
        let loginName = 'N/A';

        if (osData.id_cliente) {
            const cliResp = await makeIxcRequest('POST', '/cliente', {
                qtype: 'cliente.id', query: osData.id_cliente, oper: '=', page: '1', rp: '1'
            });
            if (cliResp.registros && cliResp.registros.length > 0) {
                clienteName = cliResp.registros[0].razao;
                const foneCel = cliResp.registros[0].telefone_celular || '';
                const foneRes = cliResp.registros[0].telefone_comercial || '';
                telefones = [foneCel, foneRes].filter(f => f).join(' / ') || 'Sem telefone cadastrado';
            }
        }

        if (osData.id_contrato_kit) {
            const conResp = await makeIxcRequest('POST', '/cliente_contrato', {
                qtype: 'cliente_contrato.id', query: osData.id_contrato_kit, oper: '=', page: '1', rp: '1'
            });
            if (conResp.registros && conResp.registros.length > 0) {
                contratoName = `Contrato #${osData.id_contrato_kit} (${conResp.registros[0].status || 'Ativo'})`;
            }
        }

        if (osData.id_login) {
            const logResp = await makeIxcRequest('POST', '/radusuarios', {
                qtype: 'radusuarios.id', query: osData.id_login, oper: '=', page: '1', rp: '1'
            });
            if (logResp.registros && logResp.registros.length > 0) {
                loginName = logResp.registros[0].login;
            }
        }

        res.json({
            os: osData,
            cliente: { nome: clienteName, telefones },
            contrato: { descricao: contratoName },
            login: { usuario: loginName }
        });

    } catch (error: any) {
        console.error("Erro ao buscar detalhes completos da OS:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;