// routes/api/v5/ixc.ts
import * as Express from 'express';
import axios, { Method } from 'axios';

const router = Express.Router();

const makeIxcRequest = async (method: Method, endpoint: string, data: any = null, operationType: 'listar' | 'incluir' | 'alterar' | null = null) => {
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const token = process.env.IXC_API_TOKEN; 

    if (!url || !token) {
        throw new Error('IXC_API_URL ou IXC_API_TOKEN não definidos no .env');
    }

    const headers: any = {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    if (data && data.qtype) {
        headers['ixcsoft'] = 'listar';
        method = 'POST'; 
    } else if (operationType) {
        headers['ixcsoft'] = operationType;
    }

    try {
        const response = await axios({
            method: method,
            url: url,
            headers: headers,
            data: data 
        });
        return response.data;
    } catch (error) {
        console.error(`Erro ao chamar API IXC (${endpoint}):`, error.response?.data || error.message);
        const ixcError = error.response?.data;
        let ixcErrorMessage = "Erro desconhecido";
        if (typeof ixcError === 'object' && ixcError !== null) {
            ixcErrorMessage = ixcError.mensagem || ixcError.message || ixcError.msg || JSON.stringify(ixcError);
        } else if (typeof ixcError === 'string') {
            ixcErrorMessage = ixcError;
        }
        ixcErrorMessage = ixcErrorMessage.replace(/<br \/>/g, ' ').replace(/<br>/g, ' ');
        
        throw new Error(`Falha ao comunicar com o IXC: ${ixcErrorMessage}`);
    }
};

const getIxcDate = () => {
    const now = new Date();
    now.setHours(now.getHours() - 3); 
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

const getIxcDateDMY = () => {
    const now = new Date();
    now.setHours(now.getHours() - 3);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
};

const getModeloPlano = (idPlano: string): string => {
    const map = {
        '7878': '12',
        '7879': '4',
        '7881': '13',
        '7887': '12',
        '8001': '13',
        '8000': '19',
        '7999': '14'
    };
    return map[idPlano] || '1';
};

const getTipoContratoPorVencimento = (diaVencimento: string): string => {
    const map = {
        '5': '5',
        '10': '10',
        '15': '15',
        '20': '20'
    };
    return map[diaVencimento] || '10';
};

function formatarCPF(cpf: string): string {
    if (!cpf) return '';
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return cpf;
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarDataNasParaDMY(dataYMD: string): string {
    if (!dataYMD || dataYMD.length !== 10) return dataYMD;
    try {
        const [year, month, day] = dataYMD.split('-');
        if (!year || !month || !day) return dataYMD;
        return `${day}-${month}-${year}`;
    } catch (e) {
        console.error("Erro ao formatar data_nascimento:", e);
        return dataYMD;
    }
}

async function getFinancialStatus(clientId: string): Promise<boolean> {
    const financeiroPayload = {
        "qtype": "fn_areceber.id_cliente",
        "query": clientId,
        "oper": "=",
        "rp": "500",
        "sortname": "fn_areceber.data_vencimento",
        "sortorder": "asc",
        "grid_param": JSON.stringify([
            {"TB":"fn_areceber.liberado", "OP" : "=", "P" : "S"},
            {"TB":"fn_areceber.status", "OP" : "!=", "P" : "C"},
            {"TB":"fn_areceber.status", "OP" : "!=", "P" : "R"}
        ])
    };

    try {
        console.log(`Verificando financeiro do ID: ${clientId}`);
        const financeiroResponse = await makeIxcRequest('POST', '/fn_areceber', financeiroPayload);
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (financeiroResponse && financeiroResponse.total > 0) {
            for (const titulo of financeiroResponse.registros) {
                const vencimento = new Date(titulo.data_vencimento);
                if (vencimento < hoje) {
                    console.log(`Cliente ${clientId} POSSUI atraso.`);
                    return true;
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao verificar financeiro do cliente ${clientId}:`, error.message);
        return false;
    }
    
    console.log(`Cliente ${clientId} NÂO possui atraso.`);
    return false;
}

router.get('/vendedores', async (req, res) => {
    try {
        const params = { qtype: 'vendedor.status', query: 'A', oper: '=', page: '1', rp: '1000', sortname: 'vendedor.nome', sortorder: 'asc' };
        const ixcResponse = await makeIxcRequest('POST', '/vendedor', params);
        if (!ixcResponse || !ixcResponse.registros) throw new Error("Resposta inesperada da API IXC para vendedores.");
        const vendedores = ixcResponse.registros.map((v: any) => ({ id: v.id, nome: v.nome }));
        res.json(vendedores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/planos-home', async (req, res) => {
    try {
        const params = { qtype: 'vd_contratos.Ativo', query: 'S', oper: '=', page: '1', rp: '5000', sortname: 'vd_contratos.nome', sortorder: 'asc' };
        const ixcResponse = await makeIxcRequest('POST', '/vd_contratos', params);
        if (!ixcResponse || !ixcResponse.registros) throw new Error("Resposta inesperada da API IXC para planos.");
        const planosHome = ixcResponse.registros
            .filter((plano: any) => plano.nome && plano.nome.toUpperCase().includes('HOME'))
            .map((plano: any) => ({ id: plano.id, nome: plano.nome }));
        res.json(planosHome);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/planos-ativos', async (req, res) => {
    try {
        const params = { qtype: 'vd_contratos.Ativo', query: 'S', oper: '=', page: '1', rp: '5000', sortname: 'vd_contratos.nome', sortorder: 'asc' };
        const ixcResponse = await makeIxcRequest('POST', '/vd_contratos', params);
        if (!ixcResponse || !ixcResponse.registros) throw new Error("Resposta inesperada da API IXC para planos.");
        
        const todosPlanos = ixcResponse.registros.map((plano: any) => ({ 
            id: plano.id, 
            nome: plano.nome,
            valor_contrato: parseFloat(plano.valor_contrato || 0)
        }));
        
        res.json(todosPlanos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function cadastrarCliente(clientData: any, dataCadastro: string): Promise<string> {
    console.log("Iniciando Etapa 1: Cadastro do Cliente...");
    const today = dataCadastro.split(' ')[0];
    
    const clientePayload = {
        'ativo': 'S', 'pais': 'Brasil',
        'nacionalidade': 'Brasileiro',
        'contribuinte_icms': 'N', 'filial_id': '3', 'filtra_filial': 'S', 'tipo_localidade': 'U',
        'acesso_automatico_central': 'P', 'alterar_senha_primeiro_acesso': 'P', 'senha_hotsite_md5': 'N',
        'hotsite_acesso': '0', 'crm': 'S', 'status_prospeccao': 'V', 'cadastrado_via_viabilidade': 'N',
        'participa_cobranca': 'S', 'participa_pre_cobranca': 'S', 'cob_envia_email': 'S',
        'cob_envia_sms': 'S', 'tipo_pessoa_titular_conta': 'F', 'orgao_publico': 'N',
        'iss_classificacao_padrao': '99', 'data_cadastro': today, 'ultima_atualizacao': dataCadastro,
        'tipo_pessoa': clientData.tipo_pessoa,
        'tipo_cliente_scm': clientData.tipo_cliente_scm,
        'id_tipo_cliente': clientData.id_tipo_cliente,
        'tipo_assinante': clientData.tipo_assinante,
        'razao': clientData.nome,
        'cnpj_cpf': formatarCPF(clientData.cnpj_cpf),
        'ie_identidade': clientData.ie_identidade, 'data_nascimento': formatarDataNasParaDMY(clientData.data_nascimento),
        'fone': clientData.telefone_celular, 'telefone_celular': clientData.telefone_celular,
        'whatsapp': clientData.whatsapp, 'email': clientData.email, 
        'cep': clientData.cep,
        'endereco': clientData.endereco, 'numero': clientData.numero, 'complemento': clientData.complemento,
        'bairro': clientData.bairro, 'cidade': clientData.cidade, 'uf': clientData.uf,
        'bloco': clientData.bloco, 'apartamento': clientData.apartamento,
        'referencia': clientData.referencia, 'id_condominio': clientData.id_condominio,
        'id_vendedor': clientData.id_vendedor, 'obs': clientData.obs,
        'hotsite_email': clientData.cnpj_cpf.replace(/\D/g,''),
        'senha': clientData.cnpj_cpf.replace(/\D/g,'')
    };

    //console.log("Cliente Payload (Etapa 1):", JSON.stringify(clientePayload, null, 2));
    const clienteResponse = await makeIxcRequest('POST', '/cliente', clientePayload);
    console.log("Resposta da API IXC (Etapa 1):", clienteResponse);

    if (!clienteResponse || !clienteResponse.id) {
        const errorMessage = clienteResponse.message || clienteResponse.mensagem || clienteResponse.msg || 'Resposta inválida do IXC.';
        throw new Error(`Falha ao cadastrar cliente: ${errorMessage}`);
    }
    console.log(`Etapa 1 OK: Cliente ID ${clienteResponse.id} criado.`);
    return clienteResponse.id;
}

async function criarContrato(novoClienteId: string, clientData: any, dataCadastro: string, nomePlano: string): Promise<string> {
    console.log("Iniciando Etapa 2: Criação do Contrato...");
    const today = dataCadastro.split(' ')[0];
    const idTipoContrato = getTipoContratoPorVencimento(clientData.data_vencimento);
    const idModelo = getModeloPlano(clientData.id_plano_ixc);

    const contratoPayload = {
        'id_cliente': novoClienteId,
        'id_vd_contrato': clientData.id_plano_ixc,
        'id_vendedor': clientData.id_vendedor,
        'dia_fixo_vencimento': clientData.data_vencimento,
        'obs': clientData.obs,
        'endereco_padrao_cliente': 'N',
        'cep': clientData.cep,
        'endereco': clientData.endereco,
        'numero': clientData.numero,
        'bairro': clientData.bairro,
        'cidade': clientData.cidade,
        'complemento': clientData.complemento,
        'bloco': clientData.bloco,
        'apartamento': clientData.apartamento,
        'referencia': clientData.referencia,
        'id_condominio': clientData.id_condominio,
        'tipo': 'I',
        'id_filial': clientData.id_filial,
        'data_assinatura': today,
        'data': getIxcDateDMY(),
        'status': 'P',
        'status_internet': 'AA',
        'status_velocidade': 'N',
        'motivo_inclusao': 'I',
        'contrato': nomePlano,
        'id_tipo_contrato': idTipoContrato,
        'id_modelo': idModelo,
        'id_tipo_documento': '501',
        'id_carteira_cobranca': clientData.id_carteira_cobranca,
        'cc_previsao': 'P',
        'tipo_cobranca': 'P',
        'renovacao_automatica': 'S',
        'base_geracao_tipo_doc': 'P',
        'bloqueio_automatico': clientData.bloqueio_automatico,
        'aviso_atraso': 'S',
        'fidelidade': '12',
        'ultima_atualizacao': dataCadastro,
        'liberacao_bloqueio_manual': 'P',
        'assinatura_digital': 'P',
        'integracao_assinatura_digital': 'P',
        'tipo_produtos_plano': 'P',
        'gerar_finan_assin_digital_contrato': 'P',
        'agrupar_financeiro_contrato': 'P',
        'aplicar_desconto_tempo_bloqueio': 'P',
        'desbloqueio_confianca': 'P',
        'liberacao_suspensao_parcial': 'P',
        'document_photo': 'P',
        'selfie_photo': 'P'
    };

    //console.log("Contrato Payload (Etapa 2):", JSON.stringify(contratoPayload, null, 2));
    const contratoResponse = await makeIxcRequest('POST', '/cliente_contrato', contratoPayload);
    console.log("Resposta da API IXC (Etapa 2):", contratoResponse);

    if (!contratoResponse || !contratoResponse.id) {
        const errorMessage = contratoResponse.message || contratoResponse.msg || 'Resposta inválida do IXC.';
        throw new Error(`Falha ao criar contrato: ${errorMessage}`);
    }
    console.log(`Etapa 2 OK: Contrato ID ${contratoResponse.id} criado.`);
    return contratoResponse.id;
}

const getGrupoRadiusPorPlano = (idPlano: string): string => {
    const map = {
        '7878': '3336',
        '7879': '3337',
        '7881': '3339',
        '7887': '3346',
        '8001': '6381',
        '8000': '6426',
        '7999': '6561',
        '7986': '6562',
        '7988': '10248', 
        '7989': '10251', 
        '7813': '3270', 
        '7891': '6350', 
        '7803': '3260', 
        '6597': '2050', 
        '51': '2034', 
        '6598': '2051', 
        '6599': '2052', 
        '7951': '6507', 
        '7821': '9092', 
        '7948': '9354', 
        '6': '11004', 
        '6601': '6652', 
        '7992': '10958', 
        '7945': '9348', 
        '7949': '9356', 
        '7929': '9316', 
        '6446': '6446', 
        '7793': '9036', 
        '7894': '9242', 
        '7873': '9198', 
        '7934': '9327', 
        '7944': '9346', 
        '7870': '9192', 
        '7942': '9342', 
        '7895': '9244', 
        '7933': '9324', 
        '7809': '9068', 
        '7892': '9238', 
        '7930': '9318', 
        '7806': '9062', 
        '7919': '9294', 
        '7922': '9300', 
        '7931': '9320', 
        '7815': '9080', 
        '7937': '9332', 
        '7946': '9350', 
        '7938': '9334', 
        '7939': '9336', 
        '7940': '9338', 
        '7941': '9340', 
        '7920': '9296', 
        '7796': '9042', 
        '7804': '9058', 
        '7910': '9275', 
        '7904': '9262', 
        '7883': '9218', 
        '7911': '9277', 
        '7893': '9240', 
        '7912': '9279', 
        '7928': '9314', 
        '7927': '9312', 
        '7913': '9281', 
        '7985': '9880'
    };
    
    return map[idPlano]; 
};

async function criarLogin(novoClienteId: string, novoContratoId: string, clientData: any, dataCadastro: string): Promise<string> {
    
    const idGrupoRadius = getGrupoRadiusPorPlano(clientData.id_plano_ixc);
    
    for (let tentativa = 1; tentativa <= 50; tentativa++) {
        
        const loginSufixo = (tentativa === 1) ? '' : `_${tentativa}`;
        const login = `${novoClienteId}${loginSufixo}`;
        const senha = `ivp@${novoClienteId}`;

        console.log(`Iniciando Etapa 3 (Tentativa ${tentativa}): Criação do Login PPPoE '${login}'...`);

        const loginPayload = {
            'id_cliente': novoClienteId,
            'id_contrato': novoContratoId,
            'login': login,
            'senha': senha,
            'endereco_padrao_cliente': 'S',
            'cep': clientData.cep, 'endereco': clientData.endereco, 'numero': clientData.numero,
            'bairro': clientData.bairro, 'cidade': clientData.cidade, 'complemento': clientData.complemento,
            'bloco': clientData.bloco, 'apartamento': clientData.apartamento,
            'referencia': clientData.referencia, 'id_condominio': clientData.id_condominio,
            'id_filial': clientData.id_filial, 
            'ativo': 'S',
            'autenticacao': 'L',
            'login_simultaneo': '1',
            'auto_preencher_ip': 'H', 
            'fixar_ip': 'H', 
            'relacionar_ip_ao_login': 'H',
            'tipo_vinculo_plano': 'D',
            'ultima_atualizacao': dataCadastro,
            'id_grupo': idGrupoRadius, 
            'tipo_conexao_mapa': '58',
            'autenticacao_por_mac': 'P',
            'auto_preencher_mac': 'H', 
            'relacionar_mac_ao_login': 'H',
            'senha_md5': 'N',
            "online": "SS",
        };

        //console.log(`Login Payload (Etapa 3, Tentativa ${tentativa}):`, JSON.stringify(loginPayload, null, 2));

        try {
            const loginResponse = await makeIxcRequest('POST', '/radusuarios', loginPayload);
            console.log("Resposta da API IXC (Etapa 3):", loginResponse);

            if (loginResponse && loginResponse.id) {
                console.log(`Etapa 3 OK: Login PPPoE ID ${loginResponse.id} criado com o login '${login}'.`);
                return loginResponse.id;
            }

            const errorMessage = (loginResponse.message || loginResponse.msg || 'Resposta inválida do IXC.').replace(/<br \/>/g, ' ');
            
            if (errorMessage.includes("Login já existe!")) {
                console.log(`Login '${login}' já existe. Tentando próximo...`);
            } else {
                throw new Error(`Falha ao criar login PPPoE: ${errorMessage}`);
            }

        } catch (error) {
            if (error.message && error.message.includes("Login já existe!")) {
                console.log(`Login '${login}' já existe (erro capturado). Tentando próximo...`);
            } else {
                throw error;
            }
        }
    }

    throw new Error("Falha ao criar login PPPoE: Login já existe e 10 tentativas falharam.");
}

const buildMensagemAtendimento = (data: any, planoNome: string): string => {
    const telefones = (data.whatsapp && data.whatsapp !== data.telefone_celular)
        ? `${data.telefone_celular} / ${data.whatsapp}`
        : data.telefone_celular;

    const endereco = [
        data.endereco,
        data.numero,
        data.bairro
    ].filter(Boolean).join(', ');

    const enderecoCompleto = [
        endereco,
        data.complemento,
        data.referencia ? `(Ref: ${data.referencia})` : ''
    ].filter(Boolean).join(' - ');
    const cpfLimpo = data.cnpj_cpf ? data.cnpj_cpf.replace(/\D/g, '') : '';

    return `
Venda finalizada com sucesso! Cliente, Contrato, Login, Atendimento e OS criados.

OBS: ${data.obs || 'Não informado'}

NOME COMPLETO: ${data.nome}
NÚMERO DO CPF/CNPJ: ${cpfLimpo}
NÚMERO DO RG: ${data.ie_identidade}
DATA DE NASCIMENTO: ${data.data_nascimento}
DOIS TELEFONES DE CONTATO: ${telefones || 'Não informado'}
E-MAIL COMPLETO: ${data.email}
PLANO ESCOLHIDO: ${planoNome}
DATA DE VENCIMENTO (5, 10, 15 OU 20): ${data.data_vencimento}
ENDEREÇO COMPLETO COM PONTO DE REFERÊNCIA: ${enderecoCompleto}
    `.trim().replace(/\n/g, '\r\n');
};

async function abrirAtendimentoOS(novoClienteId: string, clientData: any, nomePlano: string, novoLoginId:string, novoContratoId:string): Promise<string> {
    console.log("Iniciando Etapa 4: Abertura de Atendimento/OS Unificado...");
    
    const mensagem_padrao = buildMensagemAtendimento(clientData, nomePlano);

    const atendimentoPayload = {
        "id_cliente": novoClienteId,
        "assunto_ticket": clientData.assunto_ticket,
        "id_assunto": clientData.id_assunto,
        "id_wfl_processo": clientData.id_wfl_processo,
        "titulo": clientData.titulo_atendimento,
        "origem_endereco": "CC", 
        "status": "OSAB",       
        "su_status": "EP",      
        "id_ticket_setor": "4", 
        "prioridade": "M",      
        "id_responsavel_tecnico": "138",
        "id_filial": clientData.id_filial,       
        "id_usuarios": "61",    
        "tipo": "C", 
        "menssagem": mensagem_padrao,
        "id_login": novoLoginId,
        "id_contrato": novoContratoId
    };

    //console.log("Atendimento/OS Payload (Etapa 4):", JSON.stringify(atendimentoPayload, null, 2));
    
    const atendimentoResponse = await makeIxcRequest('POST', '/su_ticket', atendimentoPayload, 'incluir');

    console.log("Resposta da API IXC (Etapa 4):", atendimentoResponse);

    const ticketId = atendimentoResponse.id || atendimentoResponse.id_su_ticket;

    if (!atendimentoResponse || !ticketId) {
        const errorMessage = (atendimentoResponse.message || atendimentoResponse.msg || 'Resposta inválida do IXC.').replace(/<br \/>/g, ' ');
        throw new Error(`Falha ao abrir atendimento/OS unificado: ${errorMessage}`);
    }

    console.log(`Etapa 4 OK: Atendimento/OS ID ${ticketId} criado.`);
    return ticketId.toString(); 
}

async function atualizarCliente(clientId: string, clientData: any, dataCadastro: string): Promise<void> {
    console.log(`Iniciando Etapa 1.5: Atualização (PUT) do Cliente ID ${clientId}...`);
    const today = dataCadastro.split(' ')[0];

    const updatePayload = {
        'ativo': 'S', 'tipo_pessoa': 'F', 'tipo_cliente_scm': clientData.tipo_cliente_scm, 'pais': 'Brasil',
        'nacionalidade': 'Brasileiro', 'tipo_assinante': clientData.tipo_assinante, 'id_tipo_cliente': clientData.id_tipo_cliente,
        'contribuinte_icms': 'N', 'filial_id': '3', 'filtra_filial': 'S', 'tipo_localidade': 'U',
        'acesso_automatico_central': 'P', 'alterar_senha_primeiro_acesso': 'P', 'senha_hotsite_md5': 'N',
        'hotsite_acesso': '0', 'crm': 'S', 'status_prospeccao': 'V', 'cadastrado_via_viabilidade': 'N',
        'participa_cobranca': 'S', 'participa_pre_cobranca': 'S', 'cob_envia_email': 'S',
        'cob_envia_sms': 'S', 'tipo_pessoa_titular_conta': 'F', 'orgao_publico': 'N',
        'iss_classificacao_padrao': '99', 'data_cadastro': today, 'ultima_atualizacao': dataCadastro,
        'hotsite_email': clientData.cnpj_cpf.replace(/\D/g,''),
        'senha': clientData.cnpj_cpf.replace(/\D/g,''),
        'razao': clientData.nome,
        'cnpj_cpf': formatarCPF(clientData.cnpj_cpf),
        
        'ie_identidade': clientData.ie_identidade,
        'data_nascimento': formatarDataNasParaDMY(clientData.data_nascimento),
        'fone': clientData.telefone_celular,
        'telefone_celular': clientData.telefone_celular,
        'whatsapp': clientData.whatsapp,
        'email': clientData.email,
        
        // Endereço
        'cep': clientData.cep,
        'endereco': clientData.endereco,
        'numero': clientData.numero,
        'complemento': clientData.complemento,
        'bairro': clientData.bairro,
        'cidade': clientData.cidade,
        'uf': clientData.uf,
        'bloco': clientData.bloco,
        'apartamento': clientData.apartamento,
        'referencia': clientData.referencia,
        'id_condominio': clientData.id_condominio
    };

    const updateResponse = await makeIxcRequest(
        'PUT',
        `/cliente/${clientId}`, 
        updatePayload,
        'alterar' 
    ); 

    console.log("Resposta da API IXC (Etapa 1.5 - Update):", updateResponse);
    if (!updateResponse || (updateResponse.message && !updateResponse.message.includes('sucesso'))) {
        console.warn(`Aviso na Etapa 1.5: ${updateResponse.message || 'Resposta inesperada.'}`);
    }
    
    console.log(`Etapa 1.5 OK: Cliente ID ${clientId} atualizado.`);
}

async function ajustarFinanceiroContrato(contratoId: string, valorAcordadoStr: string, idPlano: string) {
    console.log(`Iniciando Etapa 5: Ajuste Financeiro no Contrato ${contratoId} (Plano Ref: ${idPlano})`);

    if (!valorAcordadoStr || valorAcordadoStr.trim() === '') {
        console.log("Nenhum valor acordado informado.");
        return;
    }

    const valorAcordado = parseFloat(valorAcordadoStr.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
    
    if (isNaN(valorAcordado) || valorAcordado <= 0) {
        console.log(`Valor acordado inválido: ${valorAcordadoStr}.`);
        return;
    }

    const targetSCM = valorAcordado * 0.20; // 20% para SCM (Internet)
    const targetSVA = valorAcordado * 0.80; // 80% para SVA (Serviços)

    const produtosPayload = {
        "qtype": "vd_contratos_produtos.id_vd_contrato",
        "query": idPlano,
        "oper": "=",
        "page": "1",
        "rp": "1000",
        "sortname": "vd_contratos_produtos.id",
        "sortorder": "desc"
    };

    try {
        const produtosResponse = await makeIxcRequest('POST', '/vd_contratos_produtos', produtosPayload);

        if (!produtosResponse || !produtosResponse.registros || produtosResponse.registros.length === 0) {
            console.warn(`Nenhum produto encontrado no modelo do plano ${idPlano}.`);
            return;
        }

        for (const produto of produtosResponse.registros) {
            const valorOriginal = parseFloat(produto.valor_unit);
            const descricaoProduto = produto.descricao ? produto.descricao.toUpperCase() : '';
            
            let diferenca = 0;
            let tipoServico = '';
            let targetValor = 0;

            if (descricaoProduto.includes('SCM')) {
                tipoServico = 'SCM';
                targetValor = targetSCM;
            } else if (descricaoProduto.includes('SVA')) {
                tipoServico = 'SVA';
                targetValor = targetSVA;
            } else {
                continue;
            }

            diferenca = targetValor - valorOriginal;

            if (Math.abs(diferenca) < 0.01) {
                console.log(`${tipoServico}: Valor original (${valorOriginal}) igual ao alvo. Sem ajustes.`);
                continue;
            }

            const valorAbsoluto = Math.abs(diferenca);
            const percentual = (valorAbsoluto / valorOriginal) * 100;

            if (diferenca < 0) {
                const descontoPayload = {
                    "id_contrato": contratoId,
                    "id_vd_contrato_produtos": produto.id,
                    "descricao": `Desconto Comercial ${tipoServico}`,
                    "valor": valorAbsoluto.toFixed(2),
                    "data_validade": "", 
                    "percentual": percentual.toString()
                };

                console.log(`Aplicando DESCONTO em ${tipoServico}:`, descontoPayload);
                await makeIxcRequest('POST', '/cliente_contrato_descontos', descontoPayload);

            } else {
                const acrescimoPayload = {
                    "id_contrato": contratoId,
                    "id_vd_contrato_produtos": produto.id,
                    "descricao": `Acréscimo Comercial ${tipoServico}`,
                    "valor": valorAbsoluto.toFixed(2),
                    "data_validade": "", 
                    "percentual": percentual.toString()
                };

                console.log(`Aplicando ACRÉSCIMO em ${tipoServico}:`, acrescimoPayload);
                await makeIxcRequest('POST', '/cliente_contrato_acrescimos', acrescimoPayload);
            }
        }

    } catch (error) {
        console.error(`Erro ao ajustar financeiro: ${error.message}`);
    }
}

router.post('/cliente', async (req, res) => {
    const { existingClientId, ...clientData } = req.body; 
    const dataCadastro = getIxcDate();
    let novoClienteId: string;

    try {
        let nomePlano = `ID ${clientData.id_plano_ixc}`;
        try {
            const planoInfo = await makeIxcRequest('POST', `/vd_contratos`, { qtype: 'vd_contratos.id', query: clientData.id_plano_ixc, oper: '=' });
            if (planoInfo && planoInfo.registros && planoInfo.registros.length > 0) {
                nomePlano = planoInfo.registros[0].nome;
            }
        } catch (e) {
            console.warn(`Aviso: Não foi possível buscar o nome do plano ${clientData.id_plano_ixc}. Usando ID.`);
        }

        if (existingClientId) {
            console.log(`Cliente ID ${existingClientId} fornecido. Pulando Etapa 1.`);
            novoClienteId = existingClientId;
            await atualizarCliente(novoClienteId, clientData, dataCadastro);
        } else {
            console.log("Nenhum Cliente ID fornecido. Executando Etapa 1 (Cadastro de Cliente)...");
            novoClienteId = await cadastrarCliente(clientData, dataCadastro);
        }
        const novoContratoId = await criarContrato(novoClienteId, clientData, dataCadastro, nomePlano);
        const novoLoginId = await criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro);
        const novoTicketId = await abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId);
        
        res.status(201).json({
            success: true,
            message: "Venda finalizada com sucesso! Cliente, Contrato, Login e Atendimento/OS criados.",
            clienteId: novoClienteId,
            contratoId: novoContratoId,
            loginId: novoLoginId,
            ticketId: novoTicketId
        });

    } catch (error) {
        console.error('Erro no fluxo de cadastro:', error);
        res.status(500).json({
            success: false,
            error: error.message 
        });
    }
});

router.post('/cliente-corporativo', async (req, res) => {
    const { existingClientId, ...clientData } = req.body; 
    const dataCadastro = getIxcDate();
    let novoClienteId: string;

    try {
        let nomePlano = `ID ${clientData.id_plano_ixc}`;
        try {
            const planoInfo = await makeIxcRequest('POST', `/vd_contratos`, { qtype: 'vd_contratos.id', query: clientData.id_plano_ixc, oper: '=' });
            if (planoInfo && planoInfo.registros && planoInfo.registros.length > 0) {
                nomePlano = planoInfo.registros[0].nome;
            }
        } catch (e) {
            console.warn(`Aviso: Não foi possível buscar o nome do plano ${clientData.id_plano_ixc}. Usando ID.`);
        }

        if (existingClientId) {
            novoClienteId = existingClientId;
            await atualizarCliente(novoClienteId, clientData, dataCadastro);
        } else {
            try {
                novoClienteId = await cadastrarCliente(clientData, dataCadastro);
            } catch (error) {
                const errorMsg = error.message || '';
                if (errorMsg.includes('Este CNPJ/CPF já está Cadastrado') || errorMsg.includes('já está Cadastrado')) {
                    const match = errorMsg.match(/ID:\s*(\d+)/);
                    if (match && match[1]) {
                        novoClienteId = match[1];
                        console.log(`Cliente recuperado ID: ${novoClienteId}. Atualizando dados...`);
                        await atualizarCliente(novoClienteId, clientData, dataCadastro);
                    } else {
                        throw error;
                    }
                } else {
                    throw error;
                }
            }
        }

        const novoContratoId = await criarContrato(novoClienteId, clientData, dataCadastro, nomePlano);
        const novoLoginId = await criarLogin(novoClienteId, novoContratoId, clientData, dataCadastro);
        const novoTicketId = await abrirAtendimentoOS(novoClienteId, clientData, nomePlano, novoLoginId, novoContratoId);
        
        await ajustarFinanceiroContrato(novoContratoId, clientData.valor_acordado, clientData.id_plano_ixc);

        res.status(201).json({
            success: true,
            message: "Venda finalizada com sucesso! " + (existingClientId ? "Cliente atualizado" : "Cliente processado") + ", Contrato, Login e Atendimento/OS criados.",
            clienteId: novoClienteId,
            contratoId: novoContratoId,
            loginId: novoLoginId,
            ticketId: novoTicketId
        });

    } catch (error) {
        console.error('Erro no fluxo de cadastro corporativo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/consultar-cliente', async (req, res) => {
    const { cnpj_cpf } = req.body;
    
    if (!cnpj_cpf) {
        return res.status(400).json({ error: 'CNPJ/CPF é obrigatório.' });
    }

    try {
        const clientePayload = {
            qtype: "cliente.cnpj_cpf",
            query: cnpj_cpf,
            oper: "=",
            page: "1",
            rp: "1",
            sortname: "cliente.id",
            sortorder: "asc"
        };
        
        console.log("Consultando cliente:", clientePayload);
        const clienteResponse = await makeIxcRequest('POST', '/cliente', clientePayload);

        if (!clienteResponse || clienteResponse.total === 0 || clienteResponse.total === "0") {
            console.log("Cliente não encontrado.");
            return res.json({ cliente: null, contratos: [], contratosComAtraso: [] });
        }

        const cliente = clienteResponse.registros[0];
        console.log(`Cliente encontrado: ID ${cliente.id}`);

        const contratoPayload = {
            qtype: "cliente_contrato.id_cliente",
            query: cliente.id,
            oper: "=",
            page: "1",
            rp: "200",
            sortname: "cliente_contrato.id",
            sortorder: "desc"
        };
        
        console.log("Consultando contratos:", contratoPayload);
        const contratoResponse = await makeIxcRequest('POST', '/cliente_contrato', contratoPayload);
        const contratos = (contratoResponse && contratoResponse.registros) ? contratoResponse.registros : [];
        console.log(`Encontrados ${contratos.length} contratos.`);
        
        const financeiroPayload = {
            "qtype": "fn_areceber.id_cliente",
            "query": cliente.id,
            "oper": "=",
            "rp": "2000",
            "sortname": "fn_areceber.data_vencimento",
            "sortorder": "asc",
            "grid_param": JSON.stringify([
                {"TB":"fn_areceber.liberado", "OP" : "=", "P" : "S"},
                {"TB":"fn_areceber.status", "OP" : "!=", "P" : "C"},
                {"TB":"fn_areceber.status", "OP" : "!=", "P" : "R"}
            ])
        };

        console.log("Consultando financeiro:", financeiroPayload);
        const financeiroResponse = await makeIxcRequest('POST', '/fn_areceber', financeiroPayload);
        
        const contratosComAtraso = new Set<string>();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (financeiroResponse && financeiroResponse.total > 0) {
            financeiroResponse.registros.forEach((titulo: any) => {
                const vencimento = new Date(titulo.data_vencimento);
                if (titulo.id_contrato && vencimento < hoje) {
                    contratosComAtraso.add(titulo.id_contrato);
                }
            });
        }
        console.log(`Contratos com atraso: ${Array.from(contratosComAtraso)}`);

        res.json({ 
            cliente, 
            contratos, 
            contratosComAtraso: Array.from(contratosComAtraso) 
        });

    } catch (error) {
        console.error("Erro ao consultar cliente:", error.message);
        res.status(500).json({ error: `Erro ao consultar cliente: ${error.message}` });
    }
});

router.post('/consultar-endereco', async (req, res) => {
    const { cep, numero } = req.body;

    if (!cep) {
        return res.status(400).json({ error: 'O CEP é obrigatório.' });
    }

    try {
        const payload: any = {
            qtype: "cliente.cep",
            query: `${cep}`,
            oper: "=",
            page: "1",
            rp: "20",
            sortname: "cliente.id",
            sortorder: "asc"
        };
        
        if (numero && numero.trim() !== '') {
            payload.grid_param = JSON.stringify([
                {"TB":"cliente.numero", "OP" : "=", "P" : numero}
            ]);
        }

        console.log("Consultando por CEP + Número:", payload);
        const response = await makeIxcRequest('POST', '/cliente', payload);

        if (response && response.registros && response.registros.length > 0) {
            
            const clientesComStatus = await Promise.all(
                response.registros.map(async (cliente: any) => {
                    const temAtraso = await getFinancialStatus(cliente.id);
                    return {
                        ...cliente,
                        tem_atraso: temAtraso
                    };
                })
            );
            res.json(clientesComStatus);

        } else {
            res.json(response.registros || []);
        }

    } catch (error) {
        console.error("Erro ao consultar por endereço:", error.message);
        res.status(500).json({ error: `Erro ao consultar endereço: ${error.message}` });
    }
});

export default router;