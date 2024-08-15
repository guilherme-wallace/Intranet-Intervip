export class MySQLError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, MySQLReturnNullError.prototype);
    }
}

export class MySQLReturnNullError extends MySQLError {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, MySQLReturnNullError.prototype);
    }
}

export class MySQLInvalidError extends MySQLError {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, MySQLInvalidError.prototype);
    }
}