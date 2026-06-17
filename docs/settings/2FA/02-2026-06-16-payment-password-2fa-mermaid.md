# Mermaid

## 背景

本文件承接：

- `2FA/2026-06-15-payment-password-2fa-strategy-design.md`
- `2FA/2026-06-16-payment-password-2fa-grill-decisions.md`
- `2FA/2026-06-16-payment-password-2fa-wireframe.md`

当前阶段：`mermaid-diagrams`。

图集目标是把支付密码接入两步验证的策略评估、初始化、提交校验、阻断和状态流转用流程图 / 时序图 / 状态机表达清楚，为后续 `prd-orchestrator` 和 PRD 生成提供结构输入。

## 1. 安全服务两段式策略评估流程

```mermaid
flowchart TD
    A([进入高敏步骤]) --> B["前端收集场景与风险上下文"]
    B --> C["调用安全服务预查策略"]
    C --> D{策略查询成功?}
    D -->|"否"| E["禁用提交，提示重试"]
    E --> Z([结束])
    D -->|"是"| F{requires2FA?}
    F -->|"否"| G["展示支付密码或业务确认表单"]
    F -->|"是"| H{twoFactorStatus}
    H -->|"enabled"| I["展示短信或 TOTP 输入"]
    H -->|"uninitialized"| J["强阻断，引导安全中心初始化"]
    H -->|"locked / unavailable"| K["强阻断，展示恢复动作"]
    G --> L["用户提交"]
    I --> L
    L --> M["后端重新评估策略"]
    M --> N{提交时策略是否允许继续?}
    N -->|"否，需要补充 2FA"| O["不执行动作，返回补充 2FA"]
    N -->|"否，阻断"| P["不执行动作，返回阻断原因"]
    N -->|"是"| Q["同请求校验业务条件、支付密码、2FA、幂等"]
    Q --> R{全部通过?}
    R -->|"否"| S["不执行动作，返回失败原因"]
    R -->|"是"| T["执行资金动作或安全动作"]
    T --> U["写入业务结果与安全审计"]
    O --> I
    P --> Z
    S --> Z
    U --> Z
```
## 2. 大陆手机短信 2FA 初始化流程

```mermaid
flowchart TD
    A([安全中心两步验证项]) --> B{账号所属环境}
    B -->|"mainland"| C["展示启用手机短信验证"]
    C --> D{是否有可用绑定手机号?}
    D -->|"否"| E["阻断：引导绑定手机号"]
    E --> Z([结束])
    D -->|"是"| F["展示脱敏手机号"]
    F --> G["用户点击发送验证码"]
    G --> H{短信发送成功?}
    H -->|"否，限流或通道异常"| I["展示错误或等待时间"]
    I --> F
    H -->|"是"| J["进入 60 秒倒计时"]
    J --> K["用户输入短信验证码"]
    K --> L["点击确认启用"]
    L --> M["安全服务校验短信验证码"]
    M --> N{校验通过?}
    N -->|"否"| O["停留表单，提示验证码错误或已过期"]
    O --> K
    N -->|"是"| P["启用两步验证"]
    P --> Q["状态变为已启用 · 手机短信"]
    Q --> R["展示启用成功，不自动回跳"]
    R --> Z
```

## 3. 海外 TOTP 初始化流程

```mermaid
flowchart TD
    A([安全中心两步验证项]) --> B{账号所属环境}
    B -->|"overseas"| C["展示启用验证器动态码"]
    C --> D["Step 1 展示二维码和手动密钥"]
    D --> E["用户用验证器扫码或手动输入密钥"]
    E --> F["进入 Step 2 输入 6 位动态码"]
    F --> G["用户提交动态码"]
    G --> H["安全服务校验 TOTP"]
    H --> I{校验通过?}
    I -->|"否"| J["停留 Step 2，提示验证码错误或已过期"]
    J --> K["可提示检查设备时间"]
    K --> F
    I -->|"是"| L["启用两步验证"]
    L --> M["状态变为已启用 · 验证器动态码"]
    M --> N["Step 3 展示启用成功，不自动回跳"]
    N --> Z([结束])
```

## 4. 支付密码设置 / 重置合并表单流程

```mermaid
flowchart TD
    A([用户点击设置或重置支付密码]) --> B["预查安全策略"]
    B --> C{策略查询成功?}
    C -->|"否"| D["禁用确认，提示重试"]
    D --> Z([结束])
    C -->|"是"| E{requires2FA?}
    E -->|"否"| F["展示合并表单：登录密码 + 新支付密码 + 确认新支付密码"]
    E -->|"是"| G{twoFactorStatus}
    G -->|"enabled"| H["展示合并表单：登录密码 + 2FA + 新支付密码 + 确认新支付密码"]
    G -->|"uninitialized"| I["强阻断，引导安全中心初始化 2FA"]
    G -->|"locked / unavailable"| J["强阻断，展示恢复动作"]
    F --> K["用户点击确认"]
    H --> K
    K --> L["后端重新评估策略"]
    L --> M{提交时是否需要补充或阻断?}
    M -->|"需要补充 2FA"| H
    M -->|"阻断"| J
    M -->|"允许继续"| N["同请求校验登录密码、2FA、支付密码规则"]
    N --> O{全部通过?}
    O -->|"否"| P["停留表单，清空安全输入和支付密码输入"]
    O -->|"是"| Q["保存支付密码哈希"]
    Q --> R["刷新支付密码状态为已设置"]
    R --> S["展示成功，不自动跳回资金操作"]
    I --> Z
    J --> Z
    P --> Z
    S --> Z
```

## 5. 提现支付密码 + 2FA 提交流程

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant UI as 提现页面
    participant Security as 安全服务
    participant Fund as 资金服务
    participant Audit as 审计日志

    User->>UI: 填写提现金额、处理方式、收款对象
    UI->>Security: 预查策略(scene=withdraw, riskContext)
    Security-->>UI: requiresPaymentPassword=true, requires2FA=true, type/status
    alt 2FA 未初始化或锁定
        UI-->>User: 展示阻断，引导安全中心
    else 2FA 可挑战
        UI-->>User: 展示摘要、支付密码、短信或 TOTP 输入
        User->>UI: 输入支付密码和 2FA
        UI->>Fund: 提交提现请求(paymentPassword, twoFactorCode, policyId)
        Fund->>Security: 重新评估策略并校验支付密码和 2FA
        Security-->>Fund: 安全校验结果
        alt 安全校验失败
            Fund->>Audit: 记录失败原因
            Fund-->>UI: 不创建申请，不冻结金额
            UI-->>User: 保留摘要，清空安全输入
        else 安全校验通过
            Fund->>Fund: 重校验账单、窗口、金额、幂等
            alt 业务条件失败
                Fund->>Audit: 记录业务失败
                Fund-->>UI: 不创建申请，不冻结金额
            else 全部通过
                Fund->>Fund: 创建提现申请并冻结金额
                Fund->>Audit: 记录资金安全校验通过
                Fund-->>UI: 提交成功
            end
        end
    end
```

## 6. 充值按风险触发 2FA 提交流程

```mermaid
flowchart TD
    A([代理商填写充值金额]) --> B["点击下一步或确认"]
    B --> C["预查安全策略 scene=agent_user_recharge"]
    C --> D{requires2FA?}
    D -->|"否"| E["展示支付密码确认"]
    D -->|"是"| F{twoFactorStatus}
    F -->|"enabled"| G["展示支付密码 + 两步验证确认"]
    F -->|"uninitialized"| H["阻断：去安全中心设置"]
    F -->|"locked / unavailable"| I["阻断：查看恢复方式"]
    E --> J["用户提交支付密码"]
    G --> K["用户提交支付密码和 2FA"]
    J --> L["后端重新评估策略"]
    K --> L
    L --> M{提交时风险升高?}
    M -->|"是，需要 2FA"| G
    M -->|"否"| N["校验代理身份、用户归属、余额、风控、支付密码、2FA、幂等"]
    N --> O{全部通过?}
    O -->|"否"| P["不转账，返回失败原因"]
    O -->|"是"| Q["代理钱包扣减，用户钱包增加"]
    Q --> R["刷新余额、列表和审计"]
    H --> Z([结束])
    I --> Z
    P --> Z
    R --> Z
```

## 7. 策略变化风险升高补充 2FA 流程

```mermaid
flowchart TD
    A([预查策略 requires2FA=false]) --> B["用户只输入支付密码"]
    B --> C["最终提交"]
    C --> D["后端重新评估策略"]
    D --> E{提交时 requires2FA?}
    E -->|"否"| F["继续校验业务条件、支付密码、幂等"]
    E -->|"是"| G["不执行资金或安全动作"]
    G --> H["返回 requires2FA=true 和 2FA 类型/状态"]
    H --> I{twoFactorStatus}
    I -->|"enabled"| J["同一确认表单追加 2FA 输入"]
    I -->|"uninitialized"| K["展示未初始化阻断"]
    I -->|"locked / unavailable"| L["展示锁定或不可用阻断"]
    J --> M["清空支付密码，用户补充支付密码和 2FA"]
    M --> C
    F --> N{全部通过?}
    N -->|"否"| O["不执行动作，返回失败原因"]
    N -->|"是"| P["执行动作并写入审计"]
    K --> Z([结束])
    L --> Z
    O --> Z
    P --> Z
```

## 8. 2FA 状态机

```mermaid
stateDiagram-v2
    [*] --> Uninitialized: 账号未启用 2FA
    Uninitialized --> Initializing: 在安全中心点击启用
    Initializing --> Enabled: 短信或 TOTP 校验通过
    Initializing --> Uninitialized: 取消 / 刷新 / 初始化失败
    Enabled --> Verifying: 高敏操作命中 2FA
    Verifying --> Enabled: 验证通过
    Verifying --> Enabled: 验证失败但未达锁定阈值
    Verifying --> Locked: 错误达到阈值或风控锁定
    Enabled --> Unavailable: 通道异常或必要绑定不可用
    Locked --> Enabled: 等待自动解锁
    Locked --> Recovery: 用户点击找回方式
    Unavailable --> Recovery: 用户点击恢复入口
    Recovery --> Enabled: 独立找回 / 绑定流程完成
    Recovery --> Uninitialized: 找回后要求重新初始化
    Enabled --> [*]: 账号注销或安全能力下线
```

## 9. 支付密码与 2FA 独立失败计数 / 锁定关系图

```mermaid
flowchart LR
    A["资金或安全提交"] --> B["支付密码校验"]
    A --> C["两步验证校验"]
    B --> D{支付密码通过?}
    C --> E{2FA 通过?}
    D -->|"否"| F["支付密码失败计数 +1"]
    E -->|"否"| G["2FA 失败计数 +1"]
    F --> H{达到支付密码锁定阈值?}
    G --> I{达到 2FA 锁定阈值?}
    H -->|"是"| J["paymentPasswordStatus=locked"]
    H -->|"否"| K["支付密码可继续尝试"]
    I -->|"是"| L["twoFactorStatus=locked"]
    I -->|"否"| M["2FA 可继续尝试"]
    D -->|"是"| N["支付密码因子通过"]
    E -->|"是"| O["2FA 因子通过"]
    J --> P["阻断需要支付密码的操作"]
    L --> Q["阻断需要 2FA 的操作"]
    N --> R{业务条件和其他因子通过?}
    O --> R
    R -->|"否"| S["不执行动作，返回失败原因"]
    R -->|"是"| T["执行资金或安全动作"]
```
