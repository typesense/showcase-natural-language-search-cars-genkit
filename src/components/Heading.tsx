import Link from 'next/link';

export default function Heading() {
  return (
    <div className='mb-6 flex flex-col items-center gap-2'>
      <Link href={'/'}>
        <h1 className='text-3xl font-bold'>Cars search</h1>
      </Link>
      <div className='flex items-center gap-2 text-sm'>
        Powered by
        <a
          href='https://github.com/firebase/genkit'
          target='_blank'
          rel='noopener noreferrer'
          className='flex gap-1 text-[#64686d]'
        >
          <img className='h-5' src='/genkit-logo.svg' alt='Genkit logo' />{' '}
          Genkit
        </a>
        &
        <a
          href='https://typesense.org/'
          target='_blank'
          rel='noopener noreferrer'
          className='text-[#D90368]'
        >
          type<b>sense|</b>
        </a>
      </div>
    </div>
  );
}
