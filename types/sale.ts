import { Salesperson } from "./salesperson";
import { Technology } from "./technology";
import { Contract } from "./contract";
import { Research } from "./research";
import { Address } from "./address";
import { Condominio } from "./condominio";

export type Sale = {
    saleId: number,
    contract: Contract,
    clientId: number,
    condominio: Condominio,
    address: Address,
    operation: string,
    technology: Technology,
    research: Research | null,
    datetime: string,
    salesperson: Salesperson,
    observation: string | null
}