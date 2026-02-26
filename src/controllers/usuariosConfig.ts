// src/controllers/usuariosConfig.ts
import { LOCALHOST } from '../../api/database';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

const saltRounds = 10;

export const UsuariosDB = {
    buscarPorUsuario: (usuario: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            const QUERY = `SELECT * FROM usuarios_intranet WHERE usuario = ? AND ativo = 1 LIMIT 1`;
            LOCALHOST.query(QUERY, [usuario], (err, results: any) => {
                if (err) reject(err);
                resolve(results && results.length > 0 ? results[0] : null);
            });
        });
    },

    sincronizarUsuarioAD: async (nome: string, usuario: string, senhaAberta: string, grupo: string): Promise<void> => {
        const hash = await bcrypt.hash(senhaAberta, saltRounds);

        return new Promise((resolve, reject) => {
            const QUERY = `
                INSERT INTO usuarios_intranet (nome, usuario, senha, grupo, origem, ativo)
                VALUES (?, ?, ?, ?, 'AD', 1)
                ON DUPLICATE KEY UPDATE 
                    nome = VALUES(nome),
                    senha = VALUES(senha), 
                    grupo = VALUES(grupo),
                    ultimo_login = NOW()
            `;
            LOCALHOST.query(QUERY, [nome, usuario, hash, grupo], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    },

    sincronizarIXC: async (username: string): Promise<any> => {
        //console.log(`\n[DEBUG IXC] Iniciando sincronização para o usuário: '${username}'`);

        const user = await UsuariosDB.buscarPorUsuario(username);
        
        if (!user) {
            //console.log(`[DEBUG IXC] Falha: Usuário '${username}' não encontrado na tabela usuarios_intranet.`);
            throw new Error('Usuário não encontrado na Intranet');
        }

        //console.log(`[DEBUG IXC] Usuário local encontrado (ID: ${user.id}). Status atual: id_usuario_ixc=${user.id_usuario_ixc}, id_funcionario_ixc=${user.id_funcionario_ixc}`);

        if (user.id_usuario_ixc !== null && user.id_funcionario_ixc !== null) {
            //console.log(`[DEBUG IXC] Usuário já possui vínculo com o IXC. Sincronização ignorada.`);
            return user;
        }

        const url = `${process.env.IXC_API_URL}/webservice/v1/usuarios`;
        const headers = {
            'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
            'Content-Type': 'application/json',
            'ixcsoft': 'listar'
        };
        const payload = {
            qtype: "usuarios.email",
            query: `${username}@`,
            oper: "L", 
            page: "1", 
            rp: "1"
        };

        //console.log(`[DEBUG IXC] Fazendo requisição POST para: ${url}`);
        //console.log(`[DEBUG IXC] Payload enviado:`, JSON.stringify(payload));

        try {
            const response = await axios.post(url, payload, { headers });
            
            //console.log(`[DEBUG IXC] Resposta recebida do IXC. Status Code: ${response.status}`);
            //console.log(`[DEBUG IXC] Total de registros encontrados no IXC: ${response.data?.total || 0}`);
            
            if (response.data && response.data.registros && response.data.registros.length > 0) {
                const ixcUser = response.data.registros[0];
                //console.log(`[DEBUG IXC] Dados do primeiro registro retornado pelo IXC:`, JSON.stringify(ixcUser));

                const idUsuarioIxc = ixcUser.id;
                const idFuncionarioIxc = ixcUser.funcionario;
                const statusIxc = ixcUser.status;
                const idGrupoIxc = ixcUser.id_grupo;

                //console.log(`[DEBUG IXC] Preparando UPDATE no banco local -> id_usuario_ixc: ${idUsuarioIxc}, id_funcionario_ixc: ${idFuncionarioIxc}, status_ixc: ${statusIxc}`);

                await new Promise((resolve, reject) => {
                    // Adicionamos o id_grupo_ixc na query
                    const QUERY = `UPDATE usuarios_intranet SET id_usuario_ixc = ?, id_funcionario_ixc = ?, status_ixc = ?, id_grupo_ixc = ? WHERE id = ?`;
                    LOCALHOST.query(QUERY, [idUsuarioIxc, idFuncionarioIxc, statusIxc, idGrupoIxc, user.id], (err, result: any) => {
                        if (err) {
                            //console.error(`[DEBUG IXC] Erro SQL ao tentar atualizar o banco local:`, err);
                            reject(err);
                        } else {
                            //console.log(`[DEBUG IXC] UPDATE realizado com sucesso! Linhas afetadas: ${result.affectedRows}`);
                            resolve(true);
                        }
                    });
                });

                user.id_usuario_ixc = idUsuarioIxc;
                user.id_funcionario_ixc = idFuncionarioIxc;
                user.status_ixc = statusIxc;
                user.id_grupo_ixc = idGrupoIxc;
                
                return user;
            } else {
                //console.log(`[DEBUG IXC] Nenhum usuário foi encontrado no IXC com o e-mail começando com '${username}@'.`);
                return user;
            }
        } catch (error: any) {
            //console.error("[DEBUG IXC] Ocorreu uma exceção ao comunicar com a API do IXC:");
            if (error.response) {
                //console.error("[DEBUG IXC] Data do erro:", JSON.stringify(error.response.data));
            } else {
                //console.error("[DEBUG IXC] Mensagem:", error.message);
            }
            return user;
        }
    }
};