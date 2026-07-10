// routes/api/v5/agendamento.ts
import * as Express from 'express';
import axios, { Method } from 'axios';
import { LOCALHOST } from '../../../api/database';
import { AgendaService } from './agendaService';
import { logError, logInfo, logWarn } from '../../../api/logger';

const router = Express.Router();

const executeDb = (query: string, params: any[] = []) => {
    return new Promise<any>((resolve, reject) => {
        LOCALHOST.query(query, params, (err, results) => {
            if (err) {
                logError('DB.executeDb.agendamento', err, { query, params });
                return reject(err);
            }
            resolve(results);
        });
    });
};

const makeIxcRequest = async (method: Method, endpoint: string, data: any = null, operationType: 'listar' | 'incluir' | 'alterar' | 'integracao' | null = null) => {
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

function dataHojeSaoPauloYmd(): string {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function formatarAgendaIxc(valor: any): string {
    if (!valor || String(valor).startsWith('0000-00-00')) return '';
    const str = String(valor).trim();
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}${iso[4] ? ` ${iso[4]}:${iso[5]}` : ''}`;
    const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (br) return `${br[1]}/${br[2]}/${br[3]}${br[4] ? ` ${br[4]}:${br[5]}` : ''}`;
    return str;
}

function formatarDataUsuario(valor: any): string {
    if (!valor) return '';
    if (valor instanceof Date && !isNaN(valor.getTime())) {
        return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(valor);
    }
    const str = String(valor).trim();
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{2}):(\d{2}))?/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}${iso[4] ? ` ${iso[4]}:${iso[5]}` : ''}`;
    const data = new Date(str);
    if (!isNaN(data.getTime())) {
        return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(data);
    }
    return str;
}

function turnoAmigavel(turno: any): string {
    const t = String(turno || '').toUpperCase();
    if (t === 'MATUTINO') return 'Matutino';
    if (t === 'VESPERTINO') return 'Vespertino';
    return t || 'Turno não informado';
}

function formatarPreferenciaHorario(payload: any): string {
    const tipo = String(payload?.preferencia_horario_tipo || 'SEM_PREFERENCIA').toUpperCase();
    const inicio = String(payload?.preferencia_horario_inicio || '').substring(0, 5);
    const fim = String(payload?.preferencia_horario_fim || '').substring(0, 5);
    const obs = String(payload?.preferencia_horario_obs || '').trim();

    if (!tipo || tipo === 'SEM_PREFERENCIA') return '';
    if (tipo === 'MANHA') return 'Preferência pela manhã';
    if (tipo === 'TARDE') return 'Preferência pela tarde';
    if (tipo === 'A_PARTIR' && inicio) return `A partir de ${inicio}`;
    if (tipo === 'ATE' && fim) return `Até ${fim}`;
    if (tipo === 'INTERVALO' && inicio && fim) return `${inicio} até ${fim}`;
    if (tipo === 'OBSERVACAO' && obs) return obs;
    return 'Preferência de horário informada';
}

function validarPreferenciaHorario(payload: any) {
    const tipo = String(payload?.preferencia_horario_tipo || 'SEM_PREFERENCIA').toUpperCase();
    const inicio = String(payload?.preferencia_horario_inicio || '').trim();
    const fim = String(payload?.preferencia_horario_fim || '').trim();
    const obs = String(payload?.preferencia_horario_obs || '').trim();
    const tiposPermitidos = ['SEM_PREFERENCIA', 'A_PARTIR', 'ATE', 'INTERVALO', 'OBSERVACAO', 'MANHA', 'TARDE'];
    if (!tiposPermitidos.includes(tipo)) throw new Error('Tipo de preferência de horário inválido.');
    if (tipo === 'A_PARTIR' && !inicio) throw new Error('Informe o horário inicial da preferência.');
    if (tipo === 'ATE' && !fim) throw new Error('Informe o horário final da preferência.');
    if (tipo === 'INTERVALO' && (!inicio || !fim)) throw new Error('Informe o horário inicial e final da preferência.');
    if (tipo === 'OBSERVACAO' && !obs) throw new Error('Informe a observação da preferência de horário.');
}

async function finalizarOsConsolidada(ixcOsId: string, mensagem: string, usuarioLogado?: string) {
    const usuarioIxc = await AgendaService.obterUsuarioIxcLogado(usuarioLogado);
    const registro = await AgendaService.registrarMensagemOs(ixcOsId, mensagem, usuarioLogado, 'Consolidacao OS Agendada');
    try {
        await makeIxcRequest('PUT', `/su_oss_chamado/${ixcOsId}`, {
            status: 'F',
            mensagem_resposta: mensagem,
            id_tecnico: usuarioIxc.id_funcionario_ixc
        }, 'alterar');
    } catch (erroPut: any) {
        const osAtual = registro?.osAtual || {};
        const idProcesso = osAtual.id_wfl_param_os || osAtual.id_wfl_processo || osAtual.id_processo || '';
        const idTarefaAtual = osAtual.id_wfl_tarefa || osAtual.id_tarefa_atual || osAtual.id_tarefa || '';
        if (!idProcesso || !idTarefaAtual) throw erroPut;

        const agora = new Date();
        agora.setHours(agora.getHours() - 3);
        const dataHoraAtual = agora.toISOString().replace('T', ' ').substring(0, 19);
        await makeIxcRequest('POST', '/su_oss_chamado_fechar', {
            id_chamado: ixcOsId,
            data_inicio: dataHoraAtual,
            data_final: dataHoraAtual,
            mensagem,
            id_tecnico: usuarioIxc.id_funcionario_ixc,
            status: 'F',
            data: dataHoraAtual.split(' ')[0],
            id_processo: idProcesso,
            id_tarefa_atual: idTarefaAtual,
            eh_tarefa_decisao: 'N',
            finaliza_processo: 'S'
        }, 'incluir');
    }
}

function osJaTemAgendaIxc(osData: any): boolean {
    const dataAgenda = osData?.data_agenda || osData?.data_agendamento || osData?.data_agenda_final;
    if (!dataAgenda || String(dataAgenda).startsWith('0000-00-00')) return false;
    return true;
}

function obterDataAgendaIxc(osData: any): string {
    return String(osData?.data_agenda || osData?.data_agendamento || osData?.data_agenda_final || '').trim();
}

function obterDataAgendaIxcYmd(osData: any): string {
    const valor = obterDataAgendaIxc(osData);
    const formatoBanco = valor.match(/^(\d{4}-\d{2}-\d{2})/);
    if (formatoBanco) return formatoBanco[1];

    const formatoBrasileiro = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return formatoBrasileiro
        ? `${formatoBrasileiro[3]}-${formatoBrasileiro[2]}-${formatoBrasileiro[1]}`
        : '';
}

function turnoPorDataAgendaIxc(valor: any): string {
    const match = String(valor || '').match(/(?:\s|T)(\d{2}):/);
    if (!match) return '';
    return Number(match[1]) >= 12 ? 'VESPERTINO' : 'MATUTINO';
}

function osIxcContinuaAgendada(osData: any): boolean {
    const status = String(osData?.status || '').toUpperCase();
    const dataAgenda = obterDataAgendaIxcYmd(osData);
    return Boolean(osData?.id) &&
        !['F', 'C'].includes(status) &&
        osJaTemAgendaIxc(osData) &&
        Boolean(dataAgenda) &&
        dataAgenda >= dataHojeSaoPauloYmd();
}

async function buscarOsIxcPorIdSeguro(ixcOsId: any): Promise<any | null> {
    const id = String(ixcOsId || '').trim();
    if (!id) return null;

    const resposta = await makeIxcRequest('POST', '/su_oss_chamado', {
        qtype: 'su_oss_chamado.id',
        query: id,
        oper: '=',
        rp: '1'
    });

    return resposta?.registros?.[0] || null;
}

async function sincronizarAgendamentoLocalComIxc(registroLocal: any, osIxc: any): Promise<'ATIVO' | 'STALE'> {
    if (!registroLocal?.id) return 'STALE';

    if (!osIxc || !osIxcContinuaAgendada(osIxc)) {
        const statusIxc = String(osIxc?.status || '').toUpperCase();
        const statusLocal = statusIxc === 'F' ? 'FINALIZADO' : statusIxc === 'C' ? 'CANCELADO' : 'CANCELADO';
        await executeDb(
            `UPDATE ivp_agenda_os
             SET data_agendamento = NULL,
                 turno = NULL,
                 status_interno = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [statusLocal, registroLocal.id]
        );
        return 'STALE';
    }

    const dataAgendaIxc = obterDataAgendaIxc(osIxc);
    const dataIxcYmd = obterDataAgendaIxcYmd(osIxc);
    const turnoIxc = turnoPorDataAgendaIxc(dataAgendaIxc);
    const dataLocalYmd = String(registroLocal.data_agendamento || '').substring(0, 10);
    const tecnicoIxc = String(osIxc.id_tecnico || '').trim();
    const statusLocalAtivo = tecnicoIxc && tecnicoIxc !== '0' && tecnicoIxc !== '138'
        ? 'ATRIBUIDO'
        : 'AGUARDANDO_LOGISTICA';
    const precisaSincronizar =
        (dataIxcYmd && dataIxcYmd !== dataLocalYmd) ||
        (turnoIxc && turnoIxc !== String(registroLocal.turno || '').toUpperCase()) ||
        String(registroLocal.ixc_tecnico_id || '') !== String(osIxc.id_tecnico || '');

    if (precisaSincronizar) {
        await executeDb(
            `UPDATE ivp_agenda_os
             SET data_agendamento = COALESCE(NULLIF(?, ''), data_agendamento),
                 turno = COALESCE(NULLIF(?, ''), turno),
                 ixc_tecnico_id = ?,
                 status_interno = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [dataIxcYmd, turnoIxc, osIxc.id_tecnico || 138, statusLocalAtivo, registroLocal.id]
        );
    }

    return 'ATIVO';
}

async function consolidarDuplicatasLocaisMesmaOs(registros: any[]): Promise<any | null> {
    if (!Array.isArray(registros) || registros.length === 0) return null;
    const ordenados = [...registros].sort((a, b) => Number(b.id) - Number(a.id));
    return ordenados[0];
}

async function marcarDuplicatasLocaisMesmaOs(registros: any[], idPrincipal: any): Promise<void> {
    const duplicados = (registros || []).filter(registro => String(registro.id) !== String(idPrincipal));
    for (const duplicado of duplicados) {
        await executeDb(
            `INSERT IGNORE INTO ivp_agenda_os_tags (id_agenda_os, id_tag)
             SELECT ?, id_tag FROM ivp_agenda_os_tags WHERE id_agenda_os = ?`,
            [idPrincipal, duplicado.id]
        );
        await executeDb(
            `UPDATE ivp_agenda_os
             SET data_agendamento = NULL,
                 turno = NULL,
                 status_interno = 'CANCELADO',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [duplicado.id]
        );
    }
}

const garantirCapacidadeDiaLocal = async (data: string) => {
    await AgendaService.garantirCapacidadeDia(data);
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
    const tipoUrl = String(req.query.tipo || '').toUpperCase();

    try {
        let osAberta = null;
        let ticket = null;
        let idCliente = null;
        let idContrato = null;
        const origemNormalizada = String(origem || '').toLowerCase();
        const origemCadastroBandaLarga = ['cadastro-bandalarga', 'cadastro-banda-larga'].includes(origemNormalizada);

        if (origemCadastroBandaLarga) {
            const osDiretaResp = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id', query: id_ticket, oper: '=', rp: '1'
            });
            if (osDiretaResp.registros && osDiretaResp.registros.length > 0) {
                osAberta = osDiretaResp.registros[0];
                const tResp = await makeIxcRequest('POST', '/su_ticket', {
                    qtype: 'su_ticket.id', query: osAberta.id_ticket, oper: '=', rp: '1'
                });
                if (tResp.registros && tResp.registros.length > 0) ticket = tResp.registros[0];
            }
        }

        if (!osAberta) {
            const ticketResp = await makeIxcRequest('POST', '/su_ticket', {
                qtype: 'su_ticket.id', query: id_ticket, oper: '=', rp: '1'
            });
            if (ticketResp.registros && ticketResp.registros.length > 0) {
                ticket = ticketResp.registros[0];
                
                const osResp = await makeIxcRequest('POST', '/su_oss_chamado', {
                    qtype: 'su_oss_chamado.id_ticket', query: id_ticket, oper: '=', rp: '10',
                    sortname: 'su_oss_chamado.id', sortorder: 'desc'
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
                const condResp = await executeDb('SELECT condominio FROM condominio WHERE condominioId = ?', [idCondominio]);
                if (condResp && condResp.length > 0) {
                    nomeCondominio = condResp[0].condominio;
                }
            } catch(e) {
                console.error("Erro ao buscar condominio local no agendamento:", e);
            }
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

        const origemInstalacao = ['venda', 'cadastro-bandalarga', 'cadastro-banda-larga'].includes(origemNormalizada);
        let mensagem = 'Sem descrição.';
        if (osAberta && osAberta.mensagem) mensagem = osAberta.mensagem;
        else if (ticket && ticket.menssagem) mensagem = ticket.menssagem;
        const ehRecolhimento = tipoUrl === 'RECOLHIMENTO' || AgendaService.isOsRecolhimento({
            ...(osAberta || {}),
            mensagem,
            setor: osAberta?.setor,
            id_ticket_setor: ticket?.id_ticket_setor,
            titulo: ticket?.titulo
        });
        const tipoServico = ehRecolhimento ? 'RECOLHIMENTO' : (origemInstalacao ? 'INSTALAÇÃO' : 'SUPORTE TÉCNICO');

        res.json({
            id_ticket: ticket?.id || osAberta?.id_ticket || id_ticket,
            id_os: osAberta?.id || null,
            id_atendimento: ticket?.id || osAberta?.id_ticket || null,
            cliente_id: cliente.id,
            contrato_id: idContrato || 0,
            nome: cliente.razao,
            endereco: endCompleto,
            cidade: nomeCidade, 
            mensagem: mensagem,
            tipo_servico: tipoServico,
            tipo_imovel: tipoImovel,
            ja_agendada: osAberta ? osJaTemAgendaIxc(osAberta) : false,
            data_agendamento_atual: osAberta ? obterDataAgendaIxc(osAberta) : ''
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/os-por-ticket/:id_ticket', async (req, res) => {
    const { id_ticket } = req.params;

    try {
        const osResp = await makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_ticket',
            query: id_ticket,
            oper: '=',
            rp: '20',
            sortname: 'su_oss_chamado.id',
            sortorder: 'desc'
        });

        const osAberta = (osResp.registros || []).find((os: any) => !['F', 'C'].includes(String(os.status || '').toUpperCase()));
        if (!osAberta) {
            return res.status(404).json({ error: 'Chamado criado, mas não foi possível localizar a OS para agendamento.' });
        }

        res.json({ success: true, osId: osAberta.id, ticketId: osAberta.id_ticket || id_ticket });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Erro ao localizar OS para agendamento.' });
    }
});

router.post('/confirmar', async (req, res) => {
    const startedAt = Date.now();
    const reqAny = req as any;
    const { id_ticket, id_os, os_id, id_chamado, cliente_id, contrato_id, municipio, tipo_servico, tipo_imovel, data_agendamento, turno, aceita_encaixe, usuario_logado, tag_ids, reagendar_existente, abrir_chamado_duvida, modo_reagendamento, modo } = req.body;
    const preferenciaHorarioTipo = String(req.body.preferencia_horario_tipo || 'SEM_PREFERENCIA').toUpperCase();
    const preferenciaHorarioInicio = String(req.body.preferencia_horario_inicio || '').substring(0, 5);
    const preferenciaHorarioFim = String(req.body.preferencia_horario_fim || '').substring(0, 5);
    const preferenciaHorarioObs = String(req.body.preferencia_horario_obs || '').trim().substring(0, 255);
    const solicitaPrioridadeAtiva = 0;

    console.log(`[DEBUG HUB AGENDAMENTO] Nova O.S. -> Ticket: ${id_ticket} | Contrato Capturado: ${contrato_id || 'VAZIO'} | Serviço: ${tipo_servico}`);

    try {
        logInfo('Agendamento.confirmar', 'Inicio da confirmacao de agendamento.', {
            requestId: reqAny.requestId,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            usuario: usuario_logado || reqAny.user?.username || reqAny.session?.username || 'Visitante',
            id_ticket,
            id_os,
            cliente_id,
            contrato_id,
            data_agendamento,
            turno
        });

        if (typeof aceita_encaixe !== 'boolean') {
            return res.status(400).json({ error: 'Informe se o cliente aceita encaixe antes de confirmar.' });
        }
        validarPreferenciaHorario(req.body);

        let tipoServicoDb = 'SUPORTE';
        if (String(tipo_servico).toUpperCase().includes('RECOLHIMENTO')) {
            tipoServicoDb = 'RECOLHIMENTO';
        } else if (String(tipo_servico).toUpperCase().includes('INSTALA')) {
            tipoServicoDb = 'INSTALACAO';
        }

        let ixc_os_id = id_os || id_ticket; 
        let osData: any = {};

        if (id_os) {
            const osRespDireta = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id', query: id_os, oper: '=', rp: '1'
            });
            if (osRespDireta.registros && osRespDireta.registros.length > 0) {
                osData = osRespDireta.registros[0];
                ixc_os_id = osData.id;
            }
        }

        if (!osData || !osData.id) {
            const osResp = await makeIxcRequest('POST', '/su_oss_chamado', {
                qtype: 'su_oss_chamado.id_ticket', query: id_ticket, oper: '=', rp: '10',
                sortname: 'su_oss_chamado.id', sortorder: 'desc'
            });
            
            if (osResp.registros && osResp.registros.length > 0) {
                osData = osResp.registros[0];
                ixc_os_id = osData.id;
            } else {
                const osResp2 = await makeIxcRequest('POST', '/su_oss_chamado', {
                    qtype: 'su_oss_chamado.id', query: id_ticket, oper: '=', rp: '1'
                });
                if (osResp2.registros && osResp2.registros.length > 0) {
                    osData = osResp2.registros[0];
                    ixc_os_id = osData.id;
                }
            }
        }

        if (!osData || !osData.id) {
            throw new Error('OS não localizada no IXC para agendamento.');
        }

        const clienteIdEfetivo = String(osData.id_cliente || cliente_id || '').trim();
        const contratoIdEfetivo = String(
            osData.id_contrato_kit ||
            osData.id_contrato ||
            contrato_id ||
            '0'
        ).trim();
        if (!clienteIdEfetivo) {
            throw new Error('A OS não possui cliente válido para confirmar o agendamento.');
        }

        const idsOsSolicitada = new Set(
            [ixc_os_id, id_os, os_id, id_chamado, osData.id]
                .map(valor => String(valor || '').trim())
                .filter(Boolean)
        );
        const modoExplicitoReagendamento =
            String(modo || '').toUpperCase() === 'REAGENDAMENTO' ||
            String(modo_reagendamento || '').toUpperCase() === 'REAGENDAMENTO' ||
            String(reagendar_existente) === 'true' ||
            reagendar_existente === true;
        const ambiente = process.env.NODE_ENV || 'development';
        const contextoBanco = {
            host: process.env.DB_HOST || process.env.MYSQL_HOST || 'nao_informado',
            database: process.env.DB_NAME || process.env.DB_DATABASE || process.env.MYSQL_DATABASE || 'nao_informado'
        };

        const registrosLocaisMesmaOs = await executeDb(
            `SELECT * FROM ivp_agenda_os WHERE ixc_os_id = ? ORDER BY updated_at DESC, id DESC`,
            [ixc_os_id]
        );
        const agendamentoLocalAtual = await consolidarDuplicatasLocaisMesmaOs(registrosLocaisMesmaOs || []);
        const estadoAgendamentoLocalAtual = agendamentoLocalAtual
            ? await sincronizarAgendamentoLocalComIxc(agendamentoLocalAtual, osData)
            : null;
        const agendamentoLocalAtivo = estadoAgendamentoLocalAtual === 'ATIVO'
            ? agendamentoLocalAtual
            : null;

        console.log('[Agendamento Confirmar][Duplicidade]', {
            ambiente,
            banco: contextoBanco,
            osSolicitada: String(ixc_os_id),
            contrato: contratoIdEfetivo,
            cliente: clienteIdEfetivo,
            quantidadeRegistrosMesmaOs: Array.isArray(registrosLocaisMesmaOs) ? registrosLocaisMesmaOs.length : 0,
            agendamentoLocalAtual: agendamentoLocalAtual ? {
                id: agendamentoLocalAtual.id,
                ixc_os_id: agendamentoLocalAtual.ixc_os_id,
                data_agendamento: agendamentoLocalAtual.data_agendamento,
                turno: agendamentoLocalAtual.turno,
                status_interno: agendamentoLocalAtual.status_interno
            } : null,
            decisao: agendamentoLocalAtivo || modoExplicitoReagendamento || osJaTemAgendaIxc(osData)
                ? 'MESMA_OS_REAGENDAMENTO'
                : 'NOVA_OS',
            motivo: agendamentoLocalAtivo
                ? 'Existe registro local ativo com o mesmo ixc_os_id.'
                : agendamentoLocalAtual
                    ? 'Registro local da propria OS estava stale e foi sincronizado.'
                : modoExplicitoReagendamento
                    ? 'Front informou modo de reagendamento.'
                    : osJaTemAgendaIxc(osData)
                        ? 'A propria OS possui agenda no IXC.'
                        : 'OS sem agenda anterior.'
        });

        const possiveisConflitosLocais = await executeDb(
            `SELECT *
             FROM ivp_agenda_os
             WHERE ixc_cliente_id = ?
               AND (? = 0 OR ixc_contrato_id = ?)
               AND data_agendamento >= ?
               AND (status_interno IS NULL OR status_interno NOT IN ('CANCELADO', 'FINALIZADO', 'VISITA_CANCELADA'))
             ORDER BY updated_at DESC, id DESC`,
            [clienteIdEfetivo, contratoIdEfetivo, contratoIdEfetivo, dataHojeSaoPauloYmd()]
        );

        console.log('[Agendamento Confirmar][Duplicidade]', {
            ambiente,
            banco: contextoBanco,
            osSolicitada: String(ixc_os_id),
            contrato: contratoIdEfetivo,
            cliente: clienteIdEfetivo,
            quantidadeConflitosLocais: Array.isArray(possiveisConflitosLocais) ? possiveisConflitosLocais.length : 0,
            modoSolicitado: modo || 'NAO_INFORMADO'
        });

        for (const candidatoLocal of possiveisConflitosLocais || []) {
            const mesmaOsPorIdentidade =
                idsOsSolicitada.has(String(candidatoLocal.ixc_os_id || '').trim()) ||
                String(candidatoLocal.id) === String(agendamentoLocalAtual?.id || '');

            if (mesmaOsPorIdentidade) {
                console.log('[Agendamento Confirmar][Duplicidade]', {
                    ambiente,
                    banco: contextoBanco,
                    osSolicitada: String(ixc_os_id),
                    contrato: contratoIdEfetivo,
                    cliente: clienteIdEfetivo,
                    agendamentoLocalEncontrado: candidatoLocal.id,
                    osEncontrada: candidatoLocal.ixc_os_id,
                    decisao: 'MESMA_OS_REAGENDAMENTO',
                    motivo: 'Registro local corresponde a propria OS solicitada.'
                });
                continue;
            }

            const osConflitanteIxc = await buscarOsIxcPorIdSeguro(candidatoLocal.ixc_os_id);
            const estadoLocal = await sincronizarAgendamentoLocalComIxc(candidatoLocal, osConflitanteIxc);

            console.log('[Agendamento Confirmar][Duplicidade]', {
                ambiente,
                banco: contextoBanco,
                osSolicitada: String(ixc_os_id),
                contrato: contratoIdEfetivo,
                cliente: clienteIdEfetivo,
                agendamentoLocalEncontrado: {
                    id: candidatoLocal.id,
                    ixc_os_id: candidatoLocal.ixc_os_id,
                    data_agendamento: candidatoLocal.data_agendamento,
                    turno: candidatoLocal.turno,
                    status_interno: candidatoLocal.status_interno
                },
                osEncontrada: osConflitanteIxc ? {
                    id: osConflitanteIxc.id,
                    status: osConflitanteIxc.status,
                    data_agenda: obterDataAgendaIxc(osConflitanteIxc),
                    id_tecnico: osConflitanteIxc.id_tecnico
                } : null,
                decisao: estadoLocal === 'STALE' ? 'REGISTRO_STALE_SINCRONIZADO' : 'DUPLICIDADE_REAL',
                motivo: estadoLocal === 'STALE'
                    ? 'OS local nao esta mais agendada/ativa no IXC.'
                    : 'Outra OS permanece ativa e agendada no IXC.'
            });

            if (estadoLocal === 'STALE') continue;

            await AgendaService.registrarMensagemOs(
                String(osConflitanteIxc.id),
                `[NOVO ASSUNTO]\nO usuario tentou agendar outra OS para este cliente/contrato. Novo assunto informado:\n${osData.mensagem || 'Sem descricao.'}`,
                usuario_logado,
                'Agendamento Duplicado Cliente'
            ).catch((err: any) => console.error('[Agendamento] Falha ao registrar novo assunto na OS existente:', err.message));

            await finalizarOsConsolidada(
                String(ixc_os_id),
                `OS consolidada na visita ja agendada #${osConflitanteIxc.id}. Novo assunto registrado para atendimento na mesma visita.`,
                usuario_logado
            );

            return res.status(409).json({
                code: 'CLIENTE_JA_AGENDADO',
                classification: 'DUPLICIDADE_REAL',
                error: `Este cliente ja possui outra OS agendada para ${formatarAgendaIxc(obterDataAgendaIxc(osConflitanteIxc))}. O novo assunto foi registrado na OS/agendamento ja aberto para que o tecnico trate tudo na mesma visita.`,
                agendamento: {
                    ixc_os_id: osConflitanteIxc.id,
                    data: formatarAgendaIxc(obterDataAgendaIxc(osConflitanteIxc)),
                    turno: turnoAmigavel(turnoPorDataAgendaIxc(obterDataAgendaIxc(osConflitanteIxc)))
                }
            });
        }

        const osAgendadasIxcCliente = await makeIxcRequest('POST', '/su_oss_chamado', {
            qtype: 'su_oss_chamado.id_cliente',
            query: clienteIdEfetivo,
            oper: '=',
            page: '1',
            rp: '50',
            sortname: 'su_oss_chamado.id',
            sortorder: 'desc'
        });

        const outraOsAgendadaIxc = (osAgendadasIxcCliente.registros || []).find((os: any) => {
            const mesmaOs = idsOsSolicitada.has(String(os.id || '').trim());
            const mesmoContrato =
                contratoIdEfetivo === '0' ||
                (!os.id_contrato && !os.id_contrato_kit) ||
                String(os.id_contrato) === contratoIdEfetivo ||
                String(os.id_contrato_kit) === contratoIdEfetivo;
            return !mesmaOs && mesmoContrato && osIxcContinuaAgendada(os);
        });

        if (outraOsAgendadaIxc) {
            console.log('[Agendamento Confirmar][Duplicidade]', {
                ambiente,
                banco: contextoBanco,
                osSolicitada: String(ixc_os_id),
                contrato: contratoIdEfetivo,
                cliente: clienteIdEfetivo,
                agendamentoLocalEncontrado: null,
                osEncontrada: {
                    id: outraOsAgendadaIxc.id,
                    status: outraOsAgendadaIxc.status,
                    data_agenda: obterDataAgendaIxc(outraOsAgendadaIxc),
                    id_tecnico: outraOsAgendadaIxc.id_tecnico
                },
                decisao: 'DUPLICIDADE_REAL',
                motivo: 'Outra OS ativa e agendada foi encontrada diretamente no IXC.'
            });
            await AgendaService.registrarMensagemOs(
                String(outraOsAgendadaIxc.id),
                `[AGENDAMENTO BLOQUEADO - NOVO ASSUNTO]\nO usuário tentou agendar outra OS para este cliente/contrato. Novo assunto informado:\n${osData.mensagem || 'Sem descrição.'}`,
                usuario_logado,
                'Agendamento Duplicado Cliente IXC'
            ).catch((err: any) => console.error('[Agendamento] Falha ao registrar novo assunto na OS IXC existente:', err.message));

            await finalizarOsConsolidada(
                String(ixc_os_id),
                `OS consolidada na visita já agendada #${outraOsAgendadaIxc.id}. Novo assunto registrado para atendimento na mesma visita.`,
                usuario_logado
            );

            return res.status(409).json({
                code: 'CLIENTE_JA_AGENDADO',
                classification: 'DUPLICIDADE_REAL',
                error: `Este cliente já possui uma OS agendada para ${formatarAgendaIxc(outraOsAgendadaIxc.data_agenda || outraOsAgendadaIxc.data_agendamento)}. O novo assunto foi registrado na OS/agendamento já aberto para que o técnico trate tudo na mesma visita.`,
                agendamento: {
                    ixc_os_id: outraOsAgendadaIxc.id,
                    data: formatarAgendaIxc(outraOsAgendadaIxc.data_agenda || outraOsAgendadaIxc.data_agendamento),
                    turno: 'IXC'
                }
            });
        }

        const agendamentoLocalExistente = agendamentoLocalAtual ? [agendamentoLocalAtual] : [];
        const podeReagendarExistente = modoExplicitoReagendamento;
        const modoReagendamentoEfetivo = String(modo_reagendamento || '').toUpperCase() === 'REAGENDAMENTO'
            ? 'APENAS_REAGENDAR'
            : String(modo_reagendamento || '');
        const fluxoLegadoConfirmado = String(reagendar_existente) === 'true' || reagendar_existente === true;
        if (fluxoLegadoConfirmado && typeof abrir_chamado_duvida === 'undefined') {
            return res.status(400).json({ error: 'Informe se deseja abrir chamado de dúvida para gerar novo protocolo antes do reagendamento.' });
        }

        if (fluxoLegadoConfirmado && !['COM_CHAMADO_DUVIDA', 'APENAS_REAGENDAR'].includes(modoReagendamentoEfetivo)) {
            return res.status(400).json({ error: 'Informe o modo do reagendamento.' });
        }

        if (agendamentoLocalAtivo && !podeReagendarExistente) {
            const ag = agendamentoLocalAtivo;
            return res.status(409).json({
                code: 'OS_JA_AGENDADA',
                can_reagendar: true,
                error: `Esta OS já possui agendamento para ${formatarDataUsuario(ag.data_agendamento)}, turno ${turnoAmigavel(ag.turno)}. Deseja reagendar?`,
                agendamento: {
                    data: formatarDataUsuario(ag.data_agendamento),
                    turno: turnoAmigavel(ag.turno)
                }
            });
        }

        if (osJaTemAgendaIxc(osData) && !podeReagendarExistente) {
            return res.status(409).json({
                code: 'OS_JA_AGENDADA',
                can_reagendar: true,
                error: `Esta OS já possui agendamento para ${formatarAgendaIxc(osData.data_agenda || osData.data_agendamento)}. Deseja reagendar?`,
                agendamento: {
                    data: formatarAgendaIxc(osData.data_agenda || osData.data_agendamento),
                    turno: 'IXC'
                }
            });
        }

        const tecnicoAtual = String(osData.id_tecnico || '');
        if (tecnicoAtual && tecnicoAtual !== '0' && tecnicoAtual !== '138' && !podeReagendarExistente) {
            throw new Error('Esta OS já está atribuída a um técnico no IXC e não pode ser agendada novamente por esta tela.');
        }

        const janelaSegura = AgendaService.obterJanelaAgendamentoSegura(data_agendamento, turno);
        const turnoNormalizadoAgenda = janelaSegura.turnoNormalizado;
        const dataFormatada = janelaSegura.dataBr;
        const usuarioIxc = await AgendaService.obterUsuarioIxcLogado(usuario_logado);
        let protocoloDuvida = '';
        if (podeReagendarExistente && abrir_chamado_duvida) {
            const chamadoDuvida = await AgendaService.abrirFinalizarChamadoDuvidaReagendamento(
                String(ixc_os_id),
                usuario_logado,
                'Reagendamento Duvida Agendamento'
            );
            protocoloDuvida = chamadoDuvida.protocolo;
        }
        
        const preferenciaTexto = formatarPreferenciaHorario(req.body);
        const msgAgendamento = `AGENDADO VIA INTRANET\nData: ${dataFormatada}\nTurno: ${turnoNormalizadoAgenda}\nAceita Encaixe: ${aceita_encaixe ? 'SIM' : 'NÃO'}${preferenciaTexto ? `\nPreferência de horário: ${preferenciaTexto}` : ''}${protocoloDuvida ? `\nChamado de dúvida/protocolo relacionado: ${protocoloDuvida}` : ''}\nColaborador responsável: ${usuarioIxc.nome}`;

        const dataInteracao = janelaSegura.dataInteracao;

        const payloadAgendar = {
            "id_chamado": String(ixc_os_id),
            "data_agendamento": janelaSegura.dataAgendamentoIxc,
            "data_agendamento_final": janelaSegura.dataAgendamentoFinalIxc,
            "id_resposta": "",
            "mensagem": msgAgendamento,
            // Em su_oss_chamado_reagendar, id_tecnico define o técnico destino da OS; o autor aparece na mensagem pelo usuário logado.
            "id_tecnico": "138",
            "id_equipe": "",
            "status": "AG",
            "data": dataInteracao, 
            "id_evento": "",
            "id_compromisso": "",
            "latitude": "",
            "longitude": "",
            "gps_time": ""
        };

        console.log(`\n--- [DEBUG AGENDAMENTO IXC] INICIANDO AGENDAMENTO VIA POST (su_oss_chamado_reagendar) ---`);
        console.log(`[DEBUG AGENDAMENTO IXC] OS ID: ${ixc_os_id} | Usuário: ${usuario_logado || 'não informado'} | Técnico destino: 138`);
        console.log('[DEBUG AGENDAMENTO IXC] Data/turno selecionados:', { data_agendamento, turno: turnoNormalizadoAgenda, turno_original: turno });
        console.log('[DEBUG AGENDAMENTO IXC] Janela segura calculada:', janelaSegura);
        console.log(`[DEBUG AGENDAMENTO IXC] Payload final:`, JSON.stringify(payloadAgendar, null, 2));
        
        const respAgendar = await makeIxcRequest(
            'POST',
            `/su_oss_chamado_reagendar`,
            payloadAgendar,
            'incluir'
        );
        console.log('[DEBUG AGENDAMENTO IXC] Resposta IXC:', respAgendar);

        if (respAgendar && respAgendar.type === 'error') {
            throw new Error(`IXC recusou o agendamento: ${respAgendar.message}`);
        }

        let idAgendaLocal = 0;
        const agendaAnterior = agendamentoLocalAtual ? {
            id: agendamentoLocalAtual.id,
            data: agendamentoLocalAtual.data_agendamento,
            turno: agendamentoLocalAtual.turno,
            status: agendamentoLocalAtual.status_interno
        } : null;
        if (agendamentoLocalExistente && agendamentoLocalExistente.length > 0) {
            idAgendaLocal = agendamentoLocalExistente[0].id;
            await executeDb(
                `UPDATE ivp_agenda_os
                 SET data_agendamento = ?, turno = ?, aceita_encaixe = ?, solicita_prioridade = 0, ixc_tecnico_id = 138, status_interno = 'AGUARDANDO_LOGISTICA',
                     preferencia_horario_tipo = ?, preferencia_horario_inicio = ?, preferencia_horario_fim = ?, preferencia_horario_obs = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [data_agendamento, turnoNormalizadoAgenda, aceita_encaixe ? 1 : 0, preferenciaHorarioTipo, preferenciaHorarioInicio || null, preferenciaHorarioFim || null, preferenciaHorarioObs || null, idAgendaLocal]
            );
            await marcarDuplicatasLocaisMesmaOs(registrosLocaisMesmaOs || [], idAgendaLocal);

            const tecnicoAnterior = String(agendamentoLocalAtual?.ixc_tecnico_id || '').trim();
            const estavaAtribuida = String(agendamentoLocalAtual?.status_interno || '').toUpperCase() === 'ATRIBUIDO'
                || (!!tecnicoAnterior && !['0', '138'].includes(tecnicoAnterior));
            if (estavaAtribuida) {
                await AgendaService.registrarRetornoFila(
                    ixc_os_id,
                    'Novo agendamento devolveu a OS para distribuição da logística.',
                    usuario_logado,
                    agendamentoLocalAtual?.status_interno,
                    'AGUARDANDO_LOGISTICA'
                ).catch((error: any) => logWarn('[Painel Logistica][Retorno Fila]', 'Não foi possível registrar o retorno no agendamento.', {
                    os: String(ixc_os_id),
                    code: error?.code,
                    message: error?.message
                }));
            }
        } else {
            const insertAgenda = await executeDb(
                `INSERT INTO ivp_agenda_os
                (ixc_os_id, ixc_cliente_id, ixc_contrato_id, tipo_servico, tipo_imovel, municipio_base, aceita_encaixe, solicita_prioridade, data_agendamento, turno, ixc_tecnico_id, status_interno, criado_por, preferencia_horario_tipo, preferencia_horario_inicio, preferencia_horario_fim, preferencia_horario_obs)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 138, 'AGUARDANDO_LOGISTICA', 'ATENDIMENTO', ?, ?, ?, ?)`,
                [
                    ixc_os_id,
                    clienteIdEfetivo,
                    contratoIdEfetivo,
                    tipoServicoDb,
                    tipo_imovel,
                    municipio,
                    aceita_encaixe ? 1 : 0,
                    solicitaPrioridadeAtiva,
                    data_agendamento,
                    turnoNormalizadoAgenda,
                    preferenciaHorarioTipo,
                    preferenciaHorarioInicio || null,
                    preferenciaHorarioFim || null,
                    preferenciaHorarioObs || null
                ]
            );
            idAgendaLocal = insertAgenda.insertId;
        }

        console.log('[Agendamento Confirmar][Duplicidade]', {
            ambiente,
            banco: contextoBanco,
            osSolicitada: String(ixc_os_id),
            contrato: contratoIdEfetivo,
            cliente: clienteIdEfetivo,
            decisao: agendaAnterior ? 'MESMA_OS_REAGENDAMENTO_ATUALIZADA' : 'NOVA_OS_INSERIDA',
            agendamentoLocalId: idAgendaLocal,
            agendaAnterior,
            agendaNova: {
                data: data_agendamento,
                turno: turnoNormalizadoAgenda,
                tecnico: 138,
                status: 'AGUARDANDO_LOGISTICA'
            }
        });

        const tagsSelecionadas = Array.isArray(tag_ids) ? tag_ids.map(String).filter(Boolean) : [];
        if (idAgendaLocal) {
            await executeDb('DELETE FROM ivp_agenda_os_tags WHERE id_agenda_os = ?', [idAgendaLocal]);
        }
        for (const idTag of tagsSelecionadas) {
            await executeDb(
                'INSERT IGNORE INTO ivp_agenda_os_tags (id_agenda_os, id_tag) VALUES (?, ?)',
                [idAgendaLocal, idTag]
            );
        }

        console.log(`--- [DEBUG AGENDAMENTO IXC] SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO ---\n`);

        logInfo('Agendamento.confirmar', 'Confirmacao de agendamento concluida.', {
            requestId: reqAny.requestId,
            ixc_os_id,
            idAgendaLocal,
            duracaoMs: Date.now() - startedAt
        });

        res.json({ success: true, message: "Agendamento confirmado com sucesso!", requestId: reqAny.requestId });
    } catch (error: any) {
        console.error("[Erro Agendamento Confirmar]:", error.message);
        console.error("[DEBUG AGENDAMENTO IXC] Erro completo:", error.response?.data || error.message);
        logError('Agendamento.confirmar', error, {
            requestId: reqAny.requestId,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            usuario: usuario_logado || reqAny.user?.username || reqAny.session?.username || 'Visitante',
            id_ticket,
            id_os,
            cliente_id,
            contrato_id,
            data_agendamento,
            turno,
            duracaoMs: Date.now() - startedAt
        });
        res.status(500).json({
            error: process.env.NODE_ENV === 'production' ? 'Erro interno ao processar solicitação.' : error.message,
            requestId: reqAny.requestId
        });
    }
});

function dataHojeSaoPaulo(): string {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function ymdFromDateLocal(date: Date): string {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function obterInicioSemanaYmd(valor?: any): string {
    const baseTexto = String(valor || '').trim() || dataHojeSaoPaulo();
    const base = new Date(`${baseTexto.substring(0, 10)}T12:00:00`);
    if (isNaN(base.getTime())) return obterInicioSemanaYmd(dataHojeSaoPaulo());
    const dia = base.getDay();
    const diffSegunda = dia === 0 ? -6 : 1 - dia;
    base.setDate(base.getDate() + diffSegunda);
    return ymdFromDateLocal(base);
}

function addDiasYmd(ymd: string, dias: number): string {
    const data = new Date(`${ymd}T12:00:00`);
    data.setDate(data.getDate() + dias);
    return ymdFromDateLocal(data);
}

function labelDiaSemana(ymd: string): string {
    const data = new Date(`${ymd}T12:00:00`);
    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        timeZone: 'America/Sao_Paulo'
    }).format(data);
}

async function responderVagasSemanaCompleta(req: Express.Request, res: Express.Response) {
    const reqAny = req as any;
    const inicio = obterInicioSemanaYmd(req.query.inicio);
    const fim = addDiasYmd(inicio, 6);
    const municipioSolicitado = String(req.query.municipio || 'TODOS');
    const tipoSolicitado = String(req.query.tipo || 'TODOS');

    try {
        logInfo('[Vagas Agenda]', 'Consulta semanal iniciada.', {
            requestId: reqAny.requestId,
            inicio,
            fim,
            municipio: municipioSolicitado,
            tipo: tipoSolicitado,
            usuario: reqAny.user?.username || reqAny.session?.username || 'Visitante'
        });
        const { municipio, tipo, resumoPorData } = await AgendaService.obterResumoVagasPeriodo(
            inicio,
            fim,
            municipioSolicitado,
            tipoSolicitado
        );

        const dias = [];

        for (let i = 0; i < 7; i++) {
            const data = addDiasYmd(inicio, i);
            dias.push({
                data,
                label: labelDiaSemana(data),
                passado: data < dataHojeSaoPaulo(),
                capacidades: resumoPorData[data] || {}
            });
        }

        logInfo('[Vagas Agenda]', 'Consulta semanal concluida.', {
            requestId: reqAny.requestId,
            inicio,
            fim,
            municipio: municipioSolicitado,
            tipo: tipoSolicitado,
            dias: dias.length
        });

        res.json({ success: true, inicio, fim, municipio, tipo, dias });
    } catch (error: any) {
        logError('[Vagas Agenda]', error, {
            requestId: reqAny.requestId,
            inicio,
            fim,
            municipio: municipioSolicitado,
            tipo: tipoSolicitado,
            usuario: reqAny.user?.username || reqAny.session?.username || 'Visitante'
        });
        res.status(500).json({
            success: false,
            error: 'Erro ao consultar vagas da agenda.',
            requestId: reqAny.requestId
        });
    }
}

router.get('/vagas-semana', async (req, res) => {
    if (req.query.inicio || !req.query.data_inicio) {
        return responderVagasSemanaCompleta(req, res);
    }

    const { data_inicio, data_fim, municipio, tipo_servico, tipo_imovel } = req.query;

    try {
        const inicio = new Date(String(data_inicio) + 'T12:00:00');
        const fim = new Date(String(data_fim) + 'T12:00:00');
        const cursor = new Date(inicio);
        while (cursor <= fim) {
            const d = cursor.toISOString().split('T')[0];
            await garantirCapacidadeDiaLocal(d);
            cursor.setDate(cursor.getDate() + 1);
        }

        const capResult = await executeDb('SELECT * FROM ivp_agenda_capacidade WHERE data >= ? AND data <= ?', [data_inicio, data_fim]);
        const agendamentos = await executeDb(
            `SELECT data_agendamento, turno, tipo_servico, tipo_imovel, municipio_base, status_interno
             FROM ivp_agenda_os
             WHERE data_agendamento >= ? AND data_agendamento <= ?
               AND turno IN ('MATUTINO', 'VESPERTINO')
               AND (status_interno IS NULL OR status_interno NOT IN ('CANCELADO', 'VISITA_CANCELADA'))`,
            [data_inicio, data_fim]
        );

        const tipoServicoSolicitado = String(tipo_servico).toUpperCase();
        const isRecolhimento = tipoServicoSolicitado.includes('RECOLHIMENTO');
        const isInstalacao = tipoServicoSolicitado.includes('INSTALA');
        const normalizarTextoVaga = (valor: any) => String(valor || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
        const isSerra = normalizarTextoVaga(municipio).includes('SERRA');
        const isPredio = normalizarTextoVaga(tipo_imovel) === 'PREDIO';

        const formatDbDate = (d: Date) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().split('T')[0];
        };

        const isPredioStr = (str: string) => {
            const s = normalizarTextoVaga(str);
            return s.includes('PREDIO');
        };

        let countFilter = (os: any) => false;
        if (isRecolhimento) {
            countFilter = (os: any) => String(os.tipo_servico).toUpperCase().includes('RECOLHIMENTO');
        } else if (isInstalacao) {
            countFilter = isSerra
                ? (os: any) => String(os.tipo_servico).toUpperCase().includes('INSTALA') && String(os.municipio_base).toUpperCase().includes('SERRA') && (isPredio ? isPredioStr(os.tipo_imovel) : !isPredioStr(os.tipo_imovel))
                : (os: any) => String(os.tipo_servico).toUpperCase().includes('INSTALA') && !String(os.municipio_base).toUpperCase().includes('SERRA') && (isPredio ? isPredioStr(os.tipo_imovel) : !isPredioStr(os.tipo_imovel));
        } else {
            if (!isPredio) {
                countFilter = (os: any) => !String(os.tipo_servico).toUpperCase().includes('INSTALA') && !String(os.tipo_servico).toUpperCase().includes('RECOLHIMENTO') && !isPredioStr(os.tipo_imovel);
            } else {
                countFilter = isSerra
                    ? (os: any) => !String(os.tipo_servico).toUpperCase().includes('INSTALA') && !String(os.tipo_servico).toUpperCase().includes('RECOLHIMENTO') && isPredioStr(os.tipo_imovel) && String(os.municipio_base).toUpperCase().includes('SERRA')
                    : (os: any) => !String(os.tipo_servico).toUpperCase().includes('INSTALA') && !String(os.tipo_servico).toUpperCase().includes('RECOLHIMENTO') && isPredioStr(os.tipo_imovel) && !String(os.municipio_base).toUpperCase().includes('SERRA');
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
            if (isRecolhimento) {
                cap_m = Number(capacidade.recolhimento_serra_m || 0) + Number(capacidade.recolhimento_outros_m || 0);
                cap_t = Number(capacidade.recolhimento_serra_t || 0) + Number(capacidade.recolhimento_outros_t || 0);
            } else if (isInstalacao) {
                if (isSerra && isPredio) { cap_m = capacidade.inst_predio_serra_m ?? capacidade.inst_serra_m; cap_t = capacidade.inst_predio_serra_t ?? capacidade.inst_serra_t; }
                else if (isSerra) { cap_m = capacidade.inst_casa_serra_m ?? capacidade.inst_serra_m; cap_t = capacidade.inst_casa_serra_t ?? capacidade.inst_serra_t; }
                else if (isPredio) { cap_m = capacidade.inst_predio_outros_m ?? capacidade.inst_outros_m; cap_t = capacidade.inst_predio_outros_t ?? capacidade.inst_outros_t; }
                else { cap_m = capacidade.inst_casa_outros_m ?? capacidade.inst_outros_m; cap_t = capacidade.inst_casa_outros_t ?? capacidade.inst_outros_t; }
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

        const agoraSaoPaulo = AgendaService.dataHoraAtualSaoPaulo();
        const hojeSaoPaulo = agoraSaoPaulo.substring(0, 10);
        const horaSaoPaulo = agoraSaoPaulo.substring(11, 19);

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

            const encerrarMatutino = dStr < hojeSaoPaulo || (dStr === hojeSaoPaulo && horaSaoPaulo >= '11:30:00');
            const encerrarVespertino = dStr < hojeSaoPaulo || (dStr === hojeSaoPaulo && horaSaoPaulo >= '17:30:00');

            if (encerrarMatutino) {
                result[dStr].matutino = { vagas: 0, disponivel: false, msg: 'Turno encerrado' };
            }
            if (encerrarVespertino) {
                result[dStr].vespertino = { vagas: 0, disponivel: false, msg: 'Turno encerrado' };
            }
        }

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
