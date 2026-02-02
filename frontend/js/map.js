const MapManager = {
    map: null,
    markers: new Map(),
    placeSearch: null,
    driving: null,
    transit: null,
    walking: null,

    init(containerId, options = {}) {
        this.map = new AMap.Map(containerId, {
            zoom: 12,
            center: [116.397428, 39.90923],
            ...options,
        });

        this.placeSearch = new AMap.PlaceSearch({
            type: '',
            city: '全国',
            citylimit: false,
            pageSize: 20,
            pageIndex: 1,
        });

        this.driving = new AMap.Driving({
            policy: AMap.DrivingPolicy.LEAST_TIME,
            extensions: 'base',
        });

        this.transit = new AMap.Transfer({
            policy: AMap.TransferPolicy.LEAST_TIME,
            extensions: 'base',
        });

        this.walking = new AMap.Walking({
            extensions: 'base',
        });

        return this.map;
    },

    search(keyword, city = '全国') {
        return new Promise((resolve, reject) => {
            this.placeSearch.setCity(city);
            this.placeSearch.search(keyword, (status, result) => {
                if (status === 'complete' && result.info === 'OK') {
                    resolve(result.pois);
                } else {
                    reject(new Error(result.info || '搜索失败'));
                }
            });
        });
    },

    searchNearby(lat, lng, types, radius = 5000, keyword = '') {
        return new Promise((resolve, reject) => {
            const center = [lng, lat];
            const placeSearch = new AMap.PlaceSearch({
                type: types,
                city: '全国',
                citylimit: false,
                pageSize: 30,
                pageIndex: 1,
            });

            placeSearch.searchNearBy(keyword, center, radius, (status, result) => {
                if (status === 'complete' && result.info === 'OK') {
                    resolve(result.pois);
                } else {
                    reject(new Error(result.info || '搜索失败'));
                }
            });
        });
    },

    async getTravelTime(origin, destination, mode = 'driving') {
        const originStr = `${origin[0]},${origin[1]}`;
        const destStr = `${destination[0]},${destination[1]}`;

        return new Promise((resolve, reject) => {
            let service;
            switch (mode) {
                case 'driving':
                    service = this.driving;
                    break;
                case 'transit':
                    service = this.transit;
                    break;
                case 'walking':
                    service = this.walking;
                    break;
                default:
                    service = this.driving;
            }

            service.search(originStr, destStr, (status, result) => {
                if (status === 'complete' && result.info === 'OK') {
                    const route = result.routes[0];
                    const timeInSeconds = route.time || 0;
                    resolve(Math.round(timeInSeconds / 60));
                } else {
                    reject(new Error(result.info || '路线规划失败'));
                }
            });
        });
    },

    addMarker(id, position, info, isMyLocation = false) {
        this.removeMarker(id);

        const marker = new AMap.Marker({
            position: position,
            map: this.map,
        });

        if (info) {
            const content = document.createElement('div');
            content.className = 'marker-info';
            content.innerHTML = `
                <div class="marker-label ${isMyLocation ? 'my-location' : ''}">${info}</div>
            `;

            marker.setLabel({
                content: content.outerHTML,
                offset: new AMap.Pixel(-50, -30),
            });
        }

        this.markers.set(id, marker);
        return marker;
    },

    removeMarker(id) {
        const marker = this.markers.get(id);
        if (marker) {
            marker.remove();
            this.markers.delete(id);
        }
    },

    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers.clear();
    },

    setCenter(lat, lng, zoom = null) {
        this.map.setCenter([lng, lat]);
        if (zoom) {
            this.map.setZoom(zoom);
        }
    },

    fitBounds(positions) {
        if (positions.length === 0) return;

        if (positions.length === 1) {
            this.setCenter(positions[0][0], positions[0][1], 14);
            return;
        }

        const bounds = new AMap.Bounds();
        positions.forEach(pos => {
            bounds.extend(pos);
        });
        this.map.setBounds(bounds);
    },

    onClick(callback) {
        this.map.on('click', (e) => {
            const lat = e.lnglat.getLat();
            const lng = e.lnglat.getLng();
            callback({ lat, lng });
        });
    },

    geocode(address) {
        return new Promise((resolve, reject) => {
            AMap.service('AMap.Geocoder', () => {
                const geocoder = new AMap.Geocoder({});
                geocoder.getLocation(address, (status, result) => {
                    if (status === 'complete' && result.info === 'OK') {
                        const location = result.geocodes[0];
                        resolve({
                            lat: parseFloat(location.location.lat),
                            lng: parseFloat(location.location.lng),
                            address: location.formattedAddress,
                        });
                    } else {
                        reject(new Error('地址解析失败'));
                    }
                });
            });
        });
    },
};

AMap.event.addDomListener(document.getElementById('search-btn'), 'click', function() {});
