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

### Typesense Filter Query Syntax ###

Matching values: The syntax is {fieldName} follow by a match operator : and a string value or an array of string values each separated by a comma. Do not encapsulate the value in double quote or single quote. Examples:
- model:[prius]
- manufacturer:[BMW,Nissan] returns cars that are manufactured by BMW OR Nissan.

Numeric Filters: Use :[min..max] for ranges, or comparison operators like :>, :<, :>=, :<=, :=. Examples:
 - year:[2000..2020]
 - highway_mpg:>40
 - city_mpg:[30..100,40] (Filter docs where value is between 30 to 100 or exactly 40).
 - msrp:=30000

Multiple Conditions: Separate conditions with &&. Examples:
 - num_employees:>100 && country:[USA,UK]
 - categories:=Shoes && categories:=Outdoor

OR Conditions Across Fields: Use || only for different fields. Examples:
 - color:blue || category:shoe
 - (color:blue || category:shoe) && in_stock:true

Negation: Use :!= to exclude values. Examples:
 - author:!=JK Rowling
 - author:!=[JK Rowling,Gilbert Patten]

Available properties for filtering and their corresponding data type:
 - manufacturer     : string
 - model            : string
 - year             : int64
 - engine_fuel_type : string
 - engine_hp        : float64
 - engine_cylinders : int64
 - transmission_type: string enum(MANUAL, AUTO)
 - driven_wheels    : string enum(rear wheel drive, front wheel drive, all wheel drive)
 - number_of_doors  : int64
 - vehicle_size     : string
 - vehicle_style    : string
 - highway_mpg      : int64
 - city_mpg         : int64
 - popularity       : int64
 - msrp             : int64 (manufacturer's suggested retail price, in USD $)

IMPORTANT NOTES:
 - ORs: Do not use || with the same {fieldName}. Instead, use an array of values.
    - Correct: manufacturer:[Honda,BMW] && transmission_type:MANUAL
    - Incorrect: (manufacturer:Honda || manufacturer:BMW) && transmission_type:MANUAL
 - Query Field: Include query only if other filter properties are insufficient to capture the user's intent.

### User-Supplied Query ###

{{query}}

### Output Instructions ###

Provide valid JSON with the correct filter format, including only non-null fields. Do not add extra text or explanations.
`
);
// Define a simple flow that prompts an LLM to generate menu suggestions.
const menuSuggestionFlow = defineFlow(
  {
    name: 'menuSuggestionFlow',
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

export async function callMenuSuggestionFlow(theme: string) {
  const flowResponse = await runFlow(menuSuggestionFlow, theme);
  console.log(flowResponse);
  return flowResponse;
}
