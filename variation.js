
import dotenv from 'dotenv';
import {Configuration, OpenAIApi} from 'openai';
import {createReadStream, readFileSync, writeFileSync} from 'fs';


dotenv.config();
//Using unsecure TLS to avoid self-signed certificate error needs fixing for production
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const configuration = new Configuration({

    apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);

const src = './img/1681419924531.png';

const result = await openai.createImageVariation(
    createReadStream(`./img/${src}`),
    1,
    "1024x1024",
);

const url = result.data.data[0].url;
console.log(url);

//Save Image to Disk
const imgResult = await fetch(url);
const blob = await imgResult.blob();
const buffer = Buffer.from(await blob.arrayBuffer() )
writeFileSync(`./img/${Date.now()}.png`, buffer); 