import fs from "fs";
import path from "path";
import process from "node:process";

export const file = () => {
	return {
		jobFile: [],
		toBuffer(arrayBuffer) {
			const buffer = Buffer.alloc(arrayBuffer.byteLength);
			const view = new Uint8Array(arrayBuffer);
			for (let i = 0; i < buffer.length; ++i) {
				buffer[i] = view[i];
			}
			return buffer;
		},
		async downloadFile (url, folder, filename)  {
			const file = await fetch(url).then(x => x.arrayBuffer())

			const destinationPath = path.resolve(process.cwd(),folder, filename)

			fs.mkdirSync(path.dirname(destinationPath), { recursive: true })

			fs.writeFileSync(destinationPath, this.toBuffer(file))
			this.jobFile.push(destinationPath)
		},
		cleanup() {
			this.jobFile.forEach(file => {
                fs.unlinkSync(file)
            })
		}
	}
}
