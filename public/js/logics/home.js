function capitalizeWords(str) {
    return str
        .toLowerCase() // Convert entire string to lowercase first
        .split(" ") // Split into words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
        .join(" "); // Join words back into a string
}

let items = []

export function initAddItem() {
    const addItemForm = document.getElementById("addItemForm");
    const addItemModal = new bootstrap.Modal(document.getElementById("addItemModal"));

    if (addItemForm && window.electronAPI) {
        addItemForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const itemCode = document.getElementById("addItemCode").value.trim().toLowerCase();
            const itemName = capitalizeWords(document.getElementById("addItemName").value.trim());
            const quantity = parseInt(document.getElementById("addQuantity").value.trim());
            const unit = document.getElementById("addUnit").value.trim();
            const withdrawn = parseInt(document.getElementById("addWithdrawn").value.trim());
            const addedBy = capitalizeWords(document.getElementById("addedBy").value.trim());
            const date = document.getElementById("addDate").value.trim();
            const deliveredBy = capitalizeWords(document.getElementById("addDeliveredBy").value.trim());
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
                isDelivered: isDelivered
            };

            if (!itemCode || !itemName || !quantity || !unit || !date) {
                window.electronAPI.showToast("All fields required.", false); return;
            }

            try {
                const response = await window.electronAPI.addItem(data);

                if (response.success) {
                    console.log(response.message)
                    window.electronAPI.showToast(response.message, response.success);
                    addItemModal.hide();
                    fetchItems()

                    const logData = {
                        itemId: response.item.id,
                        user: addedBy,
                        log: quantity === 1 ? `Added ${quantity} new ${unit.toLowerCase()} of` : `Added ${quantity} new ${unit.toLowerCase()}s of`
                    }

                    try {
                        window.electronAPI.addLog(logData);
                    } catch (error) {
                        console.log(error)
                    }

                    displayLogs()

                } else {
                    console.log(response.message)
                    window.electronAPI.showToast(response.message, response.success);
                }
            } catch (err) {
                window.electronAPI.showToast(err.message, false);
            }
        });
    }
}

export async function initPullItem() {
    const tableBody = document.getElementById("itemsTableBody");
    const pullItemForm = document.getElementById("pullItemForm");
    const pullItemModal = new bootstrap.Modal(document.getElementById("pullItemModal"));

    const itemCodeLabel = document.getElementById("itemCodeLabel");
    const itemNameLabel = document.getElementById("itemNameLabel");
    const itemStockLabel = document.getElementById("itemStockLabel");

    if (tableBody) {
        tableBody.addEventListener("click", async (event) => {
            const target = event.target;
            if (target.classList.contains("pullItem")) {
                event.preventDefault();
                const id = target.dataset.pullId;

                const item = items.find((item) => item.id == id);

                itemCodeLabel.textContent = item.itemCode
                itemNameLabel.textContent = item.itemName
                itemStockLabel.textContent = item.quantity
                
                if (pullItemForm) {
                    pullItemForm.addEventListener("submit", async (event) => {
                        event.preventDefault();

                        const quantity = parseInt(document.getElementById("pullQuantity").value.trim() || "0", 10);
                        const releasedBy = capitalizeWords(document.getElementById("pullReleasedBy").value.trim());
                        const receivedBy = capitalizeWords(document.getElementById("pullReceivedBy").value.trim());
                        const date = document.getElementById("pullDate").value.trim();

                        if (!id || !releasedBy || !quantity || !receivedBy) {
                            window.electronAPI.showToast("All fields are required.", false);
                            return;
                        }

                        const pullData = {
                            itemId: Number(id),
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
                                fetchItems();

                                const logData = {
                                    itemId: response.item.item.id,
                                    user: releasedBy,
                                    log: quantity === 1 ? `Pulled ${quantity} ${response.item.item.unit.toLowerCase()} of` : `Pulled ${quantity} ${response.item.item.unit.toLowerCase()}s of item`
                                }
                                try {
                                    window.electronAPI.addLog(logData);
                                } catch (error) {
                                    console.log(error)
                                }

                                displayLogs()
                            } else {
                                window.electronAPI.showToast(response.message.message, false);
                            }
                        } catch (error) {
                            window.electronAPI.showToast(error.message, false);
                        }
                    });
                }
                
            } 
        });
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
}

export function initCustomDatalist(options, inputId, listId) {
    const input = document.getElementById(inputId);
    const optionsList = document.getElementById(listId);

    if (!input || !optionsList) return;

    // Function to render the list
    function showOptions(filter = '') {
        optionsList.innerHTML = '';
        const filtered = options.filter(opt => opt.toLowerCase().includes(filter.toLowerCase()));

        if (filtered.length > 0) {
            optionsList.style.display = 'block';
            filtered.forEach(opt => {
                const li = document.createElement('li');
                li.textContent = opt;
                li.addEventListener('click', () => {
                    input.value = opt;
                    optionsList.style.display = 'none';
                });
                optionsList.appendChild(li);
            });
        } else {
            optionsList.style.display = 'none';
        }
    }

    // Show on focus (first click)
    input.addEventListener('focus', () => {
        showOptions(); // show all options initially
    });

    // Filter as user types
    input.addEventListener('input', () => {
        showOptions(input.value);
    });

    // Hide when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-datalist')) {
            optionsList.style.display = 'none';
        }
    });
}

export async function fetchItems(searchQuery = "") {
    try {
        items = await window.electronAPI.getItems();
        const itemTable = document.getElementById("itemsTable")
        const tableHead = document.getElementById("itemsTableHead")
        const tableBody = document.getElementById("itemsTableBody");

        tableBody.innerHTML = "";

        const filteredItems = items.filter(item => {
            const itemCodeMatch = item.itemCode.toLowerCase().includes(searchQuery.toLowerCase());

            const itemDate = new Date(item.date)
                .toLocaleString("en-US", {
                    timeZone: "Asia/Manila",
                    year: "2-digit",
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hourCycle: "h12",
                })
                .replace("AM", "am")
                .replace("PM", "pm")
                .replace("/", "-")
                .replace("/", "-")
                .replace(",", " --");

            const dateMatch = itemDate.includes(searchQuery);

            return itemCodeMatch || dateMatch;
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
        <td class="text-center">${item.PurchaseRequest[0]?.requestedQuantity ?? "--"}</td>
        <td class="text-center">${item.RequestDelivered[0]?.deliveredQuantity ?? "--"}</td>
        <td class="text-center">${item.withdrawn}</td>
        <td class="actions">
            <span data-bs-toggle="modal" data-bs-target="#editItemModal">
                <i id="edit-${item.id}" class="edit-icon icon-btn icon material-icons edit-item" data-bs-toggle="tooltip"
                    data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Edit information">edit</i>
            </span>
            <span data-bs-toggle="modal" data-bs-target="#updateItemQuantityModal">
              <i id="new-quantity-${item.id
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
        var tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.map(
            (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
        );

        const tooltip = await import("../utils/hideTooltip.js")

        tooltip.hideTooltips("prFilter", "drFilter");

    } catch (error) {
        console.error("Error fetching items:", error);
    }
}

export async function displayLogs() {
    try {
        const logs = await window.electronAPI.getLog();
        const tableBody = document.getElementById("logTableBody");
        const tableHead = document.getElementById("thead");

        tableBody.innerHTML = "";



        const dltIcon = document.getElementById("dltIcon");

        if (logs.length === 0) {
            tableHead.innerHTML = "";
            tableBody.innerHTML = `
                <tr>
                <td colspan="3" class="text-center text-muted p-3">No history log</td>
                </tr>
            `;
            dltIcon.style.display = "none";
            return;
        } else {
            dltIcon.style.display = "inline-block";
        }

        logs.forEach((log, index) => {
            const row = document.createElement("tr");

            // Convert ISO Date to local time format (MM-DD-YYYY HH:mm A)
            const formattedDate = new Date(log.createdAt)
                .toLocaleString("en-US", {
                    timeZone: "Asia/Manila",
                    year: "2-digit",
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hourCycle: "h12",
                })
                .replace("AM", "am")
                .replace("PM", "pm")
                .replace("/", "-")
                .replace("/", "-")
                .replace(",", " --");

            row.innerHTML = `
                <td class="p-2">@${log.user}</td>
                <td class="p-2">${log.log} <span class="log-item">(${log.item.itemCode} ${log.item.itemName})</span></td>
                <td class="p-2" style="width: 10rem;">${formattedDate}</td>
            `;
            tableBody.appendChild(row);
        });

        // Reinitialize Bootstrap tooltips after adding new elements
        var tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.map(
            (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
        );

        console.log("Logs loaded successfully!");
    } catch (error) {
        console.error("Error fetching logs:", error);
    }
};
