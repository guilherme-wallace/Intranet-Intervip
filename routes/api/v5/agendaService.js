"use strict";
// routes/api/v5/agendaService.ts
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
exports.AgendaService = void 0;
const axios_1 = require("axios");
const database_1 = require("../../../api/database");
const logger_1 = require("../../../api/logger");
class AgendaService {
    static executeDb(query, params = []) {
        return new Promise((resolve, reject) => {
            database_1.LOCALHOST.query(query, params, (err, results) => {
                if (err) {
                    (0, logger_1.logError)('DB.executeDb', err, { query, params });
                    return reject(err);
                }
                resolve(results);
            });
        });
    }
    static makeIxcRequest(method, endpoint, data = null, operationType = null) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
            const headers = {
                'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
                'Content-Type': 'application/json'
            };
            if (operationType)
                headers['ixcsoft'] = operationType;
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
    }
    static dataHoraAtualSaoPaulo() {
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
    static normalizarDataParaYmd(valor) {
        const str = String(valor || '').trim();
        const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso)
            return `${iso[1]}-${iso[2]}-${iso[3]}`;
        const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (br)
            return `${br[3]}-${br[2]}-${br[1]}`;
        throw new Error(`Data de agendamento inválida: ${str}`);
    }
    static formatarYmdParaBr(ymd) {
        const [ano, mes, dia] = ymd.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    static dataLocalDePartes(ymd, hora) {
        const [ano, mes, dia] = ymd.split('-').map(Number);
        const [hh, mm, ss] = hora.split(':').map(Number);
        return new Date(ano, mes - 1, dia, hh, mm, ss || 0);
    }
    static formatarHoraLocal(date) {
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date);
    }
    static obterJanelaAgendamentoSegura(dataAgendamento, turno) {
        const dataYmd = this.normalizarDataParaYmd(dataAgendamento);
        const dataBr = this.formatarYmdParaBr(dataYmd);
        const turnoNormalizado = this.normalizarTurnoAgenda(turno);
        let horaInicio = turnoNormalizado === 'VESPERTINO' ? '13:00:00' : '08:00:00';
        let horaFim = turnoNormalizado === 'VESPERTINO' ? '18:00:00' : '12:00:00';
        const agoraSaoPaulo = this.dataHoraAtualSaoPaulo();
        const hojeYmd = agoraSaoPaulo.substring(0, 10);
        const agoraHoraSaoPaulo = agoraSaoPaulo.substring(11, 19);
        const agoraLocalSaoPaulo = this.dataLocalDePartes(hojeYmd, agoraHoraSaoPaulo);
        const agoraMaisCinco = new Date(agoraLocalSaoPaulo.getTime() + 5 * 60 * 1000);
        const inicioPadrao = this.dataLocalDePartes(dataYmd, horaInicio);
        const fimPadrao = this.dataLocalDePartes(dataYmd, horaFim);
        let janelaEmergencial = false;
        if (dataYmd === hojeYmd && inicioPadrao < agoraMaisCinco) {
            horaInicio = this.formatarHoraLocal(agoraMaisCinco);
            if (fimPadrao <= agoraMaisCinco) {
                const fimEmergencial = new Date(agoraMaisCinco.getTime() + 30 * 60 * 1000);
                horaFim = this.formatarHoraLocal(fimEmergencial);
                janelaEmergencial = true;
            }
        }
        const resultado = {
            dataYmd,
            dataBr,
            turnoNormalizado,
            horaInicio,
            horaFim,
            dataAgendamentoIxc: `${dataBr} ${horaInicio}`,
            dataAgendamentoFinalIxc: `${dataBr} ${horaFim}`,
            dataInteracao: agoraSaoPaulo,
            agoraSaoPaulo,
            janelaEmergencial
        };
        console.log('[DEBUG AGENDAMENTO IXC] Janela segura calculada:', {
            dataEscolhida: dataAgendamento,
            turno,
            agoraSaoPaulo,
            resultado
        });
        return resultado;
    }
    static obterIdFuncionarioIxc(usuarioLogado) {
        return __awaiter(this, void 0, void 0, function* () {
            const usuario = yield this.obterUsuarioIxcLogado(usuarioLogado);
            return usuario.id_funcionario_ixc;
        });
    }
    static obterUsuarioIxcLogado(usuarioLogado) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!usuarioLogado || usuarioLogado === 'Visitante') {
                console.warn('[AgendaService] usuario_logado ausente; usando fallback IXC 138 como autor.');
                return { id_funcionario_ixc: '138', id_usuario_ixc: '', nome: 'Hub Intervip', usuario: usuarioLogado || 'Visitante' };
            }
            try {
                const rows = yield this.executeDb(`
                SELECT id_funcionario_ixc, id_usuario_ixc, nome, usuario
                FROM usuarios_intranet
                WHERE ativo = 1 AND usuario = ?
                LIMIT 1
                `, [usuarioLogado]);
                if (rows && rows.length > 0 && rows[0].id_funcionario_ixc) {
                    return {
                        id_funcionario_ixc: String(rows[0].id_funcionario_ixc),
                        id_usuario_ixc: rows[0].id_usuario_ixc ? String(rows[0].id_usuario_ixc) : '',
                        nome: rows[0].nome || rows[0].usuario || String(rows[0].id_funcionario_ixc),
                        usuario: rows[0].usuario || usuarioLogado
                    };
                }
            }
            catch (error) {
                console.error('[AgendaService] Erro ao buscar colaborador IXC:', error);
            }
            console.warn(`[AgendaService] id_funcionario_ixc não encontrado para "${usuarioLogado}"; usando fallback IXC 138 como autor.`);
            return { id_funcionario_ixc: '138', id_usuario_ixc: '', nome: 'Hub Intervip', usuario: usuarioLogado };
        });
    }
    static validarRespostaIxc(resp, mensagemPadrao) {
        if ((resp === null || resp === void 0 ? void 0 : resp.type) === 'error') {
            throw new Error(resp.message || mensagemPadrao);
        }
    }
    static obterOsIxc(ixcOsId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const osResp = yield this.makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id',
                query: String(ixcOsId),
                oper: '=',
                rp: '1'
            });
            const osAtual = (_a = osResp.registros) === null || _a === void 0 ? void 0 : _a[0];
            if (!osAtual) {
                throw new Error(`OS ${ixcOsId} não encontrada no IXC.`);
            }
            return osAtual;
        });
    }
    static registrarMensagemOs(ixcOsId, mensagem, usuarioLogado, contexto = 'IXC Mensagem') {
        return __awaiter(this, void 0, void 0, function* () {
            return this.registrarMensagemSimplesOs(ixcOsId, mensagem, usuarioLogado, contexto);
        });
    }
    static registrarMensagemSimplesOs(ixcOsId, mensagem, usuarioLogado, contexto = 'Mensagem Simples') {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const dataInteracao = this.dataHoraAtualSaoPaulo();
            const osAtual = yield this.obterOsIxc(ixcOsId);
            const usuarioIxc = yield this.obterUsuarioIxcLogado(usuarioLogado);
            const idColaboradorIxc = usuarioIxc.id_funcionario_ixc;
            if (String(idColaboradorIxc) === '138') {
                throw new Error('Não foi possível identificar o colaborador IXC do usuário logado para registrar a mensagem.');
            }
            const eventoPadraoMensagem = '7';
            const eventoFallbackMensagem = '9';
            const origemIdEvento = 'evento padrao de mensagem simples: 7 - Em Analise';
            const origemIdEventoStatus = 'evento padrao de mensagem simples: 7 - Em Analise';
            const statusAtual = String(osAtual.status || osAtual.status_os || osAtual.su_status || '').trim();
            const debugOsAtual = {
                id: osAtual.id,
                status: osAtual.status,
                id_evento: osAtual.id_evento,
                id_evento_status: osAtual.id_evento_status,
                id_wfl_tarefa: osAtual.id_wfl_tarefa,
                id_wfl_processo: osAtual.id_wfl_processo,
                id_equipe: osAtual.id_equipe,
                id_tecnico: osAtual.id_tecnico,
                id_setor: osAtual.id_setor,
                setor: osAtual.setor,
                id_assunto: osAtual.id_assunto,
                id_filial: osAtual.id_filial,
                id_tarefa_atual: osAtual.id_tarefa_atual,
                id_tarefa: osAtual.id_tarefa
            };
            //console.log(`[IXC Mensagem Simples][DEBUG OS Atual][${contexto}]`, debugOsAtual);
            if (!statusAtual) {
                /* console.error(`[IXC Mensagem Simples][${contexto}] OS sem evento/status válido para registrar mensagem:`, {
                    os: ixcOsId,
                    status: osAtual.status,
                    id_evento: osAtual.id_evento,
                    id_evento_status: osAtual.id_evento_status,
                    id_wfl_tarefa: osAtual.id_wfl_tarefa,
                    id_wfl_processo: osAtual.id_wfl_processo,
                    id_tarefa_atual: osAtual.id_tarefa_atual,
                    id_tarefa: osAtual.id_tarefa
                }); */
                throw new Error('Não foi possível registrar a mensagem no IXC: a OS não retornou status/evento atual válido.');
            }
            const montarPayload = (idEventoMensagem) => ({
                id_chamado: String(ixcOsId),
                id_evento: idEventoMensagem,
                id_resposta: '',
                mensagem,
                data_inicio: dataInteracao,
                data_final: dataInteracao,
                id_tecnico: idColaboradorIxc,
                status: statusAtual,
                tipo_cobranca: '',
                id_evento_status: idEventoMensagem,
                data: dataInteracao,
                id_equipe: osAtual.id_equipe || '',
                id_proxima_tarefa: '',
                finaliza_processo: '',
                latitude: '',
                longitude: '',
                gps_time: ''
            });
            //console.log(`[IXC Mensagem Simples][${contexto}] OS ID: ${ixcOsId} | usuario_logado: ${usuarioLogado || 'N/A'} | id_funcionario_ixc: ${idColaboradorIxc} | status: ${statusAtual} | origem_id_evento: ${origemIdEvento} | origem_id_evento_status: ${origemIdEventoStatus}`);
            //console.log(`[IXC Mensagem Simples][${contexto}] evento mensagem simples escolhido: ${eventoPadraoMensagem} - Em Analise`);
            try {
                const payload = montarPayload(eventoPadraoMensagem);
                //console.log(`[IXC Mensagem Simples][${contexto}] Payload final:`, { ...payload, mensagem: String(payload.mensagem || '').substring(0, 300) });
                const resp = yield this.makeIxcRequest('POST', '/su_oss_chamado_mensagem', payload, 'incluir');
                //console.log(`[IXC Mensagem Simples][${contexto}] Resposta IXC:`, resp);
                this.validarRespostaIxc(resp, 'IXC recusou o registro da mensagem da OS.');
                return { resp, osAtual, dataInteracao, idColaboradorIxc, idEventoMensagem: eventoPadraoMensagem };
            }
            catch (error) {
                console.error(`[IXC Mensagem Simples][${contexto}] Erro IXC completo:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                //console.warn('[IXC Mensagem Simples] Evento 7 recusado, tentando evento 9');
                try {
                    const payloadFallback = montarPayload(eventoFallbackMensagem);
                    //console.log(`[IXC Mensagem Simples][${contexto}] Payload final fallback evento 9:`, { ...payloadFallback, mensagem: String(payloadFallback.mensagem || '').substring(0, 300) });
                    const respFallback = yield this.makeIxcRequest('POST', '/su_oss_chamado_mensagem', payloadFallback, 'incluir');
                    //console.log(`[IXC Mensagem Simples][${contexto}] Resposta IXC fallback evento 9:`, respFallback);
                    this.validarRespostaIxc(respFallback, 'IXC recusou o registro da mensagem da OS com evento 9.');
                    //console.log('[IXC Mensagem Simples] Evento 9 aceito');
                    return { resp: respFallback, osAtual, dataInteracao, idColaboradorIxc, idEventoMensagem: eventoFallbackMensagem };
                }
                catch (fallbackError) {
                    console.error(`[IXC Mensagem Simples][${contexto}] Erro IXC fallback evento 9 completo:`, ((_b = fallbackError.response) === null || _b === void 0 ? void 0 : _b.data) || fallbackError.message);
                    throw fallbackError;
                }
            }
        });
    }
    static enriquecerMensagensComAutores(mensagens) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mensagens || mensagens.length === 0)
                return [];
            const ids = [...new Set(mensagens.map(m => String(m.id_tecnico || '').trim()).filter(Boolean))];
            if (ids.length === 0) {
                return mensagens.map(m => (Object.assign(Object.assign({}, m), { autor_nome: 'Sistema/IXC' })));
            }
            const placeholders = ids.map(() => '?').join(',');
            const usuarios = yield this.executeDb(`SELECT id_funcionario_ixc, nome FROM usuarios_intranet WHERE ativo = 1 AND id_funcionario_ixc IN (${placeholders})`, ids).catch(() => []);
            const nomes = new Map((usuarios || []).map((u) => [String(u.id_funcionario_ixc), u.nome]));
            return mensagens.map(m => {
                const idTecnico = String(m.id_tecnico || '').trim();
                let autor = nomes.get(idTecnico) || m.nome_tecnico || m.tecnico || m.usuario || m.nome_usuario || '';
                if (!autor && (!idTecnico || idTecnico === '0'))
                    autor = 'Sistema/IXC';
                if (!autor)
                    autor = `Colaborador IXC ${idTecnico}`;
                return Object.assign(Object.assign({}, m), { autor_nome: autor });
            });
        });
    }
    static abrirFinalizarChamadoDuvidaReagendamento(ixcOsId, usuarioLogado, contexto = 'Reagendamento Duvida') {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[Reagendamento Duvida][${contexto}] Iniciando chamado de dúvida para OS ${ixcOsId}. Usuario: ${usuarioLogado || 'nao informado'}`);
            const osAtual = yield this.obterOsIxc(ixcOsId);
            const usuarioIxc = yield this.obterUsuarioIxcLogado(usuarioLogado);
            const mensagem = `Chamado de dúvida aberto via Intranet para registrar novo assunto no reagendamento da OS ${ixcOsId}.\nColaborador responsável: ${usuarioIxc.nome}`;
            const payloadTicket = {
                id_cliente: osAtual.id_cliente,
                id_contrato: osAtual.id_contrato || osAtual.id_contrato_kit || '',
                titulo: `DÚVIDA - REAGENDAMENTO OS ${ixcOsId}`,
                // O fluxo de reagendamento com dúvida deve usar o processo DÚVIDA (ID 19).
                id_wfl_processo: '19',
                id_assunto: '19',
                id_ticket_setor: osAtual.setor || osAtual.id_setor || osAtual.id_ticket_setor || '4',
                origem_endereco: 'CC',
                tipo: 'C',
                status: 'A',
                su_status: 'N',
                prioridade: 'M',
                su_ticket_origem: 'I',
                mensagem,
                menssagem: mensagem
            };
            console.log(`[Reagendamento Duvida][${contexto}] Payload abertura:`, payloadTicket);
            const ticketDuvida = yield this.makeIxcRequest('POST', '/su_ticket', payloadTicket, 'incluir');
            console.log(`[Reagendamento Duvida][${contexto}] Resposta abertura:`, ticketDuvida);
            this.validarRespostaIxc(ticketDuvida, 'IXC recusou a abertura do chamado de dúvida.');
            const idTicket = String(ticketDuvida.id || ticketDuvida.id_su_ticket || ticketDuvida.id_ticket || '').trim();
            const protocolo = String(ticketDuvida.protocolo || ticketDuvida.protocolo_atendimento || idTicket || '').trim();
            if (!idTicket) {
                throw new Error('Chamado de dúvida criado, mas o IXC não retornou o ID para finalização.');
            }
            const payloadFinalizar = {
                status: 'F',
                su_status: 'S',
                mensagem: `Chamado de dúvida finalizado automaticamente após registro no reagendamento da OS ${ixcOsId}.\nColaborador responsável: ${usuarioIxc.nome}`,
                menssagem: `Chamado de dúvida finalizado automaticamente após registro no reagendamento da OS ${ixcOsId}.\nColaborador responsável: ${usuarioIxc.nome}`
            };
            console.log(`[Reagendamento Duvida][${contexto}] Payload finalização ticket ${idTicket}:`, payloadFinalizar);
            const respFinalizar = yield this.makeIxcRequest('PUT', `/su_ticket/${idTicket}`, payloadFinalizar, 'alterar');
            console.log(`[Reagendamento Duvida][${contexto}] Resposta finalização:`, respFinalizar);
            this.validarRespostaIxc(respFinalizar, 'IXC recusou a finalização do chamado de dúvida.');
            yield this.registrarMensagemOs(String(ixcOsId), `Chamado de dúvida vinculado ao reagendamento: ${protocolo || idTicket}. Chamado finalizado automaticamente.`, usuarioLogado, contexto);
            return { id: idTicket, protocolo: protocolo || idTicket };
        });
    }
    static fetchIxcInBatches(endpoint, table, ids, batchSize = 3) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            const uniqueIds = [...new Set(ids.filter(id => id && id !== '0'))];
            for (let i = 0; i < uniqueIds.length; i += batchSize) {
                const batch = uniqueIds.slice(i, i + batchSize);
                const promises = batch.map(id => this.makeIxcRequest('POST', endpoint, { qtype: `${table}.id`, query: id, oper: '=', rp: '1' }));
                const responses = yield Promise.allSettled(promises);
                responses.forEach(res => {
                    var _a;
                    if (res.status === 'fulfilled' && ((_a = res.value) === null || _a === void 0 ? void 0 : _a.registros)) {
                        results.push(...res.value.registros);
                    }
                });
                yield new Promise(resolve => setTimeout(resolve, 150));
            }
            return results;
        });
    }
    static limparNomeProcesso(valor) {
        const nome = String(valor || '')
            .replace(/\s+/g, ' ')
            .replace(/[.\-\u2013\u2014\s]+$/g, '')
            .trim()
            .toUpperCase();
        return /^PROCESSO\s*#\s*\d+$/i.test(nome) ? '' : nome;
    }
    static extrairProcessoDaMensagemOs(mensagem) {
        const texto = String(mensagem || '').trim();
        if (!texto)
            return '';
        const matchPrincipal = texto.match(/Processo:\s*(.*?)\s*[.\-\u2013\u2014]?\s*Tarefa:/i);
        if (matchPrincipal === null || matchPrincipal === void 0 ? void 0 : matchPrincipal[1])
            return this.limparNomeProcesso(matchPrincipal[1]);
        const matchLinha = texto.match(/Processo:\s*([^\n\r]+)/i);
        if (!(matchLinha === null || matchLinha === void 0 ? void 0 : matchLinha[1]))
            return '';
        return this.limparNomeProcesso(matchLinha[1].split(/Tarefa:/i)[0]);
    }
    static resolverDescricaoProcesso(idProcesso, cacheProcessos, meta = {}) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const id = String(idProcesso || '').trim();
            if (!id)
                return '';
            if (cacheProcessos.has(id))
                return cacheProcessos.get(id) || '';
            try {
                const resposta = yield this.makeIxcRequest('POST', '/wfl_processo', {
                    qtype: 'wfl_processo.id',
                    query: id,
                    oper: '=',
                    rp: '1'
                });
                const nome = this.limparNomeProcesso((_b = (_a = resposta === null || resposta === void 0 ? void 0 : resposta.registros) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.descricao);
                cacheProcessos.set(id, nome);
                return nome;
            }
            catch (error) {
                cacheProcessos.set(id, '');
                (0, logger_1.logError)('[Painel Logistica][Processo OS] falha ao resolver processo', error, {
                    osId: meta.osId,
                    idTicket: meta.idTicket,
                    idProcesso: id,
                    origem: 'wfl_processo'
                });
                return '';
            }
        });
    }
    static resolverProcessoPorTicket(idTicket, cacheTickets, cacheProcessos, osId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const ticketId = String(idTicket || '').trim();
            if (!ticketId || ticketId === '0')
                return '';
            if (cacheTickets.has(ticketId))
                return cacheTickets.get(ticketId) || '';
            try {
                const respostaTicket = yield this.makeIxcRequest('POST', '/su_ticket', {
                    qtype: 'su_ticket.id',
                    query: ticketId,
                    oper: '=',
                    rp: '1'
                });
                const ticket = (_a = respostaTicket === null || respostaTicket === void 0 ? void 0 : respostaTicket.registros) === null || _a === void 0 ? void 0 : _a[0];
                const idProcesso = String((ticket === null || ticket === void 0 ? void 0 : ticket.id_wfl_processo) || '').trim();
                const nome = yield this.resolverDescricaoProcesso(idProcesso, cacheProcessos, {
                    osId,
                    idTicket: ticketId
                });
                cacheTickets.set(ticketId, nome);
                return nome;
            }
            catch (error) {
                cacheTickets.set(ticketId, '');
                (0, logger_1.logError)('[Painel Logistica][Processo OS] falha ao resolver processo', error, {
                    osId,
                    idTicket: ticketId,
                    origem: 'su_ticket'
                });
                return '';
            }
        });
    }
    static normalizarTextoLocal(valor) {
        return String(valor || '').trim().toUpperCase();
    }
    static distanciaFallback(municipio) {
        const mun = this.normalizarTextoLocal(municipio);
        if (mun.includes('SERRA'))
            return 15000;
        if (mun.includes('VITORIA') || mun.includes('VITÓRIA'))
            return 30000;
        if (mun.includes('VILA VELHA') || mun.includes('CARIACICA'))
            return 45000;
        return 999999;
    }
    static carregarTagsPorAgendaIds(idsAgenda) {
        return __awaiter(this, void 0, void 0, function* () {
            const ids = [...new Set(idsAgenda.filter(id => id && !String(id).startsWith('fila-')))];
            const mapa = new Map();
            if (ids.length === 0)
                return mapa;
            const placeholders = ids.map(() => '?').join(',');
            const rows = yield this.executeDb(`
            SELECT ot.id_agenda_os, t.id, t.nome, t.cor_fundo, t.cor_texto, t.ordem
            FROM ivp_agenda_os_tags ot
            INNER JOIN ivp_agenda_tags t ON t.id = ot.id_tag
            WHERE t.ativo = 1 AND ot.id_agenda_os IN (${placeholders})
            ORDER BY t.ordem ASC, t.nome ASC
            `, ids).catch(() => []);
            (rows || []).forEach((row) => {
                const key = String(row.id_agenda_os);
                if (!mapa.has(key))
                    mapa.set(key, []);
                mapa.get(key).push({
                    id: row.id,
                    nome: row.nome,
                    cor_fundo: row.cor_fundo,
                    cor_texto: row.cor_texto
                });
            });
            return mapa;
        });
    }
    static aplicarDistancias(lista) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const chaves = new Map();
            lista.forEach(os => {
                const municipio = String(os.cidade_real || os.municipio_base || '').trim();
                const bairro = String(os.bairro_real || '').trim();
                if (!municipio || !bairro)
                    return;
                chaves.set(`${this.normalizarTextoLocal(municipio)}|${this.normalizarTextoLocal(bairro)}`, { municipio, bairro });
            });
            for (const local of chaves.values()) {
                const rows = yield this.executeDb('SELECT distancia_metros FROM ivp_distancia_bairros WHERE municipio = ? AND bairro = ? LIMIT 1', [local.municipio, local.bairro]).catch(() => []);
                if (!rows || rows.length === 0) {
                    yield this.executeDb(`
                    INSERT IGNORE INTO ivp_distancia_bairros (municipio, bairro, distancia_metros, tempo_segundos)
                    VALUES (?, ?, ?, 0)
                    `, [local.municipio, local.bairro, this.distanciaFallback(local.municipio)]).catch(() => null);
                }
            }
            const distancias = new Map();
            for (const local of chaves.values()) {
                const rows = yield this.executeDb('SELECT distancia_metros FROM ivp_distancia_bairros WHERE municipio = ? AND bairro = ? LIMIT 1', [local.municipio, local.bairro]).catch(() => []);
                const key = `${this.normalizarTextoLocal(local.municipio)}|${this.normalizarTextoLocal(local.bairro)}`;
                distancias.set(key, (_b = (_a = rows === null || rows === void 0 ? void 0 : rows[0]) === null || _a === void 0 ? void 0 : _a.distancia_metros) !== null && _b !== void 0 ? _b : this.distanciaFallback(local.municipio));
            }
            lista.forEach(os => {
                var _a;
                const municipio = String(os.cidade_real || os.municipio_base || '').trim();
                const bairro = String(os.bairro_real || '').trim();
                const key = `${this.normalizarTextoLocal(municipio)}|${this.normalizarTextoLocal(bairro)}`;
                os.distancia_sede = (_a = distancias.get(key)) !== null && _a !== void 0 ? _a : this.distanciaFallback(municipio);
            });
        });
    }
    static ordenarAgendamentos(lista) {
        const pesoStatus = (os) => {
            const status = String(os.ixc_status || '');
            if (status === 'EX')
                return 0;
            if (status === 'DS')
                return 1;
            return 2;
        };
        const pesoTurno = (turno) => String(turno || '') === 'MATUTINO' ? 0 : 1;
        return lista.sort((a, b) => {
            return pesoStatus(a) - pesoStatus(b)
                || Number(b.prioridade_logistica || 0) - Number(a.prioridade_logistica || 0)
                || Number(b.is_futuro_prioridade || b.solicita_prioridade || 0) - Number(a.is_futuro_prioridade || a.solicita_prioridade || 0)
                || pesoTurno(a.turno) - pesoTurno(b.turno)
                || Number(a.distancia_sede || 999999) - Number(b.distancia_sede || 999999)
                || String(a.horario_agendado || '').localeCompare(String(b.horario_agendado || ''));
        });
    }
    static dataParaYmdSaoPaulo(valor) {
        if (!valor)
            return '';
        const str = String(valor).trim();
        const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
        const data = new Date(valor);
        if (!isNaN(data.getTime())) {
            return new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(data);
        }
        return '';
    }
    static obterAgendamentos(dataFiltro, municipioBase, statusFiltro = 'PENDENTES') {
        return __awaiter(this, void 0, void 0, function* () {
            let queryLocal = `SELECT * FROM ivp_agenda_os WHERE data_agendamento = ? AND (status_interno IS NULL OR status_interno NOT IN ('FINALIZADO', 'CANCELADO', 'VISITA_CANCELADA'))`;
            let params = [dataFiltro];
            if (municipioBase && municipioBase !== 'TODOS') {
                if (municipioBase === 'SERRA') {
                    queryLocal += ` AND municipio_base = 'Serra'`;
                }
                else if (municipioBase === 'VV_VIX_CCA') {
                    queryLocal += ` AND municipio_base IN ('Vitória', 'Vila Velha', 'Cariacica')`;
                }
            }
            const agendamentosLocais = yield this.executeDb(queryLocal, params);
            const prioridadesFuturas = yield this.executeDb(`SELECT * FROM ivp_agenda_os WHERE solicita_prioridade = 1 AND data_agendamento > ? AND status_interno NOT IN ('FINALIZADO', 'CANCELADO', 'VISITA_CANCELADA')`, [dataFiltro]);
            const priorityIds = prioridadesFuturas.map((o) => String(o.ixc_os_id));
            const todosLocais = [...agendamentosLocais, ...prioridadesFuturas];
            const setoresPermitidos = ['5', '9', '19'];
            const ixcRespGeral = yield this.makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.data_agenda', query: dataFiltro, oper: 'L', page: '1', rp: '500'
            }).catch(() => ({ registros: [] }));
            const agendamentosIxc = (ixcRespGeral.registros || []).filter((os) => {
                return os.data_agenda && os.data_agenda.startsWith(dataFiltro) && setoresPermitidos.includes(String(os.setor));
            });
            if (String(statusFiltro || '').toUpperCase() === 'FALHAS') {
                // Falhas no quadro: apenas OSs RAG do dia filtrado, nos setores de agenda, sem técnico ou no HUB.
                const ragResp = yield this.makeIxcRequest('POST', '/su_oss_chamado', {
                    qtype: 'su_oss_chamado.status', query: 'RAG', oper: '=', page: '1', rp: '120', sortname: 'id', sortorder: 'desc'
                }).catch(() => ({ registros: [] }));
                (ragResp.registros || []).forEach((os) => {
                    const dataOs = os.data_agenda ? String(os.data_agenda).split(' ')[0] : '';
                    const semTecnicoOuHub = !os.id_tecnico || os.id_tecnico === '0' || String(os.id_tecnico) === '138';
                    const setorAgenda = ['5', '9'].includes(String(os.setor));
                    const tinhaLocalNoDia = todosLocais.some((local) => String(local.ixc_os_id) === String(os.id) && this.dataParaYmdSaoPaulo(local.data_agendamento) === dataFiltro);
                    const deveEntrar = setorAgenda && semTecnicoOuHub && (dataOs === dataFiltro || tinhaLocalNoDia);
                    if (deveEntrar && !agendamentosIxc.some(x => String(x.id) === String(os.id))) {
                        agendamentosIxc.push(os);
                    }
                });
            }
            if (priorityIds.length > 0) {
                const prioIxc = yield this.fetchIxcInBatches('/su_oss_chamado', 'su_oss_chamado', priorityIds);
                prioIxc.forEach(os => {
                    if (setoresPermitidos.includes(String(os.setor)) && !agendamentosIxc.some(x => String(x.id) === String(os.id))) {
                        agendamentosIxc.push(os);
                    }
                });
            }
            const idSetores = [...new Set(agendamentosIxc.map(o => o.setor))];
            const processosPorMensagem = new Map();
            const ticketsParaResolver = new Map();
            agendamentosIxc.forEach((os) => {
                const osId = String((os === null || os === void 0 ? void 0 : os.id) || '').trim();
                const nomeMensagem = this.extrairProcessoDaMensagemOs(os === null || os === void 0 ? void 0 : os.mensagem);
                processosPorMensagem.set(osId, nomeMensagem);
                if (nomeMensagem)
                    return;
                const idTicket = String((os === null || os === void 0 ? void 0 : os.id_ticket) || '').trim();
                if (idTicket && idTicket !== '0' && !ticketsParaResolver.has(idTicket)) {
                    ticketsParaResolver.set(idTicket, osId);
                }
            });
            const cacheTickets = new Map();
            const cacheProcessos = new Map();
            const carregarFallbacksTicket = () => __awaiter(this, void 0, void 0, function* () {
                for (const [idTicket, osId] of ticketsParaResolver) {
                    yield this.resolverProcessoPorTicket(idTicket, cacheTickets, cacheProcessos, osId);
                }
            });
            const [setoresIxc, , condominiosLocais, techsLocais] = yield Promise.all([
                idSetores.length > 0 ? this.makeIxcRequest('POST', '/su_ticket_setor', { qtype: 'su_ticket_setor.id', query: idSetores.join(','), oper: 'in', rp: '2000' }) : { registros: [] },
                carregarFallbacksTicket(),
                this.executeDb('SELECT condominioId, condominio FROM condominio').catch(() => []),
                this.executeDb('SELECT id_funcionario_ixc, nome FROM usuarios_intranet WHERE ativo = 1 AND id_funcionario_ixc IS NOT NULL').catch(() => [])
            ]);
            const dictSetores = new Map((setoresIxc.registros || []).map(s => [String(s.id), s.setor]));
            const dictConds = new Map(condominiosLocais.map((c) => [String(c.condominioId), c.condominio]));
            const dictTechs = new Map(techsLocais.map((u) => [String(u.id_funcionario_ixc), u.nome]));
            const listaFinal = [];
            const errosOs = [];
            for (const osIxc of agendamentosIxc) {
                try {
                    let osLocal = todosLocais.find(item => String(item.ixc_os_id) === String(osIxc.id) ||
                        String(item.ixc_os_id) === String(osIxc.id_ticket));
                    if (!osLocal) {
                        const localExistente = yield this.executeDb('SELECT * FROM ivp_agenda_os WHERE ixc_os_id = ? LIMIT 1', [osIxc.id]);
                        if (localExistente && localExistente.length > 0) {
                            osLocal = localExistente[0];
                        }
                    }
                    const statusLocalAtual = String((osLocal === null || osLocal === void 0 ? void 0 : osLocal.status_interno) || '').toUpperCase();
                    const retornoParaFilaLocal = osLocal &&
                        ['AGUARDANDO_LOGISTICA', 'AGUARDANDO_REAGENDAMENTO'].includes(statusLocalAtual) &&
                        !osLocal.data_agendamento;
                    if (retornoParaFilaLocal) {
                        continue;
                    }
                    const dataLocalYmd = osLocal ? this.dataParaYmdSaoPaulo(osLocal.data_agendamento) : '';
                    const ehPrioridadeFutura = osLocal &&
                        priorityIds.includes(String(osIxc.id)) &&
                        dataLocalYmd > dataFiltro;
                    const idCondBusca = osIxc.id_condominio || (osLocal === null || osLocal === void 0 ? void 0 : osLocal.ixc_condominio_id) || '';
                    const idCidStr = String(osIxc.id_cidade || osIxc.id_estrutura || '');
                    let cidadeCorreta = (osLocal === null || osLocal === void 0 ? void 0 : osLocal.municipio_base) || osIxc.cidade || osIxc.bairro || 'Serra';
                    if (['3172', '3112', '3124', '3173'].includes(idCidStr)) {
                        cidadeCorreta = idCidStr === '3172' ? 'Vila Velha' : (idCidStr === '3173' ? 'Vitória' : (idCidStr === '3112' ? 'Cariacica' : 'Guarapari'));
                    }
                    else if (idCidStr === '3165') {
                        cidadeCorreta = 'Serra';
                    }
                    const nomeCondominio = String(dictConds.get(String(idCondBusca)) || '');
                    const nomeSetor = dictSetores.get(String(osIxc.setor)) || 'Não Informado';
                    //console.log(`[Roteamento OS ${osIxc.id}] ID Cid: ${idCidStr} | Nome IXC: ${dictCidades.get(idCidStr) || 'N/A'} | Condomínio: ${nomeCondominio} => Gaveta: ${cidadeCorreta}`);
                    const mensagemUpper = (osIxc.mensagem || '').toUpperCase();
                    let tipoImovel = 'CASA';
                    let isRedeNeutra = false;
                    if (mensagemUpper.includes('CORPORATIVO') || nomeSetor.toUpperCase().includes('CORPORATIVO')) {
                        tipoImovel = 'CORPORATIVO';
                    }
                    else if (nomeCondominio) {
                        const upperCond = nomeCondominio.toUpperCase();
                        tipoImovel = ['SEA', 'VTA', 'VVA', 'CCA', 'GRI'].some(prefix => upperCond.startsWith(prefix)) ? 'CASA' : 'PRÉDIO';
                        isRedeNeutra = upperCond.includes('RDNT');
                    }
                    else {
                        tipoImovel = (osIxc.apartamento || osIxc.bloco) ? 'PRÉDIO' : 'CASA';
                    }
                    let horarioExtraido = '12:00';
                    if (osIxc.data_agenda && String(osIxc.data_agenda).includes(' ')) {
                        horarioExtraido = String(osIxc.data_agenda).split(' ')[1].substring(0, 5);
                    }
                    const turnoInferred = this.normalizarTurnoAgenda(horarioExtraido);
                    const statusIxcAtual = String(osIxc.status || '').toUpperCase();
                    const novoStatus = statusIxcAtual === 'F' ? 'FINALIZADO' :
                        statusIxcAtual === 'C' ? 'CANCELADO' :
                            (osIxc.id_tecnico && osIxc.id_tecnico !== '0' && String(osIxc.id_tecnico) !== '138') ? 'ATRIBUIDO' : 'AGUARDANDO_LOGISTICA';
                    const tipoServicoSinc = nomeSetor.toUpperCase().includes('INSTALA') || osIxc.setor === '5' ? 'INSTALACAO' : 'SUPORTE';
                    const idAssunto = String(osIxc.id_assunto || '').trim();
                    const idProcessoBruto = String(osIxc.id_wfl_param_os || '').trim();
                    const idProcesso = idProcessoBruto === '0' ? '' : idProcessoBruto;
                    const idTicket = String(osIxc.id_ticket || '').trim();
                    const assuntoOs = String(osIxc.assunto ||
                        osIxc.titulo_assunto ||
                        osIxc.descricao_assunto ||
                        osIxc.nome_assunto ||
                        '').trim();
                    const tituloOs = String(osIxc.titulo || '').trim();
                    const nomeMensagem = processosPorMensagem.get(String(osIxc.id)) || '';
                    const nomeProcesso = nomeMensagem || cacheTickets.get(idTicket) || '';
                    const origemProcesso = nomeMensagem ? 'mensagem' : (nomeProcesso ? 'ticket' : 'nao_resolvido');
                    const mensagemLog = origemProcesso === 'mensagem'
                        ? '[Painel Logistica][Processo OS] resolvido por mensagem'
                        : origemProcesso === 'ticket'
                            ? '[Painel Logistica][Processo OS] resolvido por ticket'
                            : '[Painel Logistica][Processo OS] nao resolvido';
                    (0, logger_1.logInfo)('[Painel Logistica][Processo OS]', mensagemLog, {
                        osId: osIxc.id,
                        idTicket,
                        nomeProcesso,
                        origem: origemProcesso
                    });
                    const payloadFinal = {
                        ixc_os_id: osIxc.id,
                        ixc_cliente_id: osIxc.id_cliente,
                        tipo_servico: osLocal ? osLocal.tipo_servico : tipoServicoSinc,
                        setor: osIxc.setor,
                        tipo_imovel: tipoImovel,
                        is_rede_neutra: isRedeNeutra,
                        turno: ehPrioridadeFutura && osLocal ? this.normalizarTurnoAgenda(osLocal.turno) : this.normalizarTurnoAgenda(turnoInferred),
                        status_interno: novoStatus,
                        ixc_tecnico_id: osIxc.id_tecnico,
                        nome_tecnico: dictTechs.get(String(osIxc.id_tecnico)) || `Técnico ${osIxc.id_tecnico}`,
                        sintoma_relatado: (osIxc.mensagem || '').replace(/(<([^>]+)>)/gi, ""),
                        ixc_status: osIxc.status,
                        horario_agendado: horarioExtraido,
                        data_hora_deslocamento: osIxc.data_hora_deslocamento || osIxc.data_inicio_deslocamento || osIxc.data_deslocamento || osIxc.inicio_deslocamento || null,
                        data_inicio_deslocamento: osIxc.data_inicio_deslocamento || null,
                        data_deslocamento: osIxc.data_deslocamento || null,
                        inicio_deslocamento: osIxc.inicio_deslocamento || null,
                        data_hora_execucao: osIxc.data_hora_execucao,
                        bairro_real: osIxc.bairro || '',
                        cidade_real: cidadeCorreta,
                        municipio_base: osLocal ? osLocal.municipio_base : cidadeCorreta,
                        nome_setor: nomeSetor,
                        id_wfl_processo: osIxc.id_wfl_processo || null,
                        id_wfl_param_os: idProcesso || null,
                        id_assunto: idAssunto || null,
                        assunto: assuntoOs || null,
                        titulo: tituloOs || null,
                        nome_processo: nomeProcesso,
                        nome_condominio: nomeCondominio || (osLocal === null || osLocal === void 0 ? void 0 : osLocal.nome_condominio) || '',
                        is_futuro_prioridade: !!ehPrioridadeFutura,
                        aceita_encaixe: osLocal ? osLocal.aceita_encaixe : 0,
                        solicita_prioridade: osLocal ? osLocal.solicita_prioridade : 0,
                        contato_status: osLocal ? (osLocal.contato_status || 'PENDENTE') : 'PENDENTE',
                        contato_confirmado_em: osLocal ? osLocal.contato_confirmado_em : null,
                        observacao_logistica: osLocal ? (osLocal.observacao_logistica || '') : '',
                        espera_cliente_ate: osLocal ? osLocal.espera_cliente_ate : null,
                        prioridade_logistica: osLocal ? Number(osLocal.prioridade_logistica || 0) : 0,
                        prioridade_logistica_obs: osLocal ? (osLocal.prioridade_logistica_obs || '') : '',
                        preferencia_horario_tipo: osLocal ? (osLocal.preferencia_horario_tipo || 'SEM_PREFERENCIA') : 'SEM_PREFERENCIA',
                        preferencia_horario_inicio: osLocal ? osLocal.preferencia_horario_inicio : null,
                        preferencia_horario_fim: osLocal ? osLocal.preferencia_horario_fim : null,
                        preferencia_horario_obs: osLocal ? (osLocal.preferencia_horario_obs || '') : '',
                        ixc_contrato_id: this.obterContratoOsIxc(osIxc, osLocal),
                        plano_id: osIxc.plano_id || osIxc.id_plano || osIxc.planId || null,
                        id_plano: osIxc.id_plano || null,
                        id_plano_local: osIxc.plano_id || osIxc.id_plano || osIxc.planId || null,
                    };
                    if (osLocal) {
                        if (ehPrioridadeFutura) {
                            yield this.executeDb(`
                        UPDATE ivp_agenda_os
                        SET ixc_contrato_id = COALESCE(NULLIF(?, '0'), ixc_contrato_id),
                            ixc_tecnico_id = ?,
                            status_interno = ?
                        WHERE id = ?
                        `, [payloadFinal.ixc_contrato_id || '0', osIxc.id_tecnico, novoStatus, osLocal.id]);
                            listaFinal.push(Object.assign({ id: osLocal.id, data_agendamento_original: osLocal.data_agendamento }, payloadFinal));
                        }
                        else {
                            yield this.executeDb(`
                        UPDATE ivp_agenda_os
                        SET data_agendamento = ?,
                            turno = ?,
                            ixc_contrato_id = COALESCE(NULLIF(?, '0'), ixc_contrato_id),
                            ixc_tecnico_id = ?,
                            status_interno = ?
                        WHERE id = ?
                        `, [dataFiltro, this.normalizarTurnoAgenda(turnoInferred), payloadFinal.ixc_contrato_id || '0', osIxc.id_tecnico, novoStatus, osLocal.id]);
                            listaFinal.push(Object.assign({ id: osLocal.id, data_agendamento_original: dataFiltro }, payloadFinal));
                        }
                    }
                    else {
                        if (!osIxc.data_agenda || !osIxc.data_agenda.startsWith(dataFiltro)) {
                            continue;
                        }
                        const insertRes = yield this.executeDb(`
                    INSERT INTO ivp_agenda_os
                    (
                        ixc_os_id,
                        ixc_cliente_id,
                        ixc_contrato_id,
                        tipo_servico,
                        tipo_imovel,
                        municipio_base,
                        aceita_encaixe,
                        solicita_prioridade,
                        data_agendamento,
                        turno,
                        ixc_tecnico_id,
                        status_interno,
                        criado_por
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 'SINC_IXC')
                    `, [
                            osIxc.id,
                            osIxc.id_cliente,
                            payloadFinal.ixc_contrato_id || 0,
                            tipoServicoSinc,
                            tipoImovel,
                            cidadeCorreta,
                            dataFiltro,
                            this.normalizarTurnoAgenda(turnoInferred),
                            osIxc.id_tecnico,
                            novoStatus
                        ]);
                        listaFinal.push(Object.assign({ id: insertRes.insertId, data_agendamento_original: dataFiltro }, payloadFinal));
                    }
                }
                catch (error) {
                    errosOs.push({
                        os: osIxc === null || osIxc === void 0 ? void 0 : osIxc.id,
                        cliente: osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_cliente,
                        contrato: (osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_contrato) || (osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_contrato_kit),
                        data_agenda: osIxc === null || osIxc === void 0 ? void 0 : osIxc.data_agenda,
                        status: osIxc === null || osIxc === void 0 ? void 0 : osIxc.status,
                        erro: error === null || error === void 0 ? void 0 : error.message
                    });
                    (0, logger_1.logError)('AgendaService.obterAgendamentos.OSIndividual', error, {
                        dataFiltro,
                        municipioBase,
                        statusFiltro,
                        os: osIxc === null || osIxc === void 0 ? void 0 : osIxc.id,
                        cliente: osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_cliente,
                        contrato: (osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_contrato) || (osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_contrato_kit),
                        data_agenda: osIxc === null || osIxc === void 0 ? void 0 : osIxc.data_agenda,
                        status: osIxc === null || osIxc === void 0 ? void 0 : osIxc.status
                    });
                    continue;
                }
            }
            if (errosOs.length > 0) {
                (0, logger_1.logWarn)('AgendaService.obterAgendamentos', `${errosOs.length} OS(s) pulada(s) por erro individual.`, {
                    dataFiltro,
                    municipioBase,
                    statusFiltro,
                    errosOs
                });
            }
            else {
                (0, logger_1.logInfo)('AgendaService.obterAgendamentos', 'Processamento concluido sem OS individual pulada.', {
                    dataFiltro,
                    total: listaFinal.length
                });
            }
            const tagsPorAgenda = yield this.carregarTagsPorAgendaIds(listaFinal.map((os) => String(os.id)));
            listaFinal.forEach((os) => {
                os.tags = tagsPorAgenda.get(String(os.id)) || [];
            });
            yield this.aplicarPlanosLocais(listaFinal);
            yield this.aplicarDistancias(listaFinal);
            return this.ordenarAgendamentos(listaFinal);
        });
    }
    static obterCandidatosPlano(os) {
        return [
            os === null || os === void 0 ? void 0 : os.id_plano_local,
            os === null || os === void 0 ? void 0 : os.plan_id,
            os === null || os === void 0 ? void 0 : os.plano_id,
            os === null || os === void 0 ? void 0 : os.id_plano,
            os === null || os === void 0 ? void 0 : os.planId
        ]
            .map(valor => String(valor || '').trim())
            .filter(valor => /^\d+$/.test(valor));
    }
    static normalizarTurnoAgenda(valor) {
        const texto = String(valor || '')
            .trim()
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        if (texto === 'MATUTINO' || texto === 'MANHA')
            return 'MATUTINO';
        if (texto === 'VESPERTINO' || texto === 'TARDE')
            return 'VESPERTINO';
        const matchHora = texto.match(/^(\d{1,2}):(\d{2})/);
        if (matchHora) {
            const hora = Number(matchHora[1]);
            return hora >= 12 ? 'VESPERTINO' : 'MATUTINO';
        }
        if (texto === 'NOTURNO' || texto === 'NOITE' || texto === 'INTEGRAL')
            return 'VESPERTINO';
        return 'MATUTINO';
    }
    static obterContratoOsIxc(osIxc, osLocal) {
        const contratoId = [
            osLocal === null || osLocal === void 0 ? void 0 : osLocal.ixc_contrato_id,
            osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_contrato,
            osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_contrato_kit,
            osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_cliente_contrato,
            osIxc === null || osIxc === void 0 ? void 0 : osIxc.cliente_contrato,
            osIxc === null || osIxc === void 0 ? void 0 : osIxc.id_contrato_cliente,
            osIxc === null || osIxc === void 0 ? void 0 : osIxc.contrato_id
        ]
            .map(valor => String(valor || '').trim())
            .find(valor => /^\d+$/.test(valor) && valor !== '0');
        return contratoId || null;
    }
    static obterCandidatosContrato(os) {
        return [
            os === null || os === void 0 ? void 0 : os.ixc_contrato_id,
            os === null || os === void 0 ? void 0 : os.id_contrato,
            os === null || os === void 0 ? void 0 : os.id_contrato_kit,
            os === null || os === void 0 ? void 0 : os.id_cliente_contrato,
            os === null || os === void 0 ? void 0 : os.cliente_contrato,
            os === null || os === void 0 ? void 0 : os.id_contrato_cliente,
            os === null || os === void 0 ? void 0 : os.contrato_id
        ]
            .map(valor => String(valor || '').trim())
            .filter(valor => /^\d+$/.test(valor) && valor !== '0');
    }
    static obterPlanoDoContrato(contrato) {
        return String((contrato === null || contrato === void 0 ? void 0 : contrato.id_vd_contrato) ||
            (contrato === null || contrato === void 0 ? void 0 : contrato.id_plano) ||
            (contrato === null || contrato === void 0 ? void 0 : contrato.plano_id) ||
            (contrato === null || contrato === void 0 ? void 0 : contrato.planId) ||
            '').trim();
    }
    static buscarContratosIxcEmLote(idsContratos) {
        return __awaiter(this, void 0, void 0, function* () {
            const ids = [...new Set(idsContratos.filter(id => id && id !== '0'))];
            if (ids.length === 0)
                return [];
            const resultado = [];
            const tamanhoLote = 100;
            for (let i = 0; i < ids.length; i += tamanhoLote) {
                const lote = ids.slice(i, i + tamanhoLote);
                const resp = yield this.makeIxcRequest('POST', '/cliente_contrato', {
                    qtype: 'cliente_contrato.id',
                    query: lote.join(','),
                    oper: 'in',
                    rp: String(tamanhoLote)
                }).catch(() => ({ registros: [] }));
                if (resp === null || resp === void 0 ? void 0 : resp.registros)
                    resultado.push(...resp.registros);
            }
            const encontrados = new Set(resultado
                .map((contrato) => String((contrato === null || contrato === void 0 ? void 0 : contrato.id) || '').trim())
                .filter(Boolean));
            const faltantes = ids.filter(id => !encontrados.has(id));
            if (faltantes.length > 0) {
                const fallback = yield this.fetchIxcInBatches('/cliente_contrato', 'cliente_contrato', faltantes, 5).catch(() => []);
                resultado.push(...fallback);
            }
            const deduplicados = new Map();
            resultado.forEach((contrato) => {
                const id = String((contrato === null || contrato === void 0 ? void 0 : contrato.id) || '').trim();
                if (id && !deduplicados.has(id))
                    deduplicados.set(id, contrato);
            });
            return [...deduplicados.values()];
        });
    }
    static aplicarPlanosLocais(lista) {
        return __awaiter(this, void 0, void 0, function* () {
            lista.forEach(os => {
                os.nome_plano_local = null;
                os.velocidade_plano = null;
            });
            //console.info(`[Planos Locais] OSs recebidas: ${lista.length}`);
            const idsDiretos = new Set(lista.flatMap(os => this.obterCandidatosPlano(os)));
            const idsContratos = [...new Set(lista.flatMap(os => this.obterCandidatosContrato(os)))];
            //console.info(`[Planos Locais] Contratos únicos: ${idsContratos.length}`);
            let contratosComPlano = 0;
            if (idsContratos.length > 0) {
                const contratos = yield this.buscarContratosIxcEmLote(idsContratos).catch(() => []);
                const planosPorContrato = new Map();
                contratos.forEach((contrato) => {
                    const planoId = this.obterPlanoDoContrato(contrato);
                    if (/^\d+$/.test(planoId)) {
                        contratosComPlano++;
                        [
                            contrato === null || contrato === void 0 ? void 0 : contrato.id,
                            contrato === null || contrato === void 0 ? void 0 : contrato.id_contrato,
                            contrato === null || contrato === void 0 ? void 0 : contrato.id_contrato_kit,
                            contrato === null || contrato === void 0 ? void 0 : contrato.id_cliente_contrato,
                            contrato === null || contrato === void 0 ? void 0 : contrato.cliente_contrato,
                            contrato === null || contrato === void 0 ? void 0 : contrato.id_contrato_cliente,
                            contrato === null || contrato === void 0 ? void 0 : contrato.contrato_id
                        ]
                            .map(valor => String(valor || '').trim())
                            .filter(valor => /^\d+$/.test(valor) && valor !== '0')
                            .forEach(contratoId => planosPorContrato.set(contratoId, planoId));
                        idsDiretos.add(planoId);
                    }
                    else {
                        const contratoId = String((contrato === null || contrato === void 0 ? void 0 : contrato.id) || '').trim() || 'N/A';
                        const camposPlano = ['id_vd_contrato', 'id_plano', 'plano_id', 'planId']
                            .filter(campo => Object.prototype.hasOwnProperty.call(contrato || {}, campo))
                            .join(',') || 'nenhum';
                        //console.info(`[Planos Locais] Contrato sem id de plano: contratoId=${contratoId} campos=${camposPlano}`);
                    }
                });
                lista.forEach(os => {
                    const contratoId = this.obterCandidatosContrato(os).find(id => planosPorContrato.has(id));
                    if (!contratoId)
                        return;
                    const planoContrato = planosPorContrato.get(contratoId);
                    os.id_plano_local = planoContrato ? Number(planoContrato) : os.id_plano_local;
                });
            }
            //console.info(`[Planos Locais] Contratos com plano: ${contratosComPlano}`);
            const ids = [...idsDiretos];
            if (ids.length === 0) {
                //console.info('[Planos Locais] Nenhum ID real de plano encontrado para consultar.');
                return;
            }
            const placeholders = ids.map(() => '?').join(',');
            const planos = yield this.executeDb(`SELECT planId, name, speed FROM plan WHERE planId IN (${placeholders})`, ids).catch(() => []);
            const mapaPlanos = new Map((planos || []).map((plano) => [String(plano.planId), plano]));
            const planosNaoEncontrados = ids.filter(id => !mapaPlanos.has(id));
            let osComVelocidade = 0;
            lista.forEach(os => {
                const planoId = this.obterCandidatosPlano(os).find(id => mapaPlanos.has(id));
                if (!planoId)
                    return;
                const plano = mapaPlanos.get(planoId);
                os.plano_id = Number(planoId);
                os.id_plano_local = Number(planoId);
                os.nome_plano_local = (plano === null || plano === void 0 ? void 0 : plano.name) || null;
                os.velocidade_plano = Number((plano === null || plano === void 0 ? void 0 : plano.speed) || 0) || null;
                if (os.velocidade_plano)
                    osComVelocidade++;
            });
            //console.info(`[Planos Locais] IDs reais de plano consultados: ${ids.join(', ')}.`);
            //console.info(`[Planos Locais] Planos encontrados no banco local: ${mapaPlanos.size}.`);
            if (planosNaoEncontrados.length > 0)
                console.info(`[Planos Locais] Planos não encontrados: ${planosNaoEncontrados.join(', ')}.`);
            //console.info(`[Planos Locais] OSs com velocidade aplicada: ${osComVelocidade}.`);
        });
    }
    static reagendarOs(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const janelaSegura = this.obterJanelaAgendamentoSegura(payload.nova_data, payload.novo_turno);
            const dataFormatada = janelaSegura.dataBr;
            const dataInteracao = janelaSegura.dataInteracao;
            const tecnicoDestino = payload.id_tecnico || "138";
            const colaboradorAcao = yield this.obterUsuarioIxcLogado(payload.usuario_logado);
            const preferencia = this.formatarPreferenciaHorario(payload);
            let protocoloDuvida = '';
            if (payload.abrir_chamado_duvida) {
                const chamadoDuvida = yield this.abrirFinalizarChamadoDuvidaReagendamento(String(payload.ixc_os_id), payload.usuario_logado, 'Reagendamento Duvida Painel');
                protocoloDuvida = chamadoDuvida.protocolo;
            }
            const linhaDuvida = payload.abrir_chamado_duvida
                ? `\nChamado de duvida/protocolo relacionado: ${protocoloDuvida || 'protocolo nao retornado pelo IXC'}.`
                : '\nApenas reagendamento solicitado.';
            const payloadReagendar = {
                "id_chamado": payload.ixc_os_id,
                "data_agendamento": janelaSegura.dataAgendamentoIxc,
                "data_agendamento_final": janelaSegura.dataAgendamentoFinalIxc,
                "id_resposta": "",
                "mensagem": `Reagendado via Painel de Logística para ${dataFormatada} (${payload.novo_turno}).${preferencia ? `\nPreferência de horário: ${preferencia}` : ''}\nColaborador responsável: ${colaboradorAcao.nome}`,
                // Em su_oss_chamado_reagendar, id_tecnico define o técnico destino da OS; o autor aparece na mensagem pelo usuário logado.
                "id_tecnico": tecnicoDestino,
                "id_equipe": "",
                "status": "AG",
                "data": dataInteracao,
                "id_evento": "",
                "id_compromisso": "",
                "latitude": "",
                "longitude": "",
                "gps_time": ""
            };
            console.log('[DEBUG AGENDAMENTO IXC] Reagendamento painel:', {
                osId: payload.ixc_os_id,
                usuarioLogado: payload.usuario_logado || 'não informado',
                tecnicoDestino,
                dataSelecionada: payload.nova_data,
                turno: payload.novo_turno,
                janelaSegura,
                payloadFinal: payloadReagendar
            });
            const respIxc = yield this.makeIxcRequest('POST', '/su_oss_chamado_reagendar', payloadReagendar, 'incluir');
            console.log('[DEBUG AGENDAMENTO IXC] Resposta reagendamento painel:', respIxc);
            this.validarRespostaIxc(respIxc, 'IXC recusou o reagendamento.');
            if (!String(payload.id_agenda_local).startsWith('ixc-')) {
                yield this.executeDb(`UPDATE ivp_agenda_os
                 SET data_agendamento = ?, turno = ?, ixc_tecnico_id = 138, status_interno = 'AGUARDANDO_LOGISTICA',
                     preferencia_horario_tipo = COALESCE(?, preferencia_horario_tipo),
                     preferencia_horario_inicio = COALESCE(?, preferencia_horario_inicio),
                     preferencia_horario_fim = COALESCE(?, preferencia_horario_fim),
                     preferencia_horario_obs = COALESCE(?, preferencia_horario_obs)
                 WHERE id = ?`, [
                    payload.nova_data,
                    this.normalizarTurnoAgenda(payload.novo_turno),
                    payload.preferencia_horario_tipo || null,
                    payload.preferencia_horario_inicio || null,
                    payload.preferencia_horario_fim || null,
                    payload.preferencia_horario_obs || null,
                    payload.id_agenda_local
                ]);
            }
        });
    }
    static formatarPreferenciaHorario(payload) {
        const tipo = String((payload === null || payload === void 0 ? void 0 : payload.preferencia_horario_tipo) || 'SEM_PREFERENCIA').toUpperCase();
        const inicio = String((payload === null || payload === void 0 ? void 0 : payload.preferencia_horario_inicio) || '').substring(0, 5);
        const fim = String((payload === null || payload === void 0 ? void 0 : payload.preferencia_horario_fim) || '').substring(0, 5);
        const obs = String((payload === null || payload === void 0 ? void 0 : payload.preferencia_horario_obs) || '').trim();
        if (!tipo || tipo === 'SEM_PREFERENCIA')
            return '';
        if (tipo === 'MANHA')
            return 'Preferência pela manhã';
        if (tipo === 'TARDE')
            return 'Preferência pela tarde';
        if (tipo === 'A_PARTIR' && inicio)
            return `A partir de ${inicio}`;
        if (tipo === 'ATE' && fim)
            return `Até ${fim}`;
        if (tipo === 'INTERVALO' && inicio && fim)
            return `${inicio} até ${fim}`;
        if (tipo === 'OBSERVACAO' && obs)
            return obs;
        return 'Preferência de horário informada';
    }
    static garantirCapacidadeDia(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existe = yield this.executeDb('SELECT data FROM ivp_agenda_capacidade WHERE data = ?', [data]);
            if (existe.length > 0)
                return;
            // Template automático: dias úteis = id 1, sábado = id 2, domingo = fechado.
            const dataObj = new Date(`${data}T12:00:00`);
            const diaSemana = dataObj.getDay(); // 0 domingo, 6 sábado
            if (diaSemana === 0) {
                yield this.executeDb(`INSERT INTO ivp_agenda_capacidade (data, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`, [data]);
                return;
            }
            const templateId = diaSemana === 6 ? 2 : 1;
            let template = yield this.executeDb('SELECT * FROM ivp_agenda_capacidade_templates WHERE id = ?', [templateId]);
            // Fallback caso os templates ainda não tenham sido inseridos.
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
            yield this.executeDb(`INSERT INTO ivp_agenda_capacidade (data, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data, t.casa_m, t.casa_t, t.predio_serra_m, t.predio_serra_t, t.predio_outros_m, t.predio_outros_t, t.inst_serra_m, t.inst_serra_t, t.inst_outros_m, t.inst_outros_t]);
        });
    }
    static obterFilaPendentes() {
        return __awaiter(this, void 0, void 0, function* () {
            const [respA, respEN, respRAG, respAG] = yield Promise.all([
                this.makeIxcRequest('POST', '/su_oss_chamado', { qtype: 'su_oss_chamado.status', query: 'A', oper: '=', page: '1', rp: '200', sortname: 'id', sortorder: 'desc' }),
                this.makeIxcRequest('POST', '/su_oss_chamado', { qtype: 'su_oss_chamado.status', query: 'EN', oper: '=', page: '1', rp: '200', sortname: 'id', sortorder: 'desc' }),
                this.makeIxcRequest('POST', '/su_oss_chamado', { qtype: 'su_oss_chamado.status', query: 'RAG', oper: '=', page: '1', rp: '100', sortname: 'id', sortorder: 'desc' }),
                this.makeIxcRequest('POST', '/su_oss_chamado', { qtype: 'su_oss_chamado.id_tecnico', query: '138', oper: '=', page: '1', rp: '150', sortname: 'id', sortorder: 'desc' })
            ]);
            const allOpen = [...(respA.registros || []), ...(respEN.registros || []), ...(respRAG.registros || []), ...(respAG.registros || [])];
            const setoresPermitidos = ['5', '9', '19'];
            const mapIds = new Set();
            const fila = [];
            const now = new Date();
            now.setHours(now.getHours() - 3);
            const dataHoje = now.toISOString().split('T')[0];
            for (const os of allOpen) {
                if (!mapIds.has(os.id)) {
                    mapIds.add(os.id);
                    const isTecnicoVazio = !os.id_tecnico || os.id_tecnico === '0' || String(os.id_tecnico) === '138';
                    const isSetorValido = setoresPermitidos.includes(String(os.setor));
                    let dataRef = '';
                    if (os.data_agenda && os.data_agenda.trim() !== '')
                        dataRef = os.data_agenda.split(' ')[0];
                    else if (os.data_abertura && os.data_abertura.trim() !== '')
                        dataRef = os.data_abertura.split(' ')[0];
                    const isAtrasada = (dataRef !== '') && (dataRef < dataHoje);
                    if ((isTecnicoVazio || isAtrasada) && isSetorValido && os.status !== 'F' && os.status !== 'C') {
                        if (!isTecnicoVazio && isAtrasada) {
                            os._is_atrasada_com_tecnico = true;
                        }
                        fila.push(os);
                    }
                }
            }
            const locaisRetornoLogistica = yield this.executeDb(`
            SELECT
                ixc_os_id AS id,
                ixc_cliente_id AS id_cliente,
                setor,
                tipo_servico,
                tipo_imovel,
                municipio_base,
                sintoma_relatado AS mensagem,
                NULL AS data_abertura,
                ixc_tecnico_id AS id_tecnico,
                status_interno
            FROM ivp_agenda_os
            WHERE status_interno IN ('AGUARDANDO_LOGISTICA', 'AGUARDANDO_REAGENDAMENTO')
              AND (ixc_tecnico_id IS NULL OR ixc_tecnico_id = 138)
              AND (data_agendamento IS NULL OR data_agendamento = '')
              AND ixc_os_id IS NOT NULL
            ORDER BY id DESC
            LIMIT 200
            `).catch(() => []);
            for (const local of locaisRetornoLogistica || []) {
                const idOs = String(local.id || '').trim();
                if (!idOs || mapIds.has(idOs))
                    continue;
                mapIds.add(idOs);
                fila.push(Object.assign(Object.assign({}, local), { id: idOs, id_tecnico: local.id_tecnico || '138', status: 'A', setor: local.setor || '', _origem_local_logistica: true }));
            }
            const idClientes = fila.map(o => o.id_cliente);
            const clientesData = yield this.fetchIxcInBatches('/cliente', 'cliente', idClientes, 5);
            const dictClientes = new Map(clientesData.map(c => [String(c.id), c]));
            const setoresData = yield this.makeIxcRequest('POST', '/empresa_setor', {
                qtype: 'empresa_setor.id',
                query: '0',
                oper: '>=',
                rp: '500'
            }).catch(() => ({ registros: [] }));
            const dictSetores = new Map((setoresData.registros || []).map((s) => [String(s.id), s.descricao || s.setor || `Setor ${s.id}`]));
            return fila.map(os => {
                const cliente = dictClientes.get(String(os.id_cliente));
                return Object.assign(Object.assign({}, os), { nome_cliente: cliente ? (cliente.razao || cliente.nome) : 'Desconhecido', nome_setor: dictSetores.get(String(os.setor)) || os.tipo_servico || 'Desconhecido', endereco_formatado: cliente ? `${cliente.endereco || ''}, ${cliente.numero || 'S/N'} - ${cliente.bairro || ''}` : '', cidade_real: (cliente === null || cliente === void 0 ? void 0 : cliente.cidade) || os.municipio_base || '', municipio_base: os.municipio_base || (cliente === null || cliente === void 0 ? void 0 : cliente.cidade) || '' });
            });
        });
    }
}
exports.AgendaService = AgendaService;
