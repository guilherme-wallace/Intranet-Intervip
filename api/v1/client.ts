import { MySQLReturnNullError } from '../../errors/MySQLErrors';
import { Pool, escape } from 'mysql';

export async function getClients(MySQL: Pool, groupId: number): Promise<string> {
    const QUERY = `SELECT Clientes.Codigo, Clientes.Complemento, ClientesUsuarios.Usuario
        FROM isupergaus.Clientes INNER JOIN isupergaus.Contratos
        ON Clientes.Codigo = Contratos.Cliente AND Contratos.Situacao = 'A'
        LEFT JOIN isupergaus.ClientesUsuarios ON ClientesUsuarios.Cliente = Clientes.Codigo
        AND ClientesUsuarios.Situacao = 'A' AND ClientesUsuarios.NAS != -2
        WHERE Clientes.Grupo = ${escape(groupId)} GROUP BY Clientes.Codigo;`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getClient(MySQL: Pool, clientId: number): Promise<string> {
    const QUERY = `SELECT Clientes.Nome, Clientes.Nascimento, Clientes.Email, Clientes.TelCelular,
        Clientes.Grupo, Clientes.Endereco, Clientes.Numero, Clientes.Complemento, Clientes.Bairro,
        Clientes.Cidade, Clientes.CEP, Clientes.UF FROM isupergaus.Clientes WHERE Clientes.Codigo = ${escape(clientId)};`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);

            if (!response[0]) {
                return reject(new MySQLReturnNullError());
            }
            
            return resolve(response[0]);
        });
    });
}

export async function getClientAuth(MySQL: Pool, clientId: number, login: string): Promise<string> {
    const QUERY = `SELECT radacct.cliente, radacct.framedipaddress, radacct.acctstarttime, radacct.acctstoptime
        FROM isupergaus.radacct WHERE radacct.cliente = ${escape(clientId)} AND radacct.username = ${escape(login)}
        ORDER BY radacct.acctstoptime LIMIT 1;`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);

            if (!response[0]) {
                return reject(new MySQLReturnNullError());
            }
            
            return resolve(response[0]);
        });
    });
}
