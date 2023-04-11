export const Experiments = Object.freeze({
    LowPolyLocal:       'Low Poly Local',
    HighPolyLocal:      'High Poly Local',
    HighPolyRemote:     'High Poly Remote (no atw)',
    HighPolyRemoteATW:  'High Poly Remote (with atw)',
    Mixed:              'Mixed (no atw)',
    MixedATW:           'Mixed (with atw)',
});

export const ExperimentsList = Object.values(Experiments);

export const RenderingMedium = Object.freeze({
    Local:  'local',
    Remote: 'remote',
});

export const Resolution = Object.freeze({
    Low:    'low',
    High:   'high',
});

export const TaskState = Object.freeze({
    Start:  'start',
    Boxes:  'boxes',
    Menu:   'menu',
    Done:   'done',
});

export const EVENTS = Object.freeze({
    RAYCASTER_INTERSECT_LOCAL:      'raycaster-custom-intersected-local',
    RAYCASTER_INTERSECT_REMOTE:     'raycaster-custom-intersected-remote',
    HAND_GRAB_START_LOCAL:          'hand-grab-start-local',
    HAND_GRAB_START_REMOTE:         'hand-grab-start-remote',
    HAND_GRAB_END_LOCAL:            'hand-grab-end-local',
    HAND_GRAB_END_REMOTE:           'hand-grab-end-remote',
    BUTTON_DONE_PRESSED:            'button-done-pressed',
});
