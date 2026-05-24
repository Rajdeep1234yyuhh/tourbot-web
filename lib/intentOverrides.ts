interface OverrideRule {
  pattern: RegExp
  intent: string
  prefix: string
}

export const INTENT_OVERRIDES: OverrideRule[] = [
  {
    pattern: new RegExp(
      [
        'budget\\s+stay',
        'budget\\s+hotel',
        'budget\\s+option',
        'budget\\s+accommodation',
        'low\\s+budget',
        'cheap\\s+stay',
        'cheap\\s+hotel',
        'affordable\\s+stay',
        'kam\\s+daam.*stay',
        'kam\\s+daam.*hotel',
        'sosta.*stay',
        'sosta.*hotel',
        'sosta.*thakibo',
        'thakibor.*sosta',
      ].join('|'),
      'i'
    ),
    intent: 'hotel_price',
    prefix: 'Low budget and affordable accommodation options: ',
  },
  {
    pattern: new RegExp(
      [
        'best\\s+time\\s+ki',
        'best\\s+time\\s+kun',
        'kune\\s+samay\\s+jab',
        'kune\\s+mah\\s+t\\s+jab',
        'kobe\\s+jab',
        'jabor\\s+best\\s+time',
        'best\\s+season',
        'kune\\s+season',
        'kune\\s+month',
        'kun\\s+mah\\s+jab',
        'kune\\s+time\\s+jab',
        'jabor\\s+sothik\\s+time',
        'visit\\s+korar\\s+best\\s+time',
        'jabole\\s+kune\\s+samay',
      ].join('|'),
      'i'
    ),
    intent: 'best_time_visit',
    prefix: 'Best month, season, and weather to visit: ',
  },
  {
    pattern: new RegExp(
      [
        'jab[oa]l?[oi]?\\s+kiman\\s+time',
        'kiman\\s+time\\s+lag[ie]',
        'kiman\\s+ghanta\\s+lag',
        'travel\\s+time\\s+kiman',
        'distance\\s+kiman',
        'kiman\\s+km\\b',
        'kiman\\s+kilometer',
        'reach\\s+koribole\\s+kiman',
        'koloi\\s+jabar\\s+total\\s+time',
      ].join('|'),
      'i'
    ),
    intent: 'reach_distance_time',
    prefix: 'Travel distance and time to reach: ',
  },
  {
    pattern: new RegExp(
      [
        'mind\\s+[tr]\\s+ki\\s+ki\\s+rakhibo',
        'mind\\s+[tr]\\s+rakhibo\\s+lag',
        'important\\s+tips',
        'ki\\s+ki\\s+dhyan\\s+dibo',
        'jabar\\s+age\\s+ki\\s+ki',
        'visit\\s+r\\s+age\\s+ki',
        'ki\\s+ki\\s+important\\s+bhabibo',
      ].join('|'),
      'i'
    ),
    intent: 'tips_advice',
    prefix: 'Travel tips and advice: ',
  },
  {
    pattern: new RegExp(
      [
        'ki\\s+ki\\s+nibo\\s+lag',
        'ki\\s+ki\\s+carry',
        'ki\\s+nibo\\s+jabole',
        'bag\\s+[tr]\\s+ki\\s+ki',
        'pack\\s+korib',
        'sathot\\s+ki\\s+ki',
        'sathe\\s+ki\\s+ki\\s+nibo',
      ].join('|'),
      'i'
    ),
    intent: 'precaution_carry_things',
    prefix: 'What to carry and pack: ',
  },
  {
    pattern: new RegExp(
      [
        'crowd\\s+kom',
        'off[-\\s]season',
        'peak\\s+season\\s+avoid',
        'tourist\\s+kom\\s+thak',
        'bhir\\s+kom',
        'less\\s+crowd',
        'crowd\\s+avoid',
      ].join('|'),
      'i'
    ),
    intent: 'best_time_visit_less_crowd',
    prefix: 'Best time to visit to avoid crowds: ',
  },
  {
    pattern: new RegExp(
      [
        'kiman\\s+din\\s+thak',
        'kiman\\s+raat\\s+thak',
        'kiman\\s+time\\s+thak',
        'stay\\s+koribole\\s+kiman\\s+din',
        'kiman\\s+din\\s+spend',
      ].join('|'),
      'i'
    ),
    intent: 'duration_stay_general',
    prefix: 'How many days to stay: ',
  },
]

export interface OverrideResult {
  forwardQuery: string
  overriddenIntent: string | null
  fired: boolean
}

export function applyOverrides(query: string): OverrideResult {
  for (const rule of INTENT_OVERRIDES) {
    if (rule.pattern.test(query)) {
      return {
        forwardQuery: rule.prefix + query,
        overriddenIntent: rule.intent,
        fired: true,
      }
    }
  }
  return {
    forwardQuery: query,
    overriddenIntent: null,
    fired: false,
  }
}
