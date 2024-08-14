'use client';

import { callMenuSuggestionFlow } from '@/app/genkit';
import CardItem from '@/components/CardItem';
import { SearchIcon } from '@/components/icons';
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

    const searchResults = await typesense
      .collections<_CarSchemaResponse>('cars')
      .documents()
      .search({
        q: suggestion.query || '*',
        query_by: 'make,model,engine_fuel_type,vehicle_style,market_category',
        filter_by: suggestion.filter_by || '',
        per_page: 12,
      });
    setHits(searchResults.hits || []);
    setSearchResponse(searchResults);
    console.log(searchResults);
    console.log(suggestion);
    setMenu(JSON.stringify(suggestion));
  }

  return (
    <main className='flex flex-col items-center px-2 py-16 max-w-screen-lg m-auto font-medium'>
      <h1 className='text-3xl font-bold mb-4'>Cars search</h1>
      <form className='w-full flex gap-2.5' action={getMenuItem}>
        <input
          className='flex-1 pl-3 border-2 border-gray-700 rounded-xl'
          type='text'
          name='theme'
        />
        <button
          className='bg-neutral-900 aspect-square w-10 grid place-content-center rounded-lg'
          type='submit'
        >
          <SearchIcon className='size-5 fill-white' />
        </button>
      </form>
      <pre className='text-xs my-4 block'>{menuItem}</pre>
      <div className='self-start mb-2'>
        Found {searchResponse?.found || 0} results.
      </div>
      <ul className='w-full grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-lg:grid-cols-2'>
        {hits.map(({ document }) => (
          <CardItem car={document} key={document.id} />
        ))}
      </ul>
    </main>
  );
}
