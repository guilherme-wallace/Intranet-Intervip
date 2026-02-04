// routes/api/v5/rede_neutra.ts
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
        // LOG REQUEST
        //console.log(`[IXC Req] ${method} ${endpoint}`, data ? JSON.stringify(data) : '');
        
        const response = await axios({ method, url, headers, data });
        
        // LOG RESPONSE
        //console.log(`[IXC Res] ${endpoint}:`, JSON.stringify(response.data)); 
        return response.data;
    } catch (error) {
        console.error(`[IXC Err] ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
};

async function gerarTokenUnico(): Promise<string> {
    const chars = 'ABCDEFGHJKILMNOPQRSTUVWXYZ0123456789';
    let token = '';
    let existe = true;
    while (existe) {
        token = '';
        for (let i = 0; i < 5; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
        const results = await executeDb('SELECT id FROM rn_clientes WHERE token = ?', [token]);
        if (results.length === 0) existe = false;
    }
    return token;
}

async function sincronizarClientesLegados(parceiroIdLocal: number, ixcContratoId: number) {
    console.log(`[Sync] Iniciando sincronização para parceiro ${parceiroIdLocal} (Contrato IXC: ${ixcContratoId})`);
    
    try {
        const produtosResp = await makeIxcRequest('POST', '/vd_contratos_produtos', {
            "qtype": "vd_contratos_produtos.id_contrato",
            "query": ixcContratoId,
            "oper": "=",
            "page": "1",
            "rp": "2000",
            "sortname": "vd_contratos_produtos.id",
            "sortorder": "desc"
        });

        const produtosIxc = produtosResp.registros || [];
        if (produtosIxc.length === 0) return;

        let loginsIxc: any[] = [];
        try {
            const loginsResp = await makeIxcRequest('POST', '/radusuarios', {
                "qtype": "radusuarios.id_contrato",
                "query": ixcContratoId,
                "oper": "=",
                "page": "1",
                "rp": "2000"
            });
            loginsIxc = loginsResp.registros || [];
        } catch (e) { console.warn("Erro ao listar logins para sync:", e.message); }

        for (const prod of produtosIxc) {
            const loginMatch = loginsIxc.find(l => 
                l.login === prod.descricao || 
                (prod.descricao && prod.descricao.includes(l.login))
            );

            const existe = await executeDb('SELECT id FROM rn_clientes WHERE ixc_produto_id = ?', [prod.id]);

            const endereco = loginMatch ? loginMatch.endereco : null;
            const numero = loginMatch ? loginMatch.numero : null;
            const bairro = loginMatch ? loginMatch.bairro : null;
            const cep = loginMatch ? loginMatch.cep : null;
            const mac = loginMatch ? loginMatch.onu_mac : null;
            const obsProduto = prod.obs || "";

            const dadosSync = {
                ixc_login_id: loginMatch ? loginMatch.id : null,
                login_pppoe: loginMatch ? loginMatch.login : (prod.descricao || 'sem_login'),
                valor: prod.valor_unit,
                descricao_produto: prod.descricao,
                onu_mac: mac,
                ativo: 1,
                cep: cep, endereco: endereco, numero: numero, bairro: bairro,
                obs: obsProduto 
            };

            if (existe.length > 0) {
                await executeDb(
                    `UPDATE rn_clientes SET 
                        ixc_login_id = ?, login_pppoe = ?, valor = ?, descricao_produto = ?, 
                        onu_mac = ?, ativo = ?, obs = ?, cep = ?, endereco = ?, numero = ?, bairro = ?
                    WHERE id = ?`,
                    [
                        dadosSync.ixc_login_id, dadosSync.login_pppoe, dadosSync.valor, dadosSync.descricao_produto,
                        dadosSync.onu_mac, dadosSync.ativo, dadosSync.obs, dadosSync.cep, dadosSync.endereco,
                        dadosSync.numero, dadosSync.bairro, existe[0].id
                    ]
                );
            } else {
                let token = '';
                const matchToken = prod.descricao ? prod.descricao.match(/^([A-Z0-9]{5})-/) : null;
                
                if (matchToken && matchToken[1]) {
                    console.log(`[Sync] Token detectado na descrição: ${matchToken[1]}`);
                    token = matchToken[1];
                } else {
                    token = await gerarTokenUnico();
                }

                await executeDb(
                    `INSERT INTO rn_clientes 
                    (parceiro_id, ixc_produto_id, ixc_login_id, token, descricao_produto, login_pppoe, valor, plano_nome, ativo, obs, onu_mac, cep, endereco, numero, bairro, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        parceiroIdLocal,
                        prod.id,
                        dadosSync.ixc_login_id,
                        token,
                        dadosSync.descricao_produto,
                        dadosSync.login_pppoe,
                        dadosSync.valor,
                        'Plano Importado',
                        dadosSync.ativo,
                        dadosSync.obs,
                        dadosSync.onu_mac,
                        dadosSync.cep,
                        dadosSync.endereco,
                        dadosSync.numero,
                        dadosSync.bairro
                    ]
                );
            }
        }
        console.log(`[Sync] Sincronização concluída para parceiro ${parceiroIdLocal}.`);

    } catch (error) {
        console.error(`[Sync] Erro ao sincronizar parceiro ${parceiroIdLocal}:`, error.message);
    }
}

router.get('/produtos', async (req, res) => {
    try {
        const payload = {
            "qtype": "produtos.descricao",
            "query": "REDE_NEUTRA_",
            "oper": "L",
            "page": "1",
            "rp": "2000",
            "sortname": "produtos.id",
            "sortorder": "desc"
        };

        const response = await makeIxcRequest('POST', '/produtos', payload);
        const listaProdutos = response.registros || [];

        const planosFormatados = listaProdutos
            .filter((p: any) => p.ativo === 'S')
            .map((p: any) => {
                const nome = p.descricao || "Produto sem nome";
                
                const match = nome.match(/_(\d+[MG]B?)_(FTTH|FTTP)/i);
                
                let nomeExibicao = nome;
                
                if (match) {
                    const velocidade = match[1];
                    const tecnologia = match[2];
                    nomeExibicao = `${velocidade} - ${tecnologia}`;
                } else {
                    const matchVel = nome.match(/_(\d+[MG]B?)/i);
                    if(matchVel) nomeExibicao = `${matchVel[1]} - Internet`;
                }
                
                return {
                    id: p.id,
                    nome_original: nome,
                    nome_exibicao: nomeExibicao,
                    preco: p.preco_base
                };
            });

        res.json(planosFormatados);

    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/parceiros', async (req, res) => {
    try {
        const contratoPayload = {
            "qtype": "cliente_contrato.id_vd_contrato",
            "query": "7977",
            "oper": "=",
            "page": "1",
            "rp": "200",
            "sortname": "cliente_contrato.id",
            "sortorder": "desc"
        };

        let contratosIxc = [];
        try {
            const resp = await makeIxcRequest('POST', '/cliente_contrato', contratoPayload);
            contratosIxc = (resp.registros || []).filter((c: any) => c.status === 'A');
        } catch (e) {
            console.warn("Falha ao buscar parceiros no IXC, usando cache local.");
        }

        for (const c of contratosIxc) {
            let nomeParceiro = "Parceiro Desconhecido";
            try {
                const cliResp = await makeIxcRequest('POST', '/cliente', { 
                    qtype: 'cliente.id', query: c.id_cliente, oper: '=', rp: '1' 
                });
                if (cliResp.registros && cliResp.registros.length > 0) {
                    nomeParceiro = cliResp.registros[0].razao;
                }
            } catch (e) {}

            const checkQuery = `SELECT id FROM rn_parceiros WHERE ixc_contrato_id = ?`;
            const existing = await executeDb(checkQuery, [c.id]);

            if (existing.length === 0) {
                await executeDb(
                    `INSERT INTO rn_parceiros (ixc_cliente_id, ixc_contrato_id, nome, ativo) VALUES (?, ?, ?, 1)`,
                    [c.id_cliente, c.id, nomeParceiro]
                );
            } else {
                await executeDb(
                    `UPDATE rn_parceiros SET nome = ? WHERE id = ?`, 
                    [nomeParceiro, existing[0].id]
                );
            }
        }

        const parceirosLocais = await executeDb(`SELECT * FROM rn_parceiros WHERE ativo = 1 ORDER BY nome ASC`);
        res.json(parceirosLocais);

    } catch (error) {
        console.error("Erro rota parceiros:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/clientes/:parceiroId', async (req, res) => {
    const { parceiroId } = req.params;
    console.log(`[Sync] Buscando e sincronizando clientes para Parceiro ID Local: ${parceiroId}`);

    try {
        const parceiros = await executeDb(`SELECT * FROM rn_parceiros WHERE id = ?`, [parceiroId]);
        if (parceiros.length === 0) return res.json([]);
        
        const parceiro = parceiros[0];
        const ixcContratoId = parceiro.ixc_contrato_id;

        if (ixcContratoId) {
            const produtosResp = await makeIxcRequest('POST', '/vd_contratos_produtos', {
                "qtype": "vd_contratos_produtos.id_contrato", "query": ixcContratoId, "oper": "=", "page": "1", "rp": "2000", "sortname": "vd_contratos_produtos.id", "sortorder": "desc"
            });
            const produtosIxc = produtosResp.registros || [];

            let loginsIxc = [];
            try {
                const loginsResp = await makeIxcRequest('POST', '/radusuarios', {
                    "qtype": "radusuarios.id_contrato", "query": ixcContratoId, "oper": "=", "page": "1", "rp": "2000"
                });
                loginsIxc = loginsResp.registros || [];
            } catch (e) { console.warn("Erro sync login:", e.message); }

            for (const prod of produtosIxc) {
                const descricao = prod.descricao || "";
                const tokenMatch = descricao.match(/^([A-Z0-9]{5})(-|$)/);
                let token = tokenMatch ? tokenMatch[1] : null;

                const loginMatch = loginsIxc.find(l => l.login === descricao || descricao.startsWith(l.login));
                
                const ixcLoginId = loginMatch ? loginMatch.id : null;
                const loginPppoe = loginMatch ? loginMatch.login : descricao;
                const onuMac = loginMatch ? loginMatch.onu_mac : null;
                const obs = prod.obs || "";
                
                let dataCriacao = new Date();
                const dataMatch = obs.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (dataMatch) {
                    const dataStr = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
                    const d = new Date(dataStr);
                    if (!isNaN(d.getTime())) dataCriacao = d;
                }

                const existe = await executeDb('SELECT id, token FROM rn_clientes WHERE ixc_produto_id = ?', [prod.id]);

                if (existe.length > 0) {
                    await executeDb(
                        `UPDATE rn_clientes SET 
                            ixc_login_id = ?, login_pppoe = ?, valor = ?, descricao_produto = ?, 
                            onu_mac = ?, obs = ?
                        WHERE id = ?`,
                        [ixcLoginId, loginPppoe, prod.valor_unit, descricao, onuMac, obs, existe[0].id]
                    );
                } else {
                    if (!token) token = await gerarTokenUnico();

                    await executeDb(
                        `INSERT INTO rn_clientes 
                        (parceiro_id, ixc_produto_id, ixc_login_id, token, descricao_produto, login_pppoe, valor, plano_nome, ativo, obs, onu_mac, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
                        [
                            parceiroId, prod.id, ixcLoginId, token, descricao, loginPppoe, 
                            prod.valor_unit, 'Sincronizado IXC', obs, onuMac, dataCriacao
                        ]
                    );
                }
            }
        }

        const clientesLocais = await executeDb(
            `SELECT * FROM rn_clientes WHERE parceiro_id = ? ORDER BY created_at DESC`, 
            [parceiroId]
        );

        const clientesDetalhados = await Promise.all(clientesLocais.map(async (cli: any) => {
            let isOnline = false;
            let isAutorizado = (cli.onu_mac && cli.onu_mac.length > 10);

            if (cli.ixc_login_id) {
                try {
                    const fibraResp = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
                        qtype: 'id_login', query: cli.ixc_login_id, oper: '=', rp: '1'
                    });
                    if (fibraResp.registros && fibraResp.registros.length > 0) {
                        const rx = parseFloat(fibraResp.registros[0].sinal_rx);
                        if (!isNaN(rx) && rx < -1) isOnline = true;
                    }
                } catch (e) {}
            }

            return {
                ...cli,
                is_autorizado: isAutorizado,
                is_online: isOnline
            };
        }));

        res.json(clientesDetalhados);

    } catch (error) {
        console.error("Erro sync/listar clientes:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/cliente', async (req, res) => {
    const { 
        parceiro_id, cod_cliente_parceiro,
        caixa_atendimento, porta,
        cep, endereco, numero, bairro, 
        cidade, uf,
        id_condominio, bloco, apartamento, complemento, referencia,
        plano_id, plano_nome, plano_nome_original, plano_valor 
    } = req.body;

    console.log("=== INÍCIO CADASTRO REDE NEUTRA ===");

    if (!parceiro_id || !cep) {
        return res.status(400).json({ error: "Dados obrigatórios faltando." });
    }

    let ixcProdResp = null;
    let ixcLoginResp = null;
    let novoIdLocal = null;

    try {
        const parceiros = await executeDb(`SELECT * FROM rn_parceiros WHERE id = ?`, [parceiro_id]);
        if (parceiros.length === 0) throw new Error("Parceiro não encontrado.");
        const parceiro = parceiros[0];

        const valorFinal = plano_valor ? plano_valor : (parceiro.valor_fixo || 30.00);
        const token = await gerarTokenUnico();

        const sufixoCliente = cod_cliente_parceiro ? `-${cod_cliente_parceiro}` : '';
        const identificadorUnico = `${token}-RN-${parceiro.ixc_cliente_id}${sufixoCliente}`;
        
        const infoTecnica = [];
        if (cod_cliente_parceiro) infoTecnica.push(`Cód: ${cod_cliente_parceiro}`);
        if (caixa_atendimento) infoTecnica.push(`CTO: ${caixa_atendimento}`);
        if (porta) infoTecnica.push(`Porta: ${porta}`);
        const obsLocal = `Token: ${token} | ${infoTecnica.join(' | ')}`;

        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const obsIXC = `Data de Ativação: ${dataHoje}`;

        let idPlanoVelocidade = "0"; 
        if (plano_nome_original) {
            console.log(`Buscando Plano: ${plano_nome_original}...`);
            try {
                const planResp = await makeIxcRequest('POST', '/radgrupos', {
                    qtype: 'radgrupos.grupo', query: plano_nome_original, oper: '=', rp: '1'
                });
                if (planResp.registros && planResp.registros.length > 0) {
                    idPlanoVelocidade = planResp.registros[0].id;
                }
            } catch (e) { console.error("Erro plano:", e.message); }
        }

        const complementoFinal = [complemento, bloco ? `Bloco ${bloco}` : '', apartamento ? `Apto ${apartamento}` : ''].filter(Boolean).join(' - ');

        const insertResult = await executeDb(
            `INSERT INTO rn_clientes 
            (parceiro_id, token, descricao_produto, login_pppoe, valor, plano_nome, ativo, obs, onu_mac, cep, endereco, numero, bairro, caixa_atendimento, porta, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, NULL, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                parceiro.id, token, identificadorUnico, identificadorUnico, valorFinal, plano_nome, 
                obsLocal, cep, endereco, numero, bairro, caixa_atendimento, porta
            ]
        );
        novoIdLocal = insertResult.insertId;

        const produtoPayload = {
            "id_contrato": parceiro.ixc_contrato_id,
            "id_produto": plano_id, 
            "tipo": "I", 
            "qtde": "1",
            "valor_unit": valorFinal,
            "descricao": identificadorUnico,
            "obs": obsIXC,
            "id_plano": idPlanoVelocidade, 
            "fixar_ip": "0" 
        };

        console.log("Enviando Produto IXC...");
        ixcProdResp = await makeIxcRequest('POST', '/vd_contratos_produtos', produtoPayload);
        
        if (ixcProdResp.type === 'error') throw new Error(`Erro IXC (Produto): ${ixcProdResp.message}`);
        
        const loginPayload: any = {
            "id_contrato": parceiro.ixc_contrato_id,
            "id_cliente": parceiro.ixc_cliente_id,
            "login": identificadorUnico,
            "senha": `ivp@${parceiro.ixc_cliente_id}`,
            "ativo": "S",
            "obs": obsIXC,
            
            "cep": cep, 
            "endereco": endereco, 
            "numero": numero, 
            "bairro": bairro,
            "cidade": cidade,
            "complemento": complemento,
            "referencia": referencia,
            "bloco": bloco,
            "apartamento": apartamento,
            "id_condominio": id_condominio || "0",
            "endereco_padrao_cliente": "N",

            "autenticacao": "L", 
            "tipo_conexao_mapa": "58", 
            "id_grupo": idPlanoVelocidade, 
            "login_simultaneo": "1",
            "senha_md5": "N",
            "auto_preencher_ip": "S",
            "fixar_ip": "N",
            "relacionar_ip_ao_login": "N",
            "autenticacao_por_mac": "N",
            "auto_preencher_mac": "S",
            "relacionar_mac_ao_login": "S",
            "tipo_vinculo_plano": "D"
        };

        console.log("Enviando Login IXC...");
        ixcLoginResp = await makeIxcRequest('POST', '/radusuarios', loginPayload);

        if (ixcLoginResp.type === 'error') throw new Error(`Erro IXC (Login): ${ixcLoginResp.message}`);

        await executeDb(
            `UPDATE rn_clientes SET ixc_produto_id = ?, ixc_login_id = ? WHERE id = ?`,
            [ixcProdResp.id, ixcLoginResp.id, novoIdLocal]
        );

        res.json({
            success: true,
            id: novoIdLocal,
            token: token,
            login: identificadorUnico,
            ixc_login_id: ixcLoginResp.id
        });

    } catch (error) {
        console.error("ERRO NO CADASTRO:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.put('/cliente/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        descricao_produto, login_pppoe, status_ativo, obs, 
        cep, endereco, numero, bairro,
        cidade, uf, id_condominio, bloco, apartamento, complemento, referencia
    } = req.body;

    console.log(`[EDIT DEBUG] Iniciando atualização do Cliente Local ID: ${id}`);

    if (!id) return res.status(400).json({ error: "ID não informado" });

    try {
        await executeDb(
            `UPDATE rn_clientes SET 
                descricao_produto = ?, login_pppoe = ?, ativo = ?, obs = ?,
                cep = ?, endereco = ?, numero = ?, bairro = ?
            WHERE id = ?`,
            [descricao_produto, login_pppoe, status_ativo, obs, cep, endereco, numero, bairro, id]
        );
        console.log(`[EDIT DEBUG] Banco local atualizado.`);

        const clientes = await executeDb(`SELECT ixc_produto_id, ixc_login_id FROM rn_clientes WHERE id = ?`, [id]);
        
        if (clientes.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado." });
        }

        const cli = clientes[0];

        if (cli.ixc_produto_id) {
            try {
                const currentProd = await makeIxcRequest('POST', '/vd_contratos_produtos', {
                    qtype: 'vd_contratos_produtos.id',
                    query: cli.ixc_produto_id,
                    oper: '=',
                    rp: '1'
                });

                if (currentProd.registros && currentProd.registros.length > 0) {
                    const prodIxc = currentProd.registros[0];
                    
                    const payloadProd = {
                        ...prodIxc,
                        descricao: descricao_produto,
                        obs: obs
                    };

                    console.log(`[EDIT DEBUG] Enviando PUT Produto ${cli.ixc_produto_id}...`);
                    const respPutProd = await makeIxcRequest('PUT', `/vd_contratos_produtos/${cli.ixc_produto_id}`, payloadProd);
                    
                    if(respPutProd.type === 'error') console.error("Erro IXC Prod:", respPutProd.message);
                }
            } catch (err) {
                console.error(`[EDIT ERROR] Falha produto:`, err.message);
            }
        }

        if (cli.ixc_login_id) {
            try {
                const currentLogin = await makeIxcRequest('POST', '/radusuarios', {
                    qtype: 'radusuarios.id',
                    query: cli.ixc_login_id,
                    oper: '=',
                    rp: '1'
                });

                if (currentLogin.registros && currentLogin.registros.length > 0) {
                    const loginIxc = currentLogin.registros[0];

                    const payloadLogin = {
                        ...loginIxc,
                        
                        login: login_pppoe,
                        ativo: status_ativo == 1 ? "S" : "N",
                        obs: obs,
                        cep: cep,
                        endereco: endereco,
                        numero: numero,
                        bairro: bairro,
                        cidade: cidade || loginIxc.cidade,
                        uf: uf || loginIxc.uf,
                        id_condominio: id_condominio || "0",
                        bloco: bloco,
                        apartamento: apartamento,
                        complemento: complemento,
                        referencia: referencia
                    };

                    console.log(`[EDIT DEBUG] Enviando PUT Login ${cli.ixc_login_id}...`);
                    const respPutLogin = await makeIxcRequest('PUT', `/radusuarios/${cli.ixc_login_id}`, payloadLogin);
                    
                    if(respPutLogin.type === 'error') console.error("Erro IXC Login:", respPutLogin.message);
                }
            } catch (err) {
                console.error(`[EDIT ERROR] Falha login:`, err.message);
            }
        }

        res.json({ success: true, message: "Cliente atualizado." });

    } catch (error) {
        console.error("[EDIT FATAL ERROR]:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/onu-detalhes/:id_login', async (req, res) => {
    const { id_login } = req.params;

    try {
        const loginResp = await makeIxcRequest('POST', '/radusuarios', {
            qtype: 'radusuarios.id', query: id_login, oper: '=', rp: '1'
        });

        if (!loginResp.registros || loginResp.registros.length === 0) {
            return res.json({ online: 'N', sinal_rx: null });
        }

        const loginData = loginResp.registros[0];
        
        const fibraResp = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
            qtype: 'id_login', query: id_login, oper: '=', rp: '1', sortname: 'id', sortorder: 'desc'
        });

        let dadosTecnicos: any = {
            online: 'N', 
            mac: loginData.onu_mac,
            
            cep: loginData.cep,
            endereco: loginData.endereco,
            numero: loginData.numero,
            bairro: loginData.bairro,
            cidade: loginData.cidade,
            uf: '',
            complemento: loginData.complemento,
            referencia: loginData.referencia,
            id_condominio: loginData.id_condominio,
            bloco: loginData.bloco,
            apartamento: loginData.apartamento,

            sinal_rx: '-', sinal_tx: '-', data_sinal: '-',
            nome: '-', id_transmissor: '-', id_caixa_ftth: '-', porta_ftth: '-', onu_tipo: '-',
            ponid: '-', onu_numero: '-', temperatura: '-', voltagem: '-', user_vlan: '-', id_fibra: null
        };

        if (fibraResp.registros && fibraResp.registros.length > 0) {
            const fibra = fibraResp.registros[0];
            dadosTecnicos.id_fibra = fibra.id;
            dadosTecnicos.sinal_rx = fibra.sinal_rx ? fibra.sinal_rx.replace(',', '.') : '-';
            dadosTecnicos.sinal_tx = fibra.sinal_tx ? fibra.sinal_tx.replace(',', '.') : '-';
            dadosTecnicos.data_sinal = fibra.data_sinal || '-';
            dadosTecnicos.nome = fibra.nome || '-';
            dadosTecnicos.id_transmissor = fibra.id_transmissor || '-';
            dadosTecnicos.id_caixa_ftth = fibra.id_caixa_ftth || '-';
            dadosTecnicos.porta_ftth = fibra.porta_ftth || '-';
            dadosTecnicos.onu_tipo = fibra.onu_tipo || '-';
            dadosTecnicos.ponid = fibra.ponid || '-';
            dadosTecnicos.onu_numero = fibra.onu_numero || '-';
            dadosTecnicos.temperatura = fibra.temperatura || '-';
            dadosTecnicos.voltagem = fibra.voltagem || '-';

            const rxNum = parseFloat(dadosTecnicos.sinal_rx);
            if (!isNaN(rxNum) && rxNum !== 0) dadosTecnicos.online = 'S';

            if (fibra.comandos) {
                const matchVlan = fibra.comandos.match(/user-vlan\s+(\d+)/);
                if (matchVlan && matchVlan[1]) dadosTecnicos.user_vlan = matchVlan[1];
            }
            
            if (fibra.id_transmissor) {
                try {
                    const popResp = await makeIxcRequest('POST', '/radpop', { qtype: "radpop.id", query: fibra.id_transmissor, oper: "=", rp: "1" });
                    if (popResp.registros && popResp.registros.length > 0) dadosTecnicos.id_transmissor = popResp.registros[0].pop;
                } catch (e) {}
            }
        }

        res.json(dadosTecnicos);

    } catch (error) {
        console.error("Erro detalhes ONU:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/refresh-onu', async (req, res) => {
    const { id_login } = req.body;

    try {
        const fibraResp = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
            qtype: 'id_login', query: id_login, oper: '=', rp: '1', sortname: 'id', sortorder: 'desc'
        });

        if (!fibraResp.registros || fibraResp.registros.length === 0) {
            return res.status(404).json({ error: "Registro de fibra não encontrado para este login." });
        }

        const idFibra = fibraResp.registros[0].id;

        const urlRefresh = `${process.env.IXC_API_URL}/webservice/v1/botao_rel_22991`;
        const token = process.env.IXC_API_TOKEN;
        
        const responseHtml = await axios.post(urlRefresh, { id: idFibra }, {
            headers: { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' }
        });

        const html = responseHtml.data;

        const extract = (regex) => {
            const match = html.match(regex);
            return match ? match[1] : null;
        };

        const novoSinalRx = extract(/Sinal Rx:\s*([-0-9.,]+)/);
        const novoSinalTx = extract(/Sinal Tx:\s*([-0-9.,]+)/);
        const novaTemp = extract(/Temperatura:\s*([-0-9.,]+)/);
        const novaVolt = extract(/Voltagem:\s*([-0-9.,]+)/);

        res.json({
            success: true,
            sinal_rx: novoSinalRx ? novoSinalRx.replace(',', '.') : '-',
            sinal_tx: novoSinalTx ? novoSinalTx.replace(',', '.') : '-',
            temperatura: novaTemp,
            voltagem: novaVolt,
            online: (novoSinalRx && parseFloat(novoSinalRx) < 0) ? 'S' : 'N'
        });

    } catch (error) {
        console.error("Erro ao dar refresh na ONU:", error.message);
        res.status(500).json({ error: "Falha ao comunicar com a OLT." });
    }
});

router.get('/transmissores', async (req, res) => {
    try {
        const response = await makeIxcRequest('POST', '/radpop_radio', {
            "qtype": "radpop_radio.id", "query": "", "oper": "=", "page": "1", "rp": "2000", "sortname": "radpop_radio.id", "sortorder": "desc"
        });
        const lista = (response.registros || []).map((t: any) => ({
            id: t.id,
            nome: t.descricao || t.modelo || `Transmissor ${t.id}`,
            pop_id: t.id_pop
        }));
        res.json(lista);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/perfis-fibra', async (req, res) => {
    try {
        const response = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra_perfil', {
            "qtype": "radpop_radio_cliente_fibra_perfil.id", "query": "1", "oper": ">=", "page": "1", "rp": "2000", "sortname": "radpop_radio_cliente_fibra_perfil.id", "sortorder": "desc"
        });
        const lista = (response.registros || []).map((p: any) => ({ id: p.id, nome: p.nome }));
        res.json(lista);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/onus-pendentes', async (req, res) => {
    try {
        const payload = {
            "qtype": "fh_onu_nao_autorizadas.id",
            "query": "1",
            "oper": ">=",
            "page": "1",
            "rp": "2000",
            "sortname": "fh_onu_nao_autorizadas.id",
            "sortorder": "desc"
        };
        
        const response = await makeIxcRequest('POST', '/fh_onu_nao_autorizadas', payload);
        
        const lista = (response.rows || []).map((row: any) => {
            const cells = row.cell;
            return {
                id_hash: row.id,
                olt_name: cells[0],
                frame: cells[1],
                slot: cells[2],
                pon: cells[3],
                model: cells[4],
                mac: cells[5]
            };
        });

        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/autorizar-onu', async (req, res) => {
    const { ixc_login_id, mac, id_transmissor, id_perfil, id_hash_onu } = req.body;

    //console.log(`[AUTORIZAR ONU] MAC: ${mac} | Login: ${ixc_login_id}`);

    if (!ixc_login_id || !mac || !id_transmissor || !id_perfil) {
        return res.status(400).json({ error: "Dados incompletos. Selecione a ONU na lista." });
    }

    try {
        const macBusca = mac.toUpperCase().replace(/[^A-Z0-9]/g, '');
        let hashParaAutorizar = id_hash_onu;
        let slotOnu = "0";
        let ponOnu = "0";
        let frameOnu = "0";

        //console.log("1. Buscando dados físicos da ONU (Frame/Slot/Pon)...");
        if (!hashParaAutorizar) {
            const respNaoAutorizadas = await makeIxcRequest('POST', '/fh_onu_nao_autorizadas', {
                "qtype": "fh_onu_nao_autorizadas.id", "query": "1", "oper": ">=", "page": "1", "rp": "2000"
            });
            const onu = (respNaoAutorizadas.rows || []).find((row: any) => 
                row.cell && row.cell.some((c: string) => c && c.toString().toUpperCase().includes(macBusca))
            );
            
            if (onu) {
                hashParaAutorizar = onu.id;
                frameOnu = onu.cell[1] || "0";
                slotOnu = onu.cell[2] || "0";
                ponOnu = onu.cell[3] || "0";
            } else {
                throw new Error(`ONU MAC ${macBusca} não encontrada na lista de pendentes.`);
            }
        } else {
            const respNaoAutorizadas = await makeIxcRequest('POST', '/fh_onu_nao_autorizadas', {
                "qtype": "fh_onu_nao_autorizadas.id", "query": "1", "oper": ">=", "page": "1", "rp": "2000"
            });
            const onu = (respNaoAutorizadas.rows || []).find((row: any) => row.id === hashParaAutorizar);
            if (onu) {
                frameOnu = onu.cell[1] || "0";
                slotOnu = onu.cell[2] || "0";
                ponOnu = onu.cell[3] || "0";
            }
        }
        //console.log(`> Dados Físicos: Frame ${frameOnu} | Slot ${slotOnu} | Pon ${ponOnu}`);

        //console.log(`2. Buscando Script do Perfil ID ${id_perfil}...`);
        const perfilResp = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra_perfil', {
            "qtype": "radpop_radio_cliente_fibra_perfil.id", "query": id_perfil, "oper": "=", "rp": "1"
        });
        
        let scriptPerfil = "";
        let vlanPppoe = "200";
        
        if (perfilResp.registros && perfilResp.registros.length > 0) {
            const perfil = perfilResp.registros[0];
            scriptPerfil = perfil.comando || "";
            
            const matchVlan = perfil.nome.match(/VLAN\s?(\d+)/i);
            if (matchVlan && matchVlan[1]) {
                vlanPppoe = matchVlan[1];
            }
            //console.log(`> Script obtido. VLAN detectada: ${vlanPppoe}`);
        } else {
            console.warn("AVISO: Perfil não encontrado ou sem comando.");
        }

        //console.log("3. Buscando nome do login...");
        const loginData = await makeIxcRequest('POST', '/radusuarios', {
            qtype: 'radusuarios.id', query: ixc_login_id, oper: '=', rp: '1'
        });
        
        let nomeParaFibra = "ONU-" + macBusca;
        if(loginData.registros && loginData.registros.length > 0) {
            nomeParaFibra = loginData.registros[0].login || nomeParaFibra;
        }

        //console.log("4. Executando Autorização (Botão IXC)...");
        const respAutorizar = await makeIxcRequest('POST', '/fh_onu_nao_autorizadas_22396', { "get_id": hashParaAutorizar });
        
        if (respAutorizar.type === 'error') {
            throw new Error(`Erro IXC (Autorizar): ${respAutorizar.message}`);
        }

        const idClienteFibra = respAutorizar.id;
        if (!idClienteFibra) throw new Error("ID Cliente Fibra não retornado pelo IXC.");
        //console.log(`> ID Fibra Gerado: ${idClienteFibra}`);

        //console.log(`5. Preenchendo cadastro da fibra...`);
        
        const payloadVinculo = {
            "id_login": ixc_login_id,
            "id_transmissor": id_transmissor,
            "id_perfil": id_perfil,
            "mac": macBusca,
            "nome": nomeParaFibra,
            
            "gabinete": frameOnu,
            "slotno": slotOnu,
            "ponno": ponOnu,
            "ponid": `${frameOnu}/${slotOnu}/${ponOnu}`,
            
            "vlan_pppoe": vlanPppoe,
            "comandos": scriptPerfil,
            "onu_compartilhada": "N",
            "radpop_estrutura": "N",
            
            "tipo_autenticacao": "MAC",
            "porta_ftth": "0",
            "id_caixa_ftth": "0"
        };
        
        //console.log("Payload PUT:", JSON.stringify(payloadVinculo));
        
        const respVinculo = await makeIxcRequest('PUT', `/radpop_radio_cliente_fibra/${idClienteFibra}`, payloadVinculo);
        
        if (respVinculo.type === 'error') {
             console.error("Erro no vinculo (PUT):", respVinculo.message);
        }

        //console.log("6. Enviando comando para OLT (Gravar Dispositivo)...");
        const respGravar = await makeIxcRequest('POST', '/botao_gravar_dispositivo_22408', { "id": idClienteFibra });
        //console.log("Resp Gravar:", JSON.stringify(respGravar));

        await makeIxcRequest('PUT', `/radusuarios/${ixc_login_id}`, { "onu_mac": macBusca });
        await executeDb(`UPDATE rn_clientes SET onu_mac = ? WHERE ixc_login_id = ?`, [macBusca, ixc_login_id]);

        res.json({ success: true, message: "ONU Autorizada e Comandos Enviados!" });

    } catch (error) {
        console.error("[AUTORIZAR ERROR]:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/desautorizar-onu', async (req, res) => {
    const { ixc_login_id } = req.body;
    
    console.log(`[DESAUTORIZAR ONU] Iniciando remoção para Login ID: ${ixc_login_id}`);

    if (!ixc_login_id) return res.status(400).json({ error: "Login ID não informado." });

    try {
        console.log("1. Buscando registro de fibra vinculado...");
        const fibraResp = await makeIxcRequest('POST', '/radpop_radio_cliente_fibra', {
            "qtype": "radpop_radio_cliente_fibra.id_login",
            "query": ixc_login_id,
            "oper": "=",
            "rp": "1"
        });

        if (fibraResp.registros && fibraResp.registros.length > 0) {
            const idClienteFibra = fibraResp.registros[0].id;
            console.log(`> Registro encontrado. ID Fibra: ${idClienteFibra}`);

            console.log("2. Executando comando de exclusão na OLT...");
            try {
                await makeIxcRequest('POST', '/botao_excluir_dispositivo_22434', { 
                    "id": idClienteFibra 
                });
            } catch (e) {
                console.warn("Aviso: O comando de exclusão na OLT falhou ou não retornou sucesso padrão.", e.message);
            }

            console.log("3. Deletando registro de fibra...");
            await makeIxcRequest('DELETE', `/radpop_radio_cliente_fibra/${idClienteFibra}`);
            
        } else {
            console.log("> Nenhum registro de fibra ativo encontrado. Apenas limpando vínculos.");
        }

        console.log("4. Limpando MAC no login...");
        await makeIxcRequest('PUT', `/radusuarios/${ixc_login_id}`, { "onu_mac": "" });

        await executeDb(`UPDATE rn_clientes SET onu_mac = NULL WHERE ixc_login_id = ?`, [ixc_login_id]);

        res.json({ success: true, message: "ONU Desautorizada e Removida com sucesso!" });

    } catch (error) {
        console.error("[DESAUTORIZAR ERROR]:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 