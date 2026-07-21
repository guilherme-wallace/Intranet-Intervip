const assert = require('assert');
const { normalizeIxcPendingOnuRow } = require('../src/services/ixcPendingOnuService');

const novoFormato = normalizeIxcPendingOnuRow({
    id: 'hash-novo',
    cell: [
        'SEA05-OLT-01-NOVOHORIZONTE',
        '11',
        '0',
        '1',
        '13',
        'HWTC-310M',
        '485754435F6E171F'
    ]
});

assert.deepStrictEqual(novoFormato, {
    id_hash: 'hash-novo',
    olt_name: 'SEA05-OLT-01-NOVOHORIZONTE',
    frame: '11',
    slot: '0',
    pon: '1',
    model: 'HWTC-310M',
    mac: '485754435F6E171F'
});

const formatoAnterior = normalizeIxcPendingOnuRow({
    id: 'hash-antigo',
    cell: ['OLT-ANTIGA', '0', '1', '2', 'ONU-ANTIGA', 'SERIALANTIGO123']
});
assert.strictEqual(formatoAnterior.model, 'ONU-ANTIGA');
assert.strictEqual(formatoAnterior.mac, 'SERIALANTIGO123');

const formatoNormalizado = normalizeIxcPendingOnuRow({
    id_hash: 'hash-normalizado',
    olt_name: 'OLT-NORMALIZADA',
    frame: '1',
    slot: '2',
    pon: '3',
    model: 'MODELO-NORMALIZADO',
    mac: 'SERIALNORMALIZADO'
});
assert.strictEqual(formatoNormalizado.id_hash, 'hash-normalizado');
assert.strictEqual(formatoNormalizado.model, 'MODELO-NORMALIZADO');
assert.strictEqual(formatoNormalizado.mac, 'SERIALNORMALIZADO');

console.log('OK: formatos novo, anterior e normalizado de ONU pendente validados.');
