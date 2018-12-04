/* global Ext _ Rally Constants Deft Utils */
Ext.define("release-tracking-with-filters", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items: [{
        id: 'controls-area',
        xtype: 'container',
        layout: {
            type: 'hbox'
        }
    }, {
        id: Utils.AncestorPiAppFilter.RENDER_AREA_ID,
        xtype: 'container',
    }, {
        id: 'data-area',
        xtype: 'container',
        flex: 1,
        layout: {
            type: 'hbox',
            align: 'stretch'
        },
        items: [{
            id: 'grid-area',
            xtype: 'container',
            flex: 1,
            type: 'vbox',
            align: 'stretch'
        }, {
            id: 'board-area',
            xtype: 'container',
            flex: 2,
            type: 'vbox',
            align: 'stretch',
            overflowX: 'auto',
            overflowY: 'auto'
        }]
    }],
    config: {
        defaultSettings: {}
    },

    integrationHeaders: {
        name: "release-tracking-with-filters"
    },

    launch: function() {

        // TODO (tj) Add ancestor filter

        var releasePickerDeferred = Ext.create('Deft.Deferred');
        this.down('#controls-area').add({
            xtype: 'rallyreleasecombobox',
            id: 'release-picker',
            fieldLabel: Constants.RELEASE_CONTROL_LABEL,
            labelCls: Constants.RELEASE_CONTROL_LABEL_CLASS,
            valueField: '_ref',
            labelWidth: 150,
            width: 500,
            stateful: true,
            stateId: Rally.getApp().getContext().getScopedStateId('release-picker'),
            listeners: {
                scope: this,
                select: this._onReleaseSelect,
                ready: function(cmp) {
                    this.selectedRelease = cmp.getRecord();
                    releasePickerDeferred.resolve();
                }
            }
        });

        var ancestorFilterDeferred = Ext.create('Deft.Deferred');
        this.ancestorFilterPlugin = Ext.create('Utils.AncestorPiAppFilter', {
            ptype: 'UtilsAncestorPiAppFilter',
            pluginId: 'ancestorFilterPlugin',
            publisher: false, // Publish events to other apps using this plugin
            settingsConfig: {
                labelWidth: 150,
                margin: 10
            },
            listeners: {
                scope: this,
                ready: function(plugin) {
                    // Plugin ready, begin listening for selection changes
                    plugin.addListener({
                        scope: this,
                        select: this._update
                    });
                    ancestorFilterDeferred.resolve();
                },
            }
        });
        // Must add the filter at runtime (instead of in config) to make sure we can
        // catch its ready event.
        this.addPlugin(this.ancestorFilterPlugin);

        var promises = [releasePickerDeferred.promise, ancestorFilterDeferred.promise];

        // Get lowest PI type.
        promises.push(Rally.data.util.PortfolioItemHelper.getPortfolioItemTypes().then({
            scope: this,
            success: function(records) {
                this.lowestPi = records[0];
                this.lowestPiTypePath = this.lowestPi.get('TypePath');
                this.lowestPiTypeName = this.lowestPi.get('Name');
                this.modelNames = [this.lowestPiTypePath];
            }
        }));

        // Wait for lowest pi and release selection, then update
        Deft.promise.Promise.all(promises).then({
            scope: this,
            success: this._update
        });
    },

    _update: function() {
        this.setLoading(true);

        var iterationsPromise = this._updateIterationsStore().then({
            scope: this,
            success: function(iterations) {
                this.currentIterations = iterations;
            },
        });

        var pisPromise = this._updatePisStore().then({
            scope: this,
            success: function(pis) {
                this._addPisGrid(this.piStore);
                var queries = _.map(pis, function(pi) {
                    return {
                        property: this.lowestPiTypeName,
                        operator: '=',
                        value: pi.get('_ref')
                    }
                }, this);
                // If there are no PIs, then explicitly filter out all stories
                this.storiesFilter = Rally.data.wsapi.Filter.or(queries) || [{
                    property: 'ObjectID',
                    value: 0
                }];
            }
        });

        Deft.promise.Promise.all([iterationsPromise, pisPromise]).then({
            scope: this,
            success: function() {
                return this._addPisBoard(this.storiesFilter, this.currentIterations);
            }
        });
    },

    setLoading: function(loading) {
        this.down('#data-area').setLoading(loading);
    },

    _onReleaseSelect: function(cmp) {
        this.selectedRelease = cmp.getRecord();
        this._update();
    },

    // Usual monkey business to size gridboards
    onResize: function() {
        this.callParent(arguments);
        var gridArea = this.down('#grid-area');
        var grid = this.down('rallygridboard');
        if (gridArea && grid) {
            grid.setHeight(gridArea.getHeight())
        }
        var boardArea = this.down('#board-area');
        var board = this.down('rallygridboard');
        if (gridArea && board) {
            board.setHeight(boardArea.getHeight())
        }
    },

    _updatePisStore: function() {
        this.currentPiDataContext = this.getContext().getDataContext();
        if (this.searchAllProjects()) {
            this.currentPiDataContext.project = null;
        }
        this.currentPiQueries = this._getPiQueries();

        return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.lowestPiTypePath],
            autoLoad: false,
            fetch: Constants.FEATURE_FETCH,
            filters: this.currentPiQueries,
            enableHierarchy: true,
            remoteSort: true,
            context: this.currentPiDataContext,
            enablePostGet: true,
            enableRootLevelPostGet: true,
            clearOnLoad: false
        }).then({
            scope: this,
            success: function(store) {
                this.piStore = store;
                return this.piStore.load();
            }
        });
    },

    _getPiQueries: function() {
        var queries = [],
            timeboxScope = this.getContext().getTimeboxScope();

        queries.push({
            property: 'Release',
            value: this.selectedRelease.get('_ref')
        });

        if (timeboxScope && _.any(this.modelNames, timeboxScope.isApplicable, timeboxScope)) {
            queries.push(timeboxScope.getQueryFilter());
        }
        var ancestorFilter = this.ancestorFilterPlugin.getFilterForType(this.modelNames[0]);
        if (ancestorFilter) {
            queries.push(ancestorFilter);
        }
        return queries;
    },

    _updateIterationsStore: function() {
        var filter = Rally.data.wsapi.Filter.and([{
            property: 'EndDate',
            operator: '>',
            value: this.selectedRelease.get('ReleaseStartDate')
        }, {
            property: 'StartDate',
            operator: '<',
            value: this.selectedRelease.get('ReleaseDate')
        }])
        this.iterationsStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'Iteration',
            autoLoad: false,
            filters: filter,
            context: this.getContext().getDataContext()
        });
        return this.iterationsStore.load();
    },

    _getDefects: function() {
        // TODO (tj) needed?
    },

    _addPisGrid: function(store) {
        var gridArea = this.down('#grid-area')
        if (gridArea) {
            gridArea.removeAll();
        }
        var currentModelName = this.modelNames[0];

        this.grid = gridArea.add({
            xtype: 'rallygridboard',
            context: this.getContext(),
            modelNames: this.modelNames,
            toggleState: 'grid',
            height: gridArea.getHeight(),
            listeners: {
                scope: this,
                viewchange: this.viewChange,
            },
            plugins: [{
                    ptype: 'rallygridboardinlinefiltercontrol',
                    inlineFilterButtonConfig: {
                        stateful: true,
                        stateId: this.getModelScopedStateId(currentModelName, 'filters'),
                        modelNames: this.modelNames,
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
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
                    modelNames: this.modelNames,
                    stateful: true,
                    stateId: this.getModelScopedStateId(currentModelName, 'fields'),
                },
                {
                    ptype: 'rallygridboardsharedviewcontrol',
                    sharedViewConfig: {
                        stateful: true,
                        stateId: this.getModelScopedStateId(currentModelName, 'views'),
                        stateEvents: ['select', 'beforedestroy']
                    },
                }
            ],
            gridConfig: {
                store: store,
                storeConfig: {
                    context: this.currentPiDataContext,
                    filters: this.currentPiQueries,
                },
                listeners: {
                    scope: this,
                    itemclick: function(grid, record, item, index) {
                        // Ignore clicks on non root items
                        if (record.get('_type') == this.lowestPiTypePath.toLowerCase()) {
                            this._onPiSelected(record);
                        }
                    }
                }
            }
        });
        this.setLoading(false);
    },

    _onPiSelected: function(pi) {
        var filter;
        if (this.selectedPi == pi) {
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
                filters: filter
            }
        });
    },

    _addPisBoard: function(filter, iterations) {
        var boardArea = this.down('#board-area')
        boardArea.removeAll();

        this.buckets = {};

        var context = this.getContext();
        var dataContext = context.getDataContext();

        // Create a column for each iteration shared by the projects
        var endDateSorted = _.sortBy(iterations, function(i) {
            return i.get('EndDate');
        });
        var uniqueIterations = _.unique(endDateSorted, function(i) {
            return this._getIterationKey(i)
        }, this);

        var columns = _.map(uniqueIterations, function(iteration) {
            return {
                xtype: 'rallycardboardcolumn',
                //value: iteration.get('Name'),
                columnHeaderConfig: {
                    headerTpl: iteration.get('Name')
                },
                fields: ['Feature'],
                additionalFetchFields: Constants.STORIES_FETCH,
                getStoreFilter: function() {
                    // Don't return this column 'value' as a filter
                    return [{
                            property: 'Iteration.Name',
                            value: iteration.get('Name')
                        },
                        {
                            property: 'Iteration.StartDate',
                            value: iteration.get('StartDate')
                        },
                        {
                            property: 'Iteration.EndDate',
                            value: iteration.get('EndDate')
                        }
                    ];
                },
                isMatchingRecord: function(record) {
                    return true;
                }
            }
        }, this);
        // Add a column for unscheduled stories
        columns.push({
            xtype: 'rallycardboardcolumn',
            value: null,
            columnHeaderConfig: {
                headerTpl: Constants.UNSCHEDULED
            },
            fields: ['Feature'],
            additionalFetchFields: Constants.STORIES_FETCH
        })

        this.board = boardArea.add({
            xtype: 'rallycardboard',
            type: ['HierarchicalRequirement'],
            attribute: 'Iteration',
            height: boardArea.getHeight(),
            storeConfig: {
                filters: filter,
                fetch: 'Feature',
                groupField: 'Feature'
            },
            rowConfig: {
                field: 'Project'
            },
            columns: columns,
            cardConfig: {
                xtype: 'storyfeaturecard',
                isHiddenFunc: this._isCardHidden.bind(this)
            }

        })
    },

    _getCardBucketKey: function(card) {
        var record = card.getRecord();
        var iterationId = null;
        var iterationKey = this._getIterationKey(record.get('Iteration'));
        var projectId = record.get('Project').ObjectID;
        var featureId = record.get('Feature').ObjectID;
        return [featureId, projectId, iterationKey].join('-');
    },

    _getIterationKey: function(iteration) {
        var result = '';
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


    _isCardHidden: function(card) {
        var result = false;
        var key = this._getCardBucketKey(card);
        if (this.buckets.hasOwnProperty(key)) {
            result = true;
        }
        else {
            this.buckets[key] = this;
        }
        return result;
    },

    viewChange: function() {
        this._buildGridStore();
    },

    getModelScopedStateId: function(modelName, id) {
        return this.getContext().getScopedStateId(modelName + '-' + id);
    },

    getHeight: function() {
        var el = this.getEl();
        if (el) {
            var height = this.callParent(arguments);
            return Ext.isIE8 ? Math.max(height, 600) : height;
        }

        return 0;
    },

    setHeight: function(height) {
        this.callParent(arguments);
        if (this.grid) {
            this.grid.setHeight(height);
        }
        if (this.board) {
            this.board.setHeight(height);
        }
    },

    getSettingsFields: function() {
        return [{
            xtype: 'container'
        }];
    },

    searchAllProjects: function() {
        return this.ancestorFilterPlugin.getIgnoreProjectScope();
    },
});
