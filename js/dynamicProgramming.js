/**
 * CITY BUDGET ALLOCATION SIMULATOR
 * Dynamic Programming (0/1 Knapsack Variant) Engine
 *
 * Mathematically optimizes municipal capital allocation across competing
 * projects to maximize social impact under budget and statutory constraints.
 *
 * Core Recurrence:
 * dp[i][b] = max(
 *   dp[i-1][b],
 *   dp[i-1][b - cost[i]] + impact[i]
 * )
 *
 * Solved via 2D Dynamic Programming table and reconstructed using Backtracking.
 */

(function (root) {
  'use strict';

  class DynamicProgrammingOptimizer {
    constructor() {
      this.defaultScaleFactor = 10;
    }

    /**
     * Determines optimal scale factor based on decimal precision of project costs and budget
     */
    determineScaleFactor(projects, budget) {
      let maxDecimals = 0;
      const checkVal = val => {
        const str = String(val);
        if (str.includes('.')) {
          const decimals = str.split('.')[1].length;
          if (decimals > maxDecimals) maxDecimals = decimals;
        }
      };

      checkVal(budget);
      projects.forEach(p => checkVal(p.cost));

      if (maxDecimals === 0) return 1;
      if (maxDecimals === 1) return 10;
      return 100; // max scale 100 for 2 decimal places
    }

    /**
     * Core optimization runner
     * @param {Object} params
     * @param {Array<Project>} params.projects - List of Project entities
     * @param {number} params.totalBudget - Municipal budget in Crores
     * @param {Constraint} params.constraints - Active constraints
     * @returns {BudgetAllocation}
     */
    optimize({ projects, totalBudget, constraints }) {
      const startTime = performance.now();

      if (!projects || projects.length === 0) {
        throw new Error('No projects provided for budget optimization.');
      }

      const budgetVal = parseFloat(totalBudget);
      if (isNaN(budgetVal) || budgetVal <= 0) {
        throw new Error('Valid total budget greater than 0 is required.');
      }

      // Effective budget ceiling
      const effectiveBudget = constraints && constraints.maxTotalBudget !== null && constraints.maxTotalBudget > 0
        ? Math.min(budgetVal, constraints.maxTotalBudget)
        : budgetVal;

      // 1. Separate Mandatory vs Candidate Projects
      const mandatoryProjects = [];
      const candidateProjects = [];

      projects.forEach(p => {
        const isMandatory = p.isMandatory || (constraints && constraints.isProjectMandatory(p.id));
        if (isMandatory) {
          mandatoryProjects.push(p);
        } else {
          candidateProjects.push(p);
        }
      });

      // Calculate baseline from mandatory projects
      let mandatoryCost = 0;
      let mandatoryImpact = 0;
      const mandatoryCategorySpend = {};

      mandatoryProjects.forEach(p => {
        mandatoryCost += p.cost;
        mandatoryImpact += p.impactScore;
        mandatoryCategorySpend[p.category] = (mandatoryCategorySpend[p.category] || 0) + p.cost;
      });

      mandatoryCost = parseFloat(mandatoryCost.toFixed(2));

      // Feasibility check: Can we afford all mandatory projects?
      if (mandatoryCost > effectiveBudget) {
        throw new Error(
          `Infeasible Constraint: Mandatory projects total ₹${mandatoryCost} Cr, which exceeds the available budget of ₹${effectiveBudget} Cr. Please increase the budget or reduce mandatory requirements.`
        );
      }

      // Check if mandatory projects breach any category maximum
      if (constraints && constraints.categoryMaxAllocations) {
        for (const [cat, maxCap] of Object.entries(constraints.categoryMaxAllocations)) {
          if (maxCap && (mandatoryCategorySpend[cat] || 0) > maxCap) {
            throw new Error(
              `Infeasible Constraint: Mandatory projects in category '${cat}' cost ₹${mandatoryCategorySpend[cat]} Cr, exceeding the statutory maximum limit of ₹${maxCap} Cr.`
            );
          }
        }
      }

      const remainingBudgetForCandidates = parseFloat((effectiveBudget - mandatoryCost).toFixed(2));

      // 2. Candidate projects within remaining budget
      const validCandidates = candidateProjects.filter(p => p.cost > 0 && p.cost <= remainingBudgetForCandidates);

      // 3. Solve 0/1 Knapsack using 2D Dynamic Programming
      const scale = this.determineScaleFactor(projects, effectiveBudget);
      const scaledRemainingBudget = Math.round(remainingBudgetForCandidates * scale);

      const dpResult = this.solve01KnapsackDP({
        candidates: validCandidates,
        scaledCapacity: scaledRemainingBudget,
        scale,
        mandatoryCategorySpend,
        constraints
      });

      const selectedCandidates = dpResult.selected;
      const dpSummary = dpResult.dpSummary;

      // 4. Combine Mandatory + Selected Candidate Projects
      const finalSelectedMap = new Map();
      mandatoryProjects.forEach(p => finalSelectedMap.set(p.id, { project: p, reason: 'Mandatory civic requirement' }));
      selectedCandidates.forEach(p => finalSelectedMap.set(p.id, { project: p, reason: 'Optimal dynamic programming selection' }));

      const allSelected = [];
      const allRejected = [];
      let totalCost = 0;
      let totalImpact = 0;
      const categoryBreakdown = {};
      const reasons = {};

      projects.forEach(p => {
        if (finalSelectedMap.has(p.id)) {
          const item = finalSelectedMap.get(p.id);
          p.status = 'Selected';
          p.selectionReason = this.generateSelectionReason(p, item.reason);
          reasons[p.id] = p.selectionReason;
          allSelected.push(p);

          totalCost += p.cost;
          totalImpact += p.impactScore;

          if (!categoryBreakdown[p.category]) {
            categoryBreakdown[p.category] = { cost: 0, impact: 0, count: 0 };
          }
          categoryBreakdown[p.category].cost += p.cost;
          categoryBreakdown[p.category].impact += p.impactScore;
          categoryBreakdown[p.category].count += 1;
        } else {
          p.status = 'Rejected';
          p.selectionReason = this.generateRejectionReason(p, effectiveBudget - totalCost, constraints, categoryBreakdown);
          reasons[p.id] = p.selectionReason;
          allRejected.push(p);
        }
      });

      totalCost = parseFloat(totalCost.toFixed(2));
      const remainingBudget = parseFloat(Math.max(0, effectiveBudget - totalCost).toFixed(2));

      // Calculate percentage contributions per category
      for (const cat in categoryBreakdown) {
        categoryBreakdown[cat].cost = parseFloat(categoryBreakdown[cat].cost.toFixed(2));
        categoryBreakdown[cat].percentage = totalCost > 0
          ? parseFloat(((categoryBreakdown[cat].cost / totalCost) * 100).toFixed(1))
          : 0;
      }

      const endTime = performance.now();
      const executionTimeMs = parseFloat((endTime - startTime).toFixed(2));

      // Return encapsulated domain object
      const AllocationClass = root.Models ? root.Models.BudgetAllocation : null;
      const allocationData = {
        selectedProjects: allSelected,
        rejectedProjects: allRejected,
        totalBudget: effectiveBudget,
        totalCost,
        totalImpact,
        remainingBudget,
        categoryBreakdown,
        reasons,
        executionTimeMs,
        timestamp: new Date().toISOString(),
        dpTableSummary: dpSummary
      };

      return AllocationClass ? new AllocationClass(allocationData) : allocationData;
    }

    /**
     * Exact 0/1 Knapsack Dynamic Programming with 2D State Table & Backtracking
     *
     * Recurrence:
     * dp[i][w] = max(
     *   dp[i-1][w],                         // Choice 1: Exclude item i-1
     *   dp[i-1][w - cost[i-1]] + impact[i-1] // Choice 2: Include item i-1
     * )
     *
     * Time Complexity: O(N * W)
     * Space Complexity: O(N * W)
     */
    solve01KnapsackDP({ candidates, scaledCapacity, scale, mandatoryCategorySpend = {}, constraints = null }) {
      const n = candidates.length;
      if (n === 0 || scaledCapacity <= 0) {
        return {
          selected: [],
          dpSummary: {
            n: 0,
            capacityCrores: parseFloat((scaledCapacity / scale).toFixed(2)),
            maxAchievableImpact: 0,
            sampleCols: [{ budgetCrores: 0, scaledW: 0 }],
            sampleRows: [{ projectName: 'Baseline (0 items)', cost: 0, impact: 0, values: [0] }],
            formula: 'dp[i][b] = max(dp[i-1][b], dp[i-1][b - cost[i]] + impact[i])'
          }
        };
      }

      const weights = candidates.map(p => Math.round(p.cost * scale));
      const values = candidates.map(p => p.impactScore);

      // 2D DP Table: dp[i][w] stores maximum impact using first i candidate items with capacity w
      const dp = Array.from({ length: n + 1 }, () => new Int32Array(scaledCapacity + 1));

      // 2D Decision Table: take[i][w] = 1 if item i-1 was included, 0 if excluded
      const take = Array.from({ length: n + 1 }, () => new Uint8Array(scaledCapacity + 1));

      // Build DP matrix row by row
      for (let i = 1; i <= n; i++) {
        const wt = weights[i - 1];
        const val = values[i - 1];
        const p = candidates[i - 1];
        const cat = p.category;
        const maxCatCap = constraints && constraints.categoryMaxAllocations ? constraints.categoryMaxAllocations[cat] : null;

        const prevRow = dp[i - 1];
        const currRow = dp[i];
        const currTake = take[i];

        for (let w = 0; w <= scaledCapacity; w++) {
          if (wt <= w) {
            // Check if including project i-1 satisfies statutory category cap
            let canInclude = true;
            if (maxCatCap !== null && maxCatCap !== undefined) {
              // Backtrack category spend of the subproblem at (i-1, w - wt)
              let subCatSpend = (mandatoryCategorySpend[cat] || 0) + p.cost;
              let traceW = w - wt;
              for (let k = i - 1; k >= 1; k--) {
                if (take[k][traceW] === 1) {
                  if (candidates[k - 1].category === cat) {
                    subCatSpend += candidates[k - 1].cost;
                  }
                  traceW -= weights[k - 1];
                }
              }
              if (subCatSpend > maxCatCap + 0.001) {
                canInclude = false; // Violates category ceiling
              }
            }

            // Recurrence: Choice 1 (Exclude) vs Choice 2 (Include)
            const includeVal = prevRow[w - wt] + val;
            if (canInclude && includeVal > prevRow[w]) {
              currRow[w] = includeVal;
              currTake[w] = 1; // Mark included
            } else {
              currRow[w] = prevRow[w];
              currTake[w] = 0; // Mark excluded
            }
          } else {
            // Cannot include because item weight exceeds capacity w
            currRow[w] = prevRow[w];
            currTake[w] = 0;
          }
        }
      }

      // Find optimal target capacity W to backtrack from
      // If category minimum allocations are specified, pick the best w that satisfies category floors
      let bestW = scaledCapacity;
      let bestImpactAtFinal = dp[n][scaledCapacity];

      if (constraints && constraints.categoryMinAllocations && Object.keys(constraints.categoryMinAllocations).length > 0) {
        let bestFeasibleImpact = -1;
        let bestFeasibleW = -1;

        for (let w = scaledCapacity; w >= 0; w--) {
          if (dp[n][w] <= bestFeasibleImpact) continue;

          // Verify if solution at w satisfies all category minimums
          const checkCatSpend = { ...mandatoryCategorySpend };
          let traceW = w;
          for (let k = n; k >= 1; k--) {
            if (take[k][traceW] === 1) {
              const c = candidates[k - 1].category;
              checkCatSpend[c] = (checkCatSpend[c] || 0) + candidates[k - 1].cost;
              traceW -= weights[k - 1];
            }
          }

          let minSatisfied = true;
          for (const [catName, minCap] of Object.entries(constraints.categoryMinAllocations)) {
            if (minCap && (checkCatSpend[catName] || 0) < minCap - 0.001) {
              minSatisfied = false;
              break;
            }
          }

          if (minSatisfied && dp[n][w] > bestFeasibleImpact) {
            bestFeasibleImpact = dp[n][w];
            bestFeasibleW = w;
          }
        }

        if (bestFeasibleW !== -1) {
          bestW = bestFeasibleW;
          bestImpactAtFinal = bestFeasibleImpact;
        }
      }

      // Backtracking: Reconstruct selected project subset
      const selected = [];
      let currW = bestW;

      for (let i = n; i >= 1; i--) {
        if (take[i][currW] === 1) {
          selected.push(candidates[i - 1]);
          currW -= weights[i - 1];
        }
      }

      selected.reverse(); // Restore original sequence

      // Sample columns for educational DP Matrix Inspector
      const sampleColsCount = Math.min(10, scaledCapacity);
      const sampleStep = Math.max(1, Math.floor(scaledCapacity / sampleColsCount));
      const sampleCols = [];
      for (let w = 0; w <= scaledCapacity; w += sampleStep) {
        sampleCols.push({ budgetCrores: parseFloat((w / scale).toFixed(1)), scaledW: w });
      }
      if (sampleCols[sampleCols.length - 1].scaledW !== scaledCapacity) {
        sampleCols.push({ budgetCrores: parseFloat((scaledCapacity / scale).toFixed(1)), scaledW: scaledCapacity });
      }

      const sampleRows = [];
      for (let i = 0; i <= n; i++) {
        sampleRows.push({
          projectName: i === 0 ? 'Baseline (0 items)' : candidates[i - 1].name,
          cost: i === 0 ? 0 : candidates[i - 1].cost,
          impact: i === 0 ? 0 : candidates[i - 1].impactScore,
          values: sampleCols.map(col => dp[i][col.scaledW])
        });
      }

      return {
        selected,
        dpSummary: {
          n,
          capacityCrores: parseFloat((scaledCapacity / scale).toFixed(2)),
          maxAchievableImpact: bestImpactAtFinal,
          sampleCols,
          sampleRows,
          formula: 'dp[i][b] = max(dp[i-1][b], dp[i-1][b - cost[i]] + impact[i])'
        }
      };
    }

    /**
     * Generates a context-aware human-readable explanation for project selection
     */
    generateSelectionReason(project, baseReason) {
      const efficiency = project.getEfficiency();
      if (project.isMandatory || baseReason.includes('Mandatory')) {
        return `Mandatory civic mandate: Non-negotiable public priority allocated first (Impact: ${project.impactScore}, Cost: ₹${project.cost} Cr).`;
      }
      if (efficiency >= 5.0) {
        return `Exceptional social efficiency: Delivers ${efficiency} impact points per ₹ Cr, achieving rapid municipal return.`;
      }
      if (project.impactScore >= 85) {
        return `High-impact cornerstone project: Impact ${project.impactScore}/100 provides major public welfare advancement within budget.`;
      }
      return `Optimal knapsack contribution: Combines with selected peers to maximize cumulative city-wide impact under ₹${project.cost} Cr cost.`;
    }

    /**
     * Generates clear rationale for why a project was rejected
     */
    generateRejectionReason(project, remainingBudget, constraints, categoryBreakdown) {
      if (project.cost > remainingBudget) {
        return `Exceeds remaining budget: Requires ₹${project.cost} Cr, but only ₹${remainingBudget} Cr is unallocated.`;
      }

      if (constraints && constraints.categoryMaxAllocations && constraints.categoryMaxAllocations[project.category]) {
        const maxCap = constraints.categoryMaxAllocations[project.category];
        const currentCatSpend = categoryBreakdown[project.category]?.cost || 0;
        if (currentCatSpend + project.cost > maxCap) {
          return `Category ceiling reached: Adding ₹${project.cost} Cr would exceed the ₹${maxCap} Cr limit on '${project.category}'.`;
        }
      }

      const efficiency = project.getEfficiency();
      return `Inferior impact-to-cost trade-off (${efficiency} pts/₹Cr): Alternative project combinations yield higher total impact for this capital.`;
    }
  }

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicProgrammingOptimizer;
  } else {
    root.DynamicProgrammingOptimizer = DynamicProgrammingOptimizer;
  }
})(typeof window !== 'undefined' ? window : this);
