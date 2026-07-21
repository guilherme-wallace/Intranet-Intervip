require('dotenv').config({ quiet: true });

const {
    faturarAtivacaoContrato,
    findActivationFinancialCandidate,
    findActivationSaleCandidate,
    isAutomaticActivationBillingEnabled,
    listarFnAReceberPorContrato,
    listarVdSaidaPorContrato,
    validarFinalizarSaida
} = require('../src/services/ixcActivationBillingService');
const {
    calculateIxcActivationDueDate,
    ensureCreditContractAuditTable,
    getIxcCreditContractConfig
} = require('../src/services/ixcCreditContractService');
const { AgendaService } = require('../routes/api/v5/agendaService');

function option(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
}

function has(name) {
    return process.argv.includes(name);
}

function usage() {
    console.log([
        'Uso:',
        '  npm.cmd run test:ixc-ativacao -- <id_contrato> --check [--valor 150|250]',
        '  npm.cmd run test:ixc-ativacao -- <id_contrato> --finalizar <id_saida> [--valor 150|250]',
        '  npm.cmd run test:ixc-ativacao -- <id_contrato> --faturar-auto --valor 150|250 --yes',
        '  npm.cmd run test:ixc-ativacao -- <id_contrato> --faturar-auto --valor 150|250 --reconciliar-sem-venda --yes',
        '',
        'Sem --finalizar ou --faturar-auto, o script apenas consulta. Nunca cria vd_saida por padrao.'
    ].join('\n'));
}

function safeFinancial(record) {
    return {
        id: record?.id || null,
        id_saida: record?.id_saida || null,
        id_contrato: record?.id_contrato || null,
        valor: record?.valor || record?.valor_total || null,
        status: record?.status || null,
        liberado: record?.liberado || null,
        data_vencimento: record?.data_vencimento || null,
        documento: String(record?.documento || '').slice(0, 80),
        obs: String(record?.obs || '').slice(0, 120)
    };
}

function safeSale(record) {
    return {
        id: record?.id || record?.id_saida || null,
        id_contrato: record?.id_contrato || null,
        id_contrato_avulso: record?.id_contrato_avulso || null,
        id_cliente: record?.id_cliente || null,
        valor_total: record?.valor_total || null,
        valor_produto_ativacao: record?.valor_produto_ativacao || null,
        id_produto_ativacao: record?.id_produto_ativacao || null,
        criada_contrato_taxa_ativacao: record?.criada_contrato_taxa_ativacao || null,
        status: record?.status || null
    };
}

const requestIxc = (method, endpoint, data, operationType, context) =>
    AgendaService.makeIxcRequest(method, endpoint, data, operationType, context);

async function check(idContrato, valor) {
    const context = { requestId: `diag-ativacao-${Date.now()}`, usuario: 'script-diagnostico' };
    const [financials, sales] = await Promise.all([
        listarFnAReceberPorContrato(idContrato, requestIxc, context),
        listarVdSaidaPorContrato(idContrato, requestIxc, context)
    ]);
    console.log(JSON.stringify({
        idContrato,
        somenteConsulta: true,
        totalFnAReceber: financials.length,
        totalVdSaida: sales.length,
        fnAReceber: financials.map(safeFinancial),
        vdSaida: sales.map(safeSale)
    }, null, 2));

    if (valor) {
        const config = getIxcCreditContractConfig();
        const params = {
            idContrato: String(idContrato),
            taxaAtivacao: Number(valor),
            idProdutoAtivacao: config.produtoTaxaAtivacaoId
        };
        const sale = findActivationSaleCandidate(sales, params);
        const financial = findActivationFinancialCandidate(financials, params, sales);
        console.log(JSON.stringify({
            valorEsperado: Number(valor).toFixed(2),
            vendaAtivacaoCandidata: sale ? safeSale(sale) : null,
            financeiroAtivacaoCandidato: financial ? safeFinancial(financial) : null,
            riscoDuplicidade: Boolean(sale || financial)
        }, null, 2));
    }
    return { financials, sales };
}

async function loadContract(idContrato) {
    const response = await requestIxc('POST', '/cliente_contrato', {
        qtype: 'cliente_contrato.id', query: String(idContrato), oper: '=', rp: '1'
    }, null, { usuario: 'script-diagnostico' });
    const contract = response?.registros?.[0];
    if (!contract) throw new Error(`Contrato ${idContrato} nao encontrado no IXC.`);
    return contract;
}

async function loadAudit(idContrato) {
    await ensureCreditContractAuditTable();
    const rows = await AgendaService.executeDb(
        `SELECT id, analise_credito_id, id_cliente, id_contrato_ixc,
                status_faturamento_ativacao, id_vd_saida_ativacao
         FROM ivp_contrato_credito_auditoria
         WHERE id_contrato_ixc = ?
         ORDER BY id DESC LIMIT 1`,
        [String(idContrato)]
    );
    if (!rows?.[0]) throw new Error(`Auditoria de credito do contrato ${idContrato} nao encontrada.`);
    return rows[0];
}

async function main() {
    if (has('--help') || has('-h')) {
        usage();
        return;
    }
    const idContrato = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
    if (!idContrato) {
        usage();
        process.exitCode = 1;
        return;
    }
    const valor = option('--valor');
    if (valor && !['150', '250', '150.00', '250.00'].includes(String(valor))) {
        throw new Error('--valor deve ser 150 ou 250.');
    }

    const idSaidaFinalizar = option('--finalizar');
    if (idSaidaFinalizar) {
        const before = await check(idContrato, valor);
        const sale = before.sales.find(item => String(item?.id || item?.id_saida || '') === String(idSaidaFinalizar));
        const saleContract = String(sale?.id_contrato_avulso || sale?.id_contrato || '');
        if (!sale || saleContract !== String(idContrato)) {
            throw new Error(`A vd_saida ${idSaidaFinalizar} nao foi encontrada vinculada ao contrato ${idContrato}. Finalizacao bloqueada.`);
        }
        const audit = await loadAudit(idContrato);
        if (audit.id_vd_saida_ativacao && String(audit.id_vd_saida_ativacao) !== String(idSaidaFinalizar)) {
            throw new Error(`A auditoria ja esta vinculada a vd_saida ${audit.id_vd_saida_ativacao}. A saida ${idSaidaFinalizar} nao sera finalizada.`);
        }
        if (!audit.id_vd_saida_ativacao) {
            const saved = await AgendaService.executeDb(
                `UPDATE ivp_contrato_credito_auditoria
                 SET id_vd_saida_ativacao = ?, status_faturamento_ativacao = 'PROCESSANDO_FATURAMENTO',
                     mensagem_faturamento_ativacao = 'Finalizacao segura iniciada pelo script de diagnostico.',
                     faturamento_ativacao_started_at = COALESCE(faturamento_ativacao_started_at, NOW())
                 WHERE id = ? AND id_vd_saida_ativacao IS NULL`,
                [String(idSaidaFinalizar), Number(audit.id)]
            );
            if (Number(saved?.affectedRows || 0) !== 1) {
                throw new Error('Nao foi possivel reservar a vd_saida na auditoria. Finalizacao bloqueada.');
            }
        }
        await validarFinalizarSaida(idSaidaFinalizar, requestIxc, {
            requestId: `diag-finalizar-${Date.now()}`,
            usuario: 'script-diagnostico'
        });
        console.log(`vd_saida ${idSaidaFinalizar} enviada para validar_finalizar_saida. Conferindo financeiro...`);
        const effectiveValue = valor || sale.valor_produto_ativacao || sale.valor_total;
        const after = await check(idContrato, effectiveValue);
        const config = getIxcCreditContractConfig();
        const candidate = effectiveValue
            ? findActivationFinancialCandidate(after.financials, {
                idContrato: String(idContrato),
                taxaAtivacao: Number(effectiveValue),
                idProdutoAtivacao: config.produtoTaxaAtivacaoId
            }, after.sales)
            : null;
        await AgendaService.executeDb(
            `UPDATE ivp_contrato_credito_auditoria
             SET status_faturamento_ativacao = ?, mensagem_faturamento_ativacao = ?,
                 id_fn_areceber_ativacao = ?, faturamento_ativacao_finished_at = NOW()
             WHERE id = ?`,
            candidate
                ? ['FATURADO', 'Taxa de ativacao faturada automaticamente no IXC.', String(candidate.id || ''), Number(audit.id)]
                : ['VENDA_ATIVACAO_GERADA', 'Venda da taxa de ativacao gerada no IXC; financeiro ainda nao confirmado.', null, Number(audit.id)]
        );
        return;
    }

    if (has('--faturar-auto')) {
        if (!has('--yes')) throw new Error('--faturar-auto exige confirmacao explicita com --yes.');
        if (!isAutomaticActivationBillingEnabled()) {
            throw new Error('IXC_FATURAR_ATIVACAO_AUTOMATICO nao esta habilitado. Nenhuma venda foi criada.');
        }
        if (!valor) throw new Error('--faturar-auto exige --valor 150 ou --valor 250.');

        const [contract, audit] = await Promise.all([loadContract(idContrato), loadAudit(idContrato)]);
        const config = getIxcCreditContractConfig();
        if (has('--reconciliar-sem-venda')) {
            if (audit.id_vd_saida_ativacao) {
                throw new Error(`A auditoria ja possui a vd_saida ${audit.id_vd_saida_ativacao}. Reconciliacao sem venda bloqueada.`);
            }
            const reconciliation = await check(idContrato, valor);
            const candidateSale = findActivationSaleCandidate(reconciliation.sales, {
                idContrato: String(idContrato),
                taxaAtivacao: Number(valor),
                idProdutoAtivacao: config.produtoTaxaAtivacaoId
            });
            const candidateFinancial = findActivationFinancialCandidate(reconciliation.financials, {
                idContrato: String(idContrato),
                taxaAtivacao: Number(valor),
                idProdutoAtivacao: config.produtoTaxaAtivacaoId
            }, reconciliation.sales);
            if (candidateSale || candidateFinancial) {
                throw new Error('Foi encontrada evidencia de venda ou financeiro. Reconciliacao bloqueada para evitar duplicidade.');
            }
            const reconciled = await AgendaService.executeDb(
                `UPDATE ivp_contrato_credito_auditoria
                 SET status_faturamento_ativacao = 'ERRO_SEM_VENDA',
                     mensagem_faturamento_ativacao = 'Ausencia de vd_saida e fn_areceber confirmada pelo diagnostico; liberado para reprocessamento explicito.'
                 WHERE id = ? AND id_vd_saida_ativacao IS NULL
                   AND status_faturamento_ativacao = 'ERRO_FATURAR_ATIVACAO'`,
                [Number(audit.id)]
            );
            if (Number(reconciled?.affectedRows || 0) !== 1 && audit.status_faturamento_ativacao !== 'ERRO_SEM_VENDA') {
                throw new Error('A auditoria nao estava em estado elegivel para reconciliacao sem venda.');
            }
            console.log('Auditoria reconciliada sem venda. O faturamento explicito continuara usando as mesmas protecoes de duplicidade.');
        }
        const idVendedorAtivacao = String(contract.id_vendedor_ativ || '').trim();
        const result = await faturarAtivacaoContrato({
            auditoriaId: Number(audit.id),
            idContrato: String(idContrato),
            idCliente: String(contract.id_cliente || audit.id_cliente || ''),
            taxaAtivacao: Number(valor),
            idProdutoAtivacao: config.produtoTaxaAtivacaoId,
            idTipoDocumentoAtivacao: config.tipoDocAtivacaoId,
            idCondicaoPagamento: config.condPagAtivacaoUnicaId,
            idFilial: String(contract.id_filial || contract.filial_id || ''),
            idVendedor: idVendedorAtivacao && idVendedorAtivacao !== '0'
                ? idVendedorAtivacao
                : String(contract.id_vendedor || ''),
            idResponsavel: String(contract.id_responsavel || ''),
            vencimento: calculateIxcActivationDueDate(config.ativacaoVencimentoDias),
            requestId: `diag-faturar-${Date.now()}`,
            analiseCreditoId: Number(audit.analise_credito_id),
            usuario: 'script-diagnostico'
        }, { requestIxc, automaticEnabled: true });
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    await check(idContrato, valor);
}

main().catch(error => {
    console.error(`ERRO: ${String(error?.message || error)}`);
    process.exitCode = 1;
});
