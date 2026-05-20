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
// routes/api/v5/painel-logistica.ts
const Express = require("express");
const axios_1 = require("axios");
const database_1 = require("../../../api/database");
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
const getDistanciasBairros = (bairrosMunicipios) => __awaiter(void 0, void 0, void 0, function* () {
    const SEDE_INTERVIP = "Rua dos Uirapurus, S29, Morada de Laranjeiras, Serra, ES, 29166-710";
    const mapaDistancias = new Map();
    const bairrosDesconhecidos = [];
    for (const local of bairrosMunicipios) {
        if (!local.bairro)
            continue;
        const bairroLimpo = local.bairro.replace('(IXC)', '').trim();
        const municipioLimpo = local.municipio === 'Importado' ? 'Serra' : local.municipio.trim();
        const registros = yield executeDb(`SELECT distancia_metros FROM ivp_distancia_bairros WHERE municipio = ? AND bairro = ?`, [municipioLimpo, bairroLimpo]);
        if (registros.length > 0) {
            mapaDistancias.set(`${municipioLimpo}-${bairroLimpo}`, registros[0].distancia_metros);
        }
        else {
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
                    const response = yield axios_1.default.get(url);
                    const row = response.data.rows[0].elements[0];
                    if (row.status === 'OK') {
                        const distMetros = row.distance.value;
                        const tempoSegundos = row.duration.value;
                        yield executeDb(`INSERT IGNORE INTO ivp_distancia_bairros (municipio, bairro, distancia_metros, tempo_segundos) VALUES (?, ?, ?, ?)`, [local.municipio, local.bairro, distMetros, tempoSegundos]);
                        mapaDistancias.set(`${local.municipio}-${local.bairro}`, distMetros);
                    }
                }
                catch (err) {
                    console.error(`Erro ao buscar distancia do Google para ${local.bairro}:`, err.message);
                }
            }
        }
    }
    return mapaDistancias;
});
router.get('/tecnicos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data } = req.query;
    try {
        const query = `
            SELECT u.id_funcionario_ixc as id, u.nome, e.equipe, e.dupla_id 
            FROM usuarios_intranet u
            INNER JOIN ivp_agenda_escala e ON u.id_funcionario_ixc = e.id_funcionario_ixc
            WHERE u.ativo = 1 AND e.data_escala = ?
            ORDER BY u.nome ASC
        `;
        const tecnicos = yield executeDb(query, [data]);
        res.json(tecnicos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/todos-tecnicos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
            SELECT id_funcionario_ixc as id, nome 
            FROM usuarios_intranet 
            WHERE ativo = 1 AND id_grupo_ixc = 31 AND id_funcionario_ixc IS NOT NULL
            ORDER BY nome ASC
        `;
        const todos = yield executeDb(query);
        res.json(todos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/salvar-escala', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, tecnicos } = req.body;
    try {
        yield executeDb(`DELETE FROM ivp_agenda_escala WHERE data_escala = ?`, [data]);
        if (tecnicos && tecnicos.length > 0) {
            for (let tec of tecnicos) {
                yield executeDb(`INSERT INTO ivp_agenda_escala (data_escala, id_funcionario_ixc, equipe, dupla_id) VALUES (?, ?, ?, ?)`, [data, tec.id, tec.equipe, tec.dupla_id || null]);
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/agendamentos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, municipio } = req.query;
    if (!data)
        return res.status(400).json({ error: "Data é obrigatória" });
    try {
        let queryLocal = `SELECT * FROM ivp_agenda_os WHERE data_agendamento = ?`;
        let params = [data];
        if (municipio && municipio !== 'TODOS') {
            queryLocal += ` AND municipio_base = ?`;
            params.push(municipio);
        }
        queryLocal += ` ORDER BY turno ASC, aceita_encaixe DESC, created_at ASC`;
        const agendamentosLocais = yield executeDb(queryLocal, params);
        const listaFinal = agendamentosLocais.map((os) => (Object.assign(Object.assign({}, os), { horario_agendado: os.turno === 'MATUTINO' ? '08:00' : '13:00', bairro_real: os.municipio_base, cidade_real: os.municipio_base, nome_setor: os.tipo_servico === 'INSTALACAO' ? 'Instalação' : 'Manutenção' })));
        const payloadIxc = {
            qtype: 'su_oss_chamado.data_agenda',
            query: `${data} 00:00:00`,
            oper: '>=',
            page: '1',
            rp: '1500'
        };
        const ixcResp = yield makeIxcRequest('POST', '/su_oss_chamado', payloadIxc);
        let agendamentosIxc = (ixcResp.registros || []).filter((os) => {
            const idTec = String(os.id_tecnico).trim();
            const ehDoDiaExato = os.data_agenda && os.data_agenda.startsWith(data);
            return idTec !== '' && idTec !== '0' && ehDoDiaExato;
        });
        const idsExtraidos = agendamentosIxc.map((os) => os.id_tecnico).filter((id) => id);
        const idsParaChecar = idsExtraidos.filter((id, index) => idsExtraidos.indexOf(id) === index);
        let validTechIds = new Set();
        let techNamesMap = new Map();
        if (idsParaChecar.length > 0) {
            const techs = yield executeDb(`SELECT id_funcionario_ixc, nome FROM usuarios_intranet 
                 WHERE id_funcionario_ixc IN (${idsParaChecar.join(',')}) 
                 AND id_grupo_ixc = 31 AND ativo = 1`);
            techs.forEach((t) => {
                validTechIds.add(String(t.id_funcionario_ixc));
                techNamesMap.set(String(t.id_funcionario_ixc), t.nome);
            });
        }
        agendamentosIxc = agendamentosIxc.filter((os) => validTechIds.has(String(os.id_tecnico)));
        const allEstruturaIds = agendamentosIxc.map((os) => os.id_estrutura).filter((id) => id && id !== '0');
        const uniqueEstruturaIds = allEstruturaIds.filter((id, index) => allEstruturaIds.indexOf(id) === index);
        const mapaEstruturas = new Map();
        if (uniqueEstruturaIds.length > 0) {
            yield Promise.all(uniqueEstruturaIds.map((idEst) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const resp = yield makeIxcRequest('POST', '/estrutura', {
                        qtype: 'estrutura.id', query: idEst, oper: '=', rp: '1'
                    });
                    if (resp.registros && resp.registros.length > 0) {
                        mapaEstruturas.set(String(idEst), resp.registros[0].id_cidade);
                    }
                }
                catch (e) { }
            })));
        }
        const allCityIds = agendamentosIxc.map((os) => {
            if (os.id_cidade && os.id_cidade !== '0')
                return os.id_cidade;
            if (os.id_estrutura && os.id_estrutura !== '0')
                return mapaEstruturas.get(String(os.id_estrutura));
            return null;
        }).filter((id) => id);
        const uniqueCityIds = allCityIds.filter((id, index) => allCityIds.indexOf(id) === index);
        const mapaCidades = new Map();
        if (uniqueCityIds.length > 0) {
            yield Promise.all(uniqueCityIds.map((idCid) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const resp = yield makeIxcRequest('POST', '/cidade', {
                        qtype: 'cidade.id', query: idCid, oper: '=', rp: '1'
                    });
                    if (resp.registros && resp.registros.length > 0) {
                        mapaCidades.set(String(idCid), resp.registros[0].nome);
                    }
                }
                catch (e) { }
            })));
        }
        const allCondIds = agendamentosIxc.map((os) => os.id_condominio).filter((id) => id && id !== '0');
        const uniqueCondIds = allCondIds.filter((id, index) => allCondIds.indexOf(id) === index);
        const mapaCondominios = new Map();
        if (uniqueCondIds.length > 0) {
            yield Promise.all(uniqueCondIds.map((idCond) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const resp = yield makeIxcRequest('POST', '/cliente_condominio', {
                        qtype: 'cliente_condominio.id', query: idCond, oper: '=', rp: '1'
                    });
                    if (resp.registros && resp.registros.length > 0) {
                        mapaCondominios.set(String(idCond), resp.registros[0].condominio);
                    }
                }
                catch (e) { }
            })));
        }
        const allSetorIds = agendamentosIxc.map((os) => os.setor).filter((id) => id && id !== '0');
        const uniqueSetorIds = allSetorIds.filter((id, index) => allSetorIds.indexOf(id) === index);
        const mapaSetores = new Map();
        if (uniqueSetorIds.length > 0) {
            yield Promise.all(uniqueSetorIds.map((idSetor) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const resp = yield makeIxcRequest('POST', '/empresa_setor', {
                        qtype: 'empresa_setor.id', query: idSetor, oper: '=', rp: '1'
                    });
                    if (resp.registros && resp.registros.length > 0) {
                        mapaSetores.set(String(idSetor), resp.registros[0].setor);
                    }
                }
                catch (e) { }
            })));
        }
        for (const osIxc of agendamentosIxc) {
            let horarioExtraido = '12:00';
            if (osIxc.data_agenda && osIxc.data_agenda.includes(' ')) {
                horarioExtraido = osIxc.data_agenda.split(' ')[1].substring(0, 5);
            }
            let tipoImovel = 'CASA';
            let isRedeNeutra = false;
            let nomeCondominio = mapaCondominios.get(String(osIxc.id_condominio)) || '';
            let isCorp = false;
            const nomeSetor = mapaSetores.get(String(osIxc.setor)) || 'Não Informado';
            const mensagemUpper = (osIxc.mensagem || '').toUpperCase();
            const setorUpper = nomeSetor.toUpperCase();
            if (mensagemUpper.includes('CORPORATIVO') || mensagemUpper.includes('PROVEDOR') || setorUpper.includes('CORPORATIVO')) {
                isCorp = true;
                tipoImovel = 'CORPORATIVO';
            }
            else if (nomeCondominio) {
                const upperCond = nomeCondominio.toUpperCase();
                const prefixosCasa = ['SEA', 'VTA', 'VVA', 'CCA', 'GRI'];
                const isCasa = prefixosCasa.some(prefix => upperCond.startsWith(prefix));
                tipoImovel = isCasa ? 'CASA' : 'PRÉDIO';
                if (upperCond.includes('RDNT'))
                    isRedeNeutra = true;
            }
            else {
                tipoImovel = (osIxc.apartamento || osIxc.bloco) ? 'PRÉDIO' : 'CASA';
            }
            let idCidBusca = osIxc.id_cidade;
            if ((!idCidBusca || idCidBusca === '0') && osIxc.id_estrutura) {
                idCidBusca = mapaEstruturas.get(String(osIxc.id_estrutura));
            }
            const cidadeCorreta = mapaCidades.get(String(idCidBusca)) || 'Serra';
            const indexLocal = listaFinal.findIndex(item => String(item.ixc_os_id) === String(osIxc.id));
            if (indexLocal > -1) {
                listaFinal[indexLocal].ixc_tecnico_id = osIxc.id_tecnico;
                listaFinal[indexLocal].status_interno = 'ATRIBUIDO';
                listaFinal[indexLocal].ixc_status = osIxc.status;
                listaFinal[indexLocal].horario_agendado = horarioExtraido;
                listaFinal[indexLocal].data_hora_execucao = osIxc.data_hora_execucao;
                listaFinal[indexLocal].nome_setor = nomeSetor;
                listaFinal[indexLocal].nome_condominio = nomeCondominio;
                listaFinal[indexLocal].tipo_imovel = tipoImovel;
            }
            else {
                let turnoInferred = 'MATUTINO';
                if (horarioExtraido >= '12:00' && horarioExtraido < '18:00') {
                    turnoInferred = 'VESPERTINO';
                }
                else if (horarioExtraido >= '18:00' || horarioExtraido < '06:00') {
                    turnoInferred = 'NOTURNO';
                }
                let msg = osIxc.mensagem || 'Agendado pelo IXC';
                msg = msg.replace(/(<([^>]+)>)/gi, "");
                listaFinal.push({
                    id: `ixc-${osIxc.id}`,
                    ixc_os_id: osIxc.id,
                    ixc_cliente_id: osIxc.id_cliente,
                    tipo_servico: 'IXC',
                    tipo_imovel: tipoImovel,
                    is_rede_neutra: isRedeNeutra,
                    municipio_base: osIxc.bairro ? `${osIxc.bairro} (${cidadeCorreta})` : cidadeCorreta,
                    aceita_encaixe: 0,
                    data_agendamento: data,
                    turno: turnoInferred,
                    status_interno: 'ATRIBUIDO',
                    ixc_tecnico_id: osIxc.id_tecnico,
                    sintoma_relatado: msg,
                    ixc_status: osIxc.status,
                    horario_agendado: horarioExtraido,
                    data_hora_execucao: osIxc.data_hora_execucao,
                    bairro_real: osIxc.bairro || '',
                    cidade_real: cidadeCorreta,
                    nome_setor: nomeSetor,
                    nome_condominio: nomeCondominio
                });
            }
        }
        listaFinal.forEach(os => {
            if (os.ixc_tecnico_id) {
                os.nome_tecnico = techNamesMap.get(String(os.ixc_tecnico_id)) || `Técnico ${os.ixc_tecnico_id}`;
            }
        });
        const locaisUnicos = [];
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
        const mapaDistancias = yield getDistanciasBairros(locaisUnicos);
        listaFinal.forEach(os => {
            const bairro = (os.bairro_real || '').trim();
            const municipio = (os.cidade_real || 'Serra').trim();
            os.distancia_sede = mapaDistancias.get(`${municipio}-${bairro}`) || 999999;
        });
        listaFinal.sort((a, b) => {
            const priorityA = (a.ixc_status === 'EX' || a.ixc_status === 'DS') ? 0 : 1;
            const priorityB = (b.ixc_status === 'EX' || b.ixc_status === 'DS') ? 0 : 1;
            if (priorityA !== priorityB)
                return priorityA - priorityB;
            if (a.turno !== b.turno)
                return (a.turno || '').localeCompare(b.turno || '');
            return a.distancia_sede - b.distancia_sede;
        });
        res.json(listaFinal);
    }
    catch (error) {
        console.error("Erro ao buscar agendamentos (Local + IXC):", error);
        res.status(500).json({ error: error.message });
    }
}));
router.put('/atribuir-tecnico', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_agenda, ixc_tecnico_id, status, ixc_os_id } = req.body;
    try {
        if (!String(id_agenda).startsWith('ixc-')) {
            yield executeDb(`UPDATE ivp_agenda_os SET ixc_tecnico_id = ?, status_interno = ? WHERE id = ?`, [ixc_tecnico_id, status || 'ATRIBUIDO', id_agenda]);
        }
        if (ixc_tecnico_id && ixc_os_id) {
            yield makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
                id_tecnico: ixc_tecnico_id,
                status: 'A',
            });
        }
        res.json({ success: true, message: "Técnico atribuído com sucesso!" });
    }
    catch (error) {
        console.error("Erro na sincronização com IXC:", error.message);
        res.status(500).json({ error: error.message });
    }
}));
router.put('/reagendar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ixc_os_id, id_agenda_local, nova_data, novo_turno } = req.body;
    try {
        const horaIXC = novo_turno === 'MATUTINO' ? '08:00:00' : '13:00:00';
        yield makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
            data_agenda: `${nova_data} ${horaIXC}`,
            status: 'AG',
            id_tecnico: '',
            melhor_horario_agenda: novo_turno === 'MATUTINO' ? 'M' : 'T'
        });
        if (!String(id_agenda_local).startsWith('ixc-')) {
            yield executeDb(`UPDATE ivp_agenda_os 
                 SET data_agendamento = ?, turno = ?, ixc_tecnico_id = NULL, status_interno = 'AGUARDANDO_LOGISTICA' 
                 WHERE id = ?`, [nova_data, novo_turno, id_agenda_local]);
        }
        res.json({ success: true, message: "OS Reagendada com sucesso!" });
    }
    catch (error) {
        console.error("Erro ao reagendar:", error);
        res.status(500).json({ error: error.message });
    }
}));
router.put('/fechar-os', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ixc_os_id, mensagem_resposta } = req.body;
    try {
        yield makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
            status: 'F',
            mensagem_resposta: mensagem_resposta
        });
        res.json({ success: true, message: "OS Finalizada com sucesso!" });
    }
    catch (error) {
        console.error("Erro ao fechar OS:", error);
        res.status(500).json({ error: error.message });
    }
}));
router.get('/os-detalhes/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const osDataResp = yield makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id', query: id, oper: '=', page: '1', rp: '1'
        });
        if (!osDataResp.registros || osDataResp.registros.length === 0) {
            return res.status(404).json({ error: "OS não encontrada no IXC" });
        }
        const osData = osDataResp.registros[0];
        let clienteData = null;
        let telefones = 'N/A';
        let contratoData = null;
        let loginData = null;
        let onuData = null;
        if (osData.id_cliente) {
            const cliResp = yield makeIxcRequest('POST', '/cliente', {
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
        if (osData.id_contrato_kit) {
            const conResp = yield makeIxcRequest('POST', '/cliente_contrato', {
                qtype: 'cliente_contrato.id', query: osData.id_contrato_kit, oper: '=', page: '1', rp: '1'
            });
            if (conResp.registros && conResp.registros.length > 0) {
                contratoData = conResp.registros[0];
            }
        }
        let enderecoFinal = {
            endereco: osData.endereco || '',
            numero: osData.numero || '',
            bairro: osData.bairro || '',
            complemento: osData.complemento || '',
            referencia: osData.referencia || ''
        };
        if (!enderecoFinal.endereco || enderecoFinal.endereco.trim() === '') {
            if (contratoData && contratoData.endereco) {
                enderecoFinal.endereco = contratoData.endereco;
                enderecoFinal.numero = contratoData.numero;
                enderecoFinal.bairro = contratoData.bairro;
                enderecoFinal.complemento = contratoData.complemento;
                enderecoFinal.referencia = contratoData.referencia;
            }
            else if (clienteData && clienteData.endereco) {
                enderecoFinal.endereco = clienteData.endereco;
                enderecoFinal.numero = clienteData.numero;
                enderecoFinal.bairro = clienteData.bairro;
                enderecoFinal.complemento = clienteData.complemento;
                enderecoFinal.referencia = clienteData.referencia;
            }
        }
        let historicoPppoe = null;
        if (osData.id_login) {
            const logResp = yield makeIxcRequest('POST', '/radusuarios', {
                qtype: 'radusuarios.id', query: osData.id_login, oper: '=', page: '1', rp: '1'
            });
            if (logResp.registros && logResp.registros.length > 0) {
                loginData = logResp.registros[0];
                if (loginData.login) {
                    const acctResp = yield makeIxcRequest('POST', '/radacct', {
                        qtype: 'radacct.username', query: loginData.login, oper: '=', page: '1', rp: '1', sortname: 'radacctid', sortorder: 'desc'
                    });
                    if (acctResp.registros && acctResp.registros.length > 0) {
                        historicoPppoe = acctResp.registros[0];
                    }
                }
                const reqOnuId = yield makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                    qtype: 'radpop_radio_cliente_fibra.id_login', query: String(loginData.id), oper: '=', page: '1', rp: '1'
                });
                if (reqOnuId.registros && reqOnuId.registros.length > 0) {
                    onuData = reqOnuId.registros[0];
                }
                else if (loginData.mac) {
                    const reqOnuMac = yield makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                        qtype: 'radpop_radio_cliente_fibra.mac', query: String(loginData.mac), oper: '=', page: '1', rp: '1'
                    });
                    if (reqOnuMac.registros && reqOnuMac.registros.length > 0) {
                        onuData = reqOnuMac.registros[0];
                    }
                }
            }
        }
        res.json({
            os: Object.assign(Object.assign({}, osData), enderecoFinal),
            cliente: { nome: clienteData ? clienteData.razao : 'N/A', telefones },
            contrato: { descricao: contratoData ? `Contrato #${contratoData.id} (${contratoData.status || 'Ativo'})` : 'Sem contrato vinculado' },
            login: Object.assign(Object.assign({}, loginData), { historico: historicoPppoe }),
            onu: onuData
        });
    }
    catch (error) {
        console.error("Erro ao buscar detalhes completos da OS:", error);
        res.status(500).json({ error: error.message });
    }
}));
router.post('/onu-realtime', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_fibra } = req.body;
    try {
        yield makeIxcRequest('POST', '/radpop_radio_cliente_fibra', { id_registro: id_fibra }, 'integracao');
        const onuResp = yield makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
            qtype: 'radpop_radio_cliente_fibra.id', query: String(id_fibra), oper: '=', page: '1', rp: '1'
        });
        res.json(onuResp.registros ? onuResp.registros[0] : null);
    }
    catch (error) {
        console.error("Erro ao atualizar ONU na OLT:", error.message);
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
