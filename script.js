const STORAGE_KEY = "capregsoft_employee_records";

let employees = loadEmployees();
let editingId = "";
let searchText = "";

const form = document.getElementById("employee-form");
const employeeIdInput = document.getElementById("employee-id");
const nameInput = document.getElementById("employee-name");
const emailInput = document.getElementById("employee-email");
const departmentInput = document.getElementById("employee-department");
const positionInput = document.getElementById("employee-position");
const salaryInput = document.getElementById("employee-salary");
const statusInput = document.getElementById("employee-status");
const formTitle = document.getElementById("form-title");
const formMessage = document.getElementById("form-message");
const submitButton = document.getElementById("submit-btn");
const resetButton = document.getElementById("reset-form-btn");
const addButton = document.getElementById("add-employee-btn");
const searchInput = document.getElementById("search-input");
const clearSearchButton = document.getElementById("clear-search-btn");
const tableBody = document.getElementById("employee-table-body");
const emptyState = document.getElementById("empty-state");
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const sideNav = document.getElementById("side-nav");

const totalEmployees = document.getElementById("total-employees");
const activeEmployees = document.getElementById("active-employees");
const departmentCount = document.getElementById("department-count");
const totalPayroll = document.getElementById("total-payroll");

form.addEventListener("submit", saveEmployee);
resetButton.addEventListener("click", resetForm);
addButton.addEventListener("click", showAddForm);
searchInput.addEventListener("input", handleSearch);
clearSearchButton.addEventListener("click", clearSearch);
tableBody.addEventListener("click", handleTableClick);
menuToggle.addEventListener("click", toggleMenu);
sideNav.addEventListener("click", closeMenu);

render();

function loadEmployees() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return [];
  }

  try {
    const parsedData = JSON.parse(savedData);
    return Array.isArray(parsedData) ? parsedData : [];
  } catch {
    return [];
  }
}

function storeEmployees() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}

function saveEmployee(event) {
  event.preventDefault();
  clearErrors();

  const employee = getFormData();
  const error = validateEmployee(employee);

  if (error) {
    showMessage(error.message, "error");
    markErrors(error.fields);
    return;
  }

  if (editingId) {
    employees = employees.map((item) => {
      return item.id === editingId ? { ...item, ...employee } : item;
    });
    showMessage("Employee updated successfully.", "success");
  } else {
    employees.push({
      id: String(Date.now()),
      ...employee,
    });
    showMessage("Employee added successfully.", "success");
  }

  storeEmployees();
  resetForm(false);
  render();
}

function getFormData() {
  const salary = Number(salaryInput.value);

  return {
    name: nameInput.value.trim(),
    email: emailInput.value.trim().toLowerCase(),
    department: departmentInput.value,
    position: positionInput.value.trim(),
    salary: salary > 0 ? salary : 0,
    status: statusInput.value,
  };
}

function validateEmployee(employee) {
  if (!employee.name) {
    return { message: "Name is required.", fields: [nameInput] };
  }

  if (!isValidEmail(employee.email)) {
    return { message: "Enter a valid email address.", fields: [emailInput] };
  }

  const emailAlreadyUsed = employees.some((item) => {
    return item.id !== editingId && clean(item.email) === clean(employee.email);
  });

  if (emailAlreadyUsed) {
    return { message: "This email already exists.", fields: [emailInput] };
  }

  if (!employee.department) {
    return { message: "Department is required.", fields: [departmentInput] };
  }

  const duplicateRecord = employees.some((item) => {
    return (
      item.id !== editingId &&
      clean(item.name) === clean(employee.name) &&
      clean(item.department) === clean(employee.department) &&
      clean(item.position) === clean(employee.position)
    );
  });

  if (duplicateRecord) {
    return {
      message: "A matching employee record already exists.",
      fields: [nameInput, departmentInput, positionInput],
    };
  }

  return null;
}

function handleTableClick(event) {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;

  if (button.dataset.action === "edit") {
    editEmployee(id);
  }

  if (button.dataset.action === "delete") {
    deleteEmployee(id);
  }
}

function editEmployee(id) {
  const employee = employees.find((item) => item.id === id);

  if (!employee) {
    return;
  }

  editingId = id;
  employeeIdInput.value = employee.id;
  nameInput.value = employee.name;
  emailInput.value = employee.email;
  departmentInput.value = employee.department;
  positionInput.value = employee.position || "";
  salaryInput.value = employee.salary || "";
  statusInput.value = employee.status || "Active";
  formTitle.textContent = "Edit Employee";
  submitButton.textContent = "Update Employee";
  showMessage("", "success");
  clearErrors();
  scrollToForm();
}

function deleteEmployee(id) {
  const employee = employees.find((item) => item.id === id);

  if (!employee || !confirm(`Delete ${employee.name}'s record?`)) {
    return;
  }

  employees = employees.filter((item) => item.id !== id);
  storeEmployees();

  if (editingId === id) {
    resetForm(false);
  }

  showMessage("Employee deleted successfully.", "success");
  render();
}

function resetForm(clearMessage = true) {
  form.reset();
  editingId = "";
  employeeIdInput.value = "";
  formTitle.textContent = "Add Employee";
  submitButton.textContent = "Save Employee";
  clearErrors();

  if (clearMessage) {
    showMessage("", "success");
  }
}

function showAddForm() {
  resetForm();
  scrollToForm();
}

function scrollToForm() {
  document
    .getElementById("employee-form-panel")
    .scrollIntoView({ behavior: "smooth" });
  nameInput.focus();
}

function handleSearch(event) {
  searchText = event.target.value;
  renderEmployees();
}

function toggleMenu() {
  const isOpen = sidebar.classList.toggle("nav-open");
  menuToggle.setAttribute("aria-expanded", isOpen);
}

function closeMenu(event) {
  if (!event.target.closest("a")) {
    return;
  }

  sidebar.classList.remove("nav-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

function clearSearch() {
  searchText = "";
  searchInput.value = "";
  renderEmployees();
}

function render() {
  renderStats();
  renderEmployees();
}

function renderStats() {
  const activeCount = employees.filter(
    (item) => item.status === "Active",
  ).length;
  const departments = new Set(
    employees.map((item) => item.department).filter(Boolean),
  );
  const payroll = employees.reduce(
    (total, item) => total + Number(item.salary || 0),
    0,
  );

  totalEmployees.textContent = employees.length;
  activeEmployees.textContent = activeCount;
  departmentCount.textContent = departments.size;
  totalPayroll.textContent = formatMoney(payroll);
}

function renderEmployees() {
  const filteredEmployees = employees
    .filter((employee) => {
      return (
        clean(employee.name).includes(clean(searchText)) ||
        clean(employee.department).includes(clean(searchText))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  tableBody.innerHTML = filteredEmployees.map(createEmployeeRow).join("");

  emptyState.classList.toggle("show", filteredEmployees.length === 0);
  emptyState.textContent = searchText
    ? "No employees match your search."
    : "No employees found. Add a record to get started.";
}

function createEmployeeRow(employee) {
  const status = employee.status || "Active";
  const statusClass = clean(status).replace(/\s+/g, "-");

  return `
    <tr>
      <td data-label="Name">
        <div class="employee-name">
          <strong>${escapeHtml(employee.name)}</strong>
          <span>ID: ${escapeHtml(employee.id).slice(0, 8)}</span>
        </div>
      </td>
      <td data-label="Email">${escapeHtml(employee.email)}</td>
      <td data-label="Department">${escapeHtml(employee.department)}</td>
      <td data-label="Position">${escapeHtml(employee.position || "Not assigned")}</td>
      <td data-label="Salary">${formatMoney(employee.salary)}</td>
      <td data-label="Status"><span class="status-badge status-${statusClass}">${escapeHtml(status)}</span></td>
      <td data-label="Actions">
        <div class="row-actions">
          <button class="action-button" type="button" data-action="edit" data-id="${employee.id}">Edit</button>
          <button class="action-button delete" type="button" data-action="delete" data-id="${employee.id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function markErrors(fields) {
  fields.forEach((field) => {
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
  });
  fields[0].focus();
}

function clearErrors() {
  [nameInput, emailInput, departmentInput, positionInput].forEach((field) => {
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
  });
}

function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.classList.toggle("success", type === "success");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clean(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
