/** 离线重建并加密全部页面：首次启用口令门、修改密码、或本地预览时用。
 *  用法：RADAR_PASSWORD=你的密码 node scripts/protect.mjs
 *  不设 RADAR_PASSWORD 则生成明文页面（即关闭口令门）。
 *  可选 RADAR_PAT：仅在口令门启用时，把免填重跑用的凭证注入加密页。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rebuildPages } from "./auth.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const password = process.env.RADAR_PASSWORD || "";
const pat = process.env.RADAR_PAT || "";

if (!password) {
  console.warn("未设置 RADAR_PASSWORD —— 将生成明文页面（口令门关闭）");
}
const r = await rebuildPages({
  SITE,
  ROOT,
  DATA: path.join(SITE, "data"),
  REPORTS: path.join(SITE, "reports"),
  password,
  pat,
});
console.log(`已重建 ${r.days} 天的页面 | 口令门：${r.locked ? "已启用" : "关闭"} | 内置凭证：${r.builtInPat ? "已注入" : "未启用"}`);
