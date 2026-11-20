/* =========================================================
   Legend 頁面設定 ‧ 後台核心（瀏覽器 / Node 共用）
   - 從 legend/*.html 讀取 data-legend-config 的 JSON
   - 依同一份資料重新產生頁面內容（只換 AUTO 標記之間）
   ========================================================= */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.LegendCore = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var PAGES = {
    legendIndex: { key: "index", label: "資源包", marker: "LEGEND_INDEX" },
    legendBoxes: { key: "boxes", label: "箱子活動", marker: "LEGEND_BOXES" },
    legendFlips: { key: "flips", label: "翻牌活動", marker: "LEGEND_FLIPS" },
    legendRules: { key: "rules", label: "伺服器規則", marker: "LEGEND_RULES" }
  };

  var CONFIG_OPEN = '<script type="application/json" data-legend-config>';
  var CONFIG_CLOSE = "</" + "script>";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* 支援 [文字](連結)、`程式碼` 與換行 */
  function rich(value) {
    var text = esc(value);
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (all, label, href) {
      return '<a href="' + href + '" target="_blank" rel="noopener">' + label + "</a>";
    });
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    return text.replace(/\r\n|\r|\n/g, "<br>");
  }

  function markers(key) {
    var page = PAGES[key];
    return ["<!-- AUTO:" + page.marker + ":START -->", "<!-- AUTO:" + page.marker + ":END -->"];
  }

  function getRegion(html, key) {
    var m = markers(key);
    var i = html.indexOf(m[0]);
    var j = html.indexOf(m[1], i < 0 ? 0 : i + m[0].length);
    if (i < 0 || j < 0) return null;
    return html.slice(i + m[0].length, j);
  }

  function setRegion(html, key, inner) {
    var m = markers(key);
    var i = html.indexOf(m[0]);
    var j = html.indexOf(m[1], i < 0 ? 0 : i + m[0].length);
    if (i < 0 || j < 0) {
      throw new Error("找不到 " + key + " 的 AUTO 標記，請先確認 Legend 頁面已更新到最新版。");
    }
    var lineStart = html.lastIndexOf("\n", j) + 1;
    var indent = html.slice(lineStart, j);
    if (!/^[ \t]*$/.test(indent)) indent = "";
    return html.slice(0, i + m[0].length) + "\n" + inner + "\n" + indent + html.slice(j);
  }

  function configBlock(data) {
    var json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
    return "    " + CONFIG_OPEN + "\n" +
      json.split("\n").map(function (line) { return "      " + line; }).join("\n") + "\n" +
      "    " + CONFIG_CLOSE;
  }

  function readConfig(html, key) {
    var region = getRegion(html, key);
    if (!region) return null;
    var start = region.indexOf("data-legend-config>");
    if (start < 0) return null;
    var body = region.slice(start + "data-legend-config>".length);
    var end = body.indexOf(CONFIG_CLOSE);
    if (end < 0) return null;
    try {
      return JSON.parse(body.slice(0, end).trim());
    } catch (error) {
      return null;
    }
  }

  /* ---------------- 共用片段 ---------------- */
  function cardOpen(id, title) {
    return [
      '    <section class="card" id="' + id + '" aria-labelledby="' + id + '-title">',
      '      <h2 class="card-title" id="' + id + '-title">' + esc(title) + "</h2>"
    ];
  }

  function audioBlock(item) {
    var type = item.type || "audio/wav";
    return [
      '      <div class="audio-group">',
      "        <h3>" + esc(item.title) + "</h3>",
      '        <div class="audio-pair">',
      '          <div class="audio-item">',
      '            <span class="audio-label">原檔案</span>',
      '            <audio controls controlslist="nodownload">',
      '              <source src="' + esc(item.old) + '" type="' + esc(type) + '">',
      "              你的瀏覽器不支援 audio 播放。",
      "            </audio>",
      "          </div>",
      '          <div class="audio-item is-new">',
      '            <span class="audio-label">新檔案</span>',
      '            <audio controls controlslist="nodownload">',
      '              <source src="' + esc(item.next || item["new"]) + '" type="' + esc(type) + '">',
      "              你的瀏覽器不支援 audio 播放。",
      "            </audio>",
      "          </div>",
      "        </div>",
      "      </div>"
    ].join("\n");
  }

  /* ---------------- 資源包頁 ---------------- */
  function renderIndex(d) {
    var out = [];
    out.push('    <section class="hero">');
    out.push('      <p class="eyebrow">' + esc(d.eyebrow) + "</p>");
    out.push("      <h1>" + esc(d.title) + "</h1>");
    out.push('      <p class="lead">' + esc(d.lead) + "</p>");
    out.push('      <p class="pill">1.6 魔王服 IP：<code>' + esc(d.ip) + "</code></p>");
    if ((d.logos || []).length) {
      out.push('      <div class="logo-strip">');
      d.logos.forEach(function (src) {
        out.push('        <img src="' + esc(src) + '" alt="Legend 伺服器圖片" loading="lazy" decoding="async">');
      });
      out.push("      </div>");
    }
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="links" aria-labelledby="links-title">');
    out.push('      <h2 class="card-title" id="links-title">' + esc(d.linksTitle) + "</h2>");
    out.push('      <p class="card-sub">' + esc(d.linksSub) + "</p>");
    out.push('      <div class="link-grid">');
    (d.links || []).forEach(function (link) {
      var external = /^https?:/i.test(link.href || "");
      out.push('        <a class="link-card" href="' + esc(link.href) + '"' + (external ? ' target="_blank" rel="noopener"' : "") + ">");
      out.push('          <span class="link-card-title">' + esc(link.title) + "</span>");
      out.push('          <span class="link-card-note">' + esc(link.note) + "</span>");
      out.push('          <span class="btn ghost small">' + esc(link.button || "前往") + "</span>");
      out.push("        </a>");
    });
    out.push("      </div>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="downloads" aria-labelledby="downloads-title">');
    out.push('      <h2 class="card-title" id="downloads-title">' + esc(d.downloadsTitle) + "</h2>");
    out.push('      <p class="notice">' + rich(d.downloadsNotice) + "</p>");
    out.push('      <div class="dl-grid">');
    (d.downloads || []).forEach(function (item) {
      out.push('        <div class="dl-item">');
      out.push('          <p class="dl-name">' + esc(item.name) + "</p>");
      out.push('          <p class="dl-meta">' + esc(item.meta) + "</p>");
      if (item.action === "password") {
        out.push('          <button class="btn small" type="button" onclick="requestProtectedDownload()">' + esc(item.label || "下載") + "</button>");
      } else {
        out.push('          <a class="btn small" href="' + esc(item.href) + '" target="_blank" rel="noopener">' + esc(item.label || "下載") + "</a>");
      }
      out.push("        </div>");
    });
    out.push("      </div>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="usage" aria-labelledby="usage-title">');
    out.push('      <h2 class="card-title" id="usage-title">' + esc(d.usageTitle) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.usageIntro) + "</p>");
    out.push('      <div class="steps">');
    out.push('        <div class="step">');
    out.push('          <span class="step-num">1</span>');
    out.push("          <div>");
    out.push("            <p>" + rich(d.usageStep) + "</p>");
    out.push("            <pre><code>" + esc(d.usagePath) + "</code></pre>");
    out.push("          </div>");
    out.push("        </div>");
    out.push("      </div>");
    out.push('      <div class="subcard">');
    out.push("        <h3>" + esc(d.usageAltTitle) + "</h3>");
    out.push('        <div class="steps">');
    out.push('          <div class="step">');
    out.push('            <span class="step-num">1</span>');
    out.push("            <div><p>" + rich(d.usageAlt1) + "</p></div>");
    out.push("          </div>");
    out.push('          <div class="step">');
    out.push('            <span class="step-num">2</span>');
    out.push("            <div><p>" + rich(d.usageAlt2) + "</p></div>");
    out.push("          </div>");
    out.push("        </div>");
    out.push("      </div>");
    if (d.shot) {
      out.push('      <figure class="shot">');
      out.push('        <img alt="' + esc(d.shotAlt || "Legend 遊戲截圖") + '" src="' + esc(d.shot) + '" loading="lazy" decoding="async">');
      out.push("      </figure>");
    }
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="audio" aria-labelledby="audio-title">');
    out.push('      <h2 class="card-title" id="audio-title">' + esc(d.audioTitle) + "</h2>");
    out.push('      <p class="card-sub">' + esc(d.audioSub) + "</p>");
    (d.audio || []).forEach(function (item) { out.push(audioBlock(item)); });
    out.push("    </section>");

    out.push("");
    out.push('    <div class="to-top"><a class="btn ghost small" href="#top">回到頂層</a></div>');
    return out.join("\n");
  }

  /* ---------------- 箱子活動頁 ---------------- */
  function renderBoxes(d) {
    var out = [];
    out.push('    <section class="hero">');
    out.push('      <p class="eyebrow">' + esc(d.eyebrow) + "</p>");
    out.push("      <h1>" + esc(d.title) + "</h1>");
    out.push('      <p class="lead">' + esc(d.lead) + "</p>");
    out.push('      <p class="pill">1.6 魔王服 IP：<code>' + esc(d.ip) + "</code></p>");
    if ((d.chips || []).length) {
      out.push('      <div class="chips">');
      d.chips.forEach(function (chip) {
        out.push('        <a class="chip" href="' + esc(chip.href) + '">' + esc(chip.label) + "</a>");
      });
      out.push("      </div>");
    }
    out.push('      <p class="notice">' + rich(d.notice) + "</p>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="info" aria-labelledby="info-title">');
    out.push('      <h2 class="card-title" id="info-title">' + esc(d.infoTitle) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.infoSub) + "</p>");
    out.push('      <p class="pill">活動時間：<code>' + esc(d.infoTime) + "</code></p>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="get" aria-labelledby="get-title">');
    out.push('      <h2 class="card-title" id="get-title">' + esc(d.getTitle) + "</h2>");
    out.push('      <div class="table-wrap">');
    out.push('        <table class="center">');
    out.push("          <thead>");
    out.push("            <tr><th>事項</th><th>最少</th><th>最多</th></tr>");
    out.push("          </thead>");
    out.push("          <tbody>");
    (d.fragments || []).forEach(function (row) {
      var label = esc(row.label);
      if (row.anchor) {
        label += ' <a href="#' + esc(row.anchor) + '">' + esc(row.anchorText || "【?】") + "</a>";
      }
      out.push("            <tr><td>" + label + "</td><td>" + esc(row.min) + "</td><td>" + esc(row.max) + "</td></tr>");
    });
    out.push("          </tbody>");
    out.push("        </table>");
    out.push("      </div>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="box1" aria-labelledby="box1-title">');
    out.push('      <h2 class="card-title" id="box1-title">' + esc(d.box1Title) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.box1Sub) + "</p>");
    out.push('      <div class="chest-grid">');
    (d.chests || []).forEach(function (chest) {
      out.push('        <article class="chest">');
      out.push("          <h3>" + esc(chest.name) + "</h3>");
      var need = String(chest.need == null ? "" : chest.need);
      if (need && need.indexOf("碎片需求") !== 0) need = "碎片需求：" + need;
      var pre = String(chest.pre == null ? "" : chest.pre);
      if (pre && pre.indexOf("前置條件") !== 0) pre = "前置條件：" + pre;
      out.push('          <p class="chest-meta">' + esc(need) + (pre ? "<br>" + esc(pre) : "") + "</p>");
      out.push('          <ul class="reward-list">');
      (chest.rewards || []).forEach(function (reward) {
        out.push('            <li><span>' + esc(reward.name) + '</span><span class="pct">' + esc(reward.pct) + "</span></li>");
      });
      out.push("          </ul>");
      out.push("        </article>");
    });
    out.push("      </div>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="box2" aria-labelledby="box2-title">');
    out.push('      <h2 class="card-title" id="box2-title">' + esc(d.box2Title) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.box2Sub) + "</p>");
    (d.milestones || []).forEach(function (group) {
      out.push('      <div class="table-wrap">');
      out.push('        <table class="center">');
      out.push('          <caption class="table-caption">' + esc(group.name) + " ‧ " + esc(group.meta) + "</caption>");
      out.push("          <thead><tr><th>獎勵</th><th>累計次數</th></tr></thead>");
      out.push("          <tbody>");
      (group.rows || []).forEach(function (row) {
        out.push("            <tr><td>" + esc(row.reward) + "</td><td>" + esc(row.count) + "</td></tr>");
      });
      out.push("          </tbody>");
      out.push("        </table>");
      out.push("      </div>");
    });
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="core-event" aria-labelledby="core-title">');
    out.push('      <h2 class="card-title" id="core-title">' + esc(d.coreTitle) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.coreSub) + "</p>");
    out.push('      <div class="mode-grid">');
    (d.modes || []).forEach(function (mode) {
      out.push('        <article class="mode">');
      out.push("          <h3>" + esc(mode.name) + "</h3>");
      out.push("          <p>" + rich(mode.desc) + "</p>");
      out.push('          <div class="mode-meta">');
      out.push("            <span>魔王人數：" + esc(mode.boss) + "</span>");
      out.push('            <span>碎片期待度 <span class="stars">' + esc(mode.stars) + "</span></span>");
      out.push("          </div>");
      out.push("        </article>");
    });
    out.push("      </div>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="time-event" aria-labelledby="time-title">');
    out.push('      <h2 class="card-title" id="time-title">' + esc(d.timeTitle) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.timeSub) + "</p>");
    if ((d.examples || []).length) {
      out.push('      <div class="subcard">');
      out.push("        <h3>" + esc(d.examplesTitle || "發放舉例") + "</h3>");
      out.push('        <div class="steps">');
      d.examples.forEach(function (example, index) {
        out.push('          <div class="step">');
        out.push('            <span class="step-num">' + (index + 1) + "</span>");
        out.push("            <div><p>" + rich(example) + "</p></div>");
        out.push("          </div>");
      });
      out.push("        </div>");
      out.push("      </div>");
    }
    if ((d.maps || []).length) {
      out.push('      <div class="table-wrap">');
      out.push('        <table class="center">');
      out.push('          <caption class="table-caption">' + esc(d.mapTitle) + "</caption>");
      out.push("          <thead>");
      out.push('            <tr><th>' + rich(d.fastLabel) + "</th><th>" + rich(d.blockedLabel) + "</th></tr>");
      out.push("          </thead>");
      out.push("          <tbody>");
      d.maps.forEach(function (map) {
        out.push("            <tr><td>" + esc(map.fast) + "</td><td>" + esc(map.blocked) + "</td></tr>");
      });
      out.push("          </tbody>");
      out.push("        </table>");
      out.push("      </div>");
    }
    out.push("    </section>");

    out.push("");
    out.push('    <div class="to-top"><a class="btn ghost small" href="#top">回到頂層</a></div>');
    return out.join("\n");
  }

  /* ---------------- 翻牌活動頁 ---------------- */
  function renderFlips(d) {
    var out = [];
    out.push('    <section class="hero">');
    out.push('      <p class="eyebrow">' + esc(d.eyebrow) + "</p>");
    out.push("      <h1>" + esc(d.title) + "</h1>");
    out.push('      <p class="lead">' + esc(d.lead) + "</p>");
    out.push('      <p class="pill">活動時間：<code>' + esc(d.time) + "</code></p>");
    out.push('      <p class="notice">' + rich(d.notice) + "</p>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="ways" aria-labelledby="ways-title">');
    out.push('      <h2 class="card-title" id="ways-title">' + esc(d.waysTitle) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.waysSub) + "</p>");
    out.push('      <div class="mode-grid four">');
    (d.ways || []).forEach(function (way) {
      out.push('        <div class="mode"><h3>' + esc(way) + "</h3></div>");
    });
    out.push("      </div>");
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="howto" aria-labelledby="howto-title">');
    out.push('      <h2 class="card-title" id="howto-title">' + esc(d.howtoTitle) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.howtoSub) + "</p>");
    out.push('      <a class="btn ghost small" href="#minigame">直接試玩 ↓</a>');
    out.push("    </section>");

    out.push("");
    out.push('    <section class="card" id="minigame" aria-labelledby="minigame-title">');
    out.push('      <h2 class="card-title" id="minigame-title">' + esc(d.gameTitle) + "</h2>");
    out.push('      <p class="card-sub">' + rich(d.gameSub) + "</p>");
    out.push("");
    out.push('      <div class="game-status" id="gameStatus" role="status" aria-live="polite">狀態：遊戲進行中</div>');
    out.push('      <div class="game-stats">');
    out.push('        <div id="moveCount">嘗試次數：<span>0</span></div>');
    out.push('        <div id="flipCount">翻牌次數：<span>0</span></div>');
    out.push("      </div>");
    out.push('      <div class="board-scroll">');
    out.push('        <div id="board"></div>');
    out.push("      </div>");
    out.push('      <button class="btn" id="resetBtn" type="button">重新洗牌</button>');
    out.push("    </section>");

    out.push("");
    out.push('    <div class="to-top"><a class="btn ghost small" href="#top">回到頂層</a></div>');
    return out.join("\n");
  }

  /* ---------------- 伺服器規則頁 ---------------- */
  var ROMAN = ["（i）", "（ii）", "（iii）", "（iv）", "（v）", "（vi）", "（vii）", "（viii）"];

  function renderRule(rule, pad, cls) {
    var out = [];
    out.push(pad + '<article class="' + cls + '">');
    out.push(pad + "  <h3>" + (rule.no ? '<span class="rule-no">' + esc(rule.no) + "</span>" : "") + esc(rule.title) + "</h3>");
    if (rule.desc) out.push(pad + "  <p>" + rich(rule.desc) + "</p>");
    if ((rule.list || []).length) {
      out.push(pad + '  <ul class="rule-list">' + rule.list.map(function (li) { return "<li>" + rich(li) + "</li>"; }).join("") + "</ul>");
    }
    if (rule.penalty) out.push(pad + '  <p class="penalty"><strong>罰則</strong> ' + rich(rule.penalty) + "</p>");
    if ((rule.remark || []).length) {
      out.push(pad + '  <p class="rule-remark"><strong>備註</strong>' +
        rule.remark.map(function (item, index) { return (ROMAN[index] || "（" + (index + 1) + "）") + rich(item); }).join("｜") + "</p>");
    }
    if ((rule.subs || []).length) {
      out.push(pad + '  <div class="rule-subs">');
      rule.subs.forEach(function (sub) { out.push(renderRule(sub, pad + "    ", "rule-sub")); });
      out.push(pad + "  </div>");
    }
    out.push(pad + "</article>");
    return out.join("\n");
  }

  function renderRules(d) {
    var out = [];
    out.push('    <section class="hero">');
    out.push('      <p class="eyebrow">' + esc(d.eyebrow) + "</p>");
    out.push("      <h1>" + esc(d.title) + "</h1>");
    out.push('      <p class="lead">' + esc(d.lead) + "</p>");
    out.push('      <p class="notice">' + rich(d.notice) + "</p>");
    if ((d.chapters || []).length) {
      out.push('      <div class="chips">');
      d.chapters.forEach(function (chapter, index) {
        out.push('        <a class="chip" href="#' + esc(chapter.id || "ch" + (index + 1)) + '">' + esc(chapter.chip || chapter.title) + "</a>");
      });
      out.push("      </div>");
    }
    out.push("    </section>");

    (d.chapters || []).forEach(function (chapter, index) {
      var id = chapter.id || "ch" + (index + 1);
      out.push("");
      out.push('    <section class="card" id="' + esc(id) + '" aria-labelledby="' + esc(id) + '-title">');
      out.push('      <h2 class="card-title" id="' + esc(id) + '-title">' + esc(chapter.title) + "</h2>");
      if (chapter.note) out.push('      <p class="card-sub">' + rich(chapter.note) + "</p>");
      out.push('      <div class="rules">');
      (chapter.rules || []).forEach(function (rule) { out.push(renderRule(rule, "        ", "rule")); });
      out.push("      </div>");
      out.push("    </section>");
    });

    out.push("");
    out.push('    <div class="to-top"><a class="btn ghost small" href="#top">回到頂層</a></div>');
    return out.join("\n");
  }

  /* ---------------- 對外 API ---------------- */
  function render(key, data) {
    if (key === "legendIndex") return renderIndex(data);
    if (key === "legendBoxes") return renderBoxes(data);
    if (key === "legendFlips") return renderFlips(data);
    if (key === "legendRules") return renderRules(data);
    return "";
  }

  function parse(files) {
    var out = {};
    Object.keys(PAGES).forEach(function (key) {
      var page = PAGES[key];
      out[page.key] = files[key] ? readConfig(files[key], key) : null;
    });
    return out;
  }

  function build(files, data) {
    var out = {};
    Object.keys(PAGES).forEach(function (key) {
      var page = PAGES[key];
      var config = data && data[page.key];
      if (!config || !files[key]) return;
      out[key] = setRegion(files[key], key, configBlock(config) + "\n" + render(key, config));
    });
    return out;
  }

  function validate(data) {
    var errors = [];
    if (!data) return errors;
    var boxes = data.boxes || {};
    (boxes.chests || []).forEach(function (chest, index) {
      if (!chest.name || !String(chest.name).trim()) errors.push("Legend 箱子活動第 " + (index + 1) + " 個箱子缺少名稱");
      if (!(chest.rewards || []).length) errors.push("Legend 箱子活動「" + (chest.name || index + 1) + "」沒有獎勵項目");
    });
    (boxes.milestones || []).forEach(function (group, index) {
      if (!group.name || !String(group.name).trim()) errors.push("Legend 里程碑第 " + (index + 1) + " 組缺少名稱");
      if (!(group.rows || []).length) errors.push("Legend 里程碑「" + (group.name || index + 1) + "」沒有獎勵列");
    });
    (boxes.modes || []).forEach(function (mode, index) {
      if (!mode.name || !String(mode.name).trim()) errors.push("Legend 核心活動第 " + (index + 1) + " 個模式缺少名稱");
    });
    var rules = data.rules || {};
    (rules.chapters || []).forEach(function (chapter, index) {
      if (!chapter.title || !String(chapter.title).trim()) errors.push("Legend 規則第 " + (index + 1) + " 章缺少標題");
      if (!(chapter.rules || []).length) errors.push("Legend 規則「" + (chapter.title || index + 1) + "」沒有條文");
      (chapter.rules || []).forEach(function (rule, ruleIndex) {
        if (!rule.title || !String(rule.title).trim()) errors.push("Legend 規則第 " + (index + 1) + " 章第 " + (ruleIndex + 1) + " 條缺少標題");
      });
    });
    return errors;
  }

  return {
    PAGES: PAGES,
    esc: esc,
    rich: rich,
    render: render,
    parse: parse,
    build: build,
    validate: validate
  };
});
