export type Show = {
  id: string;
  name: string;
  subtitle: string;
  genre: string;
  price: string;
  policy: 'Closed' | 'Open' | 'Detect';
  stake: string;
  saleOpen: boolean;
  image: string;
  color: string;
};

// Explicit UI fixtures. Replace through the show data layer when a deployed contract is configured.
export const DEMO_SHOWS: Show[] = [
  { id: '0', name: 'Neon Nights', subtitle: 'An electric night. An unforgettable feeling.', genre: 'ELECTRONIC / LIVE', price: '0.01', policy: 'Closed', stake: '0.002', saleOpen: true, image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=85', color: '#c4a0ff' },
  { id: '1', name: 'Midnight Symphony', subtitle: 'Lose yourself in the sound.', genre: 'INDIE / ALTERNATIVE', price: '0.008', policy: 'Open', stake: '0', saleOpen: true, image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=85', color: '#7ce4d0' },
  { id: '2', name: 'Starlight Sessions', subtitle: 'Under one sky. In perfect rhythm.', genre: 'POP / LIVE', price: '0.005', policy: 'Detect', stake: '0', saleOpen: false, image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1000&q=85', color: '#f7b993' },
];

export const POLICY_COPY = {
  Closed: '禁止转售：合约拒绝票据转移，原始买家可入场。',
  Open: '允许转移：未核销的票转移后，当前持有人仍可入场。',
  Detect: '允许转移，但当前持有人不是首次买家时将被拒绝入场。',
};
