const assert = require('assert');
const {
    gerarProtocoloAtendimentoIxc,
    IxcAttendanceProtocolError
} = require('../src/services/ixcAttendanceProtocolService');

async function main() {
    const calls = [];
    const protocolo = await gerarProtocoloAtendimentoIxc(async (...args) => {
        calls.push(args);
        return {
            type: 'success',
            message: 'Acao executada com sucesso',
            protocolo: '202607581197'
        };
    }, { requestId: 'teste-protocolo' });

    assert.strictEqual(protocolo, '202607581197');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0][0], 'POST');
    assert.strictEqual(calls[0][1], '/gerar_protocolo_atendimento');
    assert.deepStrictEqual(calls[0][2], {});
    assert.strictEqual(calls[0][3], null);
    assert.strictEqual(calls[0][4].disableRetry, true);

    assert.strictEqual(
        await gerarProtocoloAtendimentoIxc(async () => 202607581218),
        '202607581218',
        'aceita protocolo retornado como numero JSON simples'
    );
    assert.strictEqual(
        await gerarProtocoloAtendimentoIxc(async () => '202607581219'),
        '202607581219',
        'aceita protocolo retornado como texto simples'
    );

    await assert.rejects(
        () => gerarProtocoloAtendimentoIxc(async () => ({ type: 'success' })),
        error => error instanceof IxcAttendanceProtocolError
            && error.code === 'IXC_ATTENDANCE_PROTOCOL_ERROR'
    );
    await assert.rejects(
        () => gerarProtocoloAtendimentoIxc(async () => ({ type: 'error', message: 'Falha IXC' })),
        error => error instanceof IxcAttendanceProtocolError
            && error.message === 'Falha IXC'
    );
    await assert.rejects(
        () => gerarProtocoloAtendimentoIxc(async () => { throw new Error('Timeout'); }),
        error => error instanceof IxcAttendanceProtocolError
            && error.code === 'IXC_ATTENDANCE_PROTOCOL_ERROR'
            && error.message.includes('Timeout')
    );

    console.log('OK: geracao obrigatoria de protocolo IXC validada (6 cenarios).');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
