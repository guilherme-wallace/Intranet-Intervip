export type Equipamento = {
    id_equipamento: number;
    tipo_equipamentoId: number;
    nome?: string;
    marca: string;
    modelo: string;
    num_portas_wan?: number;
    porta_gpon?: boolean;
    porta_sfp?: boolean;
    num_portas_lan?: number;
    padrao_wifi?: string;
    ethernet_tipo?: string;
    velocidade_lan?: string;
    velocidade_wifi_2_4?: string;
    velocidade_wifi_5_8?: string;
    cobertura_wifi?: string;
    densidade_wifi?: string;
    mimo?: string;
    mesh?: boolean;
    tipo_mesh?: string;
    suporte_tr069?: boolean;
    ipv6?: boolean;
    endereco_ip?: string;
    nome_usuario?: string;
    senha_acesso?: string;
    fonte?: string;
    preco_medio?: number;
    data_ultima_atualizacao_preco?: Date;
    site?: string;
    observacoes?: string;
};

export type TipoEquipamento = {
    id_equipamentoTipo: number;
    tipo_equipamento: string;
};
