import { ViaCEPNotFoundError } from '../../../errors/ViaCepErrors';
import { Request, Response } from 'express-serve-static-core';
import { MySQLResponse } from '../../../types/mysql-response';
import api = require('../../../api/index');
import * as Express from 'express';

const ADDRESS = Express.Router();

ADDRESS.post('/', async (req: Request, res: Response, next) => {
    for (let i = 1; i <= 3; i++) {
        try {
            let response: MySQLResponse = await api.v1.PostAddress(req.body);
            return res.json(response);
        }
    
        catch (error) {
            if (error.code == 'ER_NO_REFERENCED_ROW') {
                try {
                    await api.v1.PostPostalCode(req.body.postalCodeId);
                    let response: MySQLResponse = await api.v1.PostAddress(req.body);
                    return res.json(response);
                }

                catch (error) {
                    if (error instanceof ViaCEPNotFoundError) {
                        return res.status(400).json({error: "Invalid CEP."});
                    }
                }
            }

            console.log(error);
            return res.status(500).json({error: "Internal server error."});  
        }
    }
});

export default ADDRESS;