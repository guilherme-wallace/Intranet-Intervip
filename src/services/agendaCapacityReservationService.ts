import { LOCALHOST } from '../../api/database';

export type AgendaTurno = 'MATUTINO' | 'VESPERTINO';
export type AgendaTipoServico = 'SUPORTE' | 'INSTALACAO' | 'RECOLHIMENTO';

export interface AgendaCapacityBucket {
    key: string;
    capacityColumns: string[];
    occupancyWhere: string;
    occupancyParams: any[];
    tipoImovelDb: 'CASA' | 'PREDIO';
}

export interface AgendaReservationInput {
    dataAgendamento: string;
    turno: AgendaTurno;
    tipoServico: AgendaTipoServico;
    tipoImovel: any;
    municipio: any;
    ixcOsId: string;
    clienteId: string;
    contratoId: string;
    aceitaEncaixe: boolean;
    usuario: string;
    existingAgendaId?: number | null;
    preferenciaHorarioTipo: string;
    preferenciaHorarioInicio?: string | null;
    preferenciaHorarioFim?: string | null;
    preferenciaHorarioObs?: string | null;
}

export interface AgendaReservationSnapshot {
    data_agendamento: any;
    turno: any;
    tipo_servico: any;
    tipo_imovel: any;
    municipio_base: any;
    aceita_encaixe: any;
    solicita_prioridade: any;
    ixc_tecnico_id: any;
    status_interno: any;
    preferencia_horario_tipo: any;
    preferencia_horario_inicio: any;
    preferencia_horario_fim: any;
    preferencia_horario_obs: any;
}

export interface AgendaReservationResult {
    idAgendaLocal: number;
    created: boolean;
    previousSnapshot: AgendaReservationSnapshot | null;
    capacity: number;
    occupiedBefore: number;
    bucketKey: string;
}

export class AgendaCapacityConflictError extends Error {
    public readonly code = 'AGENDA_SEM_VAGA';
    public readonly statusCode = 409;
    public readonly bucketKey: string;

    constructor(bucketKey: string) {
        super('A ultima vaga deste horario foi ocupada por outro atendente. Selecione outra data ou turno.');
        this.name = 'AgendaCapacityConflictError';
        this.bucketKey = bucketKey;
        Object.setPrototypeOf(this, AgendaCapacityConflictError.prototype);
    }
}

function normalizeText(value: any): string {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

export function resolveAgendaCapacityBucket(input: {
    dataAgendamento: string;
    turno: AgendaTurno;
    tipoServico: AgendaTipoServico;
    tipoImovel: any;
    municipio: any;
}): AgendaCapacityBucket {
    const suffix = input.turno === 'MATUTINO' ? 'm' : 't';
    const predio = normalizeText(input.tipoImovel).includes('PREDIO');
    const serra = normalizeText(input.municipio).includes('SERRA');
    const tipoImovelDb: 'CASA' | 'PREDIO' = predio ? 'PREDIO' : 'CASA';

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

function getConnection(): Promise<any> {
    return new Promise((resolve, reject) => {
        LOCALHOST.getConnection((error: any, connection: any) => {
            if (error) return reject(error);
            resolve(connection);
        });
    });
}

function connectionQuery(connection: any, sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error: any, result: any) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
}

function beginTransaction(connection: any): Promise<void> {
    return new Promise((resolve, reject) => connection.beginTransaction((error: any) => error ? reject(error) : resolve()));
}

function commit(connection: any): Promise<void> {
    return new Promise((resolve, reject) => connection.commit((error: any) => error ? reject(error) : resolve()));
}

function rollback(connection: any): Promise<void> {
    return new Promise(resolve => connection.rollback(() => resolve()));
}

export async function reserveAgendaCapacity(input: AgendaReservationInput): Promise<AgendaReservationResult> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dataAgendamento)) {
        throw new Error('Data invalida para reservar capacidade da agenda.');
    }
    const bucket = resolveAgendaCapacityBucket(input);
    const connection = await getConnection();
    try {
        await beginTransaction(connection);
        const columnsSql = bucket.capacityColumns.map(column => `\`${column}\``).join(', ');
        const capacityRows = await connectionQuery(
            connection,
            `SELECT ${columnsSql} FROM ivp_agenda_capacidade WHERE data = ? FOR UPDATE`,
            [input.dataAgendamento]
        );
        if (!capacityRows?.[0]) throw new Error('Capacidade da data nao encontrada para confirmar o agendamento.');
        const capacity = bucket.capacityColumns.reduce(
            (total, column) => total + Number(capacityRows[0]?.[column] || 0),
            0
        );

        const countParams: any[] = [input.dataAgendamento, input.turno, ...bucket.occupancyParams];
        let excludeCurrentSql = '';
        if (input.existingAgendaId) {
            excludeCurrentSql = ' AND id != ?';
            countParams.push(Number(input.existingAgendaId));
        }
        const countRows = await connectionQuery(
            connection,
            `SELECT COUNT(*) AS total
             FROM ivp_agenda_os
             WHERE data_agendamento = ? AND turno = ?
               AND ${bucket.occupancyWhere}
               AND (status_interno IS NULL OR status_interno NOT IN ('CANCELADO', 'VISITA_CANCELADA', 'FALHA_IXC'))
               ${excludeCurrentSql}`,
            countParams
        );
        const occupiedBefore = Number(countRows?.[0]?.total || 0);
        if (capacity <= 0 || occupiedBefore >= capacity) {
            throw new AgendaCapacityConflictError(bucket.key);
        }

        let previousSnapshot: AgendaReservationSnapshot | null = null;
        let idAgendaLocal = Number(input.existingAgendaId || 0);
        let created = false;
        if (idAgendaLocal) {
            const currentRows = await connectionQuery(
                connection,
                `SELECT data_agendamento, turno, tipo_servico, tipo_imovel, municipio_base,
                        aceita_encaixe, solicita_prioridade, ixc_tecnico_id, status_interno,
                        preferencia_horario_tipo, preferencia_horario_inicio,
                        preferencia_horario_fim, preferencia_horario_obs
                 FROM ivp_agenda_os WHERE id = ? FOR UPDATE`,
                [idAgendaLocal]
            );
            if (!currentRows?.[0]) throw new Error('Agendamento local existente nao foi encontrado para reservar a nova vaga.');
            previousSnapshot = currentRows[0];
            await connectionQuery(
                connection,
                `UPDATE ivp_agenda_os
                 SET data_agendamento = ?, turno = ?, tipo_servico = ?, tipo_imovel = ?, municipio_base = ?,
                     aceita_encaixe = ?, solicita_prioridade = 0, ixc_tecnico_id = 138,
                     status_interno = 'RESERVANDO_IXC', preferencia_horario_tipo = ?,
                     preferencia_horario_inicio = ?, preferencia_horario_fim = ?, preferencia_horario_obs = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    input.dataAgendamento, input.turno, input.tipoServico, bucket.tipoImovelDb,
                    String(input.municipio || ''), input.aceitaEncaixe ? 1 : 0,
                    input.preferenciaHorarioTipo, input.preferenciaHorarioInicio || null,
                    input.preferenciaHorarioFim || null, input.preferenciaHorarioObs || null,
                    idAgendaLocal
                ]
            );
        } else {
            const insertResult = await connectionQuery(
                connection,
                `INSERT INTO ivp_agenda_os
                 (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel,
                  municipio_base, aceita_encaixe, solicita_prioridade, data_agendamento, turno,
                  ixc_tecnico_id, status_interno, criado_por, preferencia_horario_tipo,
                  preferencia_horario_inicio, preferencia_horario_fim, preferencia_horario_obs)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 138, 'RESERVANDO_IXC', ?, ?, ?, ?, ?)`,
                [
                    input.ixcOsId, input.clienteId, input.contratoId, input.tipoServico,
                    bucket.tipoImovelDb, String(input.municipio || ''), input.aceitaEncaixe ? 1 : 0,
                    input.dataAgendamento, input.turno, input.usuario || 'ATENDIMENTO',
                    input.preferenciaHorarioTipo, input.preferenciaHorarioInicio || null,
                    input.preferenciaHorarioFim || null, input.preferenciaHorarioObs || null
                ]
            );
            idAgendaLocal = Number(insertResult.insertId);
            created = true;
        }

        await commit(connection);
        return { idAgendaLocal, created, previousSnapshot, capacity, occupiedBefore, bucketKey: bucket.key };
    } catch (error) {
        await rollback(connection);
        throw error;
    } finally {
        connection.release();
    }
}

function poolQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        LOCALHOST.query(sql, params, (error: any, result: any) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
}

export async function confirmAgendaReservation(idAgendaLocal: number): Promise<void> {
    const result = await poolQuery(
        `UPDATE ivp_agenda_os
         SET status_interno = 'AGUARDANDO_LOGISTICA', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status_interno = 'RESERVANDO_IXC'`,
        [idAgendaLocal]
    );
    if (Number(result?.affectedRows || 0) !== 1) {
        throw new Error('Nao foi possivel confirmar localmente a reserva da vaga depois do retorno do IXC.');
    }
}

export async function rollbackOrHoldAgendaReservation(
    reservation: AgendaReservationResult,
    uncertainIxcResult: boolean
): Promise<void> {
    if (uncertainIxcResult) {
        await poolQuery(
            `UPDATE ivp_agenda_os
             SET status_interno = 'PENDENTE_CONCILIACAO_IXC', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status_interno = 'RESERVANDO_IXC'`,
            [reservation.idAgendaLocal]
        );
        return;
    }

    if (reservation.created) {
        await poolQuery(
            `DELETE FROM ivp_agenda_os WHERE id = ? AND status_interno = 'RESERVANDO_IXC'`,
            [reservation.idAgendaLocal]
        );
        return;
    }

    const previous = reservation.previousSnapshot;
    if (!previous) throw new Error('Snapshot anterior ausente para restaurar o reagendamento.');
    await poolQuery(
        `UPDATE ivp_agenda_os
         SET data_agendamento = ?, turno = ?, tipo_servico = ?, tipo_imovel = ?, municipio_base = ?,
             aceita_encaixe = ?, solicita_prioridade = ?, ixc_tecnico_id = ?, status_interno = ?,
             preferencia_horario_tipo = ?, preferencia_horario_inicio = ?,
             preferencia_horario_fim = ?, preferencia_horario_obs = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status_interno = 'RESERVANDO_IXC'`,
        [
            previous.data_agendamento, previous.turno, previous.tipo_servico, previous.tipo_imovel,
            previous.municipio_base, previous.aceita_encaixe, previous.solicita_prioridade,
            previous.ixc_tecnico_id, previous.status_interno, previous.preferencia_horario_tipo,
            previous.preferencia_horario_inicio, previous.preferencia_horario_fim,
            previous.preferencia_horario_obs, reservation.idAgendaLocal
        ]
    );
}
