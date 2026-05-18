"use strict";
// routes/api/v5/monitoramento.ts
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
const Express = require("express");
const database_1 = require("../../../api/database");
const axios_1 = require("axios");
const router = Express.Router();
const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        database_1.LOCALHOST.query(sql, params, (err, results) => {
            if (err)
                reject(err);
            else
                resolve(results);
        });
    });
};
const webhookQueue = [];
let isProcessingQueue = false;
function processWebhookQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isProcessingQueue)
            return;
        isProcessingQueue = true;
        while (webhookQueue.length > 0) {
            const task = webhookQueue.shift();
            if (task) {
                try {
                    yield task();
                }
                catch (err) {
                    console.error("Erro na fila do webhook:", err);
                }
            }
        }
        isProcessingQueue = false;
    });
}
router.post('/webhook/n8n', (req, res) => {
    res.json({ success: true, message: 'Alerta recebido e enfileirado para processamento.' });
    webhookQueue.push(() => __awaiter(void 0, void 0, void 0, function* () {
        let { host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, status, data_evento, sinal_rx_retorno, is_update, update_action, update_message } = req.body;
        let data_evento_sql = data_evento;
        if (data_evento_sql && data_evento_sql.includes('.')) {
            data_evento_sql = data_evento_sql.replace(/\./g, '-');
        }
        let idClienteForIXC = null;
        let idContrato = null;
        if (tipo_alerta === 'CORP' && identificador) {
            if (identificador.includes('|')) {
                const parts = identificador.split('|');
                idClienteForIXC = parts[0];
                idContrato = parts[1];
            }
            else {
                idClienteForIXC = identificador;
            }
        }
        else if (tipo_alerta === 'ITX' && (nome_identificado || identificador)) {
            const matchITX = (nome_identificado || identificador).match(/ITX-(\d+)/i);
            if (matchITX) {
                idClienteForIXC = matchITX[1];
            }
        }
        if (idClienteForIXC && (!nome_identificado || !nome_identificado.includes('|'))) {
            let sufixoFilial = "";
            const nomeRaw = nome_identificado || identificador || "";
            if (idClienteForIXC === '29571') {
                const match = nomeRaw.match(/29571-(AP\d+)/i);
                if (match)
                    sufixoFilial = ` - Filial ${match[1]}`;
            }
            else if (idClienteForIXC === '58540') {
                let match = nomeRaw.match(/58540_([^:]+)/i);
                if (!match)
                    match = nomeRaw.match(/58540-OBTL-([^:]+)/i);
                if (!match)
                    match = nomeRaw.match(/58540-STTL-([^:]+)/i);
                if (match)
                    sufixoFilial = ` - Filial ${match[1].replace(/_$/, '').trim()}`;
            }
            else if (idClienteForIXC === '56525') {
                const match = nomeRaw.match(/56525-.*?(R\d+-\d+)/i);
                if (match)
                    sufixoFilial = ` - Filial ${match[1].trim()}`;
            }
            try {
                const headersIxc = { 'Authorization': `Basic ${process.env.IXC_API_TOKEN}`, 'ixcsoft': 'listar', 'Content-Type': 'application/json' };
                const respCliente = yield axios_1.default.post(`${process.env.IXC_API_URL}/webservice/v1/cliente`, { qtype: "cliente.id", query: idClienteForIXC, oper: "=", rp: "1" }, { headers: headersIxc });
                let razaoSocial = "";
                if (respCliente.data && respCliente.data.registros && respCliente.data.registros.length > 0) {
                    razaoSocial = respCliente.data.registros[0].razao;
                }
                let enderecoCompleto = "";
                if (idContrato) {
                    const respContrato = yield axios_1.default.post(`${process.env.IXC_API_URL}/webservice/v1/cliente_contrato`, { qtype: "cliente_contrato.id", query: idContrato, oper: "=", rp: "1" }, { headers: headersIxc });
                    if (respContrato.data && respContrato.data.registros && respContrato.data.registros.length > 0) {
                        const c = respContrato.data.registros[0];
                        enderecoCompleto = `${c.endereco}, ${c.numero}`;
                        if (c.complemento)
                            enderecoCompleto += ` (${c.complemento})`;
                        enderecoCompleto += ` - ${c.bairro}`;
                    }
                }
                if (razaoSocial) {
                    nome_identificado = `${razaoSocial} (ID: ${idClienteForIXC})${sufixoFilial}`;
                    if (enderecoCompleto)
                        nome_identificado += ` | ${enderecoCompleto}`;
                }
            }
            catch (error) {
                console.error("Erro IXC:", error.message);
            }
        }
        if (is_update === '1' || (update_action && update_action.toLowerCase().includes('acknowledge'))) {
            const checkDuplicata = yield queryAsync(`
                SELECT id, motivo_falha, id_incidente FROM mon_alertas 
                WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' 
                ORDER BY id DESC LIMIT 1
            `, [identificador, host_zabbix]);
            if (checkDuplicata && checkDuplicata.length > 0) {
                const alertaExistente = checkDuplicata[0];
                let motivoBase = alertaExistente.motivo_falha || 'Desconhecido';
                let novoMotivo = motivoBase;
                if (update_message && update_message.trim() !== "") {
                    novoMotivo = `${motivoBase} | ACK: ${update_message}`;
                }
                else {
                    novoMotivo = `${motivoBase} | Reconhecido no Zabbix`;
                }
                yield queryAsync(`UPDATE mon_alertas SET status = 'IGNORADO', data_retorno = NOW(), motivo_falha = ? WHERE id = ?`, [novoMotivo, alertaExistente.id]);
                if (alertaExistente.id_incidente) {
                    const checkRestantes = yield queryAsync(`SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1`, [alertaExistente.id_incidente]);
                    if (checkRestantes.length === 0) {
                        yield queryAsync(`UPDATE mon_incidentes SET status = 'Resolvido', data_fim = NOW() WHERE id = ?`, [alertaExistente.id_incidente]);
                    }
                }
            }
            return;
        }
        if (status === 'DOWN') {
            const checkDuplicata = yield queryAsync(`
                SELECT id FROM mon_alertas 
                WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' 
                ORDER BY id DESC LIMIT 1
            `, [identificador, host_zabbix]);
            if (checkDuplicata && checkDuplicata.length > 0)
                return;
            const buscarIncidente = `
                SELECT id, regiao_afetada FROM mon_incidentes 
                WHERE status = 'Ativo' 
                AND (
                    (regiao_afetada = ? AND data_inicio >= CAST(? AS DATETIME) - INTERVAL 20 MINUTE)
                    OR 
                    (data_inicio >= CAST(? AS DATETIME) - INTERVAL 2 MINUTE)
                )
                ORDER BY id DESC LIMIT 1
            `;
            const resInc = yield queryAsync(buscarIncidente, [host_zabbix, data_evento_sql, data_evento_sql]);
            let idIncidentePai;
            if (resInc && resInc.length > 0) {
                idIncidentePai = resInc[0].id;
            }
            else {
                const resCriar = yield queryAsync(`INSERT INTO mon_incidentes (regiao_afetada, data_inicio, status) VALUES (?, ?, 'Ativo')`, [host_zabbix, data_evento_sql]);
                idIncidentePai = resCriar.insertId;
            }
            yield queryAsync(`
                INSERT INTO mon_alertas 
                (id_incidente, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_falha, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'DOWN')
            `, [idIncidentePai, host_zabbix, tipo_alerta, identificador, nome_identificado, motivo_falha, data_evento_sql]);
        }
        else if (status === 'UP') {
            const resBusca = yield queryAsync(`
                SELECT id, id_incidente FROM mon_alertas 
                WHERE identificador = ? AND host_zabbix = ? AND status IN ('DOWN', 'IGNORADO')
                ORDER BY data_falha DESC LIMIT 1
            `, [identificador, host_zabbix]);
            if (resBusca && resBusca.length > 0) {
                const alertaId = resBusca[0].id;
                const incidenteId = resBusca[0].id_incidente;
                yield queryAsync(`UPDATE mon_alertas SET status = 'UP', data_retorno = ?, sinal_rx_retorno = ? WHERE id = ?`, [data_evento_sql, sinal_rx_retorno, alertaId]);
                if (incidenteId) {
                    const resCheck = yield queryAsync(`SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1`, [incidenteId]);
                    if (resCheck.length === 0) {
                        yield queryAsync(`UPDATE mon_incidentes SET status = 'Resolvido', data_fim = ? WHERE id = ?`, [data_evento_sql, incidenteId]);
                    }
                }
            }
        }
    }));
    processWebhookQueue();
});
router.get('/falhas-ativas', (req, res) => {
    const ARCHIVE_OLD_SQL = `
        UPDATE mon_alertas 
        SET status = 'IGNORADO', motivo_falha = CONCAT(IFNULL(motivo_falha, ''), ' | Arquivado auto. (Mais de 3 dias)') 
        WHERE status = 'DOWN' 
          AND data_falha <= NOW() - INTERVAL 3 DAY
    `;
    database_1.LOCALHOST.query(ARCHIVE_OLD_SQL, () => { });
    const AUTO_HEAL_SQL = `
        UPDATE mon_incidentes 
        SET status = 'Resolvido', data_fim = NOW() 
        WHERE status = 'Ativo' 
          AND data_inicio <= NOW() - INTERVAL 5 MINUTE
          AND id NOT IN (SELECT DISTINCT id_incidente FROM mon_alertas WHERE status = 'DOWN' AND id_incidente IS NOT NULL)
    `;
    database_1.LOCALHOST.query(AUTO_HEAL_SQL, () => { });
    const queryIncidentes = `
        SELECT * FROM mon_incidentes 
        WHERE 
            (status = 'Ativo' AND data_inicio <= NOW() - INTERVAL '2:30' MINUTE_SECOND)
           OR 
            (status = 'Resolvido' AND data_fim >= NOW() - INTERVAL 10 MINUTE)
        ORDER BY data_inicio DESC
    `;
    database_1.LOCALHOST.query(queryIncidentes, (errInc, resultIncidentes) => {
        if (errInc)
            return res.status(500).json({ error: errInc.message });
        const queryAlertas = `
            SELECT * FROM mon_alertas 
            WHERE 
                id_incidente IN (
                    SELECT id FROM mon_incidentes 
                    WHERE status = 'Ativo' OR (status = 'Resolvido' AND data_fim >= NOW() - INTERVAL 10 MINUTE)
                )
                OR 
                (id_incidente IS NULL AND (
                    (status = 'DOWN' AND data_falha <= NOW() - INTERVAL '2:30' MINUTE_SECOND) OR 
                    (status IN ('UP', 'IGNORADO') AND data_retorno >= NOW() - INTERVAL 10 MINUTE)
                ))
            ORDER BY data_falha DESC
        `;
        database_1.LOCALHOST.query(queryAlertas, (errAlt, resultAlertas) => {
            if (errAlt)
                return res.status(500).json({ error: errAlt.message });
            let incidentesAgrupados = resultIncidentes.map(inc => {
                return Object.assign(Object.assign({}, inc), { alertas: resultAlertas.filter(a => a.id_incidente === inc.id) });
            });
            incidentesAgrupados = incidentesAgrupados.filter(inc => inc.alertas && inc.alertas.length > 0);
            const alertasIsolados = resultAlertas.filter(a => a.id_incidente === null);
            alertasIsolados.forEach(alerta => {
                incidentesAgrupados.push({
                    id: alerta.id,
                    regiao_afetada: alerta.host_zabbix,
                    data_inicio: alerta.data_falha,
                    status: alerta.status === 'DOWN' ? 'Ativo' : 'Resolvido',
                    alertas: [alerta]
                });
            });
            incidentesAgrupados.sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime());
            res.json(incidentesAgrupados);
        });
    });
});
router.get('/busca-contratos/:id_cliente', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { id_cliente } = req.params;
    try {
        const headersIxc = {
            'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
            'ixcsoft': 'listar',
            'Content-Type': 'application/json'
        };
        const respCliente = yield axios_1.default.post(`${process.env.IXC_API_URL}/webservice/v1/cliente`, {
            qtype: "cliente.id", query: id_cliente, oper: "=", rp: "1"
        }, { headers: headersIxc });
        const cliente = ((_b = (_a = respCliente.data) === null || _a === void 0 ? void 0 : _a.registros) === null || _b === void 0 ? void 0 : _b[0]) || {};
        let nomeCliente = cliente.razao || 'Cliente não encontrado';
        const respContrato = yield axios_1.default.post(`${process.env.IXC_API_URL}/webservice/v1/cliente_contrato`, {
            qtype: "cliente_contrato.id_cliente", query: id_cliente, oper: "=", rp: "50"
        }, { headers: headersIxc });
        const registrosValidos = (((_c = respContrato.data) === null || _c === void 0 ? void 0 : _c.registros) || []).filter((c) => !['D', 'C', 'CM', 'CA'].includes(c.status_internet));
        const contratos = registrosValidos.map((c) => {
            let enderecoStr = '';
            if (c.endereco) {
                enderecoStr = [c.endereco, c.numero, c.bairro].filter(Boolean).join(', ');
            }
            else if (c.endereco_padrao_cliente === 'S' || !c.endereco) {
                enderecoStr = [cliente.endereco, cliente.numero, cliente.bairro].filter(Boolean).join(', ');
            }
            if (!enderecoStr || enderecoStr.trim() === '')
                enderecoStr = 'Endereço não especificado';
            return {
                id_contrato: c.id, status: c.status_internet, endereco: enderecoStr,
                plano: c.contrato || 'Plano Genérico',
                data_ativacao: c.data_ativacao ? c.data_ativacao.split('-').reverse().join('/') : 'N/A'
            };
        });
        res.json({ nome: nomeCliente, contratos });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/acao-desmembrar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { alertas_ids } = req.body;
    if (!alertas_ids || !alertas_ids.length)
        return res.status(400).json({ error: 'Nenhum alerta fornecido.' });
    try {
        const placeholders = alertas_ids.map(() => '?').join(',');
        const alertasInfo = yield queryAsync(`SELECT host_zabbix, data_falha FROM mon_alertas WHERE id IN (${placeholders}) LIMIT 1`, alertas_ids);
        if (!alertasInfo.length)
            return res.status(404).json({ error: 'Alertas não encontrados.' });
        const host = alertasInfo[0].host_zabbix;
        const dataInicio = alertasInfo[0].data_falha;
        const resCriar = yield queryAsync(`INSERT INTO mon_incidentes (regiao_afetada, data_inicio, status) VALUES (?, ?, 'Ativo')`, [host, dataInicio]);
        const novoIncidenteId = resCriar.insertId;
        yield queryAsync(`UPDATE mon_alertas SET id_incidente = ? WHERE id IN (${placeholders})`, [novoIncidenteId, ...alertas_ids]);
        res.json({ success: true, message: 'Nova massiva criada com sucesso.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/acao-unificar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { incidentes_ids } = req.body;
    if (!incidentes_ids || incidentes_ids.length < 2)
        return res.status(400).json({ error: 'Selecione pelo menos 2 massivas.' });
    try {
        const placeholders = incidentes_ids.map(() => '?').join(',');
        const incidentes = yield queryAsync(`SELECT id FROM mon_incidentes WHERE id IN (${placeholders}) ORDER BY data_inicio ASC`, incidentes_ids);
        if (!incidentes.length)
            return res.status(404).json({ error: 'Incidentes não encontrados.' });
        const masterId = incidentes[0].id;
        const idsParaMesclar = incidentes.slice(1).map((i) => i.id);
        const placeholdersMesclar = idsParaMesclar.map(() => '?').join(',');
        if (idsParaMesclar.length > 0) {
            yield queryAsync(`UPDATE mon_alertas SET id_incidente = ? WHERE id_incidente IN (${placeholdersMesclar})`, [masterId, ...idsParaMesclar]);
            yield queryAsync(`UPDATE mon_incidentes SET status = 'Resolvido', data_fim = NOW() WHERE id IN (${placeholdersMesclar})`, idsParaMesclar);
        }
        res.json({ success: true, message: 'Massivas unificadas com sucesso.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
router.post('/acao-lote', (req, res) => {
    const { ids, acao } = req.body;
    if (!ids || !ids.length)
        return res.status(400).json({ error: 'Nenhum ID fornecido.' });
    if (!['UP', 'DOWN', 'IGNORADO'].includes(acao))
        return res.status(400).json({ error: 'Ação inválida.' });
    const statusDb = acao;
    const placeholders = ids.map(() => '?').join(',');
    const setRetorno = acao === 'UP' ? 'NOW()' : 'NULL';
    const UPDATE_ALERTAS = `UPDATE mon_alertas SET status = ?, data_retorno = ${setRetorno} WHERE id IN (${placeholders})`;
    database_1.LOCALHOST.query(UPDATE_ALERTAS, [statusDb, ...ids], (errUpd) => {
        if (errUpd)
            return res.status(500).json({ error: errUpd.message });
        const BUSCAR_PAIS = `SELECT DISTINCT id_incidente FROM mon_alertas WHERE id IN (${placeholders}) AND id_incidente IS NOT NULL`;
        database_1.LOCALHOST.query(BUSCAR_PAIS, [...ids], (errPais, resPais) => {
            if (errPais || !resPais.length)
                return res.json({ success: true });
            resPais.forEach(pai => {
                const CHECK_RESTANTES = `SELECT id FROM mon_alertas WHERE id_incidente = ? AND status = 'DOWN' LIMIT 1`;
                database_1.LOCALHOST.query(CHECK_RESTANTES, [pai.id_incidente], (errCheck, resCheck) => {
                    if (resCheck && resCheck.length === 0) {
                        const FECHAR_INCIDENTE = `UPDATE mon_incidentes SET status = 'Resolvido', data_fim = NOW() WHERE id = ?`;
                        database_1.LOCALHOST.query(FECHAR_INCIDENTE, [pai.id_incidente], () => { });
                    }
                    else if (acao === 'DOWN') {
                        const REABRIR_INCIDENTE = `UPDATE mon_incidentes SET status = 'Ativo', data_fim = NULL WHERE id = ?`;
                        database_1.LOCALHOST.query(REABRIR_INCIDENTE, [pai.id_incidente], () => { });
                    }
                });
            });
            res.json({ success: true, message: `Status alterado para ${acao}.` });
        });
    });
});
exports.default = router;
