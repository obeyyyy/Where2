// Helper function to get airline logo URL by carrier code
export function getAirlineLogoUrl(carrierCode: string) {
  if (!carrierCode) return '';
  return `https://content.airhex.com/content/logos/airlines_${carrierCode}_100_50_r.png`;
}
