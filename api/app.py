from flask import Flask, request, jsonify
import os
import requests
from functools import wraps

app = Flask(__name__)

AMAP_KEY = os.environ.get('AMAP_KEY')
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

if not AMAP_KEY or not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError('Missing required environment variables')


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
        'page_index': 1,
        'extensions': 'base',
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data.get('status') != '1':
            return jsonify({'error': data.get('info', '搜索失败')}), 400

        pois = data.get('pois', [])
        results = []
        for poi in pois:
            results.append({
                'id': poi.get('id'),
                'name': poi.get('name'),
                'address': poi.get('address'),
                'location': {
                    'lat': float(poi.get('location', '').split(',')[1]) if poi.get('location') else 0,
                    'lng': float(poi.get('location', '').split(',')[0]) if poi.get('location') else 0,
                },
                'type': poi.get('type'),
                'distance': poi.get('distance'),
            })

        return jsonify({'pois': results})
    except requests.RequestException as e:
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
        'strategy': '0',
    }

    if api_mode == 'transit':
        params['city'] = '全国'

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
    except requests.RequestException as e:
        return jsonify({'error': f'请求失败: {str(e)}'}), 500


@app.route('/api/geocode', methods=['POST', 'OPTIONS'])
@cors
def geocode():
    if request.method == 'OPTIONS':
        return jsonify({}), 204

    data = request.get_json()
    address = data.get('address')

    if not address:
        return jsonify({'error': '缺少地址参数'}), 400

    url = 'https://restapi.amap.com/v3/geocode/geo'
    params = {
        'key': AMAP_KEY,
        'address': address,
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data.get('status') != '1':
            return jsonify({'error': data.get('info', '地理编码失败')}), 400

        geocodes = data.get('geocodes', [])
        if geocodes:
            geo = geocodes[0]
            location = geo.get('location', '').split(',')
            return jsonify({
                'lat': float(location[1]) if len(location) > 1 else 0,
                'lng': float(location[0]) if len(location) > 1 else 0,
                'formatted_address': geo.get('formatted_address'),
            })

        return jsonify({'error': '未找到地址'})
    except requests.RequestException as e:
        return jsonify({'error': f'请求失败: {str(e)}'}), 500


# 高德地图API代理路由
@app.route('/_AMapService/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
@cors
def amap_proxy(path):
    """高德地图API代理，添加安全密钥"""
    try:
        import urllib.parse
        
        # 获取查询参数
        params = request.args.to_dict()
        
        # 构建目标URL
        if path.startswith('v4/map/styles'):
            base_url = 'https://webapi.amap.com/v4/map/styles'
        else:
            base_url = f'https://restapi.amap.com/{path}'
        
        # 添加安全密钥
        jscode = os.environ.get('AMAP_JSCODE', '5fb470dade98ea5829b7455525e88ac7')
        params['jscode'] = jscode
        
        # 添加API密钥
        params['key'] = AMAP_KEY
        
        # 构建完整URL
        query_string = urllib.parse.urlencode(params)
        target_url = f'{base_url}?{query_string}'
        
        # 转发请求
        if request.method == 'GET':
            response = requests.get(target_url, timeout=10)
        elif request.method == 'POST':
            response = requests.post(target_url, json=request.get_json(), timeout=10)
        else:
            return jsonify({}), 204
        
        # 返回响应
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
