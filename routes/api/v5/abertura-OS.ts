// routes/api/v5/abertura-OS.ts
import * as Express from 'express';
import axios, { Method } from 'axios';
import { LOCALHOST } from '../../../api/database';

const router = Express.Router();

const makeIxcRequest = async (
    method: Method, 
    endpoint: string, 
    data: any = null, 
    operationType: 'listar' | 'incluir' | 'alterar' | 'integracao' | null = null
) => {
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN; 
    
    const headers: any = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
    };

    if (operationType) {
        headers['ixcsoft'] = operationType;
    } else if (data && data.qtype) {
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

const getIxcDate = () => {
    const now = new Date();
    now.setHours(now.getHours() - 3); 
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

async function obterIdFuncionarioIxc(usuario_intranet: string): Promise<string> {
    if (!usuario_intranet) return "138";

    try {
        return await new Promise<string>((resolve, reject) => {
            LOCALHOST.query(
                'SELECT id_funcionario_ixc FROM usuarios_intranet WHERE usuario = ? AND ativo = 1',
                [usuario_intranet],
                (err: any, results: any[]) => {
                    if (err) {
                        return resolve("138");
                    }
                    if (results && results.length > 0 && results[0].id_funcionario_ixc) {
                        resolve(results[0].id_funcionario_ixc.toString());
                    } else {
                        resolve("138");
                    }
                }
            );
        });
    } catch (error) {
        console.error("Erro geral ao consultar id_funcionario_ixc no banco local:", error);
    }
    
    return "138";
}

router.get('/busca-cliente/:termo', async (req, res) => {
    const { termo } = req.params;
    
    try {
        const termoLimpo = termo.replace(/[^\d]/g, '');
        let clienteEncontrado = null;

        if (termoLimpo.length === 11 || termoLimpo.length === 14) {
            let queryFormatada = termoLimpo;
            if (termoLimpo.length === 11) {
                queryFormatada = termoLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            } else {
                queryFormatada = termoLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
            }
            const respCpf = await makeIxcRequest('POST', '/cliente', { qtype: "cliente.cnpj_cpf", query: queryFormatada, oper: "=", page: "1", rp: "1" });
            if (respCpf.registros && respCpf.registros.length > 0) clienteEncontrado = respCpf.registros[0];
        }

        if (!clienteEncontrado && termoLimpo.length > 0) {
            const respId = await makeIxcRequest('POST', '/cliente', { qtype: "cliente.id", query: termoLimpo, oper: "=", page: "1", rp: "1" });
            if (respId.registros && respId.registros.length > 0) clienteEncontrado = respId.registros[0];
        }

        if (!clienteEncontrado) return res.status(404).json({ error: "Cliente não encontrado no IXC." });

        const conResp = await makeIxcRequest('POST', '/cliente_contrato', { qtype: 'cliente_contrato.id_cliente', query: String(clienteEncontrado.id), oper: '=', page: '1', rp: '50' });
        const listaContratos = (conResp.registros || []).filter((c: any) => c.status !== 'C' && c.status !== 'I');
        
        const contratosProcessados = await Promise.all(listaContratos.map(async (contrato: any) => {
            let planoNome = 'Não informado';
            let nomeCondominio = '';
            let loginData = null;
            let onuData = null;
            let historicoPppoe = null;
            let valorContrato = contrato.valor_contrato || '0.00';

            let baseEnd = contrato;
            if (contrato.endereco_padrao_cliente === 'S') {
                baseEnd = clienteEncontrado;
            }

            if (baseEnd && baseEnd.id_condominio && baseEnd.id_condominio !== '0') {
                try {
                    const condResp = await makeIxcRequest('POST', '/cliente_condominio', { qtype: 'cliente_condominio.id', query: baseEnd.id_condominio, oper: '=', rp: '1' });
                    if (condResp.registros?.length > 0) nomeCondominio = condResp.registros[0].condominio;
                } catch(e){}
            }

            if (contrato.id_vd_contrato) {
                try {
                    const planoResp = await makeIxcRequest('POST', '/vd_contratos', { qtype: 'vd_contratos.id', query: contrato.id_vd_contrato, oper: '=', rp: '1' });
                    if (planoResp.registros?.length > 0) planoNome = planoResp.registros[0].nome;
                } catch(e){}
            }

            try {
                const logResp = await makeIxcRequest('POST', '/radusuarios', { qtype: 'radusuarios.id_contrato', query: String(contrato.id), oper: '=', rp: '1' });
                if (logResp.registros?.length > 0) {
                    loginData = logResp.registros[0];
                    
                    if (loginData.login) {
                        const acctResp = await makeIxcRequest('POST', '/radacct', { qtype: 'radacct.username', query: loginData.login, oper: '=', page: '1', rp: '1', sortname: 'radacctid', sortorder: 'desc' });
                        if (acctResp.registros?.length > 0) historicoPppoe = acctResp.registros[0];
                    }

                    let onuEncontrada = null;
                    if (loginData.id) {
                        const reqOnuId = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                            qtype: 'id_login', query: String(loginData.id), oper: '=', rp: '1', sortname: 'id', sortorder: 'desc'
                        });
                        if (reqOnuId.registros && reqOnuId.registros.length > 0) onuEncontrada = reqOnuId.registros[0];
                    }

                    if (!onuEncontrada && loginData.mac) {
                        const reqOnuMac = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                            qtype: 'mac', query: String(loginData.mac), oper: '=', rp: '1', sortname: 'id', sortorder: 'desc'
                        });
                        if (reqOnuMac.registros && reqOnuMac.registros.length > 0) onuEncontrada = reqOnuMac.registros[0];
                    }
                    
                    if (onuEncontrada) onuData = onuEncontrada;
                }
            } catch(e: any) {
                //console.error("[DEBUG] Erro na requisição da ONU do contrato " + contrato.id, e.message);
            }

            const arrayEnd = [];
            if (baseEnd.endereco) arrayEnd.push(baseEnd.endereco);
            if (baseEnd.numero) arrayEnd.push(`Nº ${baseEnd.numero}`);
            if (baseEnd.bairro) arrayEnd.push(`Bairro: ${baseEnd.bairro}`);
            if (baseEnd.complemento) arrayEnd.push(`Comp: ${baseEnd.complemento}`);
            if (baseEnd.bloco) arrayEnd.push(`Bloco: ${baseEnd.bloco}`);
            if (baseEnd.apartamento) arrayEnd.push(`Apto: ${baseEnd.apartamento}`);
            if (baseEnd.referencia) arrayEnd.push(`Ref: ${baseEnd.referencia}`);
            const upperCond = (nomeCondominio || '').toUpperCase();
            const prefixosCasa = ['SEA', 'VTA', 'VVA', 'CCA'];

            const isRedeNeutra = upperCond.includes('(RDNT-');

            const isCasa = prefixosCasa.some(prefix => upperCond.startsWith(prefix));
            const isPredio = !isCasa && (!!(nomeCondominio || baseEnd.bloco || baseEnd.apartamento));

            const isCorp = clienteEncontrado.id_tipo_cliente === '7' || clienteEncontrado.id_tipo_cliente === '8';

            return {
                id: contrato.id,
                endereco_completo: arrayEnd.join(' | '),
                condominio: nomeCondominio || null,
                is_predio: isPredio,
                is_rede_neutra: isRedeNeutra,
                is_corp: isCorp,
                plano: {
                    nome: planoNome,
                    valor: valorContrato,
                    status: contrato.status || 'N/A'
                },
                login: loginData ? {
                    user: loginData.login,
                    senha: loginData.senha,
                    mac: loginData.mac,
                    ip: loginData.ip,
                    status: historicoPppoe ? (historicoPppoe.acctstoptime ? 'Offline' : 'Online') : 'Desconhecido',
                    ultima_queda: historicoPppoe?.acctstoptime || '---',
                    motivo_queda: historicoPppoe?.acctterminatecause || '---',
                    uptime: historicoPppoe?.acctsessiontime || '0',
                    id: loginData.id
                } : null,
                onu: onuData ? {
                    id: onuData.id,
                    mac: onuData.mac,
                    sinal_rx: onuData.sinal_rx,
                    sinal_tx: onuData.sinal_tx,
                    distancia: onuData.distancia,
                    status: onuData.status === 'A' ? 'Online' : 'Offline / LOS'
                } : null
            };
        }));

        res.json({
            id: clienteEncontrado.id,
            nome: clienteEncontrado.razao,
            documento: clienteEncontrado.cnpj_cpf,
            telefones: [clienteEncontrado.telefone_celular, clienteEncontrado.whatsapp, clienteEncontrado.telefone_residencial].filter(f => f).join(' / ') || 'Sem telefone',
            contratos: contratosProcessados
        });

    } catch (error: any) {
        console.error("Erro ao buscar cliente:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/criar-os', async (req, res) => {
    const { cliente_id, contrato_id, id_assunto, id_departamento, id_processo, observacao, titulo } = req.body;

    //console.log("\n=== [DEBUG] INICIANDO CRIAÇÃO DE CHAMADO (IXC) ===");
    //console.log("1. Dados brutos recebidos do Frontend:", req.body);

    if (!cliente_id || !id_assunto || !observacao || !id_processo) {
        console.error("-> Erro: Dados incompletos. Faltando assunto ou processo.");
        return res.status(400).json({ error: "Dados incompletos. Verifique se o assunto possui um processo vinculado no IXC." });
    }

    try {
        const payloadTicket: any = {
            id_cliente: cliente_id,
            titulo: titulo || "Atendimento via Intranet",
            id_assunto: id_assunto, 
            id_ticket_setor: id_departamento || "1",
            id_wfl_processo: id_processo,
            origem_endereco: "CC",
            tipo: "C", 
            status: "A", 
            su_status: "N", 
            prioridade: "M", 
            su_ticket_origem: "I", 
            menssagem: observacao,
            mensagem: observacao
        };

        if (contrato_id && String(contrato_id).trim() !== "") {
            payloadTicket.id_contrato = contrato_id;
        }

        //console.log("2. Payload final montado:", payloadTicket);

        const ixcResp = await makeIxcRequest('POST', '/su_ticket', payloadTicket, 'incluir');
        
        //console.log("3. Resposta recebida do IXC:", ixcResp);

        if (ixcResp.type === 'error') {
            throw new Error(ixcResp.message || "Erro desconhecido retornado pelo IXC");
        }

        res.json({ success: true, ticket_id: ixcResp.id, message: "Atendimento criado com sucesso no IXC!" });
        //console.log("=== CHAMADO CRIADO COM SUCESSO ===\n");

    } catch (error: any) {
        //console.error("4. [ERRO FATAL] Falha ao criar OS no IXC:");
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
});

router.get('/assuntos', async (req, res) => {
    try {
        const resp = await makeIxcRequest('POST', '/su_oss_assunto', {
            qtype: 'su_oss_assunto.ativo',
            query: 'S', 
            oper: '=', 
            page: '1', 
            rp: '1000',
            sortname: 'assunto',
            sortorder: 'asc'
        });

        const assuntosAtivos = (resp.registros || []).filter((a: any) => a.ativo === 'S');

        res.json(assuntosAtivos);
    } catch (error: any) {
        console.error("Erro ao buscar assuntos:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.get('/tarefas/:id_processo', async (req, res) => {
    try {
        const { id_processo } = req.params;
        const resp = await makeIxcRequest('POST', '/wfl_tarefa', {
            qtype: 'wfl_tarefa.id_processo',
            query: id_processo,
            oper: '=',
            page: '1',
            rp: '1000',
            sortname: 'wfl_tarefa.id',
            sortorder: 'asc'
        });
        
        const tarefasSeq2 = (resp.registros || []).filter((t: any) => t.sequencia === '2' && t.ativo === 'S');
        
        res.json(tarefasSeq2);
    } catch (error: any) {
        console.error("Erro ao buscar tarefas:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post('/avancar-tarefa', async (req, res) => {
    const { ticket_id, id_tarefa, usuario_intranet } = req.body; 
    
    try {
        //console.log(`\n=== AVANÇANDO TAREFA DO TICKET ${ticket_id} ===`);
        
        const idTecnicoIxc = await obterIdFuncionarioIxc(usuario_intranet);

        const osResponse = await makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_ticket', query: String(ticket_id), oper: '=', rp: '20', sortname: 'su_oss_chamado.id', sortorder: 'desc'
        });

        if (!osResponse || !osResponse.registros || osResponse.registros.length === 0) {
            throw new Error(`Nenhuma OS encontrada dentro do ticket ${ticket_id}.`);
        }

        const osAberta = osResponse.registros.find((os: any) => os.status === 'A' || os.status === 'EN');
        if (!osAberta) {
            throw new Error(`Nenhuma OS aberta foi encontrada no ticket ${ticket_id}.`);
        }

        //console.log(`-> Fechando OS ${osAberta.id} com o Técnico ID: ${idTecnicoIxc}`);

        const dataHoraAtual = getIxcDate();
        const dataAtual = dataHoraAtual.split(' ')[0];

        const payloadFechamento = {
            "id_chamado": osAberta.id, 
            "gera_comissao_aux": "N",
            "data_inicio": dataHoraAtual,
            "data_final": dataHoraAtual,
            "id_resposta": "",
            "mensagem": "Atendimento triado e encaminhado via Intranet Hub.",
            "id_tecnico": idTecnicoIxc,
            "id_equipe": "",
            "gera_comissao": "N",
            "status": "F", 
            "data": dataAtual,
            "id_evento": "",
            "id_su_diagnostico": "",
            "justificativa_sla_atrasado": "",
            "latitude": "",
            "longitude": "",
            "gps_time": "",
            "id_processo": osAberta.id_wfl_processo,
            "id_tarefa_atual": osAberta.id_wfl_tarefa,
            "eh_tarefa_decisao": "N",
            "sequencia_atual": "",
            "proxima_sequencia_forcada": "",
            "finaliza_processo_aux": "N",
            "id_evento_status": "",
            "id_proxima_tarefa": id_tarefa,
            "id_proxima_tarefa_aux": ""
        };

        const respWfl = await makeIxcRequest('POST', '/su_oss_chamado_fechar', payloadFechamento, 'incluir');
        
        if (respWfl && respWfl.type === 'error') {
            throw new Error(`Erro no motor do IXC: ${respWfl.message.replace(/<br \/>/g, ' - ')}`);
        }

        //console.log(`=== SUCESSO: OS MOVIDA PARA A PRÓXIMA ETAPA ===\n`);
        res.json({ success: true });

    } catch (error: any) {
        console.error("Erro ao avançar tarefa:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post('/onu-realtime', async (req, res) => {
    const { id_fibra } = req.body;
    try {
        await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', { id_registro: id_fibra }, 'integracao');
        
        const onuResp = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
            qtype: 'radpop_radio_cliente_fibra.id', query: String(id_fibra), oper: '=', page: '1', rp: '1'
        });
        res.json(onuResp.registros ? onuResp.registros[0] : null);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/historico-conexao/:username', async (req, res) => {
    try {
        const resp = await makeIxcRequest('POST', '/radacct', {
            qtype: 'radacct.username', query: req.params.username, oper: '=', page: '1', rp: '5', sortname: 'radacctid', sortorder: 'desc'
        });
        res.json(resp.registros || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/limpar-mac', async (req, res) => {
    try {
        const { id_login } = req.body;
        await makeIxcRequest('POST', `/radusuarios_${id_login}`, { get_id: "" });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/desconectar', async (req, res) => {
    try {
        const { id_login } = req.body;
        await makeIxcRequest('POST', '/desconectar_clientes', { id: id_login });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/atendimentos-abertos/:id_cliente', async (req, res) => {
    try {
        const resp = await makeIxcRequest('POST', '/su_ticket', {
            qtype: 'su_ticket.id_cliente',
            query: req.params.id_cliente,
            oper: '=',
            page: '1',
            rp: '100',
            sortname: 'su_ticket.id',
            sortorder: 'desc'
        });

        const atendimentosAbertos = (resp.registros || []).filter((t: any) => t.status !== 'F' && t.status !== 'C');

        res.json(atendimentosAbertos);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/atendimento-oss/:id_ticket', async (req, res) => {
    try {
        const resp = await makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_ticket',
            query: req.params.id_ticket,
            oper: '=',
            page: '1',
            rp: '100',
            sortname: 'su_oss_chamado.id',
            sortorder: 'desc'
        });
        
        res.json(resp.registros || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;