import { GithubIcon } from '@/components/icons';

const GITHUB_LINK =
  'https://github.com/typesense/showcase-generation-augmented-retrieval-genkit';

export default function Header() {
  return (
    <header className=' w-full flex justify-end mb-2'>
      <a href={GITHUB_LINK} target='_blank' rel='noopener noreferrer'>
        <GithubIcon className='size-7' aria-label='Source code' />
      </a>
    </header>
  );
}
