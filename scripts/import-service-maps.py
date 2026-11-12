#!/usr/bin/env python3
"""Import agency-authored KML exports linked by the official RideSCPT pages.
These locations and areas do not establish a fixed route or pickup entitlement.
"""
import hashlib
import json
import math
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

MAPS = {
    '5': '1amvoepvN9wrTVJNIEpfsTsJ55vE',
    '20': '1a6ZlV9I-rfQk3_Ys7fkZae-pCnk',
    '23': '1mWHhjsJsxmXFOywg3YOlRzKN0uo',
}
DAYS = {
    'Conesville': 'Tuesday', 'Gilboa': 'Tuesday', 'Blenheim': 'Tuesday',
    'Fulton': 'Tuesday & Thursday', 'Sharon': 'Tuesday', 'Seward': 'Tuesday',
    'Carlisle': 'Tuesday', 'Jefferson': 'Thursday', 'Summit': 'Thursday',
    'Richmondville': 'Thursday',
}
NS = {'k': 'http://www.opengis.net/kml/2.2'}

def coordinates(value):
    points = []
    for entry in value.split():
        lon, lat = map(float, entry.split(',')[:2])
        if not (math.isfinite(lon) and math.isfinite(lat) and -75.05 <= lon <= -73.65 and 42.25 <= lat <= 42.95):
            raise ValueError('Point outside SCPT service region')
        points.append([round(lon, 6), round(lat, 6)])
    if not points or len(points) > 10000:
        raise ValueError('Invalid geometry size')
    return points


def parse(route, raw):
    root = ET.fromstring(raw)
    features = []
    for placemark in root.findall('.//k:Placemark', NS):
        name = ' '.join(placemark.findtext('k:name', default='', namespaces=NS).split())
        if route == '5':
            if name not in DAYS:  # Exclude decorative areas and duplicate county/Sharon outlines.
                continue
            polygon = placemark.find('.//k:Polygon', NS)
            if polygon is None:
                raise ValueError('Expected service-area polygon')
            rings = [coordinates(r.text or '') for r in polygon.findall('.//k:LinearRing/k:coordinates', NS)]
            if not rings or any(len(r) < 4 or r[0] != r[-1] for r in rings):
                raise ValueError('Unclosed service area')
            geometry = {'type': 'Polygon', 'coordinates': rings}
            props = {'route': route, 'name': name, 'kind': 'reservation-area', 'days': DAYS[name]}
        else:
            point = placemark.findtext('.//k:Point/k:coordinates', default='', namespaces=NS)
            if not point:
                continue
            points = coordinates(point)
            if len(points) != 1:
                raise ValueError('Expected a single point')
            name = re.sub(r'^(?:Stop ID\s*-?\s*)?\d+\s*-\s*', '', name).strip()
            geometry = {'type': 'Point', 'coordinates': points[0]}
            props = {'route': route, 'name': name, 'kind': 'agency-map-location'}
        props['source'] = 'https://ridescpt.com/index.php/routes/route-' + route
        features.append({'type': 'Feature', 'geometry': geometry, 'properties': props})
    expected = {'5': 10, '20': 5, '23': 7}[route]
    if len(features) != expected:
        raise ValueError(f'Unexpected feature count for Route {route}; review upstream map before accepting')
    return features


def main():
    result = {'type': 'FeatureCollection', 'meta': {'reviewed': datetime.now(ZoneInfo('America/New_York')).date().isoformat(), 'sources': []}, 'features': []}
    for route, mid in MAPS.items():
        url = f'https://www.google.com/maps/d/kml?mid={mid}&forcekml=1'
        request = urllib.request.Request(url, headers={'User-Agent': 'CobyTransit source importer (https://github.com/Sam7730/cobytransit)'})
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read(5_000_001)
        if len(raw) > 5_000_000:
            raise ValueError('Oversized source')
        result['features'].extend(parse(route, raw))
        result['meta']['sources'].append({'route': route, 'url': url, 'sha256': hashlib.sha256(raw).hexdigest()})
    Path('web/assets/service-overlays.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(f"Imported {len(result['features'])} agency map features; no paths or timetable calls inferred.")

if __name__ == '__main__':
    main()
