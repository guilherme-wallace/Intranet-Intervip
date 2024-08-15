import { Request, Response } from 'express-serve-static-core';
import api = require('../../../api/index');
import * as Express from 'express';

const CLIENT = Express.Router();

CLIENT.get('/:id', async (req: Request, res: Response, next) => {
    try {
        let response = await api.v4.GetClient(req.params['id']);
        return res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

CLIENT.get('/group/:id', async (req: Request, res: Response, next) => {
    try {
        let response = await api.v4.GetClientsByGroup(req.params['id']);
        return res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default CLIENT;
