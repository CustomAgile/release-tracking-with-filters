Ext.define('CustomAgile.ui.plugin.print.ReleaseTrackingPrinting', {
    alias: 'plugin.releasetrackingprinting',
    extend: 'Rally.ui.cardboard.plugin.Print',

    /**
     * Opens a new window and injects content to be printed.
     * This function is added to the component that adds this plugin.
     *
     * @param {Object} printOptions options for printing
     * @param {String} printOptions.title
     */
    openPrintPage: async function (printOptions) {
        this.printOptions = printOptions;
        this.printWindow = window.open(Rally.environment.getServer().getContextUrl() + '/blank.html', 'printwindow', "scrollbars=yes");
        //prevent new print windows from overwriting this one
        this.printWindow.name = '';
        this.filters = await Rally.getApp().ancestorFilterPlugin.getAllFiltersForType('PortfolioItem/Feature', true);
        this._waitForWindow(this.printWindow, Ext.bind(this._injectPageStructure, this));
    },

    getContent: function () {
        let app = Rally.getApp();
        let html = '';

        if (this.filters && this.filters.length) {
            let filterString = Rally.data.wsapi.Filter.and(this.filters).toString();
            html += `<div class="print-info-text"> Filter applied to Features: </div>`;
            html += `<div class="print-info-text">${filterString}</div>`;
        }
        if (app.down('#onlyStoriesWithDependenciesCheckbox').getValue()) {
            html += `<div class="print-info-text">Only showing Stories with dependencies</div>`;
        }

        if (app.dependencyFilterBtn.getFeaturesWithDependenciesValue()) {
            html += `<div class="print-info-text">Only showing Features with dependencies</div>`;
        }

        if (app.dependencyFilterBtn.getFeaturesWithStoryDependenciesValue()) {
            html += `<div class="print-info-text">Only showing Features with Story dependencies</div>`;
        }

        html += this._getHtmlContent(this.component.getEl().dom); // Board HTML
        html += `<div class="print-info-text">Features:</div>`;
        html += this._getHtmlContent(app.grid.getGridOrBoard().getEl().dom); // Grid HTML

        return html;
    },

    getFooter: function () {
        return '';
    }
});