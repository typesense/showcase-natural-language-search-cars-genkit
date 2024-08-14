'use server';

import * as z from 'zod';
import { configureGenkit, defineSchema } from '@genkit-ai/core';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { googleAI } from '@genkit-ai/googleai';
import { dotprompt, defineDotprompt } from '@genkit-ai/dotprompt';
import { TypesenseQuerySchema } from '@/schemas/typesense';

defineSchema('TypesenseQuery', TypesenseQuerySchema);

configureGenkit({
  plugins: [dotprompt({ dir: 'src/prompts' }), googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
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
  `
You are assisting a user in searching for cars. Convert their query into the appropriate Typesense filter format based on the instructions below.

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

Allowed fields for filtering and their corresponding data type:
 - make             : string
 - model            : string
 - year             : int64
 - engine_fuel_type : string  enum:regular unleaded,diesel,electric,flex-fuel (premium unleaded recommended/E85),flex-fuel (premium unleaded required/E85),premium unleaded (required),premium unleaded (recommended),natural gas,flex-fuel (unleaded/E85)
 - engine_hp        : float64
 - engine_cylinders : int64
 - transmission_type: string  enum:MANUAL,AUTOMATIC,AUTOMATED_MANUAL,DIRECT_DRIVE
 - driven_wheels    : string  enum:rear wheel drive,front wheel drive,all wheel drive,four wheel drive
 - number_of_doors  : int64
 - vehicle_size     : string  enum:Compact,Large,Midsize
 - vehicle_style    : string  enum:Cargo Minivan,4dr SUV,Crew Cab Pickup,Wagon,Passenger Van,4dr Hatchback,Cargo Van,Passenger Minivan,2dr Hatchback,Coupe,Regular Cab Pickup,Sedan,Extended Cab Pickup,Convertible,Convertible SUV,2dr SUV
 - highway_mpg      : int64
 - city_mpg         : int64
 - popularity       : int64
 - msrp             : int64   (in USD $)

## Sorting (for the sort_by property) ##

You can only sort maximum 3 sort fields at a time. The syntax is {fieldName}: follow by asc (ascending) or dsc (descending), if sort by multiple fields, separate them by a comma. Examples:
 - msrp:desc
 - year:asc,city_mpg:desc

Allowed fields for sorting: all numeric fields specified in the filtering section above.

Sorting hints:
  - When a user says something like "good mileage", sort by highway_mpg or/and city_mpg.
  - When a user says something like "powerful", sort by engine_hp.

### IMPORTANT NOTES ###
 - Query Field: Include query only if both filter_by and sort_by are insufficient to capture the user's intent.

### User-Supplied Query ###

{{query}}

### Output Instructions ###

Provide the valid JSON with the correct filter and sorting format, only include fields with non-null values. Do not add extra text or explanations.
`
);

const generateTypesenseQuery = defineFlow(
  {
    name: 'generateTypesenseQuery',
    inputSchema: z.string(),
    outputSchema: TypesenseQuerySchema,
  },
  async (query) => {
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
