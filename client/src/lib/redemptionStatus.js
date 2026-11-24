export function redemptionStatusLabel(status) {
  const key = String(status || 'AWAITING_FULFILMENT');
  switch (key) {
    case 'FULFILLED':
      return 'Fulfilled from store stock';
    case 'SHIP_TO_STORE':
      return 'No stock — order to store';
    case 'AWAITING_FULFILMENT':
      return 'Awaiting fulfilment';
    default:
      return key.replace(/_/g, ' ');
  }
}
