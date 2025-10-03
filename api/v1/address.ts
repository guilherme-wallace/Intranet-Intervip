import { ViaCEPNotFoundError } from '../../errors/ViaCepErrors';
import { MySQLResponse } from '../../types/mysql-response';
import { PostalCode } from '../../types/postalcode';
import { Address } from '../../types/address';
import { Pool, escape } from 'mysql';
import axios from 'axios';

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
    try {
        const url = `https://viacep.com.br/ws/${postalCode}/json/`;
        
        const response = await axios.get<PostalCode>(url);

        if (response.data.erro) {
            throw new ViaCEPNotFoundError("CEP não encontrado");
        }

        const postalCodeData: PostalCode = response.data;
        const QUERY = `INSERT INTO postalCode (postalCodeId, address, neighbourhood, city, state) VALUES
            (${escape(postalCodeData.cep.slice(0,5) + postalCodeData.cep.slice(6))}, ${escape(postalCodeData.logradouro)}, 
            ${escape(postalCodeData.bairro)}, ${escape(postalCodeData.localidade)}, ${escape(postalCodeData.uf)});`;
           
        return new Promise<MySQLResponse>((resolve, reject) => {
            MySQL.query(QUERY, (error, dbResponse) => {
                if (error) return reject(error);
                return resolve(dbResponse);
            });
        });

    } catch (error) {
        console.error("Erro ao processar o CEP:", error);
        throw error;
    }
}