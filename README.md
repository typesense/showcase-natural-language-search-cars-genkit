<h1>
 🔥 Generation Augmented Retrieval (GAR) search experience powered by Genkit and Typesense
</h1>

Search for your dream car with the help of AI.

## Tech Stack

- <a href="https://github.com/typesense/typesense" target="_blank">Typesense</a>
- <a href="https://github.com/firebase/genkit" target="_blank">Genkit</a>
- NextJS
- Typescript
- Tailwind
- React Query

The dataset contains 6500 cars and is available on <a href="https://www.kaggle.com/datasets/rupindersinghrana/car-features-and-prices-dataset" target="_blank">Kaggle</a>.

## Project Structure

```bash
├── scripts/
│   ├── data/
│   │   └── cars.json
│   └── indexTypesense.ts # script that index data from cars.json into typesense server
└── src/
    ├── app/
    │   ├── genkit.ts # AI prompt and flows
    │   └── page.tsx
    ├── components/
    │   └── UI components...
    ├── schemas/
    │   └── typesense.ts # define the response schema for genkit.ts
    └── lib/
        └── typesense.ts # typesense client config
```

## Development

To run this project locally, make sure you have docker and nodejs, clone this project, install dependencies and start the dev server:

Start typesense server

```shell
npm run start:typesense # or: docker compose up
```

Index data into typesense

```shell
npm run index:typesense
```

Update collection metadata, this will be used to provide additional information about each collection property for the LLM.

```shell
npm run updateMetadata:typesense
```

Start the dev server

```shell
npm run dev
```

Open http://localhost:3000 to see the app ✌️

## Deployment

See [.env.example](.env.example) for environment variables.
