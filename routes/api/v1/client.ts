import { MySQLInvalidError, MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { Request, Response } from 'express-serve-static-core';
import api = require('../../../api/index');
import * as Express from 'express';

const CLIENT = Express.Router();

CLIENT.get('/:id', async (req: Request, res: Response, next) => {
    try {
        var id: number = parseInt(req.params.id);

        if (id) {
            let response: string = await api.v1.GetClient(id);
            return res.json(response);
        }

        else {
            throw new MySQLInvalidError();
        }
    }

    catch (e) {
        if (e instanceof MySQLReturnNullError) {
            return res.status(404).json({ error: "Not found." });
        }

        else if (e instanceof MySQLInvalidError) {
            return res.status(400).json({ error: "Invalid client ID." });
        }

        else {
            console.log(e);
            return res.status(500).json({error: "Internal server error."});
        }
    }
});

CLIENT.get('/group/:id', async (req: Request, res: Response, next) => {
    try {
        let response: string = await api.v1.GetClients(+req.params.id);
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

CLIENT.get('/authentication/:id', async (req: Request, res: Response, next) => {
    try {
        let response: string = await api.v1.GetClientAuth(+req.params.id, String(req.query.username));
        return res.json(response);
    }

    catch (error) {
        if (error instanceof MySQLReturnNullError) {
            return res.status(404).json({error: 'Not found.'});
        }

        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default CLIENT;