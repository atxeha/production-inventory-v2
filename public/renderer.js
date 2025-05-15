document.addEventListener("DOMContentLoaded", async () => {

    // const selectionHandler = await import("./js/utils/itemSelectionHandler.js")

    function backToHome() {
        const back = document.getElementById("backBtn");
        if (back) {
            back.removeEventListener("click", back._listener);
            back._listener = (e) => {
                e.preventDefault();
                loadPage("home.html");
            };
            back.addEventListener("click", back._listener);
        }
    }

    async function initNavigationListeners() {
        const viewPulledItem = document.getElementById("viewPulledItem");
        const viewRequest = document.getElementById("viewRequest");
        const viewPr = document.getElementById("prBtn");
        const viewDr = document.getElementById("drBtn");

        if (viewPulledItem) {
            viewPulledItem.addEventListener("click", async (e) => {
                e.preventDefault();
                await loadPage("pulled.html");
            });
        }

        if (viewRequest) {
            viewRequest.addEventListener("click", async (e) => {
                e.preventDefault();
                await loadPage("pr.html");
            });
        }

        if (viewPr) {
            viewPr.addEventListener("click", async (e) => {
                e.preventDefault();
                await loadPage("pr.html");
            });
        }

        if (viewDr) {
            viewDr.addEventListener("click", async (e) => {
                e.preventDefault();
                await loadPage("dr.html");
            });
        }

        backToHome();
    }


    const currentPage = localStorage.getItem("currentPage");
    if (currentPage) {
        await loadPage(currentPage);
    } else {
        await loadPage("home.html");
    }
    await initNavigationListeners();


    function attachScrollListener() {
        const tableContainer = document.querySelector(".table-container");
        const tableHead = document.querySelector(".table thead");

        if (tableContainer && tableHead) {
            tableContainer.addEventListener("scroll", function () {
                tableContainer.classList.add("scrolling");

                clearTimeout(tableContainer.scrollTimeout);
                tableContainer.scrollTimeout = setTimeout(() => {
                    tableContainer.classList.remove("scrolling");
                }, 400);

                if (tableContainer.scrollTop > 0) {
                    tableHead.style.boxShadow = "0 8px 12px rgba(0, 0, 0, 0.1)";
                } else {
                    tableHead.style.boxShadow = "none";
                }
            });
        }
    }

    function initializeTooltips() {
        // Remove all existing tooltip DOM elements
        document.querySelectorAll('.tooltip').forEach(t => t.remove());

        var tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );

        // Dispose existing tooltips to avoid duplicates
        tooltipTriggerList.forEach((el) => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });

        tooltipTriggerList.map(
            (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
        );
    }

    async function loadPage(page) {
        await fetch(`./${page}`)
            .then((response) => response.text())
            .then(async (data) => {
                // Parse the fetched HTML string to extract only the content inside the body tag
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const bodyContent = doc.body.innerHTML;

                document.getElementById("main-content").innerHTML = bodyContent;
                initializeTooltips();

                localStorage.setItem("currentPage", page);

                // Attach scroll listener after content load
                attachScrollListener();
                const datalistModule = await import("./js/utils/customDatalist.js")
                const utilsModule = await import("./js/utils/defaultDate.js");

                await initNavigationListeners();

                if (page === "home.html") {
                    const homeModule = await import("./js/logics/home.js");
                    const selectionHandlers = await import("./js/utils/itemSelectionHandler.js");
                    

                    const unitOptions = ["Bottle", "Box", "Bundle", "Piece", "Ream", "Roll", "Set"];
                    const staffOptions = ["Abao, E.", "Timbal, M.", "Vios, R."];

                    const searchItem = document.getElementById("searchItem");
                    let searchFilter = "";
                    if (searchItem) {
                        const savedFilter = localStorage.getItem("searchItem");
                        if (savedFilter) {
                            searchFilter = savedFilter;
                            searchItem.value = savedFilter;
                        } else {
                            searchItem.value = searchFilter;
                        }
                    } 
                    
                    homeModule.initAddItem();
                    homeModule.initModalListeners();
                    datalistModule.initCustomDatalist(unitOptions, 'addUnit', 'addUnits');
                    datalistModule.initCustomDatalist(staffOptions, 'addedBy', 'addedBys');
                    datalistModule.initCustomDatalist(staffOptions, 'pullReceivedBy', 'pullReceivedBys');
                    datalistModule.initCustomDatalist(staffOptions, 'newUpdatedBy', 'newUpdatedBys');
                    datalistModule.initCustomDatalist(unitOptions, 'editUnit', 'editUnits');
                    homeModule.fetchItems(searchFilter)
                    homeModule.displayLogs()

                    homeModule.initPullItem();
                    homeModule.initUpdateItemQuantity();
                    homeModule.initEditItem();
                    homeModule.deleteAllLogs(); 

                    selectionHandlers.handleSelection("itemsTableBody");
                    selectionHandlers.deleteSelected("item", "../logics/home.js", "fetchItems");

                    utilsModule.initDate("addDate", "pullDate", "newQuantityDate")

                    if (searchItem) {
                        searchItem.addEventListener("input", () => {
                            localStorage.setItem("searchItem", searchItem.value);
                            homeModule.fetchItems(searchItem.value);
                        });
                    }
                }

                if (page === "pulled.html") {
                    const pulledModule = await import("./js/logics/pulled.js");
                    
                    // const utilsModule = await import("./js/utils/defaultDate.js");

                    // const options = ["Bottle", "Box", "Bundle", "Piece", "Ream", "Roll", "Set", ];

                    const searchItem = document.getElementById("searchPulledItem");
                    let searchFilter = "";
                    if (searchItem) {
                        const savedFilter = localStorage.getItem("searchPulledItem");
                        if (savedFilter) {
                            searchFilter = savedFilter;
                            searchItem.value = savedFilter;
                        } else {
                            searchItem.value = searchFilter;
                        }
                    } 
                    
                    // pulledModule.initAddItem();
                    // pulledModule.initModalListeners();
                    // pulledModule.initCustomDatalist(options, 'addUnit', 'addUnits');
                    pulledModule.fetchPulledItems(searchFilter);
                    const selectionHandler = await import("./js/utils/itemSelectionHandler.js");
                    selectionHandler.handleSelection("pulledTableBody");
                    selectionHandler.deleteSelected("pulledItem", "../logics/pulled.js", "fetchPulledItems");


                    // utilsModule.initDate("addDate", "pullDate", "newQuantityDate")

                    if (searchItem) {
                        searchItem.addEventListener("input", () => {
                            localStorage.setItem("searchPulledItem", searchItem.value);
                            pulledModule.fetchPulledItems(searchItem.value);
                        });
                    }
                }
                if (page === "pr.html") {
                    const prDrModule = await import("./js/utils/utils.js");

                    const options = await prDrModule.fetchItems();

                    datalistModule.initCustomDatalist(options, "addPrItem", "addPrItems");
                    utilsModule.initDate("addDate");
                }
                if (page === "dr.html") {
                    const prDrModule = await import("./js/utils/utils.js");

                    const options = await prDrModule.fetchItems();

                    datalistModule.initCustomDatalist(options, "addPrItem", "addPrItems");
                    utilsModule.initDate("addDate");
                }


            })
            .catch((error) => console.error("Error loading page:", error));
    }

    window.electronAPI.onLoadPage(async (event, page) => {
        console.log("Received load-page event for:", page);
        await loadPage(page);
    });

})
