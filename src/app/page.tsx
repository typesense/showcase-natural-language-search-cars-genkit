'use client';

import { callMenuSuggestionFlow } from '@/app/genkit';
import { typesense } from '@/lib/typesense';
import { _CarSchemaResponse } from '@/schemas/typesense';
import { useState } from 'react';
import {
  SearchResponse,
  SearchResponseHit,
} from 'typesense/lib/Typesense/Documents';

export default function Home() {
  const [menuItem, setMenu] = useState<string>('');
  const [hits, setHits] = useState<SearchResponseHit<_CarSchemaResponse>[]>([]);
  const [searchResponse, setSearchResponse] =
    useState<SearchResponse<_CarSchemaResponse>>();

  async function getMenuItem(formData: FormData) {
    const theme = formData.get('theme')?.toString() ?? '';
    const suggestion = await callMenuSuggestionFlow(theme);
    console.log(suggestion);
    setMenu(JSON.stringify(suggestion));
    const searchResults = await typesense
      .collections<_CarSchemaResponse>('cars')
      .documents()
      .search({
        q: suggestion.query || '*',
        query_by:
          'manufacturer,model,engine_fuel_type,vehicle_style,driven_wheels',
        filter_by: suggestion.filterBy || '',
      });
    setHits(searchResults.hits || []);
    setSearchResponse(searchResults);
    console.log(searchResults);
  }

  return (
    <main>
      <form action={getMenuItem}>
        <label>Suggest a menu item for a restaurant with this theme: </label>
        <input type='text' name='theme' />
        <button type='submit'>Generate</button>
      </form>
      <br />
      <pre>{menuItem}</pre>
      <div>Found {searchResponse?.found} results</div>
      <ul>
        {hits.map(({ document }) => (
          <li key={document.id}>
            <div>
              {document.manufacturer} - {document.model}
            </div>
            <div>{document.driven_wheels}</div>
            <div>
              <b>{document.msrp}</b>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
