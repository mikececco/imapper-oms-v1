/**
 * Application constants
 */

// Order status options
export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// Order package options
export const ORDER_PACK_OPTIONS = [
  { value: 'R3', label: 'R3' },
  { value: 'envoyé', label: 'Envoyé' },
  { value: 'R3-P-T250', label: 'R3-P-T250' },
  { value: 'R3-P-T165', label: 'R3-P-T165' },
  { value: 'R3-T230', label: 'R3-T230' },
  { value: 'R3- P- T230', label: 'R3- P- T230' },
  { value: 'R3-T165', label: 'R3-T165' },
  { value: 'R3 SLOW P T165', label: 'R3 SLOW P T165' },
  { value: 'R3ONLY', label: 'R3 ONLY' },
  { value: 'R3-P-T230', label: 'R3-P-T230' },
  { value: 'R3 ONLY', label: 'R3 ONLY' },
  { value: 'R3+P+T230', label: 'R3+P+T230' },
  { value: 'T165', label: 'T165' },
  { value: 'SD', label: 'SD' },
  { value: 'T250', label: 'T250' },
  { value: 'R2ONLY', label: 'R2 ONLY' },
  { value: 'R3-P-T180', label: 'R3-P-T180' },
  { value: 'T230', label: 'T230' },
  { value: 'R3-P', label: 'R3-P' },
  { value: 'R3 BLE', label: 'R3 BLE' },
  { value: 'R3 BLE-P', label: 'R3 BLE-P' },
  { value: 'R3BLE-P-T165', label: 'R3BLE-P-T165' },
  { value: 'R3BLE-P-T180', label: 'R3BLE-P-T180' },
  { value: 'R3BLE-P-T230', label: 'R3BLE-P-T230' },
  { value: 'usb reader - SD', label: 'USB Reader - SD' },
  { value: 'R-P-T250', label: 'R-P-T250' },
  { value: 'R3BE-P-T230', label: 'R3BE-P-T230' },
  { value: 'R2', label: 'R2' },
  { value: 'chargeur pour ancien model', label: 'Chargeur pour ancien model' },
  { value: 'R3BE-T230', label: 'R3BE-T230' }
];

// Shipping options
export const SHIPPING_OPTIONS = {
  STANDARD: 'standard',
  EXPRESS: 'express',
  OVERNIGHT: 'overnight'
};

// Payment status options
export const PAYMENT_STATUSES = {
  PAID: true,
  UNPAID: false
};

// Shipping status options
export const SHIPPING_STATUSES = {
  READY: true,
  NOT_READY: false
};

// Date format options
export const DATE_FORMAT_OPTIONS = {
  STANDARD: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  SHORT: {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  },
  LONG: {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }
};

// Order pack options
export const ORDER_PACK_OPTIONS_OLD = [
  'R3',
  'envoyé',
  'R3-P-T250',
  'R3-P-T165',
  'R3-T230',
  'R3- P- T230',
  'R3-T165',
  'R3 SLOW P T165',
  'R3ONLY',
  'R3-P-T230',
  'R3 ONLY',
  'R3+P+T230',
  'T165',
  'SD',
  'T250',
  'R2ONLY',
  'R3-P-T180',
  'T230',
  'R3-P',
  'R3 BLE',
  'R3 BLE-P',
  'R3BLE-P-T165',
  'R3BLE-P-T180',
  'R3BLE-P-T230',
  'usb reader - SD',
  'R-P-T250',
  'R3BE-P-T230',
  'R2',
  'chargeur pour ancien model',
  'R3BE-T230'
]; 