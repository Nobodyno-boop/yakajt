import {OpenAIApi,Configuration} from "openai"
import process from 'node:process';

export const openai = () => {
	const client = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}))
	return {
		client,
		summarizeArticle: async (url) => {
			return client.createCompletion({
				model: 'text-davinci-003',
				prompt:`Fait moi un résumé court et percutant de cet article ${url} ⚽ pour l'affichage à l'écran. Nous sommes en 2023`,
				temperature: 0.7,
				max_tokens: 120,
				top_p: 1,
				frequency_penalty:0,
                presence_penalty:0
			})
		},
		async generateTitle(url){
			return client.createCompletion({
                model: 'text-davinci-003',
                prompt:`En 50 caractères moi un résumé de cet article : ${url} inclus des #.`,
                temperature: 0.7,
                max_tokens: 120,
                top_p: 1,
                frequency_penalty:0,
                presence_penalty:0
            })
		}
	}
}
