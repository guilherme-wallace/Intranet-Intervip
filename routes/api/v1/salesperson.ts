import { MySQLInvalidError, MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { Request, Response } from 'express-serve-static-core';
import { Salesperson } from '../../../types/salesperson';
import api = require('../../../api/index');
import * as Express from 'express';

const SALESPERSON = Express.Router();

SALESPERSON.get('/', async (req: Request, res: Response, next) => {
    try {
        let response: Salesperson[] = await api.v1.GetSalespeople(req.query.query?.toString() ?? null);
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

SALESPERSON.get('/:id', async (req: Request, res: Response, next) => {
    try {
        var salespersonId: number = parseInt(req.params.id);

        if (salespersonId) {
            let response: Salesperson = await api.v1.GetSalesperson(salespersonId);
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

export default SALESPERSON;