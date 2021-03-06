// Remove 'Actuals' from the blacklist
Ext.override(Rally.ui.gridboard.plugin.GridBoardFieldPicker, {
    gridFieldBlackList: [
        // 'Actuals',
        'Changesets',
        'Children',
        // 'Description',
        // 'Notes',
        'ObjectID',
        'Predecessors',
        'RevisionHistory',
        'Subscription',
        'Successors',
        'TaskIndex',
        'Workspace',
        'VersionId'
    ]
});

/**
 * Remove the buffer when responding to 'viewstatesave' events
 */
Ext.override(Rally.ui.gridboard.SharedViewComboBox, {
    initComponent: function () {
        this.callParent(arguments);
        this.cmp.un('viewstatesave', this._onCmpViewStateSave, this);
        this.cmp.on('viewstatesave', this._onCmpViewStateSave, this);
    },
});

Ext.override(Rally.ui.cardboard.plugin.CardPopover, {
    showFeaturePredecessorsAndSuccessors: function () {
        return this._createPopover({
            field: 'PredecessorsAndSuccessors',
            title: 'Portfolio Item Dependencies',
            //width: 750,
            record: this.card.getFeature(this.card),
            offsetFromTarget: [{ x: 0, y: -8 }, { x: 15, y: 0 }, { x: 5, y: 15 }, { x: -15, y: 0 }],
            target: this.card.getEl()// .down('.field-content.FeaturePredecessorsAndSuccessors')
        });
    },

    showFeatureStoriesPredecessorsAndSuccessors: function () {
        var stories = this.card.getAllFeatureStories(this.card);
        return this._createPopover({
            field: 'FeatureStoriesDependenciesPopover',
            //width: 750,
            record: this.card.getRecord(),
            stories: stories,
            offsetFromTarget: [{ x: 0, y: -8 }, { x: 15, y: 0 }, { x: 5, y: 15 }, { x: -15, y: 0 }],
            target: this.card.getEl()// .down('.field-content.FeatureStoriesPredecessorsAndSuccessors')
        });
    }
});

Rally.ui.popover.PopoverFactory.popovers['FeatureStoriesDependenciesPopover'] = function (config) {
    return Ext.create('FeatureStoriesDependenciesPopover', this._getConfig(config));
};


// Would be nice if Checkboxes were stateful out of the box...
Ext.override(Ext.form.field.Checkbox, {
    getState: function () {
        return { checked: this.getValue() };
    },
    applyState: function (state) {
        if (typeof state.checked === 'boolean') {
            this.suspendEvents(false);
            this.setValue(state.checked);
            this.resumeEvents();
        }
    }
});

Ext.override(Ext.selection.Model, {
    // If user tries to click on a row that's not a Feature, prevent Grid from
    // deselecting any previously selected row(s)
    deselectDuringSelect: function (toSelect) {
        console.log('deselectDuringSelect function');
        let selectingCorrectType = false;
        for (let r of toSelect) {
            if (r.get('_type') === Rally.getApp().lowestPiTypePath.toLowerCase()) {
                selectingCorrectType = true;
            }
        }
        if (!selectingCorrectType) {
            return [false, 0];
        }
        else {
            return this.callParent(arguments);
        }
    },

    // Allow deselecting when selection mode is MULTI
    selectWithEvent: function (record, e) {
        if (this.selectionMode === 'MULTI' && this.allowDeselect && !e.ctrlKey && !e.shiftKey && this.isSelected(record) && this.getSelection().length === 1) {
            allowDeselect = this.toggleOnClick;
            if (allowDeselect) {
                this.doDeselect(record);
                return;
            }
        }

        this.callParent(arguments);
    }
});