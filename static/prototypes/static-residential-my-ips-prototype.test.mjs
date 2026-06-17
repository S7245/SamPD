import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./static-residential-my-ips-prototype.html", import.meta.url), "utf8");

const requiredMarkers = [
  'id="statGrid"',
  'id="deliveryCard"',
  'id="resourceList"',
  'id="modalRoot"',
  'id="drawerRoot"',
  'id="searchInput"',
  'id="statusFilter"',
  'id="countryFilter"',
  'id="expireFilter"',
  'id="renewFilter"',
  'data-delivery-toggle',
  'data-dismiss-refunds',
  'data-open-modal="export"',
  'data-open-modal="password"',
  'data-open-modal="renewalSettings"',
  'data-open-modal="manualRenew"',
  'data-bulk-action="disable"',
  'data-bulk-action="enable"',
  'data-confirm-export',
  'data-confirm-password',
  'data-confirm-renewal-settings',
  'data-confirm-manual-renew',
  'data-order-detail',
  'data-ip-detail',
  "[hidden]",
  "function applyInitialQueryParams",
  "function renewalEstimate",
  "function manualRenewalOrderUrl",
  "URLSearchParams",
  "sourceOrder",
  "renewAction",
  "manualRenewal",
  "static-residential-post-continue-flow.html",
  "manualRenew",
  "我的IP",
  "交付动态",
  "交付中",
  "部分交付，已退款",
  "交付失败，已退款",
  "失败 IP 与退款明细",
  "IP 明细列表",
  "导出账号",
  "登录密码",
  "审计日志",
  "修改密码",
  "续费方式设置",
  "data-auto-renew-config",
  "data-renew-mode",
  "手动续费",
  "自动续费",
  "到期前 A 天续费",
  "历史订单",
  "proxy_port",
  "订单交易状态保持已支付",
  "交付中订单不会生成明细行",
  "订单仍在交付中",
  "未找到该订单可用 IP"
];

for (const marker of requiredMarkers) {
  assert.ok(html.includes(marker), `Missing my-ips prototype marker: ${marker}`);
}

const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "Missing inline script");
assert.doesNotThrow(() => new Function(script), "Inline script should parse");

const deliveryBlock = html.slice(
  html.indexOf("function renderDelivery"),
  html.indexOf("function renderFilters")
);

assert.ok(deliveryBlock.includes("多个订单") || deliveryBlock.includes("batches.length"), "Delivery bar should summarize multiple batches");
assert.ok(deliveryBlock.includes("deliveryExpanded"), "Delivery bar should support expanded state");
assert.ok(!deliveryBlock.includes("导出账号"), "Delivery activity table should not expose IP-level account operations");

const ipTableBlock = html.slice(
  html.indexOf("function renderIpTable"),
  html.indexOf("function renderResourceList")
);

assert.ok(ipTableBlock.includes("ip.port"), "IP table should show explicit proxy port");
assert.ok(ipTableBlock.includes("ip.password"), "IP table should show password");
assert.ok(ipTableBlock.includes("data-copy-ip"), "IP table should support copy action");
assert.ok(ipTableBlock.includes("data-ip-detail"), "IP table should support historical order drawer");
assert.ok(!ipTableBlock.includes("Port / 协议"), "IP table should not show protocol as a list field");
assert.ok(!ipTableBlock.includes("ip.protocol"), "IP table should not depend on protocol data");

for (const removedMarker of [
  'id="orderFilterStrip"',
  "order-filter-strip",
  "function renderOrderFilterStrip",
  "data-filter-order",
  "data-clear-order-filter",
  "订单号快捷筛选"
]) {
  assert.ok(!html.includes(removedMarker), `Order number quick filter should be removed: ${removedMarker}`);
}

assert.ok(html.includes('placeholder="IP / Host / 账号 / 订单号"'), "Search field should still support order number lookup");
assert.ok(script.includes("ip.orderNo"), "Search matching should still include order number");
assert.ok(!html.includes('data-list-view="batches"'), "My IPs should not expose a separate order-batch tab");
assert.ok(!html.includes("function renderBatchTable"), "My IPs should not maintain a second order-batch table");
assert.ok(!html.includes("data-select-batch"), "Order grouping should not expose batch-level selection operations");

assert.ok(script.includes("function sharedLeadDays"), "Renewal settings should compute shared auto-renew lead-day options");
assert.ok(script.includes("pendingAutoOrder"), "Prototype data should include pending auto-renewal order state");

const renewalSettingsBlock = html.slice(
  html.indexOf('if (state.modal === "renewalSettings")'),
  html.indexOf('if (state.modal === "manualRenew")')
);

const autoRenewConfigBlock = renewalSettingsBlock.slice(
  renewalSettingsBlock.indexOf('data-auto-renew-config'),
  renewalSettingsBlock.indexOf('</div>', renewalSettingsBlock.indexOf('data-auto-renew-config'))
);

assert.ok(autoRenewConfigBlock.includes("到期前 A 天续费"), "Auto-renew lead-day field should only live inside the auto-renew config block");
assert.ok(renewalSettingsBlock.includes('aria-hidden="${renewalContext.defaultMode === "auto" ? "false" : "true"}"'), "Auto-renew config should expose hidden state to assistive tech");
assert.ok(script.includes('autoConfig.hidden = !showAutoConfig'), "Renewal mode changes should hide the lead-day field unless auto-renew is selected");

for (const marker of ["配置范围", "当前续费方式", "跳过", "我已确认自动续费协议", "待支付自动续费订单"]) {
  assert.ok(!renewalSettingsBlock.includes(marker), `Renewal settings modal should stay simplified and not include: ${marker}`);
}

assert.equal(
  (renewalSettingsBlock.match(/到期前 A 天续费/g) || []).length,
  1,
  "Auto-renew lead-day field should only appear in the conditional auto-renew config"
);
assert.ok(
  renewalSettingsBlock.includes('${renewalContext.defaultMode === "auto" ? "" : "hidden"}'),
  "Auto-renew lead-day config should be hidden unless auto renewal is selected by default"
);
assert.ok(
  script.includes('const showAutoConfig = mode === "auto"') && script.includes('autoConfig.setAttribute("aria-hidden", String(!showAutoConfig))'),
  "Auto-renew lead-day config should only be shown when auto renewal is selected"
);

console.log("my-ips prototype checks passed");
