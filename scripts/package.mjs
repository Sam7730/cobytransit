// ZIP writer for the source download, using Node built-ins only.
import {readFile,writeFile,readdir,copyFile} from 'node:fs/promises';import path from 'node:path';import {deflateRawSync} from 'node:zlib';
const root=path.resolve('.');
for(const f of ['SECURITY.md','DATA_SOURCES.md','LICENSE','MAINTENANCE.md','LIVE_TRACKING.md'])await copyFile(f,path.join('web',f));
const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=0xffffffff;for(const n of b)c=table[(c^n)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
async function walk(dir){let files=[];for(const e of await readdir(dir,{withFileTypes:true})){if(['.git','.openai','node_modules','dist','worker','.qa'].includes(e.name)||e.name.startsWith('.env')||e.name==='cobytransit-source.zip')continue;const f=path.join(dir,e.name);if(e.isDirectory())files.push(...await walk(f));else if(e.isFile())files.push(f);}return files;}
const files=(await walk(root)).sort(),local=[],central=[];let offset=0;
for(const file of files){const name=Buffer.from('CobyTransit/'+path.relative(root,file).split(path.sep).join('/')),body=await readFile(file),compressed=deflateRawSync(body),sum=crc(body),h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(0x5d57,12);h.writeUInt32LE(sum,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(body.length,22);h.writeUInt16LE(name.length,26);
 const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(0x5d57,14);c.writeUInt32LE(sum,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(body.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);local.push(h,name,compressed);central.push(c,name);offset+=h.length+name.length+compressed.length;
}
const cent=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(cent.length,12);end.writeUInt32LE(offset,16);await writeFile('web/cobytransit-source.zip',Buffer.concat([...local,cent,end]));console.log(`Packaged ${files.length} source files. Source archive ready.`);
