# 部署指南 (Deployment Guide)

本项目采用 **Node.js (Express) 后端服务 + Vite (React) 前端** 混合架构，同时也内嵌了 **前端双通道直连容灾搜索**。

在您将代码拉取到自己的服务器后，推荐使用以下方式部署：

---

## 推荐方式一：Node.js 生产服务 + Nginx 反向代理（最稳定完整）

### 1. 安装依赖与编译打包
在服务器项目根目录下执行：
```bash
# 1. 安装依赖
npm install

# 2. 编译前端与后端服务
npm run build
```
执行完成后会生成：
- `dist/`（前端静态文件）
- `dist/server.cjs`（Node.js 单文件服务端）

### 2. 使用 PM2 启动生产服务
```bash
# 全局安装 PM2（如已安装可跳过）
npm install -g pm2

# 启动 Node.js 服务（默认监听 3000 端口）
pm2 start dist/server.cjs --name "music-lyrics-studio"

# 设置开机自启
pm2 save
pm2 startup
```

### 3. 配置 Nginx 反向代理
在您的 Nginx 域名配置文件（例如 `/etc/nginx/conf.d/your-domain.conf`）中添加反向代理配置：

```nginx
server {
    listen 80;
    server_name your-domain.com; # 替换为您自己的域名

    # 静态前端资源或全部请求反代至 Node.js 服务
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
保存后重载 Nginx：
```bash
nginx -t && nginx -s reload
```

---

## 推荐方式二：Docker 容器化部署

如果您的服务器支持 Docker，可直接使用以下命令：

```bash
# 构建镜像
docker build -t music-lyrics-studio .

# 运行容器（将服务器 3000 端口映射出来）
docker run -d --name music-studio -p 3000:3000 --restart always music-lyrics-studio
```

---

## 方式三：纯静态托管（GitHub Pages / Vercel / Nginx 纯静态）

如果您只把 `dist/` 目录放到了 Nginx 纯静态网站目录（没有启动 Node.js 后端）：
- 本项目现已全面支持 **前端直连容灾模式**。
- 即使后端 `/api` 接口未配置反向代理或返回 404，前端会自动无缝切换至直连模式，确保用户依然可以秒级搜索并制作歌词海报。
