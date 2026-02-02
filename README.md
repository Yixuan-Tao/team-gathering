# 团建地点推荐网站

多人共同选择最佳聚会地点的Web应用。

## 功能特性

- 用户邮箱验证码登录
- 创建/加入团队（邀请码机制）
- 成员位置收集与实时同步
- 根据交通工具、时间阈值搜索推荐地点
- 高德地图POI搜索与路线规划

## 项目结构

```
team-gathering/
├── frontend/                    # 前端静态文件
│   ├── index.html              # 登录/创建团队页
│   ├── team.html               # 团队地图页
│   ├── css/style.css           # 样式文件
│   └── js/
│       ├── supabase.js         # Supabase SDK初始化
│       ├── auth.js             # 认证逻辑
│       ├── map.js              # 地图操作
│       └── app.js              # 主业务逻辑
├── api/                         # 后端API
│   ├── app.py                  # Flask应用
│   ├── requirements.txt        # Python依赖
│   └── vercel.json             # Vercel配置
└── supabase/
    └── schema.sql              # 数据库Schema
```

## 快速开始

### 1. 注册必要服务

- **Supabase**: https://supabase.com 创建项目
- **高德地图**: https://lbs.amap.com 创建应用获取API Key

### 2. 配置Supabase

1. 打开 Supabase Dashboard → SQL Editor
2. 复制 `supabase/schema.sql` 内容并执行
3. 进入 Authentication → Providers
4. 启用 Email 提供商（通常默认已启用）

### 3. 配置前端

编辑 `frontend/js/supabase.js`:
```javascript
const SUPABASE_URL = 'https://你的项目.supabase.co';
const SUPABASE_ANON_KEY = '你的anon key';
```

编辑 `frontend/team.html` 中的高德地图Key:
```html
<script src="https://webapi.amap.com/maps?v=2.0&key=你的高德Key&plugin=..."></script>
```

### 4. 本地开发

```bash
# 安装Python依赖
pip install -r api/requirements.txt

# 启动后端
python api/app.py

# 使用Live Server或其他工具托管前端
```

### 5. 部署到Vercel

1. 将代码推送到GitHub仓库
2. 登录 Vercel → Import Project
3. 配置环境变量:
   - `AMAP_KEY`: 你的高德API Key
   - `SUPABASE_URL`: Supabase项目URL
   - `SUPABASE_ANON_KEY`: Supabase anon key
4. Deploy

## 使用流程

1. 用户访问网站 → 手机号登录
2. 创建团队或输入邀请码加入
3. 地图上点击或搜索选择自己的位置
4. 设置筛选条件（交通工具、时间、场所类型）
5. 点击"查找合适地点"
6. 查看推荐结果，点击查看各成员预计到达时间

## 配置说明

### 场所类型编码

| 类型 | 编码 |
|------|------|
| 餐饮 | 050000 |
| 娱乐 | 080000 |
| 购物 | 100000 |
| 酒店 | 110000 |
| 景点 | 120000 |

### 交通工具

- `driving`: 驾车
- `transit`: 公交/地铁
- `walking`: 步行

## 技术栈

- 前端: 原生HTML/CSS/JS
- 地图: 高德地图Web API
- 后端: Python Flask (Vercel Serverless)
- 数据库: Supabase PostgreSQL
- 认证: Supabase Auth
