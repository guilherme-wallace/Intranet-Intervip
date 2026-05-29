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
            qtype: "cliente_contrato.id_cliente", query: cliente.id, oper: "=", page: "1", rp: "10"
        });

        const chamadosPendentes = await makeIxcRequest('POST', '/suporte', {
            qtype: "suporte.id_cliente", query: cliente.id, oper: "=", page: "1", rp: "10"
        });

        const osAbertas = (chamadosPendentes.registros || []).filter((os: any) => os.status === 'A' || os.status === 'EN');

        res.json({
            cliente: {
                id: cliente.id, nome: cliente.razao, documento: cliente.cnpj_cpf,
                endereco: cliente.endereco, numero: cliente.numero, bairro: cliente.bairro, cidade: cliente.cidade
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
        let osAberta = null;
        let ticket = null;
        let idCliente = null;
        let idContrato = null;

        const ticketResp = await makeIxcRequest('POST', '/su_ticket', {
            qtype: 'su_ticket.id', query: id_ticket, oper: '=', rp: '1'
        });
        if (ticketResp.registros && ticketResp.registros.length > 0) {
            ticket = ticketResp.registros[0];
            const osResp = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id_ticket', query: id_ticket, oper: '=', rp: '1'
            });
            if (osResp.registros && osResp.registros.length > 0) osAberta = osResp.registros[0];
        } else {
            const osResp = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id', query: id_ticket, oper: '=', rp: '1'
            });
            if (osResp.registros && osResp.registros.length > 0) {
                osAberta = osResp.registros[0];
                const tResp = await makeIxcRequest('POST', '/su_ticket', {
                    qtype: 'su_ticket.id', query: osAberta.id_ticket, oper: '=', rp: '1'
                });
                if (tResp.registros && tResp.registros.length > 0) ticket = tResp.registros[0];
            }
        }

        if (!osAberta && !ticket) {
            return res.status(404).json({ error: "Ordem de Serviço ou Atendimento não encontrado no IXC." });
        }

        idCliente = osAberta ? osAberta.id_cliente : ticket.id_cliente;
        idContrato = osAberta ? (osAberta.id_contrato_kit || osAberta.id_contrato) : ticket.id_contrato;

        const cliResp = await makeIxcRequest('POST', '/cliente', {
            qtype: 'cliente.id', query: idCliente, oper: '=', rp: '1'
        });
        const cliente = (cliResp.registros && cliResp.registros.length > 0) ? cliResp.registros[0] : {};

        let contrato = null;
        if (idContrato && idContrato !== '0') {
            const conResp = await makeIxcRequest('POST', '/cliente_contrato', {
                qtype: 'cliente_contrato.id', query: idContrato, oper: '=', rp: '1'
            });
            if (conResp.registros && conResp.registros.length > 0) {
                contrato = conResp.registros[0];
            }
        }

        let baseEnd = contrato;
        if (!contrato || contrato.endereco_padrao_cliente === 'S') {
            baseEnd = cliente;
        }
        
        if (!baseEnd || (!baseEnd.cidade && !baseEnd.endereco)) {
            baseEnd = cliente;
        }

        const idCidade = baseEnd.cidade || '';
        const idCondominio = baseEnd.id_condominio || '';
        const endereco = baseEnd.endereco || '';
        const numero = baseEnd.numero || 'S/N';
        const bairro = baseEnd.bairro || '';
        const bloco = baseEnd.bloco || '';
        const apartamento = baseEnd.apartamento || '';
        const complemento = baseEnd.complemento || '';

        let nomeCidade = 'Desconhecido';
        if (idCidade && idCidade !== '0') {
            try {
                const cidResp = await makeIxcRequest('POST', '/cidade', { qtype: 'cidade.id', query: idCidade, oper: '=', rp: '1' });
                if (cidResp.registros && cidResp.registros.length > 0) nomeCidade = cidResp.registros[0].nome;
            } catch(e){}
        }

        let nomeCondominio = '';
        if (idCondominio && idCondominio !== '0') {
            try {
                const condResp = await makeIxcRequest('POST', '/cliente_condominio', { qtype: 'cliente_condominio.id', query: idCondominio, oper: '=', rp: '1' });
                if (condResp.registros && condResp.registros.length > 0) nomeCondominio = condResp.registros[0].condominio;
            } catch(e){}
        }

        const isCorp = cliente.id_tipo_cliente === '7' || cliente.id_tipo_cliente === '8';
        const upperCond = nomeCondominio.toUpperCase();
        const prefixosCasa = ['SEA', 'VTA', 'VVA', 'CCA', 'GRI'];
        const isCondCasa = prefixosCasa.some(prefix => upperCond.startsWith(prefix));
        
        let tipoImovel = 'CASA';
        if (isCorp) {
            tipoImovel = 'CORPORATIVO';
        } else if (nomeCondominio) {
            tipoImovel = isCondCasa ? 'CASA' : 'PRÉDIO';
        } else if (bloco || apartamento) {
            tipoImovel = 'PRÉDIO';
        }

        let endCompleto = `${endereco}, ${numero} - ${bairro}`;
        if (complemento) endCompleto += ` (${complemento})`;
        if (bloco) endCompleto += ` | Bloco: ${bloco}`;
        if (apartamento) endCompleto += ` | Apto: ${apartamento}`;
        if (nomeCondominio) endCompleto += ` | Cond: ${nomeCondominio}`;

        const tipoServico = origem === 'venda' ? 'INSTALAÇÃO' : 'SUPORTE TÉCNICO';
        let mensagem = 'Sem descrição.';
        if (osAberta && osAberta.mensagem) mensagem = osAberta.mensagem;
        else if (ticket && ticket.menssagem) mensagem = ticket.menssagem;

        res.json({
            id_ticket: osAberta ? osAberta.id : (ticket ? ticket.id : id_ticket),
            cliente_id: cliente.id,
            nome: cliente.razao,
            endereco: endCompleto,
            cidade: nomeCidade, 
            mensagem: mensagem,
            tipo_servico: tipoServico,
            tipo_imovel: tipoImovel
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/confirmar', async (req, res) => {
    const { id_ticket, cliente_id, municipio, tipo_servico, tipo_imovel, data_agendamento, turno, aceita_encaixe, solicita_prioridade } = req.body;

    try {
        let ixc_os_id = id_ticket; 
        const osResp = await makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_ticket', query: id_ticket, oper: '=', rp: '1'
        });
        if (osResp.registros && osResp.registros.length > 0) {
            ixc_os_id = osResp.registros[0].id;
        }

        await executeDb(
            `INSERT INTO ivp_agenda_os 
            (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel, municipio_base, aceita_encaixe, solicita_prioridade, data_agendamento, turno, status_interno, criado_por)
            VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'AGUARDANDO_ATRIBUICAO', 'ATENDIMENTO')`,
            [ixc_os_id, cliente_id, tipo_servico, tipo_imovel, municipio, aceita_encaixe ? 1 : 0, solicita_prioridade ? 1 : 0, data_agendamento, turno]
        );

        const horaIXC = turno === 'MATUTINO' ? '08:00:00' : '13:00:00';
        const dataFormatada = data_agendamento.split('-').reverse().join('/');
        
        const msgInteracao = `AGENDADO VIA INTRANET\nData: ${dataFormatada}\nTurno: ${turno}\nAceita Encaixe: ${aceita_encaixe ? 'SIM' : 'NÃO'}\nPrioridade: ${solicita_prioridade ? 'ALTA URGÊNCIA' : 'NORMAL'}`;
        
        await makeIxcRequest('PUT', `/su_oss_chamado/${ixc_os_id}`, {
            data_agenda: `${data_agendamento} ${horaIXC}`,
            melhor_horario_agenda: turno === 'MATUTINO' ? 'M' : 'T',
            mensagem_resposta: msgInteracao,
            status: 'AG'
        });

        res.json({ success: true, message: "Agendamento confirmado com sucesso!" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/vagas-semana', async (req, res) => {
    const { data_inicio, data_fim, municipio, tipo_servico, tipo_imovel } = req.query;

    try {
        const capResult = await executeDb('SELECT * FROM ivp_agenda_capacidade WHERE data >= ? AND data <= ?', [data_inicio, data_fim]);
        const agendamentos = await executeDb('SELECT * FROM ivp_agenda_os WHERE data_agendamento >= ? AND data_agendamento <= ? AND (status_interno != "CANCELADO" OR status_interno IS NULL)', [data_inicio, data_fim]);

        const isInstalacao = String(tipo_servico).toUpperCase().includes('INSTALA');
        const isSerra = String(municipio).toUpperCase().includes('SERRA');
        const isPredio = String(tipo_imovel).toUpperCase() === 'PRÉDIO' || String(tipo_imovel).toUpperCase() === 'PREDIO';

        const formatDbDate = (d: Date) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        };

        let countFilter = (os: any) => false;
        if (isInstalacao) {
            countFilter = isSerra
                ? (os: any) => os.tipo_servico.includes('INSTALA') && os.municipio_base.includes('SERRA')
                : (os: any) => os.tipo_servico.includes('INSTALA') && !os.municipio_base.includes('SERRA');
        } else {
            if (!isPredio) {
                countFilter = (os: any) => !os.tipo_servico.includes('INSTALA') && (os.tipo_imovel === 'CASA' || os.tipo_imovel === 'CORPORATIVO');
            } else {
                countFilter = isSerra
                    ? (os: any) => !os.tipo_servico.includes('INSTALA') && os.tipo_imovel === 'PRÉDIO' && os.municipio_base.includes('SERRA')
                    : (os: any) => !os.tipo_servico.includes('INSTALA') && os.tipo_imovel === 'PRÉDIO' && !os.municipio_base.includes('SERRA');
            }
        }

        const result: any = {};
        let currDate = new Date(String(data_inicio) + 'T00:00:00');
        const endDate = new Date(String(data_fim) + 'T00:00:00');

        while (currDate <= endDate) {
            const dStr = currDate.toISOString().split('T')[0];
            result[dStr] = {
                matutino: { vagas: 0, disponivel: false, msg: "Agenda Fechada" },
                vespertino: { vagas: 0, disponivel: false, msg: "Agenda Fechada" }
            };
            currDate.setDate(currDate.getDate() + 1);
        }

        capResult.forEach((capacidade: any) => {
            const dStr = formatDbDate(capacidade.data);
            if (!result[dStr]) return;

            let cap_m = 0, cap_t = 0;
            if (isInstalacao) {
                if (isSerra) { cap_m = capacidade.inst_serra_m; cap_t = capacidade.inst_serra_t; }
                else { cap_m = capacidade.inst_outros_m; cap_t = capacidade.inst_outros_t; }
            } else {
                if (!isPredio) { cap_m = capacidade.casa_m; cap_t = capacidade.casa_t; }
                else {
                    if (isSerra) { cap_m = capacidade.predio_serra_m; cap_t = capacidade.predio_serra_t; }
                    else { cap_m = capacidade.predio_outros_m; cap_t = capacidade.predio_outros_t; }
                }
            }
            result[dStr].matutino = { vagas: cap_m, disponivel: cap_m > 0, msg: "" };
            result[dStr].vespertino = { vagas: cap_t, disponivel: cap_t > 0, msg: "" };
        });

        agendamentos.forEach((os: any) => {
            if (!os.data_agendamento) return;
            const dStr = formatDbDate(os.data_agendamento);
            if (result[dStr] && countFilter(os)) {
                if (os.turno === 'MATUTINO') result[dStr].matutino.vagas--;
                if (os.turno === 'VESPERTINO') result[dStr].vespertino.vagas--;
            }
        });

        for (const dStr in result) {
            if (!result[dStr].matutino.msg) {
                result[dStr].matutino.vagas = Math.max(0, result[dStr].matutino.vagas);
                result[dStr].matutino.disponivel = result[dStr].matutino.vagas > 0;
                if(result[dStr].matutino.vagas === 0) result[dStr].matutino.msg = "Esgotado";
            }
            if (!result[dStr].vespertino.msg) {
                result[dStr].vespertino.vagas = Math.max(0, result[dStr].vespertino.vagas);
                result[dStr].vespertino.disponivel = result[dStr].vespertino.vagas > 0;
                if(result[dStr].vespertino.vagas === 0) result[dStr].vespertino.msg = "Esgotado";
            }
        }

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;