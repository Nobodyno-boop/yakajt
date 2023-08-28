import dotenv from "dotenv";
import path from "path";


export const environment = () =>  {
	let folder = path.basename(process.argv[1]).replace('.js', '')
	dotenv.config({path: `./.env.${folder}`})
	if(!process.env.FOLDER_ASSETS){
		process.env.FOLDER_ASSETS = path.join(process.cwd(),path.sep + folder+path.sep)
	}
}
