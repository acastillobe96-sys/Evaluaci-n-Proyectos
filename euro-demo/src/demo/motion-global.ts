// En la demo Motion llega como global desde jsdelivr (motion@11.11.13, build UMD).
import type * as M from 'motion';
const Motion = (window as unknown as { Motion: typeof M }).Motion;
export const animate = Motion.animate;
export const inView = Motion.inView;
export const scroll = Motion.scroll;
export const stagger = Motion.stagger;
