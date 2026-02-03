let currentTeam = null;
let currentUser = null;
let myLocations = [];
let primaryLocationIndex = 0;
let teamMembers = [];
let realtimeSubscription = null;

const teamTypesMap = {
    '050000': '餐饮',
    '080000': '娱乐',
    '100000': '购物',
    '110000': '酒店',
    '120000': '景点',
};

async function init() {
    const isTeamPage = window.location.pathname.includes('team.html');

    try {
        const session = await Auth.getSession();
        if (session) {
            currentUser = session.user;
            if (isTeamPage) {
                const teamId = sessionStorage.getItem('currentTeamId');
                if (teamId) {
                    await loadTeam(teamId);
                } else {
                    window.location.href = 'index.html';
                }
            }
        } else {
            if (isTeamPage) {
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Init error:', error);
    }

    setupEventListeners(isTeamPage);

    Auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = 'index.html';
        } else if (session) {
            currentUser = session.user;
            if (isTeamPage && !currentTeam) {
                const teamId = sessionStorage.getItem('currentTeamId');
                if (teamId) {
                    await loadTeam(teamId);
                }
            }
        }
    });
}

function setupEventListeners(isTeamPage) {
    if (isTeamPage) {
        setupTeamPageListeners();
    } else {
        setupIndexPageListeners();
    }
}

function setupIndexPageListeners() {
    console.log('setupIndexPageListeners called');

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const forgotBtn = document.getElementById('forgot-btn');
    const resetEmailInput = document.getElementById('reset-email');
    const sendResetBtn = document.getElementById('send-reset-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const createTeamBtn = document.getElementById('create-team-btn');
    const submitCreateBtn = document.getElementById('submit-create-btn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    const joinTeamBtn = document.getElementById('join-team-btn');
    const enterTeamBtn = document.getElementById('enter-team-btn');

    if (!loginBtn || !registerBtn) {
        console.error('Buttons not found');
        return;
    }

    console.log('Buttons found, adding listeners');

    loginBtn.addEventListener('click', async () => {
        console.log('Login button clicked');
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('请输入正确的邮箱地址');
            return;
        }

        if (!password || password.length < 6) {
            alert('请输入至少6位密码');
            return;
        }

        try {
            loginBtn.disabled = true;
            loginBtn.textContent = '登录中...';
            const { data, error } = await Auth.signInWithPassword(email, password);
            if (error) {
                alert('登录失败：' + error.message + '\n\n请确认：\n1. 已注册账号\n2. 邮箱和密码正确');
            } else {
                document.getElementById('auth-section').style.display = 'none';
                document.getElementById('team-section').style.display = 'block';
                await loadUserTeams();
            }
        } catch (error) {
            alert('登录失败：' + error.message);
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';
        }
    });

    registerBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('请输入正确的邮箱地址');
            return;
        }

        if (!password || password.length < 6) {
            alert('请输入至少6位密码');
            return;
        }

        try {
            registerBtn.disabled = true;
            registerBtn.textContent = '注册中...';
            const { data, error } = await Auth.signUp(email, password);
            if (error) {
                alert('注册失败：' + error.message);
            } else {
                alert('注册成功！\n\n现在可以使用邮箱和密码登录了。');
                emailInput.value = '';
                passwordInput.value = '';
            }
        } catch (error) {
            alert('注册失败：' + error.message);
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = '注册';
        }
    });

    forgotBtn.addEventListener('click', () => {
        document.getElementById('email-form').style.display = 'none';
        document.getElementById('reset-form').style.display = 'block';
        resetEmailInput.value = emailInput.value;
    });

    backToLoginBtn.addEventListener('click', () => {
        document.getElementById('email-form').style.display = 'block';
        document.getElementById('reset-form').style.display = 'none';
    });

    sendResetBtn.addEventListener('click', async () => {
        const email = resetEmailInput.value.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('请输入正确的邮箱地址');
            return;
        }

        try {
            sendResetBtn.disabled = true;
            sendResetBtn.textContent = '发送中...';
            await Auth.resetPassword(email);
            alert('重置密码链接已发送到您的邮箱，请查收');
            document.getElementById('email-form').style.display = 'block';
            document.getElementById('reset-form').style.display = 'none';
        } catch (error) {
            alert('发送失败：' + error.message);
        } finally {
            sendResetBtn.disabled = false;
            sendResetBtn.textContent = '发送重置链接';
        }
    });

    createTeamBtn.addEventListener('click', () => {
        document.getElementById('create-team-form').style.display = 'block';
        createTeamBtn.style.display = 'none';
    });

    cancelCreateBtn.addEventListener('click', () => {
        document.getElementById('create-team-form').style.display = 'none';
        createTeamBtn.style.display = 'block';
        document.getElementById('team-name').value = '';
    });

    submitCreateBtn.addEventListener('click', async () => {
        const name = document.getElementById('team-name').value.trim();
        if (!name) {
            alert('请输入团队名称');
            return;
        }

        try {
            await createTeam(name);
        } catch (error) {
            alert(error.message);
        }
    });

    joinTeamBtn.addEventListener('click', async () => {
        const code = document.getElementById('join-code').value.trim().toUpperCase();
        if (!code || code.length !== 6) {
            alert('请输入正确的邀请码');
            return;
        }

        try {
            await joinTeam(code);
        } catch (error) {
            alert(error.message);
        }
    });

    enterTeamBtn.addEventListener('click', () => {
        sessionStorage.setItem('currentTeamId', currentTeam.id);
        window.location.href = 'team.html';
    });
}

function setupTeamPageListeners() {
    const searchBtn = document.getElementById('search-btn');
    const addressInput = document.getElementById('address-search');
    const timeSlider = document.getElementById('time-threshold');
    const timeValue = document.getElementById('time-value');
    const findPlacesBtn = document.getElementById('find-places-btn');
    const leaveTeamBtn = document.getElementById('leave-team-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const clearLocationsBtn = document.getElementById('clear-locations-btn');

    timeSlider.addEventListener('input', (e) => {
        timeValue.textContent = e.target.value;
    });

    clearLocationsBtn.addEventListener('click', clearAllLocations);

    searchBtn.addEventListener('click', async () => {
        const keyword = addressInput.value.trim();
        if (!keyword) {
            alert('请输入地址');
            return;
        }

        try {
            searchBtn.disabled = true;
            searchBtn.textContent = '添加中...';
            
            await MapManager.ensureInitialized();
            
            // 使用后端API搜索地址
            const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: keyword })
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            const location = {
                lat: data.lat,
                lng: data.lng,
                address: data.formatted_address || keyword,
            };
            
            selectLocation(location);
            addressInput.value = '';
            
        } catch (error) {
            alert(error.message);
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = '添加';
        }
    });

    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    MapManager.onClick(async (e) => {
        try {
            const result = await MapManager.geocode(`${e.lng},${e.lat}`);
            const location = {
                lat: e.lat,
                lng: e.lng,
                address: result.address,
            };
            selectLocation(location);
        } catch (error) {
            selectLocation({ lat: e.lat, lng: e.lng, address: '未知地址' });
        }
    });

    findPlacesBtn.addEventListener('click', findMeetingPlaces);

    leaveTeamBtn.addEventListener('click', async () => {
        if (realtimeSubscription) {
            supabase.removeChannel(realtimeSubscription);
        }
        sessionStorage.removeItem('currentTeamId');
        window.location.href = 'index.html';
    });

    closeModalBtn.addEventListener('click', () => {
        document.getElementById('place-modal').style.display = 'none';
    });

    document.getElementById('place-modal').addEventListener('click', (e) => {
        if (e.target.id === 'place-modal') {
            document.getElementById('place-modal').style.display = 'none';
        }
    });

    MapManager.init('map').then(() => {
        loadTeamMembers();
    }).catch(err => {
        console.error('Map init failed:', err);
    });
}

async function loadUserTeams() {
    try {
        const { data: locations, error } = await supabase
            .from('locations')
            .select('team_id, teams(*)')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        if (locations && locations.length > 0) {
            const team = locations[0].teams;
            currentTeam = team;
            displayTeamInfo(team, locations.length);
        }
    } catch (error) {
        console.error('Load teams error:', error);
    }
}

async function createTeam(name) {
    const code = generateInviteCode();

    const { data: team, error } = await supabase
        .from('teams')
        .insert({
            name,
            code,
            created_by: currentUser.id,
        })
        .select()
        .single();

    if (error) throw error;

    currentTeam = team;
    sessionStorage.setItem('currentTeamId', team.id);
    window.location.href = 'team.html';
}

async function joinTeam(code) {
    const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .eq('code', code)
        .single();

    if (error || !team) {
        throw new Error('团队不存在');
    }

    currentTeam = team;
    sessionStorage.setItem('currentTeamId', team.id);
    window.location.href = 'team.html';
}

function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function loadTeam(teamId) {
    try {
        const { data: team, error } = await supabase
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single();

        if (error) throw error;
        currentTeam = team;

        document.getElementById('team-name-display').textContent = team.name;

        // 加载我的所有位置
        const { data: myLocs } = await supabase
            .from('locations')
            .select('*')
            .eq('team_id', teamId)
            .eq('user_id', currentUser.id)
            .order('is_primary', { ascending: false });

        if (myLocs && myLocs.length > 0) {
            myLocations = myLocs.map(loc => ({
                lat: loc.lat,
                lng: loc.lng,
                address: loc.address,
            }));
            
            // 找到主要位置的索引
            const primaryIndex = myLocs.findIndex(loc => loc.is_primary === true);
            primaryLocationIndex = primaryIndex >= 0 ? primaryIndex : 0;
            
            updateMyLocationsUI();
            updateLocationMarkers();
        } else {
            myLocations = [];
            primaryLocationIndex = 0;
            updateMyLocationsUI();
        }

        setupRealtimeSubscription(teamId);
    } catch (error) {
        console.error('Load team error:', error);
        window.location.href = 'index.html';
    }
}

function setupRealtimeSubscription(teamId) {
    realtimeSubscription = supabase
        .channel(`team:${teamId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'locations',
                filter: `team_id=eq.${teamId}`,
            },
            async (payload) => {
                await loadTeamMembers();
            }
        )
        .subscribe();
}

async function loadTeamMembers() {
    if (!currentTeam) return;

    try {
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*')
            .eq('team_id', currentTeam.id);

        if (error) throw error;

        teamMembers = locations || [];
        updateMemberList();

        const positions = teamMembers.map(m => [m.lng, m.lat]);
        if (positions.length > 0) {
            MapManager.fitBounds(positions);
        }

        teamMembers.forEach(member => {
            const isMe = member.user_id === currentUser.id;
            MapManager.addMarker(
                member.user_id,
                [member.lat, member.lng],
                isMe ? '我' : `成员${teamMembers.indexOf(member)}`,
                isMe
            );
        });
    } catch (error) {
        console.error('Load members error:', error);
    }
}

function updateMemberList() {
    const container = document.getElementById('members-container');
    container.innerHTML = '';

    teamMembers.forEach(member => {
        const isMe = member.user_id === currentUser.id;
        const div = document.createElement('div');
        div.className = 'member-item';
        div.innerHTML = `
            <span class="member-dot ${isMe ? 'my-location' : ''}"></span>
            <span>${isMe ? '我' : '成员'} - ${member.address || '未知位置'}</span>
        `;
        container.appendChild(div);
    });
}

function displayTeamInfo(team, memberCount) {
    document.getElementById('current-team-name').textContent = team.name;
    document.getElementById('current-team-code').textContent = team.code;
    document.getElementById('member-count').textContent = memberCount;
    document.getElementById('team-info').style.display = 'block';
}

async function selectLocation(location) {
    // 检查位置是否已存在
    const existsIndex = myLocations.findIndex(
        loc => Math.abs(loc.lat - location.lat) < 0.0001 && 
              Math.abs(loc.lng - location.lng) < 0.0001
    );
    
    if (existsIndex >= 0) {
        alert('该位置已添加');
        return;
    }
    
    // 添加新位置
    myLocations.push(location);
    
    // 更新UI
    updateMyLocationsUI();
    
    // 在地图上添加标记
    const markerId = `my-location-${myLocations.length - 1}`;
    MapManager.addMarker(markerId, [location.lat, location.lng], `位置${myLocations.length}`, false);
    
    // 更新所有标记
    updateLocationMarkers();
    
    // 保存到数据库（多条记录）
    try {
        // 删除旧的所有位置记录，然后插入新的
        await supabase
            .from('locations')
            .delete()
            .eq('team_id', currentTeam.id)
            .eq('user_id', currentUser.id);
        
        // 插入所有位置
        const locationsToInsert = myLocations.map((loc, index) => ({
            team_id: currentTeam.id,
            user_id: currentUser.id,
            user_name: currentUser.email || '成员',
            lat: loc.lat,
            lng: loc.lng,
            address: loc.address,
            is_primary: index === primaryLocationIndex,
            updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabase
            .from('locations')
            .insert(locationsToInsert);
        
        if (error) throw error;
    } catch (error) {
        console.error('Save locations error:', error);
    }
}

function updateMyLocationsUI() {
    const listEl = document.getElementById('my-locations-list');
    const countEl = document.getElementById('location-count');
    const clearBtn = document.getElementById('clear-locations-btn');
    const selectedEl = document.getElementById('selected-location');
    
    countEl.textContent = myLocations.length;
    clearBtn.style.display = myLocations.length > 0 ? 'block' : 'none';
    
    if (myLocations.length === 0) {
        selectedEl.className = 'selected-location';
        selectedEl.innerHTML = '<p class="empty-hint">点击地图或搜索添加位置</p>';
        return;
    }
    
    // 显示主要位置
    const primary = myLocations[primaryLocationIndex];
    selectedEl.className = 'selected-location has-location';
    selectedEl.innerHTML = `
        <p class="location-name">主要出发位置</p>
        <p>${primary.address}</p>
    `;
    
    // 渲染位置列表
    listEl.innerHTML = myLocations.map((loc, index) => `
        <div class="location-item ${index === primaryLocationIndex ? 'primary' : ''}" 
             data-index="${index}">
            <div class="location-info">
                <div class="location-name">位置 ${index + 1}${index === primaryLocationIndex ? ' (主要)' : ''}</div>
                <div class="location-address">${loc.address}</div>
            </div>
            <button class="delete-btn" data-action="set-primary" data-index="${index}">★</button>
            <button class="delete-btn" data-action="delete" data-index="${index}">×</button>
        </div>
    `).join('');
    
    // 添加事件监听
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            const action = btn.dataset.action;
            
            if (action === 'delete') {
                deleteLocation(index);
            } else if (action === 'set-primary') {
                setPrimaryLocation(index);
            }
        });
    });
}

async function deleteLocation(index) {
    myLocations.splice(index, 0);
    
    // 调整主要位置索引
    if (primaryLocationIndex >= myLocations.length) {
        primaryLocationIndex = Math.max(0, myLocations.length - 1);
    }
    
    updateMyLocationsUI();
    updateLocationMarkers();
    
    // 更新数据库
    try {
        await supabase
            .from('locations')
            .delete()
            .eq('team_id', currentTeam.id)
            .eq('user_id', currentUser.id);
        
        if (myLocations.length > 0) {
            const locationsToInsert = myLocations.map((loc, idx) => ({
                team_id: currentTeam.id,
                user_id: currentUser.id,
                user_name: currentUser.email || '成员',
                lat: loc.lat,
                lng: loc.lng,
                address: loc.address,
                is_primary: idx === primaryLocationIndex,
                updated_at: new Date().toISOString(),
            }));
            
            await supabase.from('locations').insert(locationsToInsert);
        }
    } catch (error) {
        console.error('Delete location error:', error);
    }
}

async function setPrimaryLocation(index) {
    primaryLocationIndex = index;
    updateMyLocationsUI();
    
    // 更新数据库
    try {
        await supabase
            .from('locations')
            .delete()
            .eq('team_id', currentTeam.id)
            .eq('user_id', currentUser.id);
        
        const locationsToInsert = myLocations.map((loc, idx) => ({
            team_id: currentTeam.id,
            user_id: currentUser.id,
            user_name: currentUser.email || '成员',
            lat: loc.lat,
            lng: loc.lng,
            address: loc.address,
            is_primary: idx === primaryLocationIndex,
            updated_at: new Date().toISOString(),
        }));
        
        await supabase.from('locations').insert(locationsToInsert);
    } catch (error) {
        console.error('Set primary location error:', error);
    }
}

async function clearAllLocations() {
    if (!confirm('确定要清空所有位置吗？')) return;
    
    myLocations = [];
    primaryLocationIndex = 0;
    MapManager.clearMarkers();
    updateMyLocationsUI();
    
    try {
        await supabase
            .from('locations')
            .delete()
            .eq('team_id', currentTeam.id)
            .eq('user_id', currentUser.id);
    } catch (error) {
        console.error('Clear locations error:', error);
    }
}

function updateLocationMarkers() {
    MapManager.clearMarkers();
    
    myLocations.forEach((loc, index) => {
        const markerId = `my-location-${index}`;
        const isPrimary = index === primaryLocationIndex;
        MapManager.addMarker(markerId, [loc.lat, loc.lng], isPrimary ? '主要' : `位置${index + 1}`, isPrimary);
    });
    
    // 如果只有一个位置，居中显示
    if (myLocations.length === 1) {
        MapManager.setCenter(myLocations[0].lat, myLocations[0].lng, 16);
    } else if (myLocations.length > 1) {
        const positions = myLocations.map(loc => [loc.lat, loc.lng]);
        MapManager.fitBounds(positions);
    }
}

async function findMeetingPlaces() {
    if (myLocations.length === 0) {
        alert('请先添加您的位置');
        return;
    }

    const transportMode = document.querySelector('input[name="transport"]:checked').value;
    const maxTime = parseInt(document.getElementById('time-threshold').value);
    const placeType = document.getElementById('place-type').value;
    const sortBy = document.querySelector('input[name="sort"]:checked').value;

    const resultsEl = document.getElementById('results-list');
    resultsEl.innerHTML = '<div class="loading"></div>';
    document.getElementById('find-places-btn').disabled = true;

    console.log('=== 开始查找 ===');
    console.log('Transport:', transportMode, 'MaxTime:', maxTime, 'Type:', placeType);

    try {
        // 收集所有位置（包括其他成员的位置）
        const otherMembersLocations = teamMembers
            .filter(m => m.user_id !== currentUser.id)
            .map(m => ({ lat: m.lat, lng: m.lng, address: m.address, isOwn: false }));
        
        const myOwnLocations = myLocations.map((loc, idx) => ({ 
            ...loc, 
            address: loc.address, 
            isOwn: true,
            isPrimary: idx === primaryLocationIndex
        }));
        
        const allLocations = [...myOwnLocations, ...otherMembersLocations];
        console.log('All locations count:', allLocations.length);

        const candidates = new Map();

        for (const loc of allLocations) {
            if (!loc.lat || !loc.lng) {
                console.warn('Skipping invalid location:', loc);
                continue;
            }
            
            try {
                const places = await MapManager.searchNearby(
                    loc.lat,
                    loc.lng,
                    placeType,
                    5000,
                    ''
                );
                console.log(`Found ${places.length} places near [${loc.lat}, ${loc.lng}]`);

                places.forEach(place => {
                    if (!candidates.has(place.id)) {
                        candidates.set(place.id, {
                            id: place.id,
                            name: place.name,
                            address: place.address,
                            location: {
                                lat: parseFloat(place.location.lat),
                                lng: parseFloat(place.location.lng),
                            },
                            type: place.type,
                            distance: place.distance,
                        });
                    }
                });
            } catch (e) {
                console.error('Search nearby error:', e);
            }
        }

        console.log('Total candidates:', candidates.size);
        
        if (candidates.size === 0) {
            resultsEl.innerHTML = '<p class="empty-state">未找到附近场所，请尝试扩大搜索范围或更换地点类型</p>';
            document.getElementById('find-places-btn').disabled = false;
            return;
        }

        const results = [];
        const transportModeMap = {
            'driving': 'driving',
            'transit': 'transit',
            'walking': 'walking',
        };

        const apiMode = transportModeMap[transportMode];
        const maxTimeInSeconds = maxTime * 60;

        for (const [id, place] of candidates) {
            const times = [];
            
            // 计算到每个位置的时间
            for (const loc of allLocations) {
                try {
                    const time = await MapManager.getTravelTime(
                        [loc.lng, loc.lat],
                        [place.location.lng, place.location.lat],
                        apiMode
                    );
                    times.push({ ...loc, time });
                } catch (e) {
                    console.warn('Get travel time error:', e);
                    times.push({ ...loc, time: maxTimeInSeconds });
                }
            }

            // 分离自己的位置和其他成员的位置
            const myTimes = times.filter(t => t.isOwn);
            const otherTimes = times.filter(t => !t.isOwn);
            
            // 计算最远成员到达时间
            const maxOtherTime = otherTimes.length > 0 ? Math.max(...otherTimes.map(t => t.time)) : 0;
            // 计算自己的最远位置到达时间
            const maxMyTime = myTimes.length > 0 ? Math.max(...myTimes.map(t => t.time)) : 0;
            
            const maxTimeForPlace = Math.max(maxOtherTime, maxMyTime);
            const avgTime = times.reduce((sum, t) => sum + t.time, 0) / times.length;

            console.log(`Place: ${place.name}, maxTime: ${maxTimeForPlace}s, limit: ${maxTimeInSeconds}s`);

            if (maxTimeForPlace <= maxTimeInSeconds) {
                results.push({
                    ...place,
                    maxTime: Math.round(maxTimeForPlace / 60),
                    avgTime: Math.round(avgTime / 60),
                    times: times,
                });
            }
        }

        console.log('Results after filter:', results.length);

        results.sort((a, b) => {
            if (sortBy === 'max') {
                return a.maxTime - b.maxTime;
            }
            return a.avgTime - b.avgTime;
        });

        displayResults(results);
    } catch (error) {
        console.error('Find places error:', error);
        resultsEl.innerHTML = `<p class="error">查找失败：${error.message}</p>`;
    } finally {
        document.getElementById('find-places-btn').disabled = false;
    }
}

function displayResults(results) {
    const resultsEl = document.getElementById('results-list');
    const countEl = document.getElementById('result-count');

    countEl.textContent = `(${results.length})`;

    if (results.length === 0) {
        resultsEl.innerHTML = '<p class="empty-state">未找到符合条件的地点</p>';
        return;
    }

    resultsEl.innerHTML = results.slice(0, 10).map(result => `
        <div class="result-item" data-id="${result.id}">
            <h4>${result.name}</h4>
            <p>${result.address}</p>
            <div class="result-meta">
                <span>最远: ${result.maxTime}分钟</span>
                <span>平均: ${result.avgTime}分钟</span>
            </div>
        </div>
    `).join('');

    resultsEl.querySelectorAll('.result-item').forEach(item => {
        item.addEventListener('click', () => {
            const result = results.find(r => r.id === item.dataset.id);
            if (result) {
                showPlaceDetail(result);
            }
        });
    });
}

function showPlaceDetail(place) {
    document.getElementById('modal-place-name').textContent = place.name;
    document.getElementById('modal-place-address').textContent = place.address;

    const timesEl = document.getElementById('modal-travel-times');
    timesEl.innerHTML = place.times.map(t => `
        <div class="travel-time-item">
            <span class="name">${t.address ? t.address.substring(0, 10) + '...' : '成员'}</span>
            <span class="time">约${Math.round(t.time / 60)}分钟</span>
        </div>
    `).join('');

    document.getElementById('place-modal').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', init);
