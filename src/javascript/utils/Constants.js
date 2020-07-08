Ext.define('Constants', {
    statics: {
        FEATURE_FETCH: ['ObjectID', 'FormattedID', 'Name', 'PercentDoneByStoryCount', 'PercentDoneByStoryPlanEstimate', 'Project', 'DisplayColor', 'Predecessors', 'Successors'],
        STORIES_FETCH: ['ObjectID', 'FormattedID', 'Name', 'Iteration', 'Project', 'ScheduleState', 'StartDate', 'EndDate', 'Predecessors', 'Successors', 'AcceptedDate', 'Feature'],
        STORY_COLUMNS: ['FormattedID', 'Name', 'PlanEstimate', 'ScheduleState'],
        RELEASE_CONTROL_LABEL: 'Release Tracking',
        RELEASE_CONTROL_LABEL_CLASS: 'ts-page-label',
        UNSCHEDULED: 'Unscheduled',
        START_DATE: 'From',
        END_DATE: 'To',
        PORTFOLIO_ITEMS: 'Portfolio Items'
    }
})
