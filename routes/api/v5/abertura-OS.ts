// routes/api/v5/abertura-OS.ts
import * as Express from 'express';
import axios, { Method } from 'axios';
import { LOCALHOST } from '../../../api/database';

const router = Express.Router();

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

// Rota 1: Buscar o cliente para a Triagem
router.get('/busca-cliente/:termo', async (req, res) => {
    const { termo } = req.params;
    
    try {
        // Busca o cliente pelo CPF/CNPJ, Razão Social ou ID
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
        
        // Busca os contratos do cliente
        const contratoResp = await makeIxcRequest('POST', '/cliente_contrato', {
            qtype: "cliente_contrato.id_cliente", query: cliente.id, oper: "=", page: "1", rp: "10"
        });

        // Verifica se há chamados pendentes (Evitar duplicidade)
        const chamadosPendentes = await makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente", query: cliente.id, oper: "=", page: "1", rp: "10"
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

// Rota 2: Gerar o Ticket de Suporte no IXC
router.post('/gerar-os', async (req, res) => {
    const { cliente_id, contrato_id, motivo, observacao } = req.body;

    if (!cliente_id || !motivo) {
        return res.status(400).json({ error: "Dados incompletos para abrir o chamado." });
    }

    try {
        // IDs Padrões da sua empresa no IXC (Você precisará ajustar de acordo com o seu painel IXC)
        // Por exemplo: id_assunto 1 = "Lentidão", id_departamento 2 = "Suporte N1"
        // Como não temos os IDs reais, usarei variáveis genéricas que você pode mapear depois.
        
        const payloadTicket = {
            id_cliente: cliente_id,
            id_contrato: contrato_id || "",
            id_assunto: "1", // Substitua pelo ID real do assunto "Reparo" do seu IXC
            id_departamento: "1", // Substitua pelo ID real do departamento "Suporte" do seu IXC
            menssagem: `Motivo: ${motivo}\n\nObservações da Triagem:\n${observacao}`,
            status: "A", // "A" = Aberto
            su_ticket_origem: "I", // "I" = Intranet / API
            origem_endereco: "C" // "C" = Endereço do Cliente
        };

        const ixcResp = await makeIxcRequest('POST', '/su_ticket', payloadTicket);

        if (ixcResp.type === 'error') {
            throw new Error(ixcResp.message);
        }

        // Retorna o ID gerado pelo IXC para o Frontend redirecionar
        res.json({ success: true, id_ticket: ixcResp.id });

    } catch (error: any) {
        console.error("Erro ao gerar OS:", error.message);
        res.status(500).json({ error: "Falha ao gerar OS no IXC." });
    }
});

export default router;