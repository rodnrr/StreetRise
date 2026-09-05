// Metros StreetRise serves. Set `live: true` ONLY when a metro has real,
// publicly visible listings seeded on the map — otherwise it reads as
// "Coming soon". (Verify with the public resources query before flipping.)
//
// Shared so the home page's live-stats panel and the About page's coverage
// list can never disagree about which metros are live.
export const CITIES = [
  { name: 'Tampa Bay',    live: true },
  { name: 'Orlando',      live: true },
  { name: 'Miami',        live: true },
  { name: 'Jacksonville', live: false },
]
