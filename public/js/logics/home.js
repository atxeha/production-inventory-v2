import { capitalizeWords, formatDate } from "../utils/utils.js";

function setupWithdrawnReleasedByToggle() {
    const withdrawnInput = document.getElementById("addWithdrawn");
    const releasedByDiv = document.querySelector(".input-field.col-4.d-none");

    if (withdrawnInput && releasedByDiv && !withdrawnInput._toggleListenerAdded) {
        withdrawnInput.addEventListener("input", () => {
            const value = parseInt(withdrawnInput.value, 10);
            if (value >= 1) {
                releasedByDiv.classList.remove("d-none");
            } else {
                releasedByDiv.classList.add("d-none");
            }
        });
        withdrawnInput._toggleListenerAdded = true;
    }
}

async function getYears(table, field) {
    try {
        const items = await window.electronAPI.getItems();
        const yearsSet = new Set();

        if (table && field) {
            items.forEach(item => {
                if (item[table] && Array.isArray(item[table])) {
                    item[table].forEach(entry => {
                        if (entry[field]) {
                            const year = new Date(entry[field]).getFullYear();
                            yearsSet.add(year);
                        }
                    });
                }
            });
        } else if (field) {
            items.forEach(item => {
                if (item[field]) {
                    const year = new Date(item[field]).getFullYear();
                    yearsSet.add(year);
                }
            });
        }

        const uniqueYears = Array.from(yearsSet).sort((a, b) => a - b);
        return uniqueYears;
    } catch (error) {
        return [];
    }
}

async function populatePrYearFilter() {
    const itemFilter = document.getElementById("yearItem");
    if (!itemFilter) return;

    const itemYears = await getYears(null, "date");

    itemFilter.innerHTML = '<option class="text-center" value="">All</option>';

    itemYears.forEach(year => {
        const option2 = document.createElement("option");
        option2.value = year;
        option2.textContent = year;
        option2.classList.add("text-center");
        itemFilter.appendChild(option2);
    });
}

let items = []

export function initAddItem(search) {
    const addItemForm = document.getElementById("addItemForm");
    const addItemModal = new bootstrap.Modal(document.getElementById("addItemModal"));

    if (addItemForm && window.electronAPI && !addItemForm._listenerAdded) {
        addItemForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const itemCode = document.getElementById("addItemCode").value.trim().toUpperCase();
            const itemName = capitalizeWords(document.getElementById("addItemName").value.trim());
            const quantity = parseInt(document.getElementById("addQuantity").value.trim());
            const unit = capitalizeWords(document.getElementById("addUnit").value.trim());
            const withdrawn = parseInt(document.getElementById("addWithdrawn").value.trim());
            const addedBy = capitalizeWords(document.getElementById("addedBy").value.trim());
            const date = document.getElementById("addDate").value.trim();
            const deliveredBy = capitalizeWords(document.getElementById("addDeliveredBy").value.trim());
            const releasedBy = capitalizeWords(document.getElementById("addReleasedBy").value.trim());
            const isDelivered = document.getElementById("isDelivered").checked;

            const data = {
                itemCode: itemCode,
                itemName: itemName,
                quantity: quantity,
                unit: unit,
                withdrawn: withdrawn,
                addedBy: addedBy,
                date: date,
                deliveredBy: deliveredBy,
                isDelivered: isDelivered,
                releasedBy: releasedBy || "",
            };

            if (!itemCode || !itemName || quantity < 0 || !unit || !date) {
                window.electronAPI.showToast("All fields required.", false); return;
            }

            try {
                const response = await window.electronAPI.addItem(data);

                if (response.success) {
                    window.electronAPI.showToast(response.message, response.success);
                    addItemModal.hide();
                    fetchItems(search);

                    const logData = {
                        itemId: response.item.id,
                        user: addedBy,
                        log: quantity === 1 ? `New item added: ${quantity} ${unit.toLowerCase()} of` : `New item added: ${quantity} ${unit.toLowerCase()}s of`
                    }

                    try {
                        window.electronAPI.addLog(logData);
                    } catch (error) {
                        return;
                    }

                    displayLogs()
                } else {
                    window.electronAPI.showToast(response.message, response.success);
                }
            } catch (err) {
                window.electronAPI.showToast(err.message, false);
            }
        });
        addItemForm._listenerAdded = true;
    }
}

export async function initEditItem(search) {
    const form = document.getElementById("editItemForm");
    const modal = new bootstrap.Modal(document.getElementById("editItemModal"));
    const tableBody = document.getElementById("itemsTableBody");

    const itemCode = document.getElementById("editItemCode");
    const itemName = document.getElementById("editItemName");
    const itemUnit = document.getElementById("editUnit");

    let currentEditId = null;

    if (tableBody && !tableBody._editListenerAdded) {
        tableBody.addEventListener("click", async (event) => {
            const target = event.target;
            if (target.classList.contains("edit-item")) {
                event.preventDefault();
                const id = target.dataset.editId;
                currentEditId = id;

                const item = items.find((item) => item.id == id);

                itemCode.value = item.itemCode;
                itemName.value = item.itemName;
                itemUnit.value = item.unit;
            }
        });
        tableBody._editListenerAdded = true;
    }

    if (form && !form._editListenerAdded) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const code = itemCode.value.trim().toUpperCase();
            const name = capitalizeWords(itemName.value.trim());
            const unit = capitalizeWords(itemUnit.value.trim());

            if (!currentEditId || !unit || !code || !name) {
                window.electronAPI.showToast("All fields are required.", false);
                return;
            }

            const data = {
                itemId: Number(currentEditId),
                itemCode: code,
                itemName: name,
                itemUnit: unit,
            };

            try {
                const response = await window.electronAPI.editItem(data);

                if (response.success) {
                    window.electronAPI.showToast(response.message, true);
                    modal.hide();
                    fetchItems(search);
                } else {
                    window.electronAPI.showToast(response.message, false);
                }
            } catch (error) {
                window.electronAPI.showToast(error.message, false);
            }
        });
        form._editListenerAdded = true;
    }
}

export async function initPullItem(search) {
    const pullItemForm = document.getElementById("pullItemForm");
    const pullItemModal = new bootstrap.Modal(document.getElementById("pullItemModal"));
    const tableBody = document.getElementById("itemsTableBody");

    const itemCodeLabel = document.getElementById("itemCodeLabel");
    const itemNameLabel = document.getElementById("itemNameLabel");
    const itemStockLabel = document.getElementById("itemStockLabel");

    let currentPullId = null;

    if (tableBody && !tableBody._pullListenerAdded) {
        tableBody.addEventListener("click", async (event) => {
            const target = event.target;
            if (target.classList.contains("pullItem")) {
                event.preventDefault();
                const id = target.dataset.pullId;
                currentPullId = id;

                const item = items.find((item) => item.id == id);

                itemCodeLabel.textContent = item.itemCode;
                itemNameLabel.textContent = item.itemName;
                itemStockLabel.textContent = item.quantity;

                pullItemModal.show();
            }
        });
        tableBody._pullListenerAdded = true;
    }

    if (pullItemForm && !pullItemForm._listenerAdded) {
        pullItemForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const quantity = parseInt(document.getElementById("pullQuantity").value.trim() || "0", 10);
            const releasedBy = capitalizeWords(document.getElementById("pullReleasedBy").value.trim());
            const receivedBy = capitalizeWords(document.getElementById("pullReceivedBy").value.trim());
            const date = document.getElementById("pullDate").value.trim();

            if (!currentPullId || !releasedBy || !quantity || !receivedBy) {
                window.electronAPI.showToast("All fields are required.", false);
                return;
            }

            const pullData = {
                itemId: Number(currentPullId),
                releasedQuantity: Number(quantity),
                releasedBy: releasedBy,
                receivedBy: receivedBy,
                releasedDate: new Date(date),
            };

            try {
                const response = await window.electronAPI.pullItem(pullData);

                if (response.success) {
                    window.electronAPI.showToast(response.message, true);
                    pullItemModal.hide();
                    fetchItems(search);

                    const logData = {
                        itemId: response.item.item.id,
                        user: releasedBy,
                        log: quantity === 1 ? `Pulled ${quantity} ${response.item.item.unit.toLowerCase()} of` : `Pulled ${quantity} ${response.item.item.unit.toLowerCase()}s of`
                    }
                    try {
                        window.electronAPI.addLog(logData);
                    } catch (error) {
                        return;
                    }

                    displayLogs()
                } else {
                    window.electronAPI.showToast(response.message.message, false);
                }
            } catch (error) {
                window.electronAPI.showToast(error.message, false);
            }
        });
        pullItemForm._listenerAdded = true;
    }
}

export async function initUpdateItemQuantity(search) {
    const form = document.getElementById("newQuantityItemForm");
    const modal = new bootstrap.Modal(document.getElementById("updateItemQuantityModal"));
    const tableBody = document.getElementById("itemsTableBody");

    const itemCodeLabel = document.getElementById("newItemCode");
    const itemNameLabel = document.getElementById("newItemName");
    const itemStockLabel = document.getElementById("newItemStock");

    let currentId = null;

    if (form && !form._listenerAdded) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const quantity = parseInt(document.getElementById("newQuantity").value.trim() || "0", 10);
            const updatedBy = capitalizeWords(document.getElementById("newUpdatedBy").value.trim());
            const deliveredBy = capitalizeWords(document.getElementById("newDeliveredBy").value.trim());
            const date = document.getElementById("newQuantityDate").value.trim();

            if (!currentId || !updatedBy || !quantity) {
                window.electronAPI.showToast("All fields are required.", false);
                return;
            }

            const data = {
                itemId: Number(currentId),
                newQuantity: Number(quantity),
                updatedBy: updatedBy,
                date: date,
                deliveredBy: deliveredBy,
            };

            try {
                const response = await window.electronAPI.updateItemQuantity(data);

                if (response.success) {
                    window.electronAPI.showToast(response.message, true);
                    modal.hide();
                    fetchItems(search);

                    const logData = {
                        itemId: currentId,
                        user: updatedBy,
                        log: quantity === 1 ? `Item delivered: ${quantity} ${response.item.unit.toLowerCase()} of` : `Item delivered: ${quantity} ${response.item.unit.toLowerCase()}s of`
                    }
                    try {
                        window.electronAPI.addLog(logData);
                    } catch (error) {
                        return;
                    }

                    displayLogs()
                } else {
                    window.electronAPI.showToast(response.message, false);
                }
            } catch (error) {
                window.electronAPI.showToast(error.message, false);
            }
        });
        form._listenerAdded = true;
    }

    if (tableBody && !tableBody._quantityListenerAdded) {
        tableBody.addEventListener("click", async (event) => {
            const target = event.target;
            if (target.classList.contains("new-quantity")) {
                event.preventDefault();
                currentId = target.dataset.quantityId;

                const item = items.find((item) => item.id == currentId);

                itemCodeLabel.textContent = item.itemCode
                itemNameLabel.textContent = item.itemName
                itemStockLabel.textContent = item.quantity
            }
        });
        tableBody._quantityListenerAdded = true;
    }
}

export async function initModalListeners() {
    const modal = document.getElementById('addItemModal'); // Replace with your actual modal ID
    if (!modal) return;

    modal.addEventListener('shown.bs.modal', () => {
        const checkbox = document.getElementById('isDelivered');
        const input = document.getElementById('addDeliveredBy');

        if (checkbox && input) {
            // Initialize state and class
            input.disabled = !checkbox.checked;
            if (input.disabled) {
                input.classList.add("is-delivered");
            } else {
                input.classList.remove("is-delivered");
            }

            // Remove previous change listener if any
            if (checkbox._listener) {
                checkbox.removeEventListener('change', checkbox._listener);
            }

            // Add change listener
            checkbox._listener = () => {
                input.disabled = !checkbox.checked;
                if (input.disabled) {
                    input.classList.add("is-delivered");
                    input.value = '';
                } else {
                    input.classList.remove("is-delivered");
                }
            };
            checkbox.addEventListener('change', checkbox._listener);
        }
    });
    modal._shownListenerAdded = true;
}

export async function fetchItems(searchQuery = "", yearFilter = "") {
    try {
        setupWithdrawnReleasedByToggle();
        await populatePrYearFilter();
        const itemYearFilter = document.getElementById("yearItem");
        if (itemYearFilter && yearFilter) {
            itemYearFilter.value = yearFilter;
        }
        items = await window.electronAPI.getItems();
        const itemTable = document.getElementById("itemsTable")
        const tableHead = document.getElementById("itemsTableHead")
        const tableBody = document.getElementById("itemsTableBody");

        tableBody.innerHTML = "";

        const filteredItems = items.filter(item => {
            const itemCodeMatch = item.itemCode.toLowerCase().includes(searchQuery.toLowerCase());
            const itemDate = formatDate(item.date);
            const dateMatch = itemDate.includes(searchQuery);

            // Year filter logic
            let yearMatch = true;
            if (yearFilter) {
                const itemYear = new Date(item.date).getFullYear().toString();
                yearMatch = itemYear === yearFilter;
            }

            return (itemCodeMatch || dateMatch) && yearMatch;
        });

        if (filteredItems.length === 0) {
            itemTable.classList.remove("table-hover");
            tableHead.style.display = "none";
            tableBody.innerHTML = `
            <tr>
            <td colspan="9" class="text-center text-muted p-3 pt-4"><h6>No item found</h6></td>
            </tr>
        `;
            return;
        }

        tableHead.style.display = "table-header-group";

        filteredItems.forEach((item, index) => {
            // Sum up quantities for the selected year (or all if no yearFilter)
            let prQuantity = 0;
            let rdQuantity = 0;
            let withdrawnQuantity = 0;

            if (yearFilter) {
                // Sum all PurchaseRequest quantities for the year
                prQuantity = (item.PurchaseRequest || [])
                    .filter(pr => pr.requestedDate && new Date(pr.requestedDate).getFullYear().toString() === yearFilter)
                    .reduce((sum, pr) => sum + (Number(pr.requestedQuantity) || 0), 0);

                // Sum all RequestDelivered quantities for the year
                rdQuantity = (item.RequestDelivered || [])
                    .filter(rd => rd.deliveredDate && new Date(rd.deliveredDate).getFullYear().toString() === yearFilter)
                    .reduce((sum, rd) => sum + (Number(rd.deliveredQuantity) || 0), 0);

                // Sum all PulledItem quantities for the year
                withdrawnQuantity = (item.PulledItem || [])
                    .filter(pulled => pulled.releasedDate && new Date(pulled.releasedDate).getFullYear().toString() === yearFilter)
                    .reduce((sum, pulled) => sum + (Number(pulled.releasedQuantity) || 0), 0);
            } else {
                // Sum all if no year filter
                prQuantity = (item.PurchaseRequest || [])
                    .reduce((sum, pr) => sum + (Number(pr.requestedQuantity) || 0), 0);

                rdQuantity = (item.RequestDelivered || [])
                    .reduce((sum, rd) => sum + (Number(rd.deliveredQuantity) || 0), 0);

                withdrawnQuantity = (item.PulledItem || [])
                    .reduce((sum, pulled) => sum + (Number(pulled.releasedQuantity) || 0), 0);
            }

            const row = document.createElement("tr");
            row.setAttribute("style", "border-radius: 10px !important;")

            row.innerHTML = `
        <td class="checkboxCell" style="display: none;">
            <input type="checkbox" class="rowCheckbox" data-id="${item.id}">
        </td>
        <td>${index + 1}</td>
        <td>${item.itemCode}</td>
        <td>${item.itemName}</td>
        <td>${item.unit}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-center">${prQuantity}</td>
        <td class="text-center">${rdQuantity}</td>
        <td class="text-center">${withdrawnQuantity}</td>
        <td class="actions">
            <span data-bs-toggle="modal" data-bs-target="#editItemModal">
                <i data-edit-id="${item.id}" id="edit-${item.id}" class="edit-icon icon-btn icon material-icons edit-item" data-bs-toggle="tooltip"
                    data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Edit information">edit</i>
            </span>
            <span data-bs-toggle="modal" data-bs-target="#updateItemQuantityModal">
              <i data-quantity-id="${item.id}" id="new-quantity-${item.id
                }" class="icon-btn icon material-icons new-quantity" data-bs-toggle="tooltip"
                  data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Add stock"
                  style="cursor:pointer;">add</i>
            </span>
            <span data-bs-toggle="modal" data-bs-target="#pullItemModal">
                <i data-pull-id="${item.id}" id="pull-${item.id
                }" class="pullItem me-1 icon-btn icon material-icons pull-item" data-bs-toggle="tooltip"
                    data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Pull item"
                    style="cursor:pointer;">arrow_outward</i>
            </span>
        </td>
    `;
            tableBody.appendChild(row);
        });
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) tooltipInstance.dispose();
          });

        const tooltip = await import("../utils/tooltipUtil.js")

        tooltip.initializeTooltip();

    } catch (error) {
        return;
    }
}

export async function deleteAllLogs() {
    const modalElement = document.getElementById("deleteAllLogModal");
    const form = document.getElementById("deleteAllLogForm");
    const dontShowCheckbox = document.querySelector("#deleteAllLogModal #dontShow");

    if (form && !form._listenerAdded) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            // Save preference if "Don't show again" is checked
            if (dontShowCheckbox && dontShowCheckbox.checked) {
                localStorage.setItem("dontShowDeleteAllLogModal", "true");
            } else {
                localStorage.removeItem("dontShowDeleteAllLogModal");
            }

            const response = await window.electronAPI.deleteAllLogs();

            if (response.success) {
                window.electronAPI.showToast(response.message, true);
                // Only get the instance, do not create a new one!
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
                displayLogs();
            } else {
                window.electronAPI.showToast(response.message, false);
            }
        });
        form._listenerAdded = true;
    }
}

// New function to initialize delete all logs icon click behavior
export function initDeleteAllLogs() {
    const deleteAllIcon = document.getElementById("dltIcon");
    const modalElement = document.getElementById("deleteAllLogModal");
    const modal = new bootstrap.Modal(modalElement);
    const logModalElement = document.getElementById("logModal");
    const logModal = logModalElement ? new bootstrap.Modal(logModalElement) : null;

    if (deleteAllIcon && !deleteAllIcon._listenerAdded) {
        deleteAllIcon.addEventListener("click", async (event) => {
            event.preventDefault();

            const dontShow = localStorage.getItem("dontShowDeleteAllLogModal");

            if (dontShow === "true") {
                // Directly delete logs without showing modal
                const response = await window.electronAPI.deleteAllLogs();
                if (response.success) {
                    window.electronAPI.showToast(response.message, true);
                    displayLogs()

                    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
                        const tooltipInstance = bootstrap.Tooltip.getInstance(el);
                        if (tooltipInstance) tooltipInstance.dispose();
                      });
                } else {
                    window.electronAPI.showToast(response.message, false);
                }
            } else {
                // Hide the logModal if open before showing confirmation modal
                if (logModal) {
                    logModal.hide();
                }
                // Show confirmation modal
                modal.show();
            }
        });
        deleteAllIcon._listenerAdded = true;
    }
}

export async function displayLogs() {
    const logs = await window.electronAPI.getLog();
    const tableBody = document.getElementById("logTableBody");
    const tableHead = document.getElementById("thead");

    tableBody.innerHTML = "";

    const dltIcon = document.getElementById("dltIcon");

    if (logs.length === 0) {
        tableHead.style.display = "none";
        tableBody.innerHTML = `
                <tr>
                <td colspan="3" class="text-center text-muted p-3">No history log</td>
                </tr>
            `;
        dltIcon.style.display = "none";
    } else {
        tableHead.style.display = "table-header-group";
        dltIcon.style.display = "inline-block";
    }

    logs.forEach((log, index) => {
        const row = document.createElement("tr");

        const formattedDate = formatDate(log.createdAt);

        row.innerHTML = `
                <td class="p-2">@${log.user}</td>
                <td class="p-2">${log.log} <span class="log-item">(${log.item.itemCode} ${log.item.itemName})</span></td>
                <td class="p-2" style="width: 12.5rem;">${formattedDate}</td>
            `;
        tableBody.appendChild(row);
    });

    const tooltip = await import("../utils/tooltipUtil.js")
    tooltip.initializeTooltip();
};

export function initImportItem(search) {
  const importBtn = document.getElementById("importItem");
  if (importBtn && window.electronAPI?.importItemsFromFile &&
    !importBtn._importListenerAdded) {
    importBtn.addEventListener("click", async () => {
      const result = await window.electronAPI.importItemsFromFile();
      if (result && result.success) {
        window.electronAPI.showToast(result.message, true);
        // Optionally refresh your items table here:
        fetchItems(search);
      } else {
        window.electronAPI.showToast(
          result?.message || "Import failed.",
          false
        );
      }
    });
    importBtn._importListenerAdded = true;
  }
}

export function initExportItem(search) {
    const exportBtn = document.getElementById("exportItem");
    if (
        exportBtn &&
        window.electronAPI?.exportItemsToExcel &&
        !exportBtn._exportListenerAdded
    ) {
        exportBtn.addEventListener("click", async () => {
            // Get the selected year from your filter (if any)
            const yearItem = document.getElementById("yearItem");
            let year = yearItem && yearItem.value ? Number(yearItem.value) : undefined;

            const result = await window.electronAPI.exportItemsToExcel(year);
            if (result && result.success) {
                window.electronAPI.showToast(result.message, true);
                // Optionally refresh your items table here:
                fetchItems(search, yearItem ? yearItem.value : "");
            } else {
                window.electronAPI.showToast(
                    result?.message || "Export failed.",
                    false
                );
            }
        });
        exportBtn._exportListenerAdded = true;
    }
  }

export function clearPreferences() {
    const clearBtn = document.getElementById("clearPreference");
    if (clearBtn && !clearBtn._listenerAdded) {
        clearBtn.addEventListener("click", () => {
            localStorage.removeItem("dontShowDeleteModal");
            localStorage.removeItem("dontShowDeleteAllLogModal");
            window.electronAPI.showToast("Preferences cleared.", true);
        });
        clearBtn._listenerAdded = true;
    }
}