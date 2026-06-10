// routes/api/v5/painel-logistica.ts
import * as Express from 'express';
import { AgendaService } from './agendaService';

const router = Express.Router();

function formatarDataIxc(valor: any): string {
    if (!valor) {
        return new Date().toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo'
        });
    }

    const str = String(valor).trim();

    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
        return str.substring(0, 10);
    }

    const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchIso) {
        const [, ano, mes, dia] = matchIso;
        return `${dia}/${mes}/${ano}`;
    }

    const data = new Date(str);
    if (!isNaN(data.getTime())) {
        return data.toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo'
        });
    }

    throw new Error(`Data de agendamento invÃ¡lida: ${str}`);
}

function dataHoraAtualSaoPaulo(): string {
    return AgendaService.dataHoraAtualSaoPaulo();
}

function dataHoraSaoPaulo(date: Date): string {
    const partes = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date);

    return partes.replace('T', ' ');
}

function parseDataBrParaDate(dataBr: string, hora: string): Date {
    const [dia, mes, ano] = dataBr.split('/').map(Number);
    const [hh, mm, ss] = hora.split(':').map(Number);

    return new Date(ano, mes - 1, dia, hh, mm, ss || 0);
}

function formatarHora(date: Date): string {
    return date.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function obterJanelaAgendamentoSegura(dataFormatada: string, turno: string) {
    const turnoNormalizado = String(turno || 'MATUTINO').toUpperCase();

    let horaInicio = turnoNormalizado === 'VESPERTINO'
        ? '13:00:00'
        : '08:00:00';

    let horaFim = turnoNormalizado === 'VESPERTINO'
        ? '18:00:00'
        : '12:00:00';

    const inicioOriginal = parseDataBrParaDate(dataFormatada, horaInicio);
    const fimOriginal = parseDataBrParaDate(dataFormatada, horaFim);

    const agora = new Date();
    const agoraMaisCincoMin = new Date(agora.getTime() + 5 * 60 * 1000);

    const dataHojeBr = agora.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
    });

    const ehHoje = dataFormatada === dataHojeBr;

    if (ehHoje && inicioOriginal < agoraMaisCincoMin) {
        if (agoraMaisCincoMin < fimOriginal) {
            horaInicio = formatarHora(agoraMaisCincoMin);
        } else {
            horaInicio = formatarHora(agoraMaisCincoMin);

            const fimEmergencial = new Date(agoraMaisCincoMin.getTime() + 30 * 60 * 1000);
            horaFim = formatarHora(fimEmergencial);
        }
    }

    return {
        horaInicio,
        horaFim,
        turnoNormalizado
    };
}

router.get('/agendamentos', async (req, res) => {
    const data = req.query.data as string;
    const municipio = req.query.municipio as string;
    const status = req.query.status as string;

    if (!data) return res.status(400).json({ error: "A data de filtro Ã© obrigatÃ³ria" });

    try {
        await AgendaService.garantirCapacidadeDia(data);
        
        const agendamentos = await AgendaService.obterAgendamentos(data, municipio, status);
        res.json(agendamentos);
    } catch (error: any) {
        console.error("[Logistica Controller] Erro na rota /agendamentos:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/fila-pendentes', async (req, res) => {
    try {
        const fila = await AgendaService.obterFilaPendentes();
        res.json(fila);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/tecnicos', async (req, res) => {
    try {
        const query = `
            SELECT u.id_funcionario_ixc as id, u.nome, e.equipe, e.dupla_id, e.regiao, e.turno_escala, e.tipo_imovel 
            FROM usuarios_intranet u
            INNER JOIN ivp_agenda_escala e ON u.id_funcionario_ixc = e.id_funcionario_ixc
            WHERE u.ativo = 1 AND e.data_escala = ? ORDER BY u.nome ASC`;
        const tecnicos = await AgendaService.executeDb(query, [req.query.data]);
        res.json(tecnicos);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/todos-tecnicos', async (req, res) => {
    try {
        const query = `SELECT id_funcionario_ixc as id, nome FROM usuarios_intranet WHERE ativo = 1 AND id_grupo_ixc = 31 AND id_funcionario_ixc IS NOT NULL ORDER BY nome ASC`;
        const todos = await AgendaService.executeDb(query);
        res.json(todos);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/capacidade-dia', async (req, res) => {
    try {
        const result = await AgendaService.executeDb('SELECT * FROM ivp_agenda_capacidade WHERE data = ?', [req.query.data]);
        res.json(result.length > 0 ? { encontrado: true, ...result[0] } : { encontrado: false });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/capacidade-templates', async (req, res) => {
    try {
        const templates = await AgendaService.executeDb('SELECT * FROM ivp_agenda_capacidade_templates ORDER BY id ASC');
        res.json(templates);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/capacidade-templates/salvar', async (req, res) => {
    const { nome, capacidades } = req.body;
    try {
        await AgendaService.executeDb(
            `INSERT INTO ivp_agenda_capacidade_templates (nome, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, capacidades.casa_m, capacidades.casa_t, capacidades.predio_serra_m, capacidades.predio_serra_t, capacidades.predio_outros_m, capacidades.predio_outros_t, capacidades.inst_serra_m, capacidades.inst_serra_t, capacidades.inst_outros_m, capacidades.inst_outros_t]
        );
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/salvar-configuracoes', async (req, res) => {
    const { data, tecnicos, capacidades } = req.body;
    try {
        await AgendaService.executeDb('DELETE FROM ivp_agenda_escala WHERE data_escala = ?', [data]);
        for (const tec of tecnicos) {
            await AgendaService.executeDb(
                'INSERT INTO ivp_agenda_escala (data_escala, id_funcionario_ixc, equipe, dupla_id, regiao, turno_escala, tipo_imovel) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [data, tec.id, tec.equipe, tec.dupla_id || null, tec.regiao, tec.turno, tec.tipo_imovel]
            );
        }
        if (capacidades) {
            await AgendaService.executeDb('DELETE FROM ivp_agenda_capacidade WHERE data = ?', [data]);
            await AgendaService.executeDb(
                `INSERT INTO ivp_agenda_capacidade (data, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [data, capacidades.casa_m, capacidades.casa_t, capacidades.predio_serra_m, capacidades.predio_serra_t, capacidades.predio_outros_m, capacidades.predio_outros_t, capacidades.inst_serra_m, capacidades.inst_serra_t, capacidades.inst_outros_m, capacidades.inst_outros_t]
            );
        }
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/atribuir-tecnico', async (req, res) => {
    const {
        id_agenda,
        ixc_tecnico_id,
        ixc_os_id,
        data_agendamento,
        turno,
        usuario_logado
    } = req.body;

    try {
        if (!ixc_os_id) {
            return res.status(400).json({ error: 'ixc_os_id Ã© obrigatÃ³rio.' });
        }

        const tecnicoFinal =
            ixc_tecnico_id && String(ixc_tecnico_id) !== '0'
                ? String(ixc_tecnico_id)
                : '138';

        const statusLocal =
            tecnicoFinal === '138'
                ? 'AGUARDANDO_LOGISTICA'
                : 'ATRIBUIDO';

        const dataFormatada = formatarDataIxc(data_agendamento);

        const {
            horaInicio,
            horaFim,
            turnoNormalizado
        } = obterJanelaAgendamentoSegura(dataFormatada, turno);

        const dataInteracao = dataHoraAtualSaoPaulo();
        const colaboradorAcao = await AgendaService.obterUsuarioIxcLogado(usuario_logado);

        const payloadAtribuir = {
            id_chamado: String(ixc_os_id),
            data_agendamento: `${dataFormatada} ${horaInicio}`,
            data_agendamento_final: `${dataFormatada} ${horaFim}`,
            id_resposta: '',
            mensagem:
                tecnicoFinal === '138'
                    ? `O.S. devolvida para a fila da Logística (Hub Intervip).\nColaborador responsável: ${colaboradorAcao.nome}`
                    : `AGENDADO VIA INTRANET\nData: ${dataFormatada}\nTurno: ${turnoNormalizado}\nAceita Encaixe: NÃƒO\nColaborador responsável: ${colaboradorAcao.nome}`,
            // Em su_oss_chamado_reagendar, id_tecnico define o técnico destino da OS; o autor aparece na mensagem pelo usuário logado.
            id_tecnico: tecnicoFinal,
            id_equipe: '',
            status: 'AG',
            data: dataInteracao,
            id_evento: '',
            id_compromisso: '',
            latitude: '',
            longitude: '',
            gps_time: ''
        };

        const respIxc = await AgendaService.makeIxcRequest(
            'POST',
            '/su_oss_chamado_reagendar',
            payloadAtribuir,
            'incluir'
        );

        if (respIxc?.type === 'error') {
            throw new Error(`Erro IXC: ${respIxc.message || 'Erro ao atribuir tÃ©cnico.'}`);
        }

        if (id_agenda && !String(id_agenda).startsWith('ixc-')) {
            await AgendaService.executeDb(
                `
                UPDATE ivp_agenda_os
                SET ixc_tecnico_id = ?,
                    status_interno = ?
                WHERE id = ?
                `,
                [tecnicoFinal, statusLocal, id_agenda]
            );
        }

        res.json({
            success: true,
            message: 'TÃ©cnico atribuÃ­do com sucesso no IXC.',
            payload_enviado: payloadAtribuir,
            resposta_ixc: respIxc
        });
    } catch (error: any) {
        console.error('[Logistica] Erro ao atribuir tÃ©cnico:', error.response?.data || error.message);
        res.status(500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

router.put('/reagendar', async (req, res) => {
    try {
        await AgendaService.reagendarOs(req.body);
        res.json({ success: true, message: "OS Reagendada com sucesso!" });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.put('/fechar-os', async (req, res) => {
    const { ixc_os_id, mensagem_resposta, id_tarefa, id_processo, id_tarefa_atual, usuario_logado } = req.body;
    try {
        const tecnicoFechamento = await AgendaService.obterIdFuncionarioIxc(usuario_logado);

        if (id_processo && id_tarefa) {
            const now = new Date(); 
            now.setHours(now.getHours() - 3); 
            const dataHoraAtual = now.toISOString().replace('T', ' ').substring(0, 19);
            
            const payload = {
                "id_chamado": ixc_os_id, 
                "data_inicio": dataHoraAtual, 
                "data_final": dataHoraAtual,
                "mensagem": mensagem_resposta, 
                "id_tecnico": tecnicoFechamento,
                "status": "F",
                "data": dataHoraAtual.split(' ')[0], 
                "id_processo": id_processo,
                "id_tarefa_atual": id_tarefa_atual, 
                "eh_tarefa_decisao": "N", 
                "id_proxima_tarefa": id_tarefa
            };
            const respWfl = await AgendaService.makeIxcRequest('POST', '/su_oss_chamado_fechar', payload, 'incluir');
            if (respWfl && respWfl.type === 'error') throw new Error(`Erro WFL IXC: ${respWfl.message}`);
        } else {
            await AgendaService.makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, { 
                status: 'F', 
                mensagem_resposta: mensagem_resposta,
                id_tecnico: tecnicoFechamento 
            });
        }
        await AgendaService.executeDb(
            `UPDATE ivp_agenda_os SET status_interno = 'FINALIZADO' WHERE ixc_os_id = ?`,
            [ixc_os_id]
        ).catch((dbError: any) => console.error('[Painel Logistica] Falha ao marcar OS local como FINALIZADO:', dbError.message));
        res.json({ success: true, message: "OS Finalizada com sucesso!" });
    } catch (error: any) { 
        res.status(500).json({ error: error.message }); 
    }
});

router.post('/tratar-prioridade', async (req, res) => {
    const { id_local, acao, ixc_os_id, usuario_logado } = req.body;

    try {
        if (!id_local) {
            return res.status(400).json({ error: 'id_local Ã© obrigatÃ³rio.' });
        }

        if (!ixc_os_id) {
            return res.status(400).json({ error: 'ixc_os_id Ã© obrigatÃ³rio.' });
        }

        const rows = await AgendaService.executeDb(
            `
            SELECT id, turno, data_agendamento, ixc_tecnico_id, solicita_prioridade
            FROM ivp_agenda_os
            WHERE id = ?
            LIMIT 1
            `,
            [id_local]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Agendamento local nÃ£o encontrado.' });
        }

        const osLocal = rows[0];
        const turno = osLocal.turno || 'MATUTINO';

        const hojeYmd = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        const hojeBr = formatarDataIxc(hojeYmd);

        const {
            horaInicio,
            horaFim,
            turnoNormalizado
        } = obterJanelaAgendamentoSegura(hojeBr, turno);

        const dataInteracao = dataHoraAtualSaoPaulo();
        const colaboradorAcao = await AgendaService.obterUsuarioIxcLogado(usuario_logado);

        if (acao === 'aceitar') {
            const payloadAceitar = {
                id_chamado: String(ixc_os_id),
                data_agendamento: `${hojeBr} ${horaInicio}`,
                data_agendamento_final: `${hojeBr} ${horaFim}`,
                id_resposta: '',
                mensagem: `AGENDADO VIA INTRANET\nData: ${hojeBr}\nTurno: ${turnoNormalizado}\nAceita Encaixe: SIM\nColaborador responsÃ¡vel: ${colaboradorAcao.nome}`,
                // Aqui 138 é o técnico destino HUB/Logística da OS, não o autor da ação.
                id_tecnico: '138',
                id_equipe: '',
                status: 'AG',
                data: dataInteracao,
                id_evento: '',
                id_compromisso: '',
                latitude: '',
                longitude: '',
                gps_time: ''
            };

            const respIxc = await AgendaService.makeIxcRequest(
                'POST',
                '/su_oss_chamado_reagendar',
                payloadAceitar,
                'incluir'
            );

            if (respIxc?.type === 'error') {
                throw new Error(`Erro IXC: ${respIxc.message || 'IXC recusou a prioridade.'}`);
            }

            await AgendaService.executeDb(
                `
                UPDATE ivp_agenda_os
                SET data_agendamento = ?,
                    turno = ?,
                    solicita_prioridade = 0,
                    ixc_tecnico_id = 138,
                    status_interno = 'AGUARDANDO_LOGISTICA'
                WHERE id = ?
                `,
                [hojeYmd, turnoNormalizado, id_local]
            );

            return res.json({
                success: true,
                message: 'Prioridade aceita. OS puxada para hoje no IXC e no painel.',
                payload_enviado: payloadAceitar,
                resposta_ixc: respIxc
            });
        }

        if (acao === 'recusar') {
            await AgendaService.executeDb(
                `
                UPDATE ivp_agenda_os
                SET solicita_prioridade = 0
                WHERE id = ?
                `,
                [id_local]
            );

            return res.json({
                success: true,
                message: 'Prioridade recusada. O agendamento original foi mantido no IXC.'
            });
        }

        return res.status(400).json({ error: 'AÃ§Ã£o invÃ¡lida. Use aceitar ou recusar.' });
    } catch (error: any) {
        console.error('[Logistica] Erro ao tratar prioridade:', error.response?.data || error.message);

        return res.status(500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

router.get('/tarefas-workflow/:idProcesso', async (req, res) => {
    try {
        const tarefas = await AgendaService.makeIxcRequest('POST', '/su_oss_tarefa', { qtype: 'id_processo', query: req.params.idProcesso, oper: '=', rp: '50' });
        res.json(tarefas.registros || []);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/onu-realtime', async (req, res) => {
    try {
        const idFibra = req.body.id_fibra;
        if (!idFibra) return res.status(400).json({ error: 'id_fibra Ã© obrigatÃ³rio.' });

        await AgendaService.makeIxcRequest('POST', '/radpop_radio_cliente_fibra', { id_registro: idFibra }, 'integracao').catch(() => null);

        const resp = await AgendaService.makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
            qtype: 'radpop_radio_cliente_fibra.id',
            query: String(idFibra),
            oper: '=',
            page: '1',
            rp: '1'
        });

        res.json(resp.registros ? resp.registros[0] : null);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/historico-conexao/:username', async (req, res) => {
    try {
        const resp = await AgendaService.makeIxcRequest('POST', '/radacct', {
            qtype: 'radacct.username',
            query: req.params.username,
            oper: '=',
            page: '1',
            rp: '10',
            sortname: 'radacctid',
            sortorder: 'desc'
        });
        res.json(resp.registros || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/os-detalhes/:id', async (req, res) => {
    try {
        const osResp = await AgendaService.makeIxcRequest('POST', '/su_oss_chamado', { qtype: 'su_oss_chamado.id', query: req.params.id, oper: '=', rp: '1' });
        if (!osResp.registros || osResp.registros.length === 0) return res.status(404).json({ error: 'OS nÃ£o encontrada' });
        const os = osResp.registros[0];

        const clienteResp = await AgendaService.makeIxcRequest('POST', '/cliente', { qtype: 'cliente.id', query: os.id_cliente, oper: '=', rp: '1' });
        const cliente = clienteResp.registros ? clienteResp.registros[0] : {};

        const idContrato = (os.id_contrato_kit && os.id_contrato_kit !== '0') ? os.id_contrato_kit : os.id_contrato;
        const contratoResp = await AgendaService.makeIxcRequest('POST', '/cliente_contrato', { qtype: 'cliente_contrato.id', query: idContrato, oper: '=', rp: '1' });
        const contrato = contratoResp.registros ? contratoResp.registros[0] : {};

        const localRows = await AgendaService.executeDb('SELECT * FROM ivp_agenda_os WHERE ixc_os_id = ? LIMIT 1', [req.params.id]).catch(() => []);
        const local = localRows && localRows.length > 0 ? localRows[0] : {};

        let login: any = null;
        let onu: any = null;
        let mensagens: any[] = [];
        let historicoLogin: any[] = [];
        let resumoAcesso: any = {
            status: 'Sem login',
            quedas_hoje: 0,
            quedas_7_dias: 0,
            rx: 'N/A',
            tx: 'N/A',
            onu_status: 'N/A'
        };

        if (idContrato && idContrato !== '0') {
            const loginResp = await AgendaService.makeIxcRequest('POST', '/radusuarios', { qtype: 'radusuarios.id_contrato', query: idContrato, oper: '=', rp: '1' });
            if (loginResp.registros && loginResp.registros.length > 0) {
                login = loginResp.registros[0];
                const username = login.login || login.user || login.usuario;
                if (username) {
                    const histResp = await AgendaService.makeIxcRequest('POST', '/radacct', {
                        qtype: 'radacct.username', query: username, oper: '=', page: '1', rp: '100', sortname: 'radacctid', sortorder: 'desc'
                    }).catch(() => ({ registros: [] }));
                    historicoLogin = histResp.registros || [];
                    if (historicoLogin.length > 0) {
                        login.historico_atual = historicoLogin[0];
                        login.historico_queda = historicoLogin.find((h: any) => h.acctstoptime !== null && h.acctstoptime !== '');
                    }

                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const seteDias = new Date(hoje);
                    seteDias.setDate(seteDias.getDate() - 7);

                    const getDataHist = (h: any) => new Date(h.acctstarttime || h.acctstoptime || h.fim || h.inicio || 0);
                    const ehQueda = (h: any) => !!(h.acctstoptime || h.tempo_final || h.final);

                    resumoAcesso.quedas_hoje = historicoLogin.filter((h: any) => ehQueda(h) && getDataHist(h) >= hoje).length;
                    resumoAcesso.quedas_7_dias = historicoLogin.filter((h: any) => ehQueda(h) && getDataHist(h) >= seteDias).length;
                    resumoAcesso.status = historicoLogin[0] && !historicoLogin[0].acctstoptime ? 'Online' : 'Offline';
                }

                const tentativasOnu = [
                    { qtype: 'radpop_radio_cliente_fibra.id_login', query: String(login.id) },
                    { qtype: 'id_login', query: String(login.id) },
                    { qtype: 'radpop_radio_cliente_fibra.login', query: String(login.id) },
                    { qtype: 'login', query: String(login.id) }
                ];

                for (const tentativa of tentativasOnu) {
                    const onuResp = await AgendaService.makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                        ...tentativa, oper: '=', rp: '1', sortname: 'id', sortorder: 'desc'
                    }).catch(() => ({ registros: [] }));
                    if (onuResp.registros && onuResp.registros.length > 0) {
                        onu = onuResp.registros[0];
                        break;
                    }
                }

                if (onu) {
                    resumoAcesso.rx = onu.sinal_rx || onu.rx_power || onu.sinal || onu.rx || 'N/A';
                    resumoAcesso.tx = onu.sinal_tx || onu.tx_power || onu.tx || 'N/A';
                    resumoAcesso.onu_status = onu.status || onu.status_fibra || onu.online || 'N/A';
                }
            }
        }

        const msgResp = await AgendaService.makeIxcRequest('POST', '/su_oss_chamado_mensagem', {
            qtype: 'su_oss_chamado_mensagem.id_chamado', query: req.params.id, oper: '=', page: '1', rp: '100', sortname: 'id', sortorder: 'desc'
        }).catch(() => ({ registros: [] }));
        mensagens = await AgendaService.enriquecerMensagensComAutores(msgResp.registros || []);

        res.json({ os, cliente, contrato, login, onu, local, mensagens, historicoLogin, resumoAcesso });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/contato-cliente', async (req, res) => {
    const { id_local, ixc_os_id, status_contato, nova_data, novo_turno, mensagem, usuario_logado } = req.body;

    try {
        if (!id_local || !ixc_os_id || !status_contato) {
            return res.status(400).json({ error: 'id_local, ixc_os_id e status_contato sÃ£o obrigatÃ³rios.' });
        }

        const status = String(status_contato).toUpperCase();
        if (!['CONFIRMADO', 'NAO_RECEBE', 'SEM_CONTATO'].includes(status)) {
            return res.status(400).json({ error: 'Status de contato invÃ¡lido.' });
        }

        if (status === 'NAO_RECEBE' && (!nova_data || !novo_turno)) {
            return res.status(400).json({ error: 'Para marcar como nÃ£o irÃ¡ receber, informe nova_data e novo_turno para reagendar.' });
        }

        const textoBase = mensagem || (
            status === 'CONFIRMADO' ? 'Cliente confirmou que irÃ¡ receber o tÃ©cnico.' :
            status === 'NAO_RECEBE' ? 'Cliente informou que nÃ£o poderÃ¡ receber o tÃ©cnico. Reagendar visita.' :
            'LogÃ­stica nÃ£o conseguiu contato com o cliente.'
        );

        const { dataInteracao } = await AgendaService.registrarMensagemOs(
            String(ixc_os_id),
            `[LOGÃSTICA - CONTATO CLIENTE]\n${textoBase}`,
            usuario_logado,
            'Contato Cliente'
        );

        if (status === 'NAO_RECEBE') {
            await AgendaService.reagendarOs({ ixc_os_id: String(ixc_os_id), id_agenda_local: String(id_local), nova_data, novo_turno, usuario_logado });
        }

        await AgendaService.executeDb(
            `UPDATE ivp_agenda_os SET contato_status = ?, contato_confirmado_em = ?, status_interno = CASE WHEN ? = 'NAO_RECEBE' THEN 'AGUARDANDO_LOGISTICA' ELSE status_interno END WHERE id = ?`,
            [status, dataInteracao, status, id_local]
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.response?.data?.message || error.message });
    }
});

router.post('/aguardar-cliente', async (req, res) => {
    const { id_local, ixc_os_id, minutos, usuario_logado } = req.body;

    try {
        const minutosNum = Number(minutos);
        if (!id_local || !ixc_os_id || !minutosNum || minutosNum <= 0) {
            return res.status(400).json({ error: 'Informe OS, agendamento local e minutos de espera.' });
        }

        const fimEspera = dataHoraSaoPaulo(new Date(Date.now() + minutosNum * 60000));

        await AgendaService.registrarMensagemOs(
            String(ixc_os_id),
            `[LOGÃSTICA]\nTÃ©cnico orientado a aguardar o cliente por ${minutosNum} minuto(s).`,
            usuario_logado,
            'Aguardar Cliente'
        );

        await AgendaService.executeDb(
            `UPDATE ivp_agenda_os SET espera_cliente_ate = ? WHERE id = ?`,
            [fimEspera, id_local]
        );

        res.json({ success: true, espera_cliente_ate: fimEspera });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/parar-espera-cliente', async (req, res) => {
    const { id_local } = req.body;

    try {
        if (!id_local) {
            return res.status(400).json({ error: 'id_local Ã© obrigatÃ³rio.' });
        }

        await AgendaService.executeDb(
            `UPDATE ivp_agenda_os SET espera_cliente_ate = NULL WHERE id = ?`,
            [id_local]
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/observacao-logistica', async (req, res) => {
    const { id_local, ixc_os_id, mensagem, usuario_logado } = req.body;

    try {
        if (!id_local || !ixc_os_id || !mensagem || !String(mensagem).trim()) {
            return res.status(400).json({ error: 'Informe a observaÃ§Ã£o.' });
        }

        const texto = String(mensagem).trim();
        const { dataInteracao } = await AgendaService.registrarMensagemOs(
            String(ixc_os_id),
            `[OBSERVAÃ‡ÃƒO LOGÃSTICA]\n${texto}`,
            usuario_logado,
            'Observacao Logistica'
        );

        await AgendaService.executeDb(
            `UPDATE ivp_agenda_os SET observacao_logistica = CONCAT(COALESCE(observacao_logistica, ''), ?, '\n') WHERE id = ?`,
            [`[${dataInteracao}] ${texto}`, id_local]
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.response?.data?.message || error.message });
    }
});

router.get('/tags', async (_req, res) => {
    try {
        const tags = await AgendaService.executeDb(
            'SELECT * FROM ivp_agenda_tags ORDER BY ativo DESC, ordem ASC, nome ASC'
        );
        res.json(tags || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/tags', async (req, res) => {
    const { nome, cor_fundo, cor_texto, ativo, ordem } = req.body;
    try {
        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ error: 'Nome da tag Ã© obrigatÃ³rio.' });
        }

        const result = await AgendaService.executeDb(
            `
            INSERT INTO ivp_agenda_tags (nome, cor_fundo, cor_texto, ativo, ordem)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                String(nome).trim(),
                cor_fundo || '#0d6efd',
                cor_texto || '#ffffff',
                ativo === false || ativo === 0 || ativo === '0' ? 0 : 1,
                Number(ordem || 0)
            ]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/tags/:id', async (req, res) => {
    const { nome, cor_fundo, cor_texto, ativo, ordem } = req.body;
    try {
        await AgendaService.executeDb(
            `
            UPDATE ivp_agenda_tags
            SET nome = ?, cor_fundo = ?, cor_texto = ?, ativo = ?, ordem = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
                String(nome || '').trim(),
                cor_fundo || '#0d6efd',
                cor_texto || '#ffffff',
                ativo === false || ativo === 0 || ativo === '0' ? 0 : 1,
                Number(ordem || 0),
                req.params.id
            ]
        );
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/tags/:id', async (req, res) => {
    try {
        await AgendaService.executeDb(
            'UPDATE ivp_agenda_tags SET ativo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.params.id]
        );
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/os-tags/:idAgenda', async (req, res) => {
    try {
        const rows = await AgendaService.executeDb(
            `
            SELECT t.id, t.nome, t.cor_fundo, t.cor_texto
            FROM ivp_agenda_os_tags ot
            INNER JOIN ivp_agenda_tags t ON t.id = ot.id_tag
            WHERE ot.id_agenda_os = ? AND t.ativo = 1
            ORDER BY t.ordem ASC, t.nome ASC
            `,
            [req.params.idAgenda]
        );
        res.json(rows || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/os-tags/:idAgenda', async (req, res) => {
    const { tag_ids } = req.body;
    try {
        const ids = Array.isArray(tag_ids) ? tag_ids.map(String).filter(Boolean) : [];
        await AgendaService.executeDb('DELETE FROM ivp_agenda_os_tags WHERE id_agenda_os = ?', [req.params.idAgenda]);

        for (const idTag of ids) {
            await AgendaService.executeDb(
                'INSERT IGNORE INTO ivp_agenda_os_tags (id_agenda_os, id_tag) VALUES (?, ?)',
                [req.params.idAgenda, idTag]
            );
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/prioridade-logistica', async (req, res) => {
    const { id_local, prioridade, observacao } = req.body;
    try {
        if (!id_local || String(id_local).startsWith('fila-')) {
            return res.status(400).json({ error: 'Agendamento local invÃ¡lido.' });
        }

        await AgendaService.executeDb(
            `
            UPDATE ivp_agenda_os
            SET prioridade_logistica = ?, prioridade_logistica_obs = ?
            WHERE id = ?
            `,
            [Number(prioridade || 0), observacao || '', id_local]
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/capacidade-templates/:id', async (req, res) => {
    const { nome, capacidades } = req.body;
    try {
        await AgendaService.executeDb(
            `
            UPDATE ivp_agenda_capacidade_templates
            SET nome = ?, casa_m = ?, casa_t = ?, predio_serra_m = ?, predio_serra_t = ?,
                predio_outros_m = ?, predio_outros_t = ?, inst_serra_m = ?, inst_serra_t = ?,
                inst_outros_m = ?, inst_outros_t = ?
            WHERE id = ?
            `,
            [nome, capacidades.casa_m, capacidades.casa_t, capacidades.predio_serra_m, capacidades.predio_serra_t, capacidades.predio_outros_m, capacidades.predio_outros_t, capacidades.inst_serra_m, capacidades.inst_serra_t, capacidades.inst_outros_m, capacidades.inst_outros_t, req.params.id]
        );
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/capacidade-templates/:id', async (req, res) => {
    try {
        await AgendaService.executeDb('DELETE FROM ivp_agenda_capacidade_templates WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
