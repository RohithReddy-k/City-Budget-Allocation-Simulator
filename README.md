# 🏛️ City Budget Allocation Simulator
### Municipal Capital Decision Support System using Dynamic Programming (0/1 Knapsack Variant)

A modern, responsive, and data-driven web application designed for municipal corporations and city councils to optimally distribute an annual municipal capital budget across competing public sectors (Roads, Sanitation, Healthcare, Education, Water Supply, Environment, Public Infrastructure) based on social impact scores and statutory policy constraints.

---

## 🌟 Key Features

1. **True Dynamic Programming 0/1 Knapsack Variant**:
   - Solves the constrained capital allocation problem to find the global mathematical maximum for societal impact.
   - Supports statutory constraints: Mandatory civic projects, minimum category spending floors, and maximum category ceilings.
   - Dynamic discretization scaling factor ($\text{Scale} \in \{1, 10, 100\}$) handles large Rupee Crore figures and decimal values in under **2 milliseconds**.

2. **Clean Object-Oriented Architecture (OOP)**:
   - Modular domain classes in [`js/models.js`](file:///c:/Users/Rohith%20Reddy/OneDrive/Desktop/Website%20Mentor/js/models.js): `Project`, `Budget`, `Category`, `Constraint`, `BudgetAllocation`, `BudgetSimulator`.
   - Clear separation of concerns between Domain Entities, Optimization Engine, and UI Controller.

3. **Smart City / Government Dashboard UI**:
   - Executive-grade aesthetic with deep civic blue, emerald green approval indicators, and danger/warning badges.
   - Responsive layout with collapsible sidebar and mobile hamburger menu.
   - Print-friendly layout (`Ctrl+P` or "Print Report" button) and CSV Export.

4. **Interactive Data Visualizations (Chart.js)**:
   - **Doughnut Chart**: Budget Allocation by Category.
   - **Bar Chart**: Project Impact Scores (Selected vs. Rejected).
   - **Bar Chart**: Category Impact Contribution.
   - **Horizontal Bar Chart**: Social Return on Investment (Efficiency in Impact pts / ₹ Cr).
   - **Dual-Axis Line & Bar Chart**: Multi-Scenario Sensitivity Curve.

5. **Multi-Scenario Comparison & Sensitivity Analysis**:
   - Compare Scenario A (₹80 Cr Austerity), Scenario B (₹100 Cr Baseline), Scenario C (₹120 Cr Expansion), or enter a custom budget.
   - Marginal return analysis ($\Delta \text{Impact} / \Delta \text{Budget}$).

6. **Automated Trade-Off Analysis**:
   - Dynamically generated policy statements:
     - *"Increasing the budget by ₹20 Cr increases achievable impact by 65 points."*
     - *"Healthcare receives 30% of the optimized budget."*
     - *"₹5 Cr remains unallocated because the lowest-cost unselected project exceeds the remaining fiscal headroom."*

7. **Persistence & Demo Mode**:
   - Automatic `localStorage` saving and recovery across browser sessions.
   - One-click "⚡ Load Demo Data" pre-populates the 8 canonical municipal projects.
   - Safe reset modal with confirmation.

---

## 📁 Project Structure

```
Website Mentor/
├── index.html                  # Main SPA markup & navigation
├── css/
│   └── style.css              # Civic design system, theme variables & responsiveness
├── js/
│   ├── models.js              # OOP domain models (Project, Budget, Constraint, Simulator)
│   ├── dynamicProgramming.js  # 0/1 Knapsack DP engine & branch-and-bound pruner
│   └── app.js                 # UI event listeners, charts coordinator & view router
├── assets/
│   └── city-emblem.svg        # Municipal seal icon & favicon
└── README.md                  # Documentation & academic reference
```

---

## 🧮 Mathematical Formulation

### 1. Objective Function
$$\text{Maximize } Z = \sum_{i=1}^n x_i \cdot \text{Impact}_i$$

### 2. Constraints
$$\sum_{i=1}^n x_i \cdot \text{Cost}_i \le \text{TotalBudget}$$
$$x_i \in \{0, 1\} \quad \forall i \in \{1, \dots, n\}$$
$$\text{MinCap}_c \le \sum_{i \in \text{Category}_c} x_i \cdot \text{Cost}_i \le \text{MaxCap}_c \quad (\text{if category policy active})$$
$$x_m = 1 \quad \forall m \in \text{MandatoryProjects}$$

### 3. Recurrence Relation
$$DP[i][b] = \max\Big( DP[i - 1][b], \; DP[i - 1][b - \text{Cost}_i] + \text{Impact}_i \Big)$$

---

## 🚀 How to Run Locally

### Option 1: Direct Browser Launch (Simplest)
1. Navigate to the project folder:
   `c:\Users\Rohith Reddy\OneDrive\Desktop\Website Mentor\`
2. Double-click [`index.html`](file:///c:/Users/Rohith%20Reddy/OneDrive/Desktop/Website%20Mentor/index.html) or right-click $\rightarrow$ **Open with Google Chrome / Microsoft Edge / Firefox**.
3. The simulator will load directly with no installation or build steps required.

### Option 2: Using Any Local Web Server
You can serve the directory with any standard static server:
```powershell
# Using npx serve (if Node.js is installed)
npx serve .

# Or using Python (if Python is installed)
python -m http.server 8000
```
Then navigate to `http://localhost:8000` or `http://localhost:3000` in your browser.

---

## 📋 Evaluation Checklist & Demo Workflow

1. **Dashboard**: View summary KPI cards and 5-step pipeline overview.
2. **Budget Setup**: Modify annual budget (e.g. ₹100 Cr) or click quick presets (₹50 Cr, ₹80 Cr, ₹120 Cr).
3. **Projects**: Add a custom project, adjust impact slider (1-100), filter by category/priority, or edit existing projects.
4. **Constraints**: Toggle mandatory mandates (e.g. Hospital Upgrade) and category limits.
5. **Optimize**: Click the large **🚀 OPTIMIZE BUDGET** button to watch the DP computation and review completion metrics.
6. **Results**:
   - Inspect Selected and Rejected tables.
   - Read "Why were these projects selected?" explanations.
   - Inspect the 2D Dynamic Programming matrix table.
   - Review the 4 Chart.js analytics graphs.
7. **Scenario Comparison**: Click "Run & Compare All Scenarios Simultaneously" to review sensitivity and trade-off insights.
8. **Export**: Test the "Print Report" or "Export CSV" buttons.
