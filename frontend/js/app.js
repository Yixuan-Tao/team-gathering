let currentTeam = null;
let currentUser = null;
let myLocation = null;
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

    timeSlider.addEventListener('input', (e) => {
        timeValue.textContent = e.target.value;
    });

    searchBtn.addEventListener('click', async () => {
        const keyword = addressInput.value.trim();
        if (!keyword) {
            alert('请输入地址');
            return;
        }

        try {
            searchBtn.disabled = true;
            searchBtn.textContent = '搜索中...';
            
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
            MapManager.setCenter(location.lat, location.lng, 16);
            
        } catch (error) {
            alert(error.message);
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = '搜索';
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

        const { data: myLoc } = await supabase
            .from('locations')
            .select('*')
            .eq('team_id', teamId)
            .eq('user_id', currentUser.id)
            .single();

        if (myLoc) {
            myLocation = {
                lat: myLoc.lat,
                lng: myLoc.lng,
                address: myLoc.address,
            };
            selectLocation(myLocation);
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
    myLocation = location;

    const locationEl = document.getElementById('selected-location');
    locationEl.className = 'selected-location has-location';
    locationEl.innerHTML = `
        <p>已选择位置</p>
        <p>${location.address}</p>
    `;

    MapManager.addMarker('my-location', [location.lat, location.lng], '我的位置', true);
    MapManager.setCenter(location.lat, location.lng, 16);

    try {
        const { error } = await supabase
            .from('locations')
            .upsert({
                team_id: currentTeam.id,
                user_id: currentUser.id,
                user_name: currentUser.email || '成员',
                lat: location.lat,
                lng: location.lng,
                address: location.address,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'team_id, user_id',
            });

        if (error) throw error;
    } catch (error) {
        console.error('Save location error:', error);
    }
}

async function findMeetingPlaces() {
    if (!myLocation) {
        alert('请先选择您的位置');
        return;
    }

    if (teamMembers.length < 1) {
        alert('等待其他成员选择位置...');
        return;
    }

    const transportMode = document.querySelector('input[name="transport"]:checked').value;
    const maxTime = parseInt(document.getElementById('time-threshold').value);
    const placeType = document.getElementById('place-type').value;
    const sortBy = document.querySelector('input[name="sort"]:checked').value;

    const resultsEl = document.getElementById('results-list');
    resultsEl.innerHTML = '<div class="loading"></div>';
    document.getElementById('find-places-btn').disabled = true;

    try {
        const allLocations = [
            myLocation,
            ...teamMembers
                .filter(m => m.user_id !== currentUser.id)
                .map(m => ({ lat: m.lat, lng: m.lng, address: m.address })),
        ];

        const candidates = new Map();

        for (const loc of allLocations) {
            try {
                const places = await MapManager.searchNearby(
                    loc.lat,
                    loc.lng,
                    placeType,
                    5000,
                    ''
                );

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

        const results = [];
        const transportModeMap = {
            'driving': 'driving',
            'transit': 'transit',
            'walking': 'walking',
        };

        const apiMode = transportModeMap[transportMode];

        for (const [id, place] of candidates) {
            const times = [];
            for (const loc of allLocations) {
                try {
                    const time = await MapManager.getTravelTime(
                        [loc.lng, loc.lat],
                        [place.location.lng, place.location.lat],
                        apiMode
                    );
                    times.push({ ...loc, time });
                } catch (e) {
                    times.push({ ...loc, time: maxTime * 60 });
                }
            }

            const maxTimeForPlace = Math.max(...times.map(t => t.time));
            const avgTime = times.reduce((sum, t) => sum + t.time, 0) / times.length;

            if (maxTimeForPlace <= maxTime * 60) {
                results.push({
                    ...place,
                    maxTime: Math.round(maxTimeForPlace / 60),
                    avgTime: Math.round(avgTime / 60),
                    times: times,
                });
            }
        }

        results.sort((a, b) => {
            if (sortBy === 'max') {
                return a.maxTime - b.maxTime;
            }
            return a.avgTime - b.avgTime;
        });

        displayResults(results);
    } catch (error) {
        resultsEl.innerHTML = `<p class="error">${error.message}</p>`;
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
