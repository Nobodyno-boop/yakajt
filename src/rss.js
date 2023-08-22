import Parser from "rss-parser"

const parser = new Parser()

/**
 *
 * @param url {String}
 * @returns {Promise<({[p: string]: any} & Parser.Item)|{feed: {[p: string]: any} & Parser.Output<{[p: string]: any}>, last(): *}>}
 */
export const getFeed = async (url) => {
	return {
		items: (await parser.parseURL(url)).items.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)),
		first() {
			return this.items[0]
		},
		last(){
			return this.items.pop()
		}
	}
}

