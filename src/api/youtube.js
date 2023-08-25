import {google} from "googleapis";
import fs from "fs";

export const youtube = () => {
	const oauth2Client = new google.auth.OAuth2(
		process.env.YOUTUBE_ID,
		process.env.YOUTUBE_SECRET,
		'',
	);

	oauth2Client.setCredentials({
		refresh_token: process.env.YOUTUBE_REFRESH_SECRET,
		scope: 'https://www.googleapis.com/auth/youtube.upload'
	});

	const youtube = google.youtube({
		version: 'v3',
		auth: oauth2Client
	});

	return {
		youtube,
		async postVideo(filePath,title,videoPrivacy = "private"){
			try {
				return await this.youtube.videos.insert({
					part: 'id,snippet,status',
					notifySubscribers: false,
					requestBody: {
						snippet: {
							title: title,
							description: `🔥 Bienvenue sur QuartierFoot! 🔥 \n Je suis votre source incontournable d'actualités football, apportant les dernières nouvelles du foot directement à vous, générées par l'intelligence artificielle et postées en temps réel. Plongez au cœur de l'action comme jamais auparavant! \n 📲 Suivez-moi aussi sur : \n Instagram : https://www.instagram.com/quartierfoot/ \n Twitter : https://twitter.com/QuartierFoot \n TikTok : https://www.tiktok.com/@quartierfoot  \n \n Restez branchés, et ne manquez jamais une mise à jour du monde passionnant du football! ⚽💥 `
						},
						status: {
							privacyStatus: videoPrivacy  // 'private', 'public', 'unlisted'
						}
					},
					media: {
						body: fs.createReadStream(filePath)
					}
				});
			}catch (error) {
				console.log("(Youtube) Erreur lors de la publication de la vidéo");
			}
		}
	}
}
