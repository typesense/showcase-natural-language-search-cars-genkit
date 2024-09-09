'use server';

import * as z from 'zod';
import { configureGenkit, defineSchema } from '@genkit-ai/core';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { googleAI } from '@genkit-ai/googleai';
import { dotprompt, defineDotprompt } from '@genkit-ai/dotprompt';
import { _CarSchemaResponse, TypesenseQuerySchema } from '@/schemas/typesense';
import { typesense } from '@/lib/typesense';

const MAX_FACET_VALUES = Number(process.env.TYPESENSE_MAX_FACET_VALUES || '20');

defineSchema('TypesenseQuery', TypesenseQuerySchema);

configureGenkit({
  plugins: [dotprompt({ dir: 'src/prompts' }), googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// dynamically provide facet values for the llm
async function getFieldEnumValues() {
  const collection = await typesense.collections('cars').retrieve();
  const facetableFields = collection.fields?.filter((field) => field.facet);

  const facetValues = await typesense
    .collections<_CarSchemaResponse>('cars')
    .documents()
    .search({
      q: '*',
      facet_by: facetableFields?.map(({ name }) => name).join(','),
      max_facet_values: MAX_FACET_VALUES + 1, // plus 1 so we can check if any fields exceed the limit
    });

  return facetableFields
    ?.map(({ type, name }, i) => {
      const counts = facetValues.facet_counts?.[i].counts;
      const exceedMaxNumValues =
        counts && counts?.length > MAX_FACET_VALUES
          ? 'There are more enum values for this field'
          : 'N/A';
      const enums = counts?.map((item) => item.value).join(', ');
      // prettier-ignore
      return `| ${name} | ${type} | Yes | No | ${enums} | ${exceedMaxNumValues} |`
    })
    .join('\n');
}

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
| year             | int64     | Yes    | Yes  | N/A          | N/A        |
| engine_hp        | float64   | Yes    | Yes  | N/A          | N/A        |
| engine_cylinders | int64     | Yes    | Yes  | N/A          | N/A        |
| number_of_doors  | int64     | Yes    | No   | N/A          | N/A        |
| highway_mpg      | int64     | Yes    | Yes  | N/A          | N/A        |
| city_mpg         | int64     | Yes    | Yes  | N/A          | N/A        |
| popularity       | int64     | Yes    | Yes  | N/A          | N/A        |
| msrp             | int64     | Yes    | Yes  | N/A          | in USD $   |
${await getFieldEnumValues()}

### Query (for the query property) ###
Include query only if both filter_by and sort_by are inadequate.

### User-Supplied Query ###

{{query}}

### Output Instructions ###

Provide the valid JSON with the correct filter and sorting format, only include fields with non-null values. Do not add extra text or explanations.
`
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
