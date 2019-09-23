/* global Ext _ Rally Constants Deft Utils */
Ext.define("release-tracking-with-filters", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: 'border',
    items: [{
        id: 'filter-area',
        region: 'north',
        xtype: 'panel',
        minHeight: 280,
        overflowY: 'auto',
        collapsible: true,
        margins: '0 0 10 0',
        header: {
            cls: 'ts-panel-header',
            padding: '0 0 15 0'
        },
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
            showDependencyLines: false
        },
    },

    integrationHeaders: {
        name: "release-tracking-with-filters"
    },

    launch: function () {
        Rally.data.wsapi.Proxy.superclass.timeout = 120000;

        var dateRangeArea = this.down('#date-range-area');
        dateRangeArea.add([{
            xtype: 'rallydatefield',
            id: 'start-date-picker',
            fieldLabel: Constants.START_DATE,
            labelWidth: 120,
            labelCls: 'date-label',
            minWidth: 200,
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
            minWidth: 200,
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

        var timeboxScope = this.getContext().getTimeboxScope();
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
        var ancestorData = Rally.getApp().ancestorFilterPlugin._getValue();

        // Delete piRecord to avoid recursive stack overflow error
        delete ancestorData.piRecord;

        var gridView = this.down('rallygridboard').getCurrentView();
        var views = Ext.apply(gridView, ancestorData);

        return views;
    },

    setCurrentView: function (view) {
        var app = Rally.getApp();
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

    setLoading: function (loading) {
        this.down('#board-area').setLoading(loading);
        if (this.grid) {
            var treegrid = this.grid.down('rallytreegrid');
            if (treegrid) {
                treegrid.setLoading(loading);
            }
        }
    },

    // Usual monkey business to size gridboards
    onResize: function () {
        this.callParent(arguments);
        var gridArea = this.down('#grid-area');
        var grid = this.down('rallygridboard');
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
        var queries = [];

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
            var filters = await this.ancestorFilterPlugin.getAllFiltersForType(this.lowestPiTypePath, false).catch((e) => {
                Rally.ui.notify.Notifier.showError({ message: (e.message || e) });
                this.loadingFailed = true;
            });

            if (filters) {
                queries = queries.concat(filters);
            }
        }

        return queries;
    },

    _updateIterationsStore: async function () {
        var filter = Rally.data.wsapi.Filter.and([{
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
        var iterations = await this.iterationsStore.load();
        return iterations;
    },

    _getDefects: function () {
        // TODO (tj) needed?
    },

    _addPisGrid: function (store) {
        var gridArea = this.down('#grid-area');
        if (gridArea) {
            gridArea.removeAll();
        }
        var currentModelName = this.modelNames[0];
        var allProjectsContext = this.getContext().getDataContext();
        allProjectsContext.project = null;
        var gridExporter = Ext.create('TsExportGrid', {
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
                margin: '1 9 0 9',
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
                    enablePostGet: true
                },
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
        var store = grid.getGridOrBoard().getStore();
        var root = store.getRootNode();

        if (root.childNodes && root.childNodes.length) {
            var oids = _.map(root.childNodes, function (pi) {
                return pi.get('ObjectID');
            }, this).join(',');

            // Performance may be better by using 'in' instead of a collection of ORs
            var query = Ext.create('Rally.data.wsapi.Filter', {
                property: this.lowestPiTypeName + '.ObjectID',
                operator: 'in',
                value: oids
            });

            // If there are no PIs, then explicitly filter out all stories
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

        var boardPromise = this._addPisBoard(this.storiesFilter, this.currentIterations).then({
            scope: this,
            success: function () {
                this.setLoading(false);
            }
        });
        return boardPromise;
    },

    _onPiSelected: function (pi) {
        var filter;
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
                enablePostGet: true
            }
        });
    },

    _addPisBoard: function (filter, iterations) {
        var boardDeferred = Ext.create('Deft.Deferred');
        var boardArea = this.down('#board-area');
        boardArea.removeAll();

        this.buckets = {};

        // Create a column for each iteration shared by the projects
        var endDateSorted = _.sortBy(iterations, function (i) {
            return i.get('EndDate');
        });
        var uniqueIterations = _.unique(endDateSorted, function (i) {
            return this._getIterationKey(i);
        }, this);

        var columns = _.map(uniqueIterations, function (iteration) {
            var startDate = iteration.get('StartDate').toLocaleDateString();
            var endDate = iteration.get('EndDate').toLocaleDateString();
            var headerTemplate = new Ext.XTemplate('<div class="iteration-name">{name}</div><div class="iteration-dates">{start} - {end}</dev>').apply({
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
            type: ['HierarchicalRequirement'],
            attribute: 'Iteration',
            storeConfig: {
                filters: filter,
                fetch: [this.lowestPiTypeName].concat(Constants.STORIES_FETCH),
                groupField: this.lowestPiTypeName,
                context: this.currentDataContext,
                enablePostGet: true
            },
            listeners: {
                scope: this,
                boxready: function () {
                    boardDeferred.resolve();
                }
            },
            rowConfig: {
                field: 'Project'
            },
            columns: columns,
            cardConfig: {
                xtype: 'storyfeaturecard',
                lowestPiTypeName: this.lowestPiTypeName,
                isHiddenFunc: this._isCardHidden.bind(this),
                getFeature: function (card) {
                    var story = card.getRecord();
                    var featureRef = story.get(this.lowestPiTypeName);
                    var feature = this.piStore.getById(featureRef);
                    return feature;
                }.bind(this),
                getAllFeatureStories: function (card) {
                    var cards = this._getCardsForCard(card);
                    return _.map(cards, function (card) {
                        return card.getRecord();
                    });
                }.bind(this),
                getVisibleCard: function (card) {
                    var cards = this._getCardsForCard(card);
                    return cards[0];
                }.bind(this),
                listeners: {
                    scope: this,
                    fieldclick: function (fieldName, card) {
                        if (fieldName === 'FeatureStoriesPredecessorsAndSuccessors' && this.getSetting('showDependencyLines')) {
                            this.showStoryDependencyLines(card);
                        }
                    },
                    story: function (card) {
                        // TODO (tj) move into StoryFeatureCard
                        var story = card.getRecord();
                        var featureRef = story.get(this.lowestPiTypeName);
                        var feature = this.piStore.getById(featureRef);
                        var context = this.getContext().getDataContext();
                        context.project = story.get('Project')._ref;
                        var iteration = story.get('Iteration');
                        var filters = [];
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

    showStoryDependencyLines: function (clickedCard) {
        var clickedCardX = clickedCard.getX();
        var clickedCardY = clickedCard.getY();
        var cardWidth = clickedCard.getWidth();
        var cardHeight = clickedCard.getHeight();
        var successorPointOffset = {
            x: cardWidth, // right edge
            y: cardHeight / 2 // middle
        };
        var predecessorPointOffset = {
            x: 0, // left edge
            y: cardHeight / 2 // middle
        };

        var boardArea = this.down('#board-area');
        if (this.drawComponent) {
            boardArea.remove(this.drawComponent);
        }

        // TODO (tj) Clean up need to get scroll from right-area. Would be better from board-area
        var rightAreaEl = this.down('#right-area').getEl();
        var rightAreaScroll = rightAreaEl.getScroll();


        var items = [];

        var xOffset = -boardArea.getX() + boardArea.getEl().getMargin().left;
        var yOffset = 0 + rightAreaScroll.top; //-boardArea.getY() - boardArea.getEl().getMargin().top;
        /*
        var xOffset = 0 //-boardArea.getEl().getMargin().left;
        var yOffset = 0 //-boardArea.getEl().getMargin().top;
        */
        // Get list of all cards for this card (1 for each story for this feature + iteration + project)
        var cards = this._getCardsForCard(clickedCard);

        // For each card, get its story dependencies
        var promises = _.map(cards, function (item) {
            var story = item.getRecord();
            var predecessorsPromise = story.getCollection('Predecessors', {
                fetch: [this.lowestPiTypeName].concat(Constants.STORIES_FETCH),
            }).load().then({
                scope: this,
                success: function (predecessors) {
                    // Draw a line to the card representing this stories feature card
                    _.each(predecessors, function (predecessor) {
                        var key = this._getRecordBucketKey(predecessor);
                        if (this.buckets.hasOwnProperty(key)) {
                            var visibleCard = this.buckets[key][0];
                            // Skip self-dependencies
                            if (visibleCard === clickedCard) {
                                return;
                            }

                            var p = { x: clickedCardX, y: clickedCardY };
                            var p2 = { x: visibleCard.getX(), y: visibleCard.getY() };
                            items.push({
                                type: "circle",
                                fill: 'blue',
                                radius: 5,
                                x: p.x + xOffset + predecessorPointOffset.x,
                                y: p.y + yOffset + predecessorPointOffset.y

                            });
                            items.push({
                                type: "circle",
                                fill: 'blue',
                                radius: 5,
                                x: p2.x + xOffset + successorPointOffset.x,
                                y: p2.y + yOffset + successorPointOffset.y

                            });
                            items.push({
                                type: "path",
                                path: Ext.String.format("M{0} {1} L {2} {3}",
                                    p.x + xOffset + predecessorPointOffset.x,
                                    p.y + yOffset + predecessorPointOffset.y,
                                    p2.x + xOffset + successorPointOffset.x,
                                    p2.y + yOffset + successorPointOffset.y
                                ),
                                fill: "transparent",
                                stroke: "blue",
                                "stroke-width": "1"
                            });
                        }
                    }, this);
                }
            });
            var successorsPromise = story.getCollection('Successors', {
                fetch: [this.lowestPiTypeName].concat(Constants.STORIES_FETCH),
            }).load().then({
                scope: this,
                success: function (successors) {
                    _.each(successors, function (predecessor) {
                        var key = this._getRecordBucketKey(predecessor);
                        if (this.buckets.hasOwnProperty(key)) {
                            var visibleCard = this.buckets[key][0];
                            // Skip self-dependencies
                            if (visibleCard === clickedCard) {
                                return;
                            }

                            var p = { x: clickedCardX, y: clickedCardY };
                            var p2 = { x: visibleCard.getX(), y: visibleCard.getY() };
                            items.push({
                                type: "circle",
                                fill: 'blue',
                                radius: 5,
                                x: p.x + xOffset + successorPointOffset.x,
                                y: p.y + yOffset + successorPointOffset.y

                            });
                            items.push({
                                type: "circle",
                                fill: 'blue',
                                radius: 5,
                                x: p2.x + xOffset + predecessorPointOffset.x,
                                y: p2.y + yOffset + predecessorPointOffset.y

                            });
                            items.push({
                                type: "path",
                                path: Ext.String.format("M{0} {1} L {2} {3}",
                                    p.x + xOffset + successorPointOffset.x,
                                    p.y + yOffset + successorPointOffset.y,
                                    p2.x + xOffset + predecessorPointOffset.x,
                                    p2.y + yOffset + predecessorPointOffset.y
                                ),
                                fill: "transparent",
                                stroke: "green",
                                "stroke-width": "1"
                            });
                        }
                    }, this);
                }
            });

            return Deft.promise.Promise.all([predecessorsPromise, successorsPromise]);
        }, this);

        Deft.promise.Promise.all(promises).then({
            scope: this,
            success: function () {
                var boardX = 0; //boardArea.getX(),
                var boardY = 0; //boardArea.getY()
                this.drawComponent = Ext.create('Ext.draw.Component', {
                    style: Ext.String.format('position:absolute; top:{0}px; left:{1}px;z-index:1000;pointer-events:none', boardY, boardX),
                    itemId: 'dependencies',
                    id: 'dep',
                    viewBox: false,
                    floating: false,
                    //margin: 10,
                    height: boardArea.getHeight(),
                    width: boardArea.getWidth(),
                    items: items
                });

                boardArea.add(this.drawComponent);
                this.drawComponent.show();
            }
        });
    },

    _getCardBucketKey: function (card) {
        var record = card.getRecord();
        return this._getRecordBucketKey(record);
    },

    _getRecordBucketKey: function (record) {
        var iterationKey = this._getIterationKey(record.get('Iteration'));
        var projectId = record.get('Project').ObjectID;
        var featureId = record.get('Feature').ObjectID;
        return [featureId, projectId, iterationKey].join('-');
    },

    _getIterationKey: function (iteration) {
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


    _isCardHidden: function (card) {
        var result = false;
        var key = this._getCardBucketKey(card);
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
        var key = this._getCardBucketKey(card);
        var result = this.buckets[key];

        return result;
    },

    viewChange: function () {
        this._buildGridStore();
    },

    getModelScopedStateId: function (modelName, id) {
        return this.getContext().getScopedStateId(modelName + '-' + id);
    },

    getSettingsFields: function () {
        return [{
            xtype: 'rallycheckboxfield',
            name: 'showDependencyLines',
            fieldLabel: '(Experimental) Show Story Dependency Lines'
        }];
    },

    searchAllProjects: function () {
        return this.ancestorFilterPlugin.getIgnoreProjectScope();
        // return this.scopeControlPlugin.getValue();
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
        var startDatePicker = this.down('#start-date-picker');
        startDatePicker.suspendEvents();
        startDatePicker.setValue(this.timeboxStart);
        startDatePicker.resumeEvents();
        var endDatePicker = this.down('#end-date-picker');
        endDatePicker.suspendEvents();
        endDatePicker.setValue(this.timeboxEnd);
        endDatePicker.resumeEvents();
    }
});
