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
  },
  {
    name: 'Unary Addition',
    description: 'Adds two unary numbers separated by "+". Example: 11+11 -> 1111',
    initialTape: '11+111',
    initialState: 'start',
    rules: [
      // Strategy: Change '+' to '1', then remove one '1' from the end to balance the count.
      { currentState: 'start', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'start' },
      { currentState: 'start', readSymbol: '+', writeSymbol: '1', moveDirection: 'R', nextState: 'go_end' },
      
      { currentState: 'go_end', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'go_end' },
      { currentState: 'go_end', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'remove_one' },
      
      { currentState: 'remove_one', readSymbol: '1', writeSymbol: '_', moveDirection: 'N', nextState: 'done' },
    ]
  },
  {
    name: 'Unary Subtraction',
    description: 'Subtracts second number from first. Example: 111-11 -> 1',
    initialTape: '111-11',
    initialState: 'start',
    rules: [
      // Strategy: Ping pong between right side (subtractor) and left side (minuend), crossing out pairs.
      
      // 1. Move Right to find the operator or verify we are done
      { currentState: 'start', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'start' },
      { currentState: 'start', readSymbol: '-', writeSymbol: '-', moveDirection: 'R', nextState: 'find_b' },
      { currentState: 'start', readSymbol: '_', writeSymbol: '_', moveDirection: 'N', nextState: 'done' }, // If empty

      // 2. In section B (right side), find the end
      { currentState: 'find_b', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'find_b' },
      { currentState: 'find_b', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'erase_b' },
      { currentState: 'find_b', readSymbol: 'X', writeSymbol: 'X', moveDirection: 'L', nextState: 'erase_b' },

      // 3. Erase one '1' from B
      { currentState: 'erase_b', readSymbol: '1', writeSymbol: '_', moveDirection: 'L', nextState: 'find_a_tail' },
      { currentState: 'erase_b', readSymbol: '-', writeSymbol: '_', moveDirection: 'N', nextState: 'done' }, // B is empty, remove minus and we are DONE.

      // 4. Go back left to find tail of A
      { currentState: 'find_a_tail', readSymbol: '1', writeSymbol: '1', moveDirection: 'L', nextState: 'find_a_tail' },
      { currentState: 'find_a_tail', readSymbol: '-', writeSymbol: '-', moveDirection: 'L', nextState: 'erase_a' },
      { currentState: 'find_a_tail', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'find_a_tail' }, // Skipping gaps

      // 5. Erase one '1' from A
      { currentState: 'erase_a', readSymbol: '1', writeSymbol: '_', moveDirection: 'R', nextState: 'reset_start' }, // Erased match, restart
      { currentState: 'erase_a', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'erase_a' }, // Skip gaps
      
      // 6. Reset to start scanning again
      { currentState: 'reset_start', readSymbol: '_', writeSymbol: '_', moveDirection: 'R', nextState: 'reset_start' },
      { currentState: 'reset_start', readSymbol: '-', writeSymbol: '-', moveDirection: 'R', nextState: 'find_b' },
      { currentState: 'reset_start', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'reset_start' },
    ]
  }
];