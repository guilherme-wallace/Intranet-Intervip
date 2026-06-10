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
class AgendaService {
    static executeDb(query, params = []) {
        return new Promise((resolve, reject) => {
            database_1.LOCALHOST.query(query, params, (err, results) => {
                if (err)
                    return reject(err);
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
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const dataInteracao = this.dataHoraAtualSaoPaulo();
            const osAtual = yield this.obterOsIxc(ixcOsId);
            const usuarioIxc = yield this.obterUsuarioIxcLogado(usuarioLogado);
            const idColaboradorIxc = usuarioIxc.id_funcionario_ixc;
            const candidatosEvento = [
                osAtual.id_evento,
                osAtual.id_evento_status,
                osAtual.id_wfl_tarefa,
                osAtual.id_tarefa_atual,
                osAtual.id_tarefa
            ].map(v => String(v || '').trim()).filter(v => v && v !== '0');
            const idEvento = candidatosEvento[0];
            const idEventoStatus = String(osAtual.id_evento_status || idEvento || '').trim();
            if (!idEvento) {
                console.error(`[IXC Mensagem Debug][${contexto}] OS sem evento valido para registrar mensagem:`, {
                    os: ixcOsId,
                    status: osAtual.status,
                    id_evento: osAtual.id_evento,
                    id_evento_status: osAtual.id_evento_status,
                    id_wfl_tarefa: osAtual.id_wfl_tarefa,
                    id_wfl_processo: osAtual.id_wfl_processo,
                    id_tarefa_atual: osAtual.id_tarefa_atual,
                    id_tarefa: osAtual.id_tarefa
                });
                throw new Error('Nao foi possivel registrar a mensagem no IXC: a OS nao retornou evento/tarefa atual valido.');
            }
            const payload = {
                id_chamado: String(ixcOsId),
                id_evento: String(idEvento),
                id_resposta: '',
                mensagem,
                data_inicio: dataInteracao,
                data_final: dataInteracao,
                // Neste endpoint do IXC, id_tecnico representa o autor do registro/mensagem.
                id_tecnico: idColaboradorIxc,
                status: osAtual.status || '',
                tipo_cobranca: osAtual.tipo_cobranca || '',
                id_evento_status: idEventoStatus,
                data: dataInteracao,
                id_equipe: osAtual.id_equipe || '',
                id_proxima_tarefa: osAtual.id_proxima_tarefa || '',
                finaliza_processo: '',
                latitude: '',
                longitude: '',
                gps_time: ''
            };
            console.log(`[IXC Mensagem Debug][${contexto}] OS: ${ixcOsId} | usuario_logado: ${usuarioLogado || 'N/A'} | id_funcionario_ixc: ${idColaboradorIxc}`);
            console.log(`[IXC Mensagem Debug][${contexto}] Campos OS:`, {
                status: osAtual.status,
                id_evento: osAtual.id_evento,
                id_evento_status: osAtual.id_evento_status,
                id_wfl_tarefa: osAtual.id_wfl_tarefa,
                id_wfl_processo: osAtual.id_wfl_processo,
                id_equipe: osAtual.id_equipe,
                id_tecnico: osAtual.id_tecnico
            });
            console.log(`[IXC Mensagem Debug][${contexto}] Payload:`, Object.assign(Object.assign({}, payload), { mensagem: String(payload.mensagem || '').substring(0, 300) }));
            try {
                const resp = yield this.makeIxcRequest('POST', '/su_oss_chamado_mensagem', payload, 'incluir');
                console.log(`[IXC Mensagem Debug][${contexto}] Resposta IXC:`, resp);
                this.validarRespostaIxc(resp, 'IXC recusou o registro da mensagem da OS.');
                return { resp, osAtual, dataInteracao, idColaboradorIxc };
            }
            catch (error) {
                console.error(`[IXC Mensagem Debug][${contexto}] Erro IXC completo:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw error;
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
            let queryLocal = `SELECT * FROM ivp_agenda_os WHERE data_agendamento = ?`;
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
            const prioridadesFuturas = yield this.executeDb(`SELECT * FROM ivp_agenda_os WHERE solicita_prioridade = 1 AND data_agendamento > ? AND status_interno NOT IN ('FINALIZADO', 'CANCELADO')`, [dataFiltro]);
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
            const [setoresIxc, condominiosLocais, techsLocais] = yield Promise.all([
                idSetores.length > 0 ? this.makeIxcRequest('POST', '/su_ticket_setor', { qtype: 'su_ticket_setor.id', query: idSetores.join(','), oper: 'in', rp: '2000' }) : { registros: [] },
                this.executeDb('SELECT condominioId, condominio FROM condominio').catch(() => []),
                this.executeDb('SELECT id_funcionario_ixc, nome FROM usuarios_intranet WHERE ativo = 1 AND id_funcionario_ixc IS NOT NULL').catch(() => [])
            ]);
            const dictSetores = new Map((setoresIxc.registros || []).map(s => [String(s.id), s.setor]));
            const dictConds = new Map(condominiosLocais.map((c) => [String(c.condominioId), c.condominio]));
            const dictTechs = new Map(techsLocais.map((u) => [String(u.id_funcionario_ixc), u.nome]));
            const listaFinal = [];
            for (const osIxc of agendamentosIxc) {
                let osLocal = todosLocais.find(item => String(item.ixc_os_id) === String(osIxc.id) ||
                    String(item.ixc_os_id) === String(osIxc.id_ticket));
                if (!osLocal) {
                    const localExistente = yield this.executeDb('SELECT * FROM ivp_agenda_os WHERE ixc_os_id = ? LIMIT 1', [osIxc.id]);
                    if (localExistente && localExistente.length > 0) {
                        osLocal = localExistente[0];
                    }
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
                if (osIxc.data_agenda && osIxc.data_agenda.includes(' '))
                    horarioExtraido = osIxc.data_agenda.split(' ')[1].substring(0, 5);
                let turnoInferred = (horarioExtraido >= '12:00' && horarioExtraido < '18:00') ? 'VESPERTINO' : (horarioExtraido >= '18:00' ? 'NOTURNO' : 'MATUTINO');
                const statusIxcAtual = String(osIxc.status || '').toUpperCase();
                const novoStatus = statusIxcAtual === 'F' ? 'FINALIZADO' :
                    statusIxcAtual === 'C' ? 'CANCELADO' :
                        (osIxc.id_tecnico && osIxc.id_tecnico !== '0' && String(osIxc.id_tecnico) !== '138') ? 'ATRIBUIDO' : 'AGUARDANDO_LOGISTICA';
                const tipoServicoSinc = nomeSetor.toUpperCase().includes('INSTALA') || osIxc.setor === '5' ? 'INSTALACAO' : 'SUPORTE';
                const payloadFinal = {
                    ixc_os_id: osIxc.id,
                    ixc_cliente_id: osIxc.id_cliente,
                    tipo_servico: osLocal ? osLocal.tipo_servico : tipoServicoSinc,
                    setor: osIxc.setor,
                    tipo_imovel: tipoImovel,
                    is_rede_neutra: isRedeNeutra,
                    turno: ehPrioridadeFutura && osLocal ? osLocal.turno : turnoInferred,
                    status_interno: novoStatus,
                    ixc_tecnico_id: osIxc.id_tecnico,
                    nome_tecnico: dictTechs.get(String(osIxc.id_tecnico)) || `Técnico ${osIxc.id_tecnico}`,
                    sintoma_relatado: (osIxc.mensagem || '').replace(/(<([^>]+)>)/gi, ""),
                    ixc_status: osIxc.status,
                    horario_agendado: horarioExtraido,
                    data_hora_execucao: osIxc.data_hora_execucao,
                    bairro_real: osIxc.bairro || '',
                    cidade_real: cidadeCorreta,
                    municipio_base: osLocal ? osLocal.municipio_base : cidadeCorreta,
                    nome_setor: nomeSetor,
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
                };
                if (osLocal) {
                    if (ehPrioridadeFutura) {
                        yield this.executeDb(`
                        UPDATE ivp_agenda_os
                        SET ixc_tecnico_id = ?,
                            status_interno = ?
                        WHERE id = ?
                        `, [osIxc.id_tecnico, novoStatus, osLocal.id]);
                        listaFinal.push(Object.assign({ id: osLocal.id, data_agendamento_original: osLocal.data_agendamento }, payloadFinal));
                    }
                    else {
                        yield this.executeDb(`
                        UPDATE ivp_agenda_os
                        SET data_agendamento = ?,
                            turno = ?,
                            ixc_tecnico_id = ?,
                            status_interno = ?
                        WHERE id = ?
                        `, [dataFiltro, turnoInferred, osIxc.id_tecnico, novoStatus, osLocal.id]);
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
                    VALUES (?, ?, 0, ?, ?, ?, 0, 0, ?, ?, ?, ?, 'SINC_IXC')
                    `, [
                        osIxc.id,
                        osIxc.id_cliente,
                        tipoServicoSinc,
                        tipoImovel,
                        cidadeCorreta,
                        dataFiltro,
                        turnoInferred,
                        osIxc.id_tecnico,
                        novoStatus
                    ]);
                    listaFinal.push(Object.assign({ id: insertRes.insertId, data_agendamento_original: dataFiltro }, payloadFinal));
                }
            }
            const tagsPorAgenda = yield this.carregarTagsPorAgendaIds(listaFinal.map((os) => String(os.id)));
            listaFinal.forEach((os) => {
                os.tags = tagsPorAgenda.get(String(os.id)) || [];
            });
            yield this.aplicarDistancias(listaFinal);
            return this.ordenarAgendamentos(listaFinal);
        });
    }
    static reagendarOs(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const horaInicio = payload.novo_turno === 'MATUTINO' ? '08:00:00' : '13:00:00';
            const horaFim = payload.novo_turno === 'MATUTINO' ? '12:00:00' : '18:00:00';
            const dataFormatada = payload.nova_data.split('-').reverse().join('/');
            const agora = new Date();
            agora.setHours(agora.getHours() - 3);
            const dataInteracao = agora.toISOString().replace('T', ' ').substring(0, 19);
            const tecnicoDestino = payload.id_tecnico || "138";
            const colaboradorAcao = yield this.obterUsuarioIxcLogado(payload.usuario_logado);
            const respIxc = yield this.makeIxcRequest('POST', '/su_oss_chamado_reagendar', {
                "id_chamado": payload.ixc_os_id,
                "data_agendamento": `${dataFormatada} ${horaInicio}`,
                "data_agendamento_final": `${dataFormatada} ${horaFim}`,
                "id_resposta": "",
                "mensagem": `Reagendado via Painel de Logística para ${dataFormatada} (${payload.novo_turno}).\nColaborador responsável: ${colaboradorAcao.nome}`,
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
            }, 'incluir');
            this.validarRespostaIxc(respIxc, 'IXC recusou o reagendamento.');
            if (!String(payload.id_agenda_local).startsWith('ixc-')) {
                yield this.executeDb(`UPDATE ivp_agenda_os SET data_agendamento = ?, turno = ?, ixc_tecnico_id = 138, status_interno = 'AGUARDANDO_LOGISTICA' WHERE id = ?`, [payload.nova_data, payload.novo_turno, payload.id_agenda_local]);
            }
        });
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
                return Object.assign(Object.assign({}, os), { nome_cliente: cliente ? (cliente.razao || cliente.nome) : 'Desconhecido', nome_setor: dictSetores.get(String(os.setor)) || 'Desconhecido', endereco_formatado: cliente ? `${cliente.endereco || ''}, ${cliente.numero || 'S/N'} - ${cliente.bairro || ''}` : '' });
            });
        });
    }
}
exports.AgendaService = AgendaService;
