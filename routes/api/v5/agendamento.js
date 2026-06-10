"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/api/v5/agendamento.ts
const Express = require("express");
const axios_1 = require("axios");
const database_1 = require("../../../api/database");
const agendaService_1 = require("./agendaService");
const router = Express.Router();
const executeDb = (query, params = []) => {
    return new Promise((resolve, reject) => {
        database_1.LOCALHOST.query(query, params, (err, results) => {
            if (err)
                return reject(err);
            resolve(results);
        });
    });
};
const makeIxcRequest = (method, endpoint, data = null, operationType = null) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN;
    const headers = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };
    if (operationType) {
        headers['ixcsoft'] = operationType;
    }
    else if (data && data.qtype) {
        headers['ixcsoft'] = 'listar';
        method = 'POST';
    }
    try {
        const response = yield (0, axios_1.default)({ method, url, headers, data });
        return response.data;
    }
    catch (error) {
        console.error(`[IXC Err] ${endpoint}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
});
function dataHojeSaoPauloYmd() {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}
function formatarAgendaIxc(valor) {
    if (!valor || String(valor).startsWith('0000-00-00'))
        return '';
    const str = String(valor).trim();
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (iso)
        return `${iso[3]}/${iso[2]}/${iso[1]}${iso[4] ? ` ${iso[4]}:${iso[5]}` : ''}`;
    const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (br)
        return `${br[1]}/${br[2]}/${br[3]}${br[4] ? ` ${br[4]}:${br[5]}` : ''}`;
    return str;
}
function formatarDataUsuario(valor) {
    if (!valor)
        return '';
    if (valor instanceof Date && !isNaN(valor.getTime())) {
        return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(valor);
    }
    const str = String(valor).trim();
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{2}):(\d{2}))?/);
    if (iso)
        return `${iso[3]}/${iso[2]}/${iso[1]}${iso[4] ? ` ${iso[4]}:${iso[5]}` : ''}`;
    const data = new Date(str);
    if (!isNaN(data.getTime())) {
        return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(data);
    }
    return str;
}
function turnoAmigavel(turno) {
    const t = String(turno || '').toUpperCase();
    if (t === 'MATUTINO')
        return 'Matutino';
    if (t === 'VESPERTINO')
        return 'Vespertino';
    return t || 'Turno não informado';
}
function osJaTemAgendaIxc(osData) {
    const dataAgenda = (osData === null || osData === void 0 ? void 0 : osData.data_agenda) || (osData === null || osData === void 0 ? void 0 : osData.data_agendamento) || (osData === null || osData === void 0 ? void 0 : osData.data_agenda_final);
    if (!dataAgenda || String(dataAgenda).startsWith('0000-00-00'))
        return false;
    return true;
}
const garantirCapacidadeDiaLocal = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const existe = yield executeDb('SELECT data FROM ivp_agenda_capacidade WHERE data = ?', [data]);
    if (existe.length > 0)
        return;
    const dataObj = new Date(`${data}T12:00:00`);
    const diaSemana = dataObj.getDay();
    if (diaSemana === 0) {
        yield executeDb(`INSERT INTO ivp_agenda_capacidade (data, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`, [data]);
        return;
    }
    const templateId = diaSemana === 6 ? 2 : 1;
    let template = yield executeDb('SELECT * FROM ivp_agenda_capacidade_templates WHERE id = ?', [templateId]);
    if (template.length === 0) {
        template = [{
                casa_m: diaSemana === 6 ? 3 : 5,
                casa_t: diaSemana === 6 ? 0 : 5,
                predio_serra_m: diaSemana === 6 ? 3 : 5,
                predio_serra_t: diaSemana === 6 ? 0 : 5,
                predio_outros_m: diaSemana === 6 ? 3 : 5,
                predio_outros_t: diaSemana === 6 ? 0 : 5,
                inst_serra_m: diaSemana === 6 ? 2 : 3,
                inst_serra_t: diaSemana === 6 ? 0 : 3,
                inst_outros_m: diaSemana === 6 ? 2 : 3,
                inst_outros_t: diaSemana === 6 ? 0 : 3
            }];
    }
    const t = template[0];
    yield executeDb(`INSERT INTO ivp_agenda_capacidade (data, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data, t.casa_m, t.casa_t, t.predio_serra_m, t.predio_serra_t, t.predio_outros_m, t.predio_outros_t, t.inst_serra_m, t.inst_serra_t, t.inst_outros_m, t.inst_outros_t]);
});
router.get('/triagem/busca-cliente/:termo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { termo } = req.params;
    try {
        const payloadBusca = {
            qtype: isNaN(Number(termo)) ? "cliente.razao" : "cliente.cnpj_cpf",
            query: termo,
            oper: isNaN(Number(termo)) ? "L" : "=",
            page: "1",
            rp: "5"
        };
        const cliResp = yield makeIxcRequest('POST', '/cliente', payloadBusca);
        if (!cliResp.registros || cliResp.registros.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado no IXC." });
        }
        const cliente = cliResp.registros[0];
        const contratoResp = yield makeIxcRequest('POST', '/cliente_contrato', {
            qtype: "cliente_contrato.id_cliente", query: cliente.id, oper: "=", page: "1", rp: "10"
        });
        const chamadosPendentes = yield makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente", query: cliente.id, oper: "=", page: "1", rp: "10"
        });
        const osAbertas = (chamadosPendentes.registros || []).filter((os) => os.status === 'A' || os.status === 'EN');
        res.json({
            cliente: {
                id: cliente.id, nome: cliente.razao, documento: cliente.cnpj_cpf,
                endereco: cliente.endereco, numero: cliente.numero, bairro: cliente.bairro, cidade: cliente.cidade
            },
            contratos: contratoResp.registros || [],
            os_abertas: osAbertas
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/detalhes-os/:id_ticket', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_ticket } = req.params;
    const { origem } = req.query;
    try {
        let osAberta = null;
        let ticket = null;
        let idCliente = null;
        let idContrato = null;
        const ticketResp = yield makeIxcRequest('POST', '/su_ticket', {
            qtype: 'su_ticket.id', query: id_ticket, oper: '=', rp: '1'
        });
        if (ticketResp.registros && ticketResp.registros.length > 0) {
            ticket = ticketResp.registros[0];
            const osResp = yield makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id_ticket', query: id_ticket, oper: '=', rp: '10',
                sortname: 'su_oss_chamado.id', sortorder: 'desc'
            });
            if (osResp.registros && osResp.registros.length > 0)
                osAberta = osResp.registros[0];
        }
        else {
            const osResp = yield makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id', query: id_ticket, oper: '=', rp: '1'
            });
            if (osResp.registros && osResp.registros.length > 0) {
                osAberta = osResp.registros[0];
                const tResp = yield makeIxcRequest('POST', '/su_ticket', {
                    qtype: 'su_ticket.id', query: osAberta.id_ticket, oper: '=', rp: '1'
                });
                if (tResp.registros && tResp.registros.length > 0)
                    ticket = tResp.registros[0];
            }
        }
        if (!osAberta && !ticket) {
            return res.status(404).json({ error: "Ordem de Serviço ou Atendimento não encontrado no IXC." });
        }
        idCliente = osAberta ? osAberta.id_cliente : ticket.id_cliente;
        idContrato = osAberta ? (osAberta.id_contrato_kit || osAberta.id_contrato) : ticket.id_contrato;
        const cliResp = yield makeIxcRequest('POST', '/cliente', {
            qtype: 'cliente.id', query: idCliente, oper: '=', rp: '1'
        });
        const cliente = (cliResp.registros && cliResp.registros.length > 0) ? cliResp.registros[0] : {};
        let contrato = null;
        if (idContrato && idContrato !== '0') {
            const conResp = yield makeIxcRequest('POST', '/cliente_contrato', {
                qtype: 'cliente_contrato.id', query: idContrato, oper: '=', rp: '1'
            });
            if (conResp.registros && conResp.registros.length > 0) {
                contrato = conResp.registros[0];
            }
        }
        let baseEnd = contrato;
        if (!contrato || contrato.endereco_padrao_cliente === 'S') {
            baseEnd = cliente;
        }
        if (!baseEnd || (!baseEnd.cidade && !baseEnd.endereco)) {
            baseEnd = cliente;
        }
        const idCidade = baseEnd.cidade || '';
        const idCondominio = baseEnd.id_condominio || '';
        const endereco = baseEnd.endereco || '';
        const numero = baseEnd.numero || 'S/N';
        const bairro = baseEnd.bairro || '';
        const bloco = baseEnd.bloco || '';
        const apartamento = baseEnd.apartamento || '';
        const complemento = baseEnd.complemento || '';
        let nomeCidade = 'Desconhecido';
        if (idCidade && idCidade !== '0') {
            try {
                const cidResp = yield makeIxcRequest('POST', '/cidade', { qtype: 'cidade.id', query: idCidade, oper: '=', rp: '1' });
                if (cidResp.registros && cidResp.registros.length > 0)
                    nomeCidade = cidResp.registros[0].nome;
            }
            catch (e) { }
        }
        let nomeCondominio = '';
        if (idCondominio && idCondominio !== '0') {
            try {
                const condResp = yield executeDb('SELECT condominio FROM condominio WHERE condominioId = ?', [idCondominio]);
                if (condResp && condResp.length > 0) {
                    nomeCondominio = condResp[0].condominio;
                }
            }
            catch (e) {
                console.error("Erro ao buscar condominio local no agendamento:", e);
            }
        }
        const isCorp = cliente.id_tipo_cliente === '7' || cliente.id_tipo_cliente === '8';
        const upperCond = nomeCondominio.toUpperCase();
        const prefixosCasa = ['SEA', 'VTA', 'VVA', 'CCA', 'GRI'];
        const isCondCasa = prefixosCasa.some(prefix => upperCond.startsWith(prefix));
        let tipoImovel = 'CASA';
        if (isCorp) {
            tipoImovel = 'CORPORATIVO';
        }
        else if (nomeCondominio) {
            tipoImovel = isCondCasa ? 'CASA' : 'PRÉDIO';
        }
        else if (bloco || apartamento) {
            tipoImovel = 'PRÉDIO';
        }
        let endCompleto = `${endereco}, ${numero} - ${bairro}`;
        if (complemento)
            endCompleto += ` (${complemento})`;
        if (bloco)
            endCompleto += ` | Bloco: ${bloco}`;
        if (apartamento)
            endCompleto += ` | Apto: ${apartamento}`;
        if (nomeCondominio)
            endCompleto += ` | Cond: ${nomeCondominio}`;
        const tipoServico = origem === 'venda' ? 'INSTALAÇÃO' : 'SUPORTE TÉCNICO';
        let mensagem = 'Sem descrição.';
        if (osAberta && osAberta.mensagem)
            mensagem = osAberta.mensagem;
        else if (ticket && ticket.menssagem)
            mensagem = ticket.menssagem;
        res.json({
            id_ticket: osAberta ? osAberta.id : (ticket ? ticket.id : id_ticket),
            cliente_id: cliente.id,
            contrato_id: idContrato || 0,
            nome: cliente.razao,
            endereco: endCompleto,
            cidade: nomeCidade,
            mensagem: mensagem,
            tipo_servico: tipoServico,
            tipo_imovel: tipoImovel
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/confirmar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_ticket, cliente_id, contrato_id, municipio, tipo_servico, tipo_imovel, data_agendamento, turno, aceita_encaixe, usuario_logado, tag_ids, reagendar_existente } = req.body;
    const solicitaPrioridadeAtiva = 0;
    console.log(`[DEBUG HUB AGENDAMENTO] Nova O.S. -> Ticket: ${id_ticket} | Contrato Capturado: ${contrato_id || 'VAZIO'} | Serviço: ${tipo_servico}`);
    try {
        let tipoServicoDb = 'SUPORTE';
        if (String(tipo_servico).toUpperCase().includes('INSTALA')) {
            tipoServicoDb = 'INSTALACAO';
        }
        let ixc_os_id = id_ticket;
        let osData = {};
        const osResp = yield makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_ticket', query: id_ticket, oper: '=', rp: '10',
            sortname: 'su_oss_chamado.id', sortorder: 'desc'
        });
        if (osResp.registros && osResp.registros.length > 0) {
            osData = osResp.registros[0];
            ixc_os_id = osData.id;
        }
        else {
            const osResp2 = yield makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id', query: id_ticket, oper: '=', rp: '1'
            });
            if (osResp2.registros && osResp2.registros.length > 0) {
                osData = osResp2.registros[0];
                ixc_os_id = osData.id;
            }
        }
        if (!osData || !osData.id) {
            throw new Error('OS não localizada no IXC para agendamento.');
        }
        const outroAgendamentoLocal = yield executeDb(`
            SELECT id, ixc_os_id, data_agendamento, turno
            FROM ivp_agenda_os
            WHERE ixc_cliente_id = ?
              AND (? = 0 OR ixc_contrato_id = ?)
              AND ixc_os_id <> ?
              AND data_agendamento >= ?
              AND (status_interno IS NULL OR status_interno NOT IN ('CANCELADO', 'FINALIZADO'))
            LIMIT 1
            `, [cliente_id, contrato_id || 0, contrato_id || 0, ixc_os_id, dataHojeSaoPauloYmd()]);
        if (outroAgendamentoLocal && outroAgendamentoLocal.length > 0) {
            const existente = outroAgendamentoLocal[0];
            yield agendaService_1.AgendaService.registrarMensagemOs(String(existente.ixc_os_id), `[AGENDAMENTO BLOQUEADO - NOVO ASSUNTO]\nO usuário tentou agendar outra OS para este cliente/contrato. Novo assunto informado:\n${osData.mensagem || 'Sem descrição.'}`, usuario_logado, 'Agendamento Duplicado Cliente').catch((err) => console.error('[Agendamento] Falha ao registrar novo assunto na OS existente:', err.message));
            return res.status(409).json({
                code: 'CLIENTE_JA_AGENDADO',
                error: `Este cliente já possui uma OS agendada para ${formatarDataUsuario(existente.data_agendamento)}, turno ${turnoAmigavel(existente.turno)}. O novo assunto foi registrado na OS/agendamento já aberto para que o técnico trate tudo na mesma visita.`,
                agendamento: {
                    ixc_os_id: existente.ixc_os_id,
                    data: formatarDataUsuario(existente.data_agendamento),
                    turno: turnoAmigavel(existente.turno)
                }
            });
        }
        const osAgendadasIxcCliente = yield makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_cliente',
            query: String(cliente_id),
            oper: '=',
            page: '1',
            rp: '50',
            sortname: 'su_oss_chamado.id',
            sortorder: 'desc'
        }).catch(() => ({ registros: [] }));
        const outraOsAgendadaIxc = (osAgendadasIxcCliente.registros || []).find((os) => {
            const mesmaOs = String(os.id) === String(ixc_os_id);
            const mesmoContrato = !contrato_id || !os.id_contrato || String(os.id_contrato) === String(contrato_id) || String(os.id_contrato_kit) === String(contrato_id);
            const statusAberto = !['F', 'C'].includes(String(os.status || '').toUpperCase());
            return !mesmaOs && mesmoContrato && statusAberto && osJaTemAgendaIxc(os);
        });
        if (outraOsAgendadaIxc) {
            yield agendaService_1.AgendaService.registrarMensagemOs(String(outraOsAgendadaIxc.id), `[AGENDAMENTO BLOQUEADO - NOVO ASSUNTO]\nO usuário tentou agendar outra OS para este cliente/contrato. Novo assunto informado:\n${osData.mensagem || 'Sem descrição.'}`, usuario_logado, 'Agendamento Duplicado Cliente IXC').catch((err) => console.error('[Agendamento] Falha ao registrar novo assunto na OS IXC existente:', err.message));
            return res.status(409).json({
                code: 'CLIENTE_JA_AGENDADO',
                error: `Este cliente já possui uma OS agendada para ${formatarAgendaIxc(outraOsAgendadaIxc.data_agenda || outraOsAgendadaIxc.data_agendamento)}. O novo assunto foi registrado na OS/agendamento já aberto para que o técnico trate tudo na mesma visita.`,
                agendamento: {
                    ixc_os_id: outraOsAgendadaIxc.id,
                    data: formatarAgendaIxc(outraOsAgendadaIxc.data_agenda || outraOsAgendadaIxc.data_agendamento),
                    turno: 'IXC'
                }
            });
        }
        const agendamentoLocalExistente = yield executeDb(`
            SELECT id, data_agendamento, turno
            FROM ivp_agenda_os
            WHERE ixc_os_id = ?
              AND data_agendamento >= ?
              AND (status_interno IS NULL OR status_interno NOT IN ('CANCELADO', 'FINALIZADO'))
            LIMIT 1
            `, [ixc_os_id, dataHojeSaoPauloYmd()]);
        const podeReagendarExistente = String(reagendar_existente) === 'true' || reagendar_existente === true;
        if (agendamentoLocalExistente && agendamentoLocalExistente.length > 0 && !podeReagendarExistente) {
            const ag = agendamentoLocalExistente[0];
            return res.status(409).json({
                code: 'OS_JA_AGENDADA',
                can_reagendar: true,
                error: `Esta OS já possui agendamento para ${formatarDataUsuario(ag.data_agendamento)}, turno ${turnoAmigavel(ag.turno)}. Deseja reagendar?`,
                agendamento: {
                    data: formatarDataUsuario(ag.data_agendamento),
                    turno: turnoAmigavel(ag.turno)
                }
            });
        }
        if (osJaTemAgendaIxc(osData) && !podeReagendarExistente) {
            return res.status(409).json({
                code: 'OS_JA_AGENDADA',
                can_reagendar: true,
                error: `Esta OS já possui agendamento para ${formatarAgendaIxc(osData.data_agenda || osData.data_agendamento)}. Deseja reagendar?`,
                agendamento: {
                    data: formatarAgendaIxc(osData.data_agenda || osData.data_agendamento),
                    turno: 'IXC'
                }
            });
        }
        const tecnicoAtual = String(osData.id_tecnico || '');
        if (tecnicoAtual && tecnicoAtual !== '0' && tecnicoAtual !== '138') {
            throw new Error('Esta OS já está atribuída a um técnico no IXC e não pode ser agendada novamente por esta tela.');
        }
        const horaInicio = turno === 'MATUTINO' ? '08:00:00' : '13:00:00';
        const horaFim = turno === 'MATUTINO' ? '12:00:00' : '18:00:00';
        const dataFormatada = data_agendamento.split('-').reverse().join('/');
        const usuarioIxc = yield agendaService_1.AgendaService.obterUsuarioIxcLogado(usuario_logado);
        const msgAgendamento = `AGENDADO VIA INTRANET\nData: ${dataFormatada}\nTurno: ${turno}\nAceita Encaixe: ${aceita_encaixe ? 'SIM' : 'NÃO'}\nColaborador responsável: ${usuarioIxc.nome}`;
        const agora = new Date();
        agora.setHours(agora.getHours() - 3);
        const dataInteracao = agora.toISOString().replace('T', ' ').substring(0, 19);
        const payloadAgendar = {
            "id_chamado": String(ixc_os_id),
            "data_agendamento": `${dataFormatada} ${horaInicio}`,
            "data_agendamento_final": `${dataFormatada} ${horaFim}`,
            "id_resposta": "",
            "mensagem": msgAgendamento,
            // Em su_oss_chamado_reagendar, id_tecnico define o técnico destino da OS; o autor aparece na mensagem pelo usuário logado.
            "id_tecnico": "138",
            "id_equipe": "",
            "status": "AG",
            "data": dataInteracao,
            "id_evento": "",
            "id_compromisso": "",
            "latitude": "",
            "longitude": "",
            "gps_time": ""
        };
        console.log(`\n--- [DEBUG AGENDAMENTO IXC] INICIANDO AGENDAMENTO VIA POST (su_oss_chamado_reagendar) ---`);
        console.log(`OS ID Alvo: ${ixc_os_id} | Técnico Destino: 138 (Hub Intervip)`);
        console.log(`[POST Payload]:`, JSON.stringify(payloadAgendar, null, 2));
        const respAgendar = yield makeIxcRequest('POST', `/su_oss_chamado_reagendar`, payloadAgendar, 'incluir');
        if (respAgendar && respAgendar.type === 'error') {
            throw new Error(`IXC recusou o agendamento: ${respAgendar.message}`);
        }
        let idAgendaLocal = 0;
        if (agendamentoLocalExistente && agendamentoLocalExistente.length > 0) {
            idAgendaLocal = agendamentoLocalExistente[0].id;
            yield executeDb(`UPDATE ivp_agenda_os
                 SET data_agendamento = ?, turno = ?, aceita_encaixe = ?, solicita_prioridade = 0, ixc_tecnico_id = 138, status_interno = 'AGUARDANDO_LOGISTICA'
                 WHERE id = ?`, [data_agendamento, turno, aceita_encaixe ? 1 : 0, idAgendaLocal]);
        }
        else {
            const insertAgenda = yield executeDb(`INSERT INTO ivp_agenda_os
                (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel, municipio_base, aceita_encaixe, solicita_prioridade, data_agendamento, turno, ixc_tecnico_id, status_interno, criado_por)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 138, 'AGUARDANDO_LOGISTICA', 'ATENDIMENTO')`, [
                ixc_os_id,
                cliente_id,
                contrato_id || 0,
                tipoServicoDb,
                tipo_imovel,
                municipio,
                aceita_encaixe ? 1 : 0,
                solicitaPrioridadeAtiva,
                data_agendamento,
                turno
            ]);
            idAgendaLocal = insertAgenda.insertId;
        }
        const tagsSelecionadas = Array.isArray(tag_ids) ? tag_ids.map(String).filter(Boolean) : [];
        if (idAgendaLocal) {
            yield executeDb('DELETE FROM ivp_agenda_os_tags WHERE id_agenda_os = ?', [idAgendaLocal]);
        }
        for (const idTag of tagsSelecionadas) {
            yield executeDb('INSERT IGNORE INTO ivp_agenda_os_tags (id_agenda_os, id_tag) VALUES (?, ?)', [idAgendaLocal, idTag]);
        }
        console.log(`--- [DEBUG AGENDAMENTO IXC] SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO ---\n`);
        res.json({ success: true, message: "Agendamento confirmado com sucesso!" });
    }
    catch (error) {
        console.error("[Erro Agendamento Confirmar]:", error.message);
        res.status(500).json({ error: error.message });
    }
}));
router.get('/vagas-semana', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data_inicio, data_fim, municipio, tipo_servico, tipo_imovel } = req.query;
    try {
        const inicio = new Date(String(data_inicio) + 'T12:00:00');
        const fim = new Date(String(data_fim) + 'T12:00:00');
        const cursor = new Date(inicio);
        while (cursor <= fim) {
            const d = cursor.toISOString().split('T')[0];
            yield garantirCapacidadeDiaLocal(d);
            cursor.setDate(cursor.getDate() + 1);
        }
        const capResult = yield executeDb('SELECT * FROM ivp_agenda_capacidade WHERE data >= ? AND data <= ?', [data_inicio, data_fim]);
        const agendamentos = yield executeDb(`SELECT * FROM ivp_agenda_os
             WHERE data_agendamento >= ? AND data_agendamento <= ?
               AND (status_interno IS NULL OR status_interno NOT IN ('CANCELADO', 'FINALIZADO'))`, [data_inicio, data_fim]);
        const isInstalacao = String(tipo_servico).toUpperCase().includes('INSTALA');
        const isSerra = String(municipio).toUpperCase().includes('SERRA');
        const isPredio = String(tipo_imovel).toUpperCase() === 'PRÉDIO' || String(tipo_imovel).toUpperCase() === 'PREDIO';
        const formatDbDate = (d) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        };
        const isPredioStr = (str) => {
            const s = String(str).toUpperCase();
            return s.includes('PRÉDIO') || s.includes('PREDIO');
        };
        let countFilter = (os) => false;
        if (isInstalacao) {
            countFilter = isSerra
                ? (os) => String(os.tipo_servico).toUpperCase().includes('INSTALA') && String(os.municipio_base).toUpperCase().includes('SERRA')
                : (os) => String(os.tipo_servico).toUpperCase().includes('INSTALA') && !String(os.municipio_base).toUpperCase().includes('SERRA');
        }
        else {
            if (!isPredio) {
                countFilter = (os) => !String(os.tipo_servico).toUpperCase().includes('INSTALA') && !isPredioStr(os.tipo_imovel);
            }
            else {
                countFilter = isSerra
                    ? (os) => !String(os.tipo_servico).toUpperCase().includes('INSTALA') && isPredioStr(os.tipo_imovel) && String(os.municipio_base).toUpperCase().includes('SERRA')
                    : (os) => !String(os.tipo_servico).toUpperCase().includes('INSTALA') && isPredioStr(os.tipo_imovel) && !String(os.municipio_base).toUpperCase().includes('SERRA');
            }
        }
        const result = {};
        let currDate = new Date(String(data_inicio) + 'T00:00:00');
        const endDate = new Date(String(data_fim) + 'T00:00:00');
        while (currDate <= endDate) {
            const dStr = currDate.toISOString().split('T')[0];
            result[dStr] = {
                matutino: { vagas: 0, disponivel: false, msg: "Agenda Fechada" },
                vespertino: { vagas: 0, disponivel: false, msg: "Agenda Fechada" }
            };
            currDate.setDate(currDate.getDate() + 1);
        }
        capResult.forEach((capacidade) => {
            const dStr = formatDbDate(capacidade.data);
            if (!result[dStr])
                return;
            let cap_m = 0, cap_t = 0;
            if (isInstalacao) {
                if (isSerra) {
                    cap_m = capacidade.inst_serra_m;
                    cap_t = capacidade.inst_serra_t;
                }
                else {
                    cap_m = capacidade.inst_outros_m;
                    cap_t = capacidade.inst_outros_t;
                }
            }
            else {
                if (!isPredio) {
                    cap_m = capacidade.casa_m;
                    cap_t = capacidade.casa_t;
                }
                else {
                    if (isSerra) {
                        cap_m = capacidade.predio_serra_m;
                        cap_t = capacidade.predio_serra_t;
                    }
                    else {
                        cap_m = capacidade.predio_outros_m;
                        cap_t = capacidade.predio_outros_t;
                    }
                }
            }
            result[dStr].matutino = { vagas: cap_m, disponivel: cap_m > 0, msg: "" };
            result[dStr].vespertino = { vagas: cap_t, disponivel: cap_t > 0, msg: "" };
        });
        agendamentos.forEach((os) => {
            if (!os.data_agendamento)
                return;
            const dStr = formatDbDate(os.data_agendamento);
            if (result[dStr] && countFilter(os)) {
                if (os.turno === 'MATUTINO')
                    result[dStr].matutino.vagas--;
                if (os.turno === 'VESPERTINO')
                    result[dStr].vespertino.vagas--;
            }
        });
        for (const dStr in result) {
            if (!result[dStr].matutino.msg) {
                result[dStr].matutino.vagas = Math.max(0, result[dStr].matutino.vagas);
                result[dStr].matutino.disponivel = result[dStr].matutino.vagas > 0;
                if (result[dStr].matutino.vagas === 0)
                    result[dStr].matutino.msg = "Esgotado";
            }
            if (!result[dStr].vespertino.msg) {
                result[dStr].vespertino.vagas = Math.max(0, result[dStr].vespertino.vagas);
                result[dStr].vespertino.disponivel = result[dStr].vespertino.vagas > 0;
                if (result[dStr].vespertino.vagas === 0)
                    result[dStr].vespertino.msg = "Esgotado";
            }
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
