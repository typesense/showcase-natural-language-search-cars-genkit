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
  'A honda or BMW with at least 200HP, rear wheel drive, from 20K to 50K, must be newer than 2014',
  'At least 200hp, must not be of European car brands',
  'Newest sedans, v6, above 300hp, best gas mileage',
];
