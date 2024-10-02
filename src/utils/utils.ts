export const USD_Formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const TRANSMISSION_TYPE = {
  MANUAL: 'Manual',
  AUTOMATIC: 'Automatic',
  AUTOMATED_MANUAL: 'Automated manual',
  DIRECT_DRIVE: 'Direct drive',
  UNKNOWN: 'Unknown',
};

export const EXAMPLE_SEARCH_TERMS = [
  'A honda or BMW with at least 200hp, rear wheel drive, from 20K to 50K, must be newer than 2014',
  'At least 200hp, must be of American car brands',
  'Newest sedans, V8, above 300hp, best gas mileage',
  'Show me the most powerful car you have',
  'Give me the latest cars',
  'Diesel SUV, > 200hp',
  "I don't know how to drive a manual",
  'Electric cars under 30K',
  'High performance Italian cars, above 700hp',
  'Luxury car without premium fuel',
  "Luxury hybrid car without premium fuel that's not an audi or a cadillac",
  'Hybrid cars with at least a city mileage of 25 and highway mileage of 40',
];

export const TYPESENSE_PER_PAGE = 12;

export function booleanToYesNo(bool: boolean | null | undefined) {
  return bool ? 'Yes' : 'No';
}
