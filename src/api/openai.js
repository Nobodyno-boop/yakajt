import {OpenAIApi,Configuration} from "openai"
import process from 'node:process';

export const openai = () => {
	const client = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}))
	return {
		client,
		summarizeArticle: async (url) => {
			return client.createCompletion({
				model: 'gpt-3.5-turbo-instruct',
				prompt:`Résumez de manière concise et dynamique l'article ${url}. Destiné à un affichage bref à l'écran, le texte doit captiver l'audience et transmettre l'essence de l'événement. Nous sommes en 2023 \n`,
				temperature: 0.9,
				max_tokens: 150,
				top_p: 1,
				frequency_penalty:0,
                presence_penalty:0.6,
				stop: [" Human:", " AI:"],
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
