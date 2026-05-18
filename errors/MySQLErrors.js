"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLInvalidError = exports.MySQLReturnNullError = exports.MySQLError = void 0;
class MySQLError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, MySQLReturnNullError.prototype);
    }
}
exports.MySQLError = MySQLError;
class MySQLReturnNullError extends MySQLError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, MySQLReturnNullError.prototype);
    }
}
exports.MySQLReturnNullError = MySQLReturnNullError;
class MySQLInvalidError extends MySQLError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, MySQLInvalidError.prototype);
    }
}
exports.MySQLInvalidError = MySQLInvalidError;
