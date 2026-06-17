---
name: docusaurus-mdx-fix
description: Fix common Docusaurus MDX compilation errors (bare curly braces, unclosed HTML tags, .mdx.md file extension issues)
source: auto-skill
extracted_at: '2026-06-08T10:10:53.492Z'
---

## Docusaurus MDX 编译错误修复

当 `npm run start` 报 `Could not parse expression with acorn` 或 `unclosed tag` 错误时，按以下步骤排查和修复。

### 1. 检查文件扩展名

如果文件名为 `*.mdx.md`，Docusaurus 会用 MDX loader 处理它，但内容可能不是合法的 MDX。

**修复**：重命名为 `*.md`。

```bash
mv docs/path/to/file.mdx.md docs/path/to/file.md
```

### 2. 裸花括号 `{...}` 被误解析为 MDX 表达式

Docusaurus 3 对 `.md` 文件也使用 MDX 解析器。表格或正文中的 `{codeLike, text}` 会被当作 JSX 表达式，如果内部语法不合法（如 `?`、非 JS 标识符）就会报 `Could not parse expression with acorn`。

**常见触发场景**：
- API 文档中的请求/响应字段：`resp: [{cityCode, name, stock?}]`
- 类型定义中的可选字段标记 `?`

**修复**：用反引号包裹，使其成为内联代码而非 MDX 表达式。

```diff
- | 接口 | 响应字段 |
- |------|----------|
- | 查询城市 | resp: [{cityCode, name, stock, minPrice, segmentCount?}] |

+ | 接口 | 响应字段 |
+ |------|----------|
+ | 查询城市 | resp: `[{cityCode, name, stock, minPrice, segmentCount?}]` |
```

批量定位问题：
```bash
grep -n '{[^}]*[^`]' docs/scrm/02-static-proxy.md
```

### 3. 未闭合的 HTML 标签

MDX 要求 HTML 标签严格闭合。`<br>`、`<hr>`、`<img>` 等自闭合标签必须写成 `<br/>`、`<hr/>`、`<img />`。

**修复**：批量替换 `<br>` 为 `<br/>`。

```bash
sed -i '' 's/<br>/<br\/>/g' docs/scrm/02-static-proxy.md
```

其他常见需要闭合的标签：`<hr>` → `<hr/>`，`<input>` → `<input />`，`<img>` → `<img />`。

### 4. 验证修复

```bash
npm run start
```

成功标志：
```
[SUCCESS] Docusaurus website is running at: http://localhost:3000/
✔ Client: Compiled successfully
client (webpack 5.97.1) compiled successfully
```
