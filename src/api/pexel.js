import { createClient } from 'pexels';
import process from 'node:process';
import axios from 'axios'
import fs from "fs";


export const pexels = () => {
	const client = createClient(process.env.PEXELS_API_KEY);
	return {
		client,
		searchVideos: async (query) => client.videos.search({query, per_page:15, orientation: 'portrait', min_duration:60}),
		getAll: async (query) => {
			const videos = []

			const base = await client.videos.search({query, per_page:80, orientation: 'portrait', min_duration:60})
			const getUntilVideo = async (response, next_page) => {
				if(!response && !next_page) return
				let nresponse = next_page ? (await axios({
					url: next_page,
					headers: {
						'Authorization': process.env.PEXELS_API_KEY
					}
				})).data : response
				console.log(nresponse)

				const minDurations = nresponse.videos.filter(video => video.duration >= 30)
				if (minDurations.length > 0) {
					videos.push(...minDurations)
				}
				return getUntilVideo(null, nresponse.next_page ?? null)
			}
			await getUntilVideo(base, null)

			fs.writeFileSync('videos.json', JSON.stringify(videos, null, 2))
		},
		getVideo: async (query) => {
			const base = await client.videos.search({query, per_page:80, orientation: 'portrait', min_duration:60})
			// console.log(base)
			// const min = base.videos.filter(video => video.duration >= 30)
			// console.log(min)
			const getUntilVideo = async (response, next_page) => {
				console.log("until")
				let nresponse = next_page ? (await axios({
					url: next_page,
					headers: {
						'Authorization': process.env.PEXELS_API_KEY
					}
				})).data : response
				const minDurations = nresponse.videos.filter(video => video.duration >= 30)
				if (minDurations.length > 0) {
                    return minDurations[Math.floor(Math.random() * minDurations.length)]
                } else {
                    return getUntilVideo(null, nresponse.next_page)
                }
			}
			return getUntilVideo(base, null)
		}
	}
}

