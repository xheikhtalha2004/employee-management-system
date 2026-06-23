const STORAGE_KEY = "capregsoft_employee_records";

const Utils = {
  createId() {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  },

  normalize(value) {
    return String(value || "").trim().toLowerCase();
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }
};

const EmployeeStore = {
  employees: [],

  load() {
    const savedEmployees = localStorage.getItem(STORAGE_KEY);

    try {
      this.employees = savedEmployees ? JSON.parse(savedEmployees) : [];
      if (!Array.isArray(this.employees)) {
        this.employees = [];
      }
    } catch {
      this.employees = [];
    }
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.employees));
  },

  getAll() {
    return [...this.employees].sort((a, b) => a.name.localeCompare(b.name));
  },

  findById(id) {
    return this.employees.find((employee) => employee.id === id);
  },

  add(employee) {
    const record = {
      id: Utils.createId(),
      ...employee,
      createdAt: new Date().toISOString()
    };

    this.employees.push(record);
    this.save();
    return record;
  },

  update(id, employee) {
    this.employees = this.employees.map((item) => {
      if (item.id !== id) {
        return item;
      }

      return {
        ...item,
        ...employee,
        updatedAt: new Date().toISOString()
      };
    });

    this.save();
  },

  remove(id) {
    this.employees = this.employees.filter((employee) => employee.id !== id);
    this.save();
  },

  emailExists(email, ignoredId = "") {
    const normalizedEmail = Utils.normalize(email);

    return this.employees.some((employee) => {
      return employee.id !== ignoredId && Utils.normalize(employee.email) === normalizedEmail;
    });
  },

  duplicateExists(employee, ignoredId = "") {
    const name = Utils.normalize(employee.name);
    const department = Utils.normalize(employee.department);
    const position = Utils.normalize(employee.position);

    return this.employees.some((item) => {
      return (
        item.id !== ignoredId &&
        Utils.normalize(item.name) === name &&
        Utils.normalize(item.department) === department &&
        Utils.normalize(item.position) === position
      );
    });
  }
};

const App = {
  state: {
    editingId: "",
    searchTerm: ""
  },

  elements: {},

  init() {
    this.cacheElements();
    EmployeeStore.load();
    this.bindEvents();
    this.render();
  },

  cacheElements() {
    this.elements = {
      form: document.getElementById("employee-form"),
      employeeId: document.getElementById("employee-id"),
      name: document.getElementById("employee-name"),
      email: document.getElementById("employee-email"),
      department: document.getElementById("employee-department"),
      position: document.getElementById("employee-position"),
      salary: document.getElementById("employee-salary"),
      status: document.getElementById("employee-status"),
      formTitle: document.getElementById("form-title"),
      formMessage: document.getElementById("form-message"),
      submitButton: document.getElementById("submit-btn"),
      resetButton: document.getElementById("reset-form-btn"),
      addButton: document.getElementById("add-employee-btn"),
      searchInput: document.getElementById("search-input"),
      clearSearchButton: document.getElementById("clear-search-btn"),
      tableBody: document.getElementById("employee-table-body"),
      emptyState: document.getElementById("empty-state"),
      totalEmployees: document.getElementById("total-employees"),
      activeEmployees: document.getElementById("active-employees"),
      departmentCount: document.getElementById("department-count"),
      totalPayroll: document.getElementById("total-payroll")
    };
  },

  bindEvents() {
    this.elements.form.addEventListener("submit", (event) => this.handleSubmit(event));
    this.elements.resetButton.addEventListener("click", () => this.resetForm());
    this.elements.addButton.addEventListener("click", () => {
      this.resetForm();
      this.elements.name.focus();
      document.getElementById("employee-form-panel").scrollIntoView({ behavior: "smooth" });
    });

    this.elements.searchInput.addEventListener("input", (event) => {
      this.state.searchTerm = event.target.value;
      this.renderTable();
    });

    this.elements.clearSearchButton.addEventListener("click", () => {
      this.state.searchTerm = "";
      this.elements.searchInput.value = "";
      this.renderTable();
    });

    this.elements.tableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }

      const id = button.dataset.id;
      if (button.dataset.action === "edit") {
        this.startEdit(id);
      }

      if (button.dataset.action === "delete") {
        this.deleteEmployee(id);
      }
    });
  },

  handleSubmit(event) {
    event.preventDefault();
    const employee = this.readForm();
    const validation = this.validateEmployee(employee);

    this.clearValidation();

    if (!validation.isValid) {
      this.showMessage(validation.message, "error");
      this.markInvalid(validation.fields);
      return;
    }

    if (this.state.editingId) {
      EmployeeStore.update(this.state.editingId, employee);
      this.resetForm(false);
      this.showMessage("Employee updated successfully.", "success");
    } else {
      EmployeeStore.add(employee);
      this.resetForm(false);
      this.showMessage("Employee added successfully.", "success");
    }

    this.render();
  },

  readForm() {
    const salary = Number(this.elements.salary.value);

    return {
      name: this.elements.name.value.trim(),
      email: this.elements.email.value.trim().toLowerCase(),
      department: this.elements.department.value,
      position: this.elements.position.value.trim(),
      salary: Number.isFinite(salary) && salary > 0 ? salary : 0,
      status: this.elements.status.value
    };
  },

  validateEmployee(employee) {
    if (!employee.name) {
      return { isValid: false, message: "Name is required.", fields: ["name"] };
    }

    if (!employee.email || !Utils.isValidEmail(employee.email)) {
      return { isValid: false, message: "Enter a valid email address.", fields: ["email"] };
    }

    if (EmployeeStore.emailExists(employee.email, this.state.editingId)) {
      return { isValid: false, message: "This email already exists.", fields: ["email"] };
    }

    if (!employee.department) {
      return { isValid: false, message: "Department is required.", fields: ["department"] };
    }

    if (EmployeeStore.duplicateExists(employee, this.state.editingId)) {
      return {
        isValid: false,
        message: "A matching employee record already exists.",
        fields: ["name", "department", "position"]
      };
    }

    return { isValid: true, message: "", fields: [] };
  },

  startEdit(id) {
    const employee = EmployeeStore.findById(id);
    if (!employee) {
      return;
    }

    this.state.editingId = id;
    this.elements.employeeId.value = employee.id;
    this.elements.name.value = employee.name;
    this.elements.email.value = employee.email;
    this.elements.department.value = employee.department;
    this.elements.position.value = employee.position || "";
    this.elements.salary.value = employee.salary || "";
    this.elements.status.value = employee.status || "Active";
    this.elements.formTitle.textContent = "Edit Employee";
    this.elements.submitButton.textContent = "Update Employee";
    this.clearValidation();
    this.showMessage("", "success");
    document.getElementById("employee-form-panel").scrollIntoView({ behavior: "smooth" });
    this.elements.name.focus();
  },

  deleteEmployee(id) {
    const employee = EmployeeStore.findById(id);
    if (!employee) {
      return;
    }

    const shouldDelete = confirm(`Delete ${employee.name}'s record?`);
    if (!shouldDelete) {
      return;
    }

    EmployeeStore.remove(id);

    if (this.state.editingId === id) {
      this.resetForm(false);
    }

    this.showMessage("Employee deleted successfully.", "success");
    this.render();
  },

  resetForm(clearMessage = true) {
    this.elements.form.reset();
    this.elements.employeeId.value = "";
    this.state.editingId = "";
    this.elements.formTitle.textContent = "Add Employee";
    this.elements.submitButton.textContent = "Save Employee";
    this.clearValidation();

    if (clearMessage) {
      this.showMessage("", "success");
    }
  },

  clearValidation() {
    [this.elements.name, this.elements.email, this.elements.department, this.elements.position].forEach((field) => {
      field.classList.remove("is-invalid");
      field.removeAttribute("aria-invalid");
    });
  },

  markInvalid(fields) {
    const fieldMap = {
      name: this.elements.name,
      email: this.elements.email,
      department: this.elements.department,
      position: this.elements.position
    };

    fields.forEach((fieldName) => {
      const field = fieldMap[fieldName];
      if (field) {
        field.classList.add("is-invalid");
        field.setAttribute("aria-invalid", "true");
      }
    });

    const firstInvalidField = fieldMap[fields[0]];
    if (firstInvalidField) {
      firstInvalidField.focus();
    }
  },

  showMessage(message, type) {
    this.elements.formMessage.textContent = message;
    this.elements.formMessage.classList.toggle("success", type === "success");
  },

  getFilteredEmployees() {
    const searchTerm = Utils.normalize(this.state.searchTerm);
    const employees = EmployeeStore.getAll();

    if (!searchTerm) {
      return employees;
    }

    return employees.filter((employee) => {
      return (
        Utils.normalize(employee.name).includes(searchTerm) ||
        Utils.normalize(employee.department).includes(searchTerm)
      );
    });
  },

  render() {
    this.renderStats();
    this.renderTable();
  },

  renderStats() {
    const employees = EmployeeStore.getAll();
    const activeEmployees = employees.filter((employee) => employee.status === "Active").length;
    const departments = new Set(employees.map((employee) => employee.department).filter(Boolean));
    const payroll = employees.reduce((total, employee) => total + (Number(employee.salary) || 0), 0);

    this.elements.totalEmployees.textContent = employees.length;
    this.elements.activeEmployees.textContent = activeEmployees;
    this.elements.departmentCount.textContent = departments.size;
    this.elements.totalPayroll.textContent = Utils.formatCurrency(payroll);
  },

  renderTable() {
    const employees = this.getFilteredEmployees();
    this.elements.tableBody.innerHTML = employees.map((employee) => this.createEmployeeRow(employee)).join("");

    const hasRows = employees.length > 0;
    this.elements.emptyState.classList.toggle("show", !hasRows);
    this.elements.emptyState.textContent = this.state.searchTerm
      ? "No employees match your search."
      : "No employees found. Add a record to get started.";
  },

  createEmployeeRow(employee) {
    const safeId = Utils.escapeHtml(employee.id);
    const status = employee.status || "Active";
    const statusClass = status.toLowerCase().replace(/\s+/g, "-");

    return `
      <tr>
        <td>
          <div class="employee-name">
            <strong>${Utils.escapeHtml(employee.name)}</strong>
            <span>ID: ${safeId.slice(0, 8)}</span>
          </div>
        </td>
        <td>${Utils.escapeHtml(employee.email)}</td>
        <td>${Utils.escapeHtml(employee.department)}</td>
        <td>${Utils.escapeHtml(employee.position || "Not assigned")}</td>
        <td>${Utils.formatCurrency(employee.salary)}</td>
        <td><span class="status-badge status-${statusClass}">${Utils.escapeHtml(status)}</span></td>
        <td>
          <div class="row-actions">
            <button class="action-button" type="button" data-action="edit" data-id="${safeId}">Edit</button>
            <button class="action-button delete" type="button" data-action="delete" data-id="${safeId}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
