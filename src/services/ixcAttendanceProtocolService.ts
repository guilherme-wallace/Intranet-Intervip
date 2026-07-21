import { Method } from 'axios';

type IxcProtocolOperation = 'listar' | 'incluir' | 'alterar' | 'integracao' | null;

export type IxcProtocolRequester = (
    method: Method,
    endpoint: string,
    data?: any,
    operationType?: IxcProtocolOperation,
    context?: any
) => Promise<any>;

export class IxcAttendanceProtocolError extends Error {
    public readonly code = 'IXC_ATTENDANCE_PROTOCOL_ERROR';

    constructor(message: string) {
        super(message);
        this.name = 'IxcAttendanceProtocolError';
    }
}

export async function gerarProtocoloAtendimentoIxc(
    requestIxc: IxcProtocolRequester,
    context: any = {}
): Promise<string> {
    // Endpoint de acao informado pelo suporte IXC. Ele gera o numero antes da
    // inclusao do su_ticket; o protocolo retornado deve ser enviado no ticket.
    let response: any;
    try {
        response = await requestIxc(
            'POST',
            '/gerar_protocolo_atendimento',
            {},
            null,
            { ...context, disableRetry: true }
        );
    } catch (error: any) {
        throw new IxcAttendanceProtocolError(
            `Nao foi possivel gerar o protocolo do atendimento no IXC: ${String(error?.message || 'falha de comunicacao')}`
        );
    }
    const scalarResponse = typeof response === 'string' || typeof response === 'number'
        ? String(response).trim()
        : '';
    const responseType = String(response?.type || response?.tipo || '').trim().toLowerCase();
    if (response?.success === false || responseType === 'error' || responseType === 'erro') {
        throw new IxcAttendanceProtocolError(
            String(response?.message || response?.mensagem || 'O IXC recusou a geracao do protocolo do atendimento.')
        );
    }

    const protocolo = String(
        scalarResponse
        || response?.protocolo
        || response?.numero_protocolo
        || response?.protocolo_atendimento
        || ''
    ).trim();
    if (!protocolo) {
        throw new IxcAttendanceProtocolError(
            'O IXC nao retornou o protocolo do atendimento. O atendimento nao foi criado.'
        );
    }
    return protocolo;
}
