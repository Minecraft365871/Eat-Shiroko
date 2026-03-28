# 吃掉小白子 (Eat Shiroko)

一个基于网页的新概念音游，支持高度自定义配置。

## 🎮 游戏介绍

这是一个节奏类音乐游戏，玩家需要在正确的时机按下对应的按键来获得分数。游戏支持桌面端和移动端，具有灵活的自定义设置功能。

## ✨ 特性

- 🎵 **音乐节奏玩法** - 跟随音乐节奏点击对应按键
- ⚙️ **高度自定义** - 支持自定义键位、判定时间、垂直判定等
- 💻 **跨平台支持** - 同时支持桌面端和移动端
- 🎨 **精美界面** - 使用 Bootstrap 构建的现代化 UI
- 🔊 **音效反馈** - 点击、错误、结束等多种音效

## 🚀 快速开始

### 在线游玩

直接打开 `index.html` 文件即可开始游戏。

### 本地运行

1. 克隆或下载本项目到本地
2. 使用浏览器打开 `index.html`
3. 或者使用本地服务器：

```bash
# 使用 Python 启动简单服务器
python -m http.server 8000

# 然后访问 http://localhost:8000
```

## 🎯 游戏玩法

### 桌面端
- 使用 **D, F, J, K** 键进行游戏
- 按 **R** 键重新开始（游戏结束时）

### 移动端
- 触摸屏幕对应区域进行操作

## 📁 项目结构

```
├── index.html          # 主页面
├── favicon.ico         # 网站图标
├── static/             # 静态资源目录
│   ├── index.css       # 样式表
│   ├── index.js        # 游戏逻辑
│   ├── image/          # 图片资源
│   │   ├── ClickBefore.png
│   │   └── AfterClicking.png
│   ├── music/          # 音效文件
│   │   ├── tap.mp3
│   │   ├── err.mp3
│   │   └── end.mp3
│   └── favicon.ico
```

## ⚙️ 自定义设置

游戏支持以下自定义选项：

- **键位设置** - 自定义游戏按键
- **判定时间** - 调整垂直判定参数
- **游戏时长** - 设置游戏时间
- **轨道数量** - 调整游戏轨道数

## 🔗 相关链接

- [改版源代码](https://github.com/Atopos1331/eatcat)
- [原版源代码](https://github.com/arcxingye/EatKano)
- [作者的 B 站主页](https://space.bilibili.com/470549205)
- [网站拥有者的 B 站主页](https://space.bilibili.com/3494374381979891)

## 🛠️ 技术栈

- HTML5
- CSS3
- JavaScript (CreateJS)
- Bootstrap 4.3.1

## 📝 许可证

本项目基于原项目 [EatKano](https://github.com/arcxingye/EatKano) 进行改版。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**享受游戏的乐趣吧！** 🎉
