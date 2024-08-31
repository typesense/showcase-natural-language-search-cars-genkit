import { EXAMPLE_SEARCH_TERMS } from '@/utils/utils';

export default function ExampleSearchTerms({
  onClick,
}: {
  onClick: (item: string) => any;
}) {
  return (
    <>
      <h2 className='w-full'>Here are some example queries to try:</h2>
      <ul className='w-full flex flex-col gap-2 mt-2 text-sm font-light'>
        {EXAMPLE_SEARCH_TERMS.map((item) => (
          <li
            className='w-full py-2.5 px-3 border rounded-sm cursor-pointer hover:bg-neutral-100 hover:transition'
            onClick={() => onClick(item)}
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}
