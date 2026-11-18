# 幻想域设定集（my-world-system）

一个**本地运行**的中文奇幻世界观写作系统：世界观树、世界地图、时间线、人物档案、关系图谱、纪元地图、历史模拟、剧情大纲、金融中心、小说写作与导出，全部跑在自己电脑上，不依赖任何在线服务。

数据都是本地的 `.md` / `.json` 文件，随时可以备份、迁移、用 Git 管理。

## 安装

1. 装 [Node.js](https://nodejs.org/zh-cn)（18 以上，推荐 LTS）
2. 双击 `安装与更新.bat`，选 `[1] 全新安装`
3. 之后从桌面快捷方式启动

已有安装要升级：双击 `安装与更新.bat`，选 `[2] 更新已有版本`（只覆盖代码，不动你的设定数据）。

## 目录

```
server.js           本地服务（Express）
admin.html          后台入口
plugin/             各个功能插件页
website/            VitePress 站点（你的设定与小说就放在 website/docs/）
start.vbs           启动脚本
安装与更新.bat       安装 / 更新
```

## 许可

**代码**：GNU General Public License v3.0（GPL-3.0-only），全文见 [LICENSE](LICENSE)。

Copyright (C) 2026 bilibili@雾之韵8296

这意味着你可以自由使用、修改、分发本程序，但**分发修改后的版本时必须同样以 GPL-3.0 开源**，不能拿去做闭源产品。

**内容**：`website/docs/` 与 `library/` 下的世界观设定、小说正文等文字内容，**保留所有权利**，
未经书面许可不得转载、改编或用于商业用途。完整条款见 [LICENSE-CONTENT.md](LICENSE-CONTENT.md)。

一句话区分：

| 部分 | 许可 | 别人能做什么 |
|---|---|---|
| 程序代码 | GPL-3.0-only | 自由使用、修改、再分发（衍生作品须开源） |
| 小说与设定文字 | 保留所有权利 | 只能自己阅读备份，不能转载商用 |

## 官方渠道

- 官方仓库：<https://gitee.com/amspace/wuzhiyun8296.github.io>
- 作者：[bilibili@雾之韵8296](https://space.bilibili.com/662538781)

本软件完全免费，任何收费渠道均非官方发布。

如果你看到有人在卖这个软件、或者去掉作者信息后二次发布，那都不是官方版本。
欢迎把这类情况告诉作者。
