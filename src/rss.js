import Parser from "rss-parser"
import urlMetadata from 'url-metadata';

const parser = new Parser()

/**
 *
 * @param url {String}
 * @returns {Promise<({[p: string]: any} & Parser.Item)|{feed: {[p: string]: any} & Parser.Output<{[p: string]: any}>, last(): *}>}
 */
export const getFeed = async (url) => {
	return {
		feed: await parser.parseURL(url),
		// get image from feed based on link with link-meta-extractor@1.3.6
		link: await parser.parseURL(url).then(feed => feed.items[0].link),
		async getImage(){
			const l = await this.link
			const metadata = await urlMetadata(l, {
				// mode: 'same-origin',
				// includeResponseBody: true
			});
			return metadata['og:image']
		},
		items: (await parser.parseURL(url)).items.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)),
		first() {
			return this.items[0]
		},
		last(){
			return this.items.pop()
		}
	}
}

