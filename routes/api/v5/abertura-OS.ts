// routes/api/v5/abertura-OS.ts
import * as Express from 'express';
import axios, { Method } from 'axios';
import { LOCALHOST } from '../../../api/database';
import { AgendaService } from './agendaService';

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

function extrairProtocoloTicket(ticket: any): string {
    if (!ticket) return '';
    return ticket.protocolo
        || ticket.numero_protocolo
        || ticket.protocolo_atendimento
        || ticket.id_protocolo
        || ticket.codigo_protocolo
        || '';
}

function traduzirStatusOsIxc(status: any): string {
    const s = String(status || '').toUpperCase();
    const mapa: Record<string, string> = {
        A: 'Aberta',
        AG: 'Agendada',
        EN: 'Encaminhada',
        DS: 'A caminho',
        EX: 'Em execução',
        RAG: 'Reagendar',
        F: 'Finalizada',
        C: 'Cancelada'
    };
    return mapa[s] || s || 'Não informado';
}

function formatarAgendaOs(valor: any): string {
    if (!valor || String(valor).startsWith('0000-00-00')) return '';
    const str = String(valor).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}${match[4] ? ` ${match[4]}:${match[5]}` : ''}`;
    return str;
}

async function buscarTicketIxc(ticketId: string): Promise<any> {
    const ticketResp = await makeIxcRequest('POST', '/su_ticket', {
        qtype: 'su_ticket.id',
        query: String(ticketId),
        oper: '=',
        rp: '1'
    });
    return ticketResp.registros?.[0] || null;
}

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
                status: contrato.status || '',
                status_internet: contrato.status_internet || contrato.status_acesso || '',
                bloqueio_automatico: contrato.bloqueio_automatico || '',
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
            contatos: {
                fone: clienteEncontrado.fone || clienteEncontrado.telefone_residencial || '',
                telefone_comercial: clienteEncontrado.telefone_comercial || '',
                telefone_celular: clienteEncontrado.telefone_celular || '',
                whatsapp: clienteEncontrado.whatsapp || '',
                email: clienteEncontrado.email || '',
                contato: clienteEncontrado.contato || ''
            },
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
        const abertosResp = await makeIxcRequest('POST', '/su_ticket', {
            qtype: 'su_ticket.id_cliente',
            query: String(cliente_id),
            oper: '=',
            page: '1',
            rp: '50',
            sortname: 'su_ticket.id',
            sortorder: 'desc'
        }).catch(() => ({ registros: [] }));

        const atendimentoDuplicado = (abertosResp.registros || []).find((ticket: any) => {
            const statusAberto = !['F', 'C'].includes(String(ticket.status || '').toUpperCase());
            const mesmoContrato = !contrato_id || !ticket.id_contrato || String(ticket.id_contrato) === String(contrato_id);
            const mesmoAssunto = !ticket.id_assunto || String(ticket.id_assunto) === String(id_assunto);
            return statusAberto && mesmoContrato && mesmoAssunto;
        });

        if (atendimentoDuplicado) {
            const protocoloDuplicado = extrairProtocoloTicket(atendimentoDuplicado) || 'Protocolo ainda não retornado pelo IXC';
            return res.status(409).json({
                error: `Já existe atendimento aberto compatível para este cliente/contrato: #${atendimentoDuplicado.id}. Protocolo: ${protocoloDuplicado}.`,
                ticket_id: atendimentoDuplicado.id,
                protocolo: protocoloDuplicado
            });
        }

        const payloadTicket: any = {
            id_cliente: cliente_id,
            titulo: titulo || "Atendimento via Intranet",
            id_assunto: id_assunto, 
            id_ticket_setor: id_departamento || "4",
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

        const ticketId = ixcResp.id || ixcResp.id_su_ticket || ixcResp.ticket_id;
        let ticketCriado: any = null;
        if (ticketId) {
            ticketCriado = await buscarTicketIxc(String(ticketId)).catch(() => null);
        }

        let osCriada: any = null;
        if (ticketId) {
            const osCriadaResp = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id_ticket',
                query: String(ticketId),
                oper: '=',
                rp: '1',
                sortname: 'su_oss_chamado.id',
                sortorder: 'desc'
            }).catch(() => ({ registros: [] }));
            osCriada = osCriadaResp.registros?.[0] || null;
        }

        const protocolo = extrairProtocoloTicket(ixcResp) || extrairProtocoloTicket(ticketCriado) || extrairProtocoloTicket(osCriada) || 'Protocolo ainda não retornado pelo IXC';
        if (protocolo === 'Protocolo ainda não retornado pelo IXC') {
            console.warn('[Abertura OS][Protocolo] Protocolo não retornado pelo IXC:', {
                respostaCriacao: ixcResp,
                ticketCriado,
                osCriada
            });
        }

        res.json({ success: true, ticket_id: ticketId, protocolo, message: "Atendimento criado com sucesso no IXC!" });
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

router.get('/tarefas/:id_processo/:id_tarefa_atual', async (req, res) => {
    try {
        const { id_processo, id_tarefa_atual } = req.params;
        
        let realIdProcesso = id_processo;
        let proximaSequencia = 2;
        
        if (id_tarefa_atual && id_tarefa_atual !== 'undefined' && id_tarefa_atual !== 'null' && id_tarefa_atual !== '0') {
            const tarefaAtualResp = await makeIxcRequest('POST', '/wfl_tarefa', {
                qtype: 'wfl_tarefa.id',
                query: id_tarefa_atual,
                oper: '=',
                page: '1',
                rp: '1'
            });

            if (tarefaAtualResp.registros && tarefaAtualResp.registros.length > 0) {
                const tarefaAtual = tarefaAtualResp.registros[0];
                realIdProcesso = tarefaAtual.id_processo; 
                proximaSequencia = Number(tarefaAtual.sequencia) + 1;
            }
        }

        const resp = await makeIxcRequest('POST', '/wfl_tarefa', {
            qtype: 'wfl_tarefa.id_processo',
            query: realIdProcesso,
            oper: '=',
            page: '1',
            rp: '100',
            sortname: 'wfl_tarefa.sequencia',
            sortorder: 'asc'
        });

        const todasTarefas = resp.registros || [];

        if (!id_tarefa_atual || id_tarefa_atual === 'undefined' || id_tarefa_atual === 'null' || id_tarefa_atual === '0') {
            if (todasTarefas.length > 0) {
                const menorSequencia = Math.min(...todasTarefas.map((t: any) => Number(t.sequencia)));
                proximaSequencia = menorSequencia + 1;
            }
        }

        const tarefasCorretas = todasTarefas.filter((t: any) => 
            Number(t.sequencia) === proximaSequencia && t.ativo === 'S'
        );

        //console.log(`[DEBUG WFL] Proc: ${realIdProcesso} | Seq Alvo: ${proximaSequencia} | Opções Encontradas: ${tarefasCorretas.length}`);

        res.json(tarefasCorretas);
    } catch (error: any) {
        console.error("[DEBUG WFL ERRO]", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post('/avancar-tarefa', async (req, res) => {
    const { ticket_id, os_id, id_tarefa, mensagem, usuario_intranet, usuario_logado } = req.body; 
    
    try {
        const usuarioIxc = await AgendaService.obterUsuarioIxcLogado(usuario_intranet || usuario_logado);
        const idTecnicoIxc = usuarioIxc.id_funcionario_ixc;

        let osAberta = null;
        let ticketIdRetornado = ticket_id;

        if (os_id) {
            const osResponse = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id', query: String(os_id), oper: '=', rp: '1'
            });
            if (osResponse && osResponse.registros && osResponse.registros.length > 0) {
                osAberta = osResponse.registros[0];
                ticketIdRetornado = osAberta.id_ticket;
            }
        } else if (ticket_id) {
            const osResponse = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id_ticket', query: String(ticket_id), oper: '=', rp: '20', sortname: 'su_oss_chamado.id', sortorder: 'desc'
            });
            if (osResponse && osResponse.registros) {
                osAberta = osResponse.registros.find((os: any) => os.status === 'A' || os.status === 'EN');
            }
        }

        if (!osAberta) {
            throw new Error(`Nenhuma OS aberta foi encontrada no IXC para avançar a tarefa.`);
        }

        const dataHoraAtual = getIxcDate();
        const dataAtual = dataHoraAtual.split(' ')[0];

        const idProcessoWfl = osAberta.id_wfl_param_os || osAberta.id_wfl_processo || osAberta.id_processo || "";
        const idTarefaAtualWfl = osAberta.id_wfl_tarefa || osAberta.id_tarefa_atual || osAberta.id_tarefa || "";

        const payloadFechamento = {
            "id_chamado": osAberta.id, 
            "gera_comissao_aux": "N",
            "data_inicio": dataHoraAtual,
            "data_final": dataHoraAtual,
            "id_resposta": "",
            "mensagem": mensagem || "Atendimento triado e encaminhado via Intranet Hub.",
            "id_tecnico": idTecnicoIxc,
            "id_equipe": "",
            "gera_comissao": "N",
            "status": osAberta.status || "A", 
            "data": dataAtual,
            "id_evento": osAberta.id_evento || osAberta.id_evento_status || osAberta.id_wfl_tarefa || "0",
            "id_su_diagnostico": "",
            "justificativa_sla_atrasado": "",
            "latitude": "",
            "longitude": "",
            "gps_time": "",
            "id_processo": idProcessoWfl,
            "id_tarefa_atual": idTarefaAtualWfl,
            "eh_tarefa_decisao": "N",
            "sequencia_atual": "",
            "proxima_sequencia_forcada": "",
            "finaliza_processo": "N",
            "finaliza_processo_aux": "N",
            "id_evento_status": osAberta.id_evento_status || osAberta.id_evento || osAberta.id_wfl_tarefa || "0",
            "id_proxima_tarefa": id_tarefa,
            "id_proxima_tarefa_aux": ""
        };

        console.log('[Abertura OS][Avancar Tarefa] Payload IXC:', {
            os_id: osAberta.id,
            ticket_id: ticketIdRetornado,
            usuario_logado: usuario_intranet || usuario_logado,
            id_funcionario_ixc: idTecnicoIxc,
            colaborador_nome: usuarioIxc.nome,
            status_atual: osAberta.status,
            id_tarefa_atual: idTarefaAtualWfl,
            id_proxima_tarefa: id_tarefa,
            finaliza_processo: payloadFechamento.finaliza_processo,
            payload: payloadFechamento
        });

        const respWfl = await makeIxcRequest('POST', '/su_oss_chamado_fechar', payloadFechamento, 'incluir');
        
        if (respWfl && respWfl.type === 'error') {
            throw new Error(`Erro no motor do IXC: ${respWfl.message.replace(/<br \/>/g, ' - ')}`);
        }

        res.json({ success: true, ticket_id_retornado: ticketIdRetornado });

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
        const { id_login, usuario_logado } = req.body;
        if (!id_login) return res.status(400).json({ error: 'ID PPPoE não informado.' });
        console.log('[Abertura OS][Limpar MAC]', { id_login, usuario_logado });
        await makeIxcRequest('POST', '/radusuarios_25452', { get_id: String(id_login) });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/desconectar', async (req, res) => {
    try {
        const { id_login, usuario_logado } = req.body;
        if (!id_login) return res.status(400).json({ error: 'ID PPPoE não informado.' });
        console.log('[Abertura OS][Desconectar Login]', { id_login, usuario_logado });
        await makeIxcRequest('POST', '/desconectar_clientes', { id: String(id_login) });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/desbloqueio-confianca', async (req, res) => {
    try {
        const { contrato_id, usuario_logado } = req.body;
        if (!contrato_id) return res.status(400).json({ error: 'Contrato não informado.' });
        console.log('[Abertura OS][Desbloqueio Confiança]', { contrato_id, usuario_logado });
        await makeIxcRequest('POST', '/desbloqueio_confianca', { id: String(contrato_id) });
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

        const setoresResp = await makeIxcRequest('POST', '/su_ticket_setor', {
            qtype: 'id', query: '0', oper: '>', rp: '500'
        });
        
        const setoresMap: any = {};
        if (setoresResp.registros) {
            setoresResp.registros.forEach((s: any) => {
                setoresMap[s.id] = s.setor;
            });
        }

        const oss = (resp.registros || []).map((os: any) => ({
            ...os,
            nome_setor: setoresMap[os.setor] || 'Setor Desconhecido',
            status_label: traduzirStatusOsIxc(os.status),
            data_agenda_formatada: formatarAgendaOs(os.data_agenda || os.data_agendamento),
            ja_agendada: !!formatarAgendaOs(os.data_agenda || os.data_agendamento)
        }));
        
        //console.log(`\n[DEBUG WFL] OSs encontradas para o ticket ${req.params.id_ticket}:`);
        oss.forEach((o: any) => {
            //console.log(`OS ID: ${o.id} | wfl_param_os: ${o.id_wfl_param_os} | processo_alt: ${o.id_wfl_processo} | status: ${o.status}`);
        });
        
        res.json(oss);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
