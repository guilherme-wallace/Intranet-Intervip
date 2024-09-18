import { Condominio } from "./condominio";

export type Block = {
    blockId: number,
    condominio: Condominio,
    structureId: number,
    name: string,
    typeId: number,
    floors: number,
    units: number,
    initialFloor: number
}
