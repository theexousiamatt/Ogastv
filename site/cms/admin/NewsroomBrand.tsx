import React from 'react';

export function NewsroomLogo() {
  return (
    <span className="newsroom-brand" aria-label="OgasTV Africa newsroom">
      <span className="newsroom-brand__monogram" aria-hidden="true">TV</span>
      <span>
        <span className="newsroom-brand__wordmark">OGAS<b>TV</b></span>
        <span className="newsroom-brand__caption">Africa · Newsroom</span>
      </span>
    </span>
  );
}

export function NewsroomIcon() {
  return (
    <span className="newsroom-brand newsroom-brand--icon" aria-label="OgasTV Africa">
      <span className="newsroom-brand__monogram">TV</span>
    </span>
  );
}
