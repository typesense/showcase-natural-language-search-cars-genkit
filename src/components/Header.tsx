import { ExternalLinkIcon, GithubIcon } from '@/components/icons';

const GITHUB_LINK =
  'https://github.com/typesense/showcase-natural-language-search-cars-genkit';
const ARTICLE_LINK =
  'https://typesense.org/docs/guide/natural-language-search.html';

export default function Header() {
  return (
    <header className='w-full flex justify-end mb-2'>
      <nav className='flex gap-6 items-center'>
        <a
          className='text-sm flex items-center gap-1 border-gray-900 border p-1 rounded-md'
          href={ARTICLE_LINK}
          target='_blank'
          rel='noopener noreferrer'
        >
          About <ExternalLinkIcon aria-label='Link to article' />
        </a>
        <a href={GITHUB_LINK} target='_blank' rel='noopener noreferrer'>
          <GithubIcon className='size-7' aria-label='Source code' />
        </a>
      </nav>
    </header>
  );
}
