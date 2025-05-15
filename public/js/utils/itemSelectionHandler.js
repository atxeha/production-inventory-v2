let ifSelected = false;

export function handleSelection(tableBodyId) {
    const checkboxColumn = document.getElementById("checkboxColumn");
    const selectAllIcon = document.getElementById("selectAllItem");
    const selectItemIcon = document.getElementById("selectItem");

    // Function to add or remove row highlight based on checkbox change
    function removeCellBg() {
        document.addEventListener("change", (event) => {
            if (event.target.classList.contains("rowCheckbox")) {
                const row = event.target.closest("tr");
                if (event.target.checked) {
                    row.classList.add("selected-row");
                } else {
                    row.classList.remove("selected-row");
                }
            }
        });
    }

    // Event listener for select all icon click
    if (selectAllIcon) {
        selectAllIcon.addEventListener("click", () => {
            const checkboxCells = document.querySelectorAll(".checkboxCell input");
            const rows = document.querySelectorAll(`#${tableBodyId} tr`);

            if (checkboxCells.length > 0) {
                const currentDisplay = window.getComputedStyle(checkboxColumn).display;
                const isCurrentlyHidden = currentDisplay === "none";

                checkboxColumn.style.display = isCurrentlyHidden ? "table-cell" : "none";
                // Remove opacity setting to avoid hiding the column
                checkboxColumn.style.opacity = 0

                checkboxCells.forEach((checkbox, index) => {
                    checkbox.parentElement.style.display = isCurrentlyHidden ? "table-cell" : "none";
                    checkbox.checked = isCurrentlyHidden;

                    if (isCurrentlyHidden) {
                        rows[index].classList.add("selected-row");
                        ifSelected = true;
                    } else {
                        rows[index].classList.remove("selected-row");
                        ifSelected = false;
                    }
                });
            }
        });
    }

    // Event listener for select item icon click
    if (selectItemIcon) {
        selectItemIcon.addEventListener("click", () => {
            if (!ifSelected) {
                const checkboxCells = document.querySelectorAll(".checkboxCell input");
                const currentDisplay = window.getComputedStyle(checkboxColumn).display;
                const isCurrentlyHidden = currentDisplay === "none";

                checkboxColumn.style.display = isCurrentlyHidden ? "table-cell" : "none";
                checkboxColumn.style.opacity = 0

                checkboxCells.forEach((checkbox) => {
                    checkbox.parentElement.style.display = isCurrentlyHidden ? "table-cell" : "none";
                });
            }
        });
    }

    removeCellBg();
}

export function deleteSelected(tableName, modulePath, postDeleteFunctionName) {
    const deleteItemModal = new bootstrap.Modal(document.getElementById("deleteItemModal"));
    const deleteItemForm = document.getElementById("deleteItemForm");

    if (deleteItemForm) {
        deleteItemForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const checkboxes = document.querySelectorAll(".rowCheckbox:checked");
            const selectedIds = Array.from(checkboxes).map(checkbox => String(checkbox.dataset.id));

            if (selectedIds.length === 0) {
                window.electronAPI.showToast("No items selected.", false);
                return;
            }

            const response = await window.electronAPI.deleteSelectedItems(tableName, selectedIds);

            document.getElementById("checkboxColumn").style.display = "none";

            if (response.success) {
                window.electronAPI.showToast(response.message, response.success);
                deleteItemModal.hide();
                
                try {
                    const module = await import(modulePath);
                    if (typeof module[postDeleteFunctionName] === "function") {
                        module[postDeleteFunctionName](""); // Pass any argument you need
                    } else {
                        console.warn(`Function ${postDeleteFunctionName} not found in ${modulePath}`);
                    }
                } catch (err) {
                    console.error("Error loading module or calling function:", err);
                }
            }
        });
    }
}

// Call the combined function to attach event listeners
// handleSelection();
