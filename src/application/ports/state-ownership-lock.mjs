export class StateOwnershipLockPort {
  async acquire() { throw new Error("StateOwnershipLockPort.acquire is not implemented."); }
  async release() { throw new Error("StateOwnershipLockPort.release is not implemented."); }
  isOwned() { return false; }
}
