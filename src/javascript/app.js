/* global Ext _ Rally Constants Deft Utils */
Ext.define("release-tracking-with-filters", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: 'border',
    integrationHeaders: {
        name: "release-tracking-with-filters"
    },
    items: [{
        id: 'filter-area',
        region: 'north',
        xtype: 'panel',
        minHeight: 250,
        overflowY: 'auto',
        collapsible: true,
        margins: '0 0 10 0',
        header: {
            cls: 'ts-panel-header',
            padding: '0 0 15 0'
        },
        cls: 'grid-area',
        title: 'FILTERS',
        layout: {
            type: 'vbox',
            align: 'stretch'
        },
        items: [{
            id: Utils.AncestorPiAppFilter.RENDER_AREA_ID,
            xtype: 'container',
            layout: {
                type: 'hbox',
                align: 'middle',
                defaultMargins: 5,
            }
        }, {
            id: 'sharedViewsContainer',
            xtype: 'container',
            layout: {
                type: 'hbox',
                align: 'middle',
                defaultMargins: 5,
            }
        }, {
            id: Utils.AncestorPiAppFilter.PANEL_RENDER_AREA_ID,
            xtype: 'container',
            layout: {
                type: 'hbox',
                align: 'middle',
                defaultMargins: 5,
            }
        }]
    }, {
        id: 'left-area',
        region: 'west',
        xtype: 'panel',
        split: true,
        header: {
            cls: 'ts-panel-header',
            padding: '0 0 15 0'
        },
        cls: 'grid-area',
        title: Constants.PORTFOLIO_ITEMS,
        flex: 1,
        layout: {
            type: 'vbox',
            align: 'stretch'
        },
        items: [{
            id: 'grid-area',
            xtype: 'container',
            flex: 1,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
        }]
    },
    {
        id: 'right-area',
        region: 'center',
        xtype: 'container',
        flex: 2,
        type: 'vbox',
        align: 'stretch',
        overflowX: 'auto',
        overflowY: 'auto',
        items: [{
            id: 'controls-area',
            xtype: 'container',
            layout: 'hbox',
            minWidth: 700,
            minHeight: 100,
            margin: '0 0 10 20',
            items: [{
                id: 'date-range-area',
                xtype: 'container',
                layout: 'vbox'
            }, {
                id: 'card-controls-area',
                xtype: 'container',
                layout: 'vbox',
                margin: '0 0 0 30',
            }, {
                id: 'dependency-controls-area',
                xtype: 'container',
                layout: 'vbox',
                margin: '0 0 0 30',
            }]
        }, {
            id: 'board-area',
            xtype: 'container',
            flex: 1,
            type: 'vbox',
            align: 'stretch',
            margin: '0 0 0 20'
        }]
    }
    ],
    config: {
        defaultSettings: {
            // 'ReleaseTrackingWithFilters.dependencyLines': 'noDependencyLines'
        },
    },

    launch: function () {
        Rally.data.wsapi.Proxy.superclass.timeout = 120000;
        Ext.tip.QuickTipManager.init();
        Ext.apply(Ext.tip.QuickTipManager.getQuickTip(), { showDelay: 50 });

        Ext.override(Rally.ui.cardboard.CardBoard, {
            getCards: function () {
                let cards = [];
                _.each(this.columnDefinitions, function (column) {
                    cards = cards.concat(column.getCards());
                });
                return cards;
            }
        });

        this.down('#right-area').on('resize', this.onCardboardResize, this);
        this.down('#controls-area').add({
            xtype: 'rallybutton',
            cls: 'customagile-button help',
            iconOnly: true,
            iconCls: 'icon-help',
            handler: (...args) => this.onHelpClicked(...args),
            id: 'storyDependencyHelp',
            margin: '0 0 0 5'
        });

        this.down('#date-range-area').add([
            {
                xtype: 'container',
                html: 'ITERATIONS',
                cls: 'date-label control-label'
            },
            {
                xtype: 'rallydatefield',
                id: 'start-date-picker',
                fieldLabel: Constants.START_DATE,
                labelWidth: 50,
                labelCls: 'date-label',
                width: 180,
                margin: '0 10 5 0',
                listeners: {
                    scope: this,
                    change: function (cmp, newValue) {
                        this.timeboxStart = newValue;
                        this._update();
                    }
                }
            }, {
                xtype: 'rallydatefield',
                id: 'end-date-picker',
                fieldLabel: Constants.END_DATE,
                labelWidth: 50,
                width: 180,
                labelCls: 'date-label',
                margin: '0 10 0 0',
                listeners: {
                    scope: this,
                    change: function (cmp, newValue) {
                        this.timeboxEnd = newValue;
                        this._update();
                    }
                }
            }]);

        this.down('#card-controls-area').add([{
            xtype: 'container',
            html: 'BOARD',
            cls: 'date-label control-label'
        }, {
            itemId: 'cardTypeCombo',
            xtype: 'rallycombobox',
            stateful: true,
            stateId: this.context.getScopedStateId('ReleaseTrackingWithFilters.CardTypeCombo'),
            stateEvents: ['change'],
            fieldLabel: 'Card Type',
            displayField: 'name',
            valueField: 'value',
            editable: false,
            allowBlank: false,
            labelWidth: 65,
            width: 200,
            margin: '0 5 5 0',
            store: Ext.create('Ext.data.Store', {
                fields: ['name', 'value'],
                data: [
                    { name: 'Features', value: 'Features' },
                    { name: 'Stories', value: 'Stories' }
                ]
            }),
            listeners: {
                scope: this,
                change: function () {
                    if (this.storiesFilter && this.currentIterations) {
                        this._addPisBoard(this.storiesFilter, this.currentIterations).then({
                            scope: this,
                            success: this.onAddPisBoardSuccess
                        });
                    }
                }
            }
        }, {
            itemId: 'swimlaneCombo',
            xtype: 'rallycombobox',
            stateful: true,
            stateId: this.context.getScopedStateId('ReleaseTrackingWithFilters.SwimlaneCombo'),
            stateEvents: ['change'],
            fieldLabel: 'Swimlanes',
            displayField: 'name',
            valueField: 'value',
            editable: false,
            allowBlank: false,
            labelWidth: 65,
            width: 200,
            margin: '0 5 0 0',
            store: Ext.create('Ext.data.Store', {
                fields: ['name', 'value'],
                data: [
                    { name: 'Project', value: 'Project' },
                    { name: 'Feature', value: 'Feature' }
                ]
            }),
            listeners: {
                scope: this,
                change: function () {
                    if (this.storiesFilter && this.currentIterations) {
                        this._addPisBoard(this.storiesFilter, this.currentIterations).then({
                            scope: this,
                            success: this.onAddPisBoardSuccess
                        });
                    }
                }
            }
        }]);

        this.down('#dependency-controls-area').add([{
            xtype: 'container',
            layout: 'hbox',
            items: [{
                xtype: 'container',
                html: 'DEPENDENCIES',
                cls: 'date-label control-label'
            }]
        },
        // TODO: Determine if this functionality is needed
        // {
        //     xtype: 'checkbox',
        //     stateful: true,
        //     stateId: this.context.getScopedStateId('ReleaseTrackingWithFilters.ShowLinesBetweenSiblingStoriesCheckbox'),
        //     stateEvents: ['change'],
        //     boxLabel: 'Show Lines Between Stories Under The Same Feature',
        //     boxLabelCls: 'dependency-label',
        //     labelWidth: 255,
        //     width: 300,
        //     name: 'linesBetweenSiblingStories',
        //     inputValue: true,
        //     itemId: 'linesBetweenSiblingsCheckbox',
        //     cls: 'dependency-checkbox',
        //     margin: '0 3 3 0',
        //     listeners: {
        //         scope: this,
        //         change: function (cmp, showLines) {
        //             this.removeDependencyLines();

        //             if (showLines) {
        //                 this.showLines();
        //             }
        //         }
        //     }
        // },
        {
            xtype: 'checkbox',
            stateful: true,
            stateId: this.context.getScopedStateId('ReleaseTrackingWithFilters.ShowOnlyStoriesWithDependenciesCheckbox'),
            stateEvents: ['change'],
            boxLabel: 'Only show Stories w/ Dependencies',
            boxLabelCls: 'dependency-label',
            labelWidth: 255,
            width: 275,
            name: 'onlyStoriesWithDependencies',
            inputValue: true,
            itemId: 'onlyStoriesWithDependenciesCheckbox',
            cls: 'dependency-checkbox',
            margin: '0 3 3 0',
            listeners: {
                scope: this,
                change: function () {
                    if (this.previousCancelIcon) {
                        this.previousDepIcon.setStyle('display', 'inline');
                        this.previousCancelIcon.setStyle('display', 'none');
                        this.previousDepIcon = null;
                        this.previousCancelIcon = null;
                    }

                    this.removeDependencyLines();
                    this._update();
                }
            }
        }, {
            xtype: 'checkbox',
            stateful: true,
            stateId: this.context.getScopedStateId('ReleaseTrackingWithFilters.ShowDependenciesCheckbox'),
            stateEvents: ['change'],
            boxLabel: 'Show Story Dependency Lines (<span class="field-content FeatureStoriesPredecessorsAndSuccessors icon-children"></span>)',
            boxLabelCls: 'dependency-label',
            labelWidth: 255,
            width: 275,
            name: 'dependencies',
            inputValue: true,
            itemId: 'storyDependencyCheckbox',
            cls: 'dependency-checkbox',
            margin: '0 3 3 0',
            listeners: {
                scope: this,
                change: function (cmp, showLines) {
                    if (this.previousCancelIcon) {
                        this.previousDepIcon.setStyle('display', 'inline');
                        this.previousCancelIcon.setStyle('display', 'none');
                        this.previousDepIcon = null;
                        this.previousCancelIcon = null;
                    }

                    this.removeDependencyLines();

                    if (showLines) {
                        this.down('#dependencyFiltersContainer').show();
                        this.showAllStoryDependencyLines();
                    } else {
                        this.down('#dependencyFiltersContainer').hide();
                    }
                }
            }
        }, {
            xtype: 'fieldcontainer',
            itemId: 'dependencyFiltersContainer',
            hidden: true,
            fieldLabel: 'Filters:',
            labelWidth: 50,
            defaultType: 'checkboxfield',
            layout: 'hbox',
            width: 300,
            fieldDefaults: {
                name: 'lineFilter',
                labelSeparator: '',
                margin: '-2 10 0 0'
            },
            items: [
                {
                    fieldLabel: 'Grey',
                    id: 'greyLineFilter',
                    stateful: true,
                    stateId: this.context.getScopedStateId('ReleaseTrackingWithFilters.ShowGreyDependenciesCheckbox'),
                    stateEvents: ['change'],
                    width: 56,
                    labelWidth: 28,
                    checked: true,
                    margin: '-2 8 0 0',
                    listeners: {
                        scope: this,
                        change: this.showAllStoryDependencyLines
                    }
                }, {
                    fieldLabel: 'Yellow',
                    id: 'yellowLineFilter',
                    stateful: true,
                    stateId: this.context.getScopedStateId('ReleaseTrackingWithFilters.ShowYellowDependenciesCheckbox'),
                    stateEvents: ['change'],
                    width: 60,
                    labelWidth: 35,
                    checked: true,
                    listeners: {
                        scope: this,
                        change: this.showAllStoryDependencyLines
                    }
                }, {
                    fieldLabel: 'Red',
                    id: 'redLineFilter',
                    stateful: true,
                    stateId: this.context.getScopedStateId('ReleaseTrackingWithFilters.ShowRedDependenciesCheckbox'),
                    stateEvents: ['change'],
                    width: 60,
                    labelWidth: 26,
                    checked: true,
                    listeners: {
                        scope: this,
                        change: this.showAllStoryDependencyLines
                    }
                }
            ]
        }]);

        let timeboxScope = this.getContext().getTimeboxScope();
        this._onTimeboxScopeChange(timeboxScope);

        this.ancestorFilterPlugin = Ext.create('Utils.AncestorPiAppFilter', {
            ptype: 'UtilsAncestorPiAppFilter',
            pluginId: 'ancestorFilterPlugin',
            visibleTab: 'PortfolioItem/Feature',
            listeners: {
                scope: this,
                ready(plugin) {
                    plugin.addListener({
                        scope: this,
                        select: this._update,
                        change: this._update
                    });
                    this.portfolioItemTypes = plugin.portfolioItemTypes;
                    this.lowestPi = this.portfolioItemTypes[0];
                    this.lowestPiTypePath = this.lowestPi.get('TypePath');
                    this.lowestPiTypeName = this.lowestPi.get('Name');
                    this.modelNames = [this.lowestPiTypePath];
                    Rally.data.wsapi.ModelFactory.getModel({
                        type: this.lowestPiTypePath
                    }).then({
                        scope: this,
                        success: async function (model) {
                            this.lowestPiModel = model;
                            await this._addSharedViewsCombo();
                            this._update();
                        }
                    });
                },
            }
        });

        this.down('#grid-area').on('resize', this._onResize, this);
        this.down('#controls-area').on('resize', this._onResize, this);
        this.down('#filter-area').on('collapse', this._onResize, this);
        this.down('#filter-area').on('expand', this._onResize, this);

        this.addPlugin(this.ancestorFilterPlugin);
    },

    _addSharedViewsCombo: function () {
        return new Promise(function (resolve) {
            this.down('#sharedViewsContainer').add([
                {
                    xtype: 'rallysharedviewcombobox',
                    title: 'Shared Views',
                    itemId: 'releaseTrackingSharedViewCombobox',
                    enableUrlSharing: true,
                    context: this.getContext(),
                    cmp: this,
                    listeners: {
                        ready: function (combo) {
                            combo.setValue(null);
                            resolve();
                        }
                    }
                }
            ]);
        }.bind(this));
    },

    getCurrentView: function () {
        let ancestorData = Rally.getApp().ancestorFilterPlugin._getValue();

        // Delete piRecord to avoid recursive stack overflow error
        delete ancestorData.piRecord;

        let gridView = this.down('#pisGrid').getCurrentView();
        let views = Ext.apply(gridView, ancestorData);

        views.featuresWithDependencies = this.dependencyFilterBtn.getFeaturesWithDependenciesValue();
        views.featuresWithStoryDependencies = this.dependencyFilterBtn.getFeaturesWithStoryDependenciesValue();
        views.dependencyFilterMatch = this.dependencyFilterBtn.getFilterMatchValue();
        views.cardType = this.down('#cardTypeCombo').getValue();
        views.swimlane = this.down('#swimlaneCombo').getValue();
        views.onlyStoriesWithDependencies = this.down('#onlyStoriesWithDependenciesCheckbox').getValue();
        views.storyDependencyLines = this.down('#storyDependencyCheckbox').getValue();
        views.greyLineFilter = this.down('#greyLineFilter').getValue();
        views.yellowLineFilter = this.down('#yellowLineFilter').getValue();
        views.redLineFilter = this.down('#redLineFilter').getValue();

        return views;
    },

    setCurrentView: function (view) {
        let app = Rally.getApp();
        this.setLoading('Loading View...');
        Ext.suspendLayouts();
        app.settingView = true;
        if (app.ancestorFilterPlugin) {
            if (view.filterStates) {
                app.ancestorFilterPlugin.mergeLegacyFilter(view.filterStates, view, app.lowestPiTypePath);
            }
            if (app.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl')) {
                app.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl').setValue(view.ignoreProjectScope);
            }
            app.ancestorFilterPlugin.setMultiLevelFilterStates(view.filterStates);
            app.ancestorFilterPlugin._setPiSelector(view.piTypePath, view.pi);
        }
        this.down('#pisGrid').setCurrentView(view);

        this.dependencyFilterBtn.updateValues({
            filterFeatures: view.featuresWithDependencies,
            filterStories: view.featuresWithStoryDependencies,
            filterMatch: view.dependencyFilterMatch
        });
        this.dependencyFilterBtn.saveState();

        this.down('#cardTypeCombo').setValue(view.cardType);
        this.down('#swimlaneCombo').setValue(view.swimlane);
        this.down('#onlyStoriesWithDependenciesCheckbox').setValue(view.onlyStoriesWithDependencies);
        this.down('#storyDependencyCheckbox').setValue(view.storyDependencyLines);
        this.down('#greyLineFilter').setValue(view.greyLineFilter);
        this.down('#yellowLineFilter').setValue(view.yellowLineFilter);
        this.down('#redLineFilter').setValue(view.redLineFilter);

        setTimeout(async function () {
            Ext.resumeLayouts(true);
            app.settingView = false;
            app.dontResetSharedViewCombo = true;
            this.setLoading(false);
            app._update();
        }.bind(this), 2000);
    },

    _update: async function () {
        if (this.settingView) {
            return;
        }

        let gridArea = this.down('#grid-area');
        if (gridArea) {
            gridArea.removeAll();
        }
        if (!this.dontResetSharedViewCombo && this.down('#releaseTrackingSharedViewCombobox')) {
            this.down('#releaseTrackingSharedViewCombobox').setValue(null);
        }
        this.dontResetSharedViewCombo = false;
        this.setLoading(true);
        this.dependencyFilterBtn = Ext.create('CustomAgile.ui.gridboard.DependencyFilter', {
            // headerPosition: 'left',
            margin: '0 9 0 9',
            itemId: 'dependencyFilterBtn',
            stateful: true,
            stateId: this.getContext().getScopedStateId('ReleaseTrackingWithFilters.dependencyfilter'),
            listeners: {
                scope: this,
                dependencyfilterchange: this._dependencyfilterchange,
                dependencyfilterstateapplied: this._dependencyfilterstateapplied
            }
        });

        this.currentIterations = await this._updateIterationsStore();
        await this._updatePisStore();

        if (!this.loadingFailed) {
            this._addPisGrid(this.piStore);
        } else {
            this.setLoading(false);
        }
    },

    _onResize: function () {
        // Hiding one of the advanced filters throws an error once this method is 
        // called and we try to set the grid height. Waiting a bit first solves this
        setTimeout(function () {
            // this.is_a_nightmare() === true
            let gridArea = this.down('#grid-area');
            let grid = this.down('#pisGrid');

            if (gridArea && grid) {
                grid.setHeight(gridArea.getHeight());
            }

            let boardArea = this.down('#board-area');
            let rightArea = this.down('#right-area');
            let controlsArea = this.down('#controls-area');
            let board = this.down('#releaseCardboard');

            if (rightArea && controlsArea && boardArea && board) {
                boardArea.setHeight(rightArea.getHeight() - ((controlsArea.getOuterSize() && controlsArea.getOuterSize().height) || 0));
                board.setHeight(boardArea.getHeight() - 20);
                boardArea.setWidth(rightArea.getWidth() - 20);
            }
        }.bind(this), 500);
    },

    _updatePisStore: async function () {
        this.loadingFailed = false;
        this.currentDataContext = this.getContext().getDataContext();
        if (this.searchAllProjects()) {
            this.currentDataContext.project = null;
        }

        this.currentPiQueries = await this._getPiQueries();

        if (this.loadingFailed) {
            return;
        }

        this.piStore = await Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.lowestPiTypePath],
            autoLoad: false,
            fetch: true, // This solves the issue with the field picker loading new columns with no data in them
            filters: this.currentPiQueries,
            enableHierarchy: true,
            remoteSort: true,
            context: this.currentDataContext,
            enablePostGet: true,
            enableRootLevelPostGet: true,
            clearOnLoad: false,
            listeners: {
                scope: this,
                beforeexpand: function (node) {
                    // Prevent a reload of the board when expanding a Feature in the Grid to show it's children
                    if (node && node.internalId !== 'root') {
                        this.expandingRow = true;
                    }
                }
            }
        });
    },

    _getPiQueries: async function () {
        let queries = [];

        switch (this.timeboxType) {
            case 'release':
                queries.push({
                    property: 'Release',
                    value: this.timebox ? this.timebox.get('_ref') : null
                });
                break;
            case 'iteration':
                if (this.timebox) {
                    queries.push({
                        property: 'UserStories.Iteration.Name',
                        value: this.timebox.get('Name')
                    });
                    queries.push({
                        property: 'UserStories.Iteration.StartDate',
                        value: this.timebox.get('StartDate')
                    });
                    queries.push({
                        property: 'UserStories.Iteration.EndDate',
                        value: this.timebox.get('EndDate')
                    });
                }
                else {
                    queries.push({
                        property: 'UserStories.Iteration',
                        value: null
                    });
                }
                break;
            case 'milestone':
                queries.push({
                    property: 'Milestones.ObjectID',
                    value: this.timebox ? this.timebox.get('ObjectID') : null
                });
                break;
            default:
                break;
        }

        let filters = await this._getAncestorAndMultiFilters();
        if (filters) {
            queries = queries.concat(filters);
        }

        if (this.getSetting('query')) {
            queries = queries.concat(Rally.data.QueryFilter.fromQueryString(this.getSetting('query')));
        }

        if (this.featureDependencyFilters) {
            queries = queries.concat(this.featureDependencyFilters);
        }

        return queries;
    },

    _updateIterationsStore: async function () {
        let filter = Rally.data.wsapi.Filter.and([{
            property: 'EndDate',
            operator: '>=',
            value: this.timeboxStart
        }, {
            property: 'StartDate',
            operator: '<=',
            value: this.timeboxEnd
        }]);
        this.iterationsStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'Iteration',
            fetch: ['Name', 'StartDate', 'EndDate'],
            autoLoad: false,
            filters: filter,
            context: this.getContext().getDataContext(),
            pageSize: 4000
        });
        let iterations = await this.iterationsStore.load();
        return iterations;
    },

    _getAncestorAndMultiFilters: async function () {
        let filters = [];
        if (this.ancestorFilterPlugin) {
            filters = await this.ancestorFilterPlugin.getAllFiltersForType(this.lowestPiTypePath, true).catch((e) => {
                Rally.ui.notify.Notifier.showError({ message: (e.message || e) });
                this.loadingFailed = true;
            });
        }
        return filters;
    },

    _addPisGrid: function (store) {
        let gridArea = this.down('#grid-area');
        let currentModelName = this.modelNames[0];
        let allProjectsContext = this.getContext().getDataContext();
        allProjectsContext.project = null;
        let gridExporter = Ext.create('TsExportGrid', {
            model: this.lowestPiTypePath,
            gridId: 'pisGrid',
            context: this.getContext(),
            dataContext: this.currentDataContext,
            portfolioItemTypes: this.portfolioItemTypes,
        });
        this.grid = gridArea.add({
            xtype: 'rallygridboard',
            id: 'pisGrid',
            context: this.getContext(),
            modelNames: this.modelNames,
            toggleState: 'grid',
            height: gridArea.getHeight(),
            listeners: {
                scope: this,
                viewchange: this._update,
                load: function (grid) {
                    // Prevent a reload of the board when expanding a Feature in the Grid to show it's children
                    if (this.expandingRow) {
                        this.expandingRow = false;
                    }
                    else {
                        this._onGridLoad(grid);
                    }
                }
            },
            plugins: [{
                ptype: 'rallygridboardinlinefiltercontrol',
                inlineFilterButtonConfig: {
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('CA.releaseTrackingWithFiltersNewFilters'),
                    hidden: true,
                    modelNames: this.modelNames,
                    inlineFilterPanelConfig: {
                        quickFilterPanelConfig: {
                            dataContext: allProjectsContext,
                            portfolioItemTypes: this.portfolioItemTypes,
                            modelName: this.lowestPiTypePath,
                            whiteListFields: ['Tags', 'Milestones', 'c_EnterpriseApprovalEA', 'c_EAEpic']
                        }
                    }
                }
            },
            {
                ptype: 'rallygridboardfieldpicker',
                headerPosition: 'left',
                margin: '0 9 0 9',
                modelNames: this.modelNames,
                stateful: true,
                stateId: this.getModelScopedStateId(currentModelName, 'fields'),
            },
            {
                ptype: 'rallygridboardactionsmenu',
                menuItems: gridExporter.getExportMenuItems(),
                buttonConfig: {
                    iconCls: 'icon-export'
                }
            },
            ],
            gridConfig: {
                shouldShowRowActionsColumn: false,
                enableBulkEdit: false,
                enableEditing: false,
                enableColumnMove: false,
                enableInlineAdd: false,
                enableRanking: true,
                allowDeselect: true,
                store: store,
                storeConfig: {
                    context: this.currentDataContext,
                    filters: this.currentPiQueries,
                    fetch: true,
                    enablePostGet: true,
                    pageSize: 2000,
                    limit: Infinity
                },
                selModel: {
                    selType: 'rallyrowmodel',
                    selectionMode: 'MULTI'
                },
                columnCfgs: [{
                    dataIndex: 'FormattedID',
                    text: 'ID'
                }, {
                    dataIndex: 'Name',
                    text: 'Name'
                }],
                listeners: {
                    scope: this,
                    selectionchange: function (grid, selected) {
                        this._onPiSelected(selected);
                    },
                    beforeselect: function (grid, record) {
                        if (record.get('_type') !== this.lowestPiTypePath.toLowerCase()) {
                            return false;
                        }
                        return true;
                    }
                }
            }
        });
    },

    _onGridLoad: function (grid) {
        let store = grid.getGridOrBoard().getStore();
        let root = store.getRootNode();

        if (grid.down('rallyleftright')) {
            grid.down('rallyleftright').insert(1, this.dependencyFilterBtn);
        }
        else {
            grid.insert(0, this.dependencyFilterBtn);
        }

        if (root.childNodes && root.childNodes.length) {
            let oids = _.map(root.childNodes, function (pi) {
                return pi.get('ObjectID');
            }, this).join(',');

            // Performance may be better by using 'in' instead of a collection of ORs
            let query = Ext.create('Rally.data.wsapi.Filter', {
                property: this.lowestPiTypeName + '.ObjectID',
                operator: 'in',
                value: oids
            });

            this.storiesFilter = query;
        }
        else {
            // If there are no PIs, then explicitly filter out all stories
            this.storiesFilter = Rally.data.wsapi.Filter.and({
                property: 'ObjectID',
                value: 0
            });
        }

        // Only consider direct Feature children (not nested stories)
        this.storiesFilter = this.storiesFilter.and({
            property: 'Parent',
            value: null
        });

        if (this.down('#onlyStoriesWithDependenciesCheckbox').getValue()) {
            let storyDepQuery = Ext.create('Rally.data.wsapi.Filter', {
                property: 'Predecessors.ObjectID',
                operator: '!=',
                value: null
            });

            storyDepQuery = storyDepQuery.or(Ext.create('Rally.data.wsapi.Filter', {
                property: 'Successors.ObjectID',
                operator: '!=',
                value: null
            }));

            this.storiesFilter = this.storiesFilter.and(storyDepQuery);
        }

        let boardPromise = this._addPisBoard(this.storiesFilter, this.currentIterations).then({
            scope: this,
            success: this.onAddPisBoardSuccess
        });
        return boardPromise;
    },

    onAddPisBoardSuccess: function (board) {
        if (this.down('#cardTypeCombo').getValue() === 'Stories') {
            this.buckets = {};
            let cards = board.getCards();
            for (let c of cards) {
                this.buckets[c.getRecord().get('ObjectID')] = c;
            }
        }

        for (let def of board.rowDefinitions) {
            def.on('collapse', this.onCardboardResize, this);
            def.on('expand', this.onCardboardResize, this);
        }

        if (this._shouldShowStoryDependencies()) {
            this.down('#dependencyFiltersContainer').show();
            this.showAllStoryDependencyLines();
        }
        else {
            this.setLoading(false);
        }

        this._onResize();
    },

    _onPiSelected: function (items) {
        let filter = this.storiesFilter;

        if (items.length) {
            filter = this.storiesFilter.and(Rally.data.wsapi.Filter({
                property: this.lowestPiTypeName,
                operator: 'in',
                value: _.map(items, r => r.get('_ref'))
            }));
        }
        this.buckets = {};
        this.board.refresh({
            storeConfig: {
                filters: filter,
                fetch: [this.lowestPiTypeName].concat(Constants.STORIES_FETCH),
                groupField: this.lowestPiTypeName,
                context: this.currentDataContext,
                enablePostGet: true,
                pageSize: 2000,
                limit: Infinity
            }
        });
    },

    _getSelectedPiFilter: function () {
        let filter = null;
        let grid = this.grid && this.grid.getGridOrBoard();
        let items = grid.selModel && grid.selModel.selected && grid.selModel.selected.items;

        if (items && items.length) {
            filter = Ext.create('Rally.data.wsapi.Filter', {
                property: this.lowestPiTypeName,
                operator: 'in',
                value: _.map(items, r => r.get('_ref'))
            });
        }
        return filter;
    },

    _addPisBoard: function (filter, iterations) {
        let boardDeferred = Ext.create('Deft.Deferred');
        let boardArea = this.down('#board-area');
        boardArea.removeAll();

        this.buckets = {};

        let piFilter = this._getSelectedPiFilter();

        if (piFilter) {
            filter = filter.and(piFilter);
        }

        // Create a column for each iteration shared by the projects
        let endDateSorted = _.sortBy(iterations, function (i) {
            return i.get('EndDate');
        });
        let uniqueIterations = _.unique(endDateSorted, function (i) {
            return this._getIterationKey(i);
        }, this);

        let columns = _.map(uniqueIterations, function (iteration) {
            let startDate = iteration.get('StartDate').toLocaleDateString();
            let endDate = iteration.get('EndDate').toLocaleDateString();
            let headerTemplate = new Ext.XTemplate('<div class="iteration-name">{name}</div><div class="iteration-dates">{start} - {end}</dev>').apply({
                name: iteration.get('Name'),
                start: startDate,
                end: endDate
            });
            return {
                xtype: 'rallycardboardcolumn',
                columnHeaderConfig: {
                    headerTpl: headerTemplate,
                    cls: 'cardboard-column-header'
                },
                fields: [this.lowestPiTypeName],
                value: iteration.get('_ref'), // AM TODO, needed to add this, but will it affect dragging and dropping cards?
                additionalFetchFields: Constants.STORIES_FETCH,
                getStoreFilter: function () {
                    // Don't return this column 'value' as a filter
                    return [{
                        property: 'Iteration.StartDate',
                        value: iteration.get('StartDate')
                    },
                    {
                        property: 'Iteration.EndDate',
                        value: iteration.get('EndDate')
                    }
                    ];
                },
                isMatchingRecord: function () {
                    return true;
                }
            };
        }, this);
        // Add a column for unscheduled stories
        columns.push({
            xtype: 'rallycardboardcolumn',
            value: null,
            columnHeaderConfig: {
                headerTpl: Constants.UNSCHEDULED
            },
            fields: [this.lowestPiTypeName],
            additionalFetchFields: Constants.STORIES_FETCH
        });

        this.board = boardArea.add({
            xtype: 'rallycardboard',
            height: this.down('#board-area').getHeight(),
            itemId: 'releaseCardboard',
            type: ['HierarchicalRequirement'],
            plugins: [{ ptype: 'rallyfixedheadercardboard' }],
            attribute: 'Iteration',
            overflowY: 'hidden',
            storeConfig: {
                filters: filter,
                fetch: [this.lowestPiTypeName].concat(Constants.STORIES_FETCH),
                groupField: this.lowestPiTypeName,
                context: this.currentDataContext,
                enablePostGet: true,
                pageSize: 2000,
                limit: Infinity
            },
            listeners: {
                scope: this,
                load: function (board) {
                    // On first load boardDeferred will be pending, but when clicking on a feature
                    // in the grid to filter the board, the store will refresh and boardDeferred will
                    // be resolved. In that case just continue to onAddPisBoardSuccess
                    if (boardDeferred.state !== 'resolved') {
                        boardDeferred.resolve(board);
                    }
                    else {
                        this.onAddPisBoardSuccess(board);
                    }
                }
            },
            rowConfig: {
                field: this.down('#swimlaneCombo').getValue() || 'Project',
                sortField: this.down('#swimlaneCombo').getValue() === 'Feature' ? 'DragAndDropRank' : null,
                enableCrossRowDragging: false
            },
            columns: columns,
            cardConfig: this.getCardConfig()
        });
        return boardDeferred.promise;
    },

    getCardConfig: function () {
        if (this.down('#cardTypeCombo').getValue() === 'Stories') {
            return {
                fields: ['ScheduleState', 'Feature', 'Project', 'PredecessorsAndSuccessors']
            };
            // let config = {};
            // if (this.down('#swimlaneCombo').getValue() === 'Project') {
            //     config.fields = ['Feature'];
            // }
            // else {
            //     config.fields = ['Project'];
            // }
            // return config;
        }

        return {
            xtype: 'storyfeaturecard',
            lowestPiTypeName: this.lowestPiTypeName,
            draggable: false,
            isHiddenFunc: this._isCardHidden.bind(this),
            getFeature: function (card) {
                let story = card.getRecord();
                let featureRef = story.get(this.lowestPiTypeName);
                let feature = this.piStore.getById(featureRef);
                return feature;
            }.bind(this),
            getAllFeatureStories: function (card) {
                let cards = this._getCardsForCard(card);
                return _.map(cards, function (card) {
                    return card.getRecord();
                });
            }.bind(this),
            getVisibleCard: function (card) {
                let cards = this._getCardsForCard(card);
                return cards[0];
            }.bind(this),
            listeners: {
                scope: this,
                fieldclick: function (fieldName, card) {
                    let depIcon = card.el.down('.FeatureStoriesPredecessorsAndSuccessors');
                    let cancelIcon = card.el.down('.FeatureStoriesPredecessorsAndSuccessorsCancel');

                    if (fieldName === 'FeaturePredecessorsAndSuccessors') {
                        // Show feature to feature dependencies?
                    }
                    else if (fieldName === 'FeatureStoriesPredecessorsAndSuccessors') {
                        if (depIcon && cancelIcon) {
                            depIcon.setStyle('display', 'none');
                            cancelIcon.setStyle('display', 'inline');
                        }

                        if (this.previousDepIcon && this.previousDepIcon !== depIcon) {
                            this.previousDepIcon.setStyle('display', 'inline');
                            this.previousCancelIcon.setStyle('display', 'none');
                        }

                        this.showStoryDependencyLinesForCard(card);
                    }
                    else if (fieldName === 'FeatureStoriesPredecessorsAndSuccessorsCancel') {
                        if (depIcon && cancelIcon) {
                            depIcon.setStyle('display', 'inline');
                            cancelIcon.setStyle('display', 'none');
                        }

                        if (this.previousDepIcon && this.previousDepIcon !== depIcon) {
                            this.previousDepIcon.setStyle('display', 'inline');
                            this.previousCancelIcon.setStyle('display', 'none');
                        }

                        if (this._shouldShowStoryDependencies()) {
                            this.showAllStoryDependencyLines();
                        }
                        else {
                            this.removeDependencyLines();
                        }
                    }
                    this.previousDepIcon = depIcon;
                    this.previousCancelIcon = cancelIcon;
                },
                story: function (card) {
                    // TODO (tj) move into StoryFeatureCard
                    let story = card.getRecord();
                    let featureRef = story.get(this.lowestPiTypeName);
                    let feature = this.piStore.getById(featureRef);
                    let context = this.getContext().getDataContext();
                    context.project = story.get('Project')._ref;
                    let iteration = story.get('Iteration');
                    let filters = [];
                    if (iteration) {
                        filters = [{
                            property: 'Iteration.Name',
                            value: iteration.Name
                        }, {
                            property: 'Iteration.StartDate',
                            value: iteration.StartDate
                        }, {
                            property: 'Iteration.EndDate',
                            value: iteration.EndDate
                        }];
                    }
                    else {
                        filters = [{
                            property: 'Iteration',
                            value: null
                        }];
                    }
                    filters.push({
                        property: 'Project',
                        value: context.project
                    });
                    Rally.ui.popover.PopoverFactory.bake({
                        field: 'UserStory',
                        record: feature,
                        target: card.getEl(),
                        context: context,
                        // header: {
                        //     title: 'test'
                        // },
                        listViewConfig: {
                            gridConfig: {
                                storeConfig: {
                                    filters: filters,
                                    context: context,
                                    enablePostGet: true
                                },
                                columnCfgs: Constants.STORY_COLUMNS,
                            }
                        },
                        listeners: {
                            scope: this,
                            afterrender: function (popover) {
                                popover.down('rallyleftright').insert(0, Ext.create('Ext.container.Container', {
                                    cls: 'story-popover-feature-text',
                                    html: `<b>${popover.record.get('FormattedID')}:</b> ${popover.record.get('Name')}`
                                }))
                            }
                        }
                    });
                },
            }
        }
    },

    _dependencyfilterchange: function (filters) {
        this.featureDependencyFilters = filters;

        if (this.down('#pisGrid') && this.down('#pisGrid').getGridOrBoard()) {
            this._update();
        }
    },

    _dependencyfilterstateapplied: function (filters) {
        this.featureDependencyFilters = filters;
    },

    // TODO: Determine if this functionality is needed
    // showLines: async function () {
    //     let lines = [];
    //     this.removeDependencyLines();
    //     this.setLoading('Drawing Lines');

    //     if (this.down('#linesBetweenSiblingsCheckbox').getValue()) {
    //         lines = lines.concat(this.getStorySiblingLines());
    //     }

    //     this.drawDependencies(lines);

    //     this.setLoading(false);
    // },

    // TODO: Determine if this functionality is needed
    // getStorySiblingLines: function () {
    //     let board = this.down('#releaseCardboard');
    //     let isStoryCards = this.down('#cardTypeCombo').getValue() === 'Stories';
    //     let featureHash = {};
    //     let lines = [];

    //     if (board && isStoryCards) {
    //         let cards = board.getCards();

    //         for (let card of cards) {
    //             let story = card.getRecord();

    //             if (story.get('Feature')) {
    //                 let id = story.get('Feature').ObjectID;
    //                 if (!featureHash[id]) {
    //                     featureHash[id] = [];
    //                 }
    //                 featureHash[id].push(card);
    //             }
    //         }

    //         for (let featureId in featureHash) {
    //             let currentCards = featureHash[featureId];
    //             for (let i = 0; i < currentCards.length - 1; i++) {
    //                 let card = currentCards[i];
    //                 for (let j = i + 1; j < currentCards.length; j++) {
    //                     let line = this.generateStoryLine(card, currentCards[j]);
    //                     if (line) { lines.push(line); }

    //                 }
    //             }
    //         }
    //     }

    //     return lines;
    // },

    showAllStoryDependencyLines: function () {
        let def = Ext.create('Deft.Deferred');
        let board = this.down('#releaseCardboard');
        let isFeatureCards = this.down('#cardTypeCombo').getValue() === 'Features';

        if (board) {
            this.removeDependencyLines();

            this.setLoading('Drawing Dependencies');
            let cards = board.getCards();

            this.getAllStoryPredecessors(cards).then({
                scope: this,
                success: function (storyPredObjArray) {
                    if (storyPredObjArray.length) {
                        let lines = [];

                        _.each(storyPredObjArray, function (storyPredObj) {
                            let successorCard = isFeatureCards ? storyPredObj.card.getVisibleCard(storyPredObj.card) : storyPredObj.card;

                            _.each(storyPredObj.predecessors, function (pred) {
                                if (isFeatureCards) {
                                    let key = this._getRecordBucketKey(pred);
                                    if (this.buckets.hasOwnProperty(key)) {
                                        let predecessorCard = this.buckets[key][0];

                                        // Skip self-dependencies
                                        if (predecessorCard === successorCard) {
                                            return;
                                        }

                                        lines = lines.concat(this.generateDependencyLine(predecessorCard, successorCard));
                                    }
                                }
                                else {
                                    let predecessorCard = this.buckets[pred.get('ObjectID')];

                                    if (predecessorCard && predecessorCard !== successorCard) {
                                        lines = lines.concat(this.generateDependencyLine(predecessorCard, successorCard));
                                    }
                                }
                            }, this);
                        }, this);

                        this.drawDependencies(lines);
                    }

                    this.setLoading(false);
                    def.resolve();
                },
                failure: function () {
                    Rally.ui.notify.Notifier.showError({ message: 'Failed to add dependency lines for user stories' });
                    this.setLoading(false);
                    def.resolve();
                }
            });

        }
        else {
            def.resolve();
        }

        return def.promise;
    },

    showStoryDependencyLinesForCard: function (clickedCard) {
        let items = [];
        this.removeDependencyLines();

        // Get list of all cards for this card (1 for each story for this feature + iteration + project)
        let cards = this._getCardsForCard(clickedCard);

        let promises = _.map(cards, function (item) {
            let story = item.getRecord();

            let promise = this.getPredecessorsAndSuccessors(story).then({
                scope: this,
                success: function (predecessorsSuccessors) {
                    _.each(predecessorsSuccessors[0], function (predecessor) {
                        let key = this._getRecordBucketKey(predecessor);
                        if (this.buckets.hasOwnProperty(key)) {
                            let visibleCard = this.buckets[key][0];

                            // Skip self-dependencies
                            if (visibleCard === clickedCard) {
                                return;
                            }

                            items = items.concat(this.generateDependencyLine(visibleCard, clickedCard));
                        }
                    }, this);

                    _.each(predecessorsSuccessors[1], function (successor) {
                        let key = this._getRecordBucketKey(successor);
                        if (this.buckets.hasOwnProperty(key)) {
                            let visibleCard = this.buckets[key][0];

                            // Skip self-dependencies
                            if (visibleCard === clickedCard) {
                                return;
                            }

                            items = items.concat(this.generateDependencyLine(clickedCard, visibleCard));
                        }
                    }, this);
                }
            });

            return promise;
        }, this);

        Deft.promise.Promise.all(promises).then({
            scope: this,
            success: function () {
                this.drawDependencies(items);
            }
        });
    },

    // TODO: Determine if this functionality is needed
    // generateStoryLine: function (card1, card2) {
    //     // If a project swimlane is collapsed, the card isn't hidden, but it's coordinates will be 0,0
    //     if (!card1.getY() || !card2.getY()) {
    //         return null;
    //     }

    //     let stroke = 'black';
    //     let card1Height = card1.getHeight();
    //     let cardWidth = card1.getWidth();
    //     let card1X = card1.getX();
    //     let card1Y = card1.getY();
    //     let card2Height = card2.getHeight();
    //     let card2X = card2.getX();
    //     let card2Y = card2.getY();
    //     let rightAreaEl = this.down('#right-area').getEl();
    //     let rightAreaScroll = rightAreaEl.getScroll();
    //     let boardArea = this.down('#board-area');
    //     let boardAreaScroll = boardArea.getEl().getScroll();
    //     let boardAreaButtons = boardArea.getEl().dom.getElementsByClassName('rui-leftright');
    //     let buttonAreaHeight = (boardAreaButtons && boardAreaButtons.length) ? boardAreaButtons[0].getBoundingClientRect().height : 0;
    //     let cbBody = this.getCardboardBody();
    //     let xOffset = -boardArea.getX() + boardArea.getEl().getMargin().left + boardAreaScroll.left + cbBody.getScrollLeft();
    //     let yOffset = -rightAreaEl.getY() + rightAreaScroll.top + boardAreaScroll.top + cbBody.getScrollTop() - buttonAreaHeight + 8;

    //     if (card1Y === card2Y) {
    //         card1Y += yOffset;
    //         card2Y += yOffset;
    //     }
    //     else if (card1Y > card2Y) {
    //         card1Y += yOffset;
    //         card2Y += yOffset + card2Height;
    //     }
    //     else {
    //         card1Y += yOffset + card1Height;
    //         card2Y += yOffset;
    //     }

    //     if (card1X === card2X) {
    //         card1X += xOffset;
    //         card2X += xOffset;
    //     }
    //     else if (card1X > card2X) {
    //         card1X += xOffset;
    //         card2X += xOffset + cardWidth;
    //     }
    //     else {
    //         card1X += xOffset + cardWidth;
    //         card2X += xOffset;
    //     }

    //     return {
    //         type: "path",
    //         path: card1Y === card2Y ?
    //             `M${card1X},${card1Y} C${card1X},${card1Y - 10} ${card2X},${card2Y - 10} ${card2X},${card2Y}`
    //             :
    //             `M${card1X},${card1Y} C${card1X + 25},${(card1Y + (card2Y - card1Y) / 8)} ${card2X - 25},${(card2Y - (card2Y - card1Y) / 8)} ${card2X},${card2Y}`,
    //         fill: "transparent",
    //         stroke,
    //         "stroke-width": "1"
    //     };
    // },

    generateDependencyLine: function (predecessorCard, successorCard) {
        // If a project swimlane is collapsed, the card isn't hidden, but it's coordinates will be 0,0
        if (!predecessorCard.getY() || !successorCard.getY()) {
            return [];
        }

        let items = [];
        let angle = 0;
        let stroke = "grey"; // "#D1D1D1";
        let circleRadius = 3;
        let predCardHeight = predecessorCard.getHeight();
        let succCardHeight = successorCard.getHeight();
        let cardWidth = predecessorCard.getWidth();
        let predX = predecessorCard.getX();
        let predY = predecessorCard.getY();
        let succX = successorCard.getX();
        let succY = successorCard.getY();
        let rightAreaEl = this.down('#right-area').getEl();
        let rightAreaScroll = rightAreaEl.getScroll();
        let boardArea = this.down('#board-area');
        let boardAreaScroll = boardArea.getEl().getScroll();
        let boardAreaButtons = boardArea.getEl().dom.getElementsByClassName('rui-leftright');
        let buttonAreaHeight = (boardAreaButtons && boardAreaButtons.length) ? boardAreaButtons[0].getBoundingClientRect().height : 0;
        let cbBody = this.getCardboardBody();

        // Yellow line if the dependencies are in the same iteration
        if (predX === succX) {
            if (this._shouldShowStoryDependencies() && !this.down('#yellowLineFilter').getValue()) {
                return [];
            }
            stroke = "#FAD200";
        }
        // Red line if:
        //     - The predecessor is scheduled for an iteration after the successor's scheduled iteration
        //     OR
        //     - The successor is scheduled for an iteration but the predecessor is not
        else if ((predX > succX) || (!predecessorCard.record.get('Iteration') && successorCard.record.get('Iteration'))) {
            if (this._shouldShowStoryDependencies() && !this.down('#redLineFilter').getValue()) {
                return [];
            }
            stroke = "#F66349";
        }
        else if (this._shouldShowStoryDependencies() && !this.down('#greyLineFilter').getValue()) {
            return [];
        }

        let xOffset = -boardArea.getX() + boardArea.getEl().getMargin().left + boardAreaScroll.left + cbBody.getScrollLeft();
        let yOffset = -rightAreaEl.getY() + rightAreaScroll.top + boardAreaScroll.top + cbBody.getScrollTop() - buttonAreaHeight + 9;

        if (predY === succY) {
            predY += predCardHeight / 2 + yOffset;
            succY += succCardHeight / 2 + yOffset;
        }
        else if (predY > succY) {
            succY += succCardHeight + yOffset;
            predY += yOffset - 4;
            angle = -60;
        }
        else {
            predY += predCardHeight + yOffset;
            succY += yOffset - 4;
            angle = 60;
        }

        predX += cardWidth + circleRadius + xOffset;
        succX += xOffset - circleRadius;

        // Dashed line connecting dependencies
        items.push({
            type: "path",
            path: predY === succY ?
                `M${predX},${predY} C${predX},${predY - 10} ${succX},${succY - 10} ${succX},${succY}`
                :
                `M${predX + 1.5},${predY} C${predX + 50},${(predY + (succY - predY) / 8)} ${succX - 50},${(succY - (succY - predY) / 8)} ${succX - 1.5},${succY}`,
            fill: "transparent",
            stroke,
            "stroke-width": "1"
        });

        // Circle from predecessor
        items.push({
            type: "circle",
            stroke,
            fill: "#f6f6f6",
            "stroke-width": "2",
            radius: circleRadius,
            x: predX,
            y: predY
        });

        // Arrow pointing to successor

        let arrow = Ext.create('Ext.draw.Sprite', {
            type: "path",
            fill: '#f6f6f6',
            stroke,
            "stroke-width": "2",
            transformText: Ext.String.format("rotate(35 {0} {1})",
                succX, succY
            ),
            path: Ext.String.format("M {0} {1} L {2} {3} L {4} {5} z",
                succX,
                succY - circleRadius,
                succX + (circleRadius * 2),
                succY,
                succX,
                succY + circleRadius,
            )
        });

        // let angle = Math.atan2(predY - succY, predX - succX) * 180 / Math.PI;
        // if (angle < 0) {
        //     angle += 360;
        // }
        arrow.setAttributes({
            rotate: {
                degrees: angle
            }
        }, false);

        items.push(arrow);

        return items;
    },

    getAllStoryPredecessors: function (cards) {
        let def = Ext.create('Deft.Deferred');
        let isFeatureCards = this.down('#cardTypeCombo').getValue() === 'Features';

        if (cards.length) {
            let promises = [];

            for (let card of cards) {
                let storyCards = isFeatureCards ? this._getCardsForCard(card) : [card];

                _.each(storyCards, function (item) {
                    let story = item.getRecord();

                    if (story.get('Predecessors').Count) {
                        promises.push(this.getPredecessorsForRecord(story, [this.lowestPiTypeName].concat(Constants.STORIES_FETCH)).then({
                            success: function (predecessors) {
                                return { card: item, predecessors };
                            }
                        }));
                    }
                }, this);
            }

            if (!promises.length) {
                def.resolve([]);
            }

            Deft.promise.Promise.all(promises).then({
                scope: this,
                success: function (preds) {
                    def.resolve(preds);
                },
                failure: function (e) {
                    console.log(e);
                    def.reject();
                }
            });
        }
        else {
            def.resolve([]);
        }

        return def.promise;
    },

    getPredecessorsForRecord: function (record, fetch) {
        let filters = [{ property: 'Feature', operator: '!=', value: null }];

        return record.getCollection('Predecessors', { fetch, filters }).load().then({
            scope: this,
            success: function (predecessors) {
                return predecessors;
            }
        });
    },

    getSuccessorsForRecord: function (record, fetch) {
        let filters = [{ property: 'Feature', operator: '!=', value: null }];

        return record.getCollection('Successors', { fetch, filters }).load().then({
            scope: this,
            success: function (successors) {
                return successors;
            }
        });
    },

    getPredecessorsAndSuccessors: function (record) {
        let fetch = [this.lowestPiTypeName].concat(Constants.STORIES_FETCH);

        let predecessorsPromise = this.getPredecessorsForRecord(record, fetch);
        let successorsPromise = this.getSuccessorsForRecord(record, fetch);

        return Deft.promise.Promise.all([predecessorsPromise, successorsPromise]);
    },

    drawDependencies: function (items) {
        let cbHeader = this.getCardboardHeader();
        let cbBody = this.getCardboardBody();
        let yOffset = -cbHeader.getHeight() - 120;
        let xOffset = -20;

        this.drawComponent = Ext.create('Ext.draw.Component', {
            renderTo: cbBody,
            style: Ext.String.format('position:absolute; top:{0}px; left:{1}px;z-index:1000;pointer-events:none', yOffset, xOffset),
            itemId: 'dependencies',
            id: 'dep',
            viewBox: false,
            floating: false,
            height: cbBody.dom.firstElementChild.clientHeight + 200,
            width: cbBody.getWidth() + 40,
            items: items
        });
    },

    getCardboardBody: function () {
        return this.board && this.board.getEl().down('.fixed-header-card-board-body-container');
    },

    getCardboardHeader: function () {
        return this.board && this.board.getEl().down('.fixed-header-card-board-header-container');
    },

    _getCardBucketKey: function (card) {
        let record = card.getRecord();
        return this._getRecordBucketKey(record);
    },

    _getRecordBucketKey: function (record) {
        let iterationKey = this._getIterationKey(record.get('Iteration'));
        let projectId = record.get('Project').ObjectID;
        let featureId = record.get('Feature').ObjectID;
        return [featureId, projectId, iterationKey].join('-');
    },

    _getIterationKey: function (iteration) {
        let result = '';
        if (iteration) {
            if (iteration.get) {
                result = iteration.get('Name') + iteration.get('StartDate').toISOString() + iteration.get('EndDate').toISOString();
            }
            else {
                result = iteration.Name + iteration.StartDate + iteration.EndDate;
            }
        }
        return result;
    },


    _isCardHidden: function (card) {
        let result = false;
        let key = this._getCardBucketKey(card);
        if (this.buckets.hasOwnProperty(key)) {
            this.buckets[key].push(card);
            result = true;
        }
        else {
            this.buckets[key] = [card];
        }
        return result;
    },

    _getCardsForCard: function (card) {
        let key = this._getCardBucketKey(card);
        let result = this.buckets[key];

        return result;
    },

    getModelScopedStateId: function (modelName, id) {
        return this.getContext().getScopedStateId(modelName + '-' + id);
    },

    getSettingsFields: function () {
        return [
            {
                xtype: 'textarea',
                fieldLabel: 'Feature Query',
                name: 'query',
                anchor: '100%',
                cls: 'query-field',
                margin: '0 70 0 0',
                plugins: [
                    {
                        ptype: 'rallyhelpfield',
                        helpId: 194
                    },
                    'rallyfieldvalidationui'
                ],
                validateOnBlur: false,
                validateOnChange: false,
                validator: function (value) {
                    try {
                        if (value) {
                            Rally.data.wsapi.Filter.fromQueryString(value);
                        }
                        return true;
                    } catch (e) {
                        return e.message;
                    }
                }
            }
        ];
    },

    searchAllProjects: function () {
        return this.ancestorFilterPlugin.getIgnoreProjectScope();
    },

    onCardboardResize: function () {
        let board = this.down('#releaseCardboard');

        if (board) {
            this.removeDependencyLines();

            if (this.previousCancelIcon) {
                this.previousDepIcon.setStyle('display', 'inline');
                this.previousCancelIcon.setStyle('display', 'none');
                this.previousDepIcon = null;
                this.previousCancelIcon = null;
            }

            if (this._shouldShowStoryDependencies()) {
                // With many dependencies drawn, the loading mask doesn't properly display
                // and it looks like the app freezes... Not an ideal user experience.
                // A timeout helps everything render properly before redrawing the dependencies
                setTimeout(() => {
                    this.showAllStoryDependencyLines().then({
                        scope: this,
                        success: function () {
                            this.setLoading(false);
                        }
                    });
                }, 500);
            }
        }
    },

    removeDependencyLines: function () {
        if (this.drawComponent) {
            Ext.destroy(this.drawComponent);
        }
    },

    _shouldShowStoryDependencies: function () {
        return this.down('#storyDependencyCheckbox').getValue();
    },

    onTimeboxScopeChange: function (newTimeboxScope) {
        this.callParent(arguments);
        this._onTimeboxScopeChange(newTimeboxScope);
        this._update();
    },

    _onTimeboxScopeChange: function (timeboxScope) {
        if (timeboxScope) {
            this.timeboxType = timeboxScope.getType();
            this.timebox = timeboxScope.getRecord();
            if (this.timeboxType === 'release') {
                this.timeboxStart = this.timebox ? this.timebox.get('ReleaseStartDate') : new Date();
                this.timeboxEnd = this.timebox ? this.timebox.get('ReleaseDate') : new Date();
            }
            else if (this.timeboxType === 'milestone') {
                this.timeboxStart = this.timebox ? this.timebox.get('TargetDate') : new Date();
                this.timeboxEnd = this.timebox ? this.timebox.get('TargetDate') : new Date();
            }
            else if (this.timeboxType === 'iteration') {
                this.timeboxStart = this.timebox ? this.timebox.get('StartDate') : new Date();
                this.timeboxEnd = this.timebox ? this.timebox.get('EndDate') : new Date();
            }
        }
        else {
            this.timeboxStart = new Date();
            this.timeboxEnd = new Date();
        }

        this._updateDateControls();
    },

    _updateDateControls: function () {
        let startDatePicker = this.down('#start-date-picker');
        startDatePicker.suspendEvents();
        startDatePicker.setValue(this.timeboxStart);
        startDatePicker.resumeEvents();
        let endDatePicker = this.down('#end-date-picker');
        endDatePicker.suspendEvents();
        endDatePicker.setValue(this.timeboxEnd);
        endDatePicker.resumeEvents();
    },

    onHelpClicked() {
        CustomAgile.ui.tutorial.ReleaseTrackingTutorial.showWelcomeDialog(this);
    }
});
