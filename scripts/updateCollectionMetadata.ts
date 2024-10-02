import Typesense from 'typesense';
import 'dotenv/config';

const COLLECTION_NAME =
  process.env.NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME || 'cars';

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
  } catch (err) {
    console.log(`Could not found collection: ${COLLECTION_NAME}`);
    return;
  }

  console.log('Updating collection metadata...');

  // schema for field description
  // {
  //   fieldName: "fieldDescription"
  // }
  await typesense.collections(COLLECTION_NAME).update({
    metadata: {
      msrp: 'in USD',
    },
  });

  console.log('Completed!');
})();
