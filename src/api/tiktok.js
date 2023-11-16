import fs from "fs";
import axios from "axios";

const fileSize = (filename)  => {
	return fs.statSync(filename).size
}

export const tiktok = () => {
	let token = process.env.TIKTOK_TOKEN
	let refreshToken = process.env.TIKTOK_REFRESH_TOKEN

	return {
		async createPost(filename, title){
			const videoSize = fileSize(filename)
			try {
				const {data} =  await axios({
					method: 'POST',
					url:"https://open.tiktokapis.com/v2/post/publish/video/init/",
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					data: {
						'post_info': {
							'title': title,
							'privacy_level': 'PUBLIC_TO_EVERYONE',
							'disable_duet': false,
							'disable_comment': true,
							'disable_stitch': false,
							'video_cover_timestamp_ms': 1000
						},
						"source_info": {
							"source": "FILE_UPLOAD",
							"video_size": videoSize,
							"chunk_size":  videoSize,
							"total_chunk_count": 1
						}
					}
				})

				if(data.error.code === "ok"){
					return data.data.upload_url
				}

			}catch(error){
				console.log(error?.response?.data)
				if(error?.response?.data?.error.code === "access_token_invalid" || error.response.data.error.code === "invalid_grant"){
					console.log("Refresh token")
					await this.refreshToken()
					return this.createPost(filename, title)
				}
			}
		},
		async uploadVideo(uploadUrl, filename){
			const currentSize = fileSize(filename)
			const {data} = await axios.put(
				uploadUrl,
				fs.readFileSync(filename),
				{
					headers: {
						'Content-Range': `bytes 0-${currentSize}/${currentSize}`,
						'Content-Length': currentSize,
						'Content-Type': 'video/mp4'
					}
				}
			);
			return uploadUrl
		}
		, async refreshToken(){
			const {data} = await axios({
				method: 'POST',
				url: 'https://open.tiktokapis.com/v2/oauth/token/',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				data: {
					"grant_type":"refresh_token",
					"client_key": process.env.TIKTOK_CLIENT_KEY,
					"client_secret": process.env.TIKTOK_CLIENT_SECRET,
					"refresh_token": refreshToken,
				}
			})
			// console.log(data)
			token = data.access_token
			refreshToken = data.refresh_token
			return data
		}
	}
}
