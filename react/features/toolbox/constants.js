/**
 * Thresholds for displaying toolbox buttons
 */
export const THRESHOLDS = [
    {
        width: 520,
        order: [ 'camera','microphone', 'desktop', 'chat', 'raisehand', 'participants', 'tileview' ]
    },
    {
        width: 470,
        order: [ 'camera','microphone', 'desktop', 'chat', 'raisehand', 'participants' ]
    },
    {
        width: 420,
        order: [ 'camera','microphone', 'desktop', 'chat', 'participants' ]
    },
    {
        width: 370,
        order: [ 'camera','microphone', 'chat', 'participants' ]
    },
    {
        width: 320,
        order: [ 'camera','microphone', 'chat' ]
    },
    {
        width: 270,
        order: [ 'camera','microphone', ]
    }
];

export const NOT_APPLICABLE = 'N/A';

export const TOOLBAR_TIMEOUT = 4000;
