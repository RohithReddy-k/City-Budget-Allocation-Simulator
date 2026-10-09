/**
 * CITY BUDGET ALLOCATION SIMULATOR
 * Main Application Controller (Vanilla JS)
 *
 * Coordinates UI events, views, forms, Chart.js instances,
 * and the Dynamic Programming budget simulator.
 */

(function () {
  'use strict';

  // Global Simulator instance from Models
  let simulator;

  // Active Chart.js instances for cleanup & redraw
  const charts = {
    categoryDoughnut: null,
    projectImpact: null,
    categoryImpact: null,
    efficiency: null,
    scenarioComparison: null
  };

  // Color palette for category charts
  const CATEGORY_COLORS = {
    'Roads': '#2563eb',
    'Sanitation': '#059669',
    'Healthcare': '#e11d48',
    'Education': '#7c3aed',
    'Water Supply': '#0284c7',
    'Environment': '#16a34a',
    'Public Infrastructure': '#d97706'
  };

  /**
   * Application Initialization
   */
  document.addEventListener('DOMContentLoaded', () => {
    initAuthWidget();
    initSimulator();
    initNavigation();
    initBudgetSetupView();
    initProjectsView();
    initConstraintsView();
    initOptimizeView();
    initResultsView();
    initScenariosView();
    initModalsAndToasts();

    // Initial render
    updateAllViews();
  });

  /**
   * Initializes the domain simulator and loads persisted or demo data
   */
  function initSimulator() {
    if (typeof Models === 'undefined' || !Models.BudgetSimulator) {
      console.error('Domain models not loaded!');
      return;
    }

    simulator = new Models.BudgetSimulator(100);

    // Attempt to load from localStorage; if empty, load demo data automatically
    const loaded = simulator.loadFromStorage();
    if (!loaded || simulator.projects.length === 0) {
      simulator.loadDemoData();
      // Run initial optimization so results are instantly viewable
      try {
        simulator.optimize();
      } catch (e) {
        console.warn('Initial demo optimization warning:', e);
      }
    } else {
      // If loaded from storage, ensure constraints maxTotalBudget doesn't bottleneck budget
      if (simulator.constraints && simulator.constraints.maxTotalBudget !== null) {
        if (simulator.constraints.maxTotalBudget < simulator.budget.totalBudget) {
          simulator.constraints.maxTotalBudget = simulator.budget.totalBudget;
        }
      }
      try {
        simulator.optimize();
      } catch (e) {
        console.warn('Stored data optimization warning:', e);
      }
    }
  }

  /* ==========================================================================
     Navigation & Routing (SPA)
     ========================================================================== */
  function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.page-view');
    const headerTitle = document.getElementById('topHeaderTitle');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    const PAGE_TITLES = {
      'dashboard': 'Dashboard Overview',
      'budget-setup': 'Annual Budget Setup',
      'projects': 'Municipal Projects Portfolio',
      'constraints': 'Policy & Statutory Constraints',
      'optimize': 'Optimization Engine',
      'results': 'Optimal Allocation Results',
      'scenarios': 'Multi-Scenario Sensitivity Analysis',
      'about': 'About & Mathematical Model'
    };

    window.navigateToPage = function (pageId) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
      });

      views.forEach(view => {
        view.classList.toggle('active', view.id === `view-${pageId}`);
      });

      if (headerTitle && PAGE_TITLES[pageId]) {
        headerTitle.textContent = PAGE_TITLES[pageId];
      }

      // Close mobile sidebar if open
      if (sidebar) sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');

      // If opening results or scenarios, refresh their charts with layout awareness
      if (pageId === 'results') {
        requestAnimationFrame(() => {
          setTimeout(() => {
            renderResultsCharts();
            const slider = document.getElementById('whatIfSlider');
            if (slider) {
              slider.value = simulator.budget.totalBudget;
              const display = document.getElementById('whatIfDisplay');
              if (display) display.textContent = `₹${simulator.budget.totalBudget} Cr`;
              updateWhatIfPreview(simulator.budget.totalBudget);
            }
          }, 50);
        });
      } else if (pageId === 'scenarios') {
        requestAnimationFrame(() => {
          setTimeout(() => {
            renderScenarioComparison();
          }, 50);
        });
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) window.navigateToPage(page);
      });
    });

    // Mobile Hamburger Toggle
    if (mobileMenuBtn && sidebar && sidebarOverlay) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
      });

      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
      });
    }

    // Window resize chart handler (responsive redraw)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const resultsActive = document.getElementById('view-results')?.classList.contains('active');
        const scenariosActive = document.getElementById('view-scenarios')?.classList.contains('active');
        if (resultsActive) renderResultsCharts();
        if (scenariosActive) renderScenarioComparison();
      }, 150);
    });

    // Header Quick Action "Optimize Now"
    const btnHeaderOptimize = document.getElementById('btnHeaderOptimize');
    if (btnHeaderOptimize) {
      btnHeaderOptimize.addEventListener('click', () => {
        window.navigateToPage('optimize');
      });
    }

    // Hero buttons on Dashboard
    const btnHeroStart = document.getElementById('btnHeroStart');
    if (btnHeroStart) {
      btnHeroStart.addEventListener('click', () => {
        window.navigateToPage('optimize');
      });
    }

    const btnHeroDemo = document.getElementById('btnHeroDemo');
    if (btnHeroDemo) {
      btnHeroDemo.addEventListener('click', () => {
        simulator.loadDemoData();
        simulator.optimize();
        updateAllViews();
        showToast('Sample municipal data loaded and optimized!', 'success');
      });
    }

    // Sidebar Demo & Reset
    const btnSidebarLoadDemo = document.getElementById('btnSidebarLoadDemo');
    if (btnSidebarLoadDemo) {
      btnSidebarLoadDemo.addEventListener('click', () => {
        simulator.loadDemoData();
        simulator.optimize();
        updateAllViews();
        showToast('Loaded standard 8 municipal demo projects!', 'success');
      });
    }

    const btnSidebarReset = document.getElementById('btnSidebarReset');
    if (btnSidebarReset) {
      btnSidebarReset.addEventListener('click', () => {
        showConfirmModal(
          'Reset Entire Simulation?',
          'This will clear all registered projects, reset the budget to ₹100 Cr, and wipe active constraints. Are you sure?',
          () => {
            simulator.reset();
            updateAllViews();
            showToast('Simulation has been reset to blank state.', 'warning');
          }
        );
      });
    }

    // Dashboard View Projects button
    const btnDashViewProjects = document.getElementById('btnDashViewProjects');
    if (btnDashViewProjects) {
      btnDashViewProjects.addEventListener('click', () => {
        window.navigateToPage('projects');
      });
    }

    // Dashboard Total Budget Card quick navigation
    const cardDashTotalBudget = document.getElementById('cardDashTotalBudget');
    if (cardDashTotalBudget) {
      cardDashTotalBudget.addEventListener('click', () => {
        window.navigateToPage('budget-setup');
      });
    }

    // Header Fiscal Pill quick navigation
    const headerFiscalPill = document.getElementById('headerFiscalPill');
    if (headerFiscalPill) {
      headerFiscalPill.addEventListener('click', () => {
        window.navigateToPage('budget-setup');
      });
    }

    // Optimize page budget change buttons
    const btnOptChangeBudget = document.getElementById('btnOptChangeBudget');
    if (btnOptChangeBudget) {
      btnOptChangeBudget.addEventListener('click', () => {
        window.navigateToPage('budget-setup');
      });
    }
    const btnOptChangeBudgetChecklist = document.getElementById('btnOptChangeBudgetChecklist');
    if (btnOptChangeBudgetChecklist) {
      btnOptChangeBudgetChecklist.addEventListener('click', () => {
        window.navigateToPage('budget-setup');
      });
    }

    // 5-Step Pipeline interactive cards navigation
    document.querySelectorAll('.step-card[data-navigate]').forEach(card => {
      card.addEventListener('click', () => {
        const page = card.getAttribute('data-navigate');
        if (page && window.navigateToPage) {
          window.navigateToPage(page);
        }
      });
    });
  }

  /* ==========================================================================
     Budget Setup View
     ========================================================================== */
  /* ==========================================================================
     Budget Setup View & State Mutation
     ========================================================================== */
  window.applyBudgetChange = function (val, showNotification = true) {
    val = parseFloat(val);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid positive budget greater than 0.', 'danger');
      return false;
    }

    // Check mandatory projects feasibility
    const mandatoryProjects = simulator.projects.filter(
      p => p.isMandatory || (simulator.constraints && simulator.constraints.isProjectMandatory(p.id))
    );
    const mandatoryCost = mandatoryProjects.reduce((sum, p) => sum + p.cost, 0);

    if (mandatoryCost > val) {
      const names = mandatoryProjects.map(p => `"${p.name}" (₹${p.cost} Cr)`).join(', ');
      showToast(
        `Cannot reduce budget to ₹${val} Cr: Mandatory projects [${names}] require at least ₹${mandatoryCost} Cr. Increase budget or uncheck mandatory items in Constraints.`,
        'danger'
      );
      const inputBudget = document.getElementById('inputBudget');
      if (inputBudget) inputBudget.value = simulator.budget.totalBudget;
      updateBudgetSetupDisplay(simulator.budget.totalBudget);
      return false;
    }

    try {
      // If statutory maxTotalBudget constraint was set lower than new budget, lift it so it does not bottleneck optimization
      if (simulator.constraints && simulator.constraints.maxTotalBudget !== null && simulator.constraints.maxTotalBudget < val) {
        simulator.constraints.maxTotalBudget = val;
      }

      simulator.setBudget(val);
      const allocation = simulator.optimize();
      simulator.saveToStorage();
      updateAllViews();

      if (showNotification) {
        showToast(
          `Municipal budget updated to ₹${val} Cr and re-optimized! (${allocation.selectedProjects.length} projects funded, Impact: ${allocation.totalImpact} pts)`,
          'success'
        );
      }
      return true;
    } catch (err) {
      showToast(err.message, 'danger');
      return false;
    }
  };

  function initBudgetSetupView() {
    const budgetForm = document.getElementById('budgetForm');
    const inputBudget = document.getElementById('inputBudget');
    const presets = document.querySelectorAll('.preset-chip');

    // Quick Budget Presets - clicking directly applies the selected budget!
    presets.forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseFloat(chip.dataset.val);
        if (!isNaN(val) && val > 0) {
          applyBudgetChange(val);
        }
      });
    });

    if (inputBudget) {
      // Live preview during typing
      inputBudget.addEventListener('input', () => {
        const val = parseFloat(inputBudget.value);
        if (!isNaN(val) && val > 0) {
          updateBudgetSetupDisplay(val);
        }
      });

      // Apply on change (blur or enter without full form submit)
      inputBudget.addEventListener('change', () => {
        const val = parseFloat(inputBudget.value);
        if (!isNaN(val) && val > 0 && Math.abs(val - simulator.budget.totalBudget) > 0.001) {
          applyBudgetChange(val);
        }
      });
    }

    if (budgetForm) {
      budgetForm.addEventListener('submit', e => {
        e.preventDefault();
        const val = parseFloat(inputBudget ? inputBudget.value : 0);
        applyBudgetChange(val);
      });
    }
  }

  function updateBudgetSetupDisplay(val) {
    const displayBudgetTotal = document.getElementById('displayBudgetTotal');
    const labelBudgetRemaining = document.getElementById('labelBudgetRemaining');
    const labelBudgetUsed = document.getElementById('labelBudgetUsed');
    const progressBar = document.getElementById('budgetSetupProgressBar');

    if (displayBudgetTotal) displayBudgetTotal.textContent = `₹${val} Cr`;

    const used = simulator.budget.usedBudget;
    const remaining = Math.max(0, parseFloat((val - used).toFixed(2)));
    const pct = val > 0 ? Math.min(100, parseFloat(((used / val) * 100).toFixed(1))) : 0;

    if (labelBudgetUsed) labelBudgetUsed.textContent = `Budget Used: ₹${used} Cr (${pct}%)`;
    if (labelBudgetRemaining) labelBudgetRemaining.textContent = `Remaining: ₹${remaining} Cr`;
    if (progressBar) progressBar.style.width = `${pct}%`;
  }

  /* ==========================================================================
     Projects Management View
     ========================================================================== */
  function initProjectsView() {
    const projectForm = document.getElementById('projectForm');
    const projImpactSlider = document.getElementById('projImpactSlider');
    const projImpact = document.getElementById('projImpact');
    const btnCancelEdit = document.getElementById('btnCancelProjectEdit');
    const searchInput = document.getElementById('projectSearchInput');
    const filterCategory = document.getElementById('filterCategory');
    const filterPriority = document.getElementById('filterPriority');
    const btnProjectsLoadDemo = document.getElementById('btnProjectsLoadDemo');
    const btnEmptyLoadDemo = document.getElementById('btnEmptyLoadDemo');
    const btnClearAllProjects = document.getElementById('btnClearAllProjects');

    // Sync impact slider and number input
    if (projImpactSlider && projImpact) {
      projImpactSlider.addEventListener('input', () => {
        projImpact.value = projImpactSlider.value;
      });
      projImpact.addEventListener('input', () => {
        let val = parseInt(projImpact.value, 10);
        if (isNaN(val)) val = 1;
        if (val < 1) val = 1;
        if (val > 100) val = 100;
        projImpactSlider.value = val;
      });
    }

    // Form submit: Add or Edit
    if (projectForm) {
      projectForm.addEventListener('submit', e => {
        e.preventDefault();
        const editId = document.getElementById('editProjectId').value;
        const name = document.getElementById('projName').value.trim();
        const category = document.getElementById('projCategory').value;
        const cost = parseFloat(document.getElementById('projCost').value);
        const impactScore = parseInt(document.getElementById('projImpact').value, 10);
        const priority = document.getElementById('projPriority').value;
        const isMandatory = document.getElementById('projMandatory').checked;

        if (!name) {
          showToast('Project name cannot be empty.', 'danger');
          return;
        }
        if (isNaN(cost) || cost <= 0) {
          showToast('Cost must be a positive number greater than 0.', 'danger');
          return;
        }
        if (isNaN(impactScore) || impactScore < 1 || impactScore > 100) {
          showToast('Impact score must be between 1 and 100.', 'danger');
          return;
        }

        try {
          if (editId) {
            // Update existing
            simulator.updateProject(editId, {
              name,
              category,
              cost,
              impactScore,
              priority,
              isMandatory
            });
            if (isMandatory) {
              simulator.constraints.addMandatoryProject(editId);
            } else {
              simulator.constraints.removeMandatoryProject(editId);
            }
            showToast(`Project "${name}" updated successfully!`, 'success');
            resetProjectForm();
          } else {
            // Add new
            const newProj = simulator.addProject({
              name,
              category,
              cost,
              impactScore,
              priority,
              isMandatory
            });
            if (isMandatory) {
              simulator.constraints.addMandatoryProject(newProj.id);
            }
            showToast(`Added project "${name}" to portfolio!`, 'success');
            resetProjectForm();
          }

          simulator.saveToStorage();
          updateAllViews();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    }

    // Cancel edit
    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', resetProjectForm);
    }

    // Search and filter listeners
    if (searchInput) searchInput.addEventListener('input', renderProjectsTable);
    if (filterCategory) filterCategory.addEventListener('change', renderProjectsTable);
    if (filterPriority) filterPriority.addEventListener('change', renderProjectsTable);

    // Demo loaders
    const handleLoadDemo = () => {
      simulator.loadDemoData();
      simulator.optimize();
      updateAllViews();
      showToast('Loaded demo projects and computed optimal allocation!', 'success');
    };

    if (btnProjectsLoadDemo) btnProjectsLoadDemo.addEventListener('click', handleLoadDemo);
    if (btnEmptyLoadDemo) btnEmptyLoadDemo.addEventListener('click', handleLoadDemo);

    // Clear all projects
    if (btnClearAllProjects) {
      btnClearAllProjects.addEventListener('click', () => {
        if (simulator.projects.length === 0) {
          showToast('No projects to clear.', 'info');
          return;
        }
        showConfirmModal(
          'Delete All Projects?',
          'This will remove all candidate projects from the simulator. This action cannot be undone.',
          () => {
            simulator.projects = [];
            simulator.constraints.mandatoryProjectIds = [];
            simulator.lastAllocation = null;
            simulator.budget.reset();
            simulator.saveToStorage();
            updateAllViews();
            showToast('All projects removed.', 'warning');
          }
        );
      });
    }
  }

  function resetProjectForm() {
    document.getElementById('editProjectId').value = '';
    document.getElementById('projName').value = '';
    document.getElementById('projCategory').value = 'Roads';
    document.getElementById('projCost').value = '';
    document.getElementById('projImpact').value = '75';
    document.getElementById('projImpactSlider').value = '75';
    document.getElementById('projPriority').value = 'Medium';
    document.getElementById('projMandatory').checked = false;

    document.getElementById('projectFormHeading').innerHTML = '<span>➕</span> Add Project';
    document.getElementById('btnSubmitProjectText').textContent = 'Add Project';
    document.getElementById('btnCancelProjectEdit').style.display = 'none';
  }

  window.editProject = function (id) {
    const proj = simulator.getProject(id);
    if (!proj) return;

    window.navigateToPage('projects');

    document.getElementById('editProjectId').value = proj.id;
    document.getElementById('projName').value = proj.name;
    document.getElementById('projCategory').value = proj.category;
    document.getElementById('projCost').value = proj.cost;
    document.getElementById('projImpact').value = proj.impactScore;
    document.getElementById('projImpactSlider').value = proj.impactScore;
    document.getElementById('projPriority').value = proj.priority;
    document.getElementById('projMandatory').checked = proj.isMandatory || simulator.constraints.isProjectMandatory(proj.id);

    document.getElementById('projectFormHeading').innerHTML = '<span>✏️</span> Edit Project';
    document.getElementById('btnSubmitProjectText').textContent = 'Update Project';
    document.getElementById('btnCancelProjectEdit').style.display = 'inline-block';
    document.getElementById('projName').focus();
  };

  window.deleteProject = function (id) {
    const proj = simulator.getProject(id);
    if (!proj) return;

    showConfirmModal(
      `Delete "${proj.name}"?`,
      `Are you sure you want to remove ${proj.name} (₹${proj.cost} Cr, Impact: ${proj.impactScore}) from the candidate pool?`,
      () => {
        simulator.deleteProject(id);
        simulator.saveToStorage();
        updateAllViews();
        showToast(`Removed "${proj.name}".`, 'info');
      }
    );
  };

  function renderProjectsTable() {
    const tbody = document.getElementById('projectsTableBody');
    const emptyState = document.getElementById('projectsEmptyState');
    const tableElement = document.getElementById('projectsTable');
    const searchVal = document.getElementById('projectSearchInput')?.value.toLowerCase() || '';
    const catVal = document.getElementById('filterCategory')?.value || 'ALL';
    const prioVal = document.getElementById('filterPriority')?.value || 'ALL';

    if (!tbody) return;

    let filtered = simulator.projects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchVal);
      const matchCat = catVal === 'ALL' || p.category === catVal;
      const matchPrio = prioVal === 'ALL' || p.priority === prioVal;
      return matchSearch && matchCat && matchPrio;
    });

    if (simulator.projects.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (tableElement) tableElement.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (tableElement) tableElement.style.display = 'table';

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--color-slate-light);">No projects match the search and filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const isSelected = p.status === 'Selected';
      const isRejected = p.status === 'Rejected';
      const statusBadge = isSelected
        ? `<span class="badge badge-success">✓ Selected</span>`
        : isRejected
        ? `<span class="badge badge-danger">✗ Rejected</span>`
        : `<span class="badge badge-neutral">Pending</span>`;

      const prioBadge = p.priority === 'High'
        ? `<span class="badge badge-danger">High</span>`
        : p.priority === 'Medium'
        ? `<span class="badge badge-warning">Medium</span>`
        : `<span class="badge badge-neutral">Low</span>`;

      const catColor = CATEGORY_COLORS[p.category] || '#2563eb';
      const isMandatory = p.isMandatory || simulator.constraints.isProjectMandatory(p.id);

      return `
        <tr>
          <td>
            <strong>${escapeHtml(p.name)}</strong>
            ${isMandatory ? `<span class="badge badge-info" style="margin-left: 0.35rem;">Mandatory</span>` : ''}
          </td>
          <td>
            <span class="category-tag" style="--cat-color: ${catColor}; --cat-bg: ${catColor}15; --cat-border: ${catColor}35;">
              ${escapeHtml(p.category)}
            </span>
          </td>
          <td><strong>${p.getFormattedCost()}</strong></td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span>${p.impactScore}</span>
              <div style="width: 50px; height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                <div style="width: ${p.impactScore}%; height: 100%; background: ${p.impactScore >= 80 ? '#10b981' : p.impactScore >= 60 ? '#3b82f6' : '#f59e0b'};"></div>
              </div>
            </div>
          </td>
          <td>${prioBadge}</td>
          <td><span style="font-size: 0.8rem; font-weight: 600; color: var(--color-slate-light);">${p.getEfficiency()} pts/₹Cr</span></td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <div class="action-btn-group" style="justify-content: flex-end;">
              <button class="btn-icon-action" onclick="editProject('${p.id}')" title="Edit Project">✏️</button>
              <button class="btn-icon-action delete" onclick="deleteProject('${p.id}')" title="Delete Project">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ==========================================================================
     Constraints View
     ========================================================================== */
  function initConstraintsView() {
    const form = document.getElementById('constraintsForm');
    const btnResetConstraints = document.getElementById('btnResetConstraints');
    const presetDefault = document.getElementById('presetPolicyDefault');
    const presetStrict = document.getElementById('presetPolicyStrict');
    const presetPure = document.getElementById('presetPolicyPure');

    // Preset 1: Default Municipal Policy
    if (presetDefault) {
      presetDefault.addEventListener('click', () => {
        simulator.constraints.clear();
        simulator.constraints.maxTotalBudget = null;
        simulator.constraints.setCategoryMin('Healthcare', 20);
        simulator.constraints.setCategoryMax('Education', 30);
        const hospital = simulator.projects.find(p => p.name.toLowerCase().includes('hospital'));
        if (hospital) simulator.constraints.addMandatoryProject(hospital.id);

        [presetDefault, presetStrict, presetPure].forEach(p => p && p.classList.remove('active'));
        presetDefault.classList.add('active');

        loadConstraintsIntoForm();
        try {
          simulator.optimize();
        } catch (e) {
          console.warn('Preset optimization warning:', e);
        }
        simulator.saveToStorage();
        updateAllViews();
        showToast('Enforced Default Policy: Min Healthcare ₹20 Cr, Max Education ₹30 Cr, Mandatory Hospital.', 'info');
      });
    }

    // Preset 2: Health & Water Focus
    if (presetStrict) {
      presetStrict.addEventListener('click', () => {
        simulator.constraints.clear();
        simulator.constraints.maxTotalBudget = null;
        simulator.constraints.setCategoryMin('Healthcare', 30);
        simulator.constraints.setCategoryMin('Water Supply', 20);
        simulator.constraints.setCategoryMax('Roads', 25);
        const hospital = simulator.projects.find(p => p.name.toLowerCase().includes('hospital'));
        const water = simulator.projects.find(p => p.name.toLowerCase().includes('water'));
        if (hospital) simulator.constraints.addMandatoryProject(hospital.id);
        if (water) simulator.constraints.addMandatoryProject(water.id);

        [presetDefault, presetStrict, presetPure].forEach(p => p && p.classList.remove('active'));
        presetStrict.classList.add('active');

        loadConstraintsIntoForm();
        try {
          simulator.optimize();
        } catch (e) {
          console.warn('Preset optimization warning:', e);
        }
        simulator.saveToStorage();
        updateAllViews();
        showToast('Enforced Health & Water Mandate: Min Healthcare ₹30 Cr, Min Water ₹20 Cr, Max Roads ₹25 Cr.', 'info');
      });
    }

    // Preset 3: Pure 0/1 Knapsack
    if (presetPure) {
      presetPure.addEventListener('click', () => {
        simulator.constraints.clear();
        simulator.projects.forEach(p => p.isMandatory = false);

        [presetDefault, presetStrict, presetPure].forEach(p => p && p.classList.remove('active'));
        presetPure.classList.add('active');

        loadConstraintsIntoForm();
        try {
          simulator.optimize();
        } catch (e) {
          console.warn('Preset optimization warning:', e);
        }
        simulator.saveToStorage();
        updateAllViews();
        showToast('Applied Pure 0/1 Knapsack: No category caps, all projects evaluated strictly on ROI.', 'info');
      });
    }

    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        saveConstraintsFromForm();
        try {
          simulator.optimize();
        } catch (err) {
          showToast(err.message, 'warning');
        }
        updateAllViews();
        showToast('Constraints saved and enforced successfully!', 'success');
      });
    }

    if (btnResetConstraints) {
      btnResetConstraints.addEventListener('click', () => {
        simulator.constraints.clear();
        simulator.projects.forEach(p => p.isMandatory = false);
        [presetDefault, presetStrict, presetPure].forEach(p => p && p.classList.remove('active'));
        loadConstraintsIntoForm();
        try {
          simulator.optimize();
        } catch (e) {}
        simulator.saveToStorage();
        updateAllViews();
        showToast('All policy constraints cleared.', 'info');
      });
    }
  }

  function loadConstraintsIntoForm() {
    const c = simulator.constraints;
    const constMaxBudget = document.getElementById('constMaxBudget');
    const constMinHealthcare = document.getElementById('constMinHealthcare');
    const constMinWater = document.getElementById('constMinWater');
    const constMaxEducation = document.getElementById('constMaxEducation');
    const constMaxRoads = document.getElementById('constMaxRoads');
    const checklist = document.getElementById('mandatoryProjectsChecklist');

    if (constMaxBudget) constMaxBudget.value = c.maxTotalBudget || '';
    if (constMinHealthcare) constMinHealthcare.value = c.categoryMinAllocations['Healthcare'] || '';
    if (constMinWater) constMinWater.value = c.categoryMinAllocations['Water Supply'] || '';
    if (constMaxEducation) constMaxEducation.value = c.categoryMaxAllocations['Education'] || '';
    if (constMaxRoads) constMaxRoads.value = c.categoryMaxAllocations['Roads'] || '';

    // Render mandatory checkboxes
    if (checklist) {
      if (simulator.projects.length === 0) {
        checklist.innerHTML = '<span style="font-size: 0.82rem; color: var(--color-slate-light);">No projects registered. Add projects first.</span>';
      } else {
        checklist.innerHTML = simulator.projects.map(p => {
          const isChecked = c.isProjectMandatory(p.id) || p.isMandatory;
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0; font-size: 0.85rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" name="mandatory_project" value="${p.id}" ${isChecked ? 'checked' : ''}>
                <span>${escapeHtml(p.name)} (${p.category})</span>
              </label>
              <strong style="font-size: 0.8rem; color: var(--color-slate-light);">${p.getFormattedCost()}</strong>
            </div>
          `;
        }).join('');
      }
    }

    renderActiveConstraintsList();
  }

  function saveConstraintsFromForm() {
    const constMaxBudget = parseFloat(document.getElementById('constMaxBudget')?.value);
    const constMinHealthcare = parseFloat(document.getElementById('constMinHealthcare')?.value);
    const constMinWater = parseFloat(document.getElementById('constMinWater')?.value);
    const constMaxEducation = parseFloat(document.getElementById('constMaxEducation')?.value);
    const constMaxRoads = parseFloat(document.getElementById('constMaxRoads')?.value);

    simulator.constraints.maxTotalBudget = !isNaN(constMaxBudget) && constMaxBudget > 0 ? constMaxBudget : null;

    if (!isNaN(constMinHealthcare) && constMinHealthcare > 0) {
      simulator.constraints.setCategoryMin('Healthcare', constMinHealthcare);
    } else {
      delete simulator.constraints.categoryMinAllocations['Healthcare'];
    }

    if (!isNaN(constMinWater) && constMinWater > 0) {
      simulator.constraints.setCategoryMin('Water Supply', constMinWater);
    } else {
      delete simulator.constraints.categoryMinAllocations['Water Supply'];
    }

    if (!isNaN(constMaxEducation) && constMaxEducation > 0) {
      simulator.constraints.setCategoryMax('Education', constMaxEducation);
    } else {
      delete simulator.constraints.categoryMaxAllocations['Education'];
    }

    if (!isNaN(constMaxRoads) && constMaxRoads > 0) {
      simulator.constraints.setCategoryMax('Roads', constMaxRoads);
    } else {
      delete simulator.constraints.categoryMaxAllocations['Roads'];
    }

    // Save mandatory checkboxes
    const checkedBoxes = document.querySelectorAll('input[name="mandatory_project"]:checked');
    const checkedIds = Array.from(checkedBoxes).map(cb => cb.value);
    simulator.constraints.mandatoryProjectIds = checkedIds;

    // Update project entities
    simulator.projects.forEach(p => {
      p.isMandatory = checkedIds.includes(p.id);
    });

    simulator.saveToStorage();
  }

  function renderActiveConstraintsList() {
    const container = document.getElementById('activeConstraintsList');
    const badge = document.getElementById('constraintCountBadge');
    if (!container) return;

    const items = [];
    const c = simulator.constraints;

    if (c.maxTotalBudget) {
      items.push({
        title: 'Maximum Total Budget Cap',
        desc: `Optimization capped at ₹${c.maxTotalBudget} Cr`,
        icon: '💰'
      });
    }

    if (c.categoryMinAllocations['Healthcare']) {
      items.push({
        title: 'Minimum Healthcare Allocation',
        desc: `Guaranteed minimum ₹${c.categoryMinAllocations['Healthcare']} Cr for Healthcare`,
        icon: '🏥'
      });
    }

    if (c.categoryMinAllocations['Water Supply']) {
      items.push({
        title: 'Minimum Water Supply Allocation',
        desc: `Guaranteed minimum ₹${c.categoryMinAllocations['Water Supply']} Cr for clean water`,
        icon: '💧'
      });
    }

    if (c.categoryMaxAllocations['Education']) {
      items.push({
        title: 'Maximum Education Allocation',
        desc: `Education expenditure capped at ₹${c.categoryMaxAllocations['Education']} Cr`,
        icon: '🎓'
      });
    }

    if (c.categoryMaxAllocations['Roads']) {
      items.push({
        title: 'Maximum Roads Allocation',
        desc: `Roads expenditure capped at ₹${c.categoryMaxAllocations['Roads']} Cr`,
        icon: '🛣️'
      });
    }

    if (c.mandatoryProjectIds.length > 0) {
      const names = c.mandatoryProjectIds.map(id => simulator.getProject(id)?.name).filter(Boolean);
      items.push({
        title: 'Mandatory Projects',
        desc: `Compulsory: ${names.join(', ')}`,
        icon: '⭐'
      });
    }

    if (badge) badge.textContent = `${items.length} Active`;

    if (items.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: var(--color-slate-light);">No constraints currently active. The optimizer will use unconstrained 0/1 knapsack.</p>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div style="background-color: var(--color-bg-muted); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.25rem;">${item.icon}</span>
        <div>
          <div style="font-weight: 700; font-size: 0.85rem; color: var(--color-navy);">${escapeHtml(item.title)}</div>
          <div style="font-size: 0.78rem; color: var(--color-slate-medium);">${escapeHtml(item.desc)}</div>
        </div>
      </div>
    `).join('');
  }

  /* ==========================================================================
     Optimize View & Execution
     ========================================================================== */
  function initOptimizeView() {
    const btnRunOptimization = document.getElementById('btnRunOptimization');
    const btnBannerViewResults = document.getElementById('btnBannerViewResults');

    if (btnRunOptimization) {
      btnRunOptimization.addEventListener('click', runOptimizationWorkflow);
    }

    if (btnBannerViewResults) {
      btnBannerViewResults.addEventListener('click', () => {
        window.navigateToPage('results');
      });
    }
  }

  function runOptimizationWorkflow() {
    if (simulator.projects.length === 0) {
      showToast('No projects available to optimize! Please add projects or load demo data.', 'warning');
      return;
    }

    if (simulator.budget.totalBudget <= 0) {
      showToast('Please set a valid positive municipal budget before optimizing.', 'warning');
      return;
    }

    const overlay = document.getElementById('processingOverlay');
    const processingTitle = document.getElementById('processingTitle');
    const processingStep = document.getElementById('processingStep');
    const processingBar = document.getElementById('processingBar');

    if (overlay) overlay.style.display = 'flex';

    const steps = [
      { text: 'Discretizing project costs and initializing DP state array...', bar: '30%' },
      { text: 'Computing 0/1 Knapsack recurrence: dp[i][b] = max(dp[i-1][b], dp[i-1][b - cost[i]] + impact[i])...', bar: '65%' },
      { text: 'Verifying mandatory projects and statutory category caps...', bar: '90%' },
      { text: 'Backtracking optimal project frontier and generating trade-offs...', bar: '100%' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        if (processingStep) processingStep.textContent = steps[currentStep].text;
        if (processingBar) processingBar.style.width = steps[currentStep].bar;
        currentStep++;
      } else {
        clearInterval(interval);
        try {
          const allocation = simulator.optimize();
          simulator.saveToStorage();

          if (overlay) overlay.style.display = 'none';

          // Show success banner on optimize page
          const banner = document.getElementById('optimizationSuccessBanner');
          if (banner) {
            banner.style.display = 'block';
            document.getElementById('bannerMaxImpact').textContent = allocation.totalImpact;
            document.getElementById('bannerBudgetUsed').textContent = `₹${allocation.totalCost} Cr`;
            document.getElementById('bannerBudgetRemaining').textContent = `₹${allocation.remainingBudget} Cr`;
          }

          updateAllViews();
          showToast(`Optimization complete! Maximum impact: ${allocation.totalImpact} pts`, 'success');
        } catch (err) {
          if (overlay) overlay.style.display = 'none';
          showToast(err.message, 'danger');
        }
      }
    }, 200);
  }

  /* ==========================================================================
     Results View & Visualizations (Chart.js)
     ========================================================================== */
  function initResultsView() {
    const btnPrint = document.getElementById('btnPrintReport');
    const btnExportCSV = document.getElementById('btnExportCSV');
    const whatIfSlider = document.getElementById('whatIfSlider');
    const whatIfDisplay = document.getElementById('whatIfDisplay');
    const btnApplyWhatIf = document.getElementById('btnApplyWhatIf');

    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', exportResultsToCSV);
    }

    if (whatIfSlider) {
      whatIfSlider.addEventListener('input', () => {
        const val = parseFloat(whatIfSlider.value);
        if (whatIfDisplay) whatIfDisplay.textContent = `₹${val} Cr`;
        updateWhatIfPreview(val);
      });
    }

    if (btnApplyWhatIf) {
      btnApplyWhatIf.addEventListener('click', () => {
        const val = parseFloat(whatIfSlider ? whatIfSlider.value : 100);
        if (!isNaN(val) && val > 0) {
          applyBudgetChange(val);
        }
      });
    }
  }

  function updateWhatIfPreview(budgetVal) {
    if (!simulator || simulator.projects.length === 0) return;
    try {
      const res = simulator.runScenario(budgetVal, 'What-If');
      const impactSpan = document.getElementById('whatIfImpactSpan');
      const usedSpan = document.getElementById('whatIfUsedSpan');
      const countSpan = document.getElementById('whatIfCountSpan');

      if (impactSpan) impactSpan.textContent = `${res.totalImpact} pts`;
      if (usedSpan) usedSpan.textContent = `₹${res.totalCost} Cr`;
      if (countSpan) countSpan.textContent = `${res.selectedProjects.length} of ${simulator.projects.length} projects`;
    } catch (e) {
      // Quietly ignore edge cases
    }
  }

  function renderResultsData() {
    const alloc = simulator.lastAllocation;
    if (!alloc) return;

    // Update KPI Cards
    const resTotal = document.getElementById('resTotalBudget');
    const resUsed = document.getElementById('resUsedBudget');
    const resRemaining = document.getElementById('resRemainingBudget');
    const resImpact = document.getElementById('resMaxImpact');
    const resSelected = document.getElementById('resSelectedCount');
    const resUsedPercentBadge = document.getElementById('resUsedPercentBadge');
    const resSelectedRatio = document.getElementById('resSelectedRatio');

    if (resTotal) resTotal.textContent = `₹${alloc.totalBudget} Cr`;
    if (resUsed) resUsed.textContent = `₹${alloc.totalCost} Cr`;
    if (resRemaining) resRemaining.textContent = `₹${alloc.remainingBudget} Cr`;
    if (resImpact) resImpact.textContent = alloc.totalImpact;
    if (resSelected) resSelected.textContent = alloc.selectedProjects.length;
    if (resUsedPercentBadge) resUsedPercentBadge.textContent = `${alloc.utilizationPercent}% Utilized`;
    if (resSelectedRatio) resSelectedRatio.textContent = `${alloc.selectedProjects.length} of ${simulator.projects.length} funded`;

    // Utilization Progress Bar
    const resProgressBar = document.getElementById('resProgressBar');
    const resProgressUsedLabel = document.getElementById('resProgressUsedLabel');
    const resProgressRemainingLabel = document.getElementById('resProgressRemainingLabel');
    const resUtilizationBadge = document.getElementById('resUtilizationBadge');

    if (resProgressBar) resProgressBar.style.width = `${alloc.utilizationPercent}%`;
    if (resProgressUsedLabel) resProgressUsedLabel.textContent = `Budget Used: ₹${alloc.totalCost} Cr (${alloc.utilizationPercent}%)`;
    if (resProgressRemainingLabel) {
      const remPct = alloc.totalBudget > 0 ? parseFloat(((alloc.remainingBudget / alloc.totalBudget) * 100).toFixed(1)) : 0;
      resProgressRemainingLabel.textContent = `Remaining Reserve: ₹${alloc.remainingBudget} Cr (${remPct}%)`;
    }
    if (resUtilizationBadge) resUtilizationBadge.textContent = `${alloc.utilizationPercent}% Deployed`;

    // Render Tables
    const selTbody = document.getElementById('selectedProjectsTableBody');
    const rejTbody = document.getElementById('rejectedProjectsTableBody');
    const badgeSel = document.getElementById('badgeSelectedCount');
    const badgeRej = document.getElementById('badgeRejectedCount');

    if (badgeSel) badgeSel.textContent = `${alloc.selectedProjects.length} Projects`;
    if (badgeRej) badgeRej.textContent = `${alloc.rejectedProjects.length} Projects`;

    if (selTbody) {
      if (alloc.selectedProjects.length === 0) {
        selTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--color-slate-light);">No projects were selected within the current budget envelope.</td></tr>`;
      } else {
        selTbody.innerHTML = alloc.selectedProjects.map(p => {
          const catColor = CATEGORY_COLORS[p.category] || '#2563eb';
          return `
            <tr>
              <td>
                <strong>${escapeHtml(p.name)}</strong>
                ${p.isMandatory ? `<span class="badge badge-info" style="margin-left: 0.35rem;">Mandatory</span>` : ''}
              </td>
              <td>
                <span class="category-tag" style="--cat-color: ${catColor}; --cat-bg: ${catColor}15; --cat-border: ${catColor}35;">
                  ${escapeHtml(p.category)}
                </span>
              </td>
              <td><strong>${p.getFormattedCost()}</strong></td>
              <td><span style="font-weight: 700; color: var(--color-navy);">${p.impactScore} / 100</span></td>
              <td><span class="badge ${p.priority === 'High' ? 'badge-danger' : 'badge-warning'}">${p.priority}</span></td>
              <td><span style="font-weight: 700; color: var(--color-success);">${p.getEfficiency()} pts/₹Cr</span></td>
              <td><span class="badge badge-success">✓ Approved</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    if (rejTbody) {
      if (alloc.rejectedProjects.length === 0) {
        rejTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--color-success);">🎉 All candidate projects were funded within budget!</td></tr>`;
      } else {
        rejTbody.innerHTML = alloc.rejectedProjects.map(p => {
          const catColor = CATEGORY_COLORS[p.category] || '#2563eb';
          return `
            <tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td>
                <span class="category-tag" style="--cat-color: ${catColor}; --cat-bg: ${catColor}15; --cat-border: ${catColor}35;">
                  ${escapeHtml(p.category)}
                </span>
              </td>
              <td>${p.getFormattedCost()}</td>
              <td>${p.impactScore} / 100</td>
              <td><span class="badge badge-neutral">${p.priority}</span></td>
              <td style="font-size: 0.82rem; color: var(--color-danger); max-width: 320px;">
                ${escapeHtml(p.selectionReason || 'Exceeds remaining budget capacity.')}
              </td>
              <td><span class="badge badge-danger">✗ Deferred</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    // Why Were These Projects Selected? Explanation Section
    const reasoningList = document.getElementById('selectionReasoningList');
    if (reasoningList) {
      if (alloc.selectedProjects.length === 0) {
        reasoningList.innerHTML = `<p style="color: var(--color-slate-light);">No projects funded to analyze.</p>`;
      } else {
        reasoningList.innerHTML = alloc.selectedProjects.map(p => `
          <div class="reasoning-card">
            <div class="reasoning-card-header">
              <span class="reasoning-project-title">${escapeHtml(p.name)} (${escapeHtml(p.category)})</span>
              <span class="badge badge-success">Cost: ${p.getFormattedCost()} | Impact: ${p.impactScore}</span>
            </div>
            <div class="reasoning-text">
              ${escapeHtml(p.selectionReason || `High impact of ${p.impactScore} with a cost of ${p.getFormattedCost()}. Selected by DP to maximize cumulative societal welfare.`)}
            </div>
          </div>
        `).join('');
      }
    }

    // Render DP Matrix Inspector table
    renderDPMatrixInspector(alloc.dpTableSummary);
  }

  function renderDPMatrixInspector(dpSummary) {
    const container = document.getElementById('dpMatrixContainer');
    if (!container) return;

    if (!dpSummary || !dpSummary.sampleRows || dpSummary.sampleRows.length === 0) {
      container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--color-slate-light);">Constrained Optimization solved via Branch-and-Bound Memoized DP.</div>`;
      return;
    }

    let html = `<table class="dp-table"><thead><tr><th>Project \\ Budget (₹ Cr)</th>`;
    dpSummary.sampleCols.forEach(c => {
      html += `<th>₹${c.budgetCrores} Cr</th>`;
    });
    html += `</tr></thead><tbody>`;

    dpSummary.sampleRows.forEach(row => {
      html += `<tr><td><strong>${escapeHtml(row.projectName)}</strong> (₹${row.cost} Cr, Imp: ${row.impact})</td>`;
      row.values.forEach(val => {
        html += `<td>${val}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;

    container.innerHTML = html;
  }

  function renderResultsCharts() {
    const alloc = simulator.lastAllocation;
    if (!alloc || typeof Chart === 'undefined') return;

    // 1. Category Doughnut Chart: Budget Allocation by Category
    const doughnutCanvas = document.getElementById('categoryDoughnutChart');
    if (doughnutCanvas) {
      const categories = Object.keys(alloc.categoryBreakdown);
      const dataCosts = categories.map(cat => alloc.categoryBreakdown[cat].cost);
      const bgColors = categories.map(cat => CATEGORY_COLORS[cat] || '#3b82f6');

      if (charts.categoryDoughnut) charts.categoryDoughnut.destroy();

      charts.categoryDoughnut = new Chart(doughnutCanvas, {
        type: 'doughnut',
        data: {
          labels: categories.length ? categories : ['Unallocated'],
          datasets: [{
            data: dataCosts.length ? dataCosts : [alloc.totalBudget],
            backgroundColor: bgColors.length ? bgColors : ['#cbd5e1'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ₹${ctx.parsed} Cr (${alloc.totalCost > 0 ? ((ctx.parsed / alloc.totalCost) * 100).toFixed(1) : 0}%)`
              }
            }
          },
          cutout: '65%'
        }
      });
    }

    // 2. Project Impact Bar Chart (Selected vs Rejected)
    const impactCanvas = document.getElementById('projectImpactBarChart');
    if (impactCanvas) {
      const allProjects = simulator.projects;
      const labels = allProjects.map(p => p.name);
      const impactValues = allProjects.map(p => p.impactScore);
      const colors = allProjects.map(p => p.status === 'Selected' ? '#059669' : '#cbd5e1');

      if (charts.projectImpact) charts.projectImpact.destroy();

      charts.projectImpact = new Chart(impactCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Impact Score (1-100)',
            data: impactValues,
            backgroundColor: colors,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 100, title: { display: true, text: 'Impact Score' } },
            x: { ticks: { font: { size: 10 } } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: ctx => {
                  const p = allProjects[ctx.dataIndex];
                  return `Status: ${p.status} | Cost: ₹${p.cost} Cr`;
                }
              }
            }
          }
        }
      });
    }

    // 3. Category Impact Chart: Total Impact by Category
    const catImpactCanvas = document.getElementById('categoryImpactChart');
    if (catImpactCanvas) {
      const categories = Object.keys(alloc.categoryBreakdown);
      const dataImpacts = categories.map(cat => alloc.categoryBreakdown[cat].impact);
      const bgColors = categories.map(cat => CATEGORY_COLORS[cat] || '#3b82f6');

      if (charts.categoryImpact) charts.categoryImpact.destroy();

      charts.categoryImpact = new Chart(catImpactCanvas, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: [{
            label: 'Total Social Impact Points',
            data: dataImpacts,
            backgroundColor: bgColors,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Total Impact Points' } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    // 4. Efficiency Chart (Social ROI: Impact per Crore)
    const efficiencyCanvas = document.getElementById('efficiencyBarChart');
    if (efficiencyCanvas) {
      const sortedByEfficiency = [...simulator.projects].sort((a, b) => b.getEfficiency() - a.getEfficiency());
      const labels = sortedByEfficiency.map(p => p.name);
      const values = sortedByEfficiency.map(p => p.getEfficiency());
      const colors = sortedByEfficiency.map(p => p.status === 'Selected' ? '#2563eb' : '#94a3b8');

      if (charts.efficiency) charts.efficiency.destroy();

      charts.efficiency = new Chart(efficiencyCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Efficiency (Impact Points per ₹ Cr)',
            data: values,
            backgroundColor: colors,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { beginAtZero: true, title: { display: true, text: 'Impact Points / ₹ Cr' } },
            y: { ticks: { font: { size: 11 } } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }

  function exportResultsToCSV() {
    const alloc = simulator.lastAllocation;
    if (!alloc) {
      showToast('No optimization results to export.', 'warning');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Type,Project Name,Category,Cost (Cr),Impact Score,Priority,Efficiency (Pts/Cr),Status,Rationale\n';

    simulator.projects.forEach(p => {
      const reason = (p.selectionReason || '').replace(/"/g, '""');
      csvContent += `"${p.status}","${p.name}","${p.category}",${p.cost},${p.impactScore},"${p.priority}",${p.getEfficiency()},"${p.status}","${reason}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `city_budget_optimization_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Results report exported to CSV!', 'success');
  }

  /* ==========================================================================
     Scenario Comparison & Trade-Off Analysis
     ========================================================================== */
  function initScenariosView() {
    const btnRunA = document.getElementById('btnRunScenarioA');
    const btnRunB = document.getElementById('btnRunScenarioB');
    const btnRunC = document.getElementById('btnRunScenarioC');
    const btnRunCustom = document.getElementById('btnRunCustomScenario');
    const btnRunAll = document.getElementById('btnRunAllScenarios');

    const btnApplyA = document.getElementById('btnApplyScenarioA');
    const btnApplyB = document.getElementById('btnApplyScenarioB');
    const btnApplyC = document.getElementById('btnApplyScenarioC');
    const btnApplyCustom = document.getElementById('btnApplyCustomScenario');

    if (btnRunA) btnRunA.addEventListener('click', () => runSpecificScenario('Scenario A', 80));
    if (btnRunB) btnRunB.addEventListener('click', () => runSpecificScenario('Scenario B', 100));
    if (btnRunC) btnRunC.addEventListener('click', () => runSpecificScenario('Scenario C', 120));

    if (btnApplyA) {
      btnApplyA.addEventListener('click', () => {
        applyBudgetChange(80);
        window.navigateToPage('results');
      });
    }
    if (btnApplyB) {
      btnApplyB.addEventListener('click', () => {
        applyBudgetChange(100);
        window.navigateToPage('results');
      });
    }
    if (btnApplyC) {
      btnApplyC.addEventListener('click', () => {
        applyBudgetChange(120);
        window.navigateToPage('results');
      });
    }

    if (btnRunCustom) {
      btnRunCustom.addEventListener('click', () => {
        const val = parseFloat(document.getElementById('inputCustomScenarioBudget')?.value);
        if (isNaN(val) || val <= 0) {
          showToast('Enter a valid budget for custom scenario.', 'danger');
          return;
        }
        runSpecificScenario(`Custom (₹${val} Cr)`, val);
      });
    }

    if (btnApplyCustom) {
      btnApplyCustom.addEventListener('click', () => {
        const val = parseFloat(document.getElementById('inputCustomScenarioBudget')?.value);
        if (isNaN(val) || val <= 0) {
          showToast('Enter a valid budget for custom scenario.', 'danger');
          return;
        }
        applyBudgetChange(val);
        window.navigateToPage('results');
      });
    }

    if (btnRunAll) {
      btnRunAll.addEventListener('click', () => {
        renderScenarioComparison(true);
        showToast('All scenarios computed and compared!', 'success');
      });
    }
  }

  function runSpecificScenario(name, budgetVal) {
    try {
      const res = simulator.runScenario(budgetVal, name);
      showToast(`${name} simulated: Impact ${res.totalImpact} under ₹${res.totalCost} Cr!`, 'success');
      renderScenarioComparison();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  function renderScenarioComparison(forceRunAll = false) {
    if (simulator.projects.length === 0) return;

    // Compute scenarios: A (80 Cr), B (100 Cr), C (120 Cr)
    const resA = simulator.runScenario(80, 'Scenario A (Austerity)');
    const resB = simulator.runScenario(100, 'Scenario B (Baseline)');
    const resC = simulator.runScenario(120, 'Scenario C (Expanded)');

    // Update cards
    const setCard = (prefix, res) => {
      const usedEl = document.getElementById(`${prefix}_Used`);
      const impactEl = document.getElementById(`${prefix}_Impact`);
      const countEl = document.getElementById(`${prefix}_Count`);
      if (usedEl) usedEl.textContent = `₹${res.totalCost} Cr (${res.utilizationPercent}%)`;
      if (impactEl) impactEl.textContent = `${res.totalImpact} pts`;
      if (countEl) countEl.textContent = `${res.selectedProjects.length} projects`;
    };

    setCard('scenA', resA);
    setCard('scenB', resB);
    setCard('scenC', resC);

    const scenarioList = [resA, resB, resC];

    // Check if custom scenario input exists
    const customBudget = parseFloat(document.getElementById('inputCustomScenarioBudget')?.value);
    if (!isNaN(customBudget) && customBudget > 0 && customBudget !== 80 && customBudget !== 100 && customBudget !== 120) {
      try {
        const resCustom = simulator.runScenario(customBudget, `Custom (₹${customBudget} Cr)`);
        scenarioList.push(resCustom);
      } catch (e) {}
    }

    // Comparison Table
    const tbody = document.getElementById('scenarioComparisonTableBody');
    if (tbody) {
      let prevImpact = 0;
      let prevBudget = 0;

      tbody.innerHTML = scenarioList.map((scen, idx) => {
        const marginalImpact = idx === 0 ? '--' : `+${scen.totalImpact - prevImpact} pts`;
        const marginalCost = idx === 0 ? '--' : `(+₹${scen.totalBudget - prevBudget} Cr)`;
        const marginalLabel = idx === 0 ? 'Baseline' : `${marginalImpact} ${marginalCost}`;

        prevImpact = scen.totalImpact;
        prevBudget = scen.totalBudget;

        return `
          <tr>
            <td><strong>${escapeHtml(scen.scenarioName)}</strong></td>
            <td>₹${scen.totalBudget} Cr</td>
            <td><strong>₹${scen.totalCost} Cr</strong></td>
            <td>₹${scen.remainingBudget} Cr</td>
            <td>${scen.utilizationPercent}%</td>
            <td>${scen.selectedProjects.length}</td>
            <td><strong style="color: var(--color-primary); font-size: 1rem;">${scen.totalImpact} pts</strong></td>
            <td><span class="badge ${idx > 0 ? 'badge-success' : 'badge-neutral'}">${marginalLabel}</span></td>
          </tr>
        `;
      }).join('');
    }

    // Comparison Sensitivity Chart (Chart.js)
    const chartCanvas = document.getElementById('scenarioComparisonChart');
    if (chartCanvas && typeof Chart !== 'undefined') {
      const labels = scenarioList.map(s => s.scenarioName);
      const budgets = scenarioList.map(s => s.totalBudget);
      const usedBudgets = scenarioList.map(s => s.totalCost);
      const impacts = scenarioList.map(s => s.totalImpact);

      if (charts.scenarioComparison) charts.scenarioComparison.destroy();

      charts.scenarioComparison = new Chart(chartCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              type: 'bar',
              label: 'Allocated Capital (₹ Cr)',
              data: usedBudgets,
              backgroundColor: '#93c5fd',
              yAxisID: 'yBudget',
              borderRadius: 4
            },
            {
              type: 'line',
              label: 'Achieved Social Impact',
              data: impacts,
              borderColor: '#2563eb',
              backgroundColor: '#2563eb',
              borderWidth: 3,
              pointRadius: 6,
              yAxisID: 'yImpact'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            yBudget: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Budget (₹ Cr)' }
            },
            yImpact: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Social Impact Score' },
              grid: { drawOnChartArea: false }
            }
          }
        }
      });
    }

    // Trade-Off Analysis Dynamic Statements
    renderTradeOffAnalysisStatements();
  }

  function renderTradeOffAnalysisStatements() {
    const container = document.getElementById('tradeoffStatementsContainer');
    if (!container) return;

    const statements = simulator.generateTradeOffAnalysis();
    if (!statements || statements.length === 0) {
      container.innerHTML = `<p style="color: var(--color-slate-light);">Run an optimization to view trade-off sensitivity insights.</p>`;
      return;
    }

    container.innerHTML = statements.map(s => `
      <div class="tradeoff-item">
        <div class="tradeoff-icon">${s.icon}</div>
        <div class="tradeoff-body">
          <h4>${escapeHtml(s.title)}</h4>
          <p>${escapeHtml(s.text)}</p>
        </div>
      </div>
    `).join('');
  }

  /* ==========================================================================
     Global State Synchronization (updateAllViews)
     ========================================================================== */
  function updateAllViews() {
    const b = simulator.budget;
    const alloc = simulator.lastAllocation;

    // 1. Header Pills & Sidebar Count
    const pillTotal = document.getElementById('pillTotalBudget');
    const pillUsed = document.getElementById('pillUsedBudget');
    const pillRemaining = document.getElementById('pillRemainingBudget');
    const sidebarCount = document.getElementById('sidebarProjectCount');

    if (pillTotal) pillTotal.textContent = `₹${b.totalBudget} Cr`;
    if (pillUsed) pillUsed.textContent = `₹${b.usedBudget} Cr`;
    if (pillRemaining) pillRemaining.textContent = `₹${b.remainingBudget} Cr`;
    if (sidebarCount) sidebarCount.textContent = simulator.projects.length;

    // 2. Dashboard KPIs
    const dashTotal = document.getElementById('dashTotalBudget');
    const dashUsed = document.getElementById('dashAllocatedBudget');
    const dashRemaining = document.getElementById('dashRemainingBudget');
    const dashTotalProjects = document.getElementById('dashTotalProjects');
    const dashMaxImpact = document.getElementById('dashMaxImpact');
    const dashAllocatedPct = document.getElementById('dashAllocatedPct');
    const dashProjectsSummary = document.getElementById('dashProjectsSummary');

    if (dashTotal) dashTotal.textContent = `₹${b.totalBudget} Cr`;
    if (dashUsed) dashUsed.textContent = `₹${b.usedBudget} Cr`;
    if (dashRemaining) dashRemaining.textContent = `₹${b.remainingBudget} Cr`;
    if (dashTotalProjects) dashTotalProjects.textContent = simulator.projects.length;
    if (dashAllocatedPct) dashAllocatedPct.textContent = `${b.getUtilizationPercentage()}% utilized`;
    if (dashProjectsSummary) dashProjectsSummary.textContent = `${simulator.projects.length} candidate projects registered`;
    if (dashMaxImpact) dashMaxImpact.textContent = alloc ? alloc.totalImpact : 0;

    // Dashboard Projects Preview Table
    renderDashboardProjectsTable();

    // 3. Budget Setup View
    updateBudgetSetupDisplay(b.totalBudget);
    const inputBudget = document.getElementById('inputBudget');
    if (inputBudget && document.activeElement !== inputBudget) {
      inputBudget.value = b.totalBudget;
    }

    // Sync quick preset chips active highlight
    const presets = document.querySelectorAll('.preset-chip');
    presets.forEach(chip => {
      const chipVal = parseFloat(chip.dataset.val);
      chip.classList.toggle('active', Math.abs(chipVal - b.totalBudget) < 0.001);
    });

    // 4. Projects View
    renderProjectsTable();

    // 5. Constraints View
    loadConstraintsIntoForm();

    // 6. Optimize View Checklist & Banner
    const optCheckBudget = document.getElementById('optCheckBudget');
    const optCheckProjects = document.getElementById('optCheckProjects');
    const optCheckConstraints = document.getElementById('optCheckConstraints');
    const optBudgetVal = document.getElementById('optBudgetVal');

    if (optCheckBudget) optCheckBudget.textContent = `₹${b.totalBudget} Cr`;
    if (optCheckProjects) optCheckProjects.textContent = `${simulator.projects.length} projects registered`;
    if (optBudgetVal) optBudgetVal.textContent = b.totalBudget;

    const bannerBudgetUsed = document.getElementById('bannerBudgetUsed');
    const bannerBudgetRemaining = document.getElementById('bannerBudgetRemaining');
    const bannerMaxImpact = document.getElementById('bannerMaxImpact');
    if (alloc) {
      if (bannerBudgetUsed) bannerBudgetUsed.textContent = `₹${alloc.totalCost} Cr`;
      if (bannerBudgetRemaining) bannerBudgetRemaining.textContent = `₹${alloc.remainingBudget} Cr`;
      if (bannerMaxImpact) bannerMaxImpact.textContent = alloc.totalImpact;
    }

    let activeConstraintCount = 0;
    if (simulator.constraints.maxTotalBudget) activeConstraintCount++;
    activeConstraintCount += Object.keys(simulator.constraints.categoryMinAllocations).length;
    activeConstraintCount += Object.keys(simulator.constraints.categoryMaxAllocations).length;
    activeConstraintCount += simulator.constraints.mandatoryProjectIds.length;
    if (optCheckConstraints) optCheckConstraints.textContent = `${activeConstraintCount} rule(s) active`;

    // 7. Results View & What-If Slider Synchronization
    renderResultsData();
    renderResultsCharts();

    const whatIfSlider = document.getElementById('whatIfSlider');
    const whatIfDisplay = document.getElementById('whatIfDisplay');
    if (whatIfSlider && document.activeElement !== whatIfSlider) {
      whatIfSlider.value = b.totalBudget;
      if (whatIfDisplay) whatIfDisplay.textContent = `₹${b.totalBudget} Cr`;
      updateWhatIfPreview(b.totalBudget);
    }

    // 8. Scenario Comparison
    renderScenarioComparison();
  }

  function renderDashboardProjectsTable() {
    const container = document.getElementById('dashProjectsTableContainer');
    if (!container) return;

    if (simulator.projects.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--color-slate-light);">
          No projects added yet. Click "Load Sample Data" above to quickly test the simulator.
        </div>
      `;
      return;
    }

    const previewProjects = simulator.projects.slice(0, 6);
    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Category</th>
              <th>Cost</th>
              <th>Impact</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${previewProjects.map(p => {
              const catColor = CATEGORY_COLORS[p.category] || '#2563eb';
              const statusBadge = p.status === 'Selected'
                ? `<span class="badge badge-success">✓ Selected</span>`
                : p.status === 'Rejected'
                ? `<span class="badge badge-danger">✗ Rejected</span>`
                : `<span class="badge badge-neutral">Pending</span>`;
              return `
                <tr>
                  <td><strong>${escapeHtml(p.name)}</strong></td>
                  <td><span class="category-tag" style="--cat-color: ${catColor}; --cat-bg: ${catColor}15; --cat-border: ${catColor}35;">${escapeHtml(p.category)}</span></td>
                  <td><strong>${p.getFormattedCost()}</strong></td>
                  <td>${p.impactScore} / 100</td>
                  <td><span class="badge ${p.priority === 'High' ? 'badge-danger' : 'badge-warning'}">${p.priority}</span></td>
                  <td>${statusBadge}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ==========================================================================
     Modals & Toast Notifications
     ========================================================================== */
  function initModalsAndToasts() {
    const modalOverlay = document.getElementById('confirmModalOverlay');
    const btnClose = document.getElementById('btnConfirmModalClose');
    const btnCancel = document.getElementById('btnConfirmCancel');

    const closeModal = () => {
      if (modalOverlay) modalOverlay.style.display = 'none';
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (modalOverlay) {
      modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) closeModal();
      });
    }
  }

  function showConfirmModal(title, message, onConfirm) {
    const overlay = document.getElementById('confirmModalOverlay');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const btnAccept = document.getElementById('btnConfirmAccept');

    if (!overlay) return;

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    // Remove old event listeners
    const newBtn = btnAccept.cloneNode(true);
    btnAccept.parentNode.replaceChild(newBtn, btnAccept);

    newBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
      if (typeof onConfirm === 'function') onConfirm();
    });

    overlay.style.display = 'flex';
  }

  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span style="font-size: 1.2rem;">${icon}</span>
      <div class="toast-message">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  /* ==========================================================================
     Authentication Widget Controller
     ========================================================================== */
  function initAuthWidget() {
    if (typeof window.auth === 'undefined') return;

    renderAuthWidget(window.auth.getCurrentUser());

    window.addEventListener('authStateChanged', (e) => {
      renderAuthWidget(e.detail ? e.detail.user : null);
    });
  }

  function renderAuthWidget(user) {
    const container = document.getElementById('headerAuthWidget');
    const sidebarContainer = document.getElementById('sidebarAuthWidget');

    if (container) {
      if (user) {
        container.innerHTML = `
          <div class="officer-widget">
            <div class="officer-avatar" style="border-color: ${user.badgeColor || '#2563eb'};">
              ${user.avatar || '👨‍💼'}
            </div>
            <div class="officer-details">
              <span class="officer-name">${escapeHtml(user.name)}</span>
              <span class="officer-role">${escapeHtml(user.role)}</span>
            </div>
            <button class="btn-officer-logout" id="btnHeaderOfficerLogout" title="Sign out of municipal session">
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        `;

        const logoutBtn = document.getElementById('btnHeaderOfficerLogout');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            showConfirmModal(
              'Sign Out of Municipal Portal?',
              `End current session for ${user.name} (${user.role})?`,
              () => {
                window.auth.logout();
                showToast('You have been signed out successfully.', 'info');
                setTimeout(() => {
                  window.location.href = 'login.html';
                }, 400);
              }
            );
          });
        }
      } else {
        container.innerHTML = `
          <a href="login.html" class="btn btn-sm btn-outline" style="border-color: var(--color-primary-light); color: var(--color-primary); font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span>🔑</span>
            <span>Officer Login</span>
          </a>
        `;
      }
    }

    if (sidebarContainer) {
      if (user) {
        sidebarContainer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.2rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
              <span style="font-size: 1.15rem;">${user.avatar || '👨‍💼'}</span>
              <div style="overflow: hidden; line-height: 1.2;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #ffffff; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${escapeHtml(user.name)}</div>
                <div style="font-size: 0.68rem; color: #94a3b8; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${escapeHtml(user.role)}</div>
              </div>
            </div>
            <a href="login.html" title="Switch Account" style="color: #94a3b8; font-size: 0.75rem; padding: 0.2rem 0.4rem; border-radius: 4px; text-decoration: none;">⚙️</a>
          </div>
        `;
      } else {
        sidebarContainer.innerHTML = `
          <a href="login.html" class="btn-sidebar" style="background-color: rgba(37, 99, 235, 0.18); border-color: rgba(37, 99, 235, 0.4); color: #93c5fd; margin-bottom: 0.25rem;">
            <span>🔑</span>
            <span>Officer Sign In</span>
          </a>
        `;
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
