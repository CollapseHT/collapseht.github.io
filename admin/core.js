/* =========================================================
   子彈の貓窩 ‧ 後台核心（純字串處理，瀏覽器 / Node 共用）
   - 解析前台 HTML 的 AUTO 標記區塊
   - 將資料渲染回相同結構
   ========================================================= */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.AdminCore = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var MARKERS = {
    updates: ["<!-- AUTO:UPDATES:START -->", "<!-- AUTO:UPDATES:END -->"],
    posts: ["<!-- AUTO:POSTS:START -->", "<!-- AUTO:POSTS:END -->"],
    groupIntro: ["<!-- AUTO:GROUP_INTRO:START -->", "<!-- AUTO:GROUP_INTRO:END -->"],
    featured: ["<!-- AUTO:FEATURED:START -->", "<!-- AUTO:FEATURED:END -->"],
    news: ["<!-- AUTO:GROUP_NEWS:START -->", "<!-- AUTO:GROUP_NEWS:END -->"],
    mainMembers: ["<!-- AUTO:MAIN_MEMBERS:START -->", "<!-- AUTO:MAIN_MEMBERS:END -->"],
    subMembers: ["<!-- AUTO:SUB_MEMBERS:START -->", "<!-- AUTO:SUB_MEMBERS:END -->"]
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function nl2br(value) {
    return esc(value).replace(/\r\n|\r|\n/g, "<br />");
  }

  function decode(value) {
    return String(value)
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&amp;/g, "&");
  }

  // HTML 片段 -> 可編輯純文字（保留 <br> 換行、壓縮排版空白）
  function textOf(fragment) {
    if (fragment == null) return "";
    var sentinel = "\u0000";
    var marked = String(fragment).replace(/<br\s*\/?>/gi, sentinel);
    var stripped = marked.replace(/<[^>]*>/g, "");
    var decoded = decode(stripped).replace(/[ \t\r\n\u00a0]+/g, " ");
    return decoded
      .split(sentinel)
      .map(function (line) {
        return line.trim();
      })
      .join("\n")
      .trim();
  }

  function mmdd(iso) {
    var p = String(iso || "").split("-");
    return p.length === 3 ? p[1] + "." + p[2] : String(iso || "");
  }

  function dotted(iso) {
    var p = String(iso || "").split("-");
    return p.length === 3 ? p[0] + "." + p[1] + "." + p[2] : String(iso || "");
  }

  function getRegion(html, name) {
    var m = MARKERS[name];
    var i = html.indexOf(m[0]);
    var j = html.indexOf(m[1], i + m[0].length);
    if (i < 0 || j < 0) {
      throw new Error("找不到「" + name + "」編輯標記，請先確認前台已更新到最新版。");
    }
    return html.slice(i + m[0].length, j);
  }

  function setRegion(html, name, inner) {
    var m = MARKERS[name];
    var i = html.indexOf(m[0]);
    var j = html.indexOf(m[1], i + m[0].length);
    if (i < 0 || j < 0) {
      throw new Error("找不到「" + name + "」編輯標記，請先確認前台已更新到最新版。");
    }
    var lineStart = html.lastIndexOf("\n", j) + 1;
    var indent = html.slice(lineStart, j);
    if (!/^[ \t]*$/.test(indent)) indent = "";
    return html.slice(0, i + m[0].length) + "\n" + inner + "\n" + indent + html.slice(j);
  }

  /* ---------------- 解析 ---------------- */

  function parseUpdates(html) {
    var region = getRegion(html, "updates");
    var chunks = region.split('<div class="kanban-row"').slice(1);
    return chunks.map(function (chunk) {
      var d = /<time datetime="([^"]*)"/.exec(chunk);
      var t = /<span class="tag-update">([\s\S]*?)<\/span>/.exec(chunk);
      var c = /<span class="col-content"[^>]*>([\s\S]*?)<\/span>/.exec(chunk);
      return {
        date: d ? d[1] : "",
        tag: t ? textOf(t[1]) : "更新",
        text: c ? textOf(c[1]) : ""
      };
    });
  }

  function parsePosts(html) {
    var region = getRegion(html, "posts");
    var chunks = region.split('<article class="blog-card">').slice(1);
    return chunks.map(function (chunk) {
      var title = /<h2 class="blog-title">([\s\S]*?)<\/h2>/.exec(chunk);
      var date = /<time datetime="([^"]*)"/.exec(chunk);
      var cat = /<i class="fa-solid fa-tag"><\/i>\s*([\s\S]*?)<\/span>/.exec(chunk);
      var icon = /<div class="blog-image"[^>]*>\s*<i class="fa-solid fa-([\w-]+)"><\/i>/.exec(chunk);
      var summary = /<p class="blog-summary">([\s\S]*?)<\/p>/.exec(chunk);
      return {
        title: title ? textOf(title[1]) : "",
        date: date ? date[1] : "",
        category: cat ? textOf(cat[1]) : "",
        icon: icon ? icon[1] : "laptop-code",
        summary: summary ? textOf(summary[1]) : ""
      };
    });
  }

  function parseFeatured(html) {
    var region = getRegion(html, "featured");
    var img = /<img[^>]*src="([^"]*)"/.exec(region);
    var alt = /alt="([^"]*)"/.exec(region);
    var title = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(region);
    var text = /<p>([\s\S]*?)<\/p>/.exec(region);
    return {
      image: img ? img[1] : "",
      alt: alt ? decode(alt[1]) : "",
      title: title ? textOf(title[1]) : "",
      text: text ? textOf(text[1]) : ""
    };
  }

  function parseNews(html) {
    var region = getRegion(html, "news");
    var chunks = region.split('<div class="update-item">').slice(1);
    return chunks.map(function (chunk) {
      var d = /<time datetime="([^"]*)"/.exec(chunk);
      var t = /<span class="update-tag">([\s\S]*?)<\/span>/.exec(chunk);
      var rest = chunk.replace(/^[\s\S]*?<span class="update-tag">[\s\S]*?<\/span>/, "");
      var content = rest.replace(/<\/div>[\s\S]*$/, "");
      return {
        date: d ? d[1] : "",
        tag: t ? textOf(t[1]) : "更新",
        text: textOf(content)
      };
    });
  }

  function parseMembers(html, name) {
    var region = getRegion(html, name);
    var chunks = region.split('<article class="member-card').slice(1);
    return chunks.map(function (chunk) {
      var nameBlock = /<h3 class="member-name">([\s\S]*?)<\/h3>/.exec(chunk);
      var tagMatch = nameBlock ? /<span class="member-tag">([\s\S]*?)<\/span>/.exec(nameBlock[1]) : null;
      var nameText = nameBlock
        ? textOf(nameBlock[1].replace(/<span class="member-tag">[\s\S]*?<\/span>/, ""))
        : "";
      var roleMatch = /<p class="member-role">\s*<i class="fa-solid fa-([\w-]+)"><\/i>([\s\S]*?)<\/p>/.exec(chunk);
      var desc = /<p class="member-desc">([\s\S]*?)<\/p>/.exec(chunk);
      var avatar = /<div class="member-avatar">\s*<img[^>]*src="([^"]*)"/.exec(chunk);
      return {
        name: nameText,
        tag: tagMatch ? textOf(tagMatch[1]) : "",
        roleIcon: roleMatch ? roleMatch[1] : "star",
        role: roleMatch ? textOf(roleMatch[2]).replace(/^主修：\s*/, "") : "",
        desc: desc ? textOf(desc[1]) : "",
        avatar: avatar ? avatar[1] : ""
      };
    });
  }

  function parseAll(files) {
    return {
      updates: parseUpdates(files.update),
      posts: parsePosts(files.blog),
      group: {
        intro: textOf(getRegion(files.group, "groupIntro")),
        featured: parseFeatured(files.group),
        news: parseNews(files.group),
        main: parseMembers(files.group, "mainMembers"),
        sub: parseMembers(files.group, "subMembers")
      }
    };
  }

  /* ---------------- 渲染 ---------------- */

  function renderUpdates(list) {
    return (list || []).map(function (item) {
      return '            <div class="kanban-row" role="row">\n' +
        '              <span class="col-date" role="cell"><time datetime="' + esc(item.date) + '">' + mmdd(item.date) + "</time></span>\n" +
        '              <span class="col-tag" role="cell"><span class="tag-update">' + esc(item.tag || "更新") + "</span></span>\n" +
        '              <span class="col-content" role="cell">' + nl2br(item.text) + "</span>\n" +
        "            </div>";
    }).join("\n");
  }

  function renderPosts(list) {
    return (list || []).map(function (item) {
      return '          <article class="blog-card">\n' +
        '            <div class="blog-image" aria-hidden="true">\n' +
        '              <i class="fa-solid fa-' + esc(item.icon || "laptop-code") + '"></i>\n' +
        "            </div>\n" +
        '            <div class="blog-content">\n' +
        '              <h2 class="blog-title">' + esc(item.title) + "</h2>\n" +
        '              <div class="blog-meta">\n' +
        '                <span><i class="fa-regular fa-calendar-alt"></i> <time datetime="' + esc(item.date) + '">' + dotted(item.date) + "</time></span>\n" +
        '                <span><i class="fa-solid fa-tag"></i> ' + esc(item.category) + "</span>\n" +
        "              </div>\n" +
        '              <p class="blog-summary">\n' +
        "                " + nl2br(item.summary) + "\n" +
        "              </p>\n" +
        "            </div>\n" +
        "          </article>";
    }).join("\n");
  }

  function renderIntro(text) {
    return '            <p>\n              ' + nl2br(text) + "\n            </p>";
  }

  function renderFeatured(featured) {
    return '          <div class="media-image">\n' +
      "            <img\n" +
      '              src="' + esc(featured.image) + '"\n' +
      '              alt="' + esc(featured.alt) + '"\n' +
      '              loading="lazy"\n' +
      '              decoding="async"\n' +
      "            />\n" +
      "          </div>\n" +
      '          <div class="media-content">\n' +
      '            <h2 id="group-featured"><i class="fa-solid fa-image"></i> ' + esc(featured.title) + "</h2>\n" +
      "            <p>" + nl2br(featured.text) + "</p>\n" +
      "          </div>";
  }

  function renderNews(list) {
    return (list || []).map(function (item) {
      return '            <div class="update-item">\n' +
        '              <div class="update-date"><time datetime="' + esc(item.date) + '">' + dotted(item.date) + "</time></div>\n" +
        '              <div class="update-content">\n' +
        '                <span class="update-tag">' + esc(item.tag || "更新") + "</span>\n" +
        "                " + nl2br(item.text) + "\n" +
        "              </div>\n" +
        "            </div>";
    }).join("\n");
  }

  function renderMembers(list, isSub) {
    var cardClass = isSub ? "member-card sub-member" : "member-card";
    return (list || []).map(function (m) {
      var tag = m.tag ? ' <span class="member-tag">' + esc(m.tag) + "</span>" : "";
      return '          <article class="' + cardClass + '">\n' +
        '            <div class="member-avatar">\n' +
        '              <img src="' + esc(m.avatar) + '" alt="' + esc(m.name) + '的頭像" width="120" height="120" loading="lazy" decoding="async" />\n' +
        "            </div>\n" +
        '            <div class="member-info">\n' +
        '              <h3 class="member-name">' + esc(m.name) + tag + "</h3>\n" +
        '              <p class="member-role"><i class="fa-solid fa-' + esc(m.roleIcon || "star") + '"></i> 主修：' + esc(m.role) + "</p>\n" +
        '              <p class="member-desc">' + nl2br(m.desc) + "</p>\n" +
        "            </div>\n" +
        "          </article>";
    }).join("\n");
  }

  function buildAll(files, data) {
    return {
      update: setRegion(files.update, "updates", renderUpdates(data.updates)),
      blog: setRegion(files.blog, "posts", renderPosts(data.posts)),
      group: (function () {
        var html = setRegion(files.group, "groupIntro", renderIntro(data.group.intro));
        html = setRegion(html, "featured", renderFeatured(data.group.featured));
        html = setRegion(html, "news", renderNews(data.group.news));
        html = setRegion(html, "mainMembers", renderMembers(data.group.main, false));
        html = setRegion(html, "subMembers", renderMembers(data.group.sub, true));
        return html;
      })()
    };
  }

  function validate(data) {
    var errors = [];
    (data.updates || []).forEach(function (u, i) {
      if (!u.date) errors.push("更新歷程第 " + (i + 1) + " 列缺少日期");
      if (!u.text || !u.text.trim()) errors.push("更新歷程第 " + (i + 1) + " 列缺少內容");
    });
    (data.posts || []).forEach(function (p, i) {
      if (!p.title || !p.title.trim()) errors.push("部落格第 " + (i + 1) + " 篇缺少標題");
      if (!p.date) errors.push("部落格第 " + (i + 1) + " 篇缺少日期");
    });
    var g = data.group || {};
    if (!g.featured || !g.featured.image) errors.push("放浪團精選缺少圖片路徑");
    (g.news || []).forEach(function (n, i) {
      if (!n.date) errors.push("放浪團近況第 " + (i + 1) + " 則缺少日期");
      if (!n.text || !n.text.trim()) errors.push("放浪團近況第 " + (i + 1) + " 則缺少內容");
    });
    (g.main || []).concat(g.sub || []).forEach(function (m, i) {
      if (!m.name || !m.name.trim()) errors.push("成員第 " + (i + 1) + " 位缺少名字");
    });
    return errors;
  }

  return {
    MARKERS: MARKERS,
    esc: esc,
    textOf: textOf,
    parseAll: parseAll,
    buildAll: buildAll,
    validate: validate,
    renderUpdates: renderUpdates,
    renderPosts: renderPosts,
    renderIntro: renderIntro,
    renderFeatured: renderFeatured,
    renderNews: renderNews,
    renderMembers: renderMembers
  };
});
