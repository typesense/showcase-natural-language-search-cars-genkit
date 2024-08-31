import Typesense from 'typesense';
import 'dotenv/config';
import fs from 'fs/promises';
import { resolve } from 'path';

const COLLECTION_NAME = 'cars';
const PATH_TO_DATASET = './scripts/data/cars.jsonl';

(async () => {
  console.log('Connecting to typesense server...');

  const typesense = new Typesense.Client({
    apiKey: process.env.TYPESENSE_ADMIN_API_KEY || 'xyz',
    nodes: [
      {
        url: process.env.NEXT_PUBLIC_TYPESENSE_URL || 'http://localhost:8108',
      },
    ],
    connectionTimeoutSeconds: 60 * 60,
  });

  try {
    await typesense.collections(COLLECTION_NAME).retrieve();
    console.log(`Found existing collection of ${COLLECTION_NAME}`);

    if (process.env.FORCE_REINDEX !== 'true')
      return console.log('FORCE_REINDEX = false. Canceling operation...');

    console.log('Deleting collection');
    await typesense.collections(COLLECTION_NAME).delete();
  } catch (err) {
    console.error(err);
  }

  console.log('Creating schema...');

  await typesense.collections().create({
    name: COLLECTION_NAME,
    fields: [
      {
        name: 'make',
        type: 'string',
        facet: true,
      },
      {
        name: 'model',
        type: 'string',
        facet: true,
      },
      {
        name: 'year',
        type: 'int32',
      },
      {
        name: 'engine_fuel_type',
        type: 'string',
        facet: true,
      },
      {
        name: 'engine_hp',
        type: 'float',
      },
      {
        name: 'engine_cylinders',
        type: 'int32',
      },
      {
        name: 'transmission_type',
        type: 'string',
        facet: true,
      },
      {
        name: 'driven_wheels',
        type: 'string',
        facet: true,
      },
      {
        name: 'number_of_doors',
        type: 'int32',
      },
      {
        name: 'market_category',
        type: 'string[]',
        facet: true,
      },
      {
        name: 'vehicle_size',
        type: 'string',
        facet: true,
      },
      {
        name: 'vehicle_style',
        type: 'string',
        facet: true,
      },
      {
        name: 'highway_mpg',
        type: 'int32',
      },
      {
        name: 'city_mpg',
        type: 'int32',
      },
      {
        name: 'popularity',
        type: 'int32',
      },
      {
        name: 'msrp',
        type: 'int32',
      },
    ],
  });

  console.log('Indexing data');

  const jsonlPodcasts = await fs.readFile(
    resolve(resolve(), PATH_TO_DATASET),
    'utf-8'
  );

  try {
    const returnData = await typesense
      .collections(COLLECTION_NAME)
      .documents()
      .import(jsonlPodcasts);

    console.log('Return data: ', returnData);
  } catch (error) {
    console.log(error);
  }
})();
