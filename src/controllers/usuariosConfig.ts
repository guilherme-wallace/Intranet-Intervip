// src/controllers/usuariosConfig.ts
import { LOCALHOST } from '../../api/database';
import * as bcrypt from 'bcrypt';

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
    }
};