// En la demo Leaflet llega como global desde cdnjs (el visor solo admite scripts de CDNs conocidos).
import type * as Leaflet from 'leaflet';
const L = (window as unknown as { L: typeof Leaflet }).L;
export default L;
