import { capitalizeWords, formatDate } from "../utils/utils.js";

export function initAddNewPr() {
    const form = document.getElementById("addPrForm");
    const modal = new bootstrap.Modal(document.getElementById("addPrModal"));

    if (form && window.electronAPI && !form._prListenerAdded) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const rawCode = document
          .getElementById("addPrItem")
          .value.trim()
          .toLowerCase();
        const quantity = parseInt(
          document.getElementById("addPrQuantity").value.trim()
        );
        const requestedBy = capitalizeWords(
          document.getElementById("addPrRequestedBy").value.trim()
        );
        const date = document.getElementById("addPrDate").value.trim();

        const code = rawCode.split(" ")[0];

        const data = {
          itemCode: code,
          requestedQuantity: quantity,
          requestedBy: requestedBy,
          requestedDate: date,
        };

        if (!code || !requestedBy || !quantity || !date) {
          window.electronAPI.showToast("All fields required.", false);
          return;
        }

        try {
          const response = await window.electronAPI.addNewPr(data);

          if (response.success) {
            window.electronAPI.showToast(response.message, response.success);
            modal.hide();
            // form.reset();
            fetchPr();

            const logData = {
              itemId: response.data.item.id,
              user: requestedBy,
              log:
                quantity === 1
                  ? `Requested ${quantity} ${response.data.item.unit.toLowerCase()} of`
                  : `Requested ${quantity} ${response.data.item.unit.toLowerCase()}s of`,
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

export async function fetchPr(searchQuery = "") {
    try {
        // const items = await window.electronAPI.fetchPr();

        const items = await window.electronAPI.fetchPrDr({ tableName: "purchaseRequest", orderBy: "requestedDate", order: "desc" });

        const table = document.getElementById("prTable");
        const tableHead = document.getElementById("prTableHead");
        const tableBody = document.getElementById("prTableBody");

        tableBody.innerHTML = "";

        const filteredItems = items.filter(item => {
            const itemCodeMatch = item.item.itemCode.toLowerCase().includes(searchQuery.toLowerCase());

            const itemDate = formatDate(item.requestedDate);

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

            const formattedDate = formatDate(item.requestedDate);

            row.innerHTML = `
                <td class="checkboxCell" style="display: none;">
                    <input id="checkbox" type="checkbox" class="rowCheckbox" data-id="${item.id}">
                </td>
                <td>${index + 1}</td>
                <td>${item.item.itemCode}</td>
                <td>${item.item.itemName}</td>
                <td>${item.requestedQuantity}</td>
                <td>${item.item.unit}</td>
                <td>${item.requestedBy}</td>
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
        console.error("Error fetching items:", error);
    }
};