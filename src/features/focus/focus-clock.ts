/** Wall-clock countdown; pausing excludes time away from the session. */
export function createFocusClock(totalSeconds: number, now = Date.now) {
  let remaining = totalSeconds;
  let deadline = now() + remaining * 1000;
  let running = true;
  return {
    sample() {
      if (running) remaining = Math.max(0, Math.ceil((deadline - now()) / 1000));
      return remaining;
    },
    pause() {
      this.sample();
      running = false;
    },
    resume() {
      deadline = now() + remaining * 1000;
      running = true;
    },
  };
}
