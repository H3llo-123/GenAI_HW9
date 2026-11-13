/**
 * 個人私藏餐廳攻略 - 核心邏輯
 * 適用環境：純靜態網頁（file:// 與 GitHub Pages）
 * 禁止使用 fetch, ES Modules, .json 載入
 */

(function () {
  'use strict';

  // 工具函式：HTML 逸出防止 XSS
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 工具函式：去除空白並轉小寫，供不分大小寫與忽略空白搜尋
  function normalizeText(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/\s+/g, '');
  }

  /* ========================================================
   * 首頁邏輯 (index.html)
   * ======================================================== */
  function initHomePage() {
    var gridEl = document.getElementById('restaurantGrid');
    if (!gridEl) return;

    var restaurants = window.RESTAURANTS || [];
    var taxonomy = window.TAXONOMY || {
      districts: [],
      cuisines: [],
      scenarios: [],
      priceBands: []
    };

    var searchInput = document.getElementById('searchInput');
    var districtSelect = document.getElementById('districtSelect');
    var zoneSelect = document.getElementById('zoneSelect');
    var sortSelect = document.getElementById('sortSelect');
    var cuisineChipsEl = document.getElementById('cuisineChips');
    var scenarioChipsEl = document.getElementById('scenarioChips');
    var clearFiltersBtn = document.getElementById('clearFiltersBtn');
    var emptyResetBtn = document.getElementById('emptyResetBtn');
    var resultCountEl = document.getElementById('resultCount');
    var emptyStateEl = document.getElementById('emptyState');
    var emptyMessageEl = document.getElementById('emptyMessage');
    var paginationEl = document.getElementById('pagination');
    var prevPageBtn = document.getElementById('prevPageBtn');
    var nextPageBtn = document.getElementById('nextPageBtn');
    var pageInfoEl = document.getElementById('pageInfo');

    var selectedCuisines = [];
    var selectedScenarios = [];
    var currentPage = 1;
    var ITEMS_PER_PAGE = 12;

    // 1. 初始化行政區與商圈選單
    function populateDistricts() {
      districtSelect.innerHTML = '<option value="">全部行政區</option>';
      taxonomy.districts.forEach(function (d) {
        var opt = document.createElement('option');
        opt.value = d.code;
        opt.textContent = d.name;
        districtSelect.appendChild(opt);
      });
      populateZones('');
    }

    function populateZones(districtCode) {
      zoneSelect.innerHTML = '<option value="">全部商圈</option>';

      var zonesToShow = [];
      if (districtCode) {
        var targetDistrict = taxonomy.districts.find(function (d) {
          return d.code === districtCode;
        });
        if (targetDistrict && targetDistrict.zones) {
          zonesToShow = targetDistrict.zones;
        }
      } else {
        // 未選特定行政區時，列出所有商圈供直接挑選
        taxonomy.districts.forEach(function (d) {
          if (Array.isArray(d.zones)) {
            d.zones.forEach(function (z) {
              zonesToShow.push(z);
            });
          }
        });
      }

      zonesToShow.forEach(function (z) {
        var opt = document.createElement('option');
        opt.value = z.code;
        opt.textContent = z.name;
        zoneSelect.appendChild(opt);
      });

      zoneSelect.disabled = false;
    }

    // 2. 初始化料理類型與用餐情境標籤 (可複選，同一維度多選為「或」)
    function populateChips() {
      cuisineChipsEl.innerHTML = '';
      taxonomy.cuisines.forEach(function (c) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-btn';
        btn.textContent = c;
        btn.dataset.value = c;
        btn.addEventListener('click', function () {
          toggleChip(btn, selectedCuisines, c);
        });
        cuisineChipsEl.appendChild(btn);
      });

      scenarioChipsEl.innerHTML = '';
      taxonomy.scenarios.forEach(function (s) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-btn';
        btn.textContent = s;
        btn.dataset.value = s;
        btn.addEventListener('click', function () {
          toggleChip(btn, selectedScenarios, s);
        });
        scenarioChipsEl.appendChild(btn);
      });
    }

    function toggleChip(buttonEl, array, value) {
      var index = array.indexOf(value);
      if (index > -1) {
        array.splice(index, 1);
        buttonEl.classList.remove('active');
      } else {
        array.push(value);
        buttonEl.classList.add('active');
      }
      currentPage = 1;
      applyFiltersAndRender();
    }

    // 3. 搜尋比對：店名、地區、菜色、標籤
    function matchesSearch(item, query) {
      if (!query) return true;
      var q = normalizeText(query);

      // (1) 店名（中文名與英文名）
      if (normalizeText(item.name).indexOf(q) !== -1) return true;
      if (item.nameEn && normalizeText(item.nameEn).indexOf(q) !== -1) return true;

      // (2) 地區（行政區名稱、商圈名稱）
      if (item.district && item.district.name && normalizeText(item.district.name).indexOf(q) !== -1) return true;
      if (item.zone && item.zone.name && normalizeText(item.zone.name).indexOf(q) !== -1) return true;

      // (3) 菜色（dishes 欄位）
      if (Array.isArray(item.dishes)) {
        var dishMatch = item.dishes.some(function (dish) {
          return normalizeText(dish).indexOf(q) !== -1;
        });
        if (dishMatch) return true;
      }

      // (4) 標籤（tags、料理類型、用餐情境）
      if (Array.isArray(item.tags)) {
        var tagMatch = item.tags.some(function (tag) {
          return normalizeText(tag).indexOf(q) !== -1;
        });
        if (tagMatch) return true;
      }
      if (Array.isArray(item.cuisines)) {
        var cuisineMatch = item.cuisines.some(function (cuisine) {
          return normalizeText(cuisine).indexOf(q) !== -1;
        });
        if (cuisineMatch) return true;
      }
      if (Array.isArray(item.scenarios)) {
        var scenarioMatch = item.scenarios.some(function (scenario) {
          return normalizeText(scenario).indexOf(q) !== -1;
        });
        if (scenarioMatch) return true;
      }

      return false;
    }

    // 4. 篩選與排序
    function getFilteredAndSorted() {
      var query = searchInput.value.trim();
      var selDistrict = districtSelect.value;
      var selZone = zoneSelect.value;
      var sortMode = sortSelect.value;

      var filtered = restaurants.filter(function (item) {
        // 搜尋比對
        if (!matchesSearch(item, query)) return false;

        // 地區第一層：行政區
        if (selDistrict && item.district && item.district.code !== selDistrict) {
          return false;
        }

        // 地區第二層：商圈
        if (selZone && item.zone && item.zone.code !== selZone) {
          return false;
        }

        // 料理類型（同維度為或）
        if (selectedCuisines.length > 0) {
          var hasCuisine = selectedCuisines.some(function (c) {
            return Array.isArray(item.cuisines) && item.cuisines.indexOf(c) !== -1;
          });
          if (!hasCuisine) return false;
        }

        // 用餐情境（同維度為或）
        if (selectedScenarios.length > 0) {
          var hasScenario = selectedScenarios.some(function (s) {
            return Array.isArray(item.scenarios) && item.scenarios.indexOf(s) !== -1;
          });
          if (!hasScenario) return false;
        }

        return true;
      });

      // 排序（僅兩種＋預設最新收錄）
      filtered.sort(function (a, b) {
        var idA = Number(a.id) || 0;
        var idB = Number(b.id) || 0;

        if (sortMode === 'price-asc') {
          var priceA = Number(a.avgPrice) || 0;
          var priceB = Number(b.avgPrice) || 0;
          if (priceA !== priceB) {
            return priceA - priceB;
          }
          return idB - idA; // 排序值相同時，編號較大者在前
        } else if (sortMode === 'score-desc') {
          var scoreA = a.scores && typeof a.scores.total === 'number' ? a.scores.total : 0;
          var scoreB = b.scores && typeof b.scores.total === 'number' ? b.scores.total : 0;
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return idB - idA; // 排序值相同時，編號較大者在前
        } else {
          // 預設最新收錄（編號大到小）
          return idB - idA;
        }
      });

      return filtered;
    }

    // 5. 渲染卡片
    function renderCard(item) {
      var coverSrc = item.cover || '';
      var totalScore = item.scores && typeof item.scores.total === 'number'
        ? item.scores.total.toFixed(1)
        : '-';
      var districtName = item.district ? item.district.name : '';
      var zoneName = item.zone ? item.zone.name : '';
      var cuisineTags = Array.isArray(item.cuisines)
        ? item.cuisines.map(function (c) {
            return '<span class="tag">' + escapeHtml(c) + '</span>';
          }).join('')
        : '';

      return (
        '<a href="' + escapeHtml(item.url) + '" class="card">' +
          '<img src="' + escapeHtml(coverSrc) + '" alt="' + escapeHtml(item.name) + ' 封面圖" class="card-cover" loading="lazy">' +
          '<div class="card-body">' +
            '<div class="card-header-row">' +
              '<h3 class="card-title">' + escapeHtml(item.name) + '</h3>' +
              '<span class="score"><span class="score-num">' + escapeHtml(totalScore) + '</span><span class="score-max"> / 5.0</span></span>' +
            '</div>' +
            '<div class="card-tags">' +
              '<span class="tag">' + escapeHtml(districtName) + '・' + escapeHtml(zoneName) + '</span>' +
              cuisineTags +
              '<span class="tag">' + escapeHtml(item.priceTier || '$') + '（約' + escapeHtml(item.avgPrice || '-') + '元）</span>' +
            '</div>' +
            '<p class="card-tagline">' + escapeHtml(item.tagline || '') + '</p>' +
            '<div class="card-footer">' +
              '<span>人均約 ' + escapeHtml(item.avgPrice || '-') + ' 元</span>' +
              '<span>閱讀攻略 &rarr;</span>' +
            '</div>' +
          '</div>' +
        '</a>'
      );
    }

    // 6. 更新畫面與分頁
    function applyFiltersAndRender() {
      var list = getFilteredAndSorted();
      var totalCount = list.length;
      resultCountEl.textContent = '顯示 ' + totalCount + ' 間餐廳';

      if (restaurants.length === 0) {
        // 資料庫完全為空
        gridEl.innerHTML = '';
        emptyStateEl.hidden = false;
        emptyMessageEl.textContent = '目前尚未收錄任何餐廳資料。可參考 AGENTS.md 步驟新增第一篇美食攻略！';
        paginationEl.hidden = true;
        return;
      }

      if (totalCount === 0) {
        // 搜尋或篩選後無結果
        gridEl.innerHTML = '';
        emptyStateEl.hidden = false;
        emptyMessageEl.textContent = '請嘗試放寬搜尋條件或清除篩選。';
        paginationEl.hidden = true;
        return;
      }

      emptyStateEl.hidden = true;

      // 分頁計算（每頁 12 張卡片）
      var totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      var startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      var pageItems = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);

      gridEl.innerHTML = pageItems.map(renderCard).join('');

      // 分頁導航列狀態
      if (totalPages > 1) {
        paginationEl.hidden = false;
        pageInfoEl.textContent = '第 ' + currentPage + ' / ' + totalPages + ' 頁';
        prevPageBtn.disabled = (currentPage === 1);
        nextPageBtn.disabled = (currentPage === totalPages);
      } else {
        paginationEl.hidden = true;
      }
    }

    // 7. 清除所有條件
    function resetAllFilters() {
      searchInput.value = '';
      districtSelect.value = '';
      populateZones('');
      zoneSelect.value = '';
      sortSelect.value = 'default';
      selectedCuisines = [];
      selectedScenarios = [];
      var allChips = document.querySelectorAll('.chip-btn');
      allChips.forEach(function (btn) {
        btn.classList.remove('active');
      });
      currentPage = 1;
      applyFiltersAndRender();
    }

    // 8. 綁定事件監聽
    searchInput.addEventListener('input', function () {
      currentPage = 1;
      applyFiltersAndRender();
    });

    districtSelect.addEventListener('change', function () {
      var currentZone = zoneSelect.value;
      populateZones(districtSelect.value);
      // 若原選取的商圈屬於新選取的行政區，保留選取狀態；否則重設為空
      if (currentZone) {
        var exists = Array.prototype.some.call(zoneSelect.options, function (opt) {
          return opt.value === currentZone;
        });
        if (exists) {
          zoneSelect.value = currentZone;
        } else {
          zoneSelect.value = '';
        }
      }
      currentPage = 1;
      applyFiltersAndRender();
    });

    zoneSelect.addEventListener('change', function () {
      var chosenZone = zoneSelect.value;
      // 若直接選擇商圈且尚未選定行政區，自動聯動選中該商圈所屬的行政區
      if (chosenZone && !districtSelect.value) {
        var parentDistrict = taxonomy.districts.find(function (d) {
          return Array.isArray(d.zones) && d.zones.some(function (z) {
            return z.code === chosenZone;
          });
        });
        if (parentDistrict) {
          districtSelect.value = parentDistrict.code;
        }
      }
      currentPage = 1;
      applyFiltersAndRender();
    });

    sortSelect.addEventListener('change', function () {
      currentPage = 1;
      applyFiltersAndRender();
    });

    clearFiltersBtn.addEventListener('click', resetAllFilters);
    emptyResetBtn.addEventListener('click', resetAllFilters);

    prevPageBtn.addEventListener('click', function () {
      if (currentPage > 1) {
        currentPage--;
        applyFiltersAndRender();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    nextPageBtn.addEventListener('click', function () {
      var totalCount = getFilteredAndSorted().length;
      var totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      if (currentPage < totalPages) {
        currentPage++;
        applyFiltersAndRender();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // 初始化執行
    populateDistricts();
    populateChips();
    applyFiltersAndRender();
  }

  /* ========================================================
   * 雷店清單邏輯 (blacklist.html)
   * ======================================================== */
  function initBlacklistPage() {
    var container = document.getElementById('blacklistContainer');
    if (!container) return;

    var list = window.BLACKLIST || [];

    if (!list || list.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<h3 class="empty-title">目前無雷店記錄</h3>' +
          '<p class="empty-desc">目前尚未登錄任何不推薦店家。雷店資料將於記錄後顯示於此。</p>' +
        '</div>';
      return;
    }

    var rowsHtml = list.map(function (item) {
      var zoneName = (item.zone && item.zone.name) ? item.zone.name : (item.zone || '-');
      var recordedDate = item.recordedDate || '-';
      var totalScore = item.scores && typeof item.scores.total === 'number'
        ? item.scores.total.toFixed(1)
        : '-';

      return (
        '<tr>' +
          '<td><a href="' + escapeHtml(item.url) + '"><strong>' + escapeHtml(item.name) + '</strong></a></td>' +
          '<td>' + escapeHtml(zoneName) + '</td>' +
          '<td class="blacklist-reason">' + escapeHtml(item.reason) + '</td>' +
          '<td>' + escapeHtml(recordedDate) + '</td>' +
          '<td><span class="score"><span class="score-num">' + escapeHtml(totalScore) + '</span><span class="score-max"> / 5.0</span></span></td>' +
        '</tr>'
      );
    }).join('');

    container.innerHTML =
      '<div class="table-responsive">' +
        '<table class="blacklist-table">' +
          '<thead>' +
            '<tr>' +
              '<th>店名</th>' +
              '<th>商圈</th>' +
              '<th>雷點原因（原話逐字記錄）</th>' +
              '<th>記錄日期</th>' +
              '<th>評分</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            rowsHtml +
          '</tbody>' +
        '</table>' +
      '</div>';
  }

  // DOM 載入後初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initHomePage();
      initBlacklistPage();
    });
  } else {
    initHomePage();
    initBlacklistPage();
  }
})();
