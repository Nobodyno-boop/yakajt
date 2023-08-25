import dotenv from "dotenv";
import {facebook, getFeed, meta, openai, youtube} from "../src/index.js";
import {downloadFile} from "../src/file.js";
import editly from 'editly';
import {glob} from 'glob'
import {nanoid} from 'nanoid'
import axios from "axios";
import fs from "fs";
import { Blob } from 'buffer';
import { exec } from 'node:child_process';
import path from "path";
import Database from 'better-sqlite3';


dotenv.config({path: '../.env'})

const rss = "https://dwh.lequipe.fr/api/edito/rss?path=/Football/"




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

	const db = new Database('feeds.db')
	await db.exec('CREATE TABLE IF NOT EXISTS feeds (url TEXT)')

	const getNews = async (news) => {
		if(feedTry >= 10){
			console.log("Cannot found a new news")
			process.exit(0)
			return
		}
		console.log(`(${feedTry+1})Attempt to get new news`)
		const currentNews = news ? news : feed.items[0]
		const old = db.prepare('SELECT url FROM feeds WHERE url = ?').get( currentNews.link)
		if(!old){
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
	const thumbnailUrl = news.enclosure.url
	const imageFilename = `${id}.jpg`
	await downloadFile(thumbnailUrl, './img', imageFilename)

	// Open AI
	const openAI = openai()
	const summery = (await openAI.summarizeArticle(news.link)).data['choices'][0]
	const tiktokDesc = (await openAI.generateTitle(news.link)).data['choices'][0]['text'].replace(/\s+/g, ' ')
		.trim()
		.slice(0, 97)
		+ "..."
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
	const source = sourceSites[Math.floor(Math.random() * sourceSites.length)]

	const func = async function func({width, height, fabric}) {
		async function onRender(progress, canvas) {
			canvas.add(new fabric.Rect({
				width: 1100,
				height: 1920 / 6,
				fill: 'black',
				originY: 'top',
				left: -10
			}))
			// top line
			canvas.add(new fabric.Line([0, 290, 1100, 290], {
				stroke: 'white',
				strokeWidth: 15,
				fill: 'white'
			}))
			// bottom line
			canvas.add(new fabric.Line([0, 320, 1100, 320], {
				stroke: 'white',
				strokeWidth: 15,
				fill: 'white'
			}))


			const lines = wrapText(canvas.getContext('2d'), summeryText, 540, 420, 540 / 3.8, 65)
			lines.forEach((line) => {
				const [text, x, y] = line
				const ctext = new fabric.Text(text, {
					originX: 'center',
					originY: 'top',
					left: x,
					top: y,
					fontSize: 60,
					hasBorder: true,
					strokeWidth: 1,
					fontWeight: 'bold',
					// backgroundColor: backgroundColor,
					padding: 5,
					cornerStyle: "circle",
					// stroke: 'black',
					fontFamily: 'Georgia',
					textAlign: 'center',
					fill: textColor
				})
				const textHeight = Math.floor(ctext.lineHeight * ctext.fontSize)
				let rectPadding = new fabric.Rect({
					originX: 'center',
					originY: 'top',
					width: ctext.width + (6 + 6),
					height: textHeight + (2 + 2),
					left: x - 8,
					top: y,
					fill: '#000000ff',
					rx: 10,
					ry: 10,
				})

				var group = new fabric.Group([rectPadding, ctext], {
					originX: 'center',
					originY: 'top',
					left: x - 6,
					top: y + 10,
					angle: 0,
				});
				canvas.add(group);

			})

			const currentMonth = date.getMonth() + 1
			canvas.add(new fabric.Text(`Infos du ${date.getDate()}/${currentMonth > 9 ? "0"+currentMonth : currentMonth}`, {
				originX: 'center',
				originY: 'top',
				left: width / 2,
				top: 110,
				fontSize: 100,
				fontWeight: 'bold',
				fontFamily: 'Georgia',
				textAlign: 'center',
				fill: 'black',
				stroke: 'white',
				strokeWidth: 10,
				paintFirst: 'stroke',
			}));

			canvas.add(new fabric.Text(`${date.getHours()}:${date.getMinutes() > 9 ? date.getMinutes() : "0" + date.getMinutes()}`, {
				originX: 'center',
				originY: 'top',
				left: width / 2,
				top: 200,
				fontSize: 60,
				fontWeight: 'bold',
				stroke: 'white',
				strokeWidth: 10,
				paintFirst: 'stroke',
				fontFamily: 'Georgia',
				textAlign: 'center',
				fill: 'red'
			}));

			canvas.add(new fabric.Text(`Source: ${source}`, {
				originX: 'center',
				originY: 'top',
				left: 1080 / 2,
				top: height / 1.1,
				fontSize: 60,
				strokeWidth: 1,
				fontWeight: 'bold',
				fontFamily: 'Georgia',
				textAlign: 'center',
				fill: 'white'
			}));
		}

		function onClose() {
			// Cleanup if you initialized anything
		}

		return {onRender, onClose};
	}

	const mp3files = await glob('sound/*.mp3')
	const mp4files = await glob('video/*')
	const output = `./outputs/${id}.mp4`
	const outputCompress = `./outputs/${id}-compress.mp4`

	const randomAudio = mp3files[Math.floor(Math.random() * mp3files.length)]
	const randomVideo = mp4files[Math.floor(Math.random() * mp4files.length)]
	const layers = [
		{type: 'video', path: randomVideo, resizeMode: 'cover', loop: true},
		{type: 'fabric', func},
		{
			type: 'image-overlay',
			path: 'img/logo.png',
			position: {originY: 'top', x: 0.75, y: 0.13},
			width: 0.2
		},
	]

	if(summeryText.length < 320 ){
		layers.push({type: 'image-overlay', path: `img/${imageFilename}`, position: {originY: 'bottom', y: 0.9}, height: 0.2})
	}

	const config = {
		width: 1080,
		height: 1920,
		outPath: output,
		keepSourceAudio: false,
		default: {
			layer: {
				fontPath: 'font/'
			}
		},
		fast: false,
		// verbose: true,
		clips: [
			{
				layers: layers
			}
		],
		audioTracks: [
			{path: randomAudio}
		]
	}

	// await editly(config)

	const youtubeAPI = youtube()
	const metaAPI = meta()

	const fbvideo = await metaAPI.postVideo(path.resolve(process.cwd(), "outputs/JCrGxora2i-vLy87TA1D9.mp4"), tiktokDesc)
	if(fbvideo){
		console.log(fbvideo.data)
	}

	// exec(`ffmpeg -i ${output} -vcodec h264 -acodec mp2 ${outputCompress}`, async (err, stdout, stderr) => {
	// 	if (err) {
	// 		console.error(err, stderr);
	// 	}
	// 	console.log("Finish compression")
	// 	let form = new FormData()
	// 	form.append('file', new Blob([fs.readFileSync(path.resolve(process.cwd(), outputCompress))]), 'lucienLeRoiWesternUnion.mp4')
	// 	form.append('payload_json', JSON.stringify({content: tiktokDesc}))
	// 	console.log("Attempting to upload on discord..")
	//
	// 	await axios({
	// 		url: 'https://discord.com/api/webhooks/1135266790994350173/OnYiQKYDBNqFZb5qL7H2mZAgO3q6oWHsdiE4cVPJ2eXDkhn30WktHCuvyyaiOJ5mMyRt',
	// 		method: 'POST',
	// 		data: form,
	// 		header: {
	// 			'Content-Type': `multipart/form-data;`
	// 		}
	// 	})
	// 	console.log("Attempting to upload on youtube")
	//
	// 	const ytvideo = await youtubeAPI.postVideo(path.resolve(process.cwd(), output), tiktokDesc, 'public')
	// 	if(ytvideo){
	// 		console.log(`Video uploaded with ID: https://youtube.com/shorts/${ytvideo.data.id}`);
	// 	}
	// 	const fbvideo = await facebookAPI.postVideo(path.resolve(process.cwd(), output), tiktokDesc)
	// 	if(fbvideo){
	// 		console.log(fbvideo)
	// 	}
	// })

})()
