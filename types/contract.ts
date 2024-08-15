export type Contract = {
    contractId: string | null,
    status: string,
    clientId: number,
    plans: number[],
    name: string,
    bandwidth: number,
    cost: number,
    startDate: string | null,
    endDate: string | null,
    transferedTo: number | null
}