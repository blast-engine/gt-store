const personRegistry = {
  lastPersonNumber: 15,
  persons: {
    'person_1': { name: 'mary', age: 12, country: 'CA' },
    'person_2': { name: 'john', age: 120, country: 'US' },
    'person_3': { name: 'mary', age: 22, country: 'CA' },
    'person_4': { name: 'david', age: 28, country: 'CA' },
    'person_5': { name: 'mary', age: 32, country: 'CA' },
    'person_6': { name: 'mary', age: 2, country: 'CA' },
    'person_7': { name: 'mary', age: 45, country: 'CA' },
    'person_8': { name: 'john', age: 89, country: 'CA' },
    'person_9': { name: 'john', age: 76, country: 'CA' },
    'person_10': { name: 'abdul', age: 48, country: 'CA' },
    'person_11': { name: 'abdul', age: 16, country: 'US' },
    'person_12': { name: 'david', age: 12, country: 'CA' },
    'person_13': { name: 'susan', age: 24, country: 'CA' },
    'person_14': { name: 'david', age: 46, country: 'US' },
    'person_15': { name: 'abdul', age: 14, country: 'CA' }
  }
}

const peopleIKnow = {
  'person_4': true,
  'person_5': true,
  'person_8': true,
  'person_12': true,
  'person_13': true,
  'person_15': true
}

export const mockData = { 
  personRegistry,
  peopleIKnow
}