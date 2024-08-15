import { ViaCEPNotFoundError } from '../../errors/ViaCepErrors';
import { MySQLResponse } from '../../types/mysql-response';
import { PostalCode } from '../../types/postalcode';
import { Address } from '../../types/address';
import { Pool, escape } from 'mysql';

export async function getAddress(MySQL: Pool, addressId: number): Promise<Address> {
    const QUERY = `SELECT * FROM saleAddress JOIN postalCode
        ON saleAddress.postalCodeId = postalCode.postalCodeId
        WHERE saleAddress.addressId = ${escape(addressId)};`;

    return new Promise<Address>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response[0]);
        });
    });
}

export async function postAddress(MySQL: Pool, address: Address): Promise<MySQLResponse> {
    const QUERY = `INSERT INTO saleAddress (postalCodeId,
        number, complement) VALUES (${escape(address.postalCodeId)},
        ${escape(address.number)}, ${escape(address.complement)});`;

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function postPostalCode(MySQL: Pool, postalCode: string): Promise<MySQLResponse> {    
    var request = require('request');
            
	return new Promise<MySQLResponse>((resolve, reject) => {
        request(`https://viacep.com.br/ws/${postalCode}/json/`, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (JSON.parse(body).erro) {
                    return reject(new ViaCEPNotFoundError());
                }

                let postalCode: PostalCode = JSON.parse(body);

                const QUERY = `INSERT INTO postalCode (postalCodeId, address, neighbourhood, city, state) VALUES
                    (${escape(postalCode.cep.slice(0,5) + postalCode.cep.slice(6))}, ${escape(postalCode.logradouro)},
                    ${escape(postalCode.bairro)}, ${escape(postalCode.localidade)}, ${escape(postalCode.uf)});`;
                   
                MySQL.query(QUERY, (error, response) => {
                    if (error) return reject(error);
                    return resolve(response);
                });
            }
    
            else throw error;
        });
    });
}
