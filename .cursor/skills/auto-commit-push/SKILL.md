---
name: auto-commit-push
description: Automatically stage, commit, and push git changes after code modifications are completed. Triggers when code changes have been made (edits, new files, refactors, fixes, features) and no further coding work is expected. Generates descriptive conventional commit messages based on the diff.
---

# 自动 Git 提交与推送

## 触发条件

当以下情况**同时满足**时，自动执行：

1. 代码修改已完成（编辑、新增文件、重构、修复、功能等）
2. 用户没有提出新的后续工作需求
3. 构建验证已通过（如果有）
4. 有实际的文件变更（git status 显示有修改或未跟踪文件）

## 工作流

1. **检查状态**：运行 `git status` 确认有变更
2. **生成提交信息**：运行 `git diff --stat` 了解变更概览，基于实际改动编写 conventional commit message
3. **提交并推送**：

```bash
bash .cursor/skills/git-pushing/scripts/smart_commit.sh "feat: 提交信息"
```

## 提交信息规范

使用 Conventional Commits 格式：

| 类型 | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 实现纳斯达克100ETF卡片` |
| `fix` | 修复 | `fix: REIT股息率显示计算错误` |
| `refactor` | 重构 | `refactor: 提取通用定价函数` |
| `docs` | 文档 | `docs: 更新定投系统说明` |
| `chore` | 杂项 | `chore: 更新依赖版本` |

## 注意事项

- 跳过 `test-output/` 目录的变更（测试运行产物）
- 如果用户明确说"先不提交"或"等一下再提交"，跳过执行
- 提交信息用中文，概括做了什么和为什么
