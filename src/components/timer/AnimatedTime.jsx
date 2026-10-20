// AnimatedTime — countdown digits that glide in on every change.
// The position is keyed by index; the digit itself is keyed by its character,
// so React remounts only the digits that changed and the CSS "digit-in"
// animation (fade + slide up + blur glide) replays for those. The colon is
// static with a gentle pulse. Screen readers get the plain string via the
// parent's aria-label, so the animated spans are aria-hidden.

import React from 'react';

function TickDigit({ char }) {
  return (
    <span className="tdigit">
      <span className="tdigit-inner" key={char}>{char}</span>
    </span>
  );
}

export default function AnimatedTime({ value }) {
  return (
    <span className="animated-time" aria-hidden="true">
      {value.split('').map((ch, i) => (
        ch === ':'
          ? <span className="tdigit colon" key="colon">:</span>
          : <TickDigit char={ch} key={i} />
      ))}
    </span>
  );
}
