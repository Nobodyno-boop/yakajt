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
		async postVideo(filePath,title,description,videoPrivacy = "private"){
			try {
				return await this.youtube.videos.insert({
					part: 'id,snippet,status',
					notifySubscribers: false,
					requestBody: {
						snippet: {
							title: title,
							description: description
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
