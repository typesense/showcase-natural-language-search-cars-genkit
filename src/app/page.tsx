'use client';
import { callGenerateTypesenseQuery } from '@/app/genkit';
import CarList from '@/components/CarList';
import ExampleSearchTerms from '@/components/ExampleSearchTerms';
import Heading from '@/components/Heading';
import { typesense } from '@/lib/typesense';
import { _CarSchemaResponse, _TypesenseQuery } from '@/schemas/typesense';
import { Suspense, useEffect, useState } from 'react';
import { SearchResponse } from 'typesense/lib/Typesense/Documents';
import { useSearchParams, useRouter } from 'next/navigation';
import Form from '@/components/Form';
import LoaderSVG from '@/components/LoaderSVG';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { TYPESENSE_PER_PAGE } from '@/utils/utils';
import Header from '@/components/Header';
import { clientEnv } from '@/utils/env';
import React from 'react';
import { RequestMalformed } from 'typesense/lib/Typesense/Errors';
export default function Home() {
  return (
    <main className='flex flex-col items-center px-2 py-10 max-w-screen-lg m-auto font-medium'>
      <Header />
      <Heading />
      <Suspense fallback={<LoaderSVG />}>
        <Search />
      </Suspense>
    </main>
  );
}

function Search() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const router = useRouter();

  const [loadingState, setLoadingState] = useState<
    'generating' | 'searching' | 'finished'
  >('finished');

  const [queryJsonString, setQueryJsonString] = useState('');
  const [data, setData] = useState<{
    params: _TypesenseQuery;
    searchResponse: SearchResponse<_CarSchemaResponse>;
  }>();

  const found = data?.searchResponse.found || 0;
  const nextPage = 1 * TYPESENSE_PER_PAGE < found ? 2 : null;

  async function getCars(q: string) {
    setLoadingState('generating');
    toast({}).dismiss();

    const { data: generatedQuery, error } = await callGenerateTypesenseQuery(q);
    if (generatedQuery == null) {
      errorToast(error.message);
      return;
    }
    setQueryJsonString(JSON.stringify(generatedQuery));

    try {
      setLoadingState('searching');

      const params = {
        q: generatedQuery.query || '*',
        filter_by: generatedQuery.filter_by || '',
        sort_by: generatedQuery.sort_by || '',
      };

      const searchResponse = await typesense()
        .collections<_CarSchemaResponse>(clientEnv.TYPESENSE_COLLECTION_NAME)
        .documents()
        .search({
          ...params,
          query_by: 'make,model,market_category',
          per_page: TYPESENSE_PER_PAGE,
        });

      setData({
        params,
        searchResponse,
      });
    } catch (error) {
      let errorMsg = '';
      console.log(error);
      if (error instanceof RequestMalformed) {
        errorMsg = error.message;
      }
      errorToast(errorMsg || 'Please try again with a different query.');
    } finally {
      setLoadingState('finished');
    }
  }

  const errorToast = (msg: string) =>
    toast({
      variant: 'destructive',
      title: `Error processing your request!`,
      description: msg,
      duration: 5000,
      action: (
        <ToastAction onClick={() => getCars(q)} altText='Try again'>
          Try again
        </ToastAction>
      ),
    });

  useEffect(() => {
    setData(undefined);
    setQueryJsonString('');
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

    if (data)
      return found == 0 ? (
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
              data: data.searchResponse.hits,
              nextPage,
            }}
            queryKey={queryJsonString}
            searchParams={data.params}
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
    <>
      <Form q={q} />
      {
        <pre className='text-xs mb-4 block max-w-full overflow-auto'>
          {queryJsonString}
        </pre>
      }
      {render()}
    </>
  );
}
