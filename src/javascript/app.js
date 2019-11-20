/* global Ext _ Rally Constants Deft Utils */
Ext.define("release-tracking-with-filters", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: 'border',
    items: [{
        id: 'filter-area',
        region: 'north',
        xtype: 'panel',
        minHeight: 290,
        overflowY: 'auto',
        collapsible: true,
        margins: '0 0 10 0',
        header: {
            cls: 'ts-panel-header',
            padding: '0 0 15 0'
        },
        cls: 'grid-area',
        title: 'FILTERS',
        flex: 1,
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
            id: 'date-range-area',
            xtype: 'container',
            layout: 'hbox',
            minWidth: 950,
            minHeight: 60,
            padding: '15 0 15 20',
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

    integrationHeaders: {
        name: "release-tracking-with-filters"
    },

    helpHtml: `
    <h3>Dependency Icons</h3>

    <h4><span class="field-content FeatureStoriesPredecessorsAndSuccessors icon-children"></span> - Story to Story dependencies</h4>
    <h4><span class="field-content FeaturePredecessorsAndSuccessors icon-predecessor"></span> - Feature to Feature dependencies</h4>

    <h3>Show Story Dependency Lines</h3>

    <p>This setting will display lines between cards that have user story dependencies.</p>
    <p>Each line will connect to the predecessor on the right side of the card via a small circle and then
    to the successor on the left side of the card via a triangle.</p>
    
    <br>
    <img src="${this.dependencyExample}" alt="Story Dependency Line Example" style="width:400px;display:block;margin-left:auto;margin-right:auto" />
    <br>
    
    Click on a card's story dependency icon(<span class="field-content FeatureStoriesPredecessorsAndSuccessors icon-children"></span>) 
    to view only dependencies for stories within that feature. An 'x' will replace the dependency icon allowing you to clear the 
    dependencies and reset the view.
    
    <br><br>
    
    <b>Note: Feature to feature dependency information can be viewed by clicking on this icon: </b><span class="field-content FeaturePredecessorsAndSuccessors icon-predecessor"></span>
    <br><br>However, Feature-Feature dependency lines cannot be drawn as this board is a view of stories by iteration and therefore Features are often displayed in the board multiple times each.
    
    <br><br>
    
    The colors indicate the following:
    <ul>
        <li><b><span style="color:grey;">Grey</span>:</b> Successor is scheduled in an iteration after the predecessor</li>
        <li><b><span style="color:#FAD200;">Yellow:</span></b> Predecessor and successor are scheduled in the same iteration</li>
        <li><b><span style="color:#F66349;">Red:</span></b> 
        <ul>
            <li>The predecessor is scheduled in an iteration after the successor</li>
            <li>Or the successor is scheduled in an iteration but it's predecessor is unscheduled</li>
        </ul>
    </ul>
    <br>
    Lines can be displayed or hidden by color using the provided color checkbox filters that appear after selecting the "Show Dependency Lines" option.
    <br><br>
    `,

    launch: function () {
        Rally.data.wsapi.Proxy.superclass.timeout = 120000;
        Ext.tip.QuickTipManager.init();

        Ext.override(Rally.ui.cardboard.CardBoard, {
            getCards: function () {
                let cards = [];
                _.each(this.columnDefinitions, function (column) {
                    cards = cards.concat(column.getCards());
                });
                return cards;
            },
            // fireEvent: function (name) {
            //     console.log(name);
            //     this.callParent(arguments);
            // }
        });

        this.down('#right-area').on('resize', this.onCardboardResize, this);

        let dateRangeArea = this.down('#date-range-area');
        dateRangeArea.add([{
            xtype: 'rallydatefield',
            id: 'start-date-picker',
            fieldLabel: Constants.START_DATE,
            labelWidth: 120,
            labelCls: 'date-label',
            width: 220,
            margin: '0 10 0 0',
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
            labelWidth: 30,
            width: 130,
            labelCls: 'date-label',
            margin: '0 10 0 0',
            listeners: {
                scope: this,
                change: function (cmp, newValue) {
                    this.timeboxEnd = newValue;
                    this._update();
                }
            }
        }, {
            xtype: 'checkbox',
            boxLabel: 'Show Story Dependency Lines (<span class="field-content FeatureStoriesPredecessorsAndSuccessors icon-children"></span>)',
            boxLabelCls: 'date-label dependency-label',
            labelWidth: 180,
            width: 250,
            name: 'dependencies',
            inputValue: true,
            itemId: 'storyDependencyCheckbox',
            cls: 'dependency-checkbox',
            margin: '0 3 0 20',
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
            xtype: 'rallybutton',
            cls: 'customagile-button help',
            iconOnly: true,
            iconCls: 'icon-help',
            handler: (...args) => this.onHelpClicked(...args),
            id: 'storyDependencyHelp',
            margin: '2 15 0 0'
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
            settingsConfig: {},
            whiteListFields: [
                'Tags',
                'Milestones'
            ],
            filtersHidden: false,
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

        this.down('#filter-area').on('collapse', this.onResize, this);
        this.down('#filter-area').on('expand', this.onResize, this);

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

        let gridView = this.down('rallygridboard').getCurrentView();
        let views = Ext.apply(gridView, ancestorData);

        return views;
    },

    setCurrentView: function (view) {
        let app = Rally.getApp();
        this.setLoading('Loading View...');
        Ext.suspendLayouts();
        app.settingView = true;
        if (app.ancestorFilterPlugin) {
            if (app.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl')) {
                app.ancestorFilterPlugin.renderArea.down('#ignoreScopeControl').setValue(view.ignoreProjectScope);
            }
            app.ancestorFilterPlugin.setMultiLevelFilterStates(view.filterStates);
            app.ancestorFilterPlugin._setPiSelector(view.piTypePath, view.pi);
        }
        this.down('rallygridboard').setCurrentView(view);

        setTimeout(async function () {
            Ext.resumeLayouts(true);
            app.settingView = false;
            this.setLoading(false);
            app._update();
        }.bind(this), 400);
    },

    _update: async function () {
        if (this.down('#releaseTrackingSharedViewCombobox')) {
            this.down('#releaseTrackingSharedViewCombobox').setValue(null);
        }
        this.setLoading(true);
        this.currentIterations = await this._updateIterationsStore();
        await this._updatePisStore();

        if (!this.loadingFailed) {
            this._addPisGrid(this.piStore);
        } else {
            this.setLoading(false);
        }
    },

    //setLoading: function (loading) {
    // this.setLoading(loading);
    // this.down('#board-area').setLoading(loading);
    // if (this.grid) {
    //     let treegrid = this.grid.down('rallytreegrid');
    //     if (treegrid) {
    //         treegrid.setLoading(loading);
    //     }
    // }
    // },

    // Usual monkey business to size gridboards
    onResize: function () {
        this.callParent(arguments);
        let gridArea = this.down('#grid-area');
        let grid = this.down('rallygridboard');
        if (gridArea && grid) {
            grid.setHeight(gridArea.getHeight());
        }
        return;
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
            fetch: Constants.FEATURE_FETCH,
            filters: this.currentPiQueries,
            enableHierarchy: true,
            remoteSort: true,
            context: this.currentDataContext,
            enablePostGet: true,
            enableRootLevelPostGet: true,
            clearOnLoad: false

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

        if (this.ancestorFilterPlugin) {
            let filters = await this.ancestorFilterPlugin.getAllFiltersForType(this.lowestPiTypePath, false).catch((e) => {
                Rally.ui.notify.Notifier.showError({ message: (e.message || e) });
                this.loadingFailed = true;
            });

            if (filters) {
                queries = queries.concat(filters);
            }
        }

        if (this.getSetting('query')) {
            queries = queries.concat(Rally.data.QueryFilter.fromQueryString(this.getSetting('query')));
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
            autoLoad: false,
            filters: filter,
            context: this.getContext().getDataContext()
        });
        let iterations = await this.iterationsStore.load();
        return iterations;
    },

    _getDefects: function () {
        // TODO (tj) needed?
    },

    _addPisGrid: function (store) {
        let gridArea = this.down('#grid-area');
        if (gridArea) {
            gridArea.removeAll();
        }
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
                    this._onGridLoad(grid);
                }
            },
            plugins: [{
                ptype: 'rallygridboardinlinefiltercontrol',
                inlineFilterButtonConfig: {
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('CA.releaseTrackingWithFilters'),
                    hidden: true,
                    modelNames: this.modelNames,
                    inlineFilterPanelConfig: {
                        quickFilterPanelConfig: {
                            dataContext: allProjectsContext,
                            portfolioItemTypes: this.portfolioItemTypes,
                            modelName: this.lowestPiTypePath,
                            whiteListFields: [
                                'Tags',
                                'Milestones'
                            ]
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
                store: store,
                storeConfig: {
                    context: this.currentDataContext,
                    filters: this.currentPiQueries,
                    enablePostGet: true,
                    pageSize: 2000,
                    limit: Infinity
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
                    // TODO (tj) support multi item selection
                    /*
                    itemclick: function(grid, record, item, index) {
                        // Ignore clicks on non root items
                        if (record.get('_type') == this.lowestPiTypePath.toLowerCase()) {
                            this._onPiSelected(record);
                        }
                    }
                    */
                }
            }
        });
    },

    _onGridLoad: function (grid) {
        let store = grid.getGridOrBoard().getStore();
        let root = store.getRootNode();

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

        let boardPromise = this._addPisBoard(this.storiesFilter, this.currentIterations).then({
            scope: this,
            success: function (board) {
                for (let def of board.rowDefinitions) {
                    def.on('collapse', this.onCardboardResize, this);
                    def.on('expand', this.onCardboardResize, this);
                }

                if (this._shouldShowStoryDependencies()) {
                    this.showAllStoryDependencyLines();
                }
                else {
                    this.setLoading(false);
                }
            }
        });
        return boardPromise;
    },

    _onPiSelected: function (pi) {
        let filter;
        if (this.selectedPi === pi) {
            // Unselecting the pi
            filter = this.storiesFilter;
            delete this.selectedPi;
        }
        else {
            this.selectedPi = pi;
            filter = Rally.data.wsapi.Filter({
                property: this.lowestPiTypeName,
                operator: '=',
                value: pi.get('_ref')
            });
        }
        this.buckets = {};
        this.board.refresh({
            storeConfig: {
                filters: filter,
                enablePostGet: true,
                pageSize: 2000,
                limit: Infinity
            }
        });
    },

    _addPisBoard: function (filter, iterations) {
        let boardDeferred = Ext.create('Deft.Deferred');
        let boardArea = this.down('#board-area');
        boardArea.removeAll();

        this.buckets = {};

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
            itemId: 'releaseGridboard',
            type: ['HierarchicalRequirement'],
            attribute: 'Iteration',
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
                    boardDeferred.resolve(board);
                }
            },
            rowConfig: {
                field: 'Project',
                enableCrossRowDragging: false
            },
            columns: columns,
            cardConfig: {
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
                            listViewConfig: {
                                gridConfig: {
                                    storeConfig: {
                                        filters: filters,
                                        context: context,
                                        enablePostGet: true
                                    },
                                    columnCfgs: Constants.STORY_COLUMNS,
                                }
                            }
                        });
                    },
                }
            }
        });
        return boardDeferred.promise;
    },

    showAllStoryDependencyLines: function () {
        let def = Ext.create('Deft.Deferred');
        let board = this.down('#releaseGridboard');

        if (board) {
            this.removeDependencyLines();

            this.setLoading('Drawing Dependencies');

            this.getAllStoryPredecessors(board).then({
                scope: this,
                success: function (storyPredObjArray) {
                    if (storyPredObjArray.length) {
                        let lines = [];

                        _.each(storyPredObjArray, function (storyPredObj) {
                            let successorCard = storyPredObj.card.getVisibleCard(storyPredObj.card);

                            _.each(storyPredObj.predecessors, function (pred) {
                                let key = this._getRecordBucketKey(pred);

                                if (this.buckets.hasOwnProperty(key)) {
                                    let predecessorCard = this.buckets[key][0];

                                    // Skip self-dependencies
                                    if (predecessorCard === successorCard) {
                                        return;
                                    }

                                    lines = lines.concat(this.generateDependencyLine(predecessorCard, successorCard));
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

    generateDependencyLine: function (predecessorCard, successorCard) {
        // If a project swimlane is collapsed, the card isn't hidden, but it's coordinates will be 0,0
        if (!predecessorCard.getY() || !successorCard.getY()) {
            return [];
        }

        let items = [];
        let angle = 0;
        let stroke = "grey"; // "#D1D1D1";
        let circleRadius = 3;
        let cardHeight = predecessorCard.getHeight();
        let cardWidth = predecessorCard.getWidth();
        let predX = predecessorCard.getX();
        let predY = predecessorCard.getY();
        let succX = successorCard.getX();
        let succY = successorCard.getY();
        let rightAreaEl = this.down('#right-area').getEl();
        let rightAreaScroll = rightAreaEl.getScroll();
        let boardArea = this.down('#board-area');

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

        let xOffset = -boardArea.getX() + boardArea.getEl().getMargin().left;
        let yOffset = -rightAreaEl.getY() + rightAreaScroll.top;

        if (predY === succY) {
            predY += cardHeight / 2 + yOffset;
            succY += cardHeight / 2 + yOffset;
        }
        else if (predY > succY) {
            succY += cardHeight + yOffset;
            predY += yOffset;
            angle = -60;
        }
        else {
            predY += cardHeight + yOffset;
            succY += yOffset;
            angle = 60;
        }

        predX += cardWidth + circleRadius + xOffset;
        succX += xOffset - circleRadius;

        // Half Circle
        // items.push({
        //     type: "path",
        //     path: Ext.String.format("M{0} {1} A{2},{2} 0 0,0,{0},0",
        //         p.x, p.y, circleRadius
        //     ),
        //     fill: 'grey'
        // });

        // Dashed line connecting dependencies
        items.push({
            type: "path",
            path: Ext.String.format("M{0} {1} L {2} {3}",
                predX, predY, succX, succY,
            ),
            fill: "transparent",
            stroke,
            "stroke-width": "1",
            "stroke-dasharray": "3",
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

    getAllStoryPredecessors: function (board) {
        let def = Ext.create('Deft.Deferred');
        let cards = board.getCards();

        if (cards.length) {
            let promises = [];

            for (let card of cards) {
                let storyCards = this._getCardsForCard(card);

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
                    // let results = _.flatten(preds);
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
        let boardArea = this.down('#board-area');
        let gridboard = this.down('#releaseGridboard');

        this.drawComponent = Ext.create('Ext.draw.Component', {
            style: Ext.String.format('position:absolute; top:{0}px; left:{1}px;z-index:1000;pointer-events:none', 0, 0),
            itemId: 'dependencies',
            id: 'dep',
            viewBox: false,
            floating: false,
            height: gridboard.getHeight(),
            width: gridboard.getWidth() + 40,
            items: items
        });

        boardArea.add(this.drawComponent);
        this.drawComponent.show();
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
        let board = this.down('#releaseGridboard');

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
            this.down('#board-area').remove(this.drawComponent);
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
        const {
            helpTitle, helpDescription, helpUsage, helpNotes
        } = this;

        Ext.create('Rally.ui.dialog.Dialog', {
            autoShow: true,
            layout: 'fit',
            width: '70%',
            height: '90%',
            closable: true,
            autoDestroy: true,
            autoScroll: true,
            title: 'Dependencies',
            items: {
                xtype: 'component',
                html: this.helpHtml,
                padding: 10,
                style: 'font-size:12px;'
            }
        });
    }
});
