#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const fse = require('fs-extra')
const sharp = require('sharp');
const icongen = require('icon-gen');

const args = process.argv.slice(2);

const allRWEPermissions = parseInt("0777", 8);
const pathToPng = args[0];
const sizes = [
	1024,
	512,
	256,
	128,
	96,
	64,
	48,
	32,
	24,
	16
]
const dirsToCreate = [
	'png',
	'win',
	'mac'
]

try {
	fs.accessSync(pathToPng);
} catch (e) {
	if (e.code === 'ENOENT') {
		console.error(`png file doesn't exist`);
	}

	console.error(e);
	process.exit(-1);
}

const resizePngPromises = sizes.map(size =>
	sharp(pathToPng)
		.resize(size, size)
		.png()
		.toBuffer()
		.then(outputBuffer => ({
			outputBuffer,
			size
		}))
);

const savePngs = pngs => {
	return Promise.all(pngs.map(png => new Promise((resolve, reject) => {
		fs.writeFile(`icons/png/${png.size}.png`, png.outputBuffer, function (err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		})
	})));
}

const createDirectories = () => {
	return Promise.all(dirsToCreate.map(dir => new Promise((resolve, reject) => {
		fs.mkdir(`icons/${dir}`, allRWEPermissions, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	})));
}

const removeiconsDirs = () => new Promise((resolve, reject) => fse.remove('icons', err => {
	if (err) {
		reject(err);
	} else {
		resolve();
	}
}));


const readDir = (dirSrc) => new Promise((res, rej) => fs.readdir(dirSrc, (err, files) => {
	if (err) {
		rej(err);
	} else {
		res(files.map(file => ({
			filename: file,
			path: path.join(dirSrc, file)
		})));
	}
}));


const renamePngs = () => {
	const pngOutputDir = './icons/png';
	readDir(pngOutputDir)
		.then(files => Promise.all(files.map(file => new Promise((resolve, reject) => {
			const size = file.filename.split('.')[0];
			fs.rename(file.path, path.join(pngOutputDir, `${size}x${size}.png`), (err) => {
				if (err) {
					throw err;
				}
				return resolve();
			})
		}))))
		.then(() => console.log('renamed all'))
}

const generateIcons =
	(outputDir, mode) => icongen('./icons/png', outputDir, {
		report: true,
		ico: mode == 'ico' ? {} : undefined,
		icns: mode == 'icns' ? {} : undefined
	});

// start execution

removeiconsDirs()
	.then(() => new Promise(resolve => fs.mkdir('icons', allRWEPermissions, resolve)))
	.then(() => createDirectories())
	.then(() => Promise.all(resizePngPromises))
	.then(values => savePngs(values))
	.then(() => generateIcons('./icons/win', 'ico'))
	.then(() => generateIcons('./icons/mac', 'icns'))
	.then(() => renamePngs());