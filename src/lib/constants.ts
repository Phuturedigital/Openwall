/**
 * Canonical list of South African cities used across filters, profile, and post forms.
 * All components must import from here — do NOT define local city arrays.
 */
export const SA_CITIES = [
  'Benoni',
  'Bloemfontein',
  'Boksburg',
  'Cape Town',
  'Centurion',
  'Durban',
  'East London',
  'George',
  'Germiston',
  'Johannesburg',
  'Kimberley',
  'Knysna',
  'Midrand',
  'Mossel Bay',
  'Nelspruit',
  'Paarl',
  'Pietermaritzburg',
  'Polokwane',
  'Port Elizabeth',
  'Pretoria',
  'Richards Bay',
  'Roodepoort',
  'Rustenburg',
  'Sandton',
  'Soweto',
  'Stellenbosch',
  'Tzaneen',
  'Upington',
  'Witbank',
] as const;

export type SaCity = (typeof SA_CITIES)[number];
