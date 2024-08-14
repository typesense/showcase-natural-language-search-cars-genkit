import { EXAMPLE_SEARCH_TERMS } from '@/utils/utils';

export default function ExampleSearchTerms({
  onClickAction,
}: {
  onClickAction: (formData: FormData) => void;
}) {
  return (
    <>
      <h2 className='w-full'>Try with these examples:</h2>
      <ul className='w-full flex flex-col gap-2 mt-2 text-sm font-light'>
        {EXAMPLE_SEARCH_TERMS.map((item) => (
          <li
            className='w-full py-2.5 px-3 border rounded-sm cursor-pointer hover:bg-neutral-100 transition'
            onClick={async () => {
              const formData = new FormData();
              formData.append('q', item);
              onClickAction(formData);
            }}
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}
