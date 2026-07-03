# CashFlow 富爸爸现金流游戏

基于罗伯特·清崎《富爸爸穷爸爸》改编的桌面棋盘游戏，使用 React + TypeScript + Vite 构建。

## 在线体验

```bash
npm install
npm run dev
```

然后打开 `http://localhost:5173/`。

## 游戏玩法

1. 在开始界面选择你的职业、AI 对手数量和难度。
2. 每回合掷骰子，在棋盘上移动。
3. 落在不同格子会触发事件：发工资、投资机会、市场波动、额外支出、生孩子、慈善捐款等。
4. 购买资产增加月现金流，当你的被动收入超过总支出时，即可跳出"老鼠赛跑"进入快车道。
5. 在快车道积累财富，达到 ¥500,000 即获胜。

## 项目结构

```
src/
├── types/           # TypeScript 类型定义
├── data/            # 职业、棋盘、卡片数据
├── context/         # 游戏状态管理（Context + Reducer）
├── hooks/           # 自定义 Hooks（AI、动作、骰子）
├── utils/           # 财务计算、格式化、随机、存储工具
└── components/      # React 组件
```

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
```

## 设计文档

详细设计请参阅 [`CASHFLOW_GAME.md`](./CASHFLOW_GAME.md)。
