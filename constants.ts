import { Preset } from './types';

export const EMPTY_SYMBOL = '_';

export const PRESETS: Preset[] = [
  {
    name: 'Binary Increment',
    description: 'Adds 1 to a binary number (Big Endian). It moves to the rightmost bit, then handles carries moving left.',
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
    description: 'Checks if a binary string is a palindrome. It matches the first and last characters recursively, erasing them as it goes. Returns Y for yes, leaves 0 or garbage for no.',
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
    description: 'An infinite loop demonstration. The head bounces back and forth between two "1" boundaries, never halting.',
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
    description: 'Performs 3+2=5 in unary. Converts the "+" separator into a "1", then removes one "1" from the end to correct the count.',
    initialTape: '111+11',
    initialState: 'start',
    rules: [
      { currentState: 'start', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'start' },
      { currentState: 'start', readSymbol: '+', writeSymbol: '1', moveDirection: 'R', nextState: 'go_end' },
      
      { currentState: 'go_end', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'go_end' },
      { currentState: 'go_end', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'remove_one' },
      
      { currentState: 'remove_one', readSymbol: '1', writeSymbol: '_', moveDirection: 'N', nextState: 'done' },
    ]
  },
  {
    name: 'Unary Subtraction',
    description: 'Performs 3-2=1 in unary. Matches 1s from the right side (subtrahend) with 1s from the left side (minuend) until the right side is empty.',
    initialTape: '111-11',
    initialState: 'start',
    rules: [
      // 1. Move Right to find the operator or verify we are done
      { currentState: 'start', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'start' },
      { currentState: 'start', readSymbol: '-', writeSymbol: '-', moveDirection: 'R', nextState: 'find_b' },
      { currentState: 'start', readSymbol: '_', writeSymbol: '_', moveDirection: 'N', nextState: 'done' },

      // 2. In section B (right side), find the end
      { currentState: 'find_b', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'find_b' },
      { currentState: 'find_b', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'erase_b' },

      // 3. Erase one '1' from B
      { currentState: 'erase_b', readSymbol: '1', writeSymbol: '_', moveDirection: 'L', nextState: 'find_a_tail' },
      { currentState: 'erase_b', readSymbol: '-', writeSymbol: '_', moveDirection: 'N', nextState: 'done' }, // B is empty, remove minus -> DONE

      // 4. Go back left to find tail of A
      { currentState: 'find_a_tail', readSymbol: '1', writeSymbol: '1', moveDirection: 'L', nextState: 'find_a_tail' },
      { currentState: 'find_a_tail', readSymbol: '-', writeSymbol: '-', moveDirection: 'L', nextState: 'erase_a' },
      { currentState: 'find_a_tail', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'find_a_tail' }, 

      // 5. Erase one '1' from A
      { currentState: 'erase_a', readSymbol: '1', writeSymbol: '_', moveDirection: 'R', nextState: 'reset_start' }, 
      { currentState: 'erase_a', readSymbol: '_', writeSymbol: '_', moveDirection: 'L', nextState: 'erase_a' },
      
      // 6. Reset to start scanning again
      { currentState: 'reset_start', readSymbol: '_', writeSymbol: '_', moveDirection: 'R', nextState: 'reset_start' },
      { currentState: 'reset_start', readSymbol: '-', writeSymbol: '-', moveDirection: 'R', nextState: 'find_b' },
      { currentState: 'reset_start', readSymbol: '1', writeSymbol: '1', moveDirection: 'R', nextState: 'reset_start' },
    ]
  }
];