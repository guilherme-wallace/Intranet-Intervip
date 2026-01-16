import * as Express from 'express';
import axios from 'axios';

const router = Express.Router();

const extractComponent = (components: any[], type: string): string => {
    const component = components.find(c => c.types.includes(type));
    return component ? component.long_name : '';
};

router.get('/address-autocomplete', async (req, res) => {
    const query = req.query.query as string;
    if (!query) {
        return res.status(400).json({ error: 'A consulta de endereço é obrigatória' });
    }

    try {
        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR&components=country:BR`;
        
        const response = await axios.get(url);
        const predictions = response.data.predictions.map((p: any) => ({
            description: p.description,
            place_id: p.place_id,
        }));
        res.json(predictions);
    } catch (error) {
        console.error('Erro ao buscar sugestões no Google Maps API:', error);
        res.status(500).json({ error: 'Falha ao buscar sugestões de endereço' });
    }
});

router.post('/geogrid-lookup', async (req, res) => {
    const { place_id } = req.body;
    if (!place_id) {
        return res.status(400).json({ error: 'O place_id do endereço é obrigatório' });
    }

    try {
        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry`;
        
        const detailsResponse = await axios.get(detailsUrl);
        const location = detailsResponse.data.result?.geometry?.location;

        if (!location) {
            return res.status(404).json({ error: 'Não foi possível encontrar as coordenadas para o endereço selecionado' });
        }

        const GEOGRID_API_URL = process.env.GEOGRID_API_URL;
        const GEOGRID_API_TOKEN = process.env.GEOGRID_API_TOKEN;
        const raio = 300;

        const geogridEndpoint = `${GEOGRID_API_URL}/api/v3/viabilidade/raio`;
        
        const geogridResponse = await axios.get(geogridEndpoint, {
            headers: {
                'api-key': GEOGRID_API_TOKEN
            },
            params: {
                latitude: location.lat,
                longitude: location.lng,
                raio: raio,
                //consultarPasta: "N",
                consultarIndividual: "S",
                modoProjeto: ["N"]
            }
        });

        let registrosFormatados = [];
        if (geogridResponse.data && geogridResponse.data.registros) {
            registrosFormatados = geogridResponse.data.registros
                .map((value: any) => ({
                    sigla: value.sigla,
                    distancia: parseFloat(value.distancia),
                    portasLivres: parseInt(value.portasLivres, 10),
                    latitude: value.latitude,
                    longitude: value.longitude,
                    item: value.item,
                    portas: parseInt(value.portas, 10)
                }));
        }

        res.json(registrosFormatados);

    } catch (error) {
        console.error('Erro detalhado ao consultar o Geogrid:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha ao consultar os dados de viabilidade no Geogrid' });
    }
});

router.get('/cep-lookup', async (req, res) => {
    const cep = req.query.cep as string;
    if (!cep) {
        return res.status(400).json({ error: 'CEP é obrigatório' });
    }

    try {
        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
        if (!GOOGLE_MAPS_API_KEY) {
            throw new Error('API Key do Google Maps não configurada no servidor.');
        }
        
        console.log(`Buscando CEP no Google Geocoding: ${cep}`);
        
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cep)}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR&components=country:BR`;
        
        const response = await axios.get(url);
        
        if (!response.data || response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
            console.warn(`Google retornou status: ${response.data?.status} para o CEP ${cep}`);
            return res.status(404).json({ error: 'CEP não encontrado na base do Google.' });
        }

        const result = response.data.results[0];
        const components = result.address_components;
        

        const address = {
            rua: extractComponent(components, 'route'),
            bairro: extractComponent(components, 'sublocality_level_1') || extractComponent(components, 'political') || extractComponent(components, 'sublocality'),
            cidade: extractComponent(components, 'administrative_area_level_2') || extractComponent(components, 'locality'),
            uf: extractComponent(components, 'administrative_area_level_1')
        };

        if (!address.cidade || !address.uf) {
           console.warn("Resposta do Google incompleta (sem cidade/uf):", components);
           return res.status(404).json({ error: 'CEP localizado, mas sem definição de Cidade/UF.' });
        }

        res.json(address);

    } catch (error) {
        console.error('Erro no Google Geocoding API:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha técnica ao buscar CEP.' });
    }
});

export default router;