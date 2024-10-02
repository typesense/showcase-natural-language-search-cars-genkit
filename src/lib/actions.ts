import { _CarSchemaResponse, _TypesenseQuery } from '@/schemas/typesense';
import { typesense } from './typesense';
import { clientEnv } from '@/utils/env';

export type _carsData = Awaited<ReturnType<ReturnType<typeof fetchCars>>>;

export default function fetchCars(searchParams: _TypesenseQuery) {
  return async ({ pageParam }: { pageParam: number }) => {
    const res = await typesense()
      .collections<_CarSchemaResponse>(clientEnv.TYPESENSE_COLLECTION_NAME)
      .documents()
      .search({
        ...searchParams,
        query_by: 'make,model,market_category',
        per_page: 12,
      });
    const { per_page = 0 } = res.request_params;

    return {
      data: res.hits,
      nextPage: pageParam * per_page < res.found ? pageParam + 1 : null,
    };
  };
}
