"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLInvalidError = exports.MySQLReturnNullError = exports.MySQLError = void 0;
var MySQLError = /** @class */ (function (_super) {
    __extends(MySQLError, _super);
    function MySQLError(message) {
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, MySQLReturnNullError.prototype);
        return _this;
    }
    return MySQLError;
}(Error));
exports.MySQLError = MySQLError;
var MySQLReturnNullError = /** @class */ (function (_super) {
    __extends(MySQLReturnNullError, _super);
    function MySQLReturnNullError(message) {
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, MySQLReturnNullError.prototype);
        return _this;
    }
    return MySQLReturnNullError;
}(MySQLError));
exports.MySQLReturnNullError = MySQLReturnNullError;
var MySQLInvalidError = /** @class */ (function (_super) {
    __extends(MySQLInvalidError, _super);
    function MySQLInvalidError(message) {
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, MySQLInvalidError.prototype);
        return _this;
    }
    return MySQLInvalidError;
}(MySQLError));
exports.MySQLInvalidError = MySQLInvalidError;
