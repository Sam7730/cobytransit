import {readFile} from 'node:fs/promises';import {validateSnapshot} from '../web/assets/validation.js';
const data=JSON.parse(await readFile('web/assets/transit.json'));console.log(JSON.stringify(validateSnapshot(data)));
