import { MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { Request, Response } from 'express-serve-static-core';
import { Plan } from '../../../types/plan';
import api = require('../../../api/index');
import * as Express from 'express';

const PLAN = Express.Router();

PLAN.get('/', async (req: Request, res: Response, next) => {
    try {
        let response: Plan[] = await api.v3.GetPlans(req.query.query?.toString() ?? '');
        return res.json(response);
    }

    catch (error) {
        if (error instanceof MySQLReturnNullError) {
            return res.status(404).json({error: "Not found."});
        }

        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default PLAN;