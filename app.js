/**
 * SalesPulse Analytics Dashboard
 * Pure Vanilla JavaScript with LocalStorage Persistence & Chart.js Visualizations
 * Zero CSS Variables used throughout.
 */

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY = 'salespulse_transactions_v2';
  const TARGET_GOAL = 150000; // $150,000 Quarterly Goal

  // --- Application State ---
  let allTransactions = [];
  let filteredTransactions = [];
  let currentMetricMode = 'both'; // 'both', 'revenue', 'profit'
  let currentSort = { column: 'date', direction: 'desc' };
  let currentPage = 1;
  const rowsPerPage = 8;

  // Chart instances
  let timelineChartInstance = null;
  let categoryChartInstance = null;
  let channelChartInstance = null;

  // --- Sample Data Generator (Initial Seed) ---
  function generateSeedData() {
    const categories = {
      'Software': ['Enterprise Cloud License', 'Team Collab Suite', 'DevOps Automator Pro', 'AI Analytics Addon', 'API Developer Key'],
      'Hardware': ['Edge Gateway Hub X1', 'POS Terminal Pro', 'Biometric Scanner Plus', 'Receipt Printer Matrix'],
      'Services': ['Onboarding & Migration', 'Custom Workflow Audit', 'SLA Enterprise Support (1yr)', 'Staff Training Workshop'],
      'Subscription': ['Monthly Pro Tier', 'Annual Enterprise Cloud', 'Quarterly Growth Seat Pack']
    };

    const channels = ['Direct Web', 'Sales Team', 'Partner', 'In-Store'];
    const customers = [
      { name: 'Apex Dynamics', email: 'billing@apexdynamics.io' },
      { name: 'Sarah Jenkins', email: 's.jenkins@gmail.com' },
      { name: 'Vanguard Corp', email: 'finance@vanguard.co' },
      { name: 'Michael Chang', email: 'mchang@techflow.net' },
      { name: 'Horizon Logistics', email: 'accounts@horizonlog.com' },
      { name: 'Elena Rostova', email: 'elena.rostova@nexus.org' },
      { name: 'Aegis Security Ltd', email: 'admin@aegissecur.com' },
      { name: 'David Miller', email: 'd.miller@finpro.io' },
      { name: 'Quantum Leap Labs', email: 'purchasing@quantumll.org' },
      { name: 'Chloe Dubois', email: 'chloe.dubois@luxstyle.fr' },
      { name: 'Terra Nova Health', email: 'finance@terranovahealth.com' },
      { name: 'Liam O’Connor', email: 'liam.oc@celtictech.ie' },
      { name: 'Nova Retail Group', email: 'procurement@novaretail.com' },
      { name: 'Emily Watson', email: 'emily.w@innovate.co' },
      { name: 'Starlight Media', email: 'billing@starlightmedia.com' }
    ];

    const data = [];
    const now = new Date();
    
    // Seed 80 realistic transactions spread across the past 75 days
    for (let i = 0; i < 80; i++) {
      let daysAgo;
      // Ensure at least 3 transactions are for today, 6 for past 3 days, and the rest scattered
      if (i < 3) {
        daysAgo = 0;
      } else if (i < 9) {
        daysAgo = Math.floor(Math.random() * 3);
      } else {
        daysAgo = Math.floor(Math.random() * 75);
      }

      const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 36000000));
      
      const catKeys = Object.keys(categories);
      const category = catKeys[Math.floor(Math.random() * catKeys.length)];
      const productList = categories[category];
      const product = productList[Math.floor(Math.random() * productList.length)];
      
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      
      // Price ranges based on category
      let unitPrice = 0;
      if (category === 'Software') unitPrice = Math.floor(Math.random() * 800) + 250;
      else if (category === 'Hardware') unitPrice = Math.floor(Math.random() * 1200) + 400;
      else if (category === 'Services') unitPrice = Math.floor(Math.random() * 2500) + 800;
      else unitPrice = Math.floor(Math.random() * 500) + 99;

      const quantity = Math.floor(Math.random() * 3) + 1;
      const discountPct = Math.random() < 0.35 ? Math.floor(Math.random() * 4 + 1) * 5 : 0;
      const subtotal = unitPrice * quantity;
      const discountAmount = (subtotal * discountPct) / 100;
      const total = Math.round((subtotal - discountAmount) * 100) / 100;

      // Realistic statuses: 84% Completed, 10% Pending, 6% Refunded
      const randStatus = Math.random();
      let status = 'Completed';
      if (randStatus > 0.94) status = 'Refunded';
      else if (randStatus > 0.84) status = 'Pending';

      const invoiceNum = 1000 + (80 - i);
      const year = saleDate.getFullYear();

      data.push({
        id: `INV-${year}-${invoiceNum}`,
        date: saleDate.toISOString(),
        customerName: customer.name,
        customerEmail: customer.email,
        productName: product,
        category: category,
        channel: channel,
        quantity: quantity,
        unitPrice: unitPrice,
        discountPct: discountPct,
        total: total,
        profit: Math.round(total * (category === 'Services' ? 0.85 : category === 'Software' ? 0.90 : 0.45) * 100) / 100,
        status: status
      });
    }

    // Sort descending by date initially
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    return data;
  }

  // --- LocalStorage Helpers ---
  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
    }
    const seed = generateSeedData();
    saveData(seed);
    return seed;
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      showToast('Storage quota exceeded or storage error', 'danger');
    }
  }

  // --- Formatting Helpers ---
  function formatCurrency(num) {
    return '$' + Number(num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'danger') {
      iconSvg = '<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.25s ease-out forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 260);
    }, 3200);
  }

  // --- Filtering & Period Calculations ---
  function getFilterDateBounds() {
    const timeRange = document.getElementById('timeRangeSelect').value;
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let label = 'Custom Range';

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      label = 'Today';
    } else if (timeRange === 'last7') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      label = 'Last 7 Days';
    } else if (timeRange === 'last30') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      label = 'Last 30 Days';
    } else if (timeRange === 'last90') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      label = 'Last 90 Days';
    } else if (timeRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      label = `This Year (${now.getFullYear()})`;
    } else if (timeRange === 'all') {
      startDate = new Date(2020, 0, 1);
      label = 'All Time History';
    } else if (timeRange === 'custom') {
      const customStart = document.getElementById('customStartDate').value;
      const customEnd = document.getElementById('customEndDate').value;
      if (customStart) startDate = new Date(customStart + 'T00:00:00');
      else startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (customEnd) endDate = new Date(customEnd + 'T23:59:59');
      label = `Custom (${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())})`;
    }

    return { startDate, endDate, label, timeRange };
  }

  function applyFilters() {
    const { startDate, endDate, label } = getFilterDateBounds();
    document.getElementById('dateRangeDisplayLabel').textContent = `Displaying data for ${label}`;

    const categoryFilter = document.getElementById('categoryFilterSelect').value;
    const channelFilter = document.getElementById('channelFilterSelect').value;
    const searchQuery = document.getElementById('tableSearchInput').value.trim().toLowerCase();
    
    // Status pill
    const activeStatusPill = document.querySelector('.status-pill.active');
    const statusFilter = activeStatusPill ? activeStatusPill.getAttribute('data-status') : 'ALL';

    filteredTransactions = allTransactions.filter(item => {
      const itemDate = new Date(item.date);
      // Date boundary check
      if (itemDate < startDate || itemDate > endDate) return false;

      // Category check
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

      // Channel check
      if (channelFilter !== 'ALL' && item.channel !== channelFilter) return false;

      // Status check
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Search query check
      if (searchQuery) {
        const matchesName = (item.customerName || '').toLowerCase().includes(searchQuery);
        const matchesEmail = (item.customerEmail || '').toLowerCase().includes(searchQuery);
        const matchesInvoice = (item.id || '').toLowerCase().includes(searchQuery);
        const matchesProduct = (item.productName || '').toLowerCase().includes(searchQuery);
        if (!matchesName && !matchesEmail && !matchesInvoice && !matchesProduct) {
          return false;
        }
      }

      return true;
    });

    // Reset page to 1 when filters change
    currentPage = 1;

    // Recalculate metrics, update charts, render top products, and redraw table
    updateKPICards(startDate, endDate);
    updateTimelineChart();
    updateCategoryChart();
    updateChannelChart();
    renderTopProducts();
    renderTable();
  }

  // --- Prior Period Comparison Metric Calculation ---
  function calculatePeriodComparison(currentStart, currentEnd) {
    const periodDurationMs = currentEnd.getTime() - currentStart.getTime();
    const priorEnd = new Date(currentStart.getTime() - 1);
    const priorStart = new Date(priorEnd.getTime() - periodDurationMs);

    const priorSales = allTransactions.filter(item => {
      const d = new Date(item.date);
      return d >= priorStart && d <= priorEnd && item.status !== 'Refunded';
    });

    const priorRevenue = priorSales.reduce((sum, item) => sum + item.total, 0);
    const priorOrders = priorSales.length;

    return { priorRevenue, priorOrders };
  }

  // --- KPI Cards Update ---
  function updateKPICards(startDate, endDate) {
    let grossRev = 0;
    let netRev = 0;
    let totalOrders = 0;
    let completedCount = 0;
    let refundCount = 0;

    filteredTransactions.forEach(item => {
      totalOrders++;
      if (item.status === 'Completed') {
        grossRev += item.total;
        netRev += item.total;
        completedCount++;
      } else if (item.status === 'Pending') {
        grossRev += item.total;
      } else if (item.status === 'Refunded') {
        refundCount++;
      }
    });

    const aov = completedCount > 0 ? (netRev / completedCount) : 0;
    const successRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 0;

    // Prior period comparison
    const { priorRevenue, priorOrders } = calculatePeriodComparison(startDate, endDate);
    let revTrendPct = 0;
    if (priorRevenue > 0) {
      revTrendPct = Math.round(((grossRev - priorRevenue) / priorRevenue) * 1000) / 10;
    }
    let ordersTrendPct = 0;
    if (priorOrders > 0) {
      ordersTrendPct = Math.round(((totalOrders - priorOrders) / priorOrders) * 1000) / 10;
    }

    // Render KPI values
    document.getElementById('kpiGrossRevenue').textContent = formatCurrency(grossRev);
    document.getElementById('kpiNetRevenue').textContent = formatCurrency(netRev);
    document.getElementById('kpiTotalOrders').textContent = totalOrders.toLocaleString();
    document.getElementById('kpiAOV').textContent = formatCurrency(aov);
    document.getElementById('kpiSuccessRate').textContent = `${successRate}%`;
    document.getElementById('kpiRefundsCount').textContent = `${refundCount} refund${refundCount === 1 ? '' : 's'} recorded`;

    // Render Trend Badges
    const revTrendBadge = document.getElementById('kpiRevenueTrend');
    const revTrendText = document.getElementById('kpiRevenueTrendText');
    renderTrendElement(revTrendBadge, revTrendText, revTrendPct);

    const ordersTrendBadge = document.getElementById('kpiOrdersTrend');
    const ordersTrendText = document.getElementById('kpiOrdersTrendText');
    renderTrendElement(ordersTrendBadge, ordersTrendText, ordersTrendPct);

    // Target Progress Bar
    const targetAchievedPct = Math.min(100, Math.round((grossRev / TARGET_GOAL) * 1000) / 10);
    document.getElementById('targetPercentLabel').textContent = `${targetAchievedPct}% Achieved`;
    document.getElementById('targetProgressBar').style.width = `${targetAchievedPct}%`;
    document.getElementById('targetGoalAmount').textContent = formatCurrency(TARGET_GOAL);
  }

  function renderTrendElement(badgeEl, textEl, pct) {
    if (!badgeEl || !textEl) return;
    badgeEl.className = 'trend-badge';
    if (pct > 0) {
      badgeEl.classList.add('trend-up');
      textEl.textContent = `+${pct}%`;
    } else if (pct < 0) {
      badgeEl.classList.add('trend-down');
      textEl.textContent = `${pct}%`;
    } else {
      badgeEl.classList.add('trend-neutral');
      textEl.textContent = `0.0%`;
    }
  }

  // --- Chart 1: Revenue & Profit Timeline ---
  function updateTimelineChart() {
    const canvas = document.getElementById('timelineChart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
      canvas.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;">Chart engine unavailable. Core metrics and table active.</div>';
      return;
    }

    const ctx = canvas.getContext('2d');

    // Aggregate by date
    const dateMap = {};
    const chronological = [...filteredTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    chronological.forEach(item => {
      if (item.status === 'Refunded') return;
      const d = new Date(item.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap[key]) {
        dateMap[key] = { revenue: 0, profit: 0 };
      }
      dateMap[key].revenue += item.total;
      dateMap[key].profit += (item.profit || item.total * 0.65);
    });

    const labels = Object.keys(dateMap);
    const revenueData = labels.map(l => Math.round(dateMap[l].revenue));
    const profitData = labels.map(l => Math.round(dateMap[l].profit));

    if (timelineChartInstance) {
      timelineChartInstance.destroy();
    }

    const revGradient = ctx.createLinearGradient(0, 0, 0, 280);
    revGradient.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
    revGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    const profitGradient = ctx.createLinearGradient(0, 0, 0, 280);
    profitGradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    profitGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const datasets = [];

    if (currentMetricMode === 'both' || currentMetricMode === 'revenue') {
      datasets.push({
        label: 'Gross Revenue ($)',
        data: revenueData,
        borderColor: '#3b82f6',
        backgroundColor: revGradient,
        borderWidth: 2.5,
        pointBackgroundColor: '#1d4ed8',
        pointBorderColor: '#60a5fa',
        pointRadius: labels.length > 25 ? 0 : 3.5,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true
      });
    }

    if (currentMetricMode === 'both' || currentMetricMode === 'profit') {
      datasets.push({
        label: 'Estimated Profit ($)',
        data: profitData,
        borderColor: '#10b981',
        backgroundColor: profitGradient,
        borderWidth: 2,
        pointBackgroundColor: '#047857',
        pointBorderColor: '#34d399',
        pointRadius: labels.length > 25 ? 0 : 3.5,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true
      });
    }

    timelineChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['No Activity'],
        datasets: datasets.length > 0 ? datasets : [{
          label: 'Revenue',
          data: [0],
          borderColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: { size: 12, weight: 600 },
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function (context) {
                return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              maxTicksLimit: 12,
              font: { size: 11 }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              callback: function (val) {
                return '$' + (val >= 1000 ? (val / 1000) + 'k' : val);
              }
            }
          }
        }
      }
    });
  }

  // --- Chart 2: Category Breakdown (Doughnut) ---
  function updateCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
      canvas.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;">Chart engine unavailable.</div>';
      return;
    }

    const ctx = canvas.getContext('2d');

    const catSums = {
      'Software': 0,
      'Hardware': 0,
      'Services': 0,
      'Subscription': 0
    };

    filteredTransactions.forEach(item => {
      if (item.status !== 'Refunded') {
        catSums[item.category] = (catSums[item.category] || 0) + item.total;
      }
    });

    const labels = Object.keys(catSums);
    const dataVals = labels.map(k => Math.round(catSums[k]));
    const totalRev = dataVals.reduce((a, b) => a + b, 0);

    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: totalRev > 0 ? dataVals : [1, 1, 1, 1],
          backgroundColor: colors,
          borderColor: '#121927',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function (ctx) {
                const val = dataVals[ctx.dataIndex] || 0;
                const pct = totalRev > 0 ? Math.round((val / totalRev) * 100) : 0;
                return ` ${ctx.label}: ${formatCurrency(val)} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // Custom Legend Rendering
    const legendContainer = document.getElementById('categoryLegendContainer');
    if (legendContainer) {
      legendContainer.innerHTML = labels.map((lbl, idx) => {
        const amount = catSums[lbl] || 0;
        const pct = totalRev > 0 ? Math.round((amount / totalRev) * 100) : 0;
        return `
          <div class="legend-item">
            <span class="legend-color-dot" style="background-color: ${colors[idx]};"></span>
            <span><strong>${lbl}</strong> (${pct}%)</span>
          </div>
        `;
      }).join('');
    }
  }

  // --- Chart 3: Acquisition Channel Performance ---
  function updateChannelChart() {
    const canvas = document.getElementById('channelChart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
      canvas.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;">Chart engine unavailable.</div>';
      return;
    }

    const ctx = canvas.getContext('2d');

    const channelMap = {
      'Direct Web': 0,
      'Sales Team': 0,
      'Partner': 0,
      'In-Store': 0
    };

    filteredTransactions.forEach(item => {
      if (item.status !== 'Refunded') {
        channelMap[item.channel] = (channelMap[item.channel] || 0) + item.total;
      }
    });

    const labels = Object.keys(channelMap);
    const dataVals = labels.map(k => Math.round(channelMap[k]));

    if (channelChartInstance) {
      channelChartInstance.destroy();
    }

    channelChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Revenue ($)',
          data: dataVals,
          backgroundColor: [
            'rgba(59, 130, 246, 0.85)',
            'rgba(99, 102, 241, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(245, 158, 11, 0.85)'
          ],
          borderColor: [
            '#3b82f6',
            '#6366f1',
            '#10b981',
            '#f59e0b'
          ],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: function (ctx) {
                return ` Revenue: ${formatCurrency(ctx.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 12, weight: 600 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#64748b',
              callback: function (val) {
                return '$' + (val >= 1000 ? (val / 1000) + 'k' : val);
              }
            }
          }
        }
      }
    });
  }

  // --- Top Products Leaderboard ---
  function renderTopProducts() {
    const container = document.getElementById('topProductsContainer');
    if (!container) return;

    const prodStats = {};
    filteredTransactions.forEach(item => {
      if (item.status === 'Refunded') return;
      if (!prodStats[item.productName]) {
        prodStats[item.productName] = {
          name: item.productName,
          category: item.category,
          revenue: 0,
          quantity: 0
        };
      }
      prodStats[item.productName].revenue += item.total;
      prodStats[item.productName].quantity += item.quantity;
    });

    const sorted = Object.values(prodStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    if (sorted.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: #64748b; padding: 30px 0;">
          No product sales recorded in this period.
        </div>
      `;
      return;
    }

    container.innerHTML = sorted.map((prod, idx) => {
      const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
      return `
        <div class="top-product-row">
          <div class="product-rank ${rankClass}">#${idx + 1}</div>
          <div class="product-meta">
            <div class="product-name">${escapeHtml(prod.name)}</div>
            <div class="product-cat">${escapeHtml(prod.category)} &bull; ${prod.quantity} units sold</div>
          </div>
          <div class="product-stats">
            <div class="product-rev">${formatCurrency(prod.revenue)}</div>
            <div class="product-orders">Gross Sales</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Transactions Data Table Rendering & Sorting ---
  function sortTransactions(items) {
    const { column, direction } = currentSort;
    return [...items].sort((a, b) => {
      let valA, valB;

      if (column === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (column === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (column === 'customer') {
        valA = a.customerName || '';
        valB = b.customerName || '';
      } else if (column === 'product') {
        valA = a.productName || '';
        valB = b.productName || '';
      } else if (column === 'channel') {
        valA = a.channel || '';
        valB = b.channel || '';
      } else if (column === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      } else if (column === 'amount') {
        valA = Number(a.total) || 0;
        valB = Number(b.total) || 0;
      } else {
        valA = a[column];
        valB = b[column];
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function renderTable() {
    const tbody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    const countBadge = document.getElementById('filteredCountBadge');

    countBadge.textContent = `${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? '' : 's'}`;

    // Update sort header icons
    const sortHeaders = document.querySelectorAll('#salesTable th[data-sort]');
    sortHeaders.forEach(th => {
      const col = th.getAttribute('data-sort');
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        if (currentSort.column === col) {
          icon.innerHTML = currentSort.direction === 'asc' ? '&uarr;' : '&darr;';
          icon.style.color = '#38bdf8';
        } else {
          icon.innerHTML = '&#8645;';
          icon.style.color = '#64748b';
        }
      }
    });

    if (filteredTransactions.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      updatePaginationControls(0);
      return;
    }

    emptyState.style.display = 'none';

    // Sort items
    const sorted = sortTransactions(filteredTransactions);

    // Paginate
    const totalEntries = sorted.length;
    const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const pageItems = sorted.slice(startIndex, startIndex + rowsPerPage);

    tbody.innerHTML = pageItems.map(item => {
      let statusClass = 'status-completed';
      if (item.status === 'Pending') statusClass = 'status-pending';
      else if (item.status === 'Refunded') statusClass = 'status-refunded';

      return `
        <tr>
          <td class="invoice-cell">${escapeHtml(item.id)}</td>
          <td>${formatDate(item.date)}</td>
          <td>
            <div class="customer-name">${escapeHtml(item.customerName)}</div>
            <div class="customer-email">${escapeHtml(item.customerEmail)}</div>
          </td>
          <td>
            <div class="product-cell-name">${escapeHtml(item.productName)}</div>
            <div class="product-cell-cat">${escapeHtml(item.category)} (x${item.quantity})</div>
          </td>
          <td>
            <span class="channel-tag">${escapeHtml(item.channel)}</span>
          </td>
          <td>
            <span class="status-badge ${statusClass}">${escapeHtml(item.status)}</span>
          </td>
          <td class="text-right amount-cell">${formatCurrency(item.total)}</td>
          <td class="text-center">
            <div class="table-actions">
              <button class="action-btn" title="View Receipt" onclick="window.salesApp.viewReceipt('${item.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <button class="action-btn action-btn-danger" title="Delete Sale" onclick="window.salesApp.deleteTransaction('${item.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    updatePaginationControls(totalEntries);
  }

  function updatePaginationControls(totalEntries) {
    const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
    const paginationStart = totalEntries === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const paginationEnd = Math.min(currentPage * rowsPerPage, totalEntries);

    document.getElementById('paginationStart').textContent = paginationStart;
    document.getElementById('paginationEnd').textContent = paginationEnd;
    document.getElementById('paginationTotal').textContent = totalEntries;

    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    const numbersContainer = document.getElementById('paginationNumbers');
    let pageHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 6 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
        if (p === 2 || p === totalPages - 1) {
          pageHtml += '<span style="color:#64748b; padding:4px;">...</span>';
        }
        continue;
      }
      pageHtml += `<button class="page-num ${p === currentPage ? 'active' : ''}" onclick="window.salesApp.goToPage(${p})">${p}</button>`;
    }
    numbersContainer.innerHTML = pageHtml;
  }

  // --- Export to CSV ---
  function exportToCSV() {
    if (filteredTransactions.length === 0) {
      showToast('No records available to export', 'info');
      return;
    }

    const headers = ['Invoice ID', 'Date', 'Customer Name', 'Customer Email', 'Product Name', 'Category', 'Channel', 'Quantity', 'Unit Price ($)', 'Discount (%)', 'Total ($)', 'Status'];
    const rows = filteredTransactions.map(item => [
      `"${item.id}"`,
      `"${item.date.split('T')[0]}"`,
      `"${(item.customerName || '').replace(/"/g, '""')}"`,
      `"${(item.customerEmail || '').replace(/"/g, '""')}"`,
      `"${(item.productName || '').replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.channel}"`,
      item.quantity,
      item.unitPrice,
      item.discountPct,
      item.total,
      `"${item.status}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `salespulse-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);

    showToast(`Exported ${filteredTransactions.length} records to CSV`, 'success');
  }

  // --- Add Sale Modal & Form ---
  function updateModalCalculations() {
    const qty = Math.max(1, parseInt(document.getElementById('formQuantity').value, 10) || 1);
    const unitPrice = Math.max(0, parseFloat(document.getElementById('formUnitPrice').value) || 0);
    const discountPct = Math.min(100, Math.max(0, parseFloat(document.getElementById('formDiscount').value) || 0));

    const subtotal = qty * unitPrice;
    const discount = (subtotal * discountPct) / 100;
    const total = Math.max(0, subtotal - discount);

    document.getElementById('calcSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('calcDiscount').textContent = `-${formatCurrency(discount)}`;
    document.getElementById('calcTotal').textContent = formatCurrency(total);
  }

  function openAddModal() {
    const modal = document.getElementById('addSaleModal');
    const form = document.getElementById('addSaleForm');
    form.reset();

    // Default values
    document.getElementById('formQuantity').value = '1';
    document.getElementById('formDiscount').value = '0';
    document.getElementById('formDate').value = new Date().toISOString().slice(0, 10);
    updateModalCalculations();

    modal.style.display = 'flex';
  }

  function closeAddModal() {
    document.getElementById('addSaleModal').style.display = 'none';
  }

  function handleAddSaleSubmit(e) {
    e.preventDefault();

    const customerName = document.getElementById('formCustomerName').value.trim();
    const customerEmail = document.getElementById('formCustomerEmail').value.trim();
    const productName = document.getElementById('formProductName').value.trim();
    const category = document.getElementById('formCategory').value;
    const channel = document.getElementById('formChannel').value;
    const status = document.getElementById('formStatus').value;
    const dateInput = document.getElementById('formDate').value;

    const quantity = parseInt(document.getElementById('formQuantity').value, 10) || 1;
    const unitPrice = parseFloat(document.getElementById('formUnitPrice').value) || 0;
    const discountPct = parseFloat(document.getElementById('formDiscount').value) || 0;

    const subtotal = quantity * unitPrice;
    const discount = (subtotal * discountPct) / 100;
    const total = Math.round((subtotal - discount) * 100) / 100;

    const saleDate = dateInput ? new Date(dateInput + 'T12:00:00') : new Date();

    const newSale = {
      id: `INV-${saleDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: saleDate.toISOString(),
      customerName,
      customerEmail,
      productName,
      category,
      channel,
      quantity,
      unitPrice,
      discountPct,
      total,
      profit: Math.round(total * (category === 'Services' ? 0.85 : category === 'Software' ? 0.90 : 0.45) * 100) / 100,
      status
    };

    // Prepend new sale
    allTransactions.unshift(newSale);
    saveData(allTransactions);

    closeAddModal();
    applyFilters();
    showToast(`Recorded sale ${newSale.id} for ${formatCurrency(total)}`, 'success');
  }

  // --- View Receipt Modal ---
  function viewReceipt(invoiceId) {
    const item = allTransactions.find(t => t.id === invoiceId);
    if (!item) return;

    const container = document.getElementById('receiptContent');
    let statusClass = 'status-completed';
    if (item.status === 'Pending') statusClass = 'status-pending';
    else if (item.status === 'Refunded') statusClass = 'status-refunded';

    const subtotal = item.quantity * item.unitPrice;
    const discount = (subtotal * item.discountPct) / 100;

    container.innerHTML = `
      <div class="receipt-header">
        <div class="receipt-inv">${escapeHtml(item.id)}</div>
        <div class="receipt-date">${formatDateTime(item.date)}</div>
        <div style="margin-top: 8px;">
          <span class="status-badge ${statusClass}">${escapeHtml(item.status)}</span>
        </div>
      </div>
      <div class="receipt-grid">
        <div>
          <div class="receipt-item-label">Customer</div>
          <div class="receipt-item-val">${escapeHtml(item.customerName)}</div>
          <div style="font-size: 11px; color: #64748b;">${escapeHtml(item.customerEmail)}</div>
        </div>
        <div>
          <div class="receipt-item-label">Channel</div>
          <div class="receipt-item-val">${escapeHtml(item.channel)}</div>
        </div>
        <div>
          <div class="receipt-item-label">Product / Service</div>
          <div class="receipt-item-val">${escapeHtml(item.productName)}</div>
          <div style="font-size: 11px; color: #64748b;">${escapeHtml(item.category)}</div>
        </div>
        <div>
          <div class="receipt-item-label">Pricing</div>
          <div class="receipt-item-val">${item.quantity} &times; ${formatCurrency(item.unitPrice)}</div>
        </div>
      </div>
      <div class="receipt-totals">
        <div class="calc-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="calc-row">
          <span>Discount (${item.discountPct}%):</span>
          <span>-${formatCurrency(discount)}</span>
        </div>
        <div class="calc-row calc-total">
          <span>Total Paid:</span>
          <span>${formatCurrency(item.total)}</span>
        </div>
      </div>
    `;

    document.getElementById('viewSaleModal').style.display = 'flex';
  }

  function closeViewModal() {
    document.getElementById('viewSaleModal').style.display = 'none';
  }

  // --- Delete Transaction ---
  function deleteTransaction(invoiceId) {
    if (!confirm(`Are you sure you want to delete transaction ${invoiceId}?`)) {
      return;
    }

    allTransactions = allTransactions.filter(t => t.id !== invoiceId);
    saveData(allTransactions);
    applyFilters();
    showToast(`Deleted transaction ${invoiceId}`, 'info');
  }

  // --- Reset to Demo Data ---
  function resetDemoData() {
    if (!confirm('Reset dashboard to fresh realistic demo transactions? All custom entries will be replaced.')) {
      return;
    }
    const fresh = generateSeedData();
    allTransactions = fresh;
    saveData(allTransactions);
    applyFilters();
    showToast('Reset dashboard to default demo data', 'success');
  }

  // --- Utility: Escape HTML ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Period Dropdown
    const timeRangeSelect = document.getElementById('timeRangeSelect');
    const customContainer = document.getElementById('customDateContainer');
    timeRangeSelect.addEventListener('change', () => {
      if (timeRangeSelect.value === 'custom') {
        customContainer.style.display = 'flex';
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        document.getElementById('customStartDate').value = thirtyDaysAgo.toISOString().slice(0, 10);
        document.getElementById('customEndDate').value = now.toISOString().slice(0, 10);
      } else {
        customContainer.style.display = 'none';
        applyFilters();
      }
    });

    document.getElementById('applyCustomDateBtn').addEventListener('click', () => {
      applyFilters();
    });

    // Category and Channel Selects
    document.getElementById('categoryFilterSelect').addEventListener('change', applyFilters);
    document.getElementById('channelFilterSelect').addEventListener('change', applyFilters);

    // Live search table
    let searchDebounce = null;
    document.getElementById('tableSearchInput').addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(applyFilters, 200);
    });

    // Status filter pills
    const statusPills = document.querySelectorAll('.status-pill');
    statusPills.forEach(pill => {
      pill.addEventListener('click', () => {
        statusPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        applyFilters();
      });
    });

    // Segmented chart control (Combined / Revenue / Profit)
    const segButtons = document.querySelectorAll('.seg-btn');
    segButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        segButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMetricMode = btn.getAttribute('data-metric');
        updateTimelineChart();
      });
    });

    // Table sorting
    const sortHeaders = document.querySelectorAll('#salesTable th[data-sort]');
    sortHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (currentSort.column === col) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.column = col;
          currentSort.direction = 'desc';
        }
        renderTable();
      });
    });

    // Pagination buttons
    document.getElementById('btnPrevPage').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });

    document.getElementById('btnNextPage').addEventListener('click', () => {
      currentPage++;
      renderTable();
    });

    // Top action buttons
    document.getElementById('btnExportCSV').addEventListener('click', exportToCSV);
    document.getElementById('btnResetData').addEventListener('click', resetDemoData);
    document.getElementById('btnOpenAddModal').addEventListener('click', openAddModal);

    // Add modal controls
    document.getElementById('btnCloseAddModal').addEventListener('click', closeAddModal);
    document.getElementById('btnCancelAddModal').addEventListener('click', closeAddModal);
    document.getElementById('addSaleForm').addEventListener('submit', handleAddSaleSubmit);

    // Live calculate totals in modal
    ['formQuantity', 'formUnitPrice', 'formDiscount'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', updateModalCalculations);
    });

    // View Receipt modal controls
    document.getElementById('btnCloseViewModal').addEventListener('click', closeViewModal);
    document.getElementById('btnCloseViewModalBtn').addEventListener('click', closeViewModal);

    // Close modals on clicking overlay backdrop
    window.addEventListener('click', e => {
      const addModal = document.getElementById('addSaleModal');
      const viewModal = document.getElementById('viewSaleModal');
      if (e.target === addModal) closeAddModal();
      if (e.target === viewModal) closeViewModal();
    });

    // Close on Escape key
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeAddModal();
        closeViewModal();
      }
    });
  }

  // --- Global exposure for inline onclick handlers ---
  window.salesApp = {
    viewReceipt: viewReceipt,
    deleteTransaction: deleteTransaction,
    goToPage: function (page) {
      currentPage = page;
      renderTable();
    }
  };

  // --- Initialization ---
  function init() {
    allTransactions = loadData();
    setupEventListeners();
    applyFilters();
  }

  // Bootstrap when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
