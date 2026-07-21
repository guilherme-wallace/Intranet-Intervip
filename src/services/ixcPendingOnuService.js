"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeIxcPendingOnuRow = void 0;
function text(value) {
    return value === null || typeof value === 'undefined' ? '' : String(value).trim();
}
/**
 * O IXC passou a retornar sete colunas em fh_onu_nao_autorizadas:
 * OLT, frame, slot, pon, identificador interno, modelo e serial/MAC.
 * O formato anterior possuia seis colunas e nao tinha o identificador interno.
 */
function normalizeIxcPendingOnuRow(row) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const cells = Array.isArray(row === null || row === void 0 ? void 0 : row.cell) ? row.cell : [];
    const novoFormato = cells.length >= 7;
    return {
        id_hash: text((_a = row === null || row === void 0 ? void 0 : row.id) !== null && _a !== void 0 ? _a : row === null || row === void 0 ? void 0 : row.id_hash),
        olt_name: text((_c = (_b = cells[0]) !== null && _b !== void 0 ? _b : row === null || row === void 0 ? void 0 : row.olt_name) !== null && _c !== void 0 ? _c : row === null || row === void 0 ? void 0 : row.olt_info),
        frame: text((_d = cells[1]) !== null && _d !== void 0 ? _d : row === null || row === void 0 ? void 0 : row.frame),
        slot: text((_e = cells[2]) !== null && _e !== void 0 ? _e : row === null || row === void 0 ? void 0 : row.slot),
        pon: text((_f = cells[3]) !== null && _f !== void 0 ? _f : row === null || row === void 0 ? void 0 : row.pon),
        model: text((_h = (_g = (novoFormato ? cells[5] : cells[4])) !== null && _g !== void 0 ? _g : row === null || row === void 0 ? void 0 : row.model) !== null && _h !== void 0 ? _h : row === null || row === void 0 ? void 0 : row.modelo),
        mac: text((_k = (_j = (novoFormato ? cells[6] : cells[5])) !== null && _j !== void 0 ? _j : row === null || row === void 0 ? void 0 : row.mac) !== null && _k !== void 0 ? _k : row === null || row === void 0 ? void 0 : row.serial)
    };
}
exports.normalizeIxcPendingOnuRow = normalizeIxcPendingOnuRow;
