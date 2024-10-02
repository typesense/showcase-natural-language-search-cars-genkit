'use server';

import * as z from 'zod';
import { configureGenkit, defineSchema } from '@genkit-ai/core';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { googleAI } from '@genkit-ai/googleai';
import { dotprompt, defineDotprompt } from '@genkit-ai/dotprompt';
import {
  _CarSchemaResponse,
  TypesenseFieldDescriptionSchema,
  TypesenseQuerySchema,
} from '@/schemas/typesense';
import { typesense } from '@/lib/typesense';
import { clientEnv } from '@/utils/env';
import { CollectionFieldSchema } from 'typesense/lib/Typesense/Collection';
import { booleanToYesNo } from '@/utils/utils';
import { unstable_cache } from 'next/cache';

const MAX_FACET_VALUES = Number(process.env.TYPESENSE_MAX_FACET_VALUES || '20');

defineSchema('TypesenseQuery', TypesenseQuerySchema);

configureGenkit({
  plugins: [dotprompt({ dir: 'src/prompts' }), googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Dynamically provide collection data properties & facet values for the llm
// Collection field `sort` property has to be explicitly set to true/false for the llm to enable/disable sorting
// Provide additional field description using collection metadata
async function getCollectionProperties() {
  const collection = await typesense({ isServer: true })
    .collections(clientEnv.TYPESENSE_COLLECTION_NAME)
    .retrieve();
  const facetableFields: CollectionFieldSchema[] = [];
  const rows: string[] = [];

  collection.fields?.forEach((field) => {
    if (field.facet) {
      facetableFields.push(field);
    } else {
      const { name, type, sort } = field;
      rows.push(
        // prettier-ignore
        `| ${name} | ${type} | Yes | ${booleanToYesNo(sort)} | N/A | ${(collection.metadata as TypesenseFieldDescriptionSchema)?.[name] || ''} |`
      );
    }
  });

  const facetValues = await typesense()
    .collections<_CarSchemaResponse>(clientEnv.TYPESENSE_COLLECTION_NAME)
    .documents()
    .search({
      q: '*',
      facet_by: facetableFields?.map(({ name }) => name).join(','),
      max_facet_values: MAX_FACET_VALUES + 1, // plus 1 so we can check if any fields exceed the limit
    });

  const facetableRows = facetableFields?.map(({ type, name, sort }, i) => {
    const counts = facetValues.facet_counts?.[i].counts;
    const exceedMaxNumValues =
      counts && counts?.length > MAX_FACET_VALUES
        ? 'There are more enum values for this field'
        : 'N/A';
    const enums = counts?.map((item) => item.value).join(', ');
    // prettier-ignore
    return `| ${name} | ${type} | Yes | ${booleanToYesNo(sort)} | ${enums} | ${
      (collection.metadata as TypesenseFieldDescriptionSchema)?.[name] || ''
    } ${exceedMaxNumValues} |`;
  });
  return rows.concat(facetableRows).join('\n');
}

const getCachedCollectionProperties = unstable_cache(
  async () => await getCollectionProperties(),
  [],
  {
    tags: ['getCollectionProperties'],
    revalidate: false, // Since the Typesense data for this repo is from a static dataset, we will cache the response indefinitely.
    // Because of that, changes made to the collection (e.g. updating field metadata) won't get reflected. When developing, use `getCollectionProperties` instead.
  }
);

const generateTypesenseQuery = defineFlow(
  {
    name: 'generateTypesenseQuery',
    inputSchema: z.string(),
    outputSchema: TypesenseQuerySchema,
  },
  async (query) => {
    const typesensePrompt = defineDotprompt(
      {
        model: 'googleai/gemini-1.5-flash',
        input: {
          schema: z.object({
            query: z.string(),
          }),
        },
        output: {
          schema: TypesenseQuerySchema,
        },
        name: 'typesense-prompt',
        config: {
          // https://ai.google.dev/gemini-api/docs/models/generative-models#model-parameters
          // temperature: 0,
          // topK: 1,
          // topP: 1,
        },
      },
      // prettier-ignore
      `You are assisting a user in searching for cars. Convert their query into the appropriate Typesense query format based on the instructions below.

### Typesense Query Syntax ###

## Filtering (for the filter_by property) ##

Matching values: The syntax is {fieldName} follow by a match operator : and a string value or an array of string values each separated by a comma. Do not encapsulate the value in double quote or single quote. Examples:
- model:prius
- make:[BMW,Nissan] returns cars that are manufactured by BMW OR Nissan.

Numeric Filters: Use :[min..max] for ranges, or comparison operators like :>, :<, :>=, :<=, :=. Examples:
 - year:[2000..2020]
 - highway_mpg:>40
 - msrp:=30000

Multiple Conditions: Separate conditions with &&. Examples:
 - num_employees:>100 && country:[USA,UK]
 - categories:=Shoes && categories:=Outdoor

OR Conditions Across Fields: Use || only for different fields. Examples:
 - vehicle_size:Large || vehicle_style:Wagon
 - (vehicle_size:Large || vehicle_style:Wagon) && year:>2010

If the same field is used for filtering multiple values in an || (OR) operation, then use the multi-value OR syntax. For eg:
\`make:BMW || make:Honda || make:Ford\`
should be simplified as:
\`make:[BMW, Honda, Ford]\`

Negation: Use :!= to exclude values. Examples:
 - make:!=Nissan
 - make:!=[Nissan,BMW]

If any string values have parentheses, surround the value with backticks to escape them.

For eg, if a field has the value "premium unleaded (required)", and you need to use it in a filter_by expression, then you would use it like this:

- fuel_type:\`premium unleaded (required)\`
- fuel_type!:\`premium unleaded (required)\`

## Sorting (for the sort_by property) ##

You can only sort maximum 3 sort fields at a time. The syntax is {fieldName}: follow by asc (ascending) or dsc (descending), if sort by multiple fields, separate them by a comma. Examples:
 - msrp:desc
 - year:asc,city_mpg:desc

Sorting hints:
  - When a user says something like "good mileage", sort by highway_mpg or/and city_mpg.
  - When a user says something like "powerful", sort by engine_hp.
  - When a user says something like "latest", sort by year.

## Car properties ##

| Name             | Data Type | Filter | Sort | Enum Values  | Description|
|------------------|-----------|--------|------|--------------|------------|
${await getCachedCollectionProperties()}

### Query (for the query property) ###
Include query only if both filter_by and sort_by are inadequate.

### User-Supplied Query ###

{{query}}

### Output Instructions ###

Provide the valid JSON with the correct filter and sorting format, only include fields with non-null values. Do not add extra text or explanations.`
    );
    const llmResponse = await typesensePrompt.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      input: { query },
    });

    return llmResponse.output();
  }
);

export async function callGenerateTypesenseQuery(theme: string) {
  const flowResponse = await runFlow(generateTypesenseQuery, theme);
  console.log(flowResponse);
  return flowResponse;
}
