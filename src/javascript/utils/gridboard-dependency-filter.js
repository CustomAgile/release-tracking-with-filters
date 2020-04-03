/**
     * Adds a button to a GridBoard to filter on Feature dependencies and/or Features with Story dependencies
**/
Ext.define('CustomAgile.ui.gridboard.DependencyFilter', {
    alias: 'widget.gridboarddependencyfilter',
    extend: 'Rally.ui.Button',

    stateful: true,

    stateId: 'gridboarddependencyfilter',

    config: {
        filterFeatures: false,
        filterStories: false,
        filterMatch: 'AND',
        tooltipText: 'Dependencies',
        margin: '3 9 0 0',
        cls: 'field-picker-btn secondary rly-small',
        iconCls: 'icon-predecessor',
        handler: (btn) => {
            btn._onClick(btn);
        }
    },

    constructor: function (config) {
        this.mergeConfig(config);
        this.callParent([this.config]);
        this.on('afterrender', this.updateFilterCount);
    },

    _onClick: function (btn) {
        this._createPopover(btn.getEl());
    },

    _createPopover: function (popoverTarget) {
        this.popover = Ext.create('Rally.ui.popover.Popover', {
            target: popoverTarget,
            placement: ['bottom', 'left', 'top', 'right'],
            cls: 'field-picker-popover',
            width: 300,
            toFront: Ext.emptyFn,
            buttonAlign: 'center',
            title: this.tooltipText,
            listeners: {
                destroy: function () {
                    this.popover = null;
                },
                scope: this
            },
            buttons: [
                {
                    xtype: "rallybutton",
                    text: 'Apply',
                    cls: 'field-picker-apply-btn primary rly-small dependency-filter-btn',
                    listeners: {
                        click: function () {
                            this._onApply(this.popover);
                        },
                        scope: this
                    }
                },
                {
                    xtype: "rallybutton",
                    text: 'Cancel',
                    cls: 'field-picker-cancel-btn secondary dark rly-small',
                    listeners: {
                        click: this.cancel,
                        scope: this
                    }
                }
            ],
            items: [
                {
                    xtype: 'container',
                    cls: 'dep-checkbox-container',
                    itemId: 'checkboxfiltercontainer',
                    width: 200,
                    listeners: {
                        specialkey: function (field, e) {
                            if (e.getKey() === e.ESC) {
                                this.popover.close();
                            }
                        },
                        scope: this
                    },
                    items: [
                        {
                            xtype: 'rallycheckboxfield',
                            stateEvents: ['change'],
                            boxLabel: 'Filter on Features w/ Dependencies',
                            boxLabelCls: 'dependency-label',
                            margin: 10,
                            name: 'featuresWithDependencies',
                            inputValue: true,
                            value: this.filterFeatures,
                            itemId: 'featuresWithDependenciesCheckbox',
                            cls: 'dependency-checkbox',
                            listeners: {
                                scope: this,
                                change: function (cmp, newVal) {
                                    this.filterFeatures = newVal;
                                    this.updateMatchCombo();
                                }
                            }
                        },
                        {
                            xtype: 'rallycheckboxfield',
                            stateEvents: ['change'],
                            boxLabel: 'Filter on Features w/ Story Dependencies',
                            boxLabelCls: 'dependency-label',
                            margin: 10,
                            name: 'featuresWithStoryDependencies',
                            inputValue: true,
                            value: this.filterStories,
                            itemId: 'featuresWithStoryDependenciesCheckbox',
                            cls: 'dependency-checkbox',
                            listeners: {
                                scope: this,
                                change: function (cmp, newVal) {
                                    this.filterStories = newVal;
                                    this.updateMatchCombo();
                                }
                            }
                        },
                        {
                            xtype: 'rallycombobox',
                            itemId: 'dependencyFilterMatchCombo',
                            hideLabel: false,
                            margin: 10,
                            fieldLabel: 'Filter Match Condition',
                            labelAlign: 'top',
                            queryMode: 'local',
                            store: {
                                fields: ['label', 'value'],
                                data: [
                                    { label: 'Both Filters', value: 'AND' },
                                    { label: 'Either Filter', value: 'OR' }
                                ]
                            },
                            width: 120,
                            displayField: 'label',
                            valueField: 'value',
                            editable: false,
                            autoSelect: true,
                            forceSelection: true,
                            value: this.filterMatch || 'All',
                            disabled: !(this.filterFeatures && this.filterStories),
                            listeners: {
                                scope: this,
                                change: function (cmp, newVal) {
                                    this.filterMatch = newVal;
                                }
                            }
                        }
                    ]
                }
            ]
        });
    },

    updateMatchCombo: function () {
        if (this.popover) {
            let combo = this.popover.down('#dependencyFilterMatchCombo');
            if (combo) {
                combo.setDisabled(!(this.filterFeatures && this.filterStories));
            }
        }
    },

    getFilters: function () {
        let filters = [];

        if (this.filterFeatures) {
            let featureFilter = Ext.create('Rally.data.wsapi.Filter', {
                property: 'Predecessors.ObjectID',
                operator: '!=',
                value: null
            });

            featureFilter = featureFilter.or(Ext.create('Rally.data.wsapi.Filter', {
                property: 'Successors.ObjectID',
                operator: '!=',
                value: null
            }));

            filters.push(featureFilter);
        }

        if (this.filterStories) {
            let storyFilter = Ext.create('Rally.data.wsapi.Filter', {
                property: 'UserStories.Predecessors.ObjectID',
                operator: '!=',
                value: null
            });

            storyFilter = storyFilter.or(Ext.create('Rally.data.wsapi.Filter', {
                property: 'UserStories.Successors.ObjectID',
                operator: '!=',
                value: null
            }));

            filters.push(storyFilter);
        }

        if (this.filterFeatures && this.filterStories) {
            if (this.filterMatch === 'AND') {
                return [Rally.data.wsapi.Filter.and(filters)];
            }
            else {
                return [Rally.data.wsapi.Filter.or(filters)];
            }
        }

        return filters;
    },

    cancel: function () {
        if (this.popover) {
            this.popover.close();
        }

        if (this.stateful && this.stateId) {
            let state = Ext.state.Manager.get(this.stateId, {});
            this.updateValues(state);
        }
    },

    _onApply: function (popover) {
        this.updateFilterCount();
        this.saveState();
        this.fireEvent('dependencyfilterchange', this.getFilters());
        popover.close();
    },

    updateFilterCount: function () {
        if (this.filterCounter) {
            this.filterCounter.remove();
        }
        let filterCount = 0;
        if (this.filterFeatures) { filterCount++; }
        if (this.filterStories) { filterCount++; }

        if (filterCount) {
            this.filterCounter = document.createElement('div');
            this.filterCounter.classList.add('dependency-filter-count');
            let text = document.createTextNode(filterCount.toString());
            this.filterCounter.appendChild(text);
            if (this.el && Ext.isFunction(this.el.appendChild)) {
                this.el.appendChild(this.filterCounter);
            }
        }
    },

    getState: function () {
        return {
            filterFeatures: this.filterFeatures,
            filterStories: this.filterStories,
            filterMatch: this.filterMatch
        };
    },

    applyState: function (state) {
        this.updateValues(state);
        this.fireEvent('dependencyfilterstateapplied', this.getFilters());
    },

    updateValues: function (state) {
        this.filterFeatures = state.filterFeatures;
        this.filterStories = state.filterStories;
        this.filterMatch = state.filterMatch;
        this.updateFilterCount();

        if (this.popover) {
            let featureCheckbox = this.popover.down('#featuresWithDependenciesCheckbox');
            let storyCheckbox = this.popover.down('#featuresWithStoryDependenciesCheckbox');
            let matchCombo = this.popover.down('#dependencyFilterMatchCombo');

            featureCheckbox.setValue(state.filterFeatures);
            storyCheckbox.setValue(state.filterStories);
            matchCombo.setValue(state.filterMatch);
        }
    },

    saveState: function () {
        var me = this,
            id = me.stateful && me.stateId,
            state;

        if (id) {
            state = me.getState() || {};
            Ext.state.Manager.set(id, state);
        }
    }
});