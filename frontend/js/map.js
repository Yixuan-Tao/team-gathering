const MapManager = {
    map: null,
    markers: new Map(),
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

            AMap.plugin(['AMap.Driving', 'AMap.Transfer', 'AMap.Walking'], () => {
                try {
                    this.map = new AMap.Map(containerId, {
                        zoom: 12,
                        center: [116.397428, 39.90923],
                        ...options,
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

    async searchNearby(lat, lng, types, radius = 5000, keyword = '') {
        await this.ensureInitialized();
        
        console.log('Searching nearby:', { lat, lng, types, radius, keyword });
        
        try {
            const response = await fetch('/api/search-nearby', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng, types, keyword })
            });
            
            const data = await response.json();
            console.log('Search response:', data);
            
            if (data.error) {
                console.error('API error:', data.error);
                return [];
            }
            
            return data.pois || [];
        } catch (error) {
            console.error('Search nearby error:', error);
            return [];
        }
    },

    async getTravelTime(origin, destination, mode = 'driving') {
        await this.ensureInitialized();
        
        try {
            const response = await fetch('/api/direction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    origin: [origin[1], origin[0]], 
                    destination: [destination[1], destination[0]], 
                    mode 
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                console.warn('Direction API error:', data.error);
                return 30; // 默认30分钟
            }
            
            return Math.round((data.time || 0) / 60) || 30;
        } catch (error) {
            console.warn('Get direction error:', error);
            return 30; // 默认30分钟
        }
    },

    addMarker(id, position, info, isMyLocation = false) {
        if (!this.initialized) {
            console.warn('Map not initialized yet');
            return;
        }

        // 验证坐标是否有效（position 格式为 [lat, lng]）
        if (!position || !Array.isArray(position) || position.length !== 2 ||
            typeof position[0] !== 'number' || typeof position[1] !== 'number' ||
            isNaN(position[0]) || isNaN(position[1]) ||
            position[0] === 0 || position[1] === 0 ||
            Math.abs(position[0]) > 90 || Math.abs(position[1]) > 180) {
            console.warn('Invalid marker position:', position);
            return;
        }

        this.removeMarker(id);

        // AMap 需要 [lng, lat] 格式，转换坐标顺序
        const amapPosition = [position[1], position[0]];

        console.log('Creating marker:', { id, amapPosition, info });

        // 创建标记内容
        const content = document.createElement('div');
        content.style.cssText = `
            width: 24px;
            height: 24px;
            background: ${isMyLocation ? '#10B981' : '#6366F1'};
            border: 3px solid ${isMyLocation ? '#D1FAE5' : '#EEF2FF'};
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        `;

        try {
            const marker = new AMap.Marker({
                position: amapPosition,
                content: content,
                map: this.map,
            });

            this.markers.set(id, marker);
            return marker;
        } catch (error) {
            console.error('Failed to create marker:', error, { id, amapPosition, info });
            return null;
        }
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
        // 验证坐标有效性
        if (typeof lat !== 'number' || typeof lng !== 'number' ||
            isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0 ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.warn('Invalid center coordinates:', lat, lng);
            return;
        }
        try {
            this.map.setCenter([lng, lat]);
            if (zoom) {
                this.map.setZoom(zoom);
            }
        } catch (error) {
            console.error('Failed to setCenter:', error, { lat, lng });
        }
    },

    fitBounds(positions) {
        if (!this.initialized || !positions || positions.length === 0) return;

        // 过滤无效坐标
        const validPositions = positions.filter(pos =>
            pos && Array.isArray(pos) && pos.length === 2 &&
            typeof pos[0] === 'number' && typeof pos[1] === 'number' &&
            !isNaN(pos[0]) && !isNaN(pos[1]) &&
            pos[0] !== 0 && pos[1] !== 0 &&
            Math.abs(pos[0]) <= 90 && Math.abs(pos[1]) <= 180
        );

        if (validPositions.length === 0) {
            console.warn('No valid positions for fitBounds:', positions);
            return;
        }

        if (validPositions.length === 1) {
            this.setCenter(validPositions[0][0], validPositions[0][1], 14);
            return;
        }

        try {
            const bounds = new AMap.Bounds();
            validPositions.forEach(pos => {
                bounds.extend([pos[1], pos[0]]);
            });
            this.map.setBounds(bounds);
        } catch (error) {
            console.error('Failed to fitBounds:', error, { positions, validPositions });
        }
    },

    async onClick(callback) {
        await this.ensureInitialized();
        this.map.on('click', (e) => {
            const lat = e.lnglat.getLat();
            const lng = e.lnglat.getLng();
            // 验证坐标是否有效
            if (typeof lat === 'number' && typeof lng === 'number' &&
                !isNaN(lat) && !isNaN(lng) &&
                lat !== 0 && lng !== 0 &&
                Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                callback({ lat, lng });
            } else {
                console.warn('Invalid click coordinates:', lat, lng);
            }
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
