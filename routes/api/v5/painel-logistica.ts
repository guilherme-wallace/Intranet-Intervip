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

    throw new Error(`Data de agendamento inválida: ${str}`);
}

function dataHoraAtualSaoPaulo(): string {
    const partes = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date());

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

    if (!data) return res.status(400).json({ error: "A data de filtro é obrigatória" });

    try {
        await AgendaService.garantirCapacidadeDia(data);
        
        const agendamentos = await AgendaService.obterAgendamentos(data, municipio);
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
        turno
    } = req.body;

    try {
        if (!ixc_os_id) {
            return res.status(400).json({ error: 'ixc_os_id é obrigatório.' });
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

        const payloadAtribuir = {
            id_chamado: String(ixc_os_id),
            data_agendamento: `${dataFormatada} ${horaInicio}`,
            data_agendamento_final: `${dataFormatada} ${horaFim}`,
            id_resposta: '',
            mensagem:
                tecnicoFinal === '138'
                    ? 'O.S. devolvida para a fila da Logística (Hub Intervip).'
                    : `AGENDADO VIA INTRANET\nData: ${dataFormatada}\nTurno: ${turnoNormalizado}\nAceita Encaixe: NÃO\nPrioridade: NORMAL`,
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
            throw new Error(`Erro IXC: ${respIxc.message || 'Erro ao atribuir técnico.'}`);
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
            message: 'Técnico atribuído com sucesso no IXC.',
            payload_enviado: payloadAtribuir,
            resposta_ixc: respIxc
        });
    } catch (error: any) {
        console.error('[Logistica] Erro ao atribuir técnico:', error.response?.data || error.message);
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
        let tecnicoFechamento = "138";

        if (usuario_logado && usuario_logado !== 'Visitante') {
            const dbUser = await AgendaService.executeDb(
                'SELECT id_funcionario_ixc FROM usuarios_intranet WHERE usuario = ? OR nome = ? LIMIT 1', 
                [usuario_logado, usuario_logado]
            );
            
            if (dbUser.length > 0 && dbUser[0].id_funcionario_ixc) {
                tecnicoFechamento = String(dbUser[0].id_funcionario_ixc);
            }
        }

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
        res.json({ success: true, message: "OS Finalizada com sucesso!" });
    } catch (error: any) { 
        res.status(500).json({ error: error.message }); 
    }
});

router.post('/tratar-prioridade', async (req, res) => {
    const { id_local, acao, ixc_os_id } = req.body;

    try {
        if (!id_local) {
            return res.status(400).json({ error: 'id_local é obrigatório.' });
        }

        if (!ixc_os_id) {
            return res.status(400).json({ error: 'ixc_os_id é obrigatório.' });
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
            return res.status(404).json({ error: 'Agendamento local não encontrado.' });
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

        if (acao === 'aceitar') {
            const payloadAceitar = {
                id_chamado: String(ixc_os_id),
                data_agendamento: `${hojeBr} ${horaInicio}`,
                data_agendamento_final: `${hojeBr} ${horaFim}`,
                id_resposta: '',
                mensagem: `AGENDADO VIA INTRANET\nData: ${hojeBr}\nTurno: ${turnoNormalizado}\nAceita Encaixe: SIM\nPrioridade: ACEITA PELA LOGÍSTICA`,
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

        return res.status(400).json({ error: 'Ação inválida. Use aceitar ou recusar.' });
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
        const resp = await AgendaService.makeIxcRequest('GET', `/radpop_radio_cliente_fibra/${req.body.id_fibra}/get_info_onu`);
        res.json(resp || null);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/os-detalhes/:id', async (req, res) => {
    try {
        const osResp = await AgendaService.makeIxcRequest('POST', '/su_oss_chamado', { qtype: 'id', query: req.params.id, oper: '=', rp: '1' });
        if (!osResp.registros || osResp.registros.length === 0) return res.status(404).json({ error: 'OS não encontrada' });
        const os = osResp.registros[0];

        const clienteResp = await AgendaService.makeIxcRequest('POST', '/cliente', { qtype: 'id', query: os.id_cliente, oper: '=', rp: '1' });
        const cliente = clienteResp.registros ? clienteResp.registros[0] : {};

        const idContrato = (os.id_contrato_kit && os.id_contrato_kit !== '0') ? os.id_contrato_kit : os.id_contrato;
        const contratoResp = await AgendaService.makeIxcRequest('POST', '/cliente_contrato', { qtype: 'id', query: idContrato, oper: '=', rp: '1' });
        const contrato = contratoResp.registros ? contratoResp.registros[0] : {};

        let login: any = null;
        let onu = null;
        if (idContrato && idContrato !== '0') {
            const loginResp = await AgendaService.makeIxcRequest('POST', '/radusuarios', { qtype: 'id_contrato', query: idContrato, oper: '=', rp: '1' });
            if (loginResp.registros && loginResp.registros.length > 0) {
                login = loginResp.registros[0];
                
                const histResp = await AgendaService.makeIxcRequest('POST', '/radacct', { qtype: 'username', query: login.login, oper: '=', rp: '2', sortname: 'radacctid', sortorder: 'desc' });
                if(histResp.registros && histResp.registros.length > 0) {
                    login.historico_atual = histResp.registros[0];
                    login.historico_queda = histResp.registros.find((h: any) => h.acctstoptime !== null && h.acctstoptime !== '');
                }

                const onuResp = await AgendaService.makeIxcRequest('POST', '/radpop_radio_cliente_fibra', { qtype: 'login', query: login.id, oper: '=', rp: '1' });
                if (onuResp.registros && onuResp.registros.length > 0) {
                    onu = onuResp.registros[0];
                }
            }
        }

        res.json({ os, cliente, contrato, login, onu });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;