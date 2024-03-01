import dotenv from "dotenv";
import {getFeed, meta, openai, youtube, file, environment} from "../src/index.js";
import editly from 'editly';
import {glob} from 'glob'
import {nanoid} from 'nanoid'
import axios from "axios";
import fs from "fs";
import {Blob} from 'buffer';
import {exec} from 'node:child_process';
import path from "path";
import Database from 'better-sqlite3';
import process from "node:process";
import {tiktok} from "../src/api/tiktok.js";
import {config} from "../src/template/v1.js";

environment()
// const rss = "https://dwh.lequipe.fr/api/edito/rss?path=/Football/"
const rss = "https://n4g.com/rss/news?channel=&sort=latest"


const wrapText = function (ctx, text, x, y, maxWidth, lineHeight) {
		// First, start by splitting all of our text into words, but splitting it into an array split by spaces
		let words = text.split(' ');
		let line = ''; // This will store the text of the current line
		let testLine = ''; // This will store the text when we add a word, to test if it's too long
		let lineArray = []; // This is an array of lines, which the function will return
		let jump = false
		// Lets iterate over each word
		for (var n = 0; n < words.length; n++) {
			// Create a test line, and measure it..
			testLine += `${words[n]} `;
			let metrics = ctx.measureText(testLine);
			let testWidth = metrics.width;

			if (jump) {
				lineArray.push([line.trimEnd(), x, y]);
				y += lineHeight;
				line = `${words[n]} `;
				testLine = `${words[n]} `;
				jump = false
				continue
			}
			if (testLine.replaceAll(' ', '').endsWith('.')) {
				jump = true
			}

			// If the width of this test line is more than the max width
			if (testWidth > maxWidth && n > 0) {
				// Then the line is finished, push the current line into "lineArray"
				lineArray.push([line, x, y]);
				// Increase the line height, so a new line is started
				y += lineHeight;
				// Update line and test line to use this word as the first word on the next line
				line = `${words[n]} `;
				testLine = `${words[n]} `;
			} else {
				// If the test line is still less than the max width, then add the word to the current line
				line += `${words[n]} `;
			}
			// If we never reach the full max width, then there is only one line.. so push it into the lineArray so we return something
			if (n === words.length - 1) {
				lineArray.push([line, x, y]);
			}
			// reset jump line
		}
		// Return the line array
		return lineArray;
	}


;(async () => {
	// Feed RSS
	const feed = await getFeed(rss)
	let feedTry = 0

	const db = new Database(path.resolve(`${process.env.FOLDER_ASSETS}/feeds.db`))
	await db.exec('CREATE TABLE IF NOT EXISTS feeds (url TEXT)')

	const getNews = async (news) => {
		if (feedTry >= 10) {
			console.log("Cannot found a new news")
			process.exit(0)
			return
		}
		console.log(`(${feedTry + 1})Attempt to get new news`)
		const currentNews = news ? news : feed.items[0]
		const old = db.prepare('SELECT url FROM feeds WHERE url = ?').get(currentNews.link)
		if (!old) {
			db.prepare('INSERT INTO feeds VALUES (?)').run(currentNews.link)
			return currentNews
		} else {
			feedTry++
			return getNews(feed.items[feedTry])
		}

	}

	const news = await getNews()
	// const news = feed.items[0]
	const id = nanoid()
	const fileAPI = file()
	const thumbnailUrl = news.enclosure.url
	const imageFilename = `${id}.jpg`
	await fileAPI.downloadFile(thumbnailUrl, `${process.env.FOLDER_ASSETS}/img`, imageFilename)

	// Open AI
	const openAI = openai()
	const summery = (await openAI.summarizeArticle(news.link)).data['choices'][0]
	console.log(summery)
	const tiktokDesc = (await openAI.generateTitle(news.link)).data['choices'][0]['text'].replace(/\s+/g, ' ')
			.trim()
			.slice(0, 97)
		+ "..."
	// Remove all emojis and jump line
	const summeryText = summery['text'].replaceAll('\\n', '').replace(
		/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
		''
	)
		.replace(/\s+/g, ' ')
		.trim();

	// Global const
	const date = new Date()
	const textColor = "white"
	const sourceSites = ["L'équipe", 'ActuFoot', 'ParisMatch', 'Eurosports', 'Le10sport', 'MadeinFoot', 'football365', 'footMercato', 'foot01', 'sports.fr', '90min']


	const assetsRelative = process.env.FOLDER_ASSETS
		.split(path.sep)
		.filter(Boolean)
		.pop()

	const [mp3files, mp4files] = ["/sound/*.mp3", '/video/*'].map(
		async (path) => {
			const values = await glob(`${assetsRelative}${path}`)
			return values
		})

	const [output,outputCompress] = ['', '-compress'].map(async (suffix) => {
		return path.resolve(`${assetsRelative}/outputs/${id}${suffix}.mp4`)
	})

	const [randomAudio, randomVideo, source] = [mp3files, mp4files, sourceSites].map(arr => {
		return arr[Math.floor(Math.random() * arr.length)]
	})




	console.time("create video")
	await editly(config(
		{
			video: randomVideo,
			logo: `${assetsRelative}/img/logo.png`,
			image: imageFilename,
			summeryText,
			output,
			audio: randomAudio
		}
	))
	console.timeEnd("create video")

	const youtubeAPI = youtube()
	const metaAPI = meta()
	// const tiktokAPI = tiktok()

	exec(`ffmpeg -i ${output} -vcodec h264 -acodec mp2 ${outputCompress}`, async (err, stdout, stderr) => {
		if (err) {
			console.error(err, stderr);
		}
		const videoPathCompress = path.resolve(process.cwd(), outputCompress)
		let form = new FormData()
		form.append('file', new Blob([fs.readFileSync(videoPathCompress)]), 'lucienLeRoiWesternUnion.mp4')
		form.append('payload_json', JSON.stringify({content: tiktokDesc}))
		console.log("Attempting to upload on discord..")

		await axios({
			url: 'https://discord.com/api/webhooks/1135266790994350173/OnYiQKYDBNqFZb5qL7H2mZAgO3q6oWHsdiE4cVPJ2eXDkhn30WktHCuvyyaiOJ5mMyRt',
			method: 'POST',
			data: form,
			header: {
				'Content-Type': `multipart/form-data;`
			}
		})
		// console.log("Attempting to upload on youtube")
		// const keywords = "#football #ligue1 #ligue2 #leaguedeschampions #premierleague #mercato #transfert #championsleague #ligua #seriea #bundesliga #fifa #europaleague"
		// const description = `🔥 Bienvenue sur QuartierFoot! 🔥\n ${keywords} \n Je suis votre source incontournable d'actualités football, apportant les dernières nouvelles du foot directement à vous, générées par l'intelligence artificielle et postées en temps réel. Plongez au cœur de l'action comme jamais auparavant! \n 📲 Suivez-moi aussi sur : \n Instagram : https://www.instagram.com/quartierfoot/ \n Twitter : https://twitter.com/QuartierFoot \n TikTok : https://www.tiktok.com/@quartierfoot  \n \n Restez branchés, et ne manquez jamais une mise à jour du monde passionnant du football! ⚽💥 `
		//
		// const ytvideo = await youtubeAPI.postVideo(videoPathCompress, tiktokDesc, description, 'public')
		// if (ytvideo) {
		// 	console.log(`Video uploaded with ID: https://youtube.com/shorts/${ytvideo.data.id}`);
		// }
		// const fbvideo = await metaAPI.postVideoFacebook(videoPathCompress, tiktokDesc)
		// if (fbvideo) {
		// 	console.log('Reels uploaded !')
		// }
		// console.log("Attempting to upload on tiktok")
		// console.time("upload on tiktok")
		// const tiktokVideo = await tiktokAPI.createPost(outputCompress, tiktokDesc)
		// await tiktokAPI.uploadVideo(tiktokVideo, outputCompress)
		// console.timeEnd("upload on tiktok")
		fileAPI.jobFile.push(outputCompress, output)
		console.log("Cleaning job..")
		console.time("cleanup")
		// fileAPI.cleanup()
		console.timeEnd("cleanup")
	})

})()
