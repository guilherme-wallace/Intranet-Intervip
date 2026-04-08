// routes/api/v5/agendamento.ts
import * as Express from 'express';
import axios, { Method } from 'axios';
import { LOCALHOST } from '../../../api/database';

const router = Express.Router();

const executeDb = (query: string, params: any[] = []) => {
    return new Promise<any>((resolve, reject) => {
        LOCALHOST.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

const makeIxcRequest = async (method: Method, endpoint: string, data: any = null) => {
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN; 
    const headers: any = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };
    if (data && data.qtype) {
        headers['ixcsoft'] = 'listar';
        method = 'POST'; 
    }
    try {
        const response = await axios({ method, url, headers, data });
        return response.data;
    } catch (error: any) {
        console.error(`[IXC Err] ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
};

router.get('/triagem/busca-cliente/:termo', async (req, res) => {
    const { termo } = req.params;
    
    try {
        const payloadBusca = {
            qtype: isNaN(Number(termo)) ? "cliente.razao" : "cliente.cnpj_cpf",
            query: termo,
            oper: isNaN(Number(termo)) ? "L" : "=",
            page: "1",
            rp: "5"
        };

        const cliResp = await makeIxcRequest('POST', '/cliente', payloadBusca);
        
        if (!cliResp.registros || cliResp.registros.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado no IXC." });
        }

        const cliente = cliResp.registros[0];
        
        const contratoResp = await makeIxcRequest('POST', '/cliente_contrato', {
            qtype: "cliente_contrato.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });

        const chamadosPendentes = await makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });

        const osAbertas = (chamadosPendentes.registros || []).filter((os: any) => os.status === 'A' || os.status === 'EN');

        res.json({
            cliente: {
                id: cliente.id,
                nome: cliente.razao,
                documento: cliente.cnpj_cpf,
                endereco: cliente.endereco,
                numero: cliente.numero,
                bairro: cliente.bairro,
                cidade: cliente.cidade
            },
            contratos: contratoResp.registros || [],
            os_abertas: osAbertas
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/triagem/busca-cliente/:termo', async (req, res) => {
    const { termo } = req.params;
    
    try {
        const payloadBusca = {
            qtype: isNaN(Number(termo)) ? "cliente.razao" : "cliente.cnpj_cpf",
            query: termo,
            oper: isNaN(Number(termo)) ? "L" : "=",
            page: "1",
            rp: "5"
        };

        const cliResp = await makeIxcRequest('POST', '/cliente', payloadBusca);
        
        if (!cliResp.registros || cliResp.registros.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado no IXC." });
        }

        const cliente = cliResp.registros[0];
        
        const contratoResp = await makeIxcRequest('POST', '/cliente_contrato', {
            qtype: "cliente_contrato.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });

        const chamadosPendentes = await makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "10"
        });

        const osAbertas = (chamadosPendentes.registros || []).filter((os: any) => os.status === 'A' || os.status === 'EN');

        res.json({
            cliente: {
                id: cliente.id,
                nome: cliente.razao,
                documento: cliente.cnpj_cpf,
                endereco: cliente.endereco,
                numero: cliente.numero,
                bairro: cliente.bairro,
                cidade: cliente.cidade
            },
            contratos: contratoResp.registros || [],
            os_abertas: osAbertas
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/detalhes-os/:id_ticket', async (req, res) => {
    const { id_ticket } = req.params;
    const { origem } = req.query;

    try {
        let ticketResp = await makeIxcRequest('POST', '/su_ticket', {
            qtype: 'su_ticket.id', query: id_ticket, oper: '=', rp: '1'
        });

        if (!ticketResp.registros || ticketResp.registros.length === 0) {
            const osResp = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id', query: id_ticket, oper: '=', rp: '1'
            });

            if (osResp.registros && osResp.registros.length > 0) {
                const idAtendimentoPai = osResp.registros[0].id_ticket;
                
                ticketResp = await makeIxcRequest('POST', '/su_ticket', {
                    qtype: 'su_ticket.id', query: idAtendimentoPai, oper: '=', rp: '1'
                });
            }
        }

        if (!ticketResp.registros || ticketResp.registros.length === 0) {
            return res.status(404).json({ error: "Ordem de Serviço ou Atendimento não encontrado no IXC." });
        }

        const ticket = ticketResp.registros[0];

        const clienteResp = await makeIxcRequest('POST', '/cliente', {
            qtype: 'cliente.id', query: ticket.id_cliente, oper: '=', rp: '1'
        });
        
        const cliente = clienteResp.registros[0] || {};

        const tipoServico = origem === 'venda' ? 'INSTALAÇÃO' : 'SUPORTE TÉCNICO';
        
        const enderecoCompleto = `${cliente.endereco || ''} ${cliente.complemento || ''}`.toUpperCase();
        const tipoImovel = (enderecoCompleto.includes('APTO') || enderecoCompleto.includes('BLOCO') || enderecoCompleto.includes('CONDOMINIO')) ? 'PRÉDIO' : 'CASA';

        res.json({
            id_ticket: ticket.id,
            cliente_id: cliente.id,
            nome: cliente.razao,
            endereco: `${cliente.endereco}, ${cliente.numero} - ${cliente.bairro}`,
            cidade: cliente.cidade, 
            mensagem: ticket.menssagem || 'Sem descrição.',
            tipo_servico: tipoServico,
            tipo_imovel: tipoImovel
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/vagas', async (req, res) => {
    const { data, municipio } = req.query;

    try {
        const agendamentos = await executeDb(
            `SELECT turno, COUNT(*) as qtd 
             FROM ivp_agenda_os 
             WHERE data_agendamento = ? AND municipio_base = ? 
             GROUP BY turno`,
            [data, municipio]
        );

        const VAGAS_MAXIMAS = 5; 

        let vagasMatutino = VAGAS_MAXIMAS;
        let vagasVespertino = VAGAS_MAXIMAS;

        agendamentos.forEach((row: any) => {
            if (row.turno === 'MATUTINO') vagasMatutino -= row.qtd;
            if (row.turno === 'VESPERTINO') vagasVespertino -= row.qtd;
        });

        res.json({
            matutino: { vagas: Math.max(0, vagasMatutino), disponivel: vagasMatutino > 0 },
            vespertino: { vagas: Math.max(0, vagasVespertino), disponivel: vagasVespertino > 0 }
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/confirmar', async (req, res) => {
    const { id_ticket, cliente_id, municipio, tipo_servico, tipo_imovel, data_agendamento, turno, aceita_encaixe } = req.body;

    try {
        await executeDb(
            `INSERT INTO ivp_agenda_os 
            (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel, municipio_base, aceita_encaixe, data_agendamento, turno, status_interno, criado_por)
            VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, 'AGUARDANDO_ATRIBUICAO', 'ATENDIMENTO')`,
            [id_ticket, cliente_id, tipo_servico, tipo_imovel, municipio, aceita_encaixe ? 1 : 0, data_agendamento, turno]
        );

        const dataFormatada = data_agendamento.split('-').reverse().join('/');
        const msgInteracao = `AGENDADO VIA INTRANET\nData: ${dataFormatada}\nTurno: ${turno}\nAceita Encaixe: ${aceita_encaixe ? 'SIM' : 'NÃO'}`;
        

        res.json({ success: true, message: "Agendamento confirmado com sucesso!" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;