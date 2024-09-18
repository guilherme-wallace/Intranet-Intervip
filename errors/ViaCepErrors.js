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
exports.ViaCEPNotFoundError = exports.ViaCEPError = void 0;
var ViaCEPError = /** @class */ (function (_super) {
    __extends(ViaCEPError, _super);
    function ViaCEPError(message) {
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, ViaCEPError.prototype);
        return _this;
    }
    return ViaCEPError;
}(Error));
exports.ViaCEPError = ViaCEPError;
var ViaCEPNotFoundError = /** @class */ (function (_super) {
    __extends(ViaCEPNotFoundError, _super);
    function ViaCEPNotFoundError(message) {
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, ViaCEPNotFoundError.prototype);
        return _this;
    }
    return ViaCEPNotFoundError;
}(ViaCEPError));
exports.ViaCEPNotFoundError = ViaCEPNotFoundError;
