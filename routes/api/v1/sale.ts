import { MySQLInvalidError, MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { ViaCEPNotFoundError } from '../../../errors/ViaCepErrors';
import { Request, Response } from 'express-serve-static-core';
import { MySQLResponse } from '../../../types/mysql-response';
import { Sale } from '../../../types/sale';
import api = require('../../../api/index');
import * as Express from 'express';

const SALE = Express.Router();

SALE.get('/:id', async (req: Request, res: Response, next) => {
    try {
        var clientId: number = +req.params.id;
        var contractId: string = String(req.params.id);

        if (clientId && clientId < 999999) {
            let response: Sale[] = await api.v1.GetSalesByClient(clientId);
            return res.json(response);
        }

        else if (contractId) {
            let response: Sale[] = await api.v1.GetSalesByContract(contractId);
            return res.json(response);
        }

        else {
            throw new MySQLInvalidError();
        }
    }

    catch (error) {
        if (error instanceof MySQLReturnNullError) {
            return res.status(404).json({error: "Not found."});
        }

        else if (error instanceof MySQLInvalidError) {
            return res.status(400).json({error: "Invalid client ID."});
        }

        else {
            console.log(error);
            return res.status(500).json({error: "Internal server error."});
        }
    }
});

SALE.post('/', async (req: Request, res: Response, next) => {
    try {
        let response: MySQLResponse = await api.v1.PostSale(req.body);
        return res.status(201).json(response);
    }

    catch (error) {
        if (error instanceof MySQLInvalidError) {
            return res.status(400).json({error: "Invalid entry."});
        }

        else if (error instanceof ViaCEPNotFoundError) {
            return res.status(401).json({error: "Invalid CEP."});
        }

        else {
            console.log(error);
            return res.status(500).json({error: "Internal server error."});
        }    
    }
});

export default SALE;