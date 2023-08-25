import axios from "axios";
import fs from "fs";

export const meta = () => {
	return {
		async postVideoFacebook(videoPath, description) {
			try {
				// Préparez les données pour la requête multipart
				const {size} = fs.statSync(videoPath);
				const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
				const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_TOKEN;

				// Étape 1: Publiez la vidéo avec une description

				const {data} = await axios.post(`https://graph.facebook.com/v17.0/${PAGE_ID}/video_reels`, {
					'access_token': PAGE_ACCESS_TOKEN,
					'upload_phase': 'start'
				})


				const uploadVideo = await axios({
					url: data.upload_url,
					method: 'POST',
                    data: fs.readFileSync(videoPath),
                    headers: {
	                    "Authorization": `OAuth ${PAGE_ACCESS_TOKEN}`,
                        'Content-Type':'multipart/form-data',
	                    "offset":0,
	                    "file_size": size
                    }
				})

				return await axios({
					url: `https://graph.facebook.com/v17.0/${PAGE_ID}/video_reels`,
					params: {
						'access_token': PAGE_ACCESS_TOKEN,
						video_id: data.video_id,
						upload_phase: 'finish',
						'video_state': 'PUBLISHED',
						'description': description
					},
                    method: 'POST',
				})
			} catch (error) {
				// console.error('(Facebook) Erreur lors de la publication de la vidéo:', error);
			}
		}
	}
}
