export class ViaCEPError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ViaCEPError.prototype);
    }
}

export class ViaCEPNotFoundError extends ViaCEPError {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ViaCEPNotFoundError.prototype);
    }
}