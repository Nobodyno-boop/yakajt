import fs from "fs";
import path from "path";
import process from "node:process";

function toBuffer(arrayBuffer) {
	const buffer = Buffer.alloc(arrayBuffer.byteLength);
	const view = new Uint8Array(arrayBuffer);
	for (let i = 0; i < buffer.length; ++i) {
		buffer[i] = view[i];
	}
	return buffer;
}

export const downloadFile = async (url, folder, filename) => {
	// const file = fs.createWriteS();
	const file = await fetch(url).then(x => x.arrayBuffer())

	// const file = new File([blob], filename, {type: 'video/mp4'})
	fs.writeFileSync(path.resolve(process.cwd(),folder, filename), toBuffer(file))
}

export const isExistFile = async (path) => {
	try {
        return fs.existsSync(path)
    } catch {
        return false
    }
}
