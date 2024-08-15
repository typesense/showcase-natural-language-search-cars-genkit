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
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { TYPESENSE_PER_PAGE } from '@/utils/utils';

export default function Home() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const router = useRouter();

  const [loadingState, setLoadingState] = useState<
    'generating' | 'searching' | 'finished'
  >('finished');
  const [searchResponse, setSearchResponse] =
    useState<SearchResponse<_CarSchemaResponse>>();
  const [typesenseSearchParams, setTypesenseSearchParams] = useState<{
    generatedQueryString: string;
    params: _TypesenseQuery;
  }>();

  const found = searchResponse?.found || 0;
  const nextPage = 1 * TYPESENSE_PER_PAGE < found ? 2 : null;

  async function getCars(q: string) {
    setLoadingState('generating');
    toast({}).dismiss();
    try {
      const generatedQ = await callGenerateTypesenseQuery(q);
      setLoadingState('searching');

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
          per_page: TYPESENSE_PER_PAGE,
        });

      setSearchResponse(searchResults);
      setTypesenseSearchParams({
        generatedQueryString: JSON.stringify(generatedQ),
        params,
      });
    } catch (error) {
      console.log(error);
      toast({
        variant: 'destructive',
        title: 'Error processing your request!',
        description: 'Please try again with a different query.',
        duration: 5000,
        action: (
          <ToastAction onClick={() => getCars(q)} altText='Try again'>
            Try again
          </ToastAction>
        ),
      });
      setTypesenseSearchParams(undefined);
    } finally {
      setLoadingState('finished');
    }
  }

  useEffect(() => {
    q && getCars(q);
  }, [q]);

  const render = () => {
    if (loadingState !== 'finished')
      return (
        <LoaderSVG
          message={
            loadingState == 'generating' ? 'Generating Typesense query...' : ''
          }
        />
      );

    if (searchResponse && typesenseSearchParams)
      return (
        <>
          <pre className='text-xs mb-4 block max-w-full overflow-auto'>
            {typesenseSearchParams.generatedQueryString}
          </pre>
          {found == 0 ? (
            <div className='mt-20 text-light'>
              Oops! Couldn't find what you are looking for.
            </div>
          ) : (
            <>
              <div className='self-start mb-2'>
                Found {found} {found > 1 ? 'results' : 'result'}.
              </div>
              <CarList
                initialData={{
                  data: searchResponse.hits,
                  nextPage,
                }}
                queryKey={typesenseSearchParams.generatedQueryString}
                searchParams={typesenseSearchParams.params}
              />
            </>
          )}
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
