# app_valuation.py —— 公司估值工具（白蓝 / 微软雅黑 / 滑块实时重算）
# 取数核心重写（v3 规则，解决 NVDA 营收停2022、capex 取到2012陈旧值、TJX 取不到的根问题）：
#   ① 合并同科目所有候选标签的年度数据，不再"取第一个命中就停"
#   ② 同一年多个标签冲突时，取"能覆盖到最新财年"的标签值
#   ③ 陈旧标签护栏：某科目最新年份比营收最新年份老 ≥2 年，判为陈旧、弃用并记录告警
#
# 用法：pip install flask requests python-dotenv；.env 放 BOCHA/DEEPSEEK key；
#       SEC_UA 换成你邮箱；连 sec.gov 不稳先设代理 $env:HTTP_PROXY/HTTPS_PROXY="http://127.0.0.1:7897"
#       python app_valuation.py  →  http://127.0.0.1:5000

import os
import json
import requests
from datetime import date, datetime, timezone
from urllib.parse import urlparse
from flask import Flask, request, jsonify, Response
from dotenv import load_dotenv

load_dotenv()
BOCHA_KEY = os.getenv("BOCHA_API_KEY")
DEEPSEEK_KEY = os.getenv("DEEPSEEK_API_KEY")
SEC_UA = "Komakwok@qq.com"   # ★换成你真实邮箱
SEC_HEADERS = {"User-Agent": SEC_UA}

YEARS_BACK = 6

# 每个科目一组候选标签（顺序不再代表优先级，会全部合并）。
# 注意 TJX 用的是 IncludingAssessedTax，已补入。
CONCEPTS = {
    "营业收入":   ("us-gaap", ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
                              "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"], "USD"),
    "净利润":     ("us-gaap", ["NetIncomeLoss"], "USD"),
    "经营现金流": ("us-gaap", ["NetCashProvidedByUsedInOperatingActivities",
                              "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"], "USD"),
    "资本开支":   ("us-gaap", ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets",
                              "PaymentsForCapitalImprovements"], "USD"),
    "现金":       ("us-gaap", ["CashAndCashEquivalentsAtCarryingValue",
                              "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"], "USD"),
    "长期债务":   ("us-gaap", ["LongTermDebtNoncurrent", "LongTermDebt"], "USD"),
    "长期债务流动部分": ("us-gaap", ["LongTermDebtCurrent"], "USD"),
    "短期借款":   ("us-gaap", ["ShortTermBorrowings", "CommercialPaper"], "USD"),
    "流通股数":   ("dei",     ["EntityCommonStockSharesOutstanding"], "shares"),
}
TRUSTED = {
    "36kr.com": "36氪", "latepost.com": "晚点LatePost", "huxiu.com": "虎嗅", "tmtpost.com": "钛媒体",
    "jiemian.com": "界面新闻", "yicai.com": "第一财经", "wallstreetcn.com": "华尔街见闻", "cls.cn": "财联社",
    "caixin.com": "财新", "21jingji.com": "21世纪经济报道", "reuters.com": "路透", "bloomberg.com": "彭博",
    "cnbc.com": "CNBC", "wsj.com": "华尔街日报", "sec.gov": "SEC",
}
BLACKLIST = {"csdn.net", "juejin.cn", "zhihu.com", "baidu.com", "jianshu.com", "sohu.com", "bilibili.com", "hupu.com"}


def get_cik(ticker):
    r = requests.get("https://www.sec.gov/files/company_tickers.json", headers=SEC_HEADERS, timeout=30)
    r.raise_for_status()
    for row in r.json().values():
        if row["ticker"].upper() == ticker.upper():
            return f"{int(row['cik_str']):010d}", row["title"]
    return None, None


def get_facts(cik):
    r = requests.get(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json", headers=SEC_HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


def _annual_points(node, unit):
    """从一个标签节点取 {年份: 值}（10-K + FY + 整年）。"""
    out = {}
    units = node.get("units", {})
    if unit not in units:
        return out
    for e in units[unit]:
        if not e.get("form", "").startswith("10-K") or e.get("fp") != "FY":
            continue
        end = e.get("end", "")
        yr = int(end[:4]) if end[:4].isdigit() else e.get("fy")
        if "start" in e:
            try:
                if (date.fromisoformat(end) - date.fromisoformat(e["start"])).days < 300:
                    continue
            except ValueError:
                pass
        out[yr] = e["val"]
    return out


def merge_concept(facts, taxonomy, tags, unit):
    """① 合并所有候选标签 → {年份: (值, 标签)}，同年冲突时取"最新年份覆盖更靠后"的标签。
    返回 (合并序列{年:值}, 每个标签的最新年份{标签:最新年}, 命中标签列表)。"""
    node = facts.get("facts", {}).get(taxonomy, {})
    per_tag = {}   # 标签 -> {年:值}
    for tag in tags:
        if tag in node:
            pts = _annual_points(node[tag], unit)
            if pts:
                per_tag[tag] = pts
    if not per_tag:
        return {}, {}, []
    # 标签按"最新年份"排序，越新的越优先（覆盖旧标签）
    tag_latest = {t: max(p) for t, p in per_tag.items()}
    order = sorted(per_tag, key=lambda t: tag_latest[t])  # 旧→新
    merged = {}
    for t in order:        # 先放旧标签，再用新标签覆盖同年
        merged.update(per_tag[t])
    return merged, tag_latest, list(per_tag.keys())


def latest(series):
    return series[max(series)] if series else None


def build_financials(ticker):
    cik, name = get_cik(ticker)
    if not cik:
        return None, f"没找到 {ticker} 的 CIK（确认是美股代码）"
    facts = get_facts(cik)

    merged, latests = {}, {}
    for label, (tax, tags, unit) in CONCEPTS.items():
        m, tl, _ = merge_concept(facts, tax, tags, unit)
        merged[label], latests[label] = m, tl

    years = sorted(merged["营业收入"].keys())[-YEARS_BACK:]
    if not years:
        return None, "没抽到营收年度数据"
    rev_latest_year = max(merged["营业收入"].keys())

    # ③ 陈旧标签护栏：某科目最新年份比营收最新年份老 ≥2 年 → 判陈旧、弃用并告警
    warnings = []
    for label in ["资本开支", "经营现金流", "净利润"]:
        m = merged[label]
        if m:
            gap = rev_latest_year - max(m.keys())
            if gap >= 2:
                warnings.append(f"{label}：最新数据停在 {max(m.keys())} 年（比营收老 {gap} 年），疑似陈旧标签，已弃用不计入。")
                merged[label] = {}   # 弃用

    rows = []
    for label in ["营业收入", "净利润", "经营现金流", "资本开支", "现金"]:
        rows.append({"label": label, "vals": [merged[label].get(y) for y in years]})

    fcf_hist = {y: merged["经营现金流"][y] - merged["资本开支"][y]
                for y in years if merged["经营现金流"].get(y) and merged["资本开支"].get(y)}
    fy = sorted(fcf_hist)
    if len(fy) < 2:
        return None, "自由现金流不足两年（经营现金流或资本开支取数异常），换家公司或反馈我修标签"
    fcf_cagr = (fcf_hist[fy[-1]] / fcf_hist[fy[0]]) ** (1 / (len(fy) - 1)) - 1

    cash = latest(merged["现金"]) or 0
    debt = (latest(merged["长期债务"]) or 0) + (latest(merged["长期债务流动部分"]) or 0) + (latest(merged["短期借款"]) or 0)
    shares = latest(merged["流通股数"])

    return {
        "name": name, "cik": cik, "years": years, "rows": rows,
        "fcf_hist": {str(y): v for y, v in fcf_hist.items()},
        "fcf0": fcf_hist[fy[-1]], "fcf_cagr": fcf_cagr,
        "cash": cash, "debt": debt, "net_debt": debt - cash, "shares": shares,
        "warnings": warnings,
    }, None


def host_of(u):
    try:
        return urlparse(u).netloc.lower()
    except Exception:
        return ""


def hit(host, doms):
    return any(host == d or host.endswith("." + d) for d in doms)


def company_brief(company):
    if not (BOCHA_KEY and DEEPSEEK_KEY):
        return {"summary": "（未配置 BOCHA/DEEPSEEK key，跳过业务总结）", "sources": []}
    try:
        r = requests.post("https://api.bochaai.com/v1/web-search",
                          headers={"Authorization": f"Bearer {BOCHA_KEY}", "Content-Type": "application/json"},
                          json={"query": f"{company} 业务 商业模式 竞争对手", "freshness": "oneYear", "summary": True, "count": 20},
                          timeout=30)
        r.raise_for_status()
        pages = r.json().get("data", {}).get("webPages", {}).get("value", []) or []
    except requests.RequestException as e:
        return {"summary": f"（检索失败：{e}）", "sources": []}
    srcs, seen = [], set()
    for p in pages:
        u = p.get("url", "")
        h = host_of(u)
        if hit(h, BLACKLIST) or u in seen:
            continue
        seen.add(u)
        site = TRUSTED.get(next((d for d in TRUSTED if h == d or h.endswith("." + d)), ""), h)
        srcs.append({"url": u, "title": p.get("name", ""), "site": site,
                     "summary": p.get("summary") or p.get("snippet", "")})
        if len(srcs) >= 8:
            break
    if not srcs:
        return {"summary": "（没检索到可用资料）", "sources": []}
    mat = "\n\n".join(f"[{i+1}] 来源：{s['site']}\n标题：{s['title']}\n摘要：{s['summary']}" for i, s in enumerate(srcs))
    system = (
        "你是面向投资研究的分析师。根据带编号材料，总结这家公司的业务概况、商业模式、主要竞品。要求："
        "1) 严禁编造，只能基于材料；2) 每条关键结论后用 [n] 标注依据编号；"
        "3) 区分事实与分析：事实标来源，纯分析判断标'(分析)'不强塞编号；"
        "4) 简洁，分'业务概况''商业模式''主要竞品'三段，每段2-4句，纯文本不用markdown符号。"
    )
    try:
        rr = requests.post("https://api.deepseek.com/chat/completions",
                           headers={"Authorization": f"Bearer {DEEPSEEK_KEY}", "Content-Type": "application/json"},
                           json={"model": "deepseek-chat",
                                 "messages": [{"role": "system", "content": system},
                                              {"role": "user", "content": f"公司：{company}\n\n材料：\n{mat}"}],
                                 "stream": False}, timeout=60)
        rr.raise_for_status()
        summary = rr.json()["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        summary = f"（总结失败：{e}）"
    return {"summary": summary, "sources": srcs}


app = Flask(__name__)


@app.route("/api/analyze", methods=["POST"])
def analyze():
    ticker = (request.get_json(force=True).get("ticker") or "").strip().upper()
    if not ticker:
        return jsonify({"error": "请输入股票代码"}), 400
    try:
        fin, err = build_financials(ticker)
        if err:
            return jsonify({"error": err}), 404
        brief = company_brief(fin["name"])
        return jsonify({"financials": fin, "brief": brief})
    except requests.HTTPError as e:
        return jsonify({"error": f"EDGAR 请求失败：{e}（确认 User-Agent 填了邮箱）"}), 502
    except Exception as e:
        return jsonify({"error": f"出错：{e}"}), 500


@app.route("/")
def index():
    resp = Response(PAGE, mimetype="text/html")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


PAGE = r"""<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>公司估值工具</title>
<style>
:root{--blue:#1763b6;--blue-d:#0f4a8a;--blue-l:#eaf2fb;--ink:#1c2530;--muted:#6b7785;--line:#e2e8f0;--bg:#f7f9fc;--card:#fff;--warn:#b06a00;
--font:"Microsoft YaHei","微软雅黑",-apple-system,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:var(--font);line-height:1.6;padding:36px 20px 80px}
.wrap{max-width:880px;margin:0 auto}
.head{border-bottom:2px solid var(--blue);padding-bottom:16px;margin-bottom:24px}
.head h1{font-size:24px;font-weight:700;color:var(--blue-d);letter-spacing:1px}
.head .s{color:var(--muted);font-size:13px;margin-top:4px}
.bar{display:flex;gap:10px;margin-bottom:8px}
#tk{flex:1;border:1px solid var(--line);border-radius:4px;padding:12px 14px;font-size:16px;font-family:var(--font);outline:none}
#tk:focus{border-color:var(--blue)}
#go{background:var(--blue);color:#fff;border:none;padding:0 26px;border-radius:4px;font-size:15px;font-family:var(--font);cursor:pointer}
#go:hover{background:var(--blue-d)} #go:disabled{opacity:.5;cursor:not-allowed}
.hint{color:var(--muted);font-size:12px;margin-bottom:20px}
.loader{display:none;text-align:center;padding:40px;color:var(--muted);font-size:14px}.loader.on{display:block}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px 22px;margin-bottom:18px}
.card h2{font-size:15px;font-weight:700;color:var(--blue-d);margin-bottom:14px;padding-left:9px;border-left:3px solid var(--blue)}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:8px 6px;text-align:right;border-bottom:1px solid var(--line)}
th:first-child,td:first-child{text-align:left;color:var(--muted)}
thead th{color:var(--blue-d);font-weight:700;border-bottom:2px solid var(--line)}
.brief{font-size:14px;color:#333;white-space:pre-wrap;line-height:1.8}
.brief sup{color:var(--blue);font-weight:700;font-size:11px}
.srcs{margin-top:14px;border-top:1px dashed var(--line);padding-top:12px}
.srcs .t{font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:7px}
.srcs a{display:block;font-size:12px;color:var(--blue);text-decoration:none;margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.srcs a:hover{text-decoration:underline}.srcs a b{color:var(--muted);font-weight:400}
.slider{margin-bottom:18px}
.slider .lab{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
.slider .lab b{color:var(--blue-d);font-weight:700}
.slider .anchor{color:var(--muted);font-size:11px}
input[type=range]{width:100%;accent-color:var(--blue);height:4px}
.val{background:var(--blue-l);border:1px solid #cfe0f3;border-radius:8px;padding:18px;text-align:center}
.val .k{font-size:12px;color:var(--muted);letter-spacing:1px}
.val .v{font-size:34px;font-weight:700;color:var(--blue-d);margin-top:4px}
.val .sub{font-size:12px;color:var(--muted);margin-top:6px}
.warn{background:#fff7e8;border:1px solid #f0d9a8;color:var(--warn);font-size:12px;padding:10px 12px;border-radius:6px;margin-top:10px}
.err{background:#fdecec;border:1px solid #f0b4b4;color:#b13a3a;padding:14px;border-radius:6px;font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:720px){.grid{grid-template-columns:1fr}}
.subt{font-size:12px;color:var(--muted);margin:2px 0 10px}
.mtx{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
.mtx th,.mtx td{border:1px solid var(--line);padding:7px 4px;text-align:center}
.mtx th{background:#f0f5fb;color:var(--blue-d);font-weight:700}
.mtx td.cur{outline:2px solid var(--blue);outline-offset:-2px;font-weight:700}
.mtx .corner{background:#fff;color:var(--muted);font-weight:400;font-size:11px}
.legend{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);margin-top:8px}
.legend .bar{height:10px;width:120px;border-radius:2px;background:linear-gradient(90deg,#eaf2fb,#1763b6)}
</style></head><body><div class="wrap">
<div class="head"><h1>公司估值工具</h1><div class="s">美股 · EDGAR 官方财务数据 + AI 业务速览 + DCF 估值　<b style="color:#1763b6">build v4 · 含图表与敏感性矩阵</b></div></div>
<div class="bar"><input id="tk" placeholder="输入美股代码，如 AAPL、NVDA、TJX"><button id="go">分析</button></div>
<div class="hint">数据来源：SEC EDGAR（财务）· 博查检索 + DeepSeek（业务总结，标注来源）。估值仅供参考，非投资建议。</div>
<div class="loader" id="loader">拉取财务数据与资料中…约十几秒</div>
<div id="out"></div>
</div>
<script>
const tk=document.getElementById('tk'),go=document.getElementById('go'),loader=document.getElementById('loader'),out=document.getElementById('out');
let FIN=null;
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const B=v=>v==null?'—':(v/1e9).toLocaleString('en-US',{maximumFractionDigits:1})+'B';
go.onclick=run; tk.addEventListener('keydown',e=>{if(e.key==='Enter')run()});
async function run(){
  const t=tk.value.trim(); if(!t){tk.focus();return;}
  out.innerHTML=''; loader.classList.add('on'); go.disabled=true;
  try{
    const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker:t})});
    const d=await r.json();
    if(d.error){out.innerHTML='<div class="err">'+esc(d.error)+'</div>';return;}
    FIN=d.financials; render(d);
  }catch(e){out.innerHTML='<div class="err">网络出错：'+esc(e.message||e)+'</div>';}
  finally{loader.classList.remove('on');go.disabled=false;}
}
function marks(txt){return esc(txt).replace(/\[(\d+(?:,\s*\d+)*)\]/g,'<sup>[$1]</sup>');}

// 核心 DCF 计算（给一组假设，返回每股价值与中间量）
function dcf(g,w,p,y){
  if(w<=p) return null;
  let fcf=FIN.fcf0, pv=0, last=0, series=[];
  for(let t=1;t<=y;t++){fcf*=(1+g); last=fcf; series.push(fcf); pv+=fcf/Math.pow(1+w,t);}
  const tv=last*(1+p)/(w-p), pvtv=tv/Math.pow(1+w,y);
  const ev=pv+pvtv, eq=ev-FIN.net_debt, ps=eq/FIN.shares;
  return {ps,ev,series};
}

function render(d){
  const f=d.financials, b=d.brief, ys=f.years;
  let h='';
  // 财务表
  h+='<div class="card"><h2>'+esc(f.name)+' · 年度财务（十亿美元）</h2><table><thead><tr><th>科目</th>'+ys.map(y=>'<th>'+y+'</th>').join('')+'</tr></thead><tbody>';
  f.rows.forEach(row=>{h+='<tr><td>'+esc(row.label)+'</td>'+row.vals.map(v=>'<td>'+B(v)+'</td>').join('')+'</tr>';});
  h+='</tbody></table>';
  if(f.warnings&&f.warnings.length){f.warnings.forEach(w=>{h+='<div class="warn">⚠ '+esc(w)+'</div>';});}
  h+='</div>';
  // 业务速览
  h+='<div class="card"><h2>业务速览（AI 生成，结论标注来源）</h2><div class="brief">'+marks(b.summary)+'</div>';
  if(b.sources&&b.sources.length){h+='<div class="srcs"><div class="t">来源</div>';
    b.sources.forEach((s,i)=>{h+='<a href="'+esc(s.url)+'" target="_blank">['+(i+1)+'] <b>'+esc(s.site)+'</b> · '+esc(s.title)+'</a>';});h+='</div>';}
  h+='</div>';
  // DCF
  const cagr=(f.fcf_cagr*100).toFixed(1);
  h+='<div class="card"><h2>DCF 估值（拖动假设，下方图表与矩阵实时更新）</h2><div class="grid"><div>';
  h+=slider('g','FCF 增长率',(f.fcf_cagr*100),-5,30,0.5,'历史 CAGR '+cagr+'%');
  h+=slider('w','折现率 WACC',9,5,15,0.5,'参考 8–12%');
  h+=slider('p','永续增长率',2.5,0,4,0.1,'参考 2–3%');
  h+=slider('y','预测年数',5,3,10,1,'常用 5–10 年');
  h+='</div><div><div class="val"><div class="k">每股内在价值</div><div class="v" id="ps">—</div><div class="sub" id="evsub"></div></div>';
  if(!f.shares) h+='<div class="warn">未取到股数，无法折算每股。</div>';
  if(!f.debt) h+='<div class="warn">未取到债务，按 0 处理，股权价值偏高。</div>';
  h+='</div></div></div>';
  // 图1：FCF 历史 vs 预测 柱状图
  h+='<div class="card"><h2>自由现金流：历史 vs 预测</h2><div class="subt">实心=历史(CFO−CapEx)，浅色=按当前假设预测；拖增长率看预测柱实时变化</div><div id="fcfchart"></div></div>';
  // 图2：敏感性矩阵
  h+='<div class="card"><h2>敏感性矩阵：每股价值（WACC × FCF 增长率）</h2><div class="subt">行=WACC，列=增长率；颜色越深每股价值越高，蓝框=当前假设所在格</div><div id="matrix"></div>'
   +'<div class="legend"><span>低</span><div class="bar"></div><span>高</span></div></div>';
  out.innerHTML=h;
  ['g','w','p','y'].forEach(id=>document.getElementById('sl_'+id).addEventListener('input',calc));
  calc();
}

function slider(id,name,val,min,max,step,anchor){
  const dp=(id==='y')?0:1, suf=(id==='y')?' 年':'%';
  return '<div class="slider"><div class="lab"><span>'+name+' <b id="lb_'+id+'">'+(+val).toFixed(dp)+suf+'</b></span><span class="anchor">'+anchor+'</span></div>'
    +'<input type="range" id="sl_'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+(+val).toFixed(dp)+'"></div>';
}

function calc(){
  if(!FIN||!FIN.fcf0||!FIN.shares) return;
  const g=+document.getElementById('sl_g').value/100, w=+document.getElementById('sl_w').value/100,
        p=+document.getElementById('sl_p').value/100, y=+document.getElementById('sl_y').value;
  document.getElementById('lb_g').textContent=(g*100).toFixed(1)+'%';
  document.getElementById('lb_w').textContent=(w*100).toFixed(1)+'%';
  document.getElementById('lb_p').textContent=(p*100).toFixed(1)+'%';
  document.getElementById('lb_y').textContent=y+' 年';
  const r=dcf(g,w,p,y);
  if(!r){document.getElementById('ps').textContent='WACC 需大于 g';return;}
  document.getElementById('ps').textContent='$'+r.ps.toLocaleString('en-US',{maximumFractionDigits:2});
  document.getElementById('evsub').textContent='企业价值 '+B(r.ev)+' · 净债务 '+B(FIN.net_debt);
  drawFcf(r.series); drawMatrix(g,w,p,y);
}

// 图1：SVG 柱状图（历史实心 + 预测浅色）
function drawFcf(pred){
  const el=document.getElementById('fcfchart'); if(!el) return;
  try{
  const hist=Object.entries(FIN.fcf_hist).map(([yr,v])=>({yr,v})).sort((a,b)=>a.yr-b.yr);
  const lastYr=+hist[hist.length-1].yr;
  const bars=hist.map(d=>({label:d.yr,v:d.v,future:false}))
    .concat(pred.map((v,i)=>({label:'E'+(lastYr+i+1),v,future:true})));
  const W=760,H=210,pad=30,bw=Math.min(46,(W-2*pad)/bars.length-8);
  const max=Math.max(...bars.map(b=>b.v))*1.1, min=Math.min(0,...bars.map(b=>b.v));
  const span=max-min||1, x0=pad, y0=H-26, plotH=H-50;
  const yv=v=>y0-(v-min)/span*plotH;
  let s='<svg width="100%" viewBox="0 0 '+W+' '+H+'" font-family="Microsoft YaHei">';
  s+='<line x1="'+x0+'" y1="'+yv(0)+'" x2="'+(W-pad)+'" y2="'+yv(0)+'" stroke="#cbd5e1" stroke-width="1"/>';
  bars.forEach((b,i)=>{
    const cx=x0+i*((W-2*pad)/bars.length)+((W-2*pad)/bars.length-bw)/2;
    const top=yv(Math.max(b.v,0)), bot=yv(Math.min(b.v,0)), hgt=Math.abs(bot-top);
    const fill=b.future?'#bcd6f3':'#1763b6';
    s+='<rect x="'+cx+'" y="'+top+'" width="'+bw+'" height="'+Math.max(hgt,1)+'" rx="2" fill="'+fill+'"/>';
    s+='<text x="'+(cx+bw/2)+'" y="'+(top-5)+'" font-size="10" fill="#475569" text-anchor="middle">'+(b.v/1e9).toFixed(0)+'</text>';
    s+='<text x="'+(cx+bw/2)+'" y="'+(H-8)+'" font-size="10" fill="#94a3b8" text-anchor="middle">'+b.label+'</text>';
  });
  s+='</svg>';
  el.innerHTML=s;
  }catch(e){el.innerHTML='<div style="color:#b13a3a;font-size:12px">柱状图渲染出错：'+e.message+'</div>';}
}

// 图2：敏感性矩阵（WACC 行 × 增长率 列），颜色深浅按每股价值
function drawMatrix(g,w,p,y){
  const el=document.getElementById('matrix'); if(!el) return;
  try{
  const gs=[-2,-1,0,1,2].map(d=>g+d*0.02);     // 增长率 ±列，步长2%
  const ws=[-2,-1,0,1,2].map(d=>w+d*0.01);     // WACC ±行，步长1%
  let vals=[], cells=[];
  ws.forEach(wv=>{const row=[];gs.forEach(gv=>{const r=dcf(gv,wv,p,y);const ps=(r&&isFinite(r.ps)&&r.ps>0)?r.ps:null;row.push(ps);if(ps!=null)vals.push(ps);});cells.push(row);});
  const lo=Math.min(...vals), hi=Math.max(...vals), sp=hi-lo||1;
  const shade=v=>{if(v==null)return '#f8fafc';const t=(v-lo)/sp;
    const r=Math.round(234+(23-234)*t),gg=Math.round(242+(99-242)*t),bb=Math.round(251+(182-251)*t);return 'rgb('+r+','+gg+','+bb+')';};
  const txtcol=v=>{if(v==null)return '#cbd5e1';return (v-lo)/sp>0.55?'#fff':'#0f4a8a';};
  let s='<table class="mtx"><tr><td class="corner">WACC＼增长</td>'+gs.map(gv=>'<th>'+(gv*100).toFixed(1)+'%</th>').join('')+'</tr>';
  ws.forEach((wv,ri)=>{s+='<tr><th>'+(wv*100).toFixed(1)+'%</th>';
    gs.forEach((gv,ci)=>{const v=cells[ri][ci];const cur=(ri===2&&ci===2)?' cur':'';
      s+='<td class="'+cur.trim()+'" style="background:'+shade(v)+';color:'+txtcol(v)+'">'+(v==null?'—':'$'+v.toFixed(0))+'</td>';});
    s+='</tr>';});
  s+='</table>';
  el.innerHTML=s;
  }catch(e){el.innerHTML='<div style="color:#b13a3a;font-size:12px">矩阵渲染出错：'+e.message+'</div>';}
}
</script></body></html>"""



if __name__ == "__main__":
    if not (BOCHA_KEY and DEEPSEEK_KEY):
        print("⚠️ 未读到 BOCHA/DEEPSEEK key，业务总结会跳过（估值不受影响）")
    print("启动中… 打开 http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
