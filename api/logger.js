"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = exports.logWarn = exports.logError = exports.createRequestId = void 0;
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const PAINEL_LOG = path.join(LOG_DIR, 'painel-logistica-error.log');
const DEBUG_LOG = path.join(LOG_DIR, 'debug.log');
const SENSITIVE_KEYS = /token|authorization|password|senha|secret|cookie|cnpj|cpf|documento/i;
function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}
function timestampSaoPaulo() {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date()).replace('T', ' ');
}
function maskDocumentos(valor) {
    return valor.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***CPF***')
        .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '***CNPJ***')
        .replace(/\b\d{11,14}\b/g, (match) => `${match.slice(0, 3)}***${match.slice(-2)}`);
}
function maskSensitiveString(valor) {
    return maskDocumentos(valor)
        .replace(/\b(Basic|Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [REDACTED]')
        .replace(/(authorization\s*[:=]\s*)([^\s,;"']+)/gi, '$1[REDACTED]')
        .replace(/((?:token|password|senha|secret)\s*[:=]\s*)([^\s,;"']+)/gi, '$1[REDACTED]');
}
function sanitize(value, seen = new WeakSet()) {
    if (value === null || typeof value === 'undefined')
        return value;
    if (typeof value === 'string')
        return maskSensitiveString(value);
    if (typeof value === 'number' || typeof value === 'boolean')
        return value;
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value !== 'object')
        return String(value);
    if (seen.has(value))
        return '[Circular]';
    seen.add(value);
    if (Array.isArray(value))
        return value.map(item => sanitize(item, seen));
    const sanitized = {};
    Object.keys(value).forEach((key) => {
        if (SENSITIVE_KEYS.test(key)) {
            sanitized[key] = '[REDACTED]';
            return;
        }
        sanitized[key] = sanitize(value[key], seen);
    });
    return sanitized;
}
function safeJson(value) {
    try {
        return JSON.stringify(sanitize(value));
    }
    catch (error) {
        return String((error === null || error === void 0 ? void 0 : error.message) || value);
    }
}
function errorMessage(error) {
    if (!error)
        return 'Erro desconhecido';
    const code = error.code || error.errno || error.sqlState;
    const message = error.sqlMessage || error.message || String(error);
    return maskSensitiveString(code ? `${code}: ${message}` : message);
}
function writeLine(filePath, line) {
    try {
        ensureLogDir();
        fs.appendFileSync(filePath, `${line}\n`, 'utf8');
    }
    catch (error) {
        console.error('[Logger] Falha ao escrever arquivo de log:', error);
    }
}
function shouldWritePainel(contexto) {
    return /painel.?logistica|agendaservice\.obteragendamentos/i.test(contexto);
}
function createRequestId() {
    if (typeof crypto.randomUUID === 'function')
        return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
exports.createRequestId = createRequestId;
function logError(contexto, error, meta) {
    const detalhes = [
        `[${timestampSaoPaulo()}] [ERROR] [${contexto}] ${errorMessage(error)}`,
        meta ? `meta=${safeJson(meta)}` : '',
        (error === null || error === void 0 ? void 0 : error.stack) ? `stack=${maskSensitiveString(String(error.stack))}` : '',
        (error === null || error === void 0 ? void 0 : error.code) ? `code=${error.code}` : '',
        (error === null || error === void 0 ? void 0 : error.errno) ? `errno=${error.errno}` : '',
        (error === null || error === void 0 ? void 0 : error.sqlState) ? `sqlState=${error.sqlState}` : '',
        (error === null || error === void 0 ? void 0 : error.sqlMessage) ? `sqlMessage=${maskSensitiveString(String(error.sqlMessage))}` : '',
        (error === null || error === void 0 ? void 0 : error.sql) ? `sql=${maskSensitiveString(String(error.sql))}` : ''
    ].filter(Boolean).join(' ');
    writeLine(ERROR_LOG, detalhes);
    if (shouldWritePainel(contexto)) {
        writeLine(PAINEL_LOG, detalhes);
    }
}
exports.logError = logError;
function logWarn(contexto, mensagem, meta) {
    const line = `[${timestampSaoPaulo()}] [WARN] [${contexto}] ${maskSensitiveString(String(mensagem))}${meta ? ` meta=${safeJson(meta)}` : ''}`;
    writeLine(DEBUG_LOG, line);
    if (shouldWritePainel(contexto))
        writeLine(PAINEL_LOG, line);
}
exports.logWarn = logWarn;
function logInfo(contexto, mensagem, meta) {
    const line = `[${timestampSaoPaulo()}] [INFO] [${contexto}] ${maskSensitiveString(String(mensagem))}${meta ? ` meta=${safeJson(meta)}` : ''}`;
    writeLine(DEBUG_LOG, line);
}
exports.logInfo = logInfo;
