"""Geocodifica direcciones con Nominatim (OSM), 1 req/s. Salida: JSON slug -> {lat, lng, fuente}."""
import json, sys, time, urllib.parse, urllib.request
addrs = json.loads(open(sys.argv[1], encoding='utf-8').read())
out = {}
for slug, q in addrs.items():
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': q, 'format': 'json', 'limit': 1, 'countrycodes': 'cl'})
    req = urllib.request.Request(url, headers={'User-Agent': 'proyectos-demo-geocoder/1.0'})
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=30).read())
    except Exception as e:
        r = []; print('error', slug, e)
    out[slug] = {'lat': float(r[0]['lat']), 'lng': float(r[0]['lon']), 'match': r[0]['display_name']} if r else None
    print(slug, '->', out[slug]['match'][:90] if out[slug] else 'SIN RESULTADO')
    time.sleep(1.2)
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
