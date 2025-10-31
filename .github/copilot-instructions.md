# GitHub Copilot Custom Instructions for Python Projects

## Core Principles

* **Code Quality:** Prioritize writing clean, readable, maintainable, and efficient Python code. Follow PEP 8 guidelines strictly.
* **Clarity:** Use meaningful names for variables, functions, and classes. Add comments or docstrings to explain complex logic or non-obvious decisions.
* **Testing:** Write and maintain unit tests for all new functionality. Aim for high coverage and use mocks for external dependencies.
* **Simplicity:** Prefer simple, idiomatic solutions over complex ones. Avoid premature optimization—profile first if performance is a concern.
* **Modern Python:** Leverage language features from your target Python version (see below). Use data classes, type hints, and f-strings liberally.

## Python Version & Environment

* **Target Version:** Python 3.12 or higher (adjust if needed).
* **Virtual Environments:** Rely on the existing `.venv/` environment—do **not** create or manage a new virtual environment. Assume it’s already activated before running any commands.
* **Dependency Management:**
  * Use `requirements.txt` (pinned versions preferred) or a `pyproject.toml` (for `poetry`/`pdm`).
  * Install packages using the `uv` CLI tool: e.g., `uv add <package>`.
  * Keep `requirements.txt` and/or `pyproject.toml` up to date after adding or upgrading dependencies.

## Coding Standards & Style

* **Formatter:** Use `black` for automatic code formatting. Integrate it into pre-commit hooks so code is formatted on every commit.
* **Linter:** Use `flake8` or `ruff` for linting alongside pre-commit. Configure strict rules for complexity, unused imports, and naming conventions.
* **Type Hinting:** Apply type hints to all public function signatures and key internal functions. Use `typing` module primitives (`List`, `Dict`, `Optional`, `Protocol`, etc.).
* **Imports:**
  1. Standard library
  2. Third-party libraries
  3. Local application imports
  
  Use absolute imports where possible. Avoid wildcard imports (`from module import *`).
* **Docstrings:** Document every module, class, and public function using Google or NumPy style:
  ```python
  def example(param: int) -> str:
      """
      Brief description of the function.

      Args:
          param: Description of the parameter.

      Returns:
          Description of the return value.

      Raises:
          ValueError: If the input is invalid.
      """
      ...
  ```

## Libraries & Frameworks

* **Standard Library First:** Prefer built-in modules over external dependencies when feasible.
* **Common Tools:**
  * HTTP: `requests`
  * Data: `pandas`, `numpy`
  * Async/API: `FastAPI`, `httpx`, `uvicorn`
  * Env vars: `python-dotenv` or `os.environ`
* **Dependency Updates:** Use tools like Dependabot or `pip-audit` to stay on top of security patches.

## Error Handling & Logging

* **Exceptions:** Raise specific exceptions (e.g., `ValueError`, `TypeError`). Define custom exceptions for domain-specific errors.
* **Resource Management:** Use context managers (`with` statements) for files, network connections, locks, etc.
* **Logging:** Use the `logging` module; configure levels and formatters. No `print()` for diagnostics in production code.

## Testing

* **Framework:** Use `pytest`.
* **Structure:** Mirror `src/your_package/` in `tests/your_package/`.
* **Fixtures & Mocks:** Use `pytest` fixtures and `unittest.mock` or `pytest-mock` for external dependencies.
* **CI Integration:** Run tests on every pull request in GitHub Actions (or similar). Include coverage reporting.

## CI & Pre-Commit

* **Pre-Commit Hooks:** Set up [`pre-commit`](https://pre-commit.com/) to run `black`, `isort`, `flake8`/`ruff`, and `pytest` (optional) on staged files.
* **GitHub Actions:** Include workflows for linting, testing, and security checks (e.g., `pip-audit`).

## Documentation & README

* **README.md:**
  * Update installation and usage sections to reflect use of `.venv` and `uv`.
  * Add badges for build status, coverage, linting.
  * Include examples of common commands (format, lint, test).
* ** docs/:** Maintain additional design or API documentation here.

## Project Structure

Follow the `src` layout:
```
project-root/
├── .github/
│   ├── workflows/
│   └── copilot/instructions.md  # this file
├── .venv/                # virtual environment (gitignored)
├── data/                 # data files (if any)
├── docs/                 # extended documentation
├── notebooks/            # Jupyter notebooks
├── scripts/              # utility scripts (CLI tools)
├── src/                  # source code
│   └── my_package/
│       ├── __init__.py
│       ├── module1.py
│       └── subpkg/
│           ├── __init__.py
│           └── module2.py
├── tests/                # tests mirroring src/
├── .gitignore
├── LICENSE
├── pyproject.toml        # or requirements.txt
└── README.md
```

## Refactoring Guidelines

* Break large refactors into small, incremental commits.
* Ensure tests pass before and after each refactoring step.
* Update docs and README to reflect any API changes.

---

By following these guidelines, GitHub Copilot will generate suggestions that align with your project’s standards and workflows.

## Guidance for Data Analysis Projects

**Analysis in Agent Mode: Step-by-Step Instructions**

Below is a clear, actionable workflow for running a data analysis in agent mode, producing EDA visuals, updating documentation, and finally generating a polished Quarto report. Follow each section in order:

---

### 1. Environment Setup

> _Note: Virtual environment is already created and activated._

1. **Identify missing packages** by running:
   ```bash
   pip check
   ```
2. **Install missing packages** using uv’s package manager:
```bash
uv add <package_name>
```
or, to install all requirements listed in `requirements.txt`:
```bash
uv sync
```

---

### 2. Loading and Exploring the Data

1. **Read the dataset** as specified in `README.md` (e.g., `data.csv`).
2. **Inspect basic structure**:
   - Print `.head()`, `.info()`, `.describe()`.
   - Check for missing values and data types.
3. **Resolve any data issues** (e.g., handle NaNs, convert date columns).

---

### 3. Exploratory Data Analysis (EDA)

1. **Univariate analysis**:
   - Histograms for continuous variables.
   - Bar charts for categorical counts.
2. **Bivariate analysis**:
   - Scatterplots, boxplots, or violin plots to examine relationships.
3. **Time-series or geospatial plots** (if relevant).
4. **Save each figure** to `figures/` with descriptive filenames (e.g., `figures/hist_age.png`).

---

### 4. Basic Statistical Analysis

1. **Compute summary statistics** (mean, median, variance, correlations).
2. **Perform hypothesis tests** or confidence intervals for key questions.
3. **Document results** as text outputs or small tables.

---

### 5. Simple Predictive Modeling

1. **Split** data into training and test sets.
2. **Train** a baseline model (e.g., linear regression, decision tree).
3. **Evaluate** on test set (RMSE, accuracy, ROC/AUC as appropriate).
4. **Save metric outputs** and any model diagnostic plots to `figures/`.

---

### 6. Update README

1. **Add a summary** of your key findings and list of EDA charts.
2. **Link** to the `figures/` directory and describe each plot.
3. **Outline** modeling approach and performance metrics.

---

## Generating a Quarto Report

Once your analyses and charts are complete, assemble a Quarto document that showcases visuals and narrative. Below is the structure:

1. **Title Page** with project name and date.
2. **Table of Contents** (auto-generated by Quarto).
3. **Introduction**: Brief context and objectives.
4. **EDA Section**:
   - Display each chart (embed image).
   - Provide a concise interpretation below each figure.
5. **Statistical Analysis Section**:
   - Present key tables or summaries.
   - Interpret significance and insights.
6. **Modeling Section**:
   - Show diagnostic plots and performance metrics.
   - Offer takeaway on model usefulness.
7. **Conclusions & Next Steps**:
   - Summarize insights.
   - Recommend actions or further analysis.

> **Note:** Do not include code blocks. Only embed images from `figures/` and write narrative interpretation.

---

Follow these steps end-to-end to ensure a reproducible, well-documented analysis workflow and a polished final report in Quarto.

