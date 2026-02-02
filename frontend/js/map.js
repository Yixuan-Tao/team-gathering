const MapManager = {
    map: null,
    markers: new Map(),
    placeSearch: null,
    driving: null,
    transit: null,
    walking: null,
    initialized: false,
    initPromise: null,

    async init(containerId, options = {}) {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            if (typeof AMap === 'undefined') {
                reject(new Error('AMap not loaded'));
                return;
            }

            AMap.plugin(['AMap.PlaceSearch', 'AMap.Driving', 'AMap.Transfer', 'AMap.Walking'], () => {
                try {
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

                    this.initialized = true;
                    resolve(this.map);
                } catch (error) {
                    reject(error);
                }
            });
        });

        return this.initPromise;
    },

    async ensureInitialized() {
        if (!this.initialized) {
            await this.init('map');
        }
    },

    async search(keyword, city = '全国') {
        await this.ensureInitialized();
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

    async searchNearby(lat, lng, types, radius = 5000, keyword = '') {
        await this.ensureInitialized();
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
        await this.ensureInitialized();
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
        if (!this.initialized) {
            console.warn('Map not initialized yet');
            return;
        }
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
        if (!this.initialized) return;
        const marker = this.markers.get(id);
        if (marker) {
            marker.remove();
            this.markers.delete(id);
        }
    },

    clearMarkers() {
        if (!this.initialized) return;
        this.markers.forEach(marker => marker.remove());
        this.markers.clear();
    },

    setCenter(lat, lng, zoom = null) {
        if (!this.initialized) return;
        this.map.setCenter([lng, lat]);
        if (zoom) {
            this.map.setZoom(zoom);
        }
    },

    fitBounds(positions) {
        if (!this.initialized || positions.length === 0) return;

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

    async onClick(callback) {
        await this.ensureInitialized();
        this.map.on('click', (e) => {
            const lat = e.lnglat.getLat();
            const lng = e.lnglat.getLng();
            callback({ lat, lng });
        });
    },

    async geocode(address) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            AMap.plugin('AMap.Geocoder', () => {
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
