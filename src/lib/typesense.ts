import Typesense from 'typesense';

export const typesense = new Typesense.Client({
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY || 'xyz',
  nodes: [
    {
      url: process.env.NEXT_PUBLIC_TYPESENSE_URL || 'http://localhost:8108',
    },
  ],
  connectionTimeoutSeconds: 60 * 60,
});
