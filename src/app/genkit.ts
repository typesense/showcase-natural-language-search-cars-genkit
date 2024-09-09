'use server';

import * as z from 'zod';
import { configureGenkit, defineSchema } from '@genkit-ai/core';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { googleAI } from '@genkit-ai/googleai';
import { dotprompt, defineDotprompt } from '@genkit-ai/dotprompt';
import { _CarSchemaResponse, TypesenseQuerySchema } from '@/schemas/typesense';
import { typesense } from '@/lib/typesense';

defineSchema('TypesenseQuery', TypesenseQuerySchema);

configureGenkit({
  plugins: [dotprompt({ dir: 'src/prompts' }), googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

const generateTypesenseQuery = defineFlow(
  {
    name: 'generateTypesenseQuery',
    inputSchema: z.string(),
    outputSchema: TypesenseQuerySchema,
  },
  async (query) => {
    const facetValues = await typesense
      .collections<_CarSchemaResponse>('cars')
      .documents()
      .search({
        q: '*',
        facet_by: 'engine_fuel_type,market_category,vehicle_style',
        max_facet_values: 20,
      });
    function getFacetEnums(index: number) {
      return facetValues.facet_counts?.[index].counts
        .map((item) => item.value)
        .join(', ');
    }
    console.log(facetValues);
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

| Name              | Data Type | Filter | Sort | Enum Values                                                                                                 | Description|
|-------------------|-----------|--------|------|-------------------------------------------------------------------------------------------------------------|------------|
| make              | string    | Yes    | No   | N/A                                                                                                         | N/A        |
| model             | string    | Yes    | No   | N/A                                                                                                         | N/A        |
| year              | int64     | Yes    | Yes  | N/A                                                                                                         | N/A        |
| engine_fuel_type  | string    | Yes    | No   | ${getFacetEnums(0)} | N/A        |
| engine_hp         | float64   | Yes    | Yes  | N/A                                                                                                         | N/A        |
| engine_cylinders  | int64     | Yes    | Yes  | N/A                                                                                                         | N/A        |
| transmission_type | string    | Yes    | No   | MANUAL, AUTOMATIC, AUTOMATED_MANUAL, DIRECT_DRIVE                                                           | N/A        |
| driven_wheels     | string    | Yes    | No   | rear wheel drive, front wheel drive, all wheel drive, four wheel drive                                      | N/A        |
| market_category   | string    | Yes    | No   | ${getFacetEnums(1)} | N/A        |
| number_of_doors   | int64     | Yes    | No   | N/A                                                                                                         | N/A        |
| vehicle_size      | string    | Yes    | No   | Compact, Large, Midsize                                                                                     | N/A        |
| vehicle_style     | string    | Yes    | No   | ${getFacetEnums(2)} | N/A        |
| highway_mpg       | int64     | Yes    | Yes  | N/A                                                                                                         | N/A        |
| city_mpg          | int64     | Yes    | Yes  | N/A                                                                                                         | N/A        |
| popularity        | int64     | Yes    | Yes  | N/A                                                                                                         | N/A        |
| msrp              | int64     | Yes    | Yes  | N/A                                                                                                         | in USD $   |

### IMPORTANT NOTES ###
 - Query Field: Include query only if both filter_by and sort_by are inadequate.

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
