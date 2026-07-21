export interface IxcPendingOnu {
    id_hash: string;
    olt_name: string;
    frame: string;
    slot: string;
    pon: string;
    model: string;
    mac: string;
}

function text(value: any): string {
    return value === null || typeof value === 'undefined' ? '' : String(value).trim();
}

/**
 * O IXC passou a retornar sete colunas em fh_onu_nao_autorizadas:
 * OLT, frame, slot, pon, identificador interno, modelo e serial/MAC.
 * O formato anterior possuia seis colunas e nao tinha o identificador interno.
 */
export function normalizeIxcPendingOnuRow(row: any): IxcPendingOnu {
    const cells = Array.isArray(row?.cell) ? row.cell : [];
    const novoFormato = cells.length >= 7;

    return {
        id_hash: text(row?.id ?? row?.id_hash),
        olt_name: text(cells[0] ?? row?.olt_name ?? row?.olt_info),
        frame: text(cells[1] ?? row?.frame),
        slot: text(cells[2] ?? row?.slot),
        pon: text(cells[3] ?? row?.pon),
        model: text((novoFormato ? cells[5] : cells[4]) ?? row?.model ?? row?.modelo),
        mac: text((novoFormato ? cells[6] : cells[5]) ?? row?.mac ?? row?.serial)
    };
}
