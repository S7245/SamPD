import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./static-residential-post-continue-flow.html", import.meta.url), "utf8");

const requiredMarkers = [
  'id="checkoutView"',
  'id="ordersView"',
  'id="orderDetailView"',
  'id="checkoutOrderNo"',
  'id="checkoutProductName"',
  'id="checkoutAmount"',
  'id="walletCard"',
  'id="useWallet"',
  'id="walletBalance"',
  'id="walletScenario"',
  'id="onlinePaymentSection"',
  'id="onlinePayBadge"',
  'id="onlinePaymentMethod"',
  'id="onlinePaymentOutcome"',
  'id="orderStatusFilters"',
  'id="orderSearch"',
  'id="orderList"',
  'id="orderDetailBody"',
  'data-view-target="orders"',
  'data-order-filter="issue"',
  'data-order-pay',
  'data-order-cancel',
  'data-order-expire',
  'class="order-table"',
  "Checkout 页面只处理支付",
  "待支付订单已生成，库存锁定 15 分钟",
  "取消订单并释放库存",
  "模拟 15 分钟锁定过期",
  "余额不足：钱包 + 在线补差",
  "并使用钱包抵扣",
  "function paymentBreakdown",
  "function markOrderPaid",
  "function failPaymentAttempt",
  "function addHistory",
  "function createPendingOrder",
  "function incomingManualRenewalParams",
  "function createManualRenewalOrderFromParams",
  "function specSummary",
  "function paymentSplitForOrder",
  "function orderMatchesFilters",
  "function renderOrderAmount",
  "function renderDetailGrid",
  "function renderStatusHistory",
  "function renderCheckout",
  "function renderOrders",
  "function renderOrderDetail",
  "function updateOrderStatus",
  "基础信息",
  "支付信息",
  "规格快照",
  "状态记录",
  "创建待支付订单",
  "锁定库存 15 分钟",
  "钱包预扣",
  "function orderTypeLabel",
  "function deliveryStatusLabel",
  "function orderSummaryText",
  "function resourceStateText",
  "function orderActions",
  "function deliveryRows",
  "function failureRefundRows",
  "function renewalRows",
  "function renewalIpsSummary",
  "function renderFailureRefundTable",
  "function renderLinkedResourceSection",
  "function renderAutoRenewalFailureNotice",
  "data-view-myips",
  "订单类型",
  "交付结果",
  "失败 IP 与退款明细",
  "关联资源",
  "续费信息",
  "查看我的IP",
  "自动续费失败",
  "失败/异常",
  "已取消",
  "已过期",
  "SP-20260603-0104",
  "SP-20260603-0105",
  "去我的IP手动续费",
  "renewAction=manual",
  "manualRenewal",
  "创建手动续费待支付订单",
  "被续费 IP"
];

for (const marker of requiredMarkers) {
  assert.ok(html.includes(marker), `Missing prototype marker: ${marker}`);
}

const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "Missing inline script");
assert.doesNotThrow(() => new Function(script), "Inline script should parse");

const forbiddenCheckoutMarkers = [
  "Complete Required Fields",
  "IP 来源与数量",
  "Details",
  "Add-ons",
  "Coupon code",
  "钱包",
  "在线支付",
  "抵扣",
  "补差"
];

const checkoutSummary = html.slice(html.indexOf('<aside class="readonly-summary"'), html.indexOf("</aside>", html.indexOf('<aside class="readonly-summary"')));

for (const marker of forbiddenCheckoutMarkers) {
  assert.ok(!checkoutSummary.includes(marker), `Checkout Summary should not include: ${marker}`);
}

assert.match(checkoutSummary, /订单号/);
assert.match(checkoutSummary, /产品名称/);
assert.match(checkoutSummary, /待支付价格/);
assert.match(checkoutSummary, /Static Proxy/);

const ordersView = html.slice(
  html.indexOf('<section id="ordersView"'),
  html.indexOf('<section id="orderDetailView"')
);

const renderOrdersBlock = html.slice(
  html.indexOf("function renderOrders"),
  html.indexOf("function paymentRows")
);

const forbiddenOrdersMarkers = [
  "order-card",
  "+N 项",
  "+1 项",
  "Coupon",
  "状态记录",
  "完整支付摘要",
  "失败 IP 与退款明细",
  "导出账号",
  "修改密码",
  "停用",
  "启用"
];

for (const marker of forbiddenOrdersMarkers) {
  assert.ok(!ordersView.includes(marker), `Orders list should not include: ${marker}`);
  assert.ok(!renderOrdersBlock.includes(marker), `Orders renderer should not include: ${marker}`);
}

console.log("post-continue checkout flow prototype checks passed");
