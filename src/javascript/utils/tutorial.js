Ext.define('CustomAgile.ui.tutorial.ReleaseTrackingTutorial', {
    singleton: true,

    welcomeHtml: `
    <p>Program managers, product owners, engineering leads, and other organizers can track the status of teams and features in a common Program Increment (PI) via the release timebox from this app.</p>
    
    <p>Features that have been planned into the selected PI (release timebox) display on the left side of the page, which can be compared against a matrix of teams and iterations on the right.</p>

    <p>Change the release via the Release timebox picker at the top of this page.</p>

    <p>Use the filters above to filter the list of Features that appear on the left side of the app.</p>
    `,

    steps: [
        {
            target: '#grid-area',
            title: 'Feature Grid',
            placement: 'right',
            html: `
            <p>This section lists all of the features that have been planned in the selected PI (release timebox). By default they are sorted by rank. Clicking and dragging the left-most side of a row allows you to re-rank features.</p>
            <p>Just above the grid is a series of buttons</p>
            <div>
                <p> <span role="presentation" class="x-btn-icon-el icon-add-column tutorial-example-btn">&nbsp;</span> Column picker: Select which fields you would like to see in the grid. These fields will also appear as columns when exported</p>
                <p> <span role="presentation" class="x-btn-icon-el icon-predecessor tutorial-example-btn">&nbsp;</span> Dependency Filter: Provides the ability to filter the below list of Features on those that have dependencies, those that have stories with dependencies or both</p>
                <p> <span role="presentation" class="x-btn-icon-el icon-export tutorial-example-btn">&nbsp;</span> Export: Exports the Features from the grid as well as the option to include any level of child artifacts</p>
            </div>
            <p>Only the Features showing on the current grid page will show data in the board. Increase the page size to show more data in the board.</p>
            `
        },
        {
            target: '#filter-area',
            placement: 'bottom',
            title: 'Filters',
            html: `
            <p>This section provides fine-tuning of the Features that will display in the grid on the left side of the app.</p>
            <p>Filters can be applied at any level in the portfolio item hierarchy as well as to user stories. Scope can be set to the current project(s) or across the entire workspace (workspace scoping may cause longer load times or even timeouts).</p>
            <p>Additional filter help can be found by clicking on the help button in the top-right corner of the filters section.</p>
            `
        },
        {
            target: '#date-range-area',
            placement: 'right',
            title: 'Iterations',
            html: `
            <p>These 2 date inputs control which iterations show in the board.</p>
            <p>They are automatically populated using the selected PI (release timebox) start and end dates. Update the values to control which iterations are shown.</p>
            `
        },
        {
            target: '#card-controls-area',
            placement: 'left',
            title: 'Board Controls',
            html: `
            <p>Customize how the data is ogranized in the board.</p>
            <p>Card Type</p>
            <ul>
                <li>Features - In a Feature summary card, User Stories are rolled up to their parent Feature giving you an overview of how many Stories are assigned to each Iteration by Feature. Clicking on a card will provide a popup with more detailed story information.</li>
                <li>Stories - Each card represents a single User Story</li>
            </ul>
            <p>Swimlanes</p>
            <ul>
                <li>Project - Stories are grouped in horizontal swimlanes by Project</li>
                <li>Feature - Stories are grouped in horizontal swimlanes by Feature</li>
            </ul>
            `
        },
        {
            target: '#dependency-controls-area',
            placement: 'left',
            title: 'Dependencies',
            html: `
            <h4><span class="field-content FeatureStoriesPredecessorsAndSuccessors icon-children"></span> - Story to Story dependencies</h4>
            <h4><span class="field-content FeaturePredecessorsAndSuccessors icon-predecessor"></span> - Feature to Feature dependencies</h4>

            <h3>Show Story Dependency Lines</h3>

            <p>This setting will display lines between cards that have user story dependencies.</p>
            <p>Each line will connect to the predecessor on the right side of the card via a small circle and then
            to the successor on the left side of the card via a triangle.</p>

            <img src="${this.dependencyExample}" alt="Story Dependency Line Example" style="width:400px;display:block;margin-left:auto;margin-right:auto" />
            <br>
            
            Click on a card's story dependency icon(<span class="field-content FeatureStoriesPredecessorsAndSuccessors icon-children"></span>) 
            to view only lines for stories within that feature. An 'x' will replace the dependency icon allowing you to clear the 
            dependencies and reset the view.
            
            <br><br>
            
            <b>Note: Feature to feature dependency information can be viewed by clicking on this icon: </b><span class="field-content FeaturePredecessorsAndSuccessors icon-predecessor"></span>
            <br><br>However, Feature-Feature dependency lines cannot be drawn as this board is a view of stories by iteration and therefore Features are often displayed in the board multiple times each.
            
            <br><br>
            
            The colors indicate the following:
            <ul>
                <li><b><span style="color:grey;">Grey</span></b> - Successor is scheduled in an iteration after the predecessor</li>
                <li><b><span style="color:#FAD200;">Yellow</span></b> - Predecessor and successor are scheduled in the same iteration</li>
                <li><b><span style="color:#F66349;">Red</span></b> - Predecessor is scheduled in an iteration after the successor or the successor is scheduled in an iteration but it's predecessor is unscheduled</li>
                </ul>
            </ul>
            <br>
            Lines can be displayed or hidden by color using the provided color checkbox filters that appear after selecting the "Show Dependency Lines" option.
            <br>
            `
        }
    ],

    showWelcomeDialog: function (app) {
        this.app = app;

        this.welcomeDialog = Ext.create('Rally.ui.dialog.Dialog', {
            autoShow: true,
            layout: 'fit',
            componentCls: 'rly-popover dark-container',
            width: 500,
            height: 300,
            closable: true,
            autoDestroy: true,
            buttonAlign: 'center',
            autoScroll: true,
            title: 'Using the PI Tracking With Filters App',
            items: {
                xtype: 'component',
                html: this.welcomeHtml,
                padding: 10,
                style: 'font-size:12px;'
            },
            buttons: [
                {
                    xtype: "rallybutton",
                    text: 'Close',
                    cls: 'secondary rly-small',
                    listeners: {
                        click: () => {
                            this.welcomeDialog.close();
                        },
                        scope: this
                    }
                }, {
                    xtype: "rallybutton",
                    text: 'Next',
                    cls: 'primary rly-small',
                    listeners: {
                        click: function () {
                            this.showNextStep(0);
                            this.welcomeDialog.close();
                        },
                        scope: this
                    }
                }
            ]
        });
    },

    showNextStep: function (stepIndex) {
        if (this.popover) {
            Ext.destroy(this.popover);
        }

        if (stepIndex >= this.steps.length) {
            return;
        }

        let currentStep = this.steps[stepIndex];

        let buttons = [{
            xtype: "rallybutton",
            text: 'Close',
            cls: 'secondary rly-small',
            listeners: {
                click: () => {
                    this.popover.close();
                },
                scope: this
            }
        }];

        if (stepIndex < this.steps.length - 1) {
            buttons.push({
                xtype: "rallybutton",
                text: 'Next',
                cls: 'primary rly-small',
                listeners: {
                    click: function () {
                        this.showNextStep(stepIndex + 1);
                    },
                    scope: this
                }
            });
        }

        this.popover = Ext.create('Rally.ui.popover.Popover', {
            target: this.app.down(currentStep.target).getEl(),
            placement: currentStep.placement || ['bottom', 'left', 'top', 'right'],
            overflowY: 'auto',
            maxWidth: 700,
            maxHeight: 700,
            toFront: Ext.emptyFn,
            buttonAlign: 'center',
            title: currentStep.title,
            listeners: {
                destroy: function () {
                    this.popover = null;
                },
                scope: this
            },
            html: `<div class="tutorial-popover-body">${currentStep.html}</div>`,
            buttons
        });
    }

});