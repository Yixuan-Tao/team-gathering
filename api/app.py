from flask import Flask, request, jsonify
import os
import requests
from functools import wraps

app = Flask(__name__)

AMAP_KEY = os.environ.get('AMAP_KEY', 'e6d2ec2bcd8588ad54923f72d837254f')
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://nfslocwxeizcautcgljz.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mc2xvY3d4ZWl6Y2F1dGNnbGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzI1NzUsImV4cCI6MjA4NDc0ODU3NX0.ijTZI0Gv8I5MjKUgrR23_pEYdlwrjc4VRvOVJ1ERH8I')


def cors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        if request.method == 'OPTIONS':
            response.status_code = 204
            return response
        return f(*args, **kwargs)
    return decorated_function


@app.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'Team Gathering API'})


@app.route('/api/search-nearby', methods=['POST', 'OPTIONS'])
@cors
def search_nearby():
    if request.method == 'OPTIONS':
        return jsonify({}), 204

    data = request.get_json()
    lat = data.get('lat')
    lng = data.get('lng')
    types = data.get('types', '050000')
    keyword = data.get('keyword', '')

    if not lat or not lng:
        return jsonify({'error': '缺少位置参数'}), 400

    url = 'https://restapi.amap.com/v3/place/nearby'
    params = {
        'key': AMAP_KEY,
        'location': f'{lng},{lat}',
        'radius': 5000,
        'types': types,
        'keywords': keyword,
        'page_size': 30,
        'extensions': 'base',
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data.get('status') != '1':
            return jsonify({'error': data.get('info', '搜索失败'), 'details': params}), 400

        pois = data.get('pois', [])
        results = []
        for poi in pois:
            loc = poi.get('location', '')
            if loc:
                parts = loc.split(',')
                lat_val = float(parts[1]) if len(parts) > 1 else 0
                lng_val = float(parts[0]) if len(parts) > 0 else 0
            else:
                lat_val = 0
                lng_val = 0

            results.append({
                'id': poi.get('id'),
                'name': poi.get('name'),
                'address': poi.get('address'),
                'location': {
                    'lat': lat_val,
                    'lng': lng_val,
                },
                'type': poi.get('type'),
                'distance': poi.get('distance'),
            })

        return jsonify({'pois': results})
    except Exception as e:
        return jsonify({'error': f'请求失败: {str(e)}'}), 500


@app.route('/api/direction', methods=['POST', 'OPTIONS'])
@cors
def direction():
    if request.method == 'OPTIONS':
        return jsonify({}), 204

    data = request.get_json()
    origin = data.get('origin', [])
    destination = data.get('destination', [])
    mode = data.get('mode', 'driving')

    if not origin or not destination:
        return jsonify({'error': '缺少位置参数'}), 400

    mode_map = {
        'driving': 'driving',
        'transit': 'transit',
        'walking': 'walking',
    }

    api_mode = mode_map.get(mode, 'driving')
    url = f'https://restapi.amap.com/v3/direction/{api_mode}/from/{origin[0]},{origin[1]}/to/{destination[0]},{destination[1]}'

    params = {
        'key': AMAP_KEY,
        'extensions': 'base',
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data.get('status') != '1':
            return jsonify({'error': data.get('info', '路线规划失败')}), 400

        if api_mode == 'driving':
            route = data.get('route', {})
            routes = route.get('routes', [])
            if routes:
                first_route = routes[0]
                return jsonify({
                    'time': int(first_route.get('time', 0)),
                    'distance': int(first_route.get('distance', 0)),
                })
        elif api_mode == 'transit':
            route = data.get('route', {})
            transits = route.get('transits', [])
            if transits:
                first_transit = transits[0]
                return jsonify({
                    'time': int(first_transit.get('duration', 0)),
                    'distance': int(first_transit.get('distance', 0)),
                })
        elif api_mode == 'walking':
            route = data.get('route', {})
            paths = route.get('paths', [])
            if paths:
                first_path = paths[0]
                return jsonify({
                    'time': int(first_path.get('time', 0)),
                    'distance': int(first_path.get('distance', 0)),
                })

        return jsonify({'error': '未找到路线'})
    except Exception as e:
        return jsonify({'error': f'请求失败: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
