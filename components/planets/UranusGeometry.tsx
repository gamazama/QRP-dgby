import React from 'react';
import uranusSvg from '../../planets/uranus.svg?raw';

export const UranusGeometry = () => (
  <g dangerouslySetInnerHTML={{ __html: uranusSvg }} />
);
