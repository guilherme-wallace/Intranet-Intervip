import * as Express from 'express';
import axios from 'axios';

const router = Express.Router();

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
                //consultarIndividual: "S"
            }
        });

        let registrosFiltrados = [];
        if (geogridResponse.data && geogridResponse.data.registros) {
            registrosFiltrados = geogridResponse.data.registros
                .filter((value: any) => value.portasLivres > 0)
                .map((value: any) => ({
                    sigla: value.sigla,
                    distancia: parseFloat(value.distancia),
                    portasLivres: value.portasLivres,
                    latitude: value.latitude,
                    longitude: value.longitude,
                    item: value.item
                }));
        }

        res.json(registrosFiltrados);

    } catch (error) {
        console.error('Erro detalhado ao consultar o Geogrid:', error.response?.data || error.message);
        res.status(500).json({ error: 'Falha ao consultar os dados de viabilidade no Geogrid' });
    }
});

export default router;