#!/usr/bin/env node
import * as JSZip from 'jszip';
import * as path from 'path';
import * as fs from 'fs';
import * as commander from 'commander';
import { WadManager } from "./WadManager";
import { QuakeMap } from "./QuakeMap";
import { cwd } from 'process';

const wadManager = new WadManager();

async function loadMapFromURL(url: string) {
    const buffer = fs.readFileSync(url);

    if (buffer.byteLength > 0) {
        await loadMap(url, buffer);
    }
}

async function loadMap(fileName: string, data: Buffer) {

    let zip = new JSZip();
    zip.file('maps/' + path.basename(fileName), data);

    console.log("Zipping assets...");

    const map = new QuakeMap(rootDir, data.buffer, wadManager);
    const pathMap = new Map<string, string>();
    for (const category in map.requiredAssets) {
        for (const item of map.requiredAssets[category]) {
            let fullPath;
            if (category === 'wads') {
                fullPath = path.resolve(rootDir, item);
            }
            else {
                fullPath = path.resolve(rootDir, category, item);
            }

            console.log(category, fullPath);

            zip.file(path.relative(rootDir, fullPath), fs.readFileSync(fullPath).buffer)
            pathMap.set(path.relative(rootDir, fullPath), fullPath);
        }
    }


    let content = await zip.generateAsync({ type: 'nodebuffer' });
    let zipPath = rootDir + '/' + path.parse(fileName).name + '.zip';
    fs.writeFileSync(zipPath, content);
    console.log("Saved to " + zipPath)

    console.log(pathMap);
}

commander.program
  .version('1.0.0', '-v, --version')
  .argument('<directory>', "Directory of the mod")
  .usage('[OPTIONS]...')
  .parse(process.argv);

let rootDir = path.resolve(commander.program.args[0]);
let mapsDir = path.resolve(cwd(), 'maps');

// For each .res file inside mapsDir
(async function () {
    let files = fs.readdirSync(mapsDir);
    for (const file of files ) {
        if (path.extname(file) === '.res') {
            let mapCommonName = path.parse(file).name;

            console.log("Loading map: " + mapCommonName);
            let resFile = fs.readFileSync(path.resolve(mapsDir, file));

            let zip = new JSZip();
            zip.file('maps/' + mapCommonName + '.bsp', fs.readFileSync(mapsDir + '/' + mapCommonName + '.bsp'));

            // For each line that does not start with a comment
            resFile.toString().split('\n').forEach((line) => {
                if (!line.startsWith('//') && line.length > 0) {
                    // verify file exists
                    let filePath = path.resolve(rootDir, line);
                    if (!fs.existsSync(filePath)) {
                        console.error('File does not exist: ', filePath);
                    }
                    else {
                        zip.file(line, fs.readFileSync(filePath));
                    }
                }
            });

            let content = await zip.generateAsync({ type: 'nodebuffer' });
            fs.writeFileSync(mapCommonName + '.zip', content);
        }
    }
})();