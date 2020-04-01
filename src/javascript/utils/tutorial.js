/**
     * Creates custom renderers based upon field types.
     */
Ext.define('CustomAgile.ui.tutorial.ReleaseTrackingTutorial', {
    singleton: true,

    welcomeHtml: `
    <p>Program managers, product owners, engineering leads, and other organizers can track the status of teams and features in a common release from this app.</p>
    
    <p>Features that have been planned into the selected release display on the left side of the page, which can be compared against a matrix of teams and iterations on the right.</p>

    <p>Change the release via the Release picker at the top of this page.</p>
    `,

    steps: [
        {
            target: '#dependency-controls-area',
            title: 'Dependencies',
            html: `
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
    `
        }
    ],

    showWelcomeDialog: function (app) {
        this.app = app;

        this.welcomeDialog = Ext.create('Rally.ui.dialog.Dialog', {
            autoShow: true,
            layout: 'fit',
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
                            this.welcomeDialog.close;
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

        if (currentStep < this.steps.length - 1) {
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
            placement: ['bottom', 'left', 'top', 'right'],
            cls: 'field-picker-popover',
            // width: 350,
            toFront: Ext.emptyFn,
            buttonAlign: 'center',
            title: currentStep.title,
            listeners: {
                destroy: function () {
                    this.popover = null;
                },
                scope: this
            },
            html: currentStep.html,
            buttons
        });
    }

});