export type MoveDirection = 'L' | 'R' | 'N'; // Left, Right, No Move

export interface TransitionRule {
  currentState: string;
  readSymbol: string;
  writeSymbol: string;
  moveDirection: MoveDirection;
  nextState: string;
}

export type Tape = Record<number, string>;

export interface MachineState {
  tape: Tape;
  headPosition: number;
  currentState: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'HALTED' | 'ERROR';
  stepCount: number;
  history: { tape: Tape; headPosition: number; currentState: string }[];
}

export interface Preset {
  name: string;
  description: string;
  initialTape: string;
  initialState: string;
  rules: TransitionRule[];
}
