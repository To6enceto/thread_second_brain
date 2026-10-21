/** Access transitions must settle before another read can invalidate their reply. */
export class ReaderRequests {
  private epoch = 0;
  private changingScope = false;
  invalidate(): void { this.epoch++; }
  current(ticket: number): boolean { return ticket === this.epoch; }
  beginRead(): number | null { return this.changingScope ? null : ++this.epoch; }
  beginScope(): number | null {
    if (this.changingScope) return null;
    this.changingScope = true;
    return ++this.epoch;
  }
  finishScope(ticket: number): boolean {
    this.changingScope = false;
    return this.current(ticket);
  }
}
