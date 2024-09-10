import { _CarSchemaResponse, _TypesenseQuery } from '@/schemas/typesense';
import CardItem from './CardItem';
import fetchCars, { _carsData } from '@/lib/actions';
import { useInfiniteQuery } from '@tanstack/react-query';
import LoaderSVG from './LoaderSVG';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export default function CarList({
  initialData,
  searchParams,
  queryKey,
}: {
  initialData: _carsData;
  searchParams: _TypesenseQuery;
  queryKey: string;
}) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['cars', queryKey],
    queryFn: fetchCars(searchParams),
    initialData: { pages: [initialData], pageParams: [1] },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView]);

  if (status === 'error') {
    console.log(error);
    return 'Error';
  }
  return (
    <>
      <ul className='w-full grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-lg:grid-cols-2'>
        {data.pages.map((page) =>
          page.data?.map(({ document }) => (
            <CardItem car={document} key={document.id} />
          ))
        )}
      </ul>
      {isFetchingNextPage && hasNextPage ? (
        <LoaderSVG />
      ) : (
        <div className='w-full text-center text-sm mt-4'>
          No more cars found.
        </div>
      )}
      <div ref={ref} />
    </>
  );
}
