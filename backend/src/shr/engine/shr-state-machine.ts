export enum ShrState {
  CREATED = 'CREATED',
  ASSEMBLING = 'ASSEMBLING',
  VALIDATED = 'VALIDATED', // Schema verified
  COMPLIANT = 'COMPLIANT', // Policy & DHA rules verified
  STORED_IN_REPO = 'STORED_IN_REPO',
  QUEUED = 'QUEUED',
  PUBLISHING = 'PUBLISHING',
  ACKNOWLEDGED = 'ACKNOWLEDGED', // DHA 2xx synchronous
  ACCEPTED = 'ACCEPTED', // DHA 202 async callback pending
  AWAITING_CALLBACK = 'AWAITING_CALLBACK',
  CALLBACK_RECEIVED = 'CALLBACK_RECEIVED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',

  // Failure States
  FAILED_VALIDATION = 'FAILED_VALIDATION',
  FAILED_COMPLIANCE = 'FAILED_COMPLIANCE',
  REJECTED = 'REJECTED', // DHA 4xx
  RETRY_PENDING = 'RETRY_PENDING', // DHA 5xx or Timeout
  DEAD_LETTER = 'DEAD_LETTER', // Max retries exceeded
  CANCELLED = 'CANCELLED',
  DUPLICATE = 'DUPLICATE',
  SUPERSEDED = 'SUPERSEDED'
}

export class ShrStateMachine {
  private currentState: ShrState;

  constructor(initialState: ShrState = ShrState.CREATED) {
    this.currentState = initialState;
  }

  getState(): ShrState {
    return this.currentState;
  }

  transitionTo(newState: ShrState): boolean {
    const validTransitions: Record<ShrState, ShrState[]> = {
      [ShrState.CREATED]: [ShrState.ASSEMBLING, ShrState.CANCELLED],
      [ShrState.ASSEMBLING]: [ShrState.VALIDATED, ShrState.FAILED_VALIDATION, ShrState.CANCELLED],
      [ShrState.VALIDATED]: [ShrState.COMPLIANT, ShrState.FAILED_COMPLIANCE, ShrState.CANCELLED],
      [ShrState.COMPLIANT]: [ShrState.STORED_IN_REPO, ShrState.DUPLICATE, ShrState.CANCELLED],
      [ShrState.STORED_IN_REPO]: [ShrState.QUEUED, ShrState.SUPERSEDED, ShrState.CANCELLED],
      [ShrState.QUEUED]: [ShrState.PUBLISHING, ShrState.CANCELLED],
      [ShrState.PUBLISHING]: [ShrState.ACKNOWLEDGED, ShrState.ACCEPTED, ShrState.REJECTED, ShrState.RETRY_PENDING],
      [ShrState.RETRY_PENDING]: [ShrState.QUEUED, ShrState.DEAD_LETTER, ShrState.CANCELLED],
      [ShrState.ACKNOWLEDGED]: [ShrState.COMPLETED],
      [ShrState.ACCEPTED]: [ShrState.AWAITING_CALLBACK],
      [ShrState.AWAITING_CALLBACK]: [ShrState.CALLBACK_RECEIVED, ShrState.RETRY_PENDING, ShrState.DEAD_LETTER],
      [ShrState.CALLBACK_RECEIVED]: [ShrState.COMPLETED, ShrState.REJECTED],
      [ShrState.COMPLETED]: [ShrState.ARCHIVED],
      
      // Terminal states have no valid transitions out, except perhaps manual retry (Dead letter to Queued)
      [ShrState.ARCHIVED]: [],
      [ShrState.FAILED_VALIDATION]: [],
      [ShrState.FAILED_COMPLIANCE]: [],
      [ShrState.REJECTED]: [],
      [ShrState.DEAD_LETTER]: [ShrState.QUEUED], // Manual admin intervention
      [ShrState.CANCELLED]: [],
      [ShrState.DUPLICATE]: [],
      [ShrState.SUPERSEDED]: [],
    };

    const allowed = validTransitions[this.currentState] || [];
    
    if (allowed.includes(newState)) {
      this.currentState = newState;
      return true;
    }
    
    throw new Error(`Invalid state transition from ${this.currentState} to ${newState}`);
  }
}
