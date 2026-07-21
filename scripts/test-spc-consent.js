const assert = require('assert');
const { clienteConcordouComConsultaCredito } = require('../src/services/spcService');

assert.strictEqual(clienteConcordouComConsultaCredito(true), true);
assert.strictEqual(clienteConcordouComConsultaCredito('true'), true);
assert.strictEqual(clienteConcordouComConsultaCredito(1), true);
assert.strictEqual(clienteConcordouComConsultaCredito('1'), true);
assert.strictEqual(clienteConcordouComConsultaCredito(false), false);
assert.strictEqual(clienteConcordouComConsultaCredito('SIM'), false);
assert.strictEqual(clienteConcordouComConsultaCredito(undefined), false);

console.log('OK: concordancia previa obrigatoria para consulta SPC validada (7 cenarios).');
