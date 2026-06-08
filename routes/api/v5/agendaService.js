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
    static obterAgendamentos(dataFiltro, municipioBase) {
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
                qtype: 'su_oss_chamado.data_agenda', query: dataFiltro, oper: 'L', page: '1', rp: '2000'
            });
            const agendamentosIxc = (ixcRespGeral.registros || []).filter((os) => {
                return os.data_agenda && os.data_agenda.startsWith(dataFiltro) && setoresPermitidos.includes(String(os.setor));
            });
            if (priorityIds.length > 0) {
                const prioIxc = yield this.fetchIxcInBatches('/su_oss_chamado', 'su_oss_chamado', priorityIds);
                prioIxc.forEach(os => {
                    if (setoresPermitidos.includes(String(os.setor)) && !agendamentosIxc.some(x => String(x.id) === String(os.id))) {
                        agendamentosIxc.push(os);
                    }
                });
            }
            const idClientes = agendamentosIxc.map(o => o.id_cliente);
            const idContratos = [...agendamentosIxc.map(o => o.id_contrato_kit || o.id_contrato), ...todosLocais.map(o => o.ixc_contrato_id)];
            const idCidadesSet = new Set(agendamentosIxc.map(o => o.id_cidade));
            const idSetores = [...new Set(agendamentosIxc.map(o => o.setor))];
            const [clientesData, contratosData, cidadesIxc, setoresIxc, condominiosLocais, techsIxc] = yield Promise.all([
                this.fetchIxcInBatches('/cliente', 'cliente', idClientes),
                this.fetchIxcInBatches('/cliente_contrato', 'cliente_contrato', idContratos),
                idCidadesSet.size > 0 ? this.makeIxcRequest('POST', '/cidade', { qtype: 'cidade.id', query: Array.from(idCidadesSet).filter(id => id && id !== '0').join(','), oper: 'in', rp: '2000' }) : { registros: [] },
                idSetores.length > 0 ? this.makeIxcRequest('POST', '/su_ticket_setor', { qtype: 'su_ticket_setor.id', query: idSetores.join(','), oper: 'in', rp: '2000' }) : { registros: [] },
                this.executeDb('SELECT condominioId, condominio FROM condominio').catch(() => []),
                this.makeIxcRequest('POST', '/usuarios', { qtype: 'usuarios.id', query: '0', oper: '>', rp: '2000' }).catch(() => ({ registros: [] }))
            ]);
            const dictClientes = new Map(clientesData.map(c => [String(c.id), c]));
            const dictContratos = new Map(contratosData.map(c => [String(c.id), c]));
            const dictCidades = new Map((cidadesIxc.registros || []).map(c => [String(c.id), c.nome]));
            const dictSetores = new Map((setoresIxc.registros || []).map(s => [String(s.id), s.setor]));
            const dictConds = new Map(condominiosLocais.map((c) => [String(c.condominioId), c.condominio]));
            const dictTechs = new Map((techsIxc.registros || []).filter(u => u.funcionario && u.funcionario !== '0').map(u => [String(u.funcionario), u.nome]));
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
                const idContUsado = (osIxc.id_contrato_kit && osIxc.id_contrato_kit !== '0') ? osIxc.id_contrato_kit : (osIxc.id_contrato && osIxc.id_contrato !== '0' ? osIxc.id_contrato : ((osLocal === null || osLocal === void 0 ? void 0 : osLocal.ixc_contrato_id) || '0'));
                const contratoRef = dictContratos.get(String(idContUsado));
                const clienteRef = dictClientes.get(String(osIxc.id_cliente));
                let idCondBusca = osIxc.id_condominio;
                let idCidBusca = osIxc.id_cidade;
                if (!idCondBusca || idCondBusca === '0' || !idCidBusca || idCidBusca === '0') {
                    const usaCliente = (contratoRef === null || contratoRef === void 0 ? void 0 : contratoRef.endereco_padrao_cliente) === 'S';
                    if (!idCondBusca || idCondBusca === '0')
                        idCondBusca = usaCliente ? clienteRef === null || clienteRef === void 0 ? void 0 : clienteRef.id_condominio : ((contratoRef === null || contratoRef === void 0 ? void 0 : contratoRef.id_condominio) || (clienteRef === null || clienteRef === void 0 ? void 0 : clienteRef.id_condominio));
                    if (!idCidBusca || idCidBusca === '0')
                        idCidBusca = usaCliente ? clienteRef === null || clienteRef === void 0 ? void 0 : clienteRef.cidade : ((contratoRef === null || contratoRef === void 0 ? void 0 : contratoRef.cidade) || (clienteRef === null || clienteRef === void 0 ? void 0 : clienteRef.cidade) || osIxc.id_estrutura);
                }
                let cidadeCrua = dictCidades.get(String(idCidBusca));
                let cidadeCorreta = 'Serra'; // Fallback
                const idCidStr = String(idCidBusca);
                if (['3172', '3112', '3124', '3173'].includes(idCidStr)) {
                    cidadeCorreta = idCidStr === '3172' ? 'Vila Velha' : (idCidStr === '3173' ? 'Vitória' : (idCidStr === '3112' ? 'Cariacica' : 'Guarapari'));
                }
                else if (idCidStr === '3165') {
                    cidadeCorreta = 'Serra';
                }
                else {
                    let cidadeCrua = dictCidades.get(idCidStr);
                    if (cidadeCrua) {
                        const cidUpper = cidadeCrua.toUpperCase();
                        if (cidUpper.includes('VILA VELHA'))
                            cidadeCorreta = 'Vila Velha';
                        else if (cidUpper.includes('VITORIA') || cidUpper.includes('VITÓRIA'))
                            cidadeCorreta = 'Vitória';
                        else if (cidUpper.includes('CARIACICA'))
                            cidadeCorreta = 'Cariacica';
                    }
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
                const novoStatus = (osIxc.id_tecnico && osIxc.id_tecnico !== '0' && String(osIxc.id_tecnico) !== '138') ? 'ATRIBUIDO' : 'AGUARDANDO_LOGISTICA';
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
                    nome_condominio: nomeCondominio,
                    is_futuro_prioridade: !!ehPrioridadeFutura,
                    aceita_encaixe: osLocal ? osLocal.aceita_encaixe : 0,
                    solicita_prioridade: osLocal ? osLocal.solicita_prioridade : 0,
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
            return listaFinal;
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
            yield this.makeIxcRequest('POST', '/su_oss_chamado_reagendar', {
                "id_chamado": payload.ixc_os_id,
                "data_agendamento": `${dataFormatada} ${horaInicio}`,
                "data_agendamento_final": `${dataFormatada} ${horaFim}`,
                "id_resposta": "",
                "mensagem": `Reagendado via Painel de Logística para ${dataFormatada} (${payload.novo_turno}).`,
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
            if (!String(payload.id_agenda_local).startsWith('ixc-')) {
                yield this.executeDb(`UPDATE ivp_agenda_os SET data_agendamento = ?, turno = ?, ixc_tecnico_id = 138, status_interno = 'AGUARDANDO_LOGISTICA' WHERE id = ?`, [payload.nova_data, payload.novo_turno, payload.id_agenda_local]);
            }
        });
    }
    static garantirCapacidadeDia(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existe = yield this.executeDb('SELECT data FROM ivp_agenda_capacidade WHERE data = ?', [data]);
            if (existe.length === 0) {
                const template = yield this.executeDb('SELECT * FROM ivp_agenda_capacidade_templates WHERE id = 1');
                if (template.length > 0) {
                    const t = template[0];
                    yield this.executeDb(`INSERT INTO ivp_agenda_capacidade (data, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data, t.casa_m, t.casa_t, t.predio_serra_m, t.predio_serra_t, t.predio_outros_m, t.predio_outros_t, t.inst_serra_m, t.inst_serra_t, t.inst_outros_m, t.inst_outros_t]);
                }
            }
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
