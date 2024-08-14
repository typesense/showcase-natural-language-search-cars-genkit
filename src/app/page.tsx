'use client';

import { callGenerateTypesenseQuery } from '@/app/genkit';
import CarList from '@/components/CarList';
import ExampleSearchTerms from '@/components/ExampleSearchTerms';
import Heading from '@/components/Heading';
import { SearchIcon } from '@/components/icons';
import { typesense } from '@/lib/typesense';
import { _CarSchemaResponse, _TypesenseQuery } from '@/schemas/typesense';
import { useState } from 'react';
import { SearchResponse } from 'typesense/lib/Typesense/Documents';

export default function Home() {
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [searchResponse, setSearchResponse] =
    useState<SearchResponse<_CarSchemaResponse>>();
  const [searchParams, setSearchParams] = useState<_TypesenseQuery | null>(
    null
  );
  const found = searchResponse?.found || 0;

  async function getCars(formData: FormData) {
    const q = formData.get('q')?.toString() ?? '';
    const generatedQ = await callGenerateTypesenseQuery(q);
    const params = {
      q: generatedQ.query || '*',
      filter_by: generatedQ.filter_by || '',
      sort_by: generatedQ.sort_by || 'popularity:desc',
    };
    const searchResults = await typesense
      .collections<_CarSchemaResponse>('cars')
      .documents()
      .search({
        ...params,
        query_by: 'make,model,market_category',
        per_page: 12,
      });

    setSearchResponse(searchResults);
    setGeneratedQuery(JSON.stringify(generatedQ));
    setSearchParams(params);
    console.log(searchResults);
    console.log(generatedQ);
  }

  return (
    <main className='flex flex-col items-center px-2 py-16 max-w-screen-lg m-auto font-medium'>
      <Heading />
      <form className='w-full flex gap-2.5 mb-4' action={getCars}>
        <input
          className='flex-1 pl-3 border-2 border-gray-700 rounded-lg placeholder:font-light text-sm'
          type='text'
          name='q'
          placeholder="Type in the car's specification, e.g. newest manual Ford, V6, under 50K..."
        />
        <button
          className='bg-neutral-900 aspect-square w-10 grid place-content-center rounded-lg hover:bg-neutral-800 transition'
          type='submit'
        >
          <SearchIcon className='size-5 fill-white' />
        </button>
      </form>
      {searchResponse && searchParams ? (
        <>
          <pre className='text-xs mb-4 block max-w-full overflow-auto'>
            {generatedQuery}
          </pre>
          <div className='self-start mb-2'>
            {found != 0 && `Found ${found} results.`}
          </div>
          <CarList
            initialData={{
              data: searchResponse.hits,
              nextPage:
                1 * (searchResponse.request_params.per_page || 0) <
                searchResponse.found
                  ? 2
                  : null,
            }}
            queryKey={generatedQuery}
            searchParams={searchParams}
          />
        </>
      ) : (
        <ExampleSearchTerms onClickAction={getCars} />
      )}
    </main>
  );
}
