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

### Typesense syntax for filterBy ###

A field can be matched against one or more values, the syntax is {fieldName} follow by a match operator : and a string value or an array of string values each encapsulated by the backtick \` character. By specifying an array of values we can filter by {value1} OR {value2} OR {value3}, etc... of the same {fieldName}.
Examples:
- model: [\`124 spider\`]
- manufacturer: [\`Mercedes benz\`, \`Nissan\`] filters items that have manufacturer of Mercedes benz OR Nissan.

Filter documents with numeric values between a min and max value, using the range operator [min..max] or using simple comparison operators >, >= <, <=, =. Example: \`year:[2000..2020]\`, \`num_employees:<40\`, num_employees:[10..100,40] (Filter docs where value is between 10 to 100 or exactly 40).

Multiple Conditions:
You can separate multiple conditions with the && operator.
Examples:
- num_employees:>100 && country: [USA, UK]
- categories:=Shoes && categories:=Outdoor

Only use the || operator to do ORs if the fields are different (eg: manufacturer is "Ferrari" OR vehicle_style is "Convertible").
Examples:
- color: blue || category: shoe
- (color: blue || category: shoe) && in_stock: true

Negation:
Not equals / negation is supported via the :!= operator, e.g. author:!=\`JK Rowling\`. You can also negate multiple values: author:!=[\`JK Rowling\`, \`Gilbert Patten\`]

Numeric Filtering:
Filter documents with numeric values between a min and max value, using the range operator [min..max] or using simple comparison operators >, >= <, <=, =.

You can enable "range_index": true on the numerical field schema for fast range queries (will incur additional memory usage for the index though).

Examples:
-num_employees:[10..100]
-num_employees:<40
-num_employees:[10..100,40] (Filter docs where value is between 10 to 100 or exactly 40).

Available properties for filtering and their corresponding data type:
 - manufacturer     :  string (case-insensitive name of the car manufacturer, e.g: Honda, Nissan, Ferrari, BMW, Mazda,...)
 - model            :  string
 - year             :  int64
 - engine_fuel_type :  string
 - engine_hp        :  float64
 - engine_cylinders :  int64
 - transmission_type:  string enum(MANUAL, AUTO)
 - driven_wheels    :  string enum(rear wheel drive, front wheel drive, all wheel drive)
 - number_of_doors  :  int64
 - vehicle_size     :  string
 - vehicle_style    :  string
 - highway_mpg      :  int64
 - city_mpg         :  int64
 - popularity       :  int64
 - msrp             :  int64 (manufacturer's suggested retail price, in USD $)

IMPORTANT NOTES:
  - To do a match for numeric field, the operator must be ":="
  - You MUST NOT use the || operator with the same field name, instead, use an array of values, example: "manufacturer:=[\`Honda\`,\`BMW\`]"
  - Only include "query" if the other filter properties are inadequate.

### User-Supplied Query ###

{{query}}

### Output Instructions ###

Just supply the JSON without additional text or explanation. All fields are optional. Include only fields that are set to a non-null value.
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
