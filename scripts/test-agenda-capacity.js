require('dotenv').config({ quiet: true });
const assert = require('assert');
const { AgendaService } = require('../routes/api/v5/agendaService');
const {
    AgendaCapacityConflictError,
    reserveAgendaCapacity,
    resolveAgendaCapacityBucket
} = require('../src/services/agendaCapacityReservationService');

const TEST_DATE = '2099-12-28';
const TEST_OS_IDS = ['910000001', '910000002'];
let testDataCreated = false;

function reservationInput(ixcOsId) {
    return {
        dataAgendamento: TEST_DATE,
        turno: 'MATUTINO',
        tipoServico: 'INSTALACAO',
        tipoImovel: 'CASA',
        municipio: 'SERRA',
        ixcOsId,
        clienteId: ixcOsId,
        contratoId: ixcOsId,
        aceitaEncaixe: false,
        usuario: 'TESTE_CONCORRENCIA_AGENDA',
        preferenciaHorarioTipo: 'SEM_PREFERENCIA'
    };
}

async function cleanup() {
    if (!testDataCreated) return;
    await AgendaService.executeDb(
        `DELETE FROM ivp_agenda_os
         WHERE data_agendamento = ? AND ixc_os_id IN (?, ?) AND criado_por = 'TESTE_CONCORRENCIA_AGENDA'`,
        [TEST_DATE, ...TEST_OS_IDS]
    );
    await AgendaService.executeDb(
        `DELETE FROM ivp_agenda_capacidade WHERE data = ?`,
        [TEST_DATE]
    );
    testDataCreated = false;
}

async function main() {
    const existingCapacity = await AgendaService.executeDb(
        'SELECT data FROM ivp_agenda_capacidade WHERE data = ?',
        [TEST_DATE]
    );
    const existingAgenda = await AgendaService.executeDb(
        'SELECT id FROM ivp_agenda_os WHERE data_agendamento = ?',
        [TEST_DATE]
    );
    if (existingCapacity.length || existingAgenda.length) {
        throw new Error(`A data reservada para o teste ${TEST_DATE} ja possui dados. Nenhum registro foi alterado.`);
    }

    const installationBucket = resolveAgendaCapacityBucket(reservationInput(TEST_OS_IDS[0]));
    assert.deepStrictEqual(installationBucket.capacityColumns, ['inst_casa_serra_m']);
    assert.ok(installationBucket.key.includes('INSTALACAO|SERRA|CASA'));

    const collectionBucket = resolveAgendaCapacityBucket({
        ...reservationInput(TEST_OS_IDS[0]),
        tipoServico: 'RECOLHIMENTO',
        turno: 'VESPERTINO'
    });
    assert.deepStrictEqual(collectionBucket.capacityColumns, ['recolhimento_serra_t', 'recolhimento_outros_t']);

    await AgendaService.executeDb(
        `INSERT INTO ivp_agenda_capacidade
         (data, inst_casa_serra_m, inst_casa_serra_t, inst_predio_serra_m, inst_predio_serra_t,
          inst_casa_outros_m, inst_casa_outros_t, inst_predio_outros_m, inst_predio_outros_t)
         VALUES (?, 1, 0, 0, 0, 0, 0, 0, 0)`,
        [TEST_DATE]
    );
    testDataCreated = true;

    const results = await Promise.allSettled(TEST_OS_IDS.map(id => reserveAgendaCapacity(reservationInput(id))));
    const successes = results.filter(item => item.status === 'fulfilled');
    const conflicts = results.filter(item => item.status === 'rejected'
        && item.reason instanceof AgendaCapacityConflictError);
    assert.strictEqual(successes.length, 1, 'apenas um atendente deve conquistar a ultima vaga');
    assert.strictEqual(conflicts.length, 1, 'o segundo atendente deve receber conflito de capacidade');

    const saved = await AgendaService.executeDb(
        `SELECT id, ixc_os_id, status_interno FROM ivp_agenda_os
         WHERE data_agendamento = ? AND criado_por = 'TESTE_CONCORRENCIA_AGENDA'`,
        [TEST_DATE]
    );
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].status_interno, 'RESERVANDO_IXC');

    console.log('OK: concorrencia da agenda validada; 1 sucesso e 1 conflito para uma unica vaga.');
}

main()
    .then(async () => {
        await cleanup();
        process.exit(0);
    })
    .catch(async error => {
        try { await cleanup(); } catch (_) {}
        console.error(error);
        process.exit(1);
    });
