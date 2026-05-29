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

const makeIxcRequest = async (
    method: Method, 
    endpoint: string, 
    data: any = null, 
    operationType: 'listar' | 'incluir' | 'alterar' | 'integracao' | null = null
) => {
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN; 
    
    const headers: any = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };

    if (operationType) {
        headers['ixcsoft'] = operationType;
    } else if (data && data.qtype) {
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

const getDistanciasBairros = async (bairrosMunicipios: {bairro: string, municipio: string}[]) => {
    const SEDE_INTERVIP = "Rua dos Uirapurus, S29, Morada de Laranjeiras, Serra, ES, 29166-710";
    const mapaDistancias = new Map();
    const bairrosDesconhecidos = [];

    for (const local of bairrosMunicipios) {
        if (!local.bairro) continue;
        const bairroLimpo = local.bairro.replace('(IXC)', '').trim();
        const municipioLimpo = local.municipio === 'Importado' ? 'Serra' : local.municipio.trim();

        const registros = await executeDb(
            `SELECT distancia_metros FROM ivp_distancia_bairros WHERE municipio = ? AND bairro = ?`,
            [municipioLimpo, bairroLimpo]
        );

        if (registros.length > 0) {
            mapaDistancias.set(`${municipioLimpo}-${bairroLimpo}`, registros[0].distancia_metros);
        } else {
            bairrosDesconhecidos.push({ municipio: municipioLimpo, bairro: bairroLimpo });
        }
    }

    if (bairrosDesconhecidos.length > 0) {
        const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
        if (GOOGLE_KEY) {
            for (const local of bairrosDesconhecidos) {
                try {
                    const destination = `${local.bairro}, ${local.municipio}, ES, Brasil`;
                    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(SEDE_INTERVIP)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_KEY}`;
                    
                    const response = await axios.get(url);
                    const row = response.data.rows[0].elements[0];

                    if (row.status === 'OK') {
                        const distMetros = row.distance.value;
                        const tempoSegundos = row.duration.value;

                        await executeDb(
                            `INSERT IGNORE INTO ivp_distancia_bairros (municipio, bairro, distancia_metros, tempo_segundos) VALUES (?, ?, ?, ?)`,
                            [local.municipio, local.bairro, distMetros, tempoSegundos]
                        );
                        
                        mapaDistancias.set(`${local.municipio}-${local.bairro}`, distMetros);
                    }
                } catch (err: any) {
                    console.error(`Erro ao buscar distancia do Google para ${local.bairro}:`, err.message);
                }
            }
        }
    }

    return mapaDistancias;
};

router.get('/tecnicos', async (req, res) => {
    const { data } = req.query;
    try {
        const query = `
            SELECT u.id_funcionario_ixc as id, u.nome, e.equipe, e.dupla_id, e.regiao, e.turno_escala, e.tipo_imovel 
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

router.get('/capacidade-dia', async (req, res) => {
    try {
        const { data } = req.query;
        const result = await executeDb('SELECT * FROM ivp_agenda_capacidade WHERE data = ?', [data]);
        if (result && result.length > 0) {
            res.json({ encontrado: true, ...result[0] });
        } else {
            res.json({ encontrado: false });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/capacidade-templates', async (req, res) => {
    try {
        const templates = await executeDb('SELECT * FROM ivp_agenda_capacidade_templates ORDER BY id ASC');
        res.json(templates);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/salvar-configuracoes', async (req, res) => {
    const { data, tecnicos, capacidades } = req.body;
    
    //console.log(`[DEBUG] Salvando escala para: ${data}`);
    
    try {
        await executeDb('DELETE FROM ivp_agenda_escala WHERE data_escala = ?', [data]);
        
        for (const tec of tecnicos) {
            await executeDb(
                'INSERT INTO ivp_agenda_escala (data_escala, id_funcionario_ixc, equipe, dupla_id, regiao, turno_escala, tipo_imovel) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [data, tec.id, tec.equipe, tec.dupla_id || null, tec.regiao, tec.turno, tec.tipo_imovel]
            );
        }

        if (capacidades) {
            await executeDb('DELETE FROM ivp_agenda_capacidade WHERE data = ?', [data]);
            await executeDb(
                `INSERT INTO ivp_agenda_capacidade 
                (data, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data, 
                    capacidades.casa_m, capacidades.casa_t, 
                    capacidades.predio_serra_m, capacidades.predio_serra_t, 
                    capacidades.predio_outros_m, capacidades.predio_outros_t, 
                    capacidades.inst_serra_m, capacidades.inst_serra_t, 
                    capacidades.inst_outros_m, capacidades.inst_outros_t
                ]
            );
        }

        res.json({ success: true });
    } catch (e: any) {
        console.error("Erro ao salvar configurações:", e);
        res.status(500).json({ error: e.message });
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
        
        const listaFinal: any[] = agendamentosLocais.map((os: any) => ({
            ...os,
            horario_agendado: os.turno === 'MATUTINO' ? '08:00' : '13:00',
            bairro_real: os.municipio_base, 
            cidade_real: os.municipio_base,
            nome_setor: os.tipo_servico === 'INSTALACAO' ? 'Instalação' : 'Manutenção'
        }));

        const dataFiltro = String(data);

        const osLocalResult = await executeDb(
            `SELECT * FROM ivp_agenda_os 
             WHERE data_agendamento = ? 
             OR (solicita_prioridade = 1 AND data_agendamento > ? AND status_interno != 'FINALIZADO' AND status_interno != 'CANCELADO')`,
            [dataFiltro, dataFiltro]
        );

        const priorityIds = osLocalResult
            .filter((o: any) => o.solicita_prioridade === 1 && String(o.data_agendamento).split('T')[0] > dataFiltro)
            .map((o: any) => String(o.ixc_os_id));

        const ixcRespGeral = await makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.data_agenda', query: dataFiltro, oper: '>=', page: '1', rp: '2000'
        });

        const setoresPermitidos = ['5', '9', '19'];

        let agendamentosIxc = (ixcRespGeral.registros || []).filter((os: any) => {
            const ehDoDia = os.data_agenda && os.data_agenda.startsWith(dataFiltro);
            const ehSetorLogistica = setoresPermitidos.includes(String(os.setor));
            return ehDoDia && ehSetorLogistica;
        });

        if (priorityIds.length > 0) {
            for (const pId of priorityIds) {
                if (!agendamentosIxc.some((x: any) => String(x.id) === String(pId))) {
                    try {
                        const pResp = await makeIxcRequest('POST', '/su_oss_chamado', {
                            qtype: 'su_oss_chamado.id', query: pId, oper: '=', page: '1', rp: '1'
                        });
                        if (pResp.registros && pResp.registros.length > 0) {
                            const osPrio = pResp.registros[0];
                            if (setoresPermitidos.includes(String(osPrio.setor))) {
                                agendamentosIxc.push(osPrio);
                            }
                        }
                    } catch(e) {}
                }
            }
        }

        const idCidades = [...new Set(agendamentosIxc.map((o: any) => o.id_cidade).filter(Boolean))];
        const idEstruturas = [...new Set(agendamentosIxc.map((o: any) => o.id_estrutura).filter(Boolean))];
        const idSetores = [...new Set(agendamentosIxc.map((o: any) => o.setor).filter(Boolean))];
        
        const idClientes = [...new Set([
            ...agendamentosIxc.map((o: any) => o.id_cliente),
            ...listaFinal.map((o: any) => o.ixc_cliente_id)
        ].filter(Boolean))];
        
        const idContratos = [...new Set([
            ...agendamentosIxc.map((o: any) => o.id_contrato_kit || o.id_contrato),
            ...listaFinal.map((o: any) => o.ixc_contrato_id)
        ].filter((c: any) => c && c !== '0'))];

        const mapaCidades = new Map<string, string>();
        if (idCidades.length > 0) {
            const cidResp = await makeIxcRequest('POST', '/cidade', { qtype: 'cidade.id', query: idCidades.join(','), oper: 'in', rp: '2000' });
            if (cidResp.registros) cidResp.registros.forEach((c: any) => mapaCidades.set(String(c.id), c.nome));
        }

        const mapaEstruturas = new Map<string, string>();
        if (idEstruturas.length > 0) {
            const estResp = await makeIxcRequest('POST', '/su_oss_estrutura', { qtype: 'su_oss_estrutura.id', query: idEstruturas.join(','), oper: 'in', rp: '2000' });
            if (estResp.registros) estResp.registros.forEach((e: any) => mapaEstruturas.set(String(e.id), e.id_cidade));
        }

        const mapaSetores = new Map<string, string>();
        if (idSetores.length > 0) {
            const setResp = await makeIxcRequest('POST', '/su_ticket_setor', { qtype: 'su_ticket_setor.id', query: idSetores.join(','), oper: 'in', rp: '2000' });
            if (setResp.registros) setResp.registros.forEach((s: any) => mapaSetores.set(String(s.id), s.setor));
        }

        const mapaClienteCond = new Map<string, string>();
        if (idClientes.length > 0) {
            for (const idCli of idClientes) {
                try {
                    const cliResp = await makeIxcRequest('POST', '/cliente', { 
                        qtype: 'cliente.id', query: String(idCli), oper: '=', rp: '1' 
                    });
                    if (cliResp.registros && cliResp.registros.length > 0) {
                        const c = cliResp.registros[0];
                        if (c.id_condominio && c.id_condominio !== '0') {
                            mapaClienteCond.set(String(c.id), c.id_condominio);
                        }
                    }
                } catch(e) {}
            }
        }

        const mapaContratoCond = new Map<string, string>();
        if (idContratos.length > 0) {
            for (const idCont of idContratos) {
                try {
                    const conResp = await makeIxcRequest('POST', '/cliente_contrato', { 
                        qtype: 'cliente_contrato.id', query: String(idCont), oper: '=', rp: '1' 
                    });
                    if (conResp.registros && conResp.registros.length > 0) {
                        const c = conResp.registros[0];
                        if (c.endereco_padrao_cliente === 'S') {
                            mapaContratoCond.set(String(c.id), 'USE_CLIENT');
                        } else if (c.id_condominio && c.id_condominio !== '0') {
                            mapaContratoCond.set(String(c.id), c.id_condominio);
                        }
                    }
                } catch(e) {}
            }
        }

        const mapaCondominios = new Map<string, string>();
        try {
            const condResp = await executeDb('SELECT condominioId, condominio FROM condominio');
            if (condResp && condResp.length > 0) {
                condResp.forEach((c: any) => mapaCondominios.set(String(c.condominioId), c.condominio));
            }
        } catch(e) { 
            console.error("Erro ao buscar tabela local de condominios:", e); 
        }

        for (const osIxc of agendamentosIxc) {
            let horarioExtraido = '12:00';
            if (osIxc.data_agenda && osIxc.data_agenda.includes(' ')) {
                horarioExtraido = osIxc.data_agenda.split(' ')[1].substring(0, 5);
            }

            const indexLocal = listaFinal.findIndex(item => 
                String(item.ixc_os_id) === String(osIxc.id) || 
                String(item.ixc_os_id) === String(osIxc.id_ticket)
            );
            
            const contratoLocal = indexLocal > -1 ? listaFinal[indexLocal].ixc_contrato_id : '0';

            let idCondBusca = osIxc.id_condominio;
            if (!idCondBusca || idCondBusca === '0') {
                
                let idContUsado = (contratoLocal && contratoLocal !== '0') ? contratoLocal : 
                                  (osIxc.id_contrato_kit && osIxc.id_contrato_kit !== '0' ? osIxc.id_contrato_kit : osIxc.id_contrato);

                let condDoContrato = mapaContratoCond.get(String(idContUsado));
                
                if (condDoContrato === 'USE_CLIENT') {
                    idCondBusca = mapaClienteCond.get(String(osIxc.id_cliente)) || '';
                } else {
                    idCondBusca = condDoContrato || mapaClienteCond.get(String(osIxc.id_cliente)) || '';
                }
                
                //console.log(`[DEBUG LOGISTICA - OS #${osIxc.id}] C.Local: ${contratoLocal} | Contrato Eleito: ${idContUsado} | Condominio Contrato: ${condDoContrato} | Final: ${idCondBusca}`);
            }
            
            let nomeCondominio = mapaCondominios.get(String(idCondBusca)) || '';

            let tipoImovel = 'CASA';
            let isRedeNeutra = false;
            let isCorp = false;

            const nomeSetor = mapaSetores.get(String(osIxc.setor)) || 'Não Informado';
            const mensagemUpper = (osIxc.mensagem || '').toUpperCase();
            const setorUpper = nomeSetor.toUpperCase();

            if (mensagemUpper.includes('CORPORATIVO') || mensagemUpper.includes('PROVEDOR') || setorUpper.includes('CORPORATIVO')) {
                isCorp = true;
                tipoImovel = 'CORPORATIVO';
            } else if (nomeCondominio) {
                const upperCond = nomeCondominio.toUpperCase();
                const prefixosCasa = ['SEA', 'VTA', 'VVA', 'CCA', 'GRI'];
                const isCasa = prefixosCasa.some(prefix => upperCond.startsWith(prefix));
                tipoImovel = isCasa ? 'CASA' : 'PRÉDIO';
                if (upperCond.includes('RDNT')) isRedeNeutra = true;
            } else {
                tipoImovel = (osIxc.apartamento || osIxc.bloco) ? 'PRÉDIO' : 'CASA';
            }

            let idCidBusca = osIxc.id_cidade;
            if ((!idCidBusca || idCidBusca === '0') && osIxc.id_estrutura) {
                idCidBusca = mapaEstruturas.get(String(osIxc.id_estrutura));
            }
            const cidadeCorreta = mapaCidades.get(String(idCidBusca)) || 'Serra';

            const isFuturoPrioridade = priorityIds.includes(String(osIxc.id));

            if (indexLocal > -1) {
                const novoStatus = (osIxc.id_tecnico && osIxc.id_tecnico !== '0') ? 'ATRIBUIDO' : 'AGUARDANDO_LOGISTICA';
                const idTecUpdate = (osIxc.id_tecnico && osIxc.id_tecnico !== '0') ? osIxc.id_tecnico : null;

                listaFinal[indexLocal].ixc_tecnico_id = idTecUpdate;
                listaFinal[indexLocal].status_interno = novoStatus;
                listaFinal[indexLocal].ixc_status = osIxc.status;
                listaFinal[indexLocal].horario_agendado = horarioExtraido;
                listaFinal[indexLocal].data_hora_execucao = osIxc.data_hora_execucao; 
                listaFinal[indexLocal].nome_setor = nomeSetor;
                listaFinal[indexLocal].nome_condominio = nomeCondominio;
                listaFinal[indexLocal].tipo_imovel = tipoImovel;
                listaFinal[indexLocal].is_futuro_prioridade = isFuturoPrioridade;
                listaFinal[indexLocal].data_agendamento_original = listaFinal[indexLocal].data_agendamento;

                executeDb(
                    `UPDATE ivp_agenda_os SET ixc_tecnico_id = ?, status_interno = ? WHERE id = ?`,
                    [idTecUpdate, novoStatus, listaFinal[indexLocal].id]
                ).catch(()=>{});

            } 
            else {
                let turnoInferred = 'MATUTINO';
                if (horarioExtraido >= '12:00' && horarioExtraido < '18:00') turnoInferred = 'VESPERTINO';
                else if (horarioExtraido >= '18:00' || horarioExtraido < '06:00') turnoInferred = 'NOTURNO';

                let msg = osIxc.mensagem || 'Agendado pelo IXC';
                msg = msg.replace(/(<([^>]+)>)/gi, "");

                let tipoServicoSinc = 'SUPORTE';
                if (setorUpper.includes('INSTALA') || osIxc.setor === '5') tipoServicoSinc = 'INSTALACAO';

                const novoStatus = (osIxc.id_tecnico && osIxc.id_tecnico !== '0') ? 'ATRIBUIDO' : 'AGUARDANDO_LOGISTICA';
                const idTecnicoInsert = (osIxc.id_tecnico && osIxc.id_tecnico !== '0') ? osIxc.id_tecnico : null;

                try {
                    const insertRes = await executeDb(
                        `INSERT INTO ivp_agenda_os 
                        (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel, municipio_base, aceita_encaixe, solicita_prioridade, data_agendamento, turno, ixc_tecnico_id, status_interno, criado_por)
                        VALUES (?, ?, 0, ?, ?, ?, 0, 0, ?, ?, ?, ?, 'SINC_IXC')`,
                        [osIxc.id, osIxc.id_cliente, tipoServicoSinc, tipoImovel, cidadeCorreta, data, turnoInferred, idTecnicoInsert, novoStatus]
                    );

                    listaFinal.push({
                        id: insertRes.insertId,
                        ixc_os_id: osIxc.id,
                        ixc_cliente_id: osIxc.id_cliente,
                        tipo_servico: 'IXC', 
                        tipo_imovel: tipoImovel,
                        is_rede_neutra: isRedeNeutra,
                        municipio_base: osIxc.bairro ? `${osIxc.bairro} (${cidadeCorreta})` : cidadeCorreta, 
                        aceita_encaixe: 0,
                        solicita_prioridade: 0,
                        data_agendamento: data,
                        turno: turnoInferred,
                        status_interno: novoStatus,
                        ixc_tecnico_id: idTecnicoInsert,
                        sintoma_relatado: msg,
                        ixc_status: osIxc.status,
                        horario_agendado: horarioExtraido,
                        data_hora_execucao: osIxc.data_hora_execucao, 
                        bairro_real: osIxc.bairro || '', 
                        cidade_real: cidadeCorreta,
                        nome_setor: nomeSetor,
                        nome_condominio: nomeCondominio
                    });
                } catch (err) {
                    console.error("Erro ao inserir OS Órfã no Banco Local:", err);
                }
            }
        }

        listaFinal.forEach(os => {
            if (!os.nome_condominio || os.nome_condominio === '') {
                const condDoContrato = mapaContratoCond.get(String(os.ixc_contrato_id));
                let idCondBusca = '';
                
                if (condDoContrato === 'USE_CLIENT') {
                    idCondBusca = mapaClienteCond.get(String(os.ixc_cliente_id)) || '';
                } else {
                    idCondBusca = condDoContrato || mapaClienteCond.get(String(os.ixc_cliente_id)) || '';
                }
                
                os.nome_condominio = mapaCondominios.get(String(idCondBusca)) || '';
                
                //console.log(`[DEBUG LOGISTICA - OS LOCAL #${os.ixc_os_id}] Contrato: ${os.ixc_contrato_id} -> Retorno: ${condDoContrato || 'VAZIO'} | Cliente: ${os.ixc_cliente_id} -> Retorno: ${mapaClienteCond.get(String(os.ixc_cliente_id)) || 'VAZIO'} | ID Eleito: ${idCondBusca} -> Nome Final: ${os.nome_condominio || 'NÃO ACHOU NO BANCO LOCAL'}`);
            }
        });

        const idsTecnicos = [...new Set(listaFinal.map(o => o.ixc_tecnico_id).filter(id => id && id !== '0'))];
        const techNamesMap = new Map<string, string>();
        
        if (idsTecnicos.length > 0) {
            try {
                const uResp = await makeIxcRequest('POST', '/usuarios', { 
                    qtype: 'usuarios.id', query: '0', oper: '>', rp: '2000' 
                });
                
                if (uResp.registros && uResp.registros.length > 0) {
                    uResp.registros.forEach((u: any) => {
                        if (u.funcionario && u.funcionario !== '0') {
                            techNamesMap.set(String(u.funcionario), u.nome);
                        }
                    });
                }
            } catch(e: any) {
                console.log(`[DEBUG LOGISTICA] Falha ao buscar lista geral de usuarios:`, e.message);
            }
        }

        listaFinal.forEach(os => {
            if (os.ixc_tecnico_id && os.ixc_tecnico_id !== '0') {
                os.nome_tecnico = techNamesMap.get(String(os.ixc_tecnico_id)) || `Técnico ${os.ixc_tecnico_id}`;
            }
        });

        const locaisUnicos: { municipio: string, bairro: string }[] = [];
        const locaisVistos = new Set();
        listaFinal.forEach(os => {
            const bairro = (os.bairro_real || '').trim();
            const municipio = (os.cidade_real || 'Serra').trim();
            const chave = `${municipio}-${bairro}`;
            if (bairro && !locaisVistos.has(chave)) {
                locaisVistos.add(chave);
                locaisUnicos.push({ municipio, bairro });
            }
        });

        const mapaDistancias = await getDistanciasBairros(locaisUnicos);

        listaFinal.forEach(os => {
            const bairro = (os.bairro_real || '').trim();
            const municipio = (os.cidade_real || 'Serra').trim();
            os.distancia_sede = mapaDistancias.get(`${municipio}-${bairro}`) || 999999;
        });

        listaFinal.sort((a, b) => {
            const priorityA = (a.ixc_status === 'EX' || a.ixc_status === 'DS') ? 0 : 1;
            const priorityB = (b.ixc_status === 'EX' || b.ixc_status === 'DS') ? 0 : 1;
            if (priorityA !== priorityB) return priorityA - priorityB;

            const urgA = a.solicita_prioridade ? 0 : 1;
            const urgB = b.solicita_prioridade ? 0 : 1;
            if (urgA !== urgB) return urgA - urgB;

            if (a.turno !== b.turno) return (a.turno || '').localeCompare(b.turno || '');
            
            return a.distancia_sede - b.distancia_sede;
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

const getIxcDate = () => {
    const now = new Date();
    now.setHours(now.getHours() - 3); 
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

router.put('/fechar-os', async (req, res) => {
    const { ixc_os_id, mensagem_resposta, id_tarefa, id_processo, id_tarefa_atual, id_tecnico } = req.body;

    try {
        if (id_processo && id_tarefa) {
            const dataHoraAtual = getIxcDate();
            
            const payloadFechamento = {
                "id_chamado": ixc_os_id,
                "data_inicio": dataHoraAtual,
                "data_final": dataHoraAtual,
                "mensagem": mensagem_resposta,
                "id_tecnico": id_tecnico || "138",
                "status": "F",
                "data": dataHoraAtual.split(' ')[0],
                "id_processo": id_processo,
                "id_tarefa_atual": id_tarefa_atual,
                "eh_tarefa_decisao": "N",
                "id_proxima_tarefa": id_tarefa
            };

            const respWfl = await makeIxcRequest('POST', '/su_oss_chamado_fechar', payloadFechamento, 'incluir');
            if (respWfl && respWfl.type === 'error') {
                throw new Error(`Erro WFL IXC: ${respWfl.message.replace(/<br \/>/g, ' - ')}`);
            }
        } else {
            await makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
                status: 'F',
                mensagem_resposta: mensagem_resposta
            });
        }

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

        let ticketData = null;
        if (osData.id_ticket) {
            try {
                const ticketResp = await makeIxcRequest('POST', '/su_ticket', {
                    qtype: 'su_ticket.id', query: osData.id_ticket, oper: '=', page: '1', rp: '1'
                });
                if (ticketResp.registros && ticketResp.registros.length > 0) {
                    ticketData = ticketResp.registros[0];
                }
            } catch(e) { }
        }

        let clienteData = null;
        let telefones = 'N/A';
        let contratoData = null;
        let loginData = null;
        let onuData = null;

        if (osData.id_cliente) {
            const cliResp = await makeIxcRequest('POST', '/cliente', {
                qtype: 'cliente.id', query: osData.id_cliente, oper: '=', page: '1', rp: '1'
            });
            if (cliResp.registros && cliResp.registros.length > 0) {
                clienteData = cliResp.registros[0];
                
                const fones = [
                    clienteData.telefone_celular, 
                    clienteData.telefone_celular_2, 
                    clienteData.telefone_comercial, 
                    clienteData.telefone_residencial, 
                    clienteData.telefone,
                    clienteData.whatsapp
                ];
                
                const fonesLimpos = [...new Set(fones.map(f => (f || '').trim()).filter(f => f !== ''))];
                telefones = fonesLimpos.join(' / ') || 'Sem telefone cadastrado';
            }
        }

        const idContratoBusca = (osData.id_contrato_kit && osData.id_contrato_kit !== '0') ? osData.id_contrato_kit : osData.id_contrato;
        if (idContratoBusca && idContratoBusca !== '0') {
            const conResp = await makeIxcRequest('POST', '/cliente_contrato', {
                qtype: 'cliente_contrato.id', query: idContratoBusca, oper: '=', page: '1', rp: '1'
            });
            if (conResp.registros && conResp.registros.length > 0) {
                contratoData = conResp.registros[0];
            }
        }

        let enderecoFinal = {
            endereco: osData.endereco || '', numero: osData.numero || '', bairro: osData.bairro || '',
            complemento: osData.complemento || '', referencia: osData.referencia || ''
        };

        if (!enderecoFinal.endereco || enderecoFinal.endereco.trim() === '') {
            if (contratoData && contratoData.endereco) {
                enderecoFinal.endereco = contratoData.endereco; enderecoFinal.numero = contratoData.numero;
                enderecoFinal.bairro = contratoData.bairro; enderecoFinal.complemento = contratoData.complemento;
                enderecoFinal.referencia = contratoData.referencia;
            } else if (clienteData && clienteData.endereco) {
                enderecoFinal.endereco = clienteData.endereco; enderecoFinal.numero = clienteData.numero;
                enderecoFinal.bairro = clienteData.bairro; enderecoFinal.complemento = clienteData.complemento;
                enderecoFinal.referencia = clienteData.referencia;
            }
        }

        let historicoPppoe = null;
        let idLoginBusca = osData.id_login;

        if ((!idLoginBusca || idLoginBusca === '0') && contratoData && contratoData.id) {
            const logResp = await makeIxcRequest('POST', '/radusuarios', {
                qtype: 'radusuarios.id_contrato', query: String(contratoData.id), oper: '=', page: '1', rp: '1'
            });
            if (logResp.registros && logResp.registros.length > 0) {
                loginData = logResp.registros[0];
            }
        } else if (idLoginBusca && idLoginBusca !== '0') {
            const logResp = await makeIxcRequest('POST', '/radusuarios', {
                qtype: 'radusuarios.id', query: idLoginBusca, oper: '=', page: '1', rp: '1'
            });
            if (logResp.registros && logResp.registros.length > 0) {
                loginData = logResp.registros[0];
            }
        }

        if (loginData) {
            if (loginData.login) {
                const acctResp = await makeIxcRequest('POST', '/radacct', {
                    qtype: 'radacct.username', query: loginData.login, oper: '=', page: '1', rp: '1', sortname: 'radacctid', sortorder: 'desc'
                });
                if (acctResp.registros && acctResp.registros.length > 0) historicoPppoe = acctResp.registros[0];
            }

            const reqOnuId = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                qtype: 'radpop_radio_cliente_fibra.id_login', query: String(loginData.id), oper: '=', page: '1', rp: '1'
            });

            if (reqOnuId.registros && reqOnuId.registros.length > 0) {
                onuData = reqOnuId.registros[0];
            } else if (loginData.mac) {
                const reqOnuMac = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                    qtype: 'radpop_radio_cliente_fibra.mac', query: String(loginData.mac), oper: '=', page: '1', rp: '1'
                });
                if (reqOnuMac.registros && reqOnuMac.registros.length > 0) onuData = reqOnuMac.registros[0];
            }
        }

        res.json({
            os: { 
                ...osData, 
                ...enderecoFinal,
                relato_ticket: ticketData ? (ticketData.menssagem || ticketData.mensagem || '') : ''
            },
            cliente: { nome: clienteData ? clienteData.razao : 'N/A', telefones },
            contrato: { descricao: contratoData ? `Contrato #${contratoData.id} (${contratoData.status || 'Ativo'})` : 'Sem contrato vinculado' },
            login: { ...loginData, historico: historicoPppoe },
            onu: onuData
        });

    } catch (error: any) {
        console.error("Erro ao buscar detalhes completos da OS:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/onu-realtime', async (req, res) => {
    const { id_fibra } = req.body;
    try {
        await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', { id_registro: id_fibra }, 'integracao');
        
        const onuResp = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
            qtype: 'radpop_radio_cliente_fibra.id', query: String(id_fibra), oper: '=', page: '1', rp: '1'
        });
        
        res.json(onuResp.registros ? onuResp.registros[0] : null);
    } catch (error: any) {
        console.error("Erro ao atualizar ONU na OLT:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post('/tratar-prioridade', async (req, res) => {
    const { id_local, acao, ixc_os_id, data_hoje } = req.body;
    try {
        if (acao === 'aceitar') {
            await executeDb('UPDATE ivp_agenda_os SET data_agendamento = ?, solicita_prioridade = 0 WHERE id = ?', [data_hoje, id_local]);
            
            const localData = await executeDb('SELECT turno FROM ivp_agenda_os WHERE id = ?', [id_local]);
            const turno = localData[0]?.turno || 'MATUTINO';
            const hora = turno === 'MATUTINO' ? '08:00:00' : '13:00:00';
            
            await makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
                data_agenda: `${data_hoje} ${hora}`,
                mensagem_resposta: `A Logística ACEITOU o pedido de prioridade e antecipou o agendamento para HOJE (${data_hoje.split('-').reverse().join('/')}).`
            });
        } else {
            await executeDb('UPDATE ivp_agenda_os SET solicita_prioridade = 0 WHERE id = ?', [id_local]);
            await makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
                mensagem_resposta: `A Logística RECUSOU o pedido de prioridade (Sem viabilidade). O agendamento foi mantido na data original.`
            });
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;