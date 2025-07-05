---
slug: git-blog-post
title: Git useage
authors: [sam]
tags: [git]
---

Git 使用


```
git push -u origin "master"
error: src refspec master does not match any
error: failed to push some refs to 'https://gitee.com/samcoding/music_client.git'
```

如果远程仓库没有 master 分支

```bash
git push -u origin HEAD:master
# 或强制推送（谨慎使用）
git push -u origin master --force

# 确认本地分支
git branch

# 提交代码（如果未提交）
git add .
git commit -m "Initial commit"

# 推送 main 分支到远程（假设本地是 main）
git push -u origin main

# 或者重命名分支后推送
git branch -m master   # 如果当前分支需要重命名
git push -u origin master
```