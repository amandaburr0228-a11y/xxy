# ONE MORE ROUND · 体感拳击馆

一个可在浏览器运行的立体拳击训练游戏。摄像头识别左右出拳、侧闪、下潜和抱架；也支持键盘与触屏操作。

## 试玩

1. 使用支持 WebGL 2 的新版浏览器打开 `dist/index.html` 所在的 HTTP/HTTPS 站点。
2. 点击「开启体感」，允许摄像头访问。站在镜头前约 1–2 米，保持头部、双肩、双肘与双手入镜。
3. 双拳放在脸颊前保持约 2 秒，完成抱架校准。镜头旁的信号条会显示动作强度。
4. 点击「进入擂台」，出拳攻击教练，并根据红色提示闪避或抱架。

如果识别漏拳，可提高动作灵敏度，或点击「重新校准动作」。光线充足、镜头与胸口接近同高时通常更稳定。单摄像头只能估计动作，不能测量真实打击力量。

## 操作

| 动作 | 键盘 | 触屏 / 摄像头 |
| --- | --- | --- |
| 左直拳 | J | 左拳快速伸出再收回 |
| 右直拳 | L | 右拳快速伸出再收回 |
| 摆拳 | K | 手臂横向挥动 |
| 侧闪 | A / D | 头肩向左右侧移 |
| 抱架 | S | 双拳举至脸颊附近 |
| 暂停 | 空格 | 「暂停」按钮 |

每场最多三回合，每回合 30 秒。连续命中 10 次触发「火力全开」。训练档案和最高分保存在本机浏览器的 `localStorage` 中。

## 本地运行

```bash
cd boxing-arena
python3 -m http.server 8766 --directory dist
```

然后打开 `http://localhost:8766`。摄像头功能要求安全上下文；`localhost` 和 HTTPS 站点均可使用。

运行动作判定测试：

```bash
node tests/punch-detector.mjs
```

## 部署

将 `dist/` 作为静态站点根目录上传即可。腾讯云 EdgeOne Pages 可用：

```bash
edgeone pages deploy ./dist --name boxing-gym-arena --env production
```

项目不需要服务器端代码。摄像头视频仅在访问者浏览器本地处理，不会上传到游戏服务器。

## 第三方资源

- [Three.js](https://threejs.org/) 0.187.0：立体擂台渲染，MIT 许可证。
- [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) 0.10.35：人体关键点识别。
- [Pose Landmarker Lite 模型](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task)：随站点本地托管，减少运行时对外部 CDN 的依赖。

第三方运行文件位于 `dist/vendor/`。
