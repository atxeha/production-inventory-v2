import { capitalizeWords, formatDate } from "../utils/utils.js";

export function initAddNewDr(search) {
    const form = document.getElementById("drForm");
    const modal = new bootstrap.Modal(document.getElementById("drModal"));

    if (form && window.electronAPI && !form._prListenerAdded) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const rawCode = document.getElementById("drItem").value.trim().toUpperCase();
            const quantity = parseInt(document.getElementById("drQuantity").value.trim());
            const deliveredBy = capitalizeWords(document.getElementById("drDeliveredBy").value.trim());
            const receivedBy = capitalizeWords(document.getElementById("drReceivedBy").value.trim());
            const date = document.getElementById("drDate").value.trim();
            const code = rawCode.split(" ")[0];

            const data = {
                itemCode: code,
                deliveredQuantity: quantity,
                deliveredBy: deliveredBy,
                receivedBy: receivedBy,
                deliveredDate: date,
            };

            if (!code || !deliveredBy || !receivedBy || !quantity || !date) { window.electronAPI.showToast("All fields required.", false); return; }

            try {
                const response = await window.electronAPI.addNewDr(data);

                if (response.success) {
                    modal.hide();
                    window.electronAPI.showToast(response.message, response.success);
                    fetchDr(search);

                    const logData = {
                        itemId: response.data.item.id,
                        user: receivedBy,
                        log: quantity === 1 ? `Item delivered: ${quantity} ${response.data.item.unit.toLowerCase()} of` : `Item delivered: ${quantity} ${response.data.item.unit.toLowerCase()}s of`
                    };

                    window.electronAPI.addLog(logData);
                } else {
                    window.electronAPI.showToast(response.message, response.success);
                }
            } catch (err) {
                window.electronAPI.showToast(err.message, false);
            }
        });
        form._prListenerAdded = true;
    }
}


export async function fetchDr(searchQuery = "") {
    try {
        // const items = await window.electronAPI.fetchPr();

        const items = await window.electronAPI.fetchPrDr({
            tableName: "requestDelivered",
            orderBy: "deliveredDate",
            order: "desc"
        });

        const table = document.getElementById("drTable");
        const tableHead = document.getElementById("drTableHead");
        const tableBody = document.getElementById("drTableBody");

        tableBody.innerHTML = "";

        const filteredItems = items.filter(item => {
            const itemCodeMatch = item.item.itemCode.toLowerCase().includes(searchQuery.toLowerCase());

            const itemDate = formatDate(item.deliveredDate);

            const dateMatch = itemDate.includes(searchQuery);
            return itemCodeMatch || dateMatch;
        });

        if (filteredItems.length === 0) {
            table.classList.remove("table-hover");
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

            const formattedDate = formatDate(item.deliveredDate);

            row.innerHTML = `
                <td class="checkboxCell" style="display: none;">
                    <input id="checkbox" type="checkbox" class="rowCheckbox" data-id="${item.id}">
                </td>
                <td>${index + 1}</td>
                <td>${item.item.itemCode}</td>
                <td>${item.item.itemName}</td>
                <td>${item.deliveredQuantity}</td>
                <td>${item.item.unit}</td>
                <td>${item.deliveredBy}</td>
                <td>${item.receivedBy}</td>
                <td>${formattedDate}</td>
                <td class=actions">
                    <i data-delete-id="${item.id}" class="dlt-icon icon-btn icon material-icons" data-bs-toggle="tooltip"
                        data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Delete">delete</i>
                    <i data-edit-id="${item.id}" class="edit-icon icon-btn icon material-icons" data-bs-toggle="tooltip"
                        data-bs-placement="top" data-bs-custom-class="custom-tooltip" title="Edit">edit</i>
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
};

export function initImportItem(search) {
    const importBtn = document.getElementById("importItem");
    if (
        importBtn &&
        window.electronAPI?.importPulledItemsFromFile &&
        !importBtn._importListenerAdded
    ) {
        importBtn.addEventListener("click", async () => {
            const result = await window.electronAPI.importRequestDeliveredFromFile();
            if (result && result.success) {
                window.electronAPI.showToast(result.message, true);
                // Optionally refresh your items table here:
                fetchDr(search);
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