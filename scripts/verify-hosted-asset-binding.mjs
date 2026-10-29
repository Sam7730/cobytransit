import assert from 'node:assert/strict';import worker from '../dist/server/index.js';
const env={ASSETS:{fetch:()=>new Response('Unrelated platform binding',{status:404})}};
const page=await worker.fetch(new Request('https://coby.example/'),env);assert.equal(page.status,200);assert.match(await page.text(),/A better way around/);
const data=await worker.fetch(new Request('https://coby.example/api/snapshot'),env);assert.equal(data.status,200);assert.ok((await data.json()).trips.length>0);
console.log('Compiled Worker ignores the hosting platform ASSETS binding and serves embedded pages/data.');
