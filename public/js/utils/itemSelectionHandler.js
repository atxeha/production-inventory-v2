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
                    ifSelected = true;
                } else {
                    row.classList.remove("selected-row");
                    ifSelected = false;
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

    // Unselect items and hide checkboxes when clicking outside the table/cells
    document.addEventListener("mousedown", function (event) {
        const table = document.getElementById(tableBodyId)?.closest("table");
        const isCheckboxCell = event.target.closest(".checkboxCell");
        const isTable = table && table.contains(event.target);
    
        // Exclude clicks on icons, buttons, and checkboxes outside the cell
        const isIconOrButton =
            event.target.closest("button") ||
            event.target.closest("i") ||
            event.target.tagName === "BUTTON" ||
            event.target.tagName === "I";
    
        // Exclude clicks on any checkbox not inside a .checkboxCell
        const isCheckboxOutsideCell =
            event.target.type === "checkbox" && !event.target.closest(".checkboxCell");
    
        // Exclude if any Bootstrap modal is open
        const isModalOpen = !!document.querySelector('.modal.show');
    
        if (
            !isCheckboxCell &&
            !isTable &&
            !isIconOrButton &&
            !isCheckboxOutsideCell &&
            !isModalOpen &&
            checkboxColumn &&
            checkboxColumn.style.display !== "none"
        ) {
            checkboxColumn.style.display = "none";
            document.querySelectorAll(".checkboxCell").forEach(cell => {
                cell.style.display = "none";
            });
            document.querySelectorAll(".rowCheckbox").forEach(checkbox => {
                checkbox.checked = false;
                const row = checkbox.closest("tr");
                if (row) row.classList.remove("selected-row");
            });
            ifSelected = false;
        }
    });

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
                ifSelected = false;
                
                    const module = await import(modulePath);
                    if (typeof module[postDeleteFunctionName] === "function") {
                        module[postDeleteFunctionName]("");
                    }
            }
        });
    }
}

