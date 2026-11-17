"""Precios por radio progresivo desde la base Inciti.
Uso: python3 precios.py LAT LON salida.json
Criterio: filtro venta en blanco/verde (futura) y entrega inmediata (referencia);
radio 1 km ampliando de a 1 km hasta >=5 proyectos únicos (tope 5 km)."""
import pandas as pd, numpy as np, json, sys
LAT, LON = float(sys.argv[1]), float(sys.argv[2])
df = pd.read_excel('mcdo.xlsx')
df['Programa'] = df['Programa'].str.upper().str.strip()
df['Estado'] = df['Estado'].str.lower().str.strip()
df = df.dropna(subset=['UF/m2', 'Precio UF', 'Latitud', 'Longitud'])
df = df[df['UF/m2'] > 0]
la1, lo1 = np.radians(LAT), np.radians(LON); la2, lo2 = np.radians(df.Latitud), np.radians(df.Longitud)
a = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2
df['km'] = 2 * 6371.0 * np.arcsin(np.sqrt(a))
out = {}
for tipo, estados in [('futura', ['venta en blanco', 'venta en verde']), ('inmediata', ['entrega inmediata'])]:
    d = df[df.Estado.isin(estados)]
    for prog in ['ESTUDIO', '1D1B', '2D1B', '2D2B', '3D2B', '3D3B']:
        dp = d[d.Programa == prog]
        for r in range(1, 6):
            s = dp[dp.km <= r]; n = s.Proyecto.nunique()
            if n >= 5: break
        out[f'{tipo}|{prog}'] = dict(radio=r, n=int(n),
            m2=round(float(s['M2 Útil'].mean()), 2) if n else None,
            precio=round(float(s['Precio UF'].mean()), 0) if n else None,
            ufm2=round(float(s['UF/m2'].mean()), 1) if n else None,
            proyectos=sorted(s.Proyecto.unique().tolist()))
        v = out[f'{tipo}|{prog}']; print(tipo, prog, {k: v[k] for k in ['radio', 'n', 'm2', 'precio', 'ufm2']})
json.dump(out, open(sys.argv[3], 'w'), ensure_ascii=False, indent=1)
