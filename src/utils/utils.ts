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
