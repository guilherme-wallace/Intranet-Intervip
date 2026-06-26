import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

function timestampSaoPaulo(): string {
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

function maskDocumentos(valor: string): string {
    return valor.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***CPF***')
        .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '***CNPJ***')
        .replace(/\b\d{11,14}\b/g, (match) => `${match.slice(0, 3)}***${match.slice(-2)}`);
}

function maskSensitiveString(valor: string): string {
    return maskDocumentos(valor)
        .replace(/\b(Basic|Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [REDACTED]')
        .replace(/(authorization\s*[:=]\s*)([^\s,;"']+)/gi, '$1[REDACTED]')
        .replace(/((?:token|password|senha|secret)\s*[:=]\s*)([^\s,;"']+)/gi, '$1[REDACTED]');
}

function sanitize(value: any, seen = new WeakSet()): any {
    if (value === null || typeof value === 'undefined') return value;
    if (typeof value === 'string') return maskSensitiveString(value);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value !== 'object') return String(value);

    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) return value.map(item => sanitize(item, seen));

    const sanitized: any = {};
    Object.keys(value).forEach((key) => {
        if (SENSITIVE_KEYS.test(key)) {
            sanitized[key] = '[REDACTED]';
            return;
        }
        sanitized[key] = sanitize(value[key], seen);
    });
    return sanitized;
}

function safeJson(value: any): string {
    try {
        return JSON.stringify(sanitize(value));
    } catch (error: any) {
        return String(error?.message || value);
    }
}

function errorMessage(error: any): string {
    if (!error) return 'Erro desconhecido';
    const code = error.code || error.errno || error.sqlState;
    const message = error.sqlMessage || error.message || String(error);
    return maskSensitiveString(code ? `${code}: ${message}` : message);
}

function writeLine(filePath: string, line: string) {
    try {
        ensureLogDir();
        fs.appendFileSync(filePath, `${line}\n`, 'utf8');
    } catch (error) {
        console.error('[Logger] Falha ao escrever arquivo de log:', error);
    }
}

function shouldWritePainel(contexto: string): boolean {
    return /painel.?logistica|agendaservice\.obteragendamentos/i.test(contexto);
}

export function createRequestId(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logError(contexto: string, error: any, meta?: any) {
    const detalhes = [
        `[${timestampSaoPaulo()}] [ERROR] [${contexto}] ${errorMessage(error)}`,
        meta ? `meta=${safeJson(meta)}` : '',
        error?.stack ? `stack=${maskSensitiveString(String(error.stack))}` : '',
        error?.code ? `code=${error.code}` : '',
        error?.errno ? `errno=${error.errno}` : '',
        error?.sqlState ? `sqlState=${error.sqlState}` : '',
        error?.sqlMessage ? `sqlMessage=${maskSensitiveString(String(error.sqlMessage))}` : '',
        error?.sql ? `sql=${maskSensitiveString(String(error.sql))}` : ''
    ].filter(Boolean).join(' ');

    writeLine(ERROR_LOG, detalhes);
    if (shouldWritePainel(contexto)) {
        writeLine(PAINEL_LOG, detalhes);
    }
}

export function logWarn(contexto: string, mensagem: string, meta?: any) {
    const line = `[${timestampSaoPaulo()}] [WARN] [${contexto}] ${maskSensitiveString(String(mensagem))}${meta ? ` meta=${safeJson(meta)}` : ''}`;
    writeLine(DEBUG_LOG, line);
    if (shouldWritePainel(contexto)) writeLine(PAINEL_LOG, line);
}

export function logInfo(contexto: string, mensagem: string, meta?: any) {
    const line = `[${timestampSaoPaulo()}] [INFO] [${contexto}] ${maskSensitiveString(String(mensagem))}${meta ? ` meta=${safeJson(meta)}` : ''}`;
    writeLine(DEBUG_LOG, line);
}
