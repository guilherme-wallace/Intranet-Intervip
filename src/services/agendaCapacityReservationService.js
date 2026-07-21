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
exports.rollbackOrHoldAgendaReservation = exports.confirmAgendaReservation = exports.reserveAgendaCapacity = exports.resolveAgendaCapacityBucket = exports.AgendaCapacityConflictError = void 0;
const database_1 = require("../../api/database");
class AgendaCapacityConflictError extends Error {
    constructor(bucketKey) {
        super('A ultima vaga deste horario foi ocupada por outro atendente. Selecione outra data ou turno.');
        this.code = 'AGENDA_SEM_VAGA';
        this.statusCode = 409;
        this.name = 'AgendaCapacityConflictError';
        this.bucketKey = bucketKey;
        Object.setPrototypeOf(this, AgendaCapacityConflictError.prototype);
    }
}
exports.AgendaCapacityConflictError = AgendaCapacityConflictError;
function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}
function resolveAgendaCapacityBucket(input) {
    const suffix = input.turno === 'MATUTINO' ? 'm' : 't';
    const predio = normalizeText(input.tipoImovel).includes('PREDIO');
    const serra = normalizeText(input.municipio).includes('SERRA');
    const tipoImovelDb = predio ? 'PREDIO' : 'CASA';
    if (input.tipoServico === 'RECOLHIMENTO') {
        return {
            key: `${input.dataAgendamento}|${input.turno}|RECOLHIMENTO|TODOS`,
            capacityColumns: [`recolhimento_serra_${suffix}`, `recolhimento_outros_${suffix}`],
            occupancyWhere: `tipo_servico = 'RECOLHIMENTO'`,
            occupancyParams: [],
            tipoImovelDb
        };
    }
    if (input.tipoServico === 'INSTALACAO') {
        const location = serra ? 'serra' : 'outros';
        const property = predio ? 'predio' : 'casa';
        return {
            key: `${input.dataAgendamento}|${input.turno}|INSTALACAO|${location.toUpperCase()}|${property.toUpperCase()}`,
            capacityColumns: [`inst_${property}_${location}_${suffix}`],
            occupancyWhere: `tipo_servico = 'INSTALACAO'
                AND ${serra ? "UPPER(COALESCE(municipio_base, '')) LIKE '%SERRA%'" : "UPPER(COALESCE(municipio_base, '')) NOT LIKE '%SERRA%'"}
                AND ${predio ? "UPPER(COALESCE(tipo_imovel, '')) = 'PREDIO'" : "UPPER(COALESCE(tipo_imovel, '')) != 'PREDIO'"}`,
            occupancyParams: [],
            tipoImovelDb
        };
    }
    if (!predio) {
        return {
            key: `${input.dataAgendamento}|${input.turno}|SUPORTE|CASA`,
            capacityColumns: [`casa_${suffix}`],
            occupancyWhere: `tipo_servico = 'SUPORTE' AND UPPER(COALESCE(tipo_imovel, '')) != 'PREDIO'`,
            occupancyParams: [],
            tipoImovelDb
        };
    }
    return {
        key: `${input.dataAgendamento}|${input.turno}|SUPORTE|PREDIO|${serra ? 'SERRA' : 'OUTROS'}`,
        capacityColumns: [`predio_${serra ? 'serra' : 'outros'}_${suffix}`],
        occupancyWhere: `tipo_servico = 'SUPORTE'
            AND UPPER(COALESCE(tipo_imovel, '')) = 'PREDIO'
            AND ${serra ? "UPPER(COALESCE(municipio_base, '')) LIKE '%SERRA%'" : "UPPER(COALESCE(municipio_base, '')) NOT LIKE '%SERRA%'"}`,
        occupancyParams: [],
        tipoImovelDb
    };
}
exports.resolveAgendaCapacityBucket = resolveAgendaCapacityBucket;
function getConnection() {
    return new Promise((resolve, reject) => {
        database_1.LOCALHOST.getConnection((error, connection) => {
            if (error)
                return reject(error);
            resolve(connection);
        });
    });
}
function connectionQuery(connection, sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, result) => {
            if (error)
                return reject(error);
            resolve(result);
        });
    });
}
function beginTransaction(connection) {
    return new Promise((resolve, reject) => connection.beginTransaction((error) => error ? reject(error) : resolve()));
}
function commit(connection) {
    return new Promise((resolve, reject) => connection.commit((error) => error ? reject(error) : resolve()));
}
function rollback(connection) {
    return new Promise(resolve => connection.rollback(() => resolve()));
}
function reserveAgendaCapacity(input) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dataAgendamento)) {
            throw new Error('Data invalida para reservar capacidade da agenda.');
        }
        const bucket = resolveAgendaCapacityBucket(input);
        const connection = yield getConnection();
        try {
            yield beginTransaction(connection);
            const columnsSql = bucket.capacityColumns.map(column => `\`${column}\``).join(', ');
            const capacityRows = yield connectionQuery(connection, `SELECT ${columnsSql} FROM ivp_agenda_capacidade WHERE data = ? FOR UPDATE`, [input.dataAgendamento]);
            if (!(capacityRows === null || capacityRows === void 0 ? void 0 : capacityRows[0]))
                throw new Error('Capacidade da data nao encontrada para confirmar o agendamento.');
            const capacity = bucket.capacityColumns.reduce((total, column) => { var _a; return total + Number(((_a = capacityRows[0]) === null || _a === void 0 ? void 0 : _a[column]) || 0); }, 0);
            const countParams = [input.dataAgendamento, input.turno, ...bucket.occupancyParams];
            let excludeCurrentSql = '';
            if (input.existingAgendaId) {
                excludeCurrentSql = ' AND id != ?';
                countParams.push(Number(input.existingAgendaId));
            }
            const countRows = yield connectionQuery(connection, `SELECT COUNT(*) AS total
             FROM ivp_agenda_os
             WHERE data_agendamento = ? AND turno = ?
               AND ${bucket.occupancyWhere}
               AND (status_interno IS NULL OR status_interno NOT IN ('CANCELADO', 'VISITA_CANCELADA', 'FALHA_IXC'))
               ${excludeCurrentSql}`, countParams);
            const occupiedBefore = Number(((_a = countRows === null || countRows === void 0 ? void 0 : countRows[0]) === null || _a === void 0 ? void 0 : _a.total) || 0);
            if (capacity <= 0 || occupiedBefore >= capacity) {
                throw new AgendaCapacityConflictError(bucket.key);
            }
            let previousSnapshot = null;
            let idAgendaLocal = Number(input.existingAgendaId || 0);
            let created = false;
            if (idAgendaLocal) {
                const currentRows = yield connectionQuery(connection, `SELECT data_agendamento, turno, tipo_servico, tipo_imovel, municipio_base,
                        aceita_encaixe, solicita_prioridade, ixc_tecnico_id, status_interno,
                        preferencia_horario_tipo, preferencia_horario_inicio,
                        preferencia_horario_fim, preferencia_horario_obs
                 FROM ivp_agenda_os WHERE id = ? FOR UPDATE`, [idAgendaLocal]);
                if (!(currentRows === null || currentRows === void 0 ? void 0 : currentRows[0]))
                    throw new Error('Agendamento local existente nao foi encontrado para reservar a nova vaga.');
                previousSnapshot = currentRows[0];
                yield connectionQuery(connection, `UPDATE ivp_agenda_os
                 SET data_agendamento = ?, turno = ?, tipo_servico = ?, tipo_imovel = ?, municipio_base = ?,
                     aceita_encaixe = ?, solicita_prioridade = 0, ixc_tecnico_id = 138,
                     status_interno = 'RESERVANDO_IXC', preferencia_horario_tipo = ?,
                     preferencia_horario_inicio = ?, preferencia_horario_fim = ?, preferencia_horario_obs = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`, [
                    input.dataAgendamento, input.turno, input.tipoServico, bucket.tipoImovelDb,
                    String(input.municipio || ''), input.aceitaEncaixe ? 1 : 0,
                    input.preferenciaHorarioTipo, input.preferenciaHorarioInicio || null,
                    input.preferenciaHorarioFim || null, input.preferenciaHorarioObs || null,
                    idAgendaLocal
                ]);
            }
            else {
                const insertResult = yield connectionQuery(connection, `INSERT INTO ivp_agenda_os
                 (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel,
                  municipio_base, aceita_encaixe, solicita_prioridade, data_agendamento, turno,
                  ixc_tecnico_id, status_interno, criado_por, preferencia_horario_tipo,
                  preferencia_horario_inicio, preferencia_horario_fim, preferencia_horario_obs)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 138, 'RESERVANDO_IXC', ?, ?, ?, ?, ?)`, [
                    input.ixcOsId, input.clienteId, input.contratoId, input.tipoServico,
                    bucket.tipoImovelDb, String(input.municipio || ''), input.aceitaEncaixe ? 1 : 0,
                    input.dataAgendamento, input.turno, input.usuario || 'ATENDIMENTO',
                    input.preferenciaHorarioTipo, input.preferenciaHorarioInicio || null,
                    input.preferenciaHorarioFim || null, input.preferenciaHorarioObs || null
                ]);
                idAgendaLocal = Number(insertResult.insertId);
                created = true;
            }
            yield commit(connection);
            return { idAgendaLocal, created, previousSnapshot, capacity, occupiedBefore, bucketKey: bucket.key };
        }
        catch (error) {
            yield rollback(connection);
            throw error;
        }
        finally {
            connection.release();
        }
    });
}
exports.reserveAgendaCapacity = reserveAgendaCapacity;
function poolQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        database_1.LOCALHOST.query(sql, params, (error, result) => {
            if (error)
                return reject(error);
            resolve(result);
        });
    });
}
function confirmAgendaReservation(idAgendaLocal) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield poolQuery(`UPDATE ivp_agenda_os
         SET status_interno = 'AGUARDANDO_LOGISTICA', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status_interno = 'RESERVANDO_IXC'`, [idAgendaLocal]);
        if (Number((result === null || result === void 0 ? void 0 : result.affectedRows) || 0) !== 1) {
            throw new Error('Nao foi possivel confirmar localmente a reserva da vaga depois do retorno do IXC.');
        }
    });
}
exports.confirmAgendaReservation = confirmAgendaReservation;
function rollbackOrHoldAgendaReservation(reservation, uncertainIxcResult) {
    return __awaiter(this, void 0, void 0, function* () {
        if (uncertainIxcResult) {
            yield poolQuery(`UPDATE ivp_agenda_os
             SET status_interno = 'PENDENTE_CONCILIACAO_IXC', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status_interno = 'RESERVANDO_IXC'`, [reservation.idAgendaLocal]);
            return;
        }
        if (reservation.created) {
            yield poolQuery(`DELETE FROM ivp_agenda_os WHERE id = ? AND status_interno = 'RESERVANDO_IXC'`, [reservation.idAgendaLocal]);
            return;
        }
        const previous = reservation.previousSnapshot;
        if (!previous)
            throw new Error('Snapshot anterior ausente para restaurar o reagendamento.');
        yield poolQuery(`UPDATE ivp_agenda_os
         SET data_agendamento = ?, turno = ?, tipo_servico = ?, tipo_imovel = ?, municipio_base = ?,
             aceita_encaixe = ?, solicita_prioridade = ?, ixc_tecnico_id = ?, status_interno = ?,
             preferencia_horario_tipo = ?, preferencia_horario_inicio = ?,
             preferencia_horario_fim = ?, preferencia_horario_obs = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status_interno = 'RESERVANDO_IXC'`, [
            previous.data_agendamento, previous.turno, previous.tipo_servico, previous.tipo_imovel,
            previous.municipio_base, previous.aceita_encaixe, previous.solicita_prioridade,
            previous.ixc_tecnico_id, previous.status_interno, previous.preferencia_horario_tipo,
            previous.preferencia_horario_inicio, previous.preferencia_horario_fim,
            previous.preferencia_horario_obs, reservation.idAgendaLocal
        ]);
    });
}
exports.rollbackOrHoldAgendaReservation = rollbackOrHoldAgendaReservation;
