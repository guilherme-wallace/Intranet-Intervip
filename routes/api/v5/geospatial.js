"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var Express = require("express");
var axios_1 = require("axios");
var router = Express.Router();
var extractComponent = function (components, type) {
    var component = components.find(function (c) { return c.types.includes(type); });
    return component ? component.long_name : '';
};
router.get('/address-autocomplete', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var query, GOOGLE_MAPS_API_KEY, url, response, predictions, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = req.query.query;
                if (!query) {
                    return [2 /*return*/, res.status(400).json({ error: 'A consulta de endereço é obrigatória' })];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
                url = "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=".concat(encodeURIComponent(query), "&key=").concat(GOOGLE_MAPS_API_KEY, "&language=pt-BR&components=country:BR");
                return [4 /*yield*/, axios_1.default.get(url)];
            case 2:
                response = _a.sent();
                predictions = response.data.predictions.map(function (p) { return ({
                    description: p.description,
                    place_id: p.place_id,
                }); });
                res.json(predictions);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('Erro ao buscar sugestões no Google Maps API:', error_1);
                res.status(500).json({ error: 'Falha ao buscar sugestões de endereço' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post('/geogrid-lookup', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var place_id, GOOGLE_MAPS_API_KEY, detailsUrl, detailsResponse, location_1, GEOGRID_API_URL, GEOGRID_API_TOKEN, raio, geogridEndpoint, geogridResponse, registrosFormatados, error_2;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                place_id = req.body.place_id;
                if (!place_id) {
                    return [2 /*return*/, res.status(400).json({ error: 'O place_id do endereço é obrigatório' })];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
                detailsUrl = "https://maps.googleapis.com/maps/api/place/details/json?place_id=".concat(place_id, "&key=").concat(GOOGLE_MAPS_API_KEY, "&fields=geometry");
                return [4 /*yield*/, axios_1.default.get(detailsUrl)];
            case 2:
                detailsResponse = _d.sent();
                location_1 = (_b = (_a = detailsResponse.data.result) === null || _a === void 0 ? void 0 : _a.geometry) === null || _b === void 0 ? void 0 : _b.location;
                if (!location_1) {
                    return [2 /*return*/, res.status(404).json({ error: 'Não foi possível encontrar as coordenadas para o endereço selecionado' })];
                }
                GEOGRID_API_URL = process.env.GEOGRID_API_URL;
                GEOGRID_API_TOKEN = process.env.GEOGRID_API_TOKEN;
                raio = 300;
                geogridEndpoint = "".concat(GEOGRID_API_URL, "/api/v3/viabilidade/raio");
                return [4 /*yield*/, axios_1.default.get(geogridEndpoint, {
                        headers: {
                            'api-key': GEOGRID_API_TOKEN
                        },
                        params: {
                            latitude: location_1.lat,
                            longitude: location_1.lng,
                            raio: raio,
                            //consultarPasta: "N",
                            consultarIndividual: "S",
                            modoProjeto: ["N"]
                        }
                    })];
            case 3:
                geogridResponse = _d.sent();
                registrosFormatados = [];
                if (geogridResponse.data && geogridResponse.data.registros) {
                    registrosFormatados = geogridResponse.data.registros
                        .map(function (value) { return ({
                        sigla: value.sigla,
                        distancia: parseFloat(value.distancia),
                        portasLivres: parseInt(value.portasLivres, 10),
                        latitude: value.latitude,
                        longitude: value.longitude,
                        item: value.item,
                        portas: parseInt(value.portas, 10)
                    }); });
                }
                res.json(registrosFormatados);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _d.sent();
                console.error('Erro detalhado ao consultar o Geogrid:', ((_c = error_2.response) === null || _c === void 0 ? void 0 : _c.data) || error_2.message);
                res.status(500).json({ error: 'Falha ao consultar os dados de viabilidade no Geogrid' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get('/cep-lookup', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var cep, GOOGLE_MAPS_API_KEY, url, response, result, components, address, error_3;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                cep = req.query.cep;
                if (!cep) {
                    return [2 /*return*/, res.status(400).json({ error: 'CEP é obrigatório' })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
                if (!GOOGLE_MAPS_API_KEY) {
                    throw new Error('API Key do Google Maps não configurada no servidor.');
                }
                console.log("Buscando CEP no Google Geocoding: ".concat(cep));
                url = "https://maps.googleapis.com/maps/api/geocode/json?address=".concat(encodeURIComponent(cep), "&key=").concat(GOOGLE_MAPS_API_KEY, "&language=pt-BR&components=country:BR");
                return [4 /*yield*/, axios_1.default.get(url)];
            case 2:
                response = _c.sent();
                if (!response.data || response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
                    console.warn("Google retornou status: ".concat((_a = response.data) === null || _a === void 0 ? void 0 : _a.status, " para o CEP ").concat(cep));
                    return [2 /*return*/, res.status(404).json({ error: 'CEP não encontrado na base do Google.' })];
                }
                result = response.data.results[0];
                components = result.address_components;
                address = {
                    rua: extractComponent(components, 'route'),
                    bairro: extractComponent(components, 'sublocality_level_1') || extractComponent(components, 'political') || extractComponent(components, 'sublocality'),
                    cidade: extractComponent(components, 'administrative_area_level_2') || extractComponent(components, 'locality'),
                    uf: extractComponent(components, 'administrative_area_level_1')
                };
                if (!address.cidade || !address.uf) {
                    console.warn("Resposta do Google incompleta (sem cidade/uf):", components);
                    return [2 /*return*/, res.status(404).json({ error: 'CEP localizado, mas sem definição de Cidade/UF.' })];
                }
                res.json(address);
                return [3 /*break*/, 4];
            case 3:
                error_3 = _c.sent();
                console.error('Erro no Google Geocoding API:', ((_b = error_3.response) === null || _b === void 0 ? void 0 : _b.data) || error_3.message);
                res.status(500).json({ error: 'Falha técnica ao buscar CEP.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
