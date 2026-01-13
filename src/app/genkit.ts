'use server';

import { genkit, GenkitError, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

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
import { logger } from 'genkit/logging';

logger.setLogLevel('debug');

const MAX_FACET_VALUES = Number(process.env.TYPESENSE_MAX_FACET_VALUES || '20');
const MODEL = googleAI.model('gemini-2.5-flash-lite', {
  temperature: 0.8,
});
const ai = genkit({
  plugins: [googleAI()],
  model: MODEL,
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
        `|${name}|${type}|Yes|${booleanToYesNo(sort)}||${(collection.metadata as TypesenseFieldDescriptionSchema)?.[name] || ''}|`
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
        : '';
    const enums = counts?.map((item) => item.value).join('; ');
    // prettier-ignore
    return `|${name}|${type}|Yes|${booleanToYesNo(sort)}|${enums}|${
      (collection.metadata as TypesenseFieldDescriptionSchema)?.[name] || ' '
    }${exceedMaxNumValues}|`;
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

const generateTypesenseQuery = ai.defineFlow(
  {
    name: 'generateTypesenseQuery',
    inputSchema: z.string(),
    outputSchema: TypesenseQuerySchema,
  },
  async (query) => {
    try {
      const { output } = await ai.generate({
        model: MODEL,
        config: {
          // https://ai.google.dev/gemini-api/docs/models/generative-models#model-parameters
          // temperature: 0,
          // topK: 1,
          // topP: 1,
        },
        system:      // prettier-ignore
      `You are assisting a user in searching for cars. Convert their query into the appropriate Typesense query format based on the instructions below.

### Typesense Query Syntax ###

## Filtering ##

Matching values: {fieldName}: followed by a string value or an array of string values each separated by a comma. Enclose the string value with backticks if it contains parentheses \`()\`. Examples:
- model:prius
- make:[BMW,Nissan] returns cars that are manufactured by BMW OR Nissan.
- fuel_type:\`premium unleaded (required)\`
- fuel_type:\`premium unleaded (recommended)\`


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

Negation: Use :!= to exclude values. Examples:
- make:!=Nissan
- make:!=[Nissan,BMW]
- fuel_type:!=\`premium unleaded (required)\`


 If the same field is used for filtering multiple values in an || (OR) operation, then use the multi-value OR syntax. For eg:
\`make:BMW || make:Honda || make:Ford\`
should be simplified as:
\`make:[BMW, Honda, Ford]\`

## Sorting ##

You can only sort maximum 3 sort fields at a time. The syntax is {fieldName}: follow by asc (ascending) or dsc (descending), if sort by multiple fields, separate them by a comma. Examples:
 - msrp:desc
 - year:asc,city_mpg:desc

Sorting hints:
  - When a user says something like "good mileage", sort by highway_mpg or/and city_mpg.
  - When a user says something like "powerful", sort by engine_hp.
  - When a user says something like "latest", sort by year.

## Car properties ##
The following are the car properties that you can use to filter and sort the data. Completely ignore the field names that are not in the list.
| Name | Data Type | Filter | Sort | Enum Values | Description |
|------|-----------|--------|------|-------------|-------------|
${await getCachedCollectionProperties()}

### Query ###
Include query only if both filter_by and sort_by are inadequate. Don't include filter_by or sort_by in the ouput if their values are null.

### Output Instructions ###
Provide the valid JSON with the correct filter and sorting format, only include fields with non-null values. Do not add extra text or explanations.`,
        prompt://prettier-ignore
`### User-Supplied Query ###
${query}`,
        output: { schema: TypesenseQuerySchema },
      });

      if (output !== null) return output;
    } catch (error) {
      console.log(error);
      throw new CustomGenkitGenerationError(
        (error as GenkitError).message || 'Error generating Typesense query!'
      );
    }
    throw new CustomGenkitGenerationError("Response doesn't satisfy schema.");
  }
);

export async function callGenerateTypesenseQuery(query: string) {
  try {
    const flowResponse = await generateTypesenseQuery(query);
    console.log(flowResponse);
    return { data: flowResponse, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: (error as CustomGenkitGenerationError).message },
    };
  }
}

class CustomGenkitGenerationError extends Error {
  constructor(message = '') {
    super(message);
    this.message = message;
  }
}
