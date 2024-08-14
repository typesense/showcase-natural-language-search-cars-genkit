'use client';

import { callGenerateTypesenseQuery } from '@/app/genkit';
import CarList from '@/components/CarList';
import ExampleSearchTerms from '@/components/ExampleSearchTerms';
import Heading from '@/components/Heading';
import { typesense } from '@/lib/typesense';
import { _CarSchemaResponse, _TypesenseQuery } from '@/schemas/typesense';
import { useEffect, useState } from 'react';
import { SearchResponse } from 'typesense/lib/Typesense/Documents';
import { useSearchParams, useRouter } from 'next/navigation';
import Form from '@/components/Form';
import LoaderSVG from '@/components/LoaderSVG';

export default function Home() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const router = useRouter();

  const [generatedQuery, setGeneratedQuery] = useState('');
  const [searchResponse, setSearchResponse] =
    useState<SearchResponse<_CarSchemaResponse>>();
  const [typesenseSearchParams, setTypesenseSearchParams] =
    useState<_TypesenseQuery>();
  const found = searchResponse?.found || 0;
  const [isLoading, setIsLoading] = useState(false);

  async function getCars(q: string) {
    setIsLoading(true);
    const generatedQ = await callGenerateTypesenseQuery(q);
    setIsLoading(false);

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
    setTypesenseSearchParams(params);
    console.log(searchResults);
    console.log(generatedQ);
  }

  useEffect(() => {
    q && getCars(q);
  }, [q]);

  const render = () => {
    if (isLoading) return <LoaderSVG message='Generating Typesense query...' />;
    if (searchResponse && typesenseSearchParams)
      return (
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
            searchParams={typesenseSearchParams}
          />
        </>
      );

    return (
      <ExampleSearchTerms
        onClick={(searchTerm) => router.push(`?q=${searchTerm}`)}
      />
    );
  };

  return (
    <main className='flex flex-col items-center px-2 py-16 max-w-screen-lg m-auto font-medium'>
      <Heading />
      <Form q={q} />
      {render()}
    </main>
  );
}
