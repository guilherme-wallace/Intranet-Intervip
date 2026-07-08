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
const agendaService_1 = require("./agendaService");
const logger_1 = require("../../../api/logger");
const router = Express.Router();
const TURNOS_ESCALA_VALIDOS = new Set(['INTEGRAL', 'MATUTINO', 'VESPERTINO']);
const REGIOES_ESCALA_VALIDAS = new Set(['TODAS', 'SERRA', 'VV_VIX_CCA']);
const IMOVEIS_ESCALA_VALIDOS = new Set(['AMBOS', 'CASA', 'PREDIO']);
const CACHE_PAINEL_TTL_MS = 10 * 60 * 1000;
const cacheAgendamentos = new Map();
const cacheFilaPendentes = new Map();
function isErroTemporarioIxc(error) {
    var _a, _b, _c, _d;
    const endpointIxc = String((error === null || error === void 0 ? void 0 : error.ixcEndpoint) || ((_a = error === null || error === void 0 ? void 0 : error.cause) === null || _a === void 0 ? void 0 : _a.ixcEndpoint) || '').trim();
    const requestUrl = String(((_b = error === null || error === void 0 ? void 0 : error.config) === null || _b === void 0 ? void 0 : _b.url) || ((_d = (_c = error === null || error === void 0 ? void 0 : error.cause) === null || _c === void 0 ? void 0 : _c.config) === null || _d === void 0 ? void 0 : _d.url) || '');
    const origemIxc = Boolean(endpointIxc) || requestUrl.includes('/webservice/v1');
    if (!origemIxc)
        return false;
    return (0, agendaService_1.isErroTemporarioIxc)(error);
}
function idadeCacheMs(cache) {
    if (!cache)
        return null;
    const timestamp = new Date(cache.updatedAt).getTime();
    return Number.isFinite(timestamp) ? Math.max(0, Date.now() - timestamp) : null;
}
function cacheEstaDentroTtl(cache) {
    const idade = idadeCacheMs(cache);
    return idade !== null && idade <= CACHE_PAINEL_TTL_MS;
}
function montarErroIxcIndisponivel(message, requestId) {
    return {
        success: false,
        partial: true,
        ixcIndisponivel: true,
        error: 'IXC temporariamente indisponível.',
        message,
        detail: 'Não foi possível consultar o IXC neste momento. Tente novamente em instantes.',
        requestId
    };
}
function normalizarTextoEscala(valor, padrao) {
    return String(valor || padrao)
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}
function normalizarTextoOpcao(valor, padrao) {
    return normalizarTextoEscala(valor, padrao)
        .replace(/[\/\s-]+/g, '_')
        .replace(/_+/g, '_');
}
function normalizarTurnoEscala(valor) {
    const turno = normalizarTextoEscala(valor, 'INTEGRAL');
    if (turno === 'MANHA')
        return 'MATUTINO';
    if (turno === 'TARDE')
        return 'VESPERTINO';
    return TURNOS_ESCALA_VALIDOS.has(turno) ? turno : 'INTEGRAL';
}
function normalizarRegiaoEscala(valor) {
    const regiao = normalizarTextoOpcao(valor, 'SERRA');
    if (regiao === 'VV_VIX_CAR')
        return 'VV_VIX_CCA';
    if (['VILA_VELHA', 'VITORIA', 'CARIACICA'].includes(regiao))
        return 'VV_VIX_CCA';
    if (regiao === 'VILA_VELHA_VITORIA_CARIACICA')
        return 'VV_VIX_CCA';
    return REGIOES_ESCALA_VALIDAS.has(regiao) ? regiao : 'SERRA';
}
function normalizarImovelEscala(valor) {
    const imovel = normalizarTextoEscala(valor, 'AMBOS');
    return IMOVEIS_ESCALA_VALIDOS.has(imovel) ? imovel : 'AMBOS';
}
function obterIdPlanoContrato(contrato) {
    return String((contrato === null || contrato === void 0 ? void 0 : contrato.id_vd_contrato) ||
        (contrato === null || contrato === void 0 ? void 0 : contrato.id_plano) ||
        (contrato === null || contrato === void 0 ? void 0 : contrato.plano_id) ||
        (contrato === null || contrato === void 0 ? void 0 : contrato.planId) ||
        '').trim();
}
function aplicarPlanoLocalContrato(contrato) {
    return __awaiter(this, void 0, void 0, function* () {
        const idPlano = obterIdPlanoContrato(contrato);
        if (!/^\d+$/.test(idPlano))
            return contrato;
        const planos = yield agendaService_1.AgendaService.executeDb('SELECT planId, name, speed FROM plan WHERE planId = ? LIMIT 1', [idPlano]).catch(() => []);
        const plano = planos === null || planos === void 0 ? void 0 : planos[0];
        return Object.assign(Object.assign({}, contrato), { id_plano_local: idPlano, nome_plano_local: (plano === null || plano === void 0 ? void 0 : plano.name) || null, velocidade_plano: Number((plano === null || plano === void 0 ? void 0 : plano.speed) || 0) || null });
    });
}
function formatarDataIxc(valor) {
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
function dataHoraAtualSaoPaulo() {
    return agendaService_1.AgendaService.dataHoraAtualSaoPaulo();
}
function dataHoraSaoPaulo(date) {
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
function montarMensagensLocaisObservacao(local) {
    const linhas = String((local === null || local === void 0 ? void 0 : local.observacao_logistica) || '')
        .split('\n')
        .map(linha => linha.trim())
        .filter(Boolean);
    return linhas
        .filter(linha => linha.includes('[LOCAL]'))
        .map((linha, index) => {
        const match = linha.match(/^\[([^\]]+)\]\s+\[LOCAL\]\s*(.*)$/);
        return {
            id: `local-${index}`,
            data: (match === null || match === void 0 ? void 0 : match[1]) || '',
            autor_nome: 'Logistica (local)',
            mensagem: (match === null || match === void 0 ? void 0 : match[2]) || linha
        };
    });
}
function normalizarGrupoPermissao(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}
function usuarioEhLogisticaOuNoc(usuarioLogado, grupoAutenticado) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const grupoSessao = normalizarGrupoPermissao(grupoAutenticado);
        if (grupoSessao) {
            return grupoSessao.includes('LOGISTICA') || grupoSessao.includes('NOC');
        }
        if (!usuarioLogado || usuarioLogado === 'Visitante')
            return false;
        const rows = yield agendaService_1.AgendaService.executeDb(`SELECT grupo FROM usuarios_intranet WHERE ativo = 1 AND usuario = ? LIMIT 1`, [usuarioLogado]).catch(() => []);
        const grupo = normalizarGrupoPermissao(((_a = rows === null || rows === void 0 ? void 0 : rows[0]) === null || _a === void 0 ? void 0 : _a.grupo) || '');
        return grupo.includes('LOGISTICA') || grupo.includes('NOC');
    });
}
function exigirLogisticaOuNoc(req, res) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        const reqAny = req;
        const usuarioAutenticado = ((_a = reqAny.user) === null || _a === void 0 ? void 0 : _a.username) || ((_b = reqAny.session) === null || _b === void 0 ? void 0 : _b.username);
        const grupoAutenticado = ((_c = reqAny.user) === null || _c === void 0 ? void 0 : _c.group) || ((_d = reqAny.session) === null || _d === void 0 ? void 0 : _d.group);
        const usuarioLogado = (usuarioAutenticado || ((_e = req.body) === null || _e === void 0 ? void 0 : _e.usuario_logado) || ((_f = req.query) === null || _f === void 0 ? void 0 : _f.usuario_logado));
        const permitido = yield usuarioEhLogisticaOuNoc(usuarioLogado, grupoAutenticado);
        if (!permitido) {
            res.status(403).json({ error: 'Ação permitida apenas para Logística ou NOC.' });
            return false;
        }
        return true;
    });
}
router.get('/agendamentos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const startedAt = Date.now();
    const reqAny = req;
    const requestId = reqAny.requestId || (0, logger_1.createRequestId)();
    const data = req.query.data;
    const municipio = req.query.municipio;
    const status = req.query.status;
    const cacheKey = `${data || ''}|${municipio || 'TODOS'}|${status || 'PENDENTES'}`;
    const metaBase = {
        requestId,
        data,
        municipio,
        status,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        usuario: ((_a = reqAny.user) === null || _a === void 0 ? void 0 : _a.username) || ((_b = reqAny.session) === null || _b === void 0 ? void 0 : _b.username) || 'Visitante',
        query: req.query
    };
    if (!data)
        return res.status(400).json({ error: "A data de filtro é obrigatória" });
    try {
        (0, logger_1.logInfo)('PainelLogistica.agendamentos', 'Inicio da consulta de agendamentos.', metaBase);
        yield agendaService_1.AgendaService.garantirCapacidadeDia(data);
        const agendamentos = yield agendaService_1.AgendaService.obterAgendamentos(data, municipio, status, {
            requestId,
            usuario: metaBase.usuario
        });
        cacheAgendamentos.set(cacheKey, {
            updatedAt: new Date().toISOString(),
            payload: agendamentos
        });
        (0, logger_1.logInfo)('PainelLogistica.agendamentos', 'Consulta de agendamentos concluida.', Object.assign(Object.assign({}, metaBase), { quantidade: Array.isArray(agendamentos) ? agendamentos.length : 0, duracaoMs: Date.now() - startedAt }));
        res.json(agendamentos);
    }
    catch (error) {
        if (isErroTemporarioIxc(error)) {
            const cache = cacheAgendamentos.get(cacheKey);
            const idade = idadeCacheMs(cache);
            let agendamentos = (cache === null || cache === void 0 ? void 0 : cache.payload) || [];
            let fallbackLocal = false;
            if (!cache) {
                try {
                    agendamentos = yield agendaService_1.AgendaService.obterAgendamentosLocaisFallback(data, municipio, status);
                    fallbackLocal = true;
                }
                catch (fallbackError) {
                    (0, logger_1.logError)('PainelLogistica.agendamentos.fallbackLocal', fallbackError, Object.assign(Object.assign({}, metaBase), { erroIxcCode: error === null || error === void 0 ? void 0 : error.code, erroIxcEndpoint: error === null || error === void 0 ? void 0 : error.ixcEndpoint }));
                    return res.status(500).json({
                        success: false,
                        error: 'Erro interno ao carregar dados locais da agenda.',
                        requestId
                    });
                }
            }
            (0, logger_1.logWarn)('PainelLogistica.agendamentos', 'IXC indisponível, retornando fallback local/parcial.', Object.assign(Object.assign({}, metaBase), { code: error === null || error === void 0 ? void 0 : error.code, message: error === null || error === void 0 ? void 0 : error.message, endpointIxc: error === null || error === void 0 ? void 0 : error.ixcEndpoint, usouCache: !!cache, cacheDentroTtl: cacheEstaDentroTtl(cache), idadeCacheMs: idade, fallbackLocal, quantidade: agendamentos.length, duracaoMs: Date.now() - startedAt }));
            return res.status(200).json({
                success: true,
                partial: true,
                ixcIndisponivel: true,
                stale: !!cache,
                cacheUpdatedAt: (cache === null || cache === void 0 ? void 0 : cache.updatedAt) || null,
                cacheAgeMs: idade,
                cacheExpired: cache ? !cacheEstaDentroTtl(cache) : false,
                fallbackLocal,
                warning: cache
                    ? 'IXC temporariamente indisponível. Exibindo a última versão disponível.'
                    : 'IXC temporariamente indisponível. Exibindo dados locais.',
                agendamentos,
                requestId
            });
        }
        (0, logger_1.logError)('PainelLogistica.agendamentos', error, Object.assign(Object.assign({}, metaBase), { duracaoMs: Date.now() - startedAt }));
        res.status(500).json(Object.assign(Object.assign({ success: false, error: 'Erro ao carregar agenda.' }, (process.env.NODE_ENV !== 'production' ? { detail: error.message } : {})), { requestId }));
    }
}));
router.get('/debug-agendamentos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f;
    const reqAny = req;
    const grupo = normalizarGrupoPermissao(((_c = reqAny.user) === null || _c === void 0 ? void 0 : _c.group) || ((_d = reqAny.session) === null || _d === void 0 ? void 0 : _d.group) || '');
    if (process.env.NODE_ENV === 'production' && !grupo.includes('ADMIN')) {
        return res.status(403).json({ error: 'Endpoint disponível apenas para admin.' });
    }
    const data = String(req.query.data || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ error: 'Informe data no formato YYYY-MM-DD.' });
    }
    try {
        const registros = yield agendaService_1.AgendaService.executeDb(`SELECT id, ixc_os_id, ixc_cliente_id, ixc_contrato_id, data_agendamento, turno, LENGTH(turno) tamanho_turno, status_interno
             FROM ivp_agenda_os
             WHERE data_agendamento = ?
             ORDER BY id ASC`, [data]);
        const turnosInvalidos = registros.filter((row) => {
            const turno = String(row.turno || '');
            return !turno || !['MATUTINO', 'VESPERTINO'].includes(turno);
        });
        const semClienteContrato = registros.filter((row) => !row.ixc_cliente_id || !row.ixc_contrato_id);
        const statusEstranhos = registros.filter((row) => {
            const status = String(row.status_interno || '');
            return status && ![
                'AGUARDANDO_LOGISTICA',
                'ATRIBUIDO',
                'FINALIZADO',
                'CANCELADO',
                'VISITA_CANCELADA',
                'AGUARDANDO_REAGENDAMENTO'
            ].includes(status);
        });
        res.json({
            success: true,
            data,
            total: registros.length,
            turnos_invalidos: turnosInvalidos,
            sem_cliente_ou_contrato: semClienteContrato,
            status_estranhos: statusEstranhos
        });
    }
    catch (error) {
        (0, logger_1.logError)('PainelLogistica.debugAgendamentos', error, {
            requestId: reqAny.requestId,
            data,
            usuario: ((_e = reqAny.user) === null || _e === void 0 ? void 0 : _e.username) || ((_f = reqAny.session) === null || _f === void 0 ? void 0 : _f.username) || 'Visitante'
        });
        res.status(500).json({ error: 'Erro ao consultar diagnostico.', requestId: reqAny.requestId });
    }
}));
router.get('/fila-pendentes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j, _k, _l;
    const reqAny = req;
    const requestId = reqAny.requestId || (0, logger_1.createRequestId)();
    reqAny.requestId = requestId;
    const usuario = ((_g = reqAny.user) === null || _g === void 0 ? void 0 : _g.username) || ((_h = reqAny.session) === null || _h === void 0 ? void 0 : _h.username) || 'Visitante';
    let grupo = String(((_j = reqAny.user) === null || _j === void 0 ? void 0 : _j.group) || ((_k = reqAny.session) === null || _k === void 0 ? void 0 : _k.group) || '').trim();
    if (!grupo && usuario !== 'Visitante') {
        const usuarios = yield agendaService_1.AgendaService.executeDb('SELECT grupo FROM usuarios_intranet WHERE ativo = 1 AND usuario = ? LIMIT 1', [usuario]).catch(() => []);
        grupo = ((_l = usuarios === null || usuarios === void 0 ? void 0 : usuarios[0]) === null || _l === void 0 ? void 0 : _l.grupo) || '';
    }
    const grupoNormalizado = normalizarGrupoPermissao(grupo);
    const deveOcultarSetor19 = grupoNormalizado.includes('LOGISTICA') || grupoNormalizado.includes('FIBRA');
    const cacheKey = deveOcultarSetor19 ? 'oculta-setor-19' : 'todos-setores';
    const obterSetor = (os) => [
        os === null || os === void 0 ? void 0 : os.setor,
        os === null || os === void 0 ? void 0 : os.id_setor,
        os === null || os === void 0 ? void 0 : os.id_ticket_setor,
        os === null || os === void 0 ? void 0 : os.id_setor_atual
    ].map(valor => String(valor || '').trim()).find(Boolean) || '';
    try {
        const filaCompleta = yield agendaService_1.AgendaService.obterFilaPendentes({ requestId, usuario });
        const fila = deveOcultarSetor19
            ? filaCompleta.filter((os) => obterSetor(os) !== '19')
            : filaCompleta;
        cacheFilaPendentes.set(cacheKey, {
            updatedAt: new Date().toISOString(),
            payload: fila
        });
        if (deveOcultarSetor19) {
            (0, logger_1.logInfo)('PainelLogistica.filaPendentes', '[Painel Logistica][Fila Pendentes] ocultando setor 19 para grupo LOGISTICA/FIBRA', {
                requestId,
                usuario,
                grupo: grupoNormalizado,
                totalAntes: filaCompleta.length,
                totalDepois: fila.length,
                totalOcultado: filaCompleta.length - fila.length
            });
        }
        res.json(fila);
    }
    catch (error) {
        if (isErroTemporarioIxc(error)) {
            const cache = cacheFilaPendentes.get(cacheKey);
            const items = (cache === null || cache === void 0 ? void 0 : cache.payload) || [];
            (0, logger_1.logWarn)('PainelLogistica.filaPendentes', 'IXC temporariamente indisponível.', {
                requestId,
                usuario,
                grupo: grupoNormalizado,
                endpointIxc: error === null || error === void 0 ? void 0 : error.ixcEndpoint,
                code: error === null || error === void 0 ? void 0 : error.code,
                message: error === null || error === void 0 ? void 0 : error.message,
                usouCache: !!cache,
                cacheDentroTtl: cacheEstaDentroTtl(cache),
                idadeCacheMs: idadeCacheMs(cache),
                quantidade: items.length
            });
            return res.status(200).json(Object.assign(Object.assign({}, montarErroIxcIndisponivel(cache
                ? 'Não foi possível atualizar a fila agora. Exibindo a última versão disponível.'
                : 'Não foi possível carregar a fila de O.S. pendentes agora.', requestId)), { stale: !!cache, cacheUpdatedAt: (cache === null || cache === void 0 ? void 0 : cache.updatedAt) || null, cacheAgeMs: idadeCacheMs(cache), cacheExpired: cache ? !cacheEstaDentroTtl(cache) : false, items }));
        }
        (0, logger_1.logError)('PainelLogistica.filaPendentes', error, {
            requestId,
            usuario,
            grupo: grupoNormalizado
        });
        res.status(500).json({ error: 'Erro ao carregar fila de O.S. pendentes.', requestId });
    }
}));
router.get('/tecnicos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
            SELECT u.id_funcionario_ixc as id, u.nome, e.equipe, e.dupla_id, e.regiao, e.turno_escala, e.tipo_imovel 
            FROM usuarios_intranet u
            INNER JOIN ivp_agenda_escala e ON u.id_funcionario_ixc = e.id_funcionario_ixc
            WHERE u.ativo = 1 AND e.data_escala = ?
            ORDER BY CASE WHEN e.dupla_id IS NULL OR e.dupla_id = '' THEN 1 ELSE 0 END, e.dupla_id, e.id, u.nome ASC`;
        const tecnicos = yield agendaService_1.AgendaService.executeDb(query, [req.query.data]);
        res.json(tecnicos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/todos-tecnicos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `SELECT id_funcionario_ixc as id, nome FROM usuarios_intranet WHERE ativo = 1 AND id_grupo_ixc = 31 AND id_funcionario_ixc IS NOT NULL ORDER BY nome ASC`;
        const todos = yield agendaService_1.AgendaService.executeDb(query);
        res.json(todos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/capacidade-dia', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield agendaService_1.AgendaService.executeDb('SELECT * FROM ivp_agenda_capacidade WHERE data = ?', [req.query.data]);
        res.json(result.length > 0 ? Object.assign({ encontrado: true }, result[0]) : { encontrado: false });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.get('/capacidade-templates', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const templates = yield agendaService_1.AgendaService.executeDb('SELECT * FROM ivp_agenda_capacidade_templates ORDER BY id ASC');
        res.json(templates);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.post('/capacidade-templates/salvar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nome, capacidades } = req.body;
    try {
        yield agendaService_1.AgendaService.executeDb(`INSERT INTO ivp_agenda_capacidade_templates (nome, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [nome, capacidades.casa_m, capacidades.casa_t, capacidades.predio_serra_m, capacidades.predio_serra_t, capacidades.predio_outros_m, capacidades.predio_outros_t, capacidades.inst_serra_m, capacidades.inst_serra_t, capacidades.inst_outros_m, capacidades.inst_outros_t]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.post('/salvar-configuracoes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, tecnicos, capacidades } = req.body;
    try {
        yield agendaService_1.AgendaService.executeDb('DELETE FROM ivp_agenda_escala WHERE data_escala = ?', [data]);
        for (const tec of tecnicos) {
            yield agendaService_1.AgendaService.executeDb('INSERT INTO ivp_agenda_escala (data_escala, id_funcionario_ixc, equipe, dupla_id, regiao, turno_escala, tipo_imovel) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                data,
                tec.id,
                tec.equipe,
                tec.dupla_id || null,
                normalizarRegiaoEscala(tec.regiao),
                normalizarTurnoEscala(tec.turno_escala || tec.turno),
                normalizarImovelEscala(tec.tipo_imovel)
            ]);
        }
        if (capacidades) {
            yield agendaService_1.AgendaService.executeDb('DELETE FROM ivp_agenda_capacidade WHERE data = ?', [data]);
            yield agendaService_1.AgendaService.executeDb(`INSERT INTO ivp_agenda_capacidade (data, casa_m, casa_t, predio_serra_m, predio_serra_t, predio_outros_m, predio_outros_t, inst_serra_m, inst_serra_t, inst_outros_m, inst_outros_t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data, capacidades.casa_m, capacidades.casa_t, capacidades.predio_serra_m, capacidades.predio_serra_t, capacidades.predio_outros_m, capacidades.predio_outros_t, capacidades.inst_serra_m, capacidades.inst_serra_t, capacidades.inst_outros_m, capacidades.inst_outros_t]);
        }
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.put('/atribuir-tecnico', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _m, _o, _p;
    const { id_agenda, ixc_tecnico_id, ixc_os_id, data_agendamento, turno, usuario_logado } = req.body;
    try {
        if (!ixc_os_id) {
            return res.status(400).json({ error: 'ixc_os_id é obrigatório.' });
        }
        const tecnicoFinal = ixc_tecnico_id && String(ixc_tecnico_id) !== '0'
            ? String(ixc_tecnico_id)
            : '138';
        const statusLocal = tecnicoFinal === '138'
            ? 'AGUARDANDO_LOGISTICA'
            : 'ATRIBUIDO';
        const janelaSegura = agendaService_1.AgendaService.obterJanelaAgendamentoSegura(data_agendamento, turno);
        const dataFormatada = janelaSegura.dataBr;
        const turnoNormalizado = janelaSegura.turnoNormalizado;
        const dataInteracao = janelaSegura.dataInteracao;
        const colaboradorAcao = yield agendaService_1.AgendaService.obterUsuarioIxcLogado(usuario_logado);
        const payloadAtribuir = {
            id_chamado: String(ixc_os_id),
            data_agendamento: janelaSegura.dataAgendamentoIxc,
            data_agendamento_final: janelaSegura.dataAgendamentoFinalIxc,
            id_resposta: '',
            mensagem: tecnicoFinal === '138'
                ? `O.S. devolvida para a fila da Logística (Hub Intervip).\nColaborador responsável: ${colaboradorAcao.nome}`
                : `AGENDADO VIA INTRANET\nData: ${dataFormatada}\nTurno: ${turnoNormalizado}\nAceita Encaixe: NÃO\nColaborador responsável: ${colaboradorAcao.nome}`,
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
        console.log('[DEBUG AGENDAMENTO IXC] Atribuir técnico painel:', {
            osId: ixc_os_id,
            usuarioLogado: usuario_logado || 'não informado',
            tecnicoDestino: tecnicoFinal,
            dataSelecionada: data_agendamento,
            turno,
            janelaSegura,
            payloadFinal: payloadAtribuir
        });
        const respIxc = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/su_oss_chamado_reagendar', payloadAtribuir, 'incluir');
        if ((respIxc === null || respIxc === void 0 ? void 0 : respIxc.type) === 'error') {
            throw new Error(`Erro IXC: ${respIxc.message || 'Erro ao atribuir técnico.'}`);
        }
        console.log('[DEBUG AGENDAMENTO IXC] Resposta atribuir técnico painel:', respIxc);
        if (id_agenda && !String(id_agenda).startsWith('ixc-')) {
            yield agendaService_1.AgendaService.executeDb(`
                UPDATE ivp_agenda_os
                SET ixc_tecnico_id = ?,
                    status_interno = ?
                WHERE id = ?
                `, [tecnicoFinal, statusLocal, id_agenda]);
        }
        res.json({
            success: true,
            message: 'Técnico atribuído com sucesso no IXC.',
            payload_enviado: payloadAtribuir,
            resposta_ixc: respIxc
        });
    }
    catch (error) {
        console.error('[Logistica] Erro ao atribuir técnico:', ((_m = error.response) === null || _m === void 0 ? void 0 : _m.data) || error.message);
        res.status(500).json({
            error: ((_p = (_o = error.response) === null || _o === void 0 ? void 0 : _o.data) === null || _p === void 0 ? void 0 : _p.message) || error.message
        });
    }
}));
router.put('/reagendar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (typeof req.body.abrir_chamado_duvida === 'undefined') {
            return res.status(400).json({ error: 'Escolha se deseja abrir chamado de duvida ou apenas reagendar.' });
        }
        if (!['COM_CHAMADO_DUVIDA', 'APENAS_REAGENDAR'].includes(String(req.body.modo_reagendamento || ''))) {
            return res.status(400).json({ error: 'Informe o modo do reagendamento.' });
        }
        yield agendaService_1.AgendaService.reagendarOs(req.body);
        res.json({ success: true, message: "OS Reagendada com sucesso!" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/cancelar-visita', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _q, _r, _s;
    const { id_local, ixc_os_id, motivo, usuario_logado } = req.body;
    try {
        if (!ixc_os_id)
            return res.status(400).json({ error: 'ixc_os_id e obrigatorio.' });
        if (!motivo || !String(motivo).trim())
            return res.status(400).json({ error: 'Informe o motivo do cancelamento.' });
        const usuarioIxc = yield agendaService_1.AgendaService.obterUsuarioIxcLogado(usuario_logado);
        if (String(usuarioIxc.id_funcionario_ixc) === '138') {
            return res.status(400).json({
                error: 'Não foi possível identificar o colaborador IXC do usuário logado. Cancele a visita com um usuário vinculado ao IXC.'
            });
        }
        /* console.log('[Cancelar Visita Debug] Solicitação recebida:', {
            osId: ixc_os_id,
            modo: 'RETORNAR_FILA_LOGISTICA',
            usuarioLogado: usuario_logado || 'não informado',
            id_funcionario_ixc: usuarioIxc.id_funcionario_ixc
        }); */
        const textoMensagem = `Visita cancelada pelo cliente. Motivo: ${String(motivo).trim()}. OS retornada para a fila da logística.`;
        /* console.log('[Cancelar Visita Debug] Registrando mensagem IXC:', {
            osId: ixc_os_id,
            mensagem: textoMensagem,
            id_funcionario_ixc: usuarioIxc.id_funcionario_ixc
        }); */
        yield agendaService_1.AgendaService.registrarMensagemSimplesOs(String(ixc_os_id), textoMensagem, usuario_logado, 'Cancelar Visita');
        //console.log('[Cancelar Visita Debug] Nenhuma chamada IXC adicional será feita; limpeza será local para não ocupar vaga e evitar alteração incompleta de OS.');
        const statusLocal = 'AGUARDANDO_LOGISTICA';
        const tecnicoHub = '138';
        const params = [statusLocal, tecnicoHub, usuario_logado || null, String(motivo).trim(), id_local || 0, ixc_os_id];
        try {
            yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os
                 SET status_interno = ?,
                     data_agendamento = NULL,
                     turno = NULL,
                     ixc_tecnico_id = ?,
                     espera_cliente_ate = NULL,
                     visita_cancelada_em = NOW(),
                     visita_cancelada_por = ?,
                     visita_cancelada_motivo = ?
                 WHERE id = ? OR ixc_os_id = ?`, params);
            /* console.log('[Cancelar Visita Debug] Limpeza local concluída:', {
                osId: ixc_os_id,
                statusLocal,
                campos: ['data_agendamento', 'turno', 'ixc_tecnico_id=138', 'espera_cliente_ate']
            }); */
        }
        catch (dbError) {
            console.warn('[Painel Logistica][Cancelar Visita] Campos novos/espera ausentes, atualizando campos básicos:', dbError.message);
            yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os
                 SET status_interno = ?,
                     data_agendamento = NULL,
                     turno = NULL,
                     ixc_tecnico_id = ?
                 WHERE id = ? OR ixc_os_id = ?`, [statusLocal, tecnicoHub, id_local || 0, ixc_os_id]);
            /* console.log('[Cancelar Visita Debug] Limpeza local básica concluída:', {
                osId: ixc_os_id,
                statusLocal,
                campos: ['data_agendamento', 'turno', 'ixc_tecnico_id=138']
            }); */
        }
        res.json({ success: true, status_interno: statusLocal, ixc_tecnico_id: tecnicoHub });
    }
    catch (error) {
        console.error('[Painel Logistica][Cancelar Visita]', ((_q = error.response) === null || _q === void 0 ? void 0 : _q.data) || error.message);
        res.status(500).json({ error: ((_s = (_r = error.response) === null || _r === void 0 ? void 0 : _r.data) === null || _s === void 0 ? void 0 : _s.message) || error.message });
    }
}));
router.put('/fechar-os', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ixc_os_id, mensagem_resposta, id_tarefa, id_processo, id_tarefa_atual, usuario_logado } = req.body;
    try {
        if (!(yield exigirLogisticaOuNoc(req, res)))
            return;
        const tecnicoFechamento = yield agendaService_1.AgendaService.obterIdFuncionarioIxc(usuario_logado);
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
            const respWfl = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/su_oss_chamado_fechar', payload, 'incluir');
            if (respWfl && respWfl.type === 'error')
                throw new Error(`Erro WFL IXC: ${respWfl.message}`);
        }
        else {
            yield agendaService_1.AgendaService.makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
                status: 'F',
                mensagem_resposta: mensagem_resposta,
                id_tecnico: tecnicoFechamento
            });
        }
        yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os
             SET status_interno = 'FINALIZADO',
                 data_agendamento = NULL,
                 turno = NULL,
                 ixc_tecnico_id = NULL,
                 espera_cliente_ate = NULL
             WHERE ixc_os_id = ?`, [ixc_os_id]).catch((dbError) => __awaiter(void 0, void 0, void 0, function* () {
            console.error('[Painel Logistica] Falha ao limpar agenda ao finalizar; marcando apenas FINALIZADO:', dbError.message);
            yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os SET status_interno = 'FINALIZADO' WHERE ixc_os_id = ?`, [ixc_os_id]).catch((fallbackError) => console.error('[Painel Logistica] Falha ao marcar OS local como FINALIZADO:', fallbackError.message));
        }));
        res.json({ success: true, message: "OS Finalizada com sucesso!" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/tratar-prioridade', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _t, _u, _v;
    const { id_local, acao, ixc_os_id, usuario_logado } = req.body;
    try {
        if (!(yield exigirLogisticaOuNoc(req, res)))
            return;
        if (!id_local) {
            return res.status(400).json({ error: 'id_local é obrigatório.' });
        }
        if (!ixc_os_id) {
            return res.status(400).json({ error: 'ixc_os_id é obrigatório.' });
        }
        const rows = yield agendaService_1.AgendaService.executeDb(`
            SELECT id, turno, data_agendamento, ixc_tecnico_id, solicita_prioridade
            FROM ivp_agenda_os
            WHERE id = ?
            LIMIT 1
            `, [id_local]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Agendamento local não encontrado.' });
        }
        const osLocal = rows[0];
        const turno = agendaService_1.AgendaService.normalizarTurnoAgenda(osLocal.turno || 'MATUTINO');
        const hojeYmd = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
        const hojeBr = formatarDataIxc(hojeYmd);
        const janelaSegura = agendaService_1.AgendaService.obterJanelaAgendamentoSegura(hojeYmd, turno);
        const turnoNormalizado = janelaSegura.turnoNormalizado;
        const dataInteracao = janelaSegura.dataInteracao;
        const colaboradorAcao = yield agendaService_1.AgendaService.obterUsuarioIxcLogado(usuario_logado);
        if (acao === 'aceitar') {
            const payloadAceitar = {
                id_chamado: String(ixc_os_id),
                data_agendamento: janelaSegura.dataAgendamentoIxc,
                data_agendamento_final: janelaSegura.dataAgendamentoFinalIxc,
                id_resposta: '',
                mensagem: `AGENDADO VIA INTRANET\nData: ${hojeBr}\nTurno: ${turnoNormalizado}\nAceita Encaixe: SIM\nColaborador responsável: ${colaboradorAcao.nome}`,
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
            console.log('[DEBUG AGENDAMENTO IXC] Aceitar prioridade painel:', {
                osId: ixc_os_id,
                usuarioLogado: usuario_logado || 'não informado',
                tecnicoDestino: '138',
                dataSelecionada: hojeYmd,
                turno,
                janelaSegura,
                payloadFinal: payloadAceitar
            });
            const respIxc = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/su_oss_chamado_reagendar', payloadAceitar, 'incluir');
            if ((respIxc === null || respIxc === void 0 ? void 0 : respIxc.type) === 'error') {
                throw new Error(`Erro IXC: ${respIxc.message || 'IXC recusou a prioridade.'}`);
            }
            console.log('[DEBUG AGENDAMENTO IXC] Resposta aceitar prioridade painel:', respIxc);
            yield agendaService_1.AgendaService.executeDb(`
                UPDATE ivp_agenda_os
                SET data_agendamento = ?,
                    turno = ?,
                    solicita_prioridade = 0,
                    ixc_tecnico_id = 138,
                    status_interno = 'AGUARDANDO_LOGISTICA'
                WHERE id = ?
                `, [hojeYmd, turnoNormalizado, id_local]);
            return res.json({
                success: true,
                message: 'Prioridade aceita. OS puxada para hoje no IXC e no painel.',
                payload_enviado: payloadAceitar,
                resposta_ixc: respIxc
            });
        }
        if (acao === 'recusar') {
            yield agendaService_1.AgendaService.executeDb(`
                UPDATE ivp_agenda_os
                SET solicita_prioridade = 0
                WHERE id = ?
                `, [id_local]);
            return res.json({
                success: true,
                message: 'Prioridade recusada. O agendamento original foi mantido no IXC.'
            });
        }
        return res.status(400).json({ error: 'Ação inválida. Use aceitar ou recusar.' });
    }
    catch (error) {
        console.error('[Logistica] Erro ao tratar prioridade:', ((_t = error.response) === null || _t === void 0 ? void 0 : _t.data) || error.message);
        return res.status(500).json({
            error: ((_v = (_u = error.response) === null || _u === void 0 ? void 0 : _u.data) === null || _v === void 0 ? void 0 : _v.message) || error.message
        });
    }
}));
router.get('/tarefas-workflow/:idProcesso', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tarefas = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/su_oss_tarefa', { qtype: 'id_processo', query: req.params.idProcesso, oper: '=', rp: '50' });
        res.json(tarefas.registros || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/onu-realtime', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const idFibra = req.body.id_fibra;
        if (!idFibra)
            return res.status(400).json({ error: 'id_fibra é obrigatório.' });
        yield agendaService_1.AgendaService.makeIxcRequest('POST', '/radpop_radio_cliente_fibra', { id_registro: idFibra }, 'integracao').catch(() => null);
        const resp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
            qtype: 'radpop_radio_cliente_fibra.id',
            query: String(idFibra),
            oper: '=',
            page: '1',
            rp: '1'
        });
        res.json(resp.registros ? resp.registros[0] : null);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/historico-conexao/:username', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const resp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/radacct', {
            qtype: 'radacct.username',
            query: req.params.username,
            oper: '=',
            page: '1',
            rp: '10',
            sortname: 'radacctid',
            sortorder: 'desc'
        });
        res.json(resp.registros || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/os-detalhes/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const osResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/su_oss_chamado', { qtype: 'su_oss_chamado.id', query: req.params.id, oper: '=', rp: '1' });
        if (!osResp.registros || osResp.registros.length === 0)
            return res.status(404).json({ error: 'OS não encontrada' });
        const os = osResp.registros[0];
        const clienteResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/cliente', { qtype: 'cliente.id', query: os.id_cliente, oper: '=', rp: '1' });
        const cliente = clienteResp.registros ? clienteResp.registros[0] : {};
        const idContrato = (os.id_contrato_kit && os.id_contrato_kit !== '0') ? os.id_contrato_kit : os.id_contrato;
        const contratoResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/cliente_contrato', { qtype: 'cliente_contrato.id', query: idContrato, oper: '=', rp: '1' });
        let contrato = contratoResp.registros ? contratoResp.registros[0] : {};
        contrato = yield aplicarPlanoLocalContrato(contrato);
        const localRows = yield agendaService_1.AgendaService.executeDb('SELECT * FROM ivp_agenda_os WHERE ixc_os_id = ? LIMIT 1', [req.params.id]).catch(() => []);
        const local = localRows && localRows.length > 0 ? localRows[0] : {};
        let login = null;
        let onu = null;
        let mensagens = [];
        let historicoLogin = [];
        let resumoAcesso = {
            status: 'Sem login',
            quedas_hoje: 0,
            quedas_7_dias: 0,
            rx: 'N/A',
            tx: 'N/A',
            onu_status: 'N/A'
        };
        if (idContrato && idContrato !== '0') {
            const loginResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/radusuarios', { qtype: 'radusuarios.id_contrato', query: idContrato, oper: '=', rp: '1' });
            if (loginResp.registros && loginResp.registros.length > 0) {
                login = loginResp.registros[0];
                const username = login.login || login.user || login.usuario;
                if (username) {
                    const histResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/radacct', {
                        qtype: 'radacct.username', query: username, oper: '=', page: '1', rp: '100', sortname: 'radacctid', sortorder: 'desc'
                    }).catch(() => ({ registros: [] }));
                    historicoLogin = histResp.registros || [];
                    if (historicoLogin.length > 0) {
                        login.historico_atual = historicoLogin[0];
                        login.historico_queda = historicoLogin.find((h) => h.acctstoptime !== null && h.acctstoptime !== '');
                    }
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const seteDias = new Date(hoje);
                    seteDias.setDate(seteDias.getDate() - 7);
                    const getDataHist = (h) => new Date(h.acctstarttime || h.acctstoptime || h.fim || h.inicio || 0);
                    const ehQueda = (h) => !!(h.acctstoptime || h.tempo_final || h.final);
                    resumoAcesso.quedas_hoje = historicoLogin.filter((h) => ehQueda(h) && getDataHist(h) >= hoje).length;
                    resumoAcesso.quedas_7_dias = historicoLogin.filter((h) => ehQueda(h) && getDataHist(h) >= seteDias).length;
                    resumoAcesso.status = historicoLogin[0] && !historicoLogin[0].acctstoptime ? 'Online' : 'Offline';
                }
                const tentativasOnu = [
                    { qtype: 'radpop_radio_cliente_fibra.id_login', query: String(login.id) },
                    { qtype: 'id_login', query: String(login.id) },
                    { qtype: 'radpop_radio_cliente_fibra.login', query: String(login.id) },
                    { qtype: 'login', query: String(login.id) }
                ];
                for (const tentativa of tentativasOnu) {
                    const onuResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/radpop_radio_cliente_fibra', Object.assign(Object.assign({}, tentativa), { oper: '=', rp: '1', sortname: 'id', sortorder: 'desc' })).catch(() => ({ registros: [] }));
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
        const msgResp = yield agendaService_1.AgendaService.makeIxcRequest('POST', '/su_oss_chamado_mensagem', {
            qtype: 'su_oss_chamado_mensagem.id_chamado', query: req.params.id, oper: '=', page: '1', rp: '100', sortname: 'id', sortorder: 'desc'
        }).catch(() => ({ registros: [] }));
        mensagens = yield agendaService_1.AgendaService.enriquecerMensagensComAutores(msgResp.registros || []);
        mensagens = [...montarMensagensLocaisObservacao(local), ...mensagens];
        res.json({ os, cliente, contrato, login, onu, local, mensagens, historicoLogin, resumoAcesso });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/contato-cliente', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _w, _x, _y;
    const { id_local, ixc_os_id, status_contato, mensagem, usuario_logado } = req.body;
    try {
        if (!(yield exigirLogisticaOuNoc(req, res)))
            return;
        if (!id_local || !ixc_os_id || !status_contato) {
            return res.status(400).json({ error: 'id_local, ixc_os_id e status_contato são obrigatórios.' });
        }
        const status = String(status_contato).toUpperCase();
        if (!['CONFIRMADO', 'SEM_CONTATO'].includes(status)) {
            return res.status(400).json({ error: 'Status de contato inválido.' });
        }
        const textoBase = mensagem || (status === 'CONFIRMADO' ? 'Cliente confirmou que irá receber a visita.' :
            'Não foi possível contato com o cliente.');
        const mensagemContato = `Confirmação com Cliente: ${textoBase}`;
        let dataInteracao = dataHoraAtualSaoPaulo();
        let registradoIxc = false;
        let aviso = '';
        try {
            const registro = yield agendaService_1.AgendaService.registrarMensagemSimplesOs(String(ixc_os_id), mensagemContato, usuario_logado, 'Contato Cliente');
            dataInteracao = registro.dataInteracao;
            registradoIxc = true;
        }
        catch (error) {
            aviso = 'Confirmação salva localmente. O IXC recusou o registro da mensagem.';
            console.warn('[IXC Mensagem Simples] fallback local ativado:', ((_w = error.response) === null || _w === void 0 ? void 0 : _w.data) || error.message);
        }
        yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os SET contato_status = ?, contato_confirmado_em = ? WHERE id = ?`, [status, dataInteracao, id_local]);
        if (!registradoIxc) {
            yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os SET observacao_logistica = CONCAT(COALESCE(observacao_logistica, ''), ?, '\n') WHERE id = ?`, [`[${dataInteracao}] [LOCAL] ${mensagemContato}`, id_local]);
        }
        res.json({ success: true, registrado_ixc: registradoIxc, aviso });
    }
    catch (error) {
        res.status(500).json({ error: ((_y = (_x = error.response) === null || _x === void 0 ? void 0 : _x.data) === null || _y === void 0 ? void 0 : _y.message) || error.message });
    }
}));
router.post('/aguardar-cliente', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_local, minutos, usuario_logado } = req.body;
    try {
        if (!(yield exigirLogisticaOuNoc(req, res)))
            return;
        const minutosNum = Number(minutos);
        if (!id_local || !minutosNum || minutosNum <= 0) {
            return res.status(400).json({ error: 'Informe OS, agendamento local e minutos de espera.' });
        }
        const inicioEspera = dataHoraSaoPaulo(new Date());
        const fimEspera = dataHoraSaoPaulo(new Date(Date.now() + minutosNum * 60000));
        console.log('[Espera Cliente Local]', {
            id_local,
            minutos: minutosNum,
            usuario_logado,
            inicio: inicioEspera,
            fim_previsto: fimEspera,
            chamada_ixc: false
        });
        yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os SET espera_cliente_ate = ? WHERE id = ?`, [fimEspera, id_local]);
        res.json({ success: true, espera_cliente_ate: fimEspera });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/parar-espera-cliente', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_local } = req.body;
    try {
        if (!(yield exigirLogisticaOuNoc(req, res)))
            return;
        if (!id_local) {
            return res.status(400).json({ error: 'id_local é obrigatório.' });
        }
        yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os SET espera_cliente_ate = NULL WHERE id = ?`, [id_local]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/observacao-logistica', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _z, _0, _1;
    const { id_local, ixc_os_id, mensagem, usuario_logado } = req.body;
    try {
        if (!id_local || !ixc_os_id || !mensagem || !String(mensagem).trim()) {
            return res.status(400).json({ error: 'Informe a observação.' });
        }
        const texto = String(mensagem).trim();
        let dataInteracao = dataHoraAtualSaoPaulo();
        let registradoIxc = false;
        let aviso = '';
        try {
            const registro = yield agendaService_1.AgendaService.registrarMensagemSimplesOs(String(ixc_os_id), `Observação: ${texto}`, usuario_logado, 'Observacoes');
            dataInteracao = registro.dataInteracao;
            registradoIxc = true;
        }
        catch (error) {
            aviso = 'Observação salva localmente. O IXC recusou o registro da mensagem.';
            console.warn('[IXC Mensagem Simples] fallback local ativado:', ((_z = error.response) === null || _z === void 0 ? void 0 : _z.data) || error.message);
        }
        yield agendaService_1.AgendaService.executeDb(`UPDATE ivp_agenda_os SET observacao_logistica = CONCAT(COALESCE(observacao_logistica, ''), ?, '\n') WHERE id = ?`, [`[${dataInteracao}] ${registradoIxc ? '[IXC]' : '[LOCAL]'} ${texto}`, id_local]);
        res.json({ success: true, registrado_ixc: registradoIxc, aviso });
    }
    catch (error) {
        res.status(500).json({ error: ((_1 = (_0 = error.response) === null || _0 === void 0 ? void 0 : _0.data) === null || _1 === void 0 ? void 0 : _1.message) || error.message });
    }
}));
router.get('/tags', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tags = yield agendaService_1.AgendaService.executeDb('SELECT * FROM ivp_agenda_tags ORDER BY ativo DESC, ordem ASC, nome ASC');
        res.json(tags || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/tags', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nome, cor_fundo, cor_texto, ativo, ordem } = req.body;
    try {
        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ error: 'Nome da tag é obrigatório.' });
        }
        const result = yield agendaService_1.AgendaService.executeDb(`
            INSERT INTO ivp_agenda_tags (nome, cor_fundo, cor_texto, ativo, ordem)
            VALUES (?, ?, ?, ?, ?)
            `, [
            String(nome).trim(),
            cor_fundo || '#0d6efd',
            cor_texto || '#ffffff',
            ativo === false || ativo === 0 || ativo === '0' ? 0 : 1,
            Number(ordem || 0)
        ]);
        res.json({ success: true, id: result.insertId });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.put('/tags/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nome, cor_fundo, cor_texto, ativo, ordem } = req.body;
    try {
        yield agendaService_1.AgendaService.executeDb(`
            UPDATE ivp_agenda_tags
            SET nome = ?, cor_fundo = ?, cor_texto = ?, ativo = ?, ordem = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `, [
            String(nome || '').trim(),
            cor_fundo || '#0d6efd',
            cor_texto || '#ffffff',
            ativo === false || ativo === 0 || ativo === '0' ? 0 : 1,
            Number(ordem || 0),
            req.params.id
        ]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.delete('/tags/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield agendaService_1.AgendaService.executeDb('DELETE FROM ivp_agenda_os_tags WHERE id_tag = ?', [req.params.id]);
        yield agendaService_1.AgendaService.executeDb('DELETE FROM ivp_agenda_tags WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.get('/os-tags/:idAgenda', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield agendaService_1.AgendaService.executeDb(`
            SELECT t.id, t.nome, t.cor_fundo, t.cor_texto
            FROM ivp_agenda_os_tags ot
            INNER JOIN ivp_agenda_tags t ON t.id = ot.id_tag
            WHERE ot.id_agenda_os = ? AND t.ativo = 1
            ORDER BY t.ordem ASC, t.nome ASC
            `, [req.params.idAgenda]);
        res.json(rows || []);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.put('/os-tags/:idAgenda', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tag_ids } = req.body;
    try {
        const ids = Array.isArray(tag_ids) ? tag_ids.map(String).filter(Boolean) : [];
        yield agendaService_1.AgendaService.executeDb('DELETE FROM ivp_agenda_os_tags WHERE id_agenda_os = ?', [req.params.idAgenda]);
        for (const idTag of ids) {
            yield agendaService_1.AgendaService.executeDb('INSERT IGNORE INTO ivp_agenda_os_tags (id_agenda_os, id_tag) VALUES (?, ?)', [req.params.idAgenda, idTag]);
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/prioridade-logistica', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_local, ixc_os_id, prioridade, usuario_logado } = req.body;
    try {
        if (!(yield exigirLogisticaOuNoc(req, res)))
            return;
        if (!id_local || String(id_local).startsWith('fila-')) {
            return res.status(400).json({ error: 'Agendamento local inválido.' });
        }
        const prioridadeNum = Number(prioridade);
        if (!Number.isInteger(prioridadeNum) || prioridadeNum < 0 || prioridadeNum > 3) {
            return res.status(400).json({ error: 'Prioridade inválida.' });
        }
        const labelsPrioridade = { 0: 'Normal', 1: 'Média', 2: 'Alta', 3: 'Urgente' };
        if (ixc_os_id) {
            const mensagemPrioridade = `Prioridade da logística alterada para: ${labelsPrioridade[prioridadeNum]}`;
            yield agendaService_1.AgendaService.registrarMensagemSimplesOs(String(ixc_os_id), mensagemPrioridade, usuario_logado, 'Prioridade Logistica');
        }
        yield agendaService_1.AgendaService.executeDb(`
            UPDATE ivp_agenda_os
            SET prioridade_logistica = ?, prioridade_logistica_obs = ?
            WHERE id = ?
            `, [prioridadeNum, '', id_local]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.put('/capacidade-templates/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nome, capacidades } = req.body;
    try {
        yield agendaService_1.AgendaService.executeDb(`
            UPDATE ivp_agenda_capacidade_templates
            SET nome = ?, casa_m = ?, casa_t = ?, predio_serra_m = ?, predio_serra_t = ?,
                predio_outros_m = ?, predio_outros_t = ?, inst_serra_m = ?, inst_serra_t = ?,
                inst_outros_m = ?, inst_outros_t = ?
            WHERE id = ?
            `, [nome, capacidades.casa_m, capacidades.casa_t, capacidades.predio_serra_m, capacidades.predio_serra_t, capacidades.predio_outros_m, capacidades.predio_outros_t, capacidades.inst_serra_m, capacidades.inst_serra_t, capacidades.inst_outros_m, capacidades.inst_outros_t, req.params.id]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
router.delete('/capacidade-templates/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield agendaService_1.AgendaService.executeDb('DELETE FROM ivp_agenda_capacidade_templates WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
