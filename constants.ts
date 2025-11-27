import { Preset } from './types';

export const EMPTY_SYMBOL = '_';

export const PRESETS: Preset[] = [
  {
    name: 'Binary Increment',
    description: 'Adds 1 to a binary number (Big Endian). Example: 1011 -> 1100',
    initialTape: '1011',
    initialState: 'start',
    rules: [
      { currentState: 'start', readSymbol: '0', writeSymbol: '0', moveDirection: 'R', nextState: 'start' },
      { currentState: 'start', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'start' },
      { currentState: 'start', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'add' },
      { currentState: 'add', readSymbol: '0', writeSymbol: '1', moveDirection: 'L', nextState: 'done' },
      { currentState: 'add', readSymbol: '1', writeSymbol: '0', moveDirection: 'L', nextState: 'add' },
      { currentState: 'add', readSymbol: '_', writeSymbol: '1', moveDirection: 'R', nextState: 'done' },
    ]
  },
  {
    name: 'Palindrome Detector',
    description: 'Checks if a binary string is a palindrome. Clears tape if true, leaves 0 if false.',
    initialTape: '1001',
    initialState: 'start',
    rules: [
      // Read first char
      { currentState: 'start', readSymbol: '0', writeSymbol: '_', moveDirection: 'R', nextState: 'have0' },
      { currentState: 'start', readSymbol: '1', writeSymbol: '_', moveDirection: 'R', nextState: 'have1' },
      { currentState: 'start', readSymbol: '_', writeSymbol: 'Y', moveDirection: 'N', nextState: 'accept' }, // Empty is palindrome

      // Go to end matching 0
      { currentState: 'have0', readSymbol: '0', writeSymbol: '0', moveDirection: 'R', nextState: 'have0' },
      { currentState: 'have0', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'have0' },
      { currentState: 'have0', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'match0' },

      // Check match 0
      { currentState: 'match0', readSymbol: '0', writeSymbol: '_', moveDirection: 'L', nextState: 'back' },
      { currentState: 'match0', readSymbol: '1', writeSymbol: '1', moveDirection: 'N', nextState: 'reject' }, // Mismatch
      { currentState: 'match0', readSymbol: '_', writeSymbol: 'Y', moveDirection: 'N', nextState: 'accept' }, // Single char was palindrome

      // Go to end matching 1
      { currentState: 'have1', readSymbol: '0', writeSymbol: '0', moveDirection: 'R', nextState: 'have1' },
      { currentState: 'have1', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'have1' },
      { currentState: 'have1', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'match1' },

      // Check match 1
      { currentState: 'match1', readSymbol: '1', writeSymbol: '_', moveDirection: 'L', nextState: 'back' },
      { currentState: 'match1', readSymbol: '0', writeSymbol: '0', moveDirection: 'N', nextState: 'reject' }, // Mismatch
      { currentState: 'match1', readSymbol: '_', writeSymbol: 'Y', moveDirection: 'N', nextState: 'accept' },

      // Go back to start
      { currentState: 'back', readSymbol: '0', writeSymbol: '0', moveDirection: 'L', nextState: 'back' },
      { currentState: 'back', readSymbol: '1', writeSymbol: '1', moveDirection: 'L', nextState: 'back' },
      { currentState: 'back', readSymbol: '_', writeSymbol: '_', moveDirection: 'R', nextState: 'start' },
    ]
  },
  {
    name: 'Ping Pong',
    description: 'Moves back and forth between two 1s forever.',
    initialTape: '1_0_0_0_1',
    initialState: 'right',
    rules: [
      { currentState: 'right', readSymbol: '_', writeSymbol: '_', moveDirection: 'R', nextState: 'right' },
      { currentState: 'right', readSymbol: '0', writeSymbol: '0', moveDirection: 'R', nextState: 'right' },
      { currentState: 'right', readSymbol: '1', writeSymbol: '1', moveDirection: 'L', nextState: 'left' },
      { currentState: 'left', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'left' },
      { currentState: 'left', readSymbol: '0', writeSymbol: '0', moveDirection: 'L', nextState: 'left' },
      { currentState: 'left', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'right' },
    ]
  }
];