/**
 * CITY BUDGET ALLOCATION SIMULATOR
 * Object-Oriented Domain Models
 *
 * Provides clean encapsulation for Projects, Budgets, Categories,
 * Constraints, Allocations, and Scenarios.
 */

(function (root) {
  'use strict';

  // Standard predefined municipal categories with palette and symbols
  const DEFAULT_CATEGORIES = [
    { name: 'Roads', color: '#2563eb', icon: '🛣️', desc: 'Arterial corridors, bridges & resurfacing' },
    { name: 'Sanitation', color: '#059669', icon: '♻️', desc: 'Waste processing & public cleanliness' },
    { name: 'Healthcare', color: '#e11d48', icon: '🏥', desc: 'Clinics, tertiary care & diagnostic units' },
    { name: 'Education', color: '#7c3aed', icon: '🎓', desc: 'Schools, libraries & vocational hubs' },
    { name: 'Water Supply', color: '#0284c7', icon: '💧', desc: 'Pipelines, reservoirs & clean drinking water' },
    { name: 'Environment', color: '#16a34a', icon: '🌳', desc: 'Urban greening, parks & emission control' },
    { name: 'Public Infrastructure', color: '#d97706', icon: '🏛️', desc: 'Community centres, lighting & civic halls' }
  ];

  /**
   * Project Entity
   */
  class Project {
    constructor({
      id = null,
      name = '',
      category = 'Roads',
      cost = 0,
      impactScore = 50,
      priority = 'Medium',
      isMandatory = false,
      status = 'Pending',
      selectionReason = ''
    } = {}) {
      this.id = id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      this.name = String(name).trim();
      this.category = String(category).trim();
      this.cost = parseFloat(cost) || 0;
      this.impactScore = parseInt(impactScore, 10) || 0;
      this.priority = priority; // 'High', 'Medium', 'Low'
      this.isMandatory = Boolean(isMandatory);
      this.status = status; // 'Pending', 'Selected', 'Rejected'
      this.selectionReason = selectionReason;
    }

    /**
     * Social return ratio (Impact Points per ₹ Crore invested)
     * Useful for efficiency benchmarking and trade-off explanations.
     */
    getEfficiency() {
      if (this.cost <= 0) return 0;
      return parseFloat((this.impactScore / this.cost).toFixed(2));
    }

    /**
     * Formatted cost string in Indian Crores (e.g., ₹20 Cr)
     */
    getFormattedCost() {
      return `₹${this.cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
    }

    /**
     * Validates project fields
     */
    validate() {
      const errors = [];
      if (!this.name || this.name.trim().length === 0) {
        errors.push('Project name cannot be empty.');
      }
      if (isNaN(this.cost) || this.cost <= 0) {
        errors.push('Cost must be a positive number greater than 0.');
      }
      if (isNaN(this.impactScore) || this.impactScore < 1 || this.impactScore > 100) {
        errors.push('Impact score must be an integer between 1 and 100.');
      }
      if (!['High', 'Medium', 'Low'].includes(this.priority)) {
        errors.push('Priority must be High, Medium, or Low.');
      }
      return {
        isValid: errors.length === 0,
        errors
      };
    }

    toJSON() {
      return {
        id: this.id,
        name: this.name,
        category: this.category,
        cost: this.cost,
        impactScore: this.impactScore,
        priority: this.priority,
        isMandatory: this.isMandatory,
        status: this.status,
        selectionReason: this.selectionReason
      };
    }

    static fromJSON(data) {
      return new Project(data);
    }
  }

  /**
   * Category Entity
   */
  class Category {
    constructor({ name, color = '#3b82f6', icon = '📁', desc = '', minAllocation = 0, maxAllocation = null }) {
      this.name = name;
      this.color = color;
      this.icon = icon;
      this.desc = desc;
      this.minAllocation = parseFloat(minAllocation) || 0;
      this.maxAllocation = maxAllocation !== null ? parseFloat(maxAllocation) : null;
    }
  }

  /**
   * Budget Entity
   */
  class Budget {
    constructor(totalBudget = 100) {
      this.totalBudget = parseFloat(totalBudget) || 100;
      this.usedBudget = 0;
      this.remainingBudget = this.totalBudget;
    }

    setTotal(amount) {
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) {
        throw new Error('Total budget must be a positive number greater than 0.');
      }
      this.totalBudget = val;
      this.remainingBudget = Math.max(0, this.totalBudget - this.usedBudget);
    }

    allocate(amount) {
      this.usedBudget = parseFloat(amount) || 0;
      this.remainingBudget = Math.max(0, parseFloat((this.totalBudget - this.usedBudget).toFixed(2)));
    }

    reset() {
      this.usedBudget = 0;
      this.remainingBudget = this.totalBudget;
    }

    getUtilizationPercentage() {
      if (this.totalBudget <= 0) return 0;
      return parseFloat(((this.usedBudget / this.totalBudget) * 100).toFixed(1));
    }

    getFormattedTotal() {
      return `₹${this.totalBudget.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
    }

    getFormattedUsed() {
      return `₹${this.usedBudget.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
    }

    getFormattedRemaining() {
      return `₹${this.remainingBudget.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
    }

    toJSON() {
      return {
        totalBudget: this.totalBudget,
        usedBudget: this.usedBudget,
        remainingBudget: this.remainingBudget
      };
    }

    static fromJSON(data) {
      const b = new Budget(data.totalBudget);
      b.usedBudget = data.usedBudget || 0;
      b.remainingBudget = data.remainingBudget || data.totalBudget;
      return b;
    }
  }

  /**
   * Constraint Configuration Entity
   */
  class Constraint {
    constructor({
      maxTotalBudget = null,
      categoryMinAllocations = {},
      categoryMaxAllocations = {},
      mandatoryProjectIds = []
    } = {}) {
      this.maxTotalBudget = maxTotalBudget !== null ? parseFloat(maxTotalBudget) : null;
      this.categoryMinAllocations = { ...categoryMinAllocations };
      this.categoryMaxAllocations = { ...categoryMaxAllocations };
      this.mandatoryProjectIds = Array.isArray(mandatoryProjectIds) ? [...mandatoryProjectIds] : [];
    }

    setCategoryMin(category, amount) {
      const val = parseFloat(amount);
      if (val > 0) {
        this.categoryMinAllocations[category] = val;
      } else {
        delete this.categoryMinAllocations[category];
      }
    }

    setCategoryMax(category, amount) {
      const val = parseFloat(amount);
      if (val > 0) {
        this.categoryMaxAllocations[category] = val;
      } else {
        delete this.categoryMaxAllocations[category];
      }
    }

    addMandatoryProject(projectId) {
      if (!this.mandatoryProjectIds.includes(projectId)) {
        this.mandatoryProjectIds.push(projectId);
      }
    }

    removeMandatoryProject(projectId) {
      this.mandatoryProjectIds = this.mandatoryProjectIds.filter(id => id !== projectId);
    }

    isProjectMandatory(projectId) {
      return this.mandatoryProjectIds.includes(projectId);
    }

    clear() {
      this.maxTotalBudget = null;
      this.categoryMinAllocations = {};
      this.categoryMaxAllocations = {};
      this.mandatoryProjectIds = [];
    }

    toJSON() {
      return {
        maxTotalBudget: this.maxTotalBudget,
        categoryMinAllocations: this.categoryMinAllocations,
        categoryMaxAllocations: this.categoryMaxAllocations,
        mandatoryProjectIds: this.mandatoryProjectIds
      };
    }

    static fromJSON(data) {
      return new Constraint(data);
    }
  }

  /**
   * Budget Allocation Result Entity
   */
  class BudgetAllocation {
    constructor({
      selectedProjects = [],
      rejectedProjects = [],
      totalBudget = 0,
      totalCost = 0,
      totalImpact = 0,
      remainingBudget = 0,
      categoryBreakdown = {},
      reasons = {},
      executionTimeMs = 0,
      timestamp = new Date().toISOString(),
      scenarioName = 'Default Optimization',
      dpTableSummary = null
    } = {}) {
      this.selectedProjects = selectedProjects;
      this.rejectedProjects = rejectedProjects;
      this.totalBudget = totalBudget;
      this.totalCost = parseFloat(Number(totalCost).toFixed(2));
      this.totalImpact = totalImpact;
      this.remainingBudget = parseFloat(Number(remainingBudget).toFixed(2));
      this.categoryBreakdown = categoryBreakdown;
      this.reasons = reasons;
      this.executionTimeMs = executionTimeMs;
      this.timestamp = timestamp;
      this.scenarioName = scenarioName;
      this.dpTableSummary = dpTableSummary;
    }

    get utilizationPercent() {
      if (this.totalBudget <= 0) return 0;
      return parseFloat(((this.totalCost / this.totalBudget) * 100).toFixed(1));
    }
  }

  /**
   * BudgetSimulator Coordinator Class
   * Core orchestrator adhering to Object-Oriented principles.
   */
  class BudgetSimulator {
    constructor(initialBudget = 100) {
      this.budget = new Budget(initialBudget);
      this.projects = [];
      this.constraints = new Constraint();
      this.lastAllocation = null;
      this.scenarios = [];
      this.storageKey = 'city_budget_simulator_v2';
    }

    setBudget(amount) {
      this.budget.setTotal(amount);
      return this.budget;
    }

    addProject(data) {
      const proj = new Project(data);
      const validation = proj.validate();
      if (!validation.isValid) {
        throw new Error(validation.errors.join(' '));
      }
      // Check duplicate name
      const duplicate = this.projects.find(p => p.name.toLowerCase() === proj.name.toLowerCase());
      if (duplicate) {
        throw new Error(`A project named "${proj.name}" already exists.`);
      }
      this.projects.push(proj);
      return proj;
    }

    updateProject(id, updatedData) {
      const index = this.projects.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Project not found.');

      // Check duplicate name with other projects
      if (updatedData.name) {
        const dup = this.projects.find(p => p.id !== id && p.name.toLowerCase() === updatedData.name.trim().toLowerCase());
        if (dup) throw new Error(`Another project named "${updatedData.name}" already exists.`);
      }

      const existing = this.projects[index];
      const merged = new Project({
        ...existing.toJSON(),
        ...updatedData,
        id: existing.id
      });

      const validation = merged.validate();
      if (!validation.isValid) {
        throw new Error(validation.errors.join(' '));
      }

      this.projects[index] = merged;
      return merged;
    }

    deleteProject(id) {
      const initialLen = this.projects.length;
      this.projects = this.projects.filter(p => p.id !== id);
      this.constraints.removeMandatoryProject(id);
      return this.projects.length < initialLen;
    }

    getProject(id) {
      return this.projects.find(p => p.id === id) || null;
    }

    getSelectedProjects() {
      return this.lastAllocation ? this.lastAllocation.selectedProjects : [];
    }

    getRejectedProjects() {
      return this.lastAllocation ? this.lastAllocation.rejectedProjects : [];
    }

    calculateImpact() {
      return this.lastAllocation ? this.lastAllocation.totalImpact : 0;
    }

    /**
     * Executes the Dynamic Programming optimization
     */
    optimize() {
      if (typeof root.DynamicProgrammingOptimizer === 'undefined') {
        throw new Error('Dynamic Programming Optimizer engine is not loaded.');
      }
      const optimizer = new root.DynamicProgrammingOptimizer();
      const allocation = optimizer.optimize({
        projects: this.projects,
        totalBudget: this.budget.totalBudget,
        constraints: this.constraints
      });

      this.lastAllocation = allocation;
      this.budget.allocate(allocation.totalCost);
      return allocation;
    }

    /**
     * Runs optimization for a specific budget figure without altering main budget
     */
    runScenario(budgetAmount, name = 'Scenario') {
      if (typeof root.DynamicProgrammingOptimizer === 'undefined') {
        throw new Error('Optimizer engine is not loaded.');
      }
      const optimizer = new root.DynamicProgrammingOptimizer();
      const scenarioConstraints = new Constraint(this.constraints ? this.constraints.toJSON() : {});
      // In scenario comparison, the target scenario budget defines the ceiling
      scenarioConstraints.maxTotalBudget = null;

      const result = optimizer.optimize({
        projects: this.projects.map(p => new Project(p.toJSON())),
        totalBudget: budgetAmount,
        constraints: scenarioConstraints
      });
      result.scenarioName = name;
      return result;
    }

    /**
     * Generates analytical statements regarding trade-offs, marginal efficiency, and bottlenecks
     */
    generateTradeOffAnalysis() {
      if (!this.lastAllocation) return [];

      const alloc = this.lastAllocation;
      const statements = [];

      // 1. Budget utilization statement
      statements.push({
        type: 'utilization',
        icon: '📊',
        title: 'Budget Utilization',
        text: `The city utilized ₹${alloc.totalCost} Cr of ₹${alloc.totalBudget} Cr (${alloc.utilizationPercent}%), achieving a cumulative impact score of ${alloc.totalImpact} points.`
      });

      // 2. Unused budget reasoning
      if (alloc.remainingBudget > 0) {
        const cheapestRejected = alloc.rejectedProjects.slice().sort((a, b) => a.cost - b.cost)[0];
        if (cheapestRejected && cheapestRejected.cost > alloc.remainingBudget) {
          statements.push({
            type: 'unused',
            icon: '💡',
            title: 'Unallocated Capital Trade-off',
            text: `₹${alloc.remainingBudget} Cr remains unallocated because the lowest-cost unselected project ("${cheapestRejected.name}", ₹${cheapestRejected.cost} Cr) exceeds the remaining fiscal headroom.`
          });
        } else {
          statements.push({
            type: 'unused',
            icon: '💡',
            title: 'Unallocated Capital Trade-off',
            text: `₹${alloc.remainingBudget} Cr remains unallocated due to active category ceilings or alternative combinations offering higher aggregate impact.`
          });
        }
      }

      // 3. Category distribution analysis
      let dominantCategory = null;
      let maxCatCost = -1;
      for (const [cat, data] of Object.entries(alloc.categoryBreakdown)) {
        if (data.cost > maxCatCost) {
          maxCatCost = data.cost;
          dominantCategory = { name: cat, ...data };
        }
      }

      if (dominantCategory && alloc.totalCost > 0) {
        statements.push({
          type: 'category',
          icon: '🏆',
          title: 'Leading Sector Priority',
          text: `${dominantCategory.name} receives the largest share (${dominantCategory.percentage}% / ₹${dominantCategory.cost} Cr), generating ${dominantCategory.impact} impact points across ${dominantCategory.count} project(s).`
        });
      }

      // 4. Marginal sensitivity analysis (+20% budget scenario)
      try {
        const delta = Math.round(alloc.totalBudget * 0.2) || 20;
        const expandedBudget = alloc.totalBudget + delta;
        const expandedResult = this.runScenario(expandedBudget);
        const gainInImpact = expandedResult.totalImpact - alloc.totalImpact;

        statements.push({
          type: 'sensitivity',
          icon: '📈',
          title: 'Marginal Fiscal Expansion',
          text: `Increasing the municipal budget by ₹${delta} Cr (to ₹${expandedBudget} Cr) enables an additional ${gainInImpact} impact points (from ${alloc.totalImpact} to ${expandedResult.totalImpact}).`
        });
      } catch (e) {
        // Silently skip if scenario calculation encounters an issue
      }

      // 5. High-efficiency insight
      const highestEfficiencySelected = alloc.selectedProjects.slice().sort((a, b) => b.getEfficiency() - a.getEfficiency())[0];
      if (highestEfficiencySelected) {
        statements.push({
          type: 'efficiency',
          icon: '⚡',
          title: 'Top Value Project',
          text: `"${highestEfficiencySelected.name}" delivers highest social return (${highestEfficiencySelected.getEfficiency()} impact pts / ₹ Cr), making it an indispensable investment.`
        });
      }

      return statements;
    }

    /**
     * Seeds realistic municipal demo data
     */
    loadDemoData() {
      this.budget = new Budget(100);
      this.constraints = new Constraint({
        maxTotalBudget: null, // Default to null so user can freely adjust budget without hidden caps
        categoryMinAllocations: { Healthcare: 20 },
        categoryMaxAllocations: { Education: 30 },
        mandatoryProjectIds: []
      });

      const demoProjects = [
        { name: 'Road Repair', category: 'Roads', cost: 20, impactScore: 80, priority: 'High', isMandatory: false },
        { name: 'Hospital Upgrade', category: 'Healthcare', cost: 30, impactScore: 95, priority: 'High', isMandatory: true },
        { name: 'School Development', category: 'Education', cost: 15, impactScore: 75, priority: 'Medium', isMandatory: false },
        { name: 'Waste Management', category: 'Sanitation', cost: 10, impactScore: 70, priority: 'High', isMandatory: false },
        { name: 'Water Pipeline', category: 'Water Supply', cost: 20, impactScore: 85, priority: 'High', isMandatory: false },
        { name: 'Park Development', category: 'Environment', cost: 8, impactScore: 55, priority: 'Low', isMandatory: false },
        { name: 'Street Lighting', category: 'Public Infrastructure', cost: 12, impactScore: 65, priority: 'Medium', isMandatory: false },
        { name: 'Public Transport', category: 'Roads', cost: 25, impactScore: 90, priority: 'High', isMandatory: false }
      ];

      this.projects = demoProjects.map(p => new Project(p));
      const hospital = this.projects.find(p => p.name === 'Hospital Upgrade');
      if (hospital) {
        this.constraints.addMandatoryProject(hospital.id);
      }
      this.lastAllocation = null;
      this.saveToStorage();
    }

    saveToStorage() {
      try {
        const payload = {
          budget: this.budget.toJSON(),
          projects: this.projects.map(p => p.toJSON()),
          constraints: this.constraints.toJSON(),
          lastAllocation: this.lastAllocation ? {
            totalBudget: this.lastAllocation.totalBudget,
            totalCost: this.lastAllocation.totalCost,
            totalImpact: this.lastAllocation.totalImpact,
            remainingBudget: this.lastAllocation.remainingBudget,
            executionTimeMs: this.lastAllocation.executionTimeMs,
            timestamp: this.lastAllocation.timestamp,
            categoryBreakdown: this.lastAllocation.categoryBreakdown,
            reasons: this.lastAllocation.reasons,
            dpTableSummary: this.lastAllocation.dpTableSummary,
            selectedIds: this.lastAllocation.selectedProjects.map(p => p.id),
            rejectedIds: this.lastAllocation.rejectedProjects.map(p => p.id)
          } : null
        };
        localStorage.setItem(this.storageKey, JSON.stringify(payload));
      } catch (err) {
        console.warn('Could not save to localStorage:', err);
      }
    }

    loadFromStorage() {
      try {
        const dataStr = localStorage.getItem(this.storageKey);
        if (!dataStr) return false;

        const data = JSON.parse(dataStr);
        if (data.budget) {
          this.budget = Budget.fromJSON(data.budget);
        }
        if (Array.isArray(data.projects)) {
          this.projects = data.projects.map(p => Project.fromJSON(p));
        }
        if (data.constraints) {
          this.constraints = Constraint.fromJSON(data.constraints);
        }

        if (data.lastAllocation && Array.isArray(data.lastAllocation.selectedIds)) {
          const selectedSet = new Set(data.lastAllocation.selectedIds);
          const selectedProjects = this.projects.filter(p => selectedSet.has(p.id));
          const rejectedProjects = this.projects.filter(p => !selectedSet.has(p.id));

          this.lastAllocation = new BudgetAllocation({
            selectedProjects,
            rejectedProjects,
            totalBudget: data.lastAllocation.totalBudget,
            totalCost: data.lastAllocation.totalCost,
            totalImpact: data.lastAllocation.totalImpact,
            remainingBudget: data.lastAllocation.remainingBudget,
            categoryBreakdown: data.lastAllocation.categoryBreakdown || {},
            reasons: data.lastAllocation.reasons || {},
            executionTimeMs: data.lastAllocation.executionTimeMs || 0,
            timestamp: data.lastAllocation.timestamp || new Date().toISOString(),
            dpTableSummary: data.lastAllocation.dpTableSummary || null
          });
        }
        return true;
      } catch (err) {
        console.warn('Could not load from localStorage:', err);
        return false;
      }
    }

    reset() {
      this.budget = new Budget(100);
      this.projects = [];
      this.constraints = new Constraint();
      this.lastAllocation = null;
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e) {}
    }
  }

  // Export to namespace
  const Models = {
    DEFAULT_CATEGORIES,
    Project,
    Category,
    Budget,
    Constraint,
    BudgetAllocation,
    BudgetSimulator
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Models;
  } else {
    root.Models = Models;
  }
})(typeof window !== 'undefined' ? window : this);
