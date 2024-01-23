// This example demonstrates the use of the Bloom Filter
// in the RedisBloom module (https://redis.io/docs/stack/bloom/)

// run redis db
//docker run -p 6379:6379 -it --rm redis/redis-stack-server:latest

import { createClient } from 'redis';

const client = createClient();

await client.connect();
const startTime = Date.now() / 1000 / 60;
const bloomFilterName = 'mybloom';
const filterCapacity = 1000000000; // 1 billion
// Delete any pre-existing Bloom Filter.
await client.del(bloomFilterName);

// Reserve a Bloom Filter with configurable error rate and capacity.
// https://redis.io/commands/bf.reserve/
try {
    await client.bf.reserve(bloomFilterName, 0.01, filterCapacity);
    console.log('Reserved Bloom Filter.');
} catch (e) {
    if (e.message.endsWith('item exists')) {
        console.log('Bloom Filter already reserved.');
    } else {
        console.log('Error, maybe RedisBloom is not installed?:');
        console.log(e);
    }
}

// Add items to Bloom Filter individually with BF.ADD command.
// https://redis.io/commands/bf.add/
let promisesArr = [];
for (let i = 0; i < filterCapacity; i++) {
    promisesArr.push(client.bf.add(bloomFilterName, 'item'+i));
    if (i % 100000 === 0) {
        await Promise.all(promisesArr);
        promisesArr = [];
    }
    if (i % 10000000 === 0) {
        console.log('Added 10 million members to Bloom Filter.', i);
    }
}

// Add multiple items to Bloom Filter at once with BF.MADD command.
// https://redis.io/commands/bf.madd/
// await client.bf.mAdd('mybloom', [
//     'kaitlyn',
//     'rachel'
// ]);

// Check whether a member exists with the BF.EXISTS command.
// https://redis.io/commands/bf.exists/
const existValue = 'item1';
const notExistValue = 'item1000000001';
const simonExists = await client.bf.exists(bloomFilterName, existValue);
console.log(`${existValue} ${simonExists ? 'may' : 'NOT'} exist`);
const notExists = await client.bf.exists(bloomFilterName, notExistValue);
console.log(`${notExistValue} ${notExists ? 'may' : 'NOT'} exist`);

// Check whether multiple members exist with the BF.MEXISTS command.
// https://redis.io/commands/bf.mexists/
// const [ lanceExists, leibaleExists ] = await client.bf.mExists('mybloom', [
//     'lance',
//     'leibale'
// ]);
//
// console.log(`lance ${lanceExists ? 'may' : 'does not'} exist in the Bloom Filter.`);
// console.log(`leibale ${leibaleExists ? 'may' : 'does not'} exist in the Bloom Filter.`);

// Get stats for the Bloom Filter with the BF.INFO command.
// https://redis.io/commands/bf.info/
const info = await client.bf.info(bloomFilterName);
// info looks like this:
//
//  {
//    capacity: 1000,
//    size: 1531,
//    numberOfFilters: 1,
//    numberOfInsertedItems: 12,
//    expansionRate: 2
//  }
console.log('info - ', info);
console.log('size MB - ', info.size / 1024 / 1024);
console.log('time - ', Date.now() / 1000 / 60 - startTime, 'minutes');
await client.quit();
