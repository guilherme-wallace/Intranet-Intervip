require('dotenv').config();
const axios = require('axios');

const BODY_LIMIT = 1000;

function limparDocumento(documento) {
    return String(documento || '').replace(/\D/g, '');
}

function limitar(valor) {
    const texto = typeof valor === 'string' ? valor : JSON.stringify(valor);
    if (!texto) return '';
    return texto.length > BODY_LIMIT ? `${texto.slice(0, BODY_LIMIT)}...[truncado]` : texto;
}

function tipoConsumidorPorDocumento(documento) {
    return documento.length === 14 ? 'J' : 'F';
}

function codigoProdutoPorTipo(tipoConsumidor) {
    const codigoEspecifico = tipoConsumidor === 'J'
        ? process.env.SPC_CODIGO_PRODUTO_PJ
        : process.env.SPC_CODIGO_PRODUTO_PF;
    return String(
        codigoEspecifico
        || process.env.SPC_CODIGO_PRODUTO_PADRAO
        || process.env.SPC_CODIGO_PRODUTO
        || ''
    ).trim();
}

function insumosOpcionais() {
    return String(process.env.SPC_CODIGO_INSUMO_OPCIONAL || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => /^\d+$/.test(item) ? Number(item) : item);
}

async function main() {
    const documento = limparDocumento(process.argv[2] || process.env.SPC_TEST_DOCUMENTO || '');
    const baseUrl = String(process.env.SPC_BASE_URL || '').replace(/\/+$/, '');
    const url = process.env.SPC_CONSULTA_PADRAO_URL || (baseUrl ? `${baseUrl}/spcconsulta/recurso/consulta/padrao` : '');
    const method = String(process.env.SPC_HTTP_METHOD || 'POST').toUpperCase();
    const timeout = Number(process.env.SPC_TIMEOUT_MS || 90000);
    const username = process.env.SPC_USERNAME_WEB_SERVICE;
    const password = process.env.SPC_PASSWORD_WEB_SERVICE;

    if (!documento) {
        console.error('Informe um CPF/CNPJ no argumento ou em SPC_TEST_DOCUMENTO.');
        process.exit(1);
    }

    if (!url || !username || !password) {
        console.error('Configuracao SPC incompleta. Verifique URL, usuario e senha no .env.');
        process.exit(1);
    }

    const tipoConsumidor = tipoConsumidorPorDocumento(documento);
    const codigoProduto = codigoProdutoPorTipo(tipoConsumidor);

    if (!codigoProduto) {
        console.error('Codigo de produto SPC nao configurado. Defina SPC_CODIGO_PRODUTO_PADRAO, SPC_CODIGO_PRODUTO_PF ou SPC_CODIGO_PRODUTO_PJ.');
        process.exit(1);
    }

    const payload = {
        codigoProduto,
        tipoConsumidor,
        documentoConsumidor: documento,
        codigoInsumoOpcional: insumosOpcionais()
    };

    const authorization = Buffer.from(`${username}:${password}`).toString('base64');

    console.log('[SPC Diagnostico]');
    console.log(`Ambiente: ${process.env.SPC_ENV || 'homologacao'}`);
    console.log(`Metodo: ${method}`);
    console.log(`URL: ${url}`);
    console.log(`Timeout: ${timeout}ms`);
    console.log(`Tipo consumidor: ${tipoConsumidor}`);
    console.log(`Codigo produto usado: ${codigoProduto}`);
    console.log(`Insumos opcionais: ${payload.codigoInsumoOpcional.length ? payload.codigoInsumoOpcional.join(',') : 'nenhum'}`);
    console.log(`Documento: ${documento.slice(0, 3)}***${documento.slice(-2)}`);

    const inicio = Date.now();
    try {
        const response = await axios.request({
            method,
            url,
            timeout,
            headers: {
                Authorization: `Basic ${authorization}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            params: method === 'GET' ? payload : undefined,
            data: method === 'GET' ? undefined : payload,
            validateStatus: () => true
        });

        const duracaoSegundos = ((Date.now() - inicio) / 1000).toFixed(1);
        console.log(`Status HTTP: ${response.status}`);
        console.log(`Content-Type: ${response.headers?.['content-type'] || 'nao informado'}`);
        console.log(`Tempo total: ${duracaoSegundos}s`);
        console.log('Body resumido:');
        console.log(limitar(response.data));
    } catch (error) {
        const duracaoSegundos = ((Date.now() - inicio) / 1000).toFixed(1);
        console.log(`Erro de rede/camada HTTP: ${error.code || 'SEM_CODIGO'}`);
        console.log(`Mensagem: ${error.message}`);
        console.log(`Tempo total: ${duracaoSegundos}s`);
        if (error.response) {
            console.log(`Status HTTP: ${error.response.status}`);
            console.log(`Content-Type: ${error.response.headers?.['content-type'] || 'nao informado'}`);
            console.log('Body resumido:');
            console.log(limitar(error.response.data));
        }
    }
}

main();
