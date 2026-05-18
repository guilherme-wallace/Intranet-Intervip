"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViaCEPNotFoundError = exports.ViaCEPError = void 0;
class ViaCEPError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, ViaCEPError.prototype);
    }
}
exports.ViaCEPError = ViaCEPError;
class ViaCEPNotFoundError extends ViaCEPError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, ViaCEPNotFoundError.prototype);
    }
}
exports.ViaCEPNotFoundError = ViaCEPNotFoundError;
