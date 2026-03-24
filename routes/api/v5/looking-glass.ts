// routes/api/v5/looking-glass.ts
import * as Express from 'express';
import { Client } from 'ssh2';

const router = Express.Router();

async function executarComandoHuawei(ipRouter: string, comando: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        
        conn.on('ready', () => {
            conn.exec(comando, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }
                
                let resultado = '';
                stream.on('close', (code, signal) => {
                    conn.end();
                    resolve(resultado);
                }).on('data', (data) => {
                    resultado += data.toString();
                }).stderr.on('data', (data) => {
                    console.error('Erro no fluxo stderr SSH:', data.toString());
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect({
            host: ipRouter,
            port: parseInt(process.env.LG_SSH_PORT || '65222'),
            username: process.env.LG_SSH_USER, 
            password: process.env.LG_SSH_PASS, 
            algorithms: {
                kex: ['diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'] 
            },
            readyTimeout: 10000
        });
    });
}

router.post('/consultar', async (req: Express.Request, res: Express.Response) => {
    const { type, target, router: selectedRouter } = req.body;

    if (!type || !target || !selectedRouter) {
        return res.status(400).json({ error: 'Parâmetros incompletos. type, target e router são obrigatórios.' });
    }

    let ipRouter = '';
    let loopbackInterface = 'LoopBack0';

    if (selectedRouter === 'VTA01') {
        ipRouter = process.env.LG_ROUTER_VTA01_IP || '10.225.1.253';
        loopbackInterface = 'LoopBack0';
    } else if (selectedRouter === 'SEA01') {
        ipRouter = process.env.LG_ROUTER_SEA01_IP || '172.31.0.78';
        loopbackInterface = 'LoopBack2';
    } else {
        return res.status(400).json({ error: 'Roteador inválido.' });
    }

    let comando = '';
    const safeTarget = target.replace(/[^a-fA-F0-9.:\/]/g, '');

    switch (type) {
        case 'bgp':
            const bgpTarget = safeTarget.replace('/', ' ');
            comando = `display bgp routing-table ${bgpTarget} longer-prefixes | no-more`;
            break;
        case 'ping':
            comando = `ping -i ${loopbackInterface} ${safeTarget}`;
            break;
        case 'trace':
            comando = `tracert -i ${loopbackInterface} ${safeTarget}`;
            break;
        case 'ping6':
            comando = `ping ipv6 ${safeTarget}`;
            break;
        case 'trace6':
            comando = `tracert ipv6 ${safeTarget}`;
            break;
        default:
            return res.status(400).json({ error: 'Tipo de consulta inválido.' });
    }

    try {
        const output = await executarComandoHuawei(ipRouter, comando);
        
        let cleanOutput = output;

        cleanOutput = cleanOutput.replace(/<[a-zA-Z0-9\-_]+>/g, '');

        cleanOutput = cleanOutput.replace(/^Info: The max number of VTY users.*$/gm, '');
        cleanOutput = cleanOutput.replace(/^\s*The (current|last) login.*$/gm, '');

        if (type === 'bgp') {
            const indexTotal = cleanOutput.indexOf('Total Number of Routes:');
            if (indexTotal !== -1) {
                cleanOutput = cleanOutput.substring(indexTotal);
            }
        }

        cleanOutput = cleanOutput.trim();
        
        if (!cleanOutput) {
            cleanOutput = 'Comando executado, mas não houve retorno textual (ou o prefixo não foi encontrado na tabela).';
        }
        
        return res.json({ success: true, output: cleanOutput });
    } catch (error: any) {
        console.error('Falha na execução do Looking Glass:', error.message);
        return res.status(500).json({ 
            error: 'Falha ao conectar no roteador via SSH.', 
            details: error.message 
        });
    }
});

export default router;