import { Pool, escape } from 'mysql';

export async function getPlans(MySQL: Pool, groupId: number): Promise<string> {
    const QUERY = `SELECT PlanosRegrasComerciais.Codigo, PlanosPacotes.Descricao, Planos.Valor, PlanosPacotesItens.Desconto
        FROM isupergaus.PlanosRegrasComerciais LEFT JOIN isupergaus.PlanosPacotes
        ON PlanosRegrasComerciais.Codigo = PlanosPacotes.Codigo AND PlanosPacotes.Situacao = 'A'
        RIGHT JOIN isupergaus.PlanosPacotesItens ON PlanosPacotes.Codigo = PlanosPacotesItens.Pacote
        INNER JOIN isupergaus.Planos ON PlanosPacotesItens.Plano = Planos.Codigo
        WHERE find_in_set(${escape(groupId)}, PlanosRegrasComerciais.Filtro) AND PlanosRegrasComerciais.Situacao = 'A'
        ORDER BY Descricao DESC;`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}
