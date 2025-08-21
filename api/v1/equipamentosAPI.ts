import { MySQLReturnNullError } from '../../errors/MySQLErrors';
import { MySQLResponse } from '../../types/mysql-response';
import { Equipamento } from '../../types/equipamentosType';
import { Pool, escape } from 'mysql';

/**
 * Busca todos os tipos de equipamentos disponíveis na tabela `equipamentos_tipo`.
 * @param MySQL O pool de conexão MySQL.
 * @returns Uma Promise com a lista de tipos de equipamento.
 */
export async function getTiposEquipamento(MySQL: Pool): Promise<any> {
    const QUERY = 'SELECT id_equipamentoTipo, tipo_equipamento FROM equipamentos_tipo;';

    return new Promise<any>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

/**
 * Busca equipamentos de rede com base em um termo de pesquisa (opcional).
 * Se nenhum termo for fornecido, retorna todos os equipamentos.
 * @param MySQL O pool de conexão MySQL.
 * @param searchTerm O termo de pesquisa para buscar por marca, modelo ou nome.
 * @returns Uma Promise com a lista de equipamentos que correspondem à pesquisa.
 */
export async function getEquipamentos(MySQL: Pool, searchTerm?: string): Promise<any> {
    let QUERY = `SELECT e.*, t.tipo_equipamento FROM equipamentos_rede AS e JOIN equipamentos_tipo AS t ON e.tipo_equipamentoId = t.id_equipamentoTipo`;
    const params = [];

    if (searchTerm) {
        QUERY += ` WHERE e.marca LIKE ? OR e.modelo LIKE ? OR e.nome LIKE ?`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    // Adiciona o orderBy para retornar a tabela ordenada
    QUERY += ` ORDER BY e.marca, e.modelo;`;

    return new Promise<any>((resolve, reject) => {
        MySQL.query(QUERY, params, (error, response) => {
            if (error) return reject(error);
            if (!response || response.length === 0) {
                // Ao contrário da busca de blocos, aqui não há erro, apenas nenhum resultado.
                return resolve([]); 
            }
            return resolve(response);
        });
    });
}

/**
 * Cadastra um novo equipamento de rede no banco de dados.
 * @param MySQL O pool de conexão MySQL.
 * @param equipamento O objeto de equipamento a ser cadastrado.
 * @returns Uma Promise com a resposta do MySQL.
 */
export async function postEquipamento(MySQL: Pool, equipamento: Equipamento): Promise<MySQLResponse> {
    const QUERY = `
        INSERT INTO equipamentos_rede (
            tipo_equipamentoId, nome, marca, modelo, num_portas_wan, porta_gpon,
            porta_sfp, num_portas_lan, padrao_wifi, ethernet_tipo, velocidade_lan,
            velocidade_wifi_2_4, velocidade_wifi_5_8, cobertura_wifi, densidade_wifi,
            mimo, mesh, tipo_mesh, suporte_tr069, ipv6, endereco_ip, nome_usuario,
            senha_acesso, fonte, preco_medio, data_ultima_atualizacao_preco, site, observacoes
        ) VALUES (
            ${escape(equipamento.tipo_equipamentoId)},
            ${escape(equipamento.nome)},
            ${escape(equipamento.marca)},
            ${escape(equipamento.modelo)},
            ${escape(equipamento.num_portas_wan)},
            ${escape(equipamento.porta_gpon)},
            ${escape(equipamento.porta_sfp)},
            ${escape(equipamento.num_portas_lan)},
            ${escape(equipamento.padrao_wifi)},
            ${escape(equipamento.ethernet_tipo)},
            ${escape(equipamento.velocidade_lan)},
            ${escape(equipamento.velocidade_wifi_2_4)},
            ${escape(equipamento.velocidade_wifi_5_8)},
            ${escape(equipamento.cobertura_wifi)},
            ${escape(equipamento.densidade_wifi)},
            ${escape(equipamento.mimo)},
            ${escape(equipamento.mesh)},
            ${escape(equipamento.tipo_mesh)},
            ${escape(equipamento.suporte_tr069)},
            ${escape(equipamento.ipv6)},
            ${escape(equipamento.endereco_ip)},
            ${escape(equipamento.nome_usuario)},
            ${escape(equipamento.senha_acesso)},
            ${escape(equipamento.fonte)},
            ${escape(equipamento.preco_medio)},
            ${equipamento.data_ultima_atualizacao_preco ? escape(equipamento.data_ultima_atualizacao_preco) : 'NULL'},
            ${escape(equipamento.site)},
            ${escape(equipamento.observacoes)}
        );
    `;

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

/**
 * Atualiza um equipamento de rede existente no banco de dados.
 * @param MySQL O pool de conexão MySQL.
 * @param equipamento O objeto de equipamento a ser atualizado.
 * @returns Uma Promise com a resposta do MySQL.
 */
export async function putEquipamento(MySQL: Pool, equipamento: Equipamento): Promise<MySQLResponse> {
    const QUERY = `
        UPDATE equipamentos_rede SET
            nome = ${escape(equipamento.nome)},
            marca = ${escape(equipamento.marca)},
            modelo = ${escape(equipamento.modelo)},
            num_portas_wan = ${escape(equipamento.num_portas_wan)},
            porta_gpon = ${escape(equipamento.porta_gpon)},
            porta_sfp = ${escape(equipamento.porta_sfp)},
            num_portas_lan = ${escape(equipamento.num_portas_lan)},
            padrao_wifi = ${escape(equipamento.padrao_wifi)},
            ethernet_tipo = ${escape(equipamento.ethernet_tipo)},
            velocidade_lan = ${escape(equipamento.velocidade_lan)},
            velocidade_wifi_2_4 = ${escape(equipamento.velocidade_wifi_2_4)},
            velocidade_wifi_5_8 = ${escape(equipamento.velocidade_wifi_5_8)},
            cobertura_wifi = ${escape(equipamento.cobertura_wifi)},
            densidade_wifi = ${escape(equipamento.densidade_wifi)},
            mimo = ${escape(equipamento.mimo)},
            mesh = ${escape(equipamento.mesh)},
            tipo_mesh = ${escape(equipamento.tipo_mesh)},
            suporte_tr069 = ${escape(equipamento.suporte_tr069)},
            ipv6 = ${escape(equipamento.ipv6)},
            endereco_ip = ${escape(equipamento.endereco_ip)},
            nome_usuario = ${escape(equipamento.nome_usuario)},
            senha_acesso = ${escape(equipamento.senha_acesso)},
            fonte = ${escape(equipamento.fonte)},
            preco_medio = ${escape(equipamento.preco_medio)},
            data_ultima_atualizacao_preco = ${equipamento.data_ultima_atualizacao_preco ? escape(equipamento.data_ultima_atualizacao_preco) : 'NULL'},
            site = ${escape(equipamento.site)},
            observacoes = ${escape(equipamento.observacoes)}
        WHERE id_equipamento = ${escape(equipamento.id_equipamento)};
    `;

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

/**
 * Deleta um equipamento de rede do banco de dados.
 * @param MySQL O pool de conexão MySQL.
 * @param equipamentoId O ID do equipamento a ser deletado.
 * @returns Uma Promise com a resposta do MySQL.
 */
export async function deleteEquipamento(MySQL: Pool, equipamentoId: number): Promise<string> {
    const QUERY = `DELETE FROM equipamentos_rede WHERE id_equipamento = ${escape(equipamentoId)};`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}
