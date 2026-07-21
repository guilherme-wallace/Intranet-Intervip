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
exports.gerarProtocoloAtendimentoIxc = exports.IxcAttendanceProtocolError = void 0;
class IxcAttendanceProtocolError extends Error {
    constructor(message) {
        super(message);
        this.code = 'IXC_ATTENDANCE_PROTOCOL_ERROR';
        this.name = 'IxcAttendanceProtocolError';
    }
}
exports.IxcAttendanceProtocolError = IxcAttendanceProtocolError;
function gerarProtocoloAtendimentoIxc(requestIxc, context = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        // Endpoint de acao informado pelo suporte IXC. Ele gera o numero antes da
        // inclusao do su_ticket; o protocolo retornado deve ser enviado no ticket.
        let response;
        try {
            response = yield requestIxc('POST', '/gerar_protocolo_atendimento', {}, null, Object.assign(Object.assign({}, context), { disableRetry: true }));
        }
        catch (error) {
            throw new IxcAttendanceProtocolError(`Nao foi possivel gerar o protocolo do atendimento no IXC: ${String((error === null || error === void 0 ? void 0 : error.message) || 'falha de comunicacao')}`);
        }
        const scalarResponse = typeof response === 'string' || typeof response === 'number'
            ? String(response).trim()
            : '';
        const responseType = String((response === null || response === void 0 ? void 0 : response.type) || (response === null || response === void 0 ? void 0 : response.tipo) || '').trim().toLowerCase();
        if ((response === null || response === void 0 ? void 0 : response.success) === false || responseType === 'error' || responseType === 'erro') {
            throw new IxcAttendanceProtocolError(String((response === null || response === void 0 ? void 0 : response.message) || (response === null || response === void 0 ? void 0 : response.mensagem) || 'O IXC recusou a geracao do protocolo do atendimento.'));
        }
        const protocolo = String(scalarResponse
            || (response === null || response === void 0 ? void 0 : response.protocolo)
            || (response === null || response === void 0 ? void 0 : response.numero_protocolo)
            || (response === null || response === void 0 ? void 0 : response.protocolo_atendimento)
            || '').trim();
        if (!protocolo) {
            throw new IxcAttendanceProtocolError('O IXC nao retornou o protocolo do atendimento. O atendimento nao foi criado.');
        }
        return protocolo;
    });
}
exports.gerarProtocoloAtendimentoIxc = gerarProtocoloAtendimentoIxc;
